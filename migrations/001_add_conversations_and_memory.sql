-- Migration: Add Conversations, Messages, and Memory System
-- Project Lazarus - Conversation Persistence & Memory
-- Run this after initialize-database.sql

-- ============================================
-- CONVERSATIONS & MESSAGES
-- ============================================

-- Conversations table
CREATE TABLE IF NOT EXISTS medical.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    user_id VARCHAR(255), -- For future multi-user support
    metadata JSONB DEFAULT '{}'::jsonb,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS medical.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES medical.conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Intent and confidence tracking
    intent VARCHAR(50), -- 'medical', 'general', 'research', 'conversation'
    confidence_score FLOAT, -- 0.0 to 1.0
    confidence_reasoning TEXT,
    
    -- Source tracking
    sources JSONB DEFAULT '[]'::jsonb, -- Array of source objects with tier, url, etc.
    medical_document_ids UUID[], -- References to medical.documents
    web_sources JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    model_version VARCHAR(100), -- e.g., 'claude-4-sonnet'
    tokens_input INTEGER,
    tokens_output INTEGER,
    processing_time_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- MEMORY SYSTEM
-- ============================================

-- User facts table (permanent, high-confidence information)
CREATE TABLE IF NOT EXISTS medical.user_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fact_type VARCHAR(50) NOT NULL, -- 'medical_condition', 'allergy', 'medication', 'procedure', 'preference', etc.
    content TEXT NOT NULL,
    confidence FLOAT DEFAULT 1.0,
    
    -- Source tracking
    source_type VARCHAR(50) NOT NULL, -- 'medical_record', 'user_stated', 'inferred'
    source_document_id UUID REFERENCES medical.documents(id),
    source_conversation_id UUID REFERENCES medical.conversations(id),
    source_message_id UUID REFERENCES medical.messages(id),
    
    -- Temporal tracking
    fact_date DATE, -- When the fact occurred (e.g., surgery date)
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP, -- NULL means still valid
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_by VARCHAR(100), -- 'system', 'user', 'medical_record'
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Memory embeddings table (for semantic search of learnings)
CREATE TABLE IF NOT EXISTS medical.memory_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(1024),
    
    -- Classification
    memory_type VARCHAR(50) NOT NULL, -- 'instruction', 'preference', 'learning', 'correction'
    category VARCHAR(50), -- 'medical', 'general', 'behavioral'
    
    -- Source tracking
    source_conversation_id UUID REFERENCES medical.conversations(id),
    source_message_id UUID REFERENCES medical.messages(id),
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Lifecycle management
    model_version VARCHAR(100), -- Model this was created for
    is_active BOOLEAN DEFAULT TRUE,
    relevance_score FLOAT DEFAULT 1.0, -- Decreases over time or with disuse
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- INDEXES
-- ============================================

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_created ON medical.conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON medical.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON medical.conversations(is_pinned, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON medical.conversations(user_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON medical.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_role ON medical.messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_intent ON medical.messages(intent);
CREATE INDEX IF NOT EXISTS idx_messages_created ON medical.messages(created_at DESC);

-- User facts indexes
CREATE INDEX IF NOT EXISTS idx_facts_type ON medical.user_facts(fact_type);
CREATE INDEX IF NOT EXISTS idx_facts_valid ON medical.user_facts(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_facts_source_doc ON medical.user_facts(source_document_id);
CREATE INDEX IF NOT EXISTS idx_facts_confidence ON medical.user_facts(confidence DESC);

-- Memory embeddings indexes
CREATE INDEX IF NOT EXISTS idx_memory_type ON medical.memory_embeddings(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_active ON medical.memory_embeddings(is_active, relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_memory_usage ON medical.memory_embeddings(usage_count DESC);

-- Vector similarity index for memory embeddings
CREATE INDEX IF NOT EXISTS memory_embedding_idx 
ON medical.memory_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update conversation updated_at timestamp
CREATE OR REPLACE FUNCTION medical.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE medical.conversations 
    SET 
        updated_at = CURRENT_TIMESTAMP,
        last_message_at = NEW.created_at,
        message_count = message_count + 1
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update conversation timestamp when message is added
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON medical.messages;
CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON medical.messages
    FOR EACH ROW
    EXECUTE FUNCTION medical.update_conversation_timestamp();

-- Function to search memory embeddings
CREATE OR REPLACE FUNCTION medical.search_memories(
    query_embedding vector(1024),
    memory_types VARCHAR[] DEFAULT NULL,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INTEGER DEFAULT 10,
    only_active BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity FLOAT,
    memory_type VARCHAR,
    category VARCHAR,
    relevance_score FLOAT,
    usage_count INTEGER,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.content,
        (1 - (m.embedding <=> query_embedding))::FLOAT as similarity,
        m.memory_type,
        m.category,
        m.relevance_score,
        m.usage_count,
        m.metadata
    FROM medical.memory_embeddings m
    WHERE 
        (1 - (m.embedding <=> query_embedding)) > match_threshold
        AND (NOT only_active OR m.is_active = TRUE)
        AND (memory_types IS NULL OR m.memory_type = ANY(memory_types))
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to get conversation with messages
CREATE OR REPLACE FUNCTION medical.get_conversation_with_messages(
    conv_id UUID,
    message_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    conversation_id UUID,
    conversation_title VARCHAR,
    conversation_created_at TIMESTAMP,
    conversation_updated_at TIMESTAMP,
    is_pinned BOOLEAN,
    message_id UUID,
    message_role VARCHAR,
    message_content TEXT,
    message_created_at TIMESTAMP,
    message_intent VARCHAR,
    message_confidence FLOAT,
    message_sources JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id as conversation_id,
        c.title as conversation_title,
        c.created_at as conversation_created_at,
        c.updated_at as conversation_updated_at,
        c.is_pinned,
        m.id as message_id,
        m.role as message_role,
        m.content as message_content,
        m.created_at as message_created_at,
        m.intent as message_intent,
        m.confidence_score as message_confidence,
        m.sources as message_sources
    FROM medical.conversations c
    LEFT JOIN medical.messages m ON m.conversation_id = c.id
    WHERE c.id = conv_id
    ORDER BY m.created_at ASC
    LIMIT message_limit;
END;
$$;

-- ============================================
-- GRANTS
-- ============================================

GRANT ALL PRIVILEGES ON medical.conversations TO lazarus_admin;
GRANT ALL PRIVILEGES ON medical.messages TO lazarus_admin;
GRANT ALL PRIVILEGES ON medical.user_facts TO lazarus_admin;
GRANT ALL PRIVILEGES ON medical.memory_embeddings TO lazarus_admin;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Migration complete' as status;

SELECT 'New tables created' as status, COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'medical' 
AND table_name IN ('conversations', 'messages', 'user_facts', 'memory_embeddings');

SELECT 'Indexes created' as status, COUNT(*) as count
FROM pg_indexes 
WHERE schemaname = 'medical' 
AND tablename IN ('conversations', 'messages', 'user_facts', 'memory_embeddings');
