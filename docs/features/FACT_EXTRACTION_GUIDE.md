# Medical Fact Extraction System

## Overview

The fact extraction system automatically extracts structured medical facts from uploaded documents and stores them in the knowledge graph. This enables the AI to understand and reason about your medical history.

## Architecture

```
Document Upload
    ↓
Textract (extract text)
    ↓
Store in S3 + Vector DB
    ↓
Fact Extraction Lambda (AI analysis)
    ↓
Store facts in medical.user_facts
    ↓
Relationship Extraction (AI analysis)
    ↓
Knowledge Graph Updates
```

## Fact Types

The system extracts the following types of medical facts:

- **medical_condition**: Diagnoses, diseases, chronic conditions
- **symptom**: Reported symptoms, complaints
- **medication**: Drugs, prescriptions, dosages
- **allergy**: Allergies, adverse reactions
- **procedure**: Surgeries, treatments, interventions
- **test_result**: Lab results, imaging findings, vital signs
- **family_history**: Family medical history
- **lifestyle**: Diet, exercise, smoking, alcohol habits
- **provider**: Doctor, specialist information

## How It Works

### 1. Automatic Extraction (New Documents)

When you upload a new document:

1. Document is uploaded to S3
2. Textract extracts text from PDF/image
3. Text is stored in vector database for search
4. **Fact extraction Lambda is triggered automatically**
5. Claude AI analyzes the text and extracts structured facts
6. Facts are stored in the database
7. Relationships between facts are analyzed
8. Knowledge graph is updated

### 2. Batch Processing (Existing Documents)

For documents already in the system:

```bash
# Process all unprocessed documents (default: 10 at a time)
node scripts/extract-facts-from-documents.js

# Process specific number of documents
node scripts/extract-facts-from-documents.js --limit=50

# Process a specific document
node scripts/extract-facts-from-documents.js --document-id=uuid-here
```

## API Endpoints

### Extract Facts from Specific Document

```bash
POST /facts/extract/{documentId}
```

Response:
```json
{
  "success": true,
  "documentId": "uuid",
  "factsExtracted": 15,
  "factsStored": 12,
  "facts": [
    {
      "id": "uuid",
      "fact_type": "medication",
      "content": "Metformin 500mg twice daily",
      "confidence": 0.95,
      "fact_date": "2024-03-15",
      "metadata": {
        "dosage": "500mg",
        "frequency": "twice daily"
      }
    }
  ]
}
```

### Extract Facts from All Unprocessed Documents

```bash
POST /facts/extract-all
Content-Type: application/json

{
  "limit": 10
}
```

Response:
```json
{
  "success": true,
  "documentsProcessed": 10,
  "documentsSuccessful": 9,
  "totalFactsExtracted": 87,
  "results": [...]
}
```

### Extract Facts from Raw Text (Testing)

```bash
POST /facts/extract-text
Content-Type: application/json

{
  "text": "Patient diagnosed with Type 2 Diabetes...",
  "metadata": {
    "document_type": "visit_notes",
    "provider": "Dr. Smith"
  }
}
```

## Database Schema

Facts are stored in `medical.user_facts`:

```sql
CREATE TABLE medical.user_facts (
    id UUID PRIMARY KEY,
    fact_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    confidence FLOAT DEFAULT 1.0,
    
    -- Source tracking
    source_type VARCHAR(50) NOT NULL,
    source_document_id UUID REFERENCES medical.documents(id),
    source_conversation_id UUID,
    source_message_id UUID,
    
    -- Temporal tracking
    fact_date DATE,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_by VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb
);
```

## Deployment

### 1. Deploy the Lambda Function

```bash
chmod +x scripts/deploy-fact-extraction.sh
./scripts/deploy-fact-extraction.sh
```

### 2. Update API Gateway

Add the following routes to your API Gateway:

- `POST /facts/extract/{documentId}` → `lazarus-fact-extraction`
- `POST /facts/extract-all` → `lazarus-fact-extraction`
- `POST /facts/extract-text` → `lazarus-fact-extraction`

### 3. Update Upload Lambda Environment

Add environment variable to `lazarus-upload` Lambda:

```bash
FACT_EXTRACTION_FUNCTION=lazarus-fact-extraction
```

### 4. Redeploy Upload Lambda

