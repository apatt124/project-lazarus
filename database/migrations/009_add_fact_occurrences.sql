-- Migration: Add fact occurrences table
-- Purpose: Track multiple instances of the same medical fact with different dates/sources
-- This allows us to consolidate duplicate facts into one node while preserving all occurrences

-- Create fact_occurrences table
CREATE TABLE IF NOT EXISTS medical.fact_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fact_id UUID NOT NULL REFERENCES medical.user_facts(id) ON DELETE CASCADE,
    
    -- When this occurrence was observed
    occurrence_date DATE,
    
    -- Source information
    source_document_id UUID REFERENCES medical.documents(id),
    source_type VARCHAR(50) DEFAULT 'medical_record',
    
    -- Occurrence-specific metadata (test values, dosages, etc.)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Confidence for this specific occurrence
    confidence DECIMAL(3,2) DEFAULT 0.8,
    
    -- Original content if slightly different wording
    original_content TEXT,
    
    -- Tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_by VARCHAR(100),
    
    -- Ensure we don't duplicate the same occurrence
    CONSTRAINT unique_occurrence UNIQUE (fact_id, source_document_id, occurrence_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fact_occurrences_fact ON medical.fact_occurrences(fact_id);
CREATE INDEX IF NOT EXISTS idx_fact_occurrences_date ON medical.fact_occurrences(occurrence_date);
CREATE INDEX IF NOT EXISTS idx_fact_occurrences_source ON medical.fact_occurrences(source_document_id);

-- Comments
COMMENT ON TABLE medical.fact_occurrences IS 'Tracks multiple instances of the same medical fact from different sources/dates';
COMMENT ON COLUMN medical.fact_occurrences.fact_id IS 'Reference to the canonical fact';
COMMENT ON COLUMN medical.fact_occurrences.occurrence_date IS 'When this specific instance occurred';
COMMENT ON COLUMN medical.fact_occurrences.original_content IS 'Original wording if different from canonical fact';
COMMENT ON COLUMN medical.fact_occurrences.metadata IS 'Occurrence-specific data (test values, dosages, etc.)';

-- Function to get fact with all occurrences
CREATE OR REPLACE FUNCTION medical.get_fact_with_occurrences(fact_uuid UUID)
RETURNS TABLE (
    fact_id UUID,
    fact_type VARCHAR,
    content TEXT,
    confidence DECIMAL,
    fact_date DATE,
    metadata JSONB,
    occurrence_count BIGINT,
    occurrences JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id as fact_id,
        f.fact_type,
        f.content,
        f.confidence,
        f.fact_date,
        f.metadata,
        COUNT(o.id) as occurrence_count,
        COALESCE(
            json_agg(
                json_build_object(
                    'id', o.id,
                    'occurrence_date', o.occurrence_date,
                    'source_document_id', o.source_document_id,
                    'original_content', o.original_content,
                    'metadata', o.metadata,
                    'confidence', o.confidence,
                    'created_at', o.created_at
                )
                ORDER BY o.occurrence_date DESC NULLS LAST
            ) FILTER (WHERE o.id IS NOT NULL),
            '[]'::json
        )::jsonb as occurrences
    FROM medical.user_facts f
    LEFT JOIN medical.fact_occurrences o ON o.fact_id = f.id
    WHERE f.id = fact_uuid
    GROUP BY f.id, f.fact_type, f.content, f.confidence, f.fact_date, f.metadata;
END;
$$ LANGUAGE plpgsql;

-- Function to get timeline with occurrence counts
CREATE OR REPLACE FUNCTION medical.get_timeline_with_occurrences()
RETURNS TABLE (
    event_date DATE,
    event_type VARCHAR,
    description TEXT,
    fact_id UUID,
    occurrence_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    -- Facts with their primary date
    SELECT 
        f.fact_date as event_date,
        CASE 
            WHEN f.fact_type = 'medical_condition' THEN 'diagnosis'
            WHEN f.fact_type = 'medication' THEN 'medication_started'
            WHEN f.fact_type = 'procedure' THEN 'procedure'
            WHEN f.fact_type = 'test_result' THEN 'test'
            ELSE f.fact_type
        END as event_type,
        f.content as description,
        f.id as fact_id,
        (SELECT COUNT(*) FROM medical.fact_occurrences WHERE fact_id = f.id) as occurrence_count
    FROM medical.user_facts f
    WHERE f.fact_date IS NOT NULL
    AND f.is_active = TRUE
    
    UNION ALL
    
    -- Additional occurrences with different dates
    SELECT 
        o.occurrence_date as event_date,
        CASE 
            WHEN f.fact_type = 'medical_condition' THEN 'diagnosis'
            WHEN f.fact_type = 'medication' THEN 'medication_continued'
            WHEN f.fact_type = 'procedure' THEN 'procedure'
            WHEN f.fact_type = 'test_result' THEN 'test'
            ELSE f.fact_type
        END as event_type,
        COALESCE(o.original_content, f.content) as description,
        f.id as fact_id,
        1 as occurrence_count
    FROM medical.fact_occurrences o
    JOIN medical.user_facts f ON f.id = o.fact_id
    WHERE o.occurrence_date IS NOT NULL
    AND o.occurrence_date != f.fact_date
    AND f.is_active = TRUE
    
    ORDER BY event_date DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION medical.get_fact_with_occurrences IS 'Returns a fact with all its occurrences aggregated';
COMMENT ON FUNCTION medical.get_timeline_with_occurrences IS 'Returns timeline events including occurrence counts';
