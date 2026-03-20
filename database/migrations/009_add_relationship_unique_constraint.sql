-- Migration: Add unique constraint to prevent duplicate relationships
-- Also adds occurrence_count field to track how many times a relationship was discovered

-- Add occurrence_count column
ALTER TABLE medical.relationships 
ADD COLUMN IF NOT EXISTS occurrence_count INTEGER DEFAULT 1;

-- Add unique constraint to prevent duplicates
-- This ensures we can't have multiple relationships with the same source, target, and type
CREATE UNIQUE INDEX IF NOT EXISTS idx_relationships_unique 
ON medical.relationships (source_fact_id, target_fact_id, relationship_type)
WHERE is_active = TRUE;

-- Add comment
COMMENT ON COLUMN medical.relationships.occurrence_count IS 'Number of times this relationship was discovered across different documents/contexts';

-- Update relationship_type check constraint to include new types
ALTER TABLE medical.relationships 
DROP CONSTRAINT IF EXISTS relationships_relationship_type_check;

ALTER TABLE medical.relationships
ADD CONSTRAINT relationships_relationship_type_check 
CHECK (relationship_type IN (
  'treats', 'causes', 'contraindicates', 'related_to', 
  'monitors', 'requires', 'prescribed_by', 'managed_by', 'works_at',
  'prevents', 'manages', 'indicates', 'diagnoses', 'complicates',
  'performed_by', 'supports'
));
