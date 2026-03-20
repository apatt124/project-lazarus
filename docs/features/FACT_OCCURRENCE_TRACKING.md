# Fact Occurrence Tracking

## Overview

Lazarus now tracks multiple occurrences of the same medical fact, allowing the knowledge graph to display a single node while preserving all instances with their dates and sources.

## Problem Solved

Previously, when the same medical fact appeared multiple times (e.g., "HbA1c: 7.2%" tested quarterly), the system would either:
- Create duplicate nodes (cluttering the graph)
- Skip duplicates entirely (losing temporal information)

Now, duplicate facts are consolidated into one canonical fact with multiple occurrence records.

## How It Works

### 1. Semantic Duplicate Detection

When extracting facts, the system uses AI to identify semantically similar facts:

```javascript
// Example: These are recognized as the same fact
"Type 2 Diabetes"
"T2DM"  
"Diabetes Mellitus Type 2"
```

The AI compares new facts against existing ones and determines if they describe the same medical concept, even with different wording.

### 2. Occurrence Storage

When a duplicate is detected:
- The canonical fact remains unchanged
- A new occurrence record is created with:
  - Occurrence date
  - Source document
  - Original wording (if different)
  - Occurrence-specific metadata

### 3. Knowledge Graph Display

- Single node per unique medical fact
- Node displays occurrence count
- Clicking shows all dates/sources
- Timeline shows all occurrences

## Database Schema

```sql
-- Canonical facts (one per unique medical concept)
medical.user_facts
  - id (primary key)
  - fact_type
  - content (canonical wording)
  - fact_date (first occurrence)
  - confidence
  - metadata

-- Multiple occurrences of the same fact
medical.fact_occurrences
  - id (primary key)
  - fact_id (references user_facts)
  - occurrence_date
  - source_document_id
  - original_content (if wording differs)
  - metadata (occurrence-specific)
  - confidence
```

## Example Use Cases

### Quarterly Lab Tests

```
Fact: "HbA1c: 7.2%"
Occurrences:
  - 2024-01-15: "HbA1c 7.2%" (from lab report)
  - 2024-04-10: "Hemoglobin A1c: 7.2%" (from doctor's note)
  - 2024-07-05: "HbA1c test result 7.2%" (from follow-up)

Knowledge Graph: Single node "HbA1c: 7.2%" with count badge "3"
Timeline: Three events showing the test was repeated
```

### Ongoing Medications

```
Fact: "Metformin 500mg twice daily"
Occurrences:
  - 2023-06-01: "Started Metformin 500mg BID"
  - 2023-09-15: "Continuing Metformin 500mg twice daily"
  - 2024-01-10: "Metformin 500mg BID refilled"

Knowledge Graph: Single node with medication details
Timeline: Shows medication start and continuations
```

### Chronic Conditions

```
Fact: "Type 2 Diabetes"
Occurrences:
  - 2020-03-15: "Diagnosed with Type 2 Diabetes Mellitus"
  - 2021-06-20: "T2DM" (mentioned in specialist note)
  - 2024-01-05: "Type 2 Diabetes" (annual checkup)

Knowledge Graph: Single node for the condition
Timeline: Shows diagnosis date and subsequent mentions
```

## API Usage

### Get Fact with All Occurrences

```bash
GET /relationships/facts/{fact_id}/occurrences
```

Response:
```json
{
  "success": true,
  "fact": {
    "fact_id": "abc-123",
    "fact_type": "test_result",
    "content": "HbA1c: 7.2%",
    "fact_date": "2024-01-15",
    "occurrence_count": 3,
    "occurrences": [
      {
        "occurrence_date": "2024-07-05",
        "original_content": "HbA1c test result 7.2%",
        "source_document_id": "doc-789"
      },
      {
        "occurrence_date": "2024-04-10",
        "original_content": "Hemoglobin A1c: 7.2%",
        "source_document_id": "doc-456"
      },
      {
        "occurrence_date": "2024-01-15",
        "original_content": "HbA1c 7.2%",
        "source_document_id": "doc-123"
      }
    ]
  }
}
```

### Database Statistics

```bash
GET /relationships/stats
```

Now includes occurrence tracking:
```json
{
  "facts": {
    "total": 773,
    "with_occurrences": 120
  },
  "occurrences": {
    "total": 245
  }
}
```

## Benefits

1. **Cleaner Knowledge Graph**: One node per unique fact instead of duplicates
2. **Preserved Temporal Data**: All occurrence dates are tracked
3. **Better Insights**: See frequency of tests, medication refills, condition mentions
4. **Accurate Timeline**: Shows when medical events actually occurred
5. **Flexible Wording**: Recognizes facts even with different terminology

## Implementation Status

- ✅ Database migration created
- ✅ Semantic duplicate detection implemented
- ✅ Occurrence storage implemented
- ✅ API endpoints added
- ✅ Stats tracking updated
- 🔄 Knowledge graph UI update (pending)
- 🔄 Timeline UI update (pending)

## Next Steps

1. Run database migration to create `fact_occurrences` table
2. Deploy updated Lambda functions
3. Re-extract facts from existing documents (will consolidate duplicates)
4. Update frontend to display occurrence counts
5. Add timeline view showing all occurrences

---

**Created**: March 16, 2026  
**Status**: Implemented (backend), UI updates pending  
**Impact**: Improved data quality, cleaner knowledge graph, better temporal tracking