```bash
cd lambda/api-upload
npm install
cd ../..
zip -r lambda/upload.zip lambda/api-upload/
aws lambda update-function-code \
  --function-name lazarus-upload \
  --zip-file fileb://lambda/upload.zip \
  --region $AWS_REGION
```

## Processing Existing Documents

After deployment, process your existing documents:

```bash
# Set environment variables
export AWS_REGION=your-region
export FACT_EXTRACTION_FUNCTION=lazarus-fact-extraction

# Process all documents
node scripts/extract-facts-from-documents.js --limit=100
```

This will:
1. Find all documents without extracted facts
2. Process them in batches
3. Extract and store facts
4. Display progress and results

## Fact Quality

### Confidence Scores

- **0.9-1.0**: High confidence (explicit in document)
- **0.7-0.9**: Medium confidence (clearly stated)
- **0.5-0.7**: Lower confidence (inferred or ambiguous)
- **<0.5**: Low confidence (uncertain)

### Duplicate Prevention

The system automatically prevents duplicate facts by checking:
- Same fact type
- Same content
- Still valid (not expired)

### Fact Verification

Facts can be verified by:
- **system**: Automatically extracted
- **user**: User confirmed
- **medical_record**: From official medical record

## Knowledge Graph Integration

After facts are extracted, the system automatically:

1. Analyzes relationships between facts
2. Creates edges in the knowledge graph
3. Updates the graph visualization

Example relationships:
- Medication → treats → Medical Condition
- Medical Condition → causes → Symptom
- Allergy → contraindicates → Medication
- Provider → manages → Medical Condition

## Monitoring

### Check Extraction Status

```sql
-- Count facts by source
SELECT 
  source_type,
  COUNT(*) as fact_count
FROM medical.user_facts
GROUP BY source_type;

-- Count facts by type
SELECT 
  fact_type,
  COUNT(*) as fact_count
FROM medical.user_facts
GROUP BY fact_type
ORDER BY fact_count DESC;

-- Find documents without facts
SELECT 
  d.id,
  d.s3_key,
  d.document_type,
  d.upload_date
FROM medical.documents d
LEFT JOIN medical.user_facts f ON f.source_document_id = d.id
WHERE d.content_text IS NOT NULL
AND f.id IS NULL
ORDER BY d.upload_date DESC;
```

### View Extracted Facts

```sql
-- Recent facts
SELECT 
  fact_type,
  content,
  confidence,
  fact_date,
  created_at
FROM medical.user_facts
ORDER BY created_at DESC
LIMIT 20;

-- Facts from specific document
SELECT 
  f.fact_type,
  f.content,
  f.confidence,
  f.fact_date,
  d.s3_key
FROM medical.user_facts f
JOIN medical.documents d ON d.id = f.source_document_id
WHERE d.id = 'document-uuid-here';
```

## Troubleshooting

### No Facts Extracted

1. Check document has text content:
   ```sql
   SELECT id, s3_key, LENGTH(content_text) as text_length
   FROM medical.documents
   WHERE id = 'document-uuid';
   ```

2. Check Lambda logs:
   ```bash
   aws logs tail /aws/lambda/lazarus-fact-extraction --follow
   ```

3. Test with raw text:
   ```bash
   curl -X POST https://your-api-url/facts/extract-text \
     -H "Content-Type: application/json" \
     -d '{"text": "Patient has Type 2 Diabetes"}'
   ```

### Low Confidence Facts

- Review the document quality
- Check if text extraction was successful
- Consider manual fact entry for critical information

### Duplicate Facts

The system prevents exact duplicates, but similar facts may be created. Review and merge manually if needed.

## Future Enhancements

- [ ] User interface for reviewing/editing extracted facts
- [ ] Confidence threshold filtering
- [ ] Fact merging and deduplication
- [ ] Temporal fact tracking (conditions that resolved)
- [ ] Multi-language support
- [ ] Custom fact types
- [ ] Fact validation rules
- [ ] Integration with external medical databases

## Security Notes

- All facts are stored in your private database
- No medical data is sent to external services except AWS Bedrock (Claude)
- Facts are linked to source documents for audit trail
- Soft delete support (facts marked invalid rather than deleted)

---

**Created**: March 13, 2026  
**Last Updated**: March 13, 2026  
**Status**: Ready for deployment
