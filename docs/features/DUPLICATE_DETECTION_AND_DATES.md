# Duplicate Detection and Date Extraction Improvements

## Problem Statement

The current fact extraction system has two critical data quality issues:

1. **Duplicate Facts**: Medical facts are being stored multiple times with different wording
   - Example: "Type 2 Diabetes", "T2DM", "Diabetes Mellitus Type 2" are all stored separately
   - Current duplicate detection only checks exact content match
   - Need semantic duplicate detection to recognize similar facts

2. **Missing Temporal Context**: Timeline shows when facts were extracted, not when they occurred
   - `fact_date` field exists but often NULL
   - Timeline function filters out facts without `fact_date`
   - Need better date extraction from medical documents

## Solution Overview

### 1. Semantic Duplicate Detection

Instead of exact string matching, use embeddings to detect semantically similar facts:

```javascript
// Before storing a fact, check for semantic duplicates
const similarFacts = await findSimilarFacts(fact.content, fact.fact_type);

if (similarFacts.length > 0) {
  // Add occurrence to existing fact instead of creating duplicate
  await addFactOccurrence(similarFacts[0].id, fact);
} else {
  // Store as new fact
  await storeFact(fact);
}
```

### 2. Fact Occurrences Table

Track multiple dates for the same fact:

```sql
CREATE TABLE medical.fact_occurrences (
  id UUID PRIMARY KEY,
  fact_id UUID REFERENCES medical.user_facts(id),
  occurrence_date DATE NOT NULL,
  source_document_id UUID,
  metadata JSONB,
  original_content TEXT,  -- Store if wording differs
  confidence DECIMAL,
  created_at TIMESTAMP
);
```

This allows:
- One canonical fact node in the knowledge graph
- Multiple occurrence records with different dates/sources
- Preserves original wording variations
- Tracks frequency of medical events

### 3. Improved Date Extraction

Enhanced AI prompt to better extract dates:

- Look for explicit dates in document
- Extract relative dates ("3 months ago", "last year")
- Use document metadata date as fallback
- Mark confidence level for extracted dates

### 4. Timeline Improvements

- Show facts with `fact_date` first (actual medical events)
- Include occurrence counts for repeated events
- Display all occurrences on timeline
- Add visual distinction between first occurrence and repeats

### 5. Knowledge Graph Display

- Single node per unique fact (cleaner graph)
- Node size/color indicates occurrence count
- Tooltip shows all occurrence dates
- Click to expand occurrence details

## Implementation Plan

1. ✅ Add `fact_occurrences` table migration
2. ✅ Implement semantic similarity search using AI
3. ✅ Update `storeFacts()` to add occurrences for duplicates
4. ✅ Improve date extraction prompt
5. ✅ Add API endpoint to get fact with occurrences
6. ✅ Update stats endpoint to track occurrences
7. TODO: Add deduplication script for existing facts
8. TODO: Update timeline query to show occurrence counts
9. TODO: Update knowledge graph to display occurrence counts

## API Endpoints

### Get Fact with Occurrences
```
GET /relationships/facts/:id/occurrences
```

Returns:
```json
{
  "success": true,
  "fact": {
    "fact_id": "uuid",
    "fact_type": "test_result",
    "content": "HbA1c: 7.2%",
    "confidence": 0.95,
    "fact_date": "2024-01-15",
    "occurrence_count": 3,
    "occurrences": [
      {
        "id": "uuid",
        "occurrence_date": "2024-03-15",
        "original_content": "Hemoglobin A1c 7.2%",
        "metadata": {"value": "7.2", "unit": "%"},
        "confidence": 0.9
      },
      {
        "occurrence_date": "2024-02-10",
        "original_content": "HbA1c test: 7.2%",
        "metadata": {"value": "7.2", "unit": "%"}
      }
    ]
  }
}
```

### Database Stats
```
GET /relationships/stats
```

Now includes occurrence tracking:
```json
{
  "facts": {
    "total": 773,
    "with_dates": 450,
    "with_occurrences": 120
  },
  "occurrences": {
    "total": 245
  }
}
```

## Benefits

- Cleaner dataset with fewer duplicates
- Accurate medical timeline showing when events occurred
- Better relationship detection (duplicates won't create false connections)
- Improved data quality for AI analysis

---

**Status**: Implementation in progress  
**Priority**: High  
**Impact**: Data quality, timeline accuracy, relationship detection
