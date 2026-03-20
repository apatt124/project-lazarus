# Fact Source Tracking & Verification

## Overview
Complete source tracking for all extracted medical facts, enabling manual verification and audit trails.

## Source Information Available

### For Every Fact:
1. **Source Document**
   - `source_document_id`: UUID linking to documents table
   - `s3_key`: Full path to original file in S3
   - `filename`: Original uploaded filename
   - `upload_date`: When document was uploaded

2. **Document Metadata** (extracted automatically)
   - `document_type`: lab_results, prescription, visit_notes, etc.
   - `document_date`: Date of the medical document
   - `provider`: Doctor/provider name
   - `facility`: Hospital/clinic name
   - `specialty`: Medical specialty

3. **Extraction Metadata**
   - `confidence`: AI confidence score (0.0-1.0)
   - `created_at`: When fact was extracted
   - `verified_by`: Who verified (system/user)
   - `fact_date`: When medical event occurred

4. **Occurrence Tracking**
   - Multiple instances of same fact from different documents
   - Each occurrence preserves: original wording, date, source document
   - Enables seeing fact mentioned across multiple visits

## Verification Workflows

### 1. Verify a Specific Fact

**Use Case**: User clicks on a fact in knowledge graph and wants to see source

**Query**:
```sql
SELECT 
    f.content,
    f.confidence,
    d.metadata->>'filename' as source_file,
    d.metadata->>'document_date' as document_date,
    d.metadata->>'provider' as provider,
    d.s3_key
FROM medical.user_facts f
JOIN medical.documents d ON f.source_document_id = d.id
WHERE f.id = '[fact-uuid]';
```

**Returns**:
- Fact content
- Confidence score
- Source filename
- Document date
- Provider who documented it
- S3 key to retrieve original document

### 2. View All Occurrences

**Use Case**: See all times a fact was mentioned across documents

**Query**:
```sql
SELECT 
    o.occurrence_date,
    o.original_content,
    d.metadata->>'filename' as source,
    d.metadata->>'document_date' as doc_date
FROM medical.fact_occurrences o
JOIN medical.documents d ON o.source_document_id = d.id
WHERE o.fact_id = '[fact-uuid]'
ORDER BY o.occurrence_date DESC;
```

**Returns**:
- All dates fact was observed
- Original wording in each document
- Source document for each occurrence

### 3. Audit Document Extraction

**Use Case**: Check what facts were extracted from a specific document

**Query**:
```sql
SELECT 
    f.fact_type,
    f.content,
    f.confidence,
    f.fact_date
FROM medical.user_facts f
WHERE f.source_document_id = '[document-uuid]'
AND f.is_active = TRUE
ORDER BY f.fact_type;
```

**Returns**:
- All facts extracted from that document
- Confidence scores
- Fact types and dates

### 4. Find Facts Needing Verification

**Use Case**: Review low-confidence facts for manual verification

**Query**:
```sql
SELECT 
    f.content,
    f.confidence,
    d.metadata->>'filename' as source
FROM medical.user_facts f
JOIN medical.documents d ON f.source_document_id = d.id
WHERE f.confidence < 0.7
AND f.is_active = TRUE
ORDER BY f.confidence ASC;
```

**Returns**:
- Facts with confidence < 0.7
- Source documents to review

## UI Integration Recommendations

### Knowledge Graph Node Click:
```typescript
// When user clicks a fact node
async function showFactSource(factId: string) {
  const response = await fetch(`/api/facts/${factId}/source`);
  const data = await response.json();
  
  // Display modal with:
  // - Fact content
  // - Confidence score
  // - Source filename
  // - Document date
  // - Provider
  // - Link to view original document
  // - All occurrences (if multiple)
}
```

### Fact Details Panel:
```
┌─────────────────────────────────────┐
│ Fact: Type 2 Diabetes Mellitus     │
│ Confidence: 95%                     │
│                                     │
│ Source:                             │
│ • File: Lab Results 2024-03-15.pdf │
│ • Date: March 15, 2024             │
│ • Provider: Dr. Smith MD           │
│ • Facility: General Hospital       │
│                                     │
│ Occurrences: 3                      │
│ • March 15, 2024 - Lab Results     │
│ • April 10, 2024 - Visit Notes     │
│ • May 5, 2024 - Prescription       │
│                                     │
│ [View Original Document]            │
│ [Mark as Verified]                  │
└─────────────────────────────────────┘
```

## API Endpoints Needed

