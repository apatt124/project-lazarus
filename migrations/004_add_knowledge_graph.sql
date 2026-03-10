-- Migration: Add Knowledge Graph Support
-- Adds relationships table, provider tracking, and temporal data

-- Add metadata column to user_facts for provider info
ALTER TABLE medical.user_facts 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index on metadata for provider queries
CREATE INDEX IF NOT EXISTS idx_user_facts_metadata ON medical.user_facts USING GIN (metadata);

-- Create relationships table
CREATE TABLE IF NOT EXISTS medical.relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_fact_id UUID NOT NULL REFERENCES medical.user_facts(id) ON DELETE CASCADE,
  target_fact_id UUID NOT NULL REFERENCES medical.user_facts(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN (
    'treats', 'causes', 'contraindicates', 'related_to', 
    'monitors', 'requires', 'prescribed_by', 'managed_by', 'works_at'
  )),
  strength DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  reasoning TEXT,
  category VARCHAR(50) DEFAULT 'medical',
  is_medical BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  user_verified BOOLEAN DEFAULT FALSE,
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  last_verified_at TIMESTAMP,
  CONSTRAINT different_facts CHECK (source_fact_id != target_fact_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_relationships_source ON medical.relationships(source_fact_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON medical.relationships(target_fact_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON medical.relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_relationships_active ON medical.relationships(is_active);
CREATE INDEX IF NOT EXISTS idx_relationships_temporal ON medical.relationships(valid_from, valid_until);

-- Create knowledge graph change audit log
CREATE TABLE IF NOT EXISTS medical.knowledge_graph_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN (
    'fact_created', 'fact_updated', 'fact_deleted',
    'relationship_created', 'relationship_updated', 'relationship_deleted',
    'cascade_triggered', 'bulk_operation'
  )),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('fact', 'relationship', 'memory')),
  entity_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  triggered_by UUID REFERENCES medical.conversations(id),
  reasoning TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kg_changes_entity ON medical.knowledge_graph_changes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_kg_changes_date ON medical.knowledge_graph_changes(created_at);

-- Function to cascade fact updates to relationships
CREATE OR REPLACE FUNCTION propagate_fact_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If fact confidence changed significantly, adjust relationship strengths
  IF OLD.confidence IS DISTINCT FROM NEW.confidence THEN
    UPDATE medical.relationships
    SET strength = LEAST(1.0, strength * (NEW.confidence / NULLIF(OLD.confidence, 0))),
        last_verified_at = NOW()
    WHERE (source_fact_id = NEW.id OR target_fact_id = NEW.id)
      AND is_active = TRUE;
  END IF;
  
  -- If fact became inactive, deactivate relationships
  IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
    UPDATE medical.relationships
    SET is_active = FALSE,
        valid_until = NOW()
    WHERE (source_fact_id = NEW.id OR target_fact_id = NEW.id)
      AND is_active = TRUE;
  END IF;
  
  -- Log the change
  INSERT INTO medical.knowledge_graph_changes (
    change_type, entity_type, entity_id, old_value, new_value
  ) VALUES (
    'fact_updated', 'fact', NEW.id,
    row_to_json(OLD)::jsonb,
    row_to_json(NEW)::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to cascade fact deletions
CREATE OR REPLACE FUNCTION cascade_delete_fact()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the deletion
  INSERT INTO medical.knowledge_graph_changes (
    change_type, entity_type, entity_id, old_value
  ) VALUES (
    'fact_deleted', 'fact', OLD.id, row_to_json(OLD)::jsonb
  );
  
  -- Relationships are deleted automatically by CASCADE
  -- But log them for audit
  INSERT INTO medical.knowledge_graph_changes (
    change_type, entity_type, entity_id, reasoning
  )
  SELECT 
    'cascade_triggered', 'relationship', id,
    'Deleted due to fact deletion: ' || OLD.content
  FROM medical.relationships
  WHERE source_fact_id = OLD.id OR target_fact_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers
DROP TRIGGER IF EXISTS propagate_fact_changes ON medical.user_facts;
CREATE TRIGGER propagate_fact_changes
  AFTER UPDATE ON medical.user_facts
  FOR EACH ROW
  EXECUTE FUNCTION propagate_fact_update();

DROP TRIGGER IF EXISTS cascade_fact_deletion ON medical.user_facts;
CREATE TRIGGER cascade_fact_deletion
  BEFORE DELETE ON medical.user_facts
  FOR EACH ROW
  EXECUTE FUNCTION cascade_delete_fact();

-- Create view for current state of knowledge graph (active facts and relationships)
CREATE OR REPLACE VIEW medical.knowledge_graph_current AS
SELECT 
  f.id as fact_id,
  f.fact_type,
  f.content,
  f.confidence,
  f.fact_date,
  f.end_date,
  f.is_active,
  f.metadata,
  f.created_at,
  COALESCE(
    json_agg(
      json_build_object(
        'relationship_id', r.id,
        'target_fact_id', r.target_fact_id,
        'relationship_type', r.relationship_type,
        'strength', r.strength,
        'valid_from', r.valid_from,
        'valid_until', r.valid_until
      )
    ) FILTER (WHERE r.id IS NOT NULL),
    '[]'
  ) as relationships
FROM medical.user_facts f
LEFT JOIN medical.relationships r ON f.id = r.source_fact_id AND r.is_active = TRUE
WHERE f.is_active = TRUE
GROUP BY f.id;

-- Create view for temporal graph at any point in time
CREATE OR REPLACE FUNCTION medical.get_knowledge_graph_at_time(at_time TIMESTAMP)
RETURNS TABLE (
  fact_id UUID,
  fact_type VARCHAR,
  content TEXT,
  confidence DECIMAL,
  fact_date TIMESTAMP,
  metadata JSONB,
  relationships JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.fact_type,
    f.content,
    f.confidence,
    f.fact_date,
    f.metadata,
    COALESCE(
      json_agg(
        json_build_object(
          'relationship_id', r.id,
          'target_fact_id', r.target_fact_id,
          'relationship_type', r.relationship_type,
          'strength', r.strength
        )
      ) FILTER (WHERE r.id IS NOT NULL),
      '[]'
    )::jsonb
  FROM medical.user_facts f
  LEFT JOIN medical.relationships r ON f.id = r.source_fact_id
    AND r.valid_from <= at_time
    AND (r.valid_until IS NULL OR r.valid_until > at_time)
  WHERE f.created_at <= at_time
    AND (f.end_date IS NULL OR f.end_date > at_time)
  GROUP BY f.id, f.fact_type, f.content, f.confidence, f.fact_date, f.metadata;
END;
$$ LANGUAGE plpgsql;

-- Create function to get key events for timeline markers
CREATE OR REPLACE FUNCTION medical.get_timeline_events()
RETURNS TABLE (
  event_date TIMESTAMP,
  event_type VARCHAR,
  description TEXT,
  fact_id UUID
) AS $$
BEGIN
  RETURN QUERY
  -- New diagnoses
  SELECT 
    fact_date as event_date,
    'diagnosis' as event_type,
    content as description,
    id as fact_id
  FROM medical.user_facts
  WHERE fact_type = 'medical_condition' AND fact_date IS NOT NULL
  
  UNION ALL
  
  -- Medication changes
  SELECT 
    fact_date as event_date,
    'medication_started' as event_type,
    content as description,
    id as fact_id
  FROM medical.user_facts
  WHERE fact_type = 'medication' AND fact_date IS NOT NULL
  
  UNION ALL
  
  -- Medication stopped
  SELECT 
    end_date as event_date,
    'medication_stopped' as event_type,
    content as description,
    id as fact_id
  FROM medical.user_facts
  WHERE fact_type = 'medication' AND end_date IS NOT NULL
  
  UNION ALL
  
  -- Procedures
  SELECT 
    fact_date as event_date,
    'procedure' as event_type,
    content as description,
    id as fact_id
  FROM medical.user_facts
  WHERE fact_type = 'procedure' AND fact_date IS NOT NULL
  
  ORDER BY event_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE medical.relationships IS 'Stores AI-discovered relationships between medical facts with temporal validity';
COMMENT ON TABLE medical.knowledge_graph_changes IS 'Audit log for all knowledge graph modifications';
COMMENT ON COLUMN medical.relationships.strength IS 'Confidence in relationship (0-1), affects visual weight in graph';
COMMENT ON COLUMN medical.relationships.valid_from IS 'When this relationship became true';
COMMENT ON COLUMN medical.relationships.valid_until IS 'When this relationship ended (NULL = ongoing)';
COMMENT ON COLUMN medical.user_facts.metadata IS 'Stores provider info, document source, and other contextual data';
COMMENT ON COLUMN medical.user_facts.end_date IS 'When this fact stopped being true (e.g., medication discontinued)';
