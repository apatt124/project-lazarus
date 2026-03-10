# User Profile & Memory Management - COMPLETE ✅

## Summary
Built a comprehensive user profile and memory management system optimized for single-user deployment. You can now control what the AI remembers and how much weight different pieces of information have.

## What You Can Do

### View Your Profile
Click the user icon (👤) in the chat header to open your medical profile panel.

### Manage Facts (Medical Information)
**Facts Tab** shows extracted medical information:
- Medications you're taking
- Allergies
- Medical conditions
- Procedures and surgeries
- Family history
- Lifestyle factors

**For each fact you can:**
- Adjust confidence (0-100%) using the slider
  - 100%: Verified, certain
  - 80-90%: High confidence
  - 50-70%: Moderate confidence
  - Below 50%: Excluded from AI
- Delete incorrect facts
- See when the fact occurred (if dated)

### Manage Memories (Learnings & Preferences)
**Memories Tab** shows what the AI has learned:
- Instructions you've given
- Preferences you've expressed
- Corrections you've made
- General learnings from conversations

**For each memory you can:**
- Adjust relevance (0-100%) using the slider
  - Higher = more important
  - Lower = less priority
- Toggle active/inactive (eye icon)
  - Inactive memories are hidden but not deleted
- Delete permanently
- See how many times it's been used

## How Weighting Works

### Confidence (Facts)
The AI only uses facts with confidence ≥ 50%. Lower confidence facts show a percentage indicator in the AI's context, so it knows to be cautious.

**Example:**
- "Taking metformin 500mg twice daily" [100% confidence] → Used as certain fact
- "May have family history of heart disease" [60% confidence] → Used with caution
- "Possibly allergic to shellfish" [30% confidence] → Excluded entirely

### Relevance (Memories)
Higher relevance memories are prioritized. Lower relevance memories show a percentage indicator.

**Example:**
- "User prefers detailed explanations" [100% relevance] → Always applied
- "Mentioned interest in nutrition" [60% relevance] → Used when relevant
- "Asked about weather once" [20% relevance] → Low priority

### Active Status
Inactive memories are completely excluded but preserved. You can reactivate them anytime.

## Automatic Extraction

The system automatically extracts facts and memories after each conversation:
- Medical facts (conditions, medications, allergies)
- Preferences (how you like information presented)
- Instructions (things you want the AI to remember)
- Corrections (when you clarify something)

## Current State

**Your Profile Contains:**
- 18 facts across 3 types:
  - 6 medications
  - 6 allergies
  - 6 medical conditions
- 10 memories (all learnings)

**All systems operational:**
- ✅ Automatic fact extraction
- ✅ Semantic memory search
- ✅ Confidence filtering
- ✅ Relevance weighting
- ✅ Active/inactive toggle
- ✅ Delete capabilities
- ✅ Usage tracking

## Best Practices

### For Facts
1. Keep confidence high (>80%) for verified medical information
2. Lower confidence for things you're not sure about
3. Delete facts that are completely wrong
4. Facts below 50% won't be used by the AI

### For Memories
1. Set high relevance (>80%) for important preferences
2. Lower relevance for situational or temporary things
3. Deactivate instead of deleting (you can reactivate later)
4. Delete only if completely irrelevant

### General Tips
- Review your profile periodically
- Adjust weights as your certainty changes
- The AI will show confidence/relevance indicators for lower-weighted items
- Usage count shows which memories are actually being used

## Technical Details

**Database Tables:**
- `medical.user_facts` - Stores facts with confidence scores
- `medical.memory_embeddings` - Stores memories with relevance scores

**API Endpoints:**
- GET /memory/facts - List all facts
- PATCH /memory/facts/{id} - Update confidence
- DELETE /memory/facts/{id} - Delete fact
- GET /memory/memories - List all memories
- PATCH /memory/memories/{id} - Update relevance/active
- DELETE /memory/memories/{id} - Delete memory

**UI Components:**
- UserFactsPanel - Two-tab interface for managing profile
- ChatInterface - Profile button in header

## Single-User Optimization

Since this is for a single user:
- No user authentication needed
- All facts and memories are yours
- No multi-user isolation required
- Simplified data model
- Direct database access

If you decide to expand to multiple users in the future, you'll need to:
- Add user authentication
- Add user_id to facts and memories tables
- Filter queries by user_id
- Add user management UI

---
**Status**: COMPLETE
**Date**: March 10, 2026
**Optimized For**: Single user deployment
**Next Steps**: Use the system and adjust weights as needed
