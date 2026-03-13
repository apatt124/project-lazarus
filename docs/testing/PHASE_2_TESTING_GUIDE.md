# Phase 2 Testing Guide

## Quick Start

Phase 2 is now complete and ready for testing! Here's how to test the new features.

## Prerequisites

1. Make sure your development server is running:
```bash
cd frontend
npm run dev
```

2. Ensure your database connection is working (`.env` file configured)

3. Have some medical documents uploaded to test with

## Testing Scenarios

### 1. Intent Classification

Open the browser console and watch the logs as you send different types of queries:

**Medical Query:**
```
"What were my lipase levels?"
"Give me my full medical history"
"Show me my test results from last year"
```
Expected: Intent = "medical", High confidence, Medical documents loaded

**Research Query:**
```
"What is chronic pancreatitis?"
"How does POTS syndrome affect the body?"
"What are the latest treatments for diabetes?"
```
Expected: Intent = "research", Moderate confidence

**General Query:**
```
"What can you help me with?"
"How do I export my data?"
```
Expected: Intent = "general", Lower confidence

**Conversational Query:**
```
"Hello!"
"Thank you for your help"
"How are you doing?"
```
Expected: Intent = "conversation", Minimal context loading

### 2. Conversation Persistence

**Test Flow:**
1. Send first message: "What were my lipase levels?"
2. Check response - should include `conversation_id`
3. Send follow-up: "What about my other lab results?"
4. Both messages should be in the same conversation
5. Refresh page - conversation should persist in database

**Verify in Database:**
```sql
-- Check conversations
SELECT * FROM medical.conversations ORDER BY created_at DESC LIMIT 5;

-- Check messages
SELECT id, conversation_id, role, intent, confidence_score, created_at 
FROM medical.messages 
ORDER BY created_at DESC 
LIMIT 10;
```

### 3. Confidence Indicators

Look for the badges in the UI:

**High Confidence (✓):**
- Green badge
- Based on medical records (Tier 1 sources)
- Example: "What were my test results?"

**Moderate Confidence (ℹ️):**
- Blue badge
- Based on general knowledge or mixed sources
- Example: "What is pancreatitis?"

**Low Confidence (⚠️):**
- Orange badge
- Limited or no sources
- Example: "What's the weather like?"

### 4. Intent Badges

Check for intent badges next to confidence:

- 🏥 Medical - Queries about personal medical records
- 🔍 Research - Queries seeking information
- 💬 General - General assistance queries
- 💭 Chat - Conversational messages

### 5. Source Quality Display

When sources are shown, you should see:
- Number of medical records used
- Number of authoritative sources (when web search is added)
- Number of professional sources (when web search is added)

Example: "3 medical records • 2 authoritative"

### 6. Comprehensive Queries

Test the comprehensive keyword detection:

```
"Give me my complete medical history"
"Show me all my test results"
"I want a detailed summary of everything"
```

Expected behavior:
- Higher search limit (100 vs 50)
- Lower similarity threshold (0.001 vs 0.01)
- More comprehensive response (5000-8000 characters)
- More sources cited

### 7. Conversation Management API

**List Conversations:**
```bash
curl http://localhost:3737/api/conversations
```

**Get Specific Conversation:**
```bash
curl http://localhost:3737/api/conversations/<conversation_id>
```

**Rename Conversation:**
```bash
curl -X PATCH http://localhost:3737/api/conversations/<conversation_id> \
  -H "Content-Type: application/json" \
  -d '{"title": "My Lipase Results Discussion"}'
```

**Pin Conversation:**
```bash
curl -X PATCH http://localhost:3737/api/conversations/<conversation_id> \
  -H "Content-Type: application/json" \
  -d '{"is_pinned": true}'
```

**Archive Conversation:**
```bash
curl -X PATCH http://localhost:3737/api/conversations/<conversation_id> \
  -H "Content-Type: application/json" \
  -d '{"is_archived": true}'
```

