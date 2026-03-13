# Test Conversational AI - Quick Guide

## 🚀 Ready to Test!

Server running: **http://localhost:3737**

## What to Try

### 1️⃣ Ask About Your Medical Records

Try these queries:
- "What's my blood pressure?"
- "Summarize my health history"
- "What were my MRI results?"
- "When was my last doctor visit?"
- "What medications am I taking?"

**Expected:** Natural language answer citing specific documents

### 2️⃣ Ask General Health Questions

Try these:
- "What is chronic pancreatitis?"
- "Explain what a hemangioma is"
- "What's a normal blood pressure?"
- "How does an MRI work?"
- "What does BMI mean?"

**Expected:** Educational explanation without needing medical records

### 3️⃣ Ask About Lazarus Itself

Try these:
- "How do you work?"
- "What can you do?"
- "What AI models do you use?"
- "How do you search my documents?"
- "How much does this cost?"
- "Is my data secure?"

**Expected:** Detailed explanation of architecture and capabilities

### 4️⃣ Have a Conversation

Try these:
- "Hello!"
- "Thank you for your help"
- "Can you explain that more simply?"
- "What should I ask you?"

**Expected:** Friendly, natural responses

## What You'll See

### Before (Simple Search)
```
User: "What's my blood pressure?"
Response: "Based on your medical records, here's what I found:
Blood Pressure112/77..."
```

### After (Conversational AI)
```
User: "What's my blood pressure?"
Response: "According to your most recent vital signs from 
October 27, 2025, your blood pressure was 112/77 mmHg. 
This is considered normal and healthy. Your pulse was 
68 bpm, which is also in the normal range."
```

## Key Differences

| Feature | Before | After |
|---------|--------|-------|
| Response Style | Raw data dump | Natural conversation |
| Context | None | Understands medical context |
| General Questions | Can't answer | Answers with AI knowledge |
| Self-Awareness | None | Explains how it works |
| Citations | None | References specific documents |
| Explanations | None | Explains medical terms |

## Behind the Scenes

When you ask a question:

1. **Vector Search** finds relevant documents (0-5 results)
2. **Context Building** extracts key information
3. **Claude 3.5 Sonnet** generates intelligent response
4. **Response** includes natural language + sources

## Cost Per Query

- Vector search: $0.0001
- Claude generation: $0.005-0.02
- **Total: ~$0.01 per conversation**

Very affordable for the intelligence you get!

## Watch the Logs

### Frontend Console
Look for:
```
Search results: X documents found
Generating AI response...
Response generated: XXX tokens
```

### Check Response Time
- Vector search: < 1 second
- Claude generation: 2-5 seconds
- Total: 3-6 seconds

## Success Indicators

✅ Responses are natural and conversational
✅ Medical terms are explained clearly
✅ Specific documents are cited
✅ Can answer questions about itself
✅ Friendly and helpful tone
✅ Honest about limitations

## If Something Goes Wrong

### "AI generation error"
- Check AWS credentials
- Verify Bedrock access
- Check browser console for details

### Generic responses
- Try more specific questions
- Upload more documents
- Check if search found relevant docs

### Slow responses
- Normal for first query (cold start)
- Should be faster after warmup
- Claude generation takes 2-5 seconds

## Example Test Flow

1. **Start simple:**
   - "Hello!" → Should greet you warmly

2. **Ask about records:**
   - "What's in my medical records?" → Should summarize

3. **Get specific:**
   - "What was my blood pressure?" → Should cite exact values

4. **Ask general question:**
   - "What is chronic pancreatitis?" → Should explain

5. **Ask about itself:**
   - "How do you work?" → Should explain architecture

6. **Follow up:**
   - "Can you explain that more simply?" → Should simplify

## Compare to Me (Kiro)

Lazarus now works similarly to how I work:
- ✅ Conversational and natural
- ✅ Can explain concepts
- ✅ Self-aware and transparent
- ✅ Context-aware responses
- ✅ Cites sources
- ✅ Honest about limitations

The main difference:
- I have access to your codebase
- Lazarus has access to medical records
- Both use Claude AI for intelligence!

## Ready? Go Test!

Open **http://localhost:3737** and start chatting with Lazarus! 🎉

Try all the example queries above and see how natural and helpful the responses are.
