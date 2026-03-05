-- Project Lazarus - Database Initialization Script
-- Run this via AWS RDS Query Editor or psql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create schema for medical documents
CREATE SCHEMA IF NOT EXISTS medical;

-- Documents table with vector embeddings
CREATE TABLE IF NOT EXISTS medical.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    s3_key TEXT NOT NULL,
    document_type VARCHAR(50),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    content_text TEXT,
    embedding vector(1024),  -- Titan V2 produces 1024-dim vectors
    metadata JSONB,
    visit_id UUID,
    provider_id UUID
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
ON medical.documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Providers table
CREATE TABLE IF NOT EXISTS medical.providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(100),
    contact JSONB,
    first_visit DATE,
    last_visit DATE,
    visit_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Visits table
CREATE TABLE IF NOT EXISTS medical.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES medical.providers(id),
    visit_date TIMESTAMP NOT NULL,
    visit_type VARCHAR(50),
    chief_complaint TEXT,
    notes TEXT,
    calendar_event_id VARCHAR(255),
    transcription_s3_key TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Health metrics table
CREATE TABLE IF NOT EXISTS medical.health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    value JSONB NOT NULL,
    unit VARCHAR(20),
    context TEXT,
    provider_id UUID REFERENCES medical.providers(id),
    visit_id UUID REFERENCES medical.visits(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_type ON medical.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON medical.documents(upload_date);
CREATE INDEX IF NOT EXISTS idx_visits_date ON medical.visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_provider ON medical.visits(provider_id);
CREATE INDEX IF NOT EXISTS idx_metrics_type_time ON medical.health_metrics(metric_type, timestamp);

-- Create function for similarity search
CREATE OR REPLACE FUNCTION medical.search_documents(
    query_embedding vector(1024),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    s3_key TEXT,
    content_text TEXT,
    similarity float,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.s3_key,
        d.content_text,
        1 - (d.embedding <=> query_embedding) as similarity,
        d.metadata
    FROM medical.documents d
    WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA medical TO lazarus_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA medical TO lazarus_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA medical TO lazarus_admin;

-- Verify installation
SELECT 'pgvector extension installed' as status, extversion as version 
FROM pg_extension WHERE extname = 'vector';

SELECT 'Schema created' as status, schema_name 
FROM information_schema.schemata WHERE schema_name = 'medical';

SELECT 'Tables created' as status, COUNT(*) as table_count 
FROM information_schema.tables WHERE table_schema = 'medical';
