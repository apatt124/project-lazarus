-- Migration: Move from public schema to medical schema
-- Project Lazarus - Migrate existing conversation data
-- Run this after verifying medical.conversations and medical.messages exist

-- ============================================
-- STEP 1: Migrate Conversations
-- ============================================

INSERT INTO medical.conversations (id, title, created_at, updated_at)
SELECT 
    id, 
    title, 
    created_at, 
    updated_at
FROM public.conversations
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    updated_at = EXCLUDED.updated_at;

-- ============================================
-- STEP 2: Migrate Messages (Transform Schema)
-- ============================================

-- First, create a temporary table to hold the transformed data
CREATE TEMP TABLE temp_messages AS
SELECT 
    gen_random_uuid() as id,
    conversation_id,
    'user' as role,
    user_message as content,
    created_at,
    intent,
    confidence_score,
    NULL::text as confidence_reasoning,
    sources_used as sources,
    NULL::uuid[] as medical_document_ids,
    '{}'::jsonb as web_sources,
    NULL::varchar(100) as model_version,
    NULL::integer as tokens_input,
    NULL::integer as tokens_output,
    NULL::integer as processing_time_ms,
    '{}'::jsonb as metadata
FROM public.conversation_memory

UNION ALL

SELECT 
    gen_random_uuid() as id,
    conversation_id,
    'assistant' as role,
    assistant_response as content,
    created_at + INTERVAL '1 second' as created_at,
    intent,
    confidence_score,
    NULL::text as confidence_reasoning,
    sources_used as sources,
    NULL::uuid[] as medical_document_ids,
    '{}'::jsonb as web_sources,
    'claude-sonnet-4' as model_version,
    NULL::integer as tokens_input,
    NULL::integer as tokens_output,
    NULL::integer as processing_time_ms,
    '{}'::jsonb as metadata
FROM public.conversation_memory;

-- Insert into medical.messages
INSERT INTO medical.messages (
    id,
    conversation_id,
    role,
    content,
    created_at,
    intent,
    confidence_score,
    confidence_reasoning,
    sources,
    medical_document_ids,
    web_sources,
    model_version,
    tokens_input,
    tokens_output,
    processing_time_ms,
    metadata
)
SELECT * FROM temp_messages
ORDER BY conversation_id, created_at
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 3: Update Conversation Metadata
-- ============================================

-- Update message counts
UPDATE medical.conversations c
SET message_count = (
    SELECT COUNT(*) 
    FROM medical.messages m 
    WHERE m.conversation_id = c.id
);

-- Update last_message_at
UPDATE medical.conversations c
SET last_message_at = (
    SELECT MAX(created_at) 
    FROM medical.messages m 
    WHERE m.conversation_id = c.id
);

-- ============================================
-- STEP 4: Verification
-- ============================================

-- Count records
SELECT 
    'public.conversations' as table_name,
    COUNT(*) as count
FROM public.conversations

UNION ALL

SELECT 
    'medical.conversations' as table_name,
    COUNT(*) as count
FROM medical.conversations

UNION ALL

SELECT 
    'public.conversation_memory' as table_name,
    COUNT(*) as count
FROM public.conversation_memory

UNION ALL

SELECT 
    'medical.messages' as table_name,
    COUNT(*) as count
FROM medical.messages;

-- Show sample data
SELECT 
    c.id,
    c.title,
    c.message_count,
    c.last_message_at,
    COUNT(m.id) as actual_message_count
FROM medical.conversations c
LEFT JOIN medical.messages m ON m.conversation_id = c.id
GROUP BY c.id, c.title, c.message_count, c.last_message_at
ORDER BY c.updated_at DESC
LIMIT 5;

-- ============================================
-- STEP 5: Backup Old Tables (Optional)
-- ============================================

-- Rename old tables to _backup
-- ALTER TABLE public.conversations RENAME TO conversations_backup;
-- ALTER TABLE public.conversation_memory RENAME TO conversation_memory_backup;

-- Or drop them if you're confident
-- DROP TABLE public.conversation_memory;
-- DROP TABLE public.conversations;

SELECT 'Migration complete! Review the verification output above.' as status;