### GET /api/facts/:id/source
Returns complete source information for a fact:
```json
{
  "fact": {
    "id": "uuid",
    "content": "Type 2 Diabetes Mellitus",
    "confidence": 0.95,
    "fact_date": "2024-03-15"
  },
  "source": {
    "document_id": "uuid",
    "filename": "Lab Results 2024-03-15.pdf",
    "s3_key": "documents/2024-03-15T10-30-00-Lab-Results.pdf",
    "document_type": "lab_results",
    "document_date": "2024-03-15",
    "provider": "Dr. Smith MD",
    "facility": "General Hospital",
    "upload_date": "2024-03-16T08:00:00Z"
  },
  "occurrences": [
    {
      "date": "2024-03-15",
      "content": "Type 2 Diabetes Mellitus",
      "source": "Lab Results 2024-03-15.pdf"
    },
    {
      "date": "2024-04-10",
      "content": "T2DM",
      "source": "Visit Notes 2024-04-10.pdf"
    }
  ]
}
```

### GET /api/documents/:id/facts
Returns all facts extracted from a document:
```json
{
  "document": {
    "id": "uuid",
    "filename": "Lab Results 2024-03-15.pdf",
    "document_date": "2024-03-15",
    "provider": "Dr. Smith MD"
  },
  "facts": [
    {
      "id": "uuid",
      "type": "medical_condition",
      "content": "Type 2 Diabetes Mellitus",
      "confidence": 0.95
    },
    {
      "id": "uuid",
      "type": "test_result",
      "content": "HbA1c: 7.2%",
      "confidence": 0.98
    }
  ],
  "stats": {
    "total_facts": 15,
    "by_type": {
      "medical_condition": 3,
      "test_result": 8,
      "medication": 4
    }
  }
}
```

### GET /api/documents/:id/download
Returns pre-signed S3 URL to download original document:
```json
{
  "url": "https://s3.amazonaws.com/bucket/documents/file.pdf?signature=...",
  "expires_in": 3600
}
```

## Verification Features

### Manual Verification:
```sql
-- Mark fact as user-verified
UPDATE medical.user_facts
SET 
  verified_by = 'user',
  confidence = 1.0,
  updated_at = NOW()
WHERE id = '[fact-uuid]';
```

### Confidence Adjustment:
```sql
-- Adjust confidence after manual review
UPDATE medical.user_facts
SET 
  confidence = 0.85,
  verified_by = 'user',
  updated_at = NOW()
WHERE id = '[fact-uuid]';
```

### Fact Correction:
```sql
-- Correct fact content
UPDATE medical.user_facts
SET 
  content = 'Corrected content',
  verified_by = 'user',
  updated_at = NOW()
WHERE id = '[fact-uuid]';

-- Log the change
INSERT INTO medical.knowledge_graph_changes (
  change_type, entity_type, entity_id, old_value, new_value
) VALUES (
  'fact_corrected', 'fact', '[fact-uuid]', 
  'old content', 'new content'
);
```

## Data Quality Checks

### Facts Without Sources (Should be 0):
```sql
SELECT COUNT(*) 
FROM medical.user_facts 
WHERE source_document_id IS NULL 
AND is_active = TRUE;
```

### Documents Without Facts:
```sql
SELECT 
  d.id,
  d.metadata->>'filename' as filename,
  d.upload_date
FROM medical.documents d
LEFT JOIN medical.user_facts f ON f.source_document_id = d.id
WHERE f.id IS NULL
AND d.content_text IS NOT NULL;
```

### Low Confidence Facts:
```sql
SELECT 
  COUNT(*) as count,
  AVG(confidence) as avg_confidence
FROM medical.user_facts
WHERE confidence < 0.7
AND is_active = TRUE;
```

## Benefits

1. **Traceability**: Every fact can be traced back to original document
2. **Verification**: Users can manually verify AI-extracted facts
3. **Audit Trail**: Complete history of fact extraction and changes
4. **Confidence**: Source information builds trust in the system
5. **Debugging**: Easy to identify extraction quality issues
6. **Compliance**: Medical data requires source documentation

## Implementation Status

✅ **Database Schema**: Complete
- `user_facts.source_document_id` links to documents
- `fact_occurrences.source_document_id` tracks multiple sources
- `documents.metadata` stores document information

✅ **Data Collection**: Complete
- Document metadata extracted automatically
- Source document ID stored with every fact
- Occurrence tracking preserves all sources

⚠️ **API Endpoints**: Partially implemented
- Need: `/api/facts/:id/source`
- Need: `/api/documents/:id/facts`
- Need: `/api/documents/:id/download`

⚠️ **UI Integration**: Not implemented
- Need: Fact source panel in knowledge graph
- Need: Document viewer
- Need: Verification workflow

## Next Steps

1. **Create API endpoints** for source retrieval
2. **Add UI panel** to show fact sources in knowledge graph
3. **Implement document viewer** to display original PDFs
4. **Add verification workflow** for manual fact review
5. **Create admin dashboard** for data quality monitoring

---

**Created**: March 16, 2026  
**Status**: Database complete, APIs and UI needed  
**Priority**: High - Critical for medical data trust
