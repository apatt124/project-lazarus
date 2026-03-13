-- Migration: Add AI layout cache table
-- Purpose: Store server-side cached AI-generated graph layouts for faster loading across devices
-- Created: 2026-03-13

-- Create AI layout cache table
CREATE TABLE IF NOT EXISTS medical.ai_layout_cache (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    node_count INTEGER NOT NULL,
    edge_count INTEGER NOT NULL,
    layout_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_layout UNIQUE (user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_layout_cache_user_id ON medical.ai_layout_cache(user_id);

-- Add comment
COMMENT ON TABLE medical.ai_layout_cache IS 'Stores cached AI-generated graph layouts for faster loading across devices';
COMMENT ON COLUMN medical.ai_layout_cache.user_id IS 'User identifier (matches user_facts.user_id)';
COMMENT ON COLUMN medical.ai_layout_cache.node_count IS 'Number of nodes in the cached layout (for cache validation)';
COMMENT ON COLUMN medical.ai_layout_cache.edge_count IS 'Number of edges in the cached layout (for cache validation)';
COMMENT ON COLUMN medical.ai_layout_cache.layout_data IS 'JSON object containing node positions: {node_id: {x, y, reasoning}}';
COMMENT ON COLUMN medical.ai_layout_cache.created_at IS 'When the layout was first cached';
COMMENT ON COLUMN medical.ai_layout_cache.updated_at IS 'When the layout was last regenerated';
