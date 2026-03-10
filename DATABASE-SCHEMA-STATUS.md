# Database Schema Status - March 9, 2026

## Current Database State

### Schemas Present

The database has **TWO** conversation schemas:

#### 1. Simple Schema (public schema) - CURRENTLY IN USE
```sql
public.conversations (4 columns, 48 kB)
  - id, title, created_at, updated_at

public.conversation_memory (8 columns, 136 kB)
  - id, conversation_id, user_message, assistant_response
  - intent, confidence_score, sources_used, created_at
```

**Used by**: Current Lambda functions (api-chat, api-conversations)

#### 2. Comprehensive Schema (medical schema) - NOT IN USE
```sql
medical.conversations (10 columns, 96 kB)
  - id, title, created_at, updated_at, is_pinned, is_archived
  - user_id, metadata, message_count, last_message_at

medical.messages (16 columns, 200 kB)
  - id, conversation_id, role, content, created_at
  - intent, confidence_score, confidence_reasoning
  - sources, medical_document_ids, web_sources
  - model_version, tokens_input, tokens_output, processing_time_ms, metadata

medical.user_facts (15 columns, 48 kB)
  - Long-term user information (conditions, allergies, medications)
  - Source tracking, temporal validity, confidence scoring

medical.memory_embeddings (15 columns, 1648 kB)
  - Semantic memory with vector embeddings
  - Learning, preferences, corrections
  - Usage tracking and relevance scoring
```

**Status**: Created but not used by any Lambda functions

### Other Tables

```sql
medical.documents (9 columns, 7440 kB, 321 rows)
  - Document storage with vector embeddings
  - Used by vector search Lambda

medical.providers (9 columns, 16 kB)
medical.visits (9 columns, 32 kB)
medical.health_metrics (9 columns, 24 kB)
```

### Extensions

- ✅ pgvector 0.8.1 installed and working

## The Situation

### What's Working
1. Lambda functions use simple schema (public.conversations, public.conversation_memory)
2. Conversations are saved and retrieved correctly
3. Vector search works with medical.documents
4. All core features functional

### What's Not Being Used
1. Comprehensive medical.conversations and medical.messages tables
2. User facts tracking (medical.user_facts)
3. Memory embeddings (medical.memory_embeddings)
4. Advanced features like:
   - Message role tracking (user/assistant/system)
   - Token usage tracking
   - Processing time metrics
   - Confidence reasoning
   - Medical document ID references
   - User-specific data isolation

## Migration Options

### Option 1: Keep Simple Schema (Current State)
**Pros**:
- Already working
- Simpler to maintain
- Adequate for current needs

**Cons**:
- Missing advanced features
- No memory system
- No user facts tracking
- Limited metadata

### Option 2: Migrate to Comprehensive Schema (Recommended)
**Pros**:
- Full feature set available
- Better data structure
- Memory and learning capabilities
- User facts tracking
- Better analytics

**Cons**:
- Need to update Lambda functions
- Need to migrate existing data
- More complex queries

### Option 3: Hybrid Approach
**Pros**:
- Keep simple schema for conversations
- Use medical schema for advanced features
- Gradual migration

**Cons**:
- Data duplication
- Complexity in maintaining two systems

## Recommended Action

### Immediate: Migrate to Comprehensive Schema

**Why**:
1. Tables already exist (no infrastructure changes needed)
2. Better data model for medical application
3. Enables future features (memory, user facts)
4. Proper separation of concerns (medical schema)

**Steps**:

1. **Update Lambda Functions** (2-3 hours)
   - Update api-chat to use medical.messages
   - Update api-conversations to use medical.conversations
   - Update queries to match new schema

2. **Migrate Existing Data** (1 hour)
   - Copy public.conversations → medical.conversations
   - Transform public.conversation_memory → medical.messages
   - Verify data integrity

3. **Test End-to-End** (1 hour)
   - Test conversation creation
   - Test message saving
   - Test conversation listing
   - Test conversation retrieval

4. **Deploy** (30 minutes)
   - Deploy updated Lambda functions
   - Verify in production

5. **Cleanup** (optional)
   - Archive old tables
   - Document migration

## Data Migration Script

```sql
-- Migrate conversations
INSERT INTO medical.conversations (id, title, created_at, updated_at)
SELECT id, title, created_at, updated_at
FROM public.conversations
ON CONFLICT (id) DO NOTHING;

-- Migrate messages (transform schema)
INSERT INTO medical.messages (
    conversation_id,
    role,
    content,
    created_at,
    intent,
    confidence_score,
    sources
)
SELECT 
    conversation_id,
    'user' as role,
    user_message as content,
    created_at,
    intent,
    confidence_score,
    sources_used as sources
FROM public.conversation_memory

UNION ALL

SELECT 
    conversation_id,
    'assistant' as role,
    assistant_response as content,
    created_at + INTERVAL '1 second' as created_at,
    intent,
    confidence_score,
    sources_used as sources
FROM public.conversation_memory

ORDER BY conversation_id, created_at;

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
```

## Next Steps

1. ✅ Verify database state (DONE)
2. ⏳ Create data migration script
3. ⏳ Update Lambda functions to use medical schema
4. ⏳ Test locally
5. ⏳ Run migration on production database
6. ⏳ Deploy updated Lambda functions
7. ⏳ Verify end-to-end functionality

## Impact Assessment

**User Impact**: None (transparent migration)

**Downtime**: None (can run migration while system is live)

**Rollback**: Easy (keep old tables, switch Lambda back)

**Risk**: Low (tables exist, just changing which ones are used)

---

**Recommendation**: Proceed with migration to comprehensive schema. It's a straightforward change that unlocks significant future capabilities.