**Delete Conversation:**
```bash
curl -X DELETE http://localhost:3737/api/conversations/<conversation_id>
```

## What to Look For

### In the UI:
1. ✅ Intent badges appear on assistant messages
2. ✅ Confidence indicators show with appropriate colors
3. ✅ Source quality breakdown displays when sources exist
4. ✅ Hover over confidence badge shows reasoning
5. ✅ Conversation persists across multiple messages
6. ✅ Sources section is collapsible (from previous phase)

### In the Console:
1. ✅ Intent classification logs show correct detection
2. ✅ Search parameters adjust based on intent
3. ✅ Conversation ID is created and reused
4. ✅ Confidence scores are calculated
5. ✅ Processing time is logged

### In the Database:
1. ✅ Conversations are created in `medical.conversations`
2. ✅ Messages are saved in `medical.messages`
3. ✅ Intent is stored correctly
4. ✅ Confidence scores are saved
5. ✅ Sources are stored as JSON
6. ✅ Metadata includes intent classification details

## Common Issues

### Issue: "conversation_id not found"
**Solution:** Make sure you're passing the conversation_id from the first response to subsequent messages.

### Issue: No intent badge showing
**Solution:** Check that the API response includes `intent` field. Look at console logs.

### Issue: Confidence always shows "Low"
**Solution:** Make sure you have medical documents uploaded. Queries without sources will have lower confidence.

### Issue: Database connection error
**Solution:** Verify `.env` file has correct database credentials and database is accessible.

### Issue: Sources not showing
**Solution:** Check that medical documents are uploaded and vector search is working.

## Success Criteria

Phase 2 is working correctly if:

1. ✅ Different query types are classified correctly (medical, research, general, conversation)
2. ✅ Conversations persist across multiple messages
3. ✅ Confidence scores reflect source quality (high for medical records, lower for general knowledge)
4. ✅ Intent badges display correctly in the UI
5. ✅ Source quality breakdown shows tier counts
6. ✅ All conversation management APIs work (list, get, update, delete)
7. ✅ Messages are saved to database with full metadata
8. ✅ System prompts adapt based on intent
9. ✅ Comprehensive queries trigger higher limits and lower thresholds
10. ✅ No TypeScript errors or runtime errors

## Next Steps

Once Phase 2 is tested and working:

1. **Phase 3a**: Implement memory system with embeddings
2. **Phase 3b**: Integrate web search for research queries
3. **Phase 3c**: Implement user facts extraction
4. **Phase 4**: Build conversation UI (sidebar, search, management)

## Debugging Tips

### Enable Verbose Logging
Check the terminal running `npm run dev` for detailed logs:
- Intent classification results
- Search parameters used
- Number of documents found
- Confidence calculation details
- Processing time

### Check Network Tab
In browser DevTools > Network:
- Look at `/api/chat` request/response
- Verify `conversation_id` is returned
- Check `intent`, `confidence`, `sources` in response
- Verify token counts and processing time

### Query Database Directly
```sql
-- See recent conversations
SELECT id, title, created_at, message_count, is_pinned 
FROM medical.conversations 
ORDER BY created_at DESC;

-- See recent messages with metadata
SELECT 
  m.id,
  m.role,
  m.intent,
  m.confidence_score,
  m.confidence_reasoning,
  c.title as conversation_title,
  m.created_at
FROM medical.messages m
JOIN medical.conversations c ON m.conversation_id = c.id
ORDER BY m.created_at DESC
LIMIT 10;

-- Check source quality distribution
SELECT 
  intent,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) as message_count
FROM medical.messages
WHERE role = 'assistant'
GROUP BY intent;
```

## Support

If you encounter issues:
1. Check console logs for errors
2. Verify database connection
3. Ensure medical documents are uploaded
4. Check API responses in Network tab
5. Query database to verify data is being saved

Happy testing! 🚀
