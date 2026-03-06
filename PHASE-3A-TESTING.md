# Phase 3a Testing Guide: Memory System

## Quick Start

Phase 3a implements the memory system with embeddings. Here's how to test it.

## Prerequisites

1. Development server running:
```bash
cd frontend
npm run dev
```

2. Database connection working (`.env` configured)
3. AWS credentials configured for Bedrock access

## Test Scenarios

### 1. Test Memory Creation from Preferences

**Conversation 1:**
```
User: "I prefer detailed medical explanations with lots of context"
```

**Expected:**
- AI responds normally
- Check console logs: "Extracted and saved X learnings"
- Check database:
```sql
SELECT * FROM medical.memory_embeddings 
WHERE memory_type = 'preference' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Verify:**
- Memory exists with `memory_type = 'preference'`
- `content` contains the preference
- `embedding` is a 1024-element array
- `category` is 'general' or 'medical'

### 2. Test Cross-Conversation Learning

**Conversation 1:**
```
User: "I prefer detailed explanations"
```

**Conversation 2 (new conversation):**
```
User: "Explain chronic pancreatitis to me"
```

**Expected:**
- Console logs: "Found X relevant memories"
- Response should be more detailed than usual
- Memory context should be included in the prompt

**Verify in Console:**
```
Found 1 relevant memories
Memory: User preference: I prefer detailed explanations
```

### 3. Test User Instructions

**Conversation 1:**
```
User: "Always cite your sources when discussing medical information"
```

**Conversation 2:**
```
User: "What is pancreatitis?"
```

**Expected:**
- Memory created with `memory_type = 'instruction'`
- Second conversation retrieves the instruction
- Response includes explicit source citations

### 4. Test User Corrections

**Conversation:**
```
User: "What were my lipase levels?"
AI: [responds]
User: "Actually, that's not correct. My lipase was 1450, not 145."
```

**Expected:**
- Correction memory created
- Future queries about lipase should reference the correction

**Check Database:**
```sql
SELECT * FROM medical.memory_embeddings 
WHERE memory_type = 'correction' 
ORDER BY created_at DESC;
```

### 5. Test Fact Extraction

**Upload a medical document containing:**
```
Patient Allergies: Penicillin, Acetaminophen
Current Medications: Creon 24,000 units TID, Gabapentin 300mg BID
Diagnosed with: Chronic Pancreatitis, POTS Syndrome
Surgical History: Cholecystectomy (2018), Puestow Procedure (2019)
```

**Expected:**
- Facts extracted automatically during upload
- Check database:
```sql
SELECT fact_type, content, confidence, source_type 
FROM medical.user_facts 
ORDER BY created_at DESC;
```

**Verify:**
- Allergies extracted (confidence ~0.9)
- Medications extracted (confidence ~0.85)
- Conditions extracted (confidence ~0.8)
- Procedures extracted (confidence ~0.85)

### 6. Test Memory Search Relevance

**Conversation 1:**
```
User: "I like when you explain things in simple terms"
```

**Conversation 2:**
```
User: "What is a lipase test?"
```

**Expected:**
- Memory search finds the preference
- Response uses simpler language
- Console shows similarity score

**Conversation 3:**
```
User: "Tell me about quantum physics"
```

**Expected:**
- Same preference memory retrieved
- Response uses simple language for physics too

### 7. Test Memory Usage Tracking

**Repeat the same query multiple times:**
```
Conversation 1: "I prefer detailed explanations"
Conversation 2: "Explain pancreatitis"
Conversation 3: "Explain diabetes"
Conversation 4: "Explain POTS"
```

**Check Database:**
```sql
SELECT content, usage_count, last_used_at 
FROM medical.memory_embeddings 
WHERE memory_type = 'preference' 
ORDER BY usage_count DESC;
```

**Expected:**
- `usage_count` increases with each retrieval
- `last_used_at` updates to most recent time

### 8. Test Intent-Based Memory Filtering

**Medical Preference:**
```
User: "When discussing my medical records, always be very thorough"
```

**General Query:**
```
User: "What's the weather like?"
```

**Expected:**
- Medical preference NOT retrieved for general query
- Only relevant memories based on intent

### 9. Test Fact Context in Responses

**After uploading documents with facts:**
```
User: "What medications am I taking?"
```

**Expected:**
- Response includes facts from `user_facts` table
- Facts formatted with confidence indicators (✓✓, ✓, ?)
- Console shows: "Found X relevant user facts"

### 10. Test Memory Threshold

**Create a vague preference:**
```
User: "I like things"
```

**Query something unrelated:**
```
User: "What were my test results?"
```

**Expected:**
- Vague preference should NOT be retrieved (similarity <70%)
- Only relevant memories above threshold

## Database Queries for Verification

### Check All Memories
```sql
SELECT 
  id,
  memory_type,
  category,
  content,
  usage_count,
  relevance_score,
  is_active,
  created_at
FROM medical.memory_embeddings
ORDER BY created_at DESC
LIMIT 20;
```

### Check Memory Usage Stats
```sql
SELECT 
  memory_type,
  category,
  COUNT(*) as count,
  AVG(usage_count) as avg_usage,
  AVG(relevance_score) as avg_relevance
FROM medical.memory_embeddings
WHERE is_active = true
GROUP BY memory_type, category;
```

### Check User Facts
```sql
SELECT 
  fact_type,
  content,
  confidence,
  source_type,
  created_at
FROM medical.user_facts
WHERE valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP
ORDER BY fact_type, confidence DESC;
```

### Check Memory-Message Relationships
```sql
SELECT 
  m.content as memory_content,
  m.memory_type,
  msg.content as source_message,
  c.title as conversation_title
FROM medical.memory_embeddings m
JOIN medical.messages msg ON m.source_message_id = msg.id
JOIN medical.conversations c ON m.source_conversation_id = c.id
ORDER BY m.created_at DESC
LIMIT 10;
```

## Console Log Indicators

### Successful Memory Creation
```
Extracted and saved 1 learnings
Created memory: <uuid> (preference)
```

### Successful Memory Retrieval
```
Found 3 relevant memories
Memory: User preference: I prefer detailed explanations
```

### Successful Fact Extraction
```
Extracted 5 facts from document
```

### Embedding Generation
```
Generating embedding for: "I prefer detailed explanations"
Generated 1024-dimensional embedding
```

## Performance Monitoring

### Expected Timings
- Embedding generation: 200-500ms
- Memory search: 300-600ms
- Fact extraction: 100-300ms per document
- Total query time: +500-1000ms (compared to Phase 2)

### Check Performance
Look for these in console:
```
Intent classification: 5ms
Memory search: 450ms
Medical document search: 300ms
Claude generation: 3200ms
Learning extraction: 520ms
Total: 4475ms
```

## Common Issues

### Issue: "Failed to generate embedding"
**Solution:** Check AWS credentials and Bedrock access. Verify region is us-east-1.

### Issue: No memories retrieved
**Solution:** 
1. Check that memories were created (query database)
2. Verify embeddings are not null
3. Check similarity threshold (default 0.7)
4. Try more similar queries

### Issue: Facts not extracted
**Solution:**
1. Check document format (needs clear patterns)
2. Verify regex patterns match your document style
3. Check console for extraction errors

### Issue: Memory search is slow
**Solution:**
1. Verify pgvector indexes exist
2. Check database connection latency
3. Consider reducing search limit

## Success Criteria

Phase 3a is working if:

1. ✅ Preferences are detected and saved with embeddings
2. ✅ Memories are retrieved in new conversations
3. ✅ Cross-conversation learning works
4. ✅ Instructions are remembered and applied
5. ✅ Corrections are captured and referenced
6. ✅ Facts are extracted from documents
7. ✅ Usage tracking updates correctly
8. ✅ Memory search respects similarity threshold
9. ✅ Intent-based filtering works
10. ✅ Performance is acceptable (<1s overhead)

## Advanced Testing

### Test Memory Consolidation (Future)
```
Conversation 1: "I prefer detailed explanations"
Conversation 2: "I like thorough responses"
Conversation 3: "Give me comprehensive answers"
```

Expected (future): These should consolidate into one memory

### Test Temporal Facts (Future)
```
Document 1 (2020): "Taking Gabapentin 300mg"
Document 2 (2023): "Discontinued Gabapentin"
```

Expected (future): System should know medication is no longer current

### Test Conflict Resolution (Future)
```
Document 1: "Allergic to Penicillin"
Document 2: "No known drug allergies"
```

Expected (future): System should flag conflict and ask for clarification

## Next Steps

After testing Phase 3a:
1. Verify all features work correctly
2. Monitor performance impact
3. Check memory quality and relevance
4. Move to Phase 3b (Web Search) or Phase 4 (UI)

Happy testing! 🧠
