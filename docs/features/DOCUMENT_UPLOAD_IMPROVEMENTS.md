# Document Upload Pipeline Improvements

## Overview
Comprehensive improvements to document upload, text extraction, and chunking to maximize data quality for fact extraction.

## Upload Pipeline Flow

```
User Upload → Text Extraction → Metadata Extraction → Duplicate Check → 
S3 Upload → Smart Chunking → Database Storage → (Manual Fact Extraction)
```

## Improvements Implemented

### 1. Smart Paragraph-Based Chunking ✅

**Problem**: Previous chunking split documents at arbitrary character counts, breaking sentences and losing context.

**Solution**: 
- Split on paragraph boundaries (`\n\n`) instead of character count
- Increased overlap from 500 to 1000 characters
- Preserves complete thoughts and medical context

**Impact**:
- Facts spanning multiple sentences stay together
- Better context for AI extraction
- Reduced duplicate facts from split context

**Code**:
```typescript
// Old: Split at character 10000, 10500, 11000...
for (let i = 0; i < content.length; i += (chunkSize - overlapSize))

// New: Split on paragraph boundaries
const paragraphs = content.split(/\n\n+/);
// Build chunks respecting paragraph boundaries
```

### 2. Upgraded Vision Model (Haiku → Sonnet) ✅

**Problem**: Claude Haiku (faster, cheaper) was missing details in complex medical documents.

**Solution**:
- Upgraded to Claude Sonnet 4 for image/scanned document extraction
- Enhanced prompt with specific medical extraction requirements
- Added quality checks for numbers, dates, and medical terminology

**Impact**:
- Better accuracy on handwritten notes
- More complete extraction of test results
- Fewer missed medications and diagnoses

**Model Change**:
```typescript
// Old: 'anthropic.claude-3-haiku-20240307-v1:0'
// New: 'us.anthropic.claude-sonnet-4-20250514-v1:0'
```

### 3. Automatic Metadata Extraction ✅

**Problem**: Document metadata (type, date, provider) relied on user input, often missing or incorrect.

**Solution**:
- AI extracts metadata from document header automatically
- Extracts: document_type, document_date, provider, facility, specialty
- User input still takes precedence (can override)

**Impact**:
- Better fact dating (uses document date as fallback)
- Improved organization and filtering
- Provider relationships automatically captured

**Extracted Fields**:
- `document_type`: lab_results, prescription, visit_notes, discharge_summary, etc.
- `document_date`: ISO format YYYY-MM-DD
- `provider`: "Dr. John Smith MD"
- `facility`: "General Hospital"
- `specialty`: "Cardiology", "Primary Care", etc.

### 4. Enhanced Vision Extraction Prompt ✅

**Problem**: Generic extraction prompt missed medical-specific details.

**Solution**:
- Detailed medical extraction requirements
- Explicit instructions for dates, dosages, test values
- Handling of unclear/handwritten text
- Structure preservation (sections, tables, lists)

**Prompt Improvements**:
- Extract document metadata separately
- Double-check all numbers and dates
- Preserve medical terminology exactly
- Note unclear text as `[unclear: possible text]`

## Quality Improvements Summary

| Area | Before | After | Impact |
|------|--------|-------|--------|
| Chunk Overlap | 500 chars | 1000 chars | Better context preservation |
| Chunk Boundaries | Arbitrary | Paragraph-based | Fewer split facts |
| Vision Model | Haiku | Sonnet 4 | Higher accuracy |
| Metadata | User input only | AI-extracted + user | Complete metadata |
| Vision Prompt | Generic | Medical-specific | Better extraction |

## Testing Recommendations

Before full re-extraction:

1. **Test Smart Chunking**:
   - Upload a long document (>10,000 chars)
   - Verify chunks split on paragraphs
   - Check overlap preserves context

2. **Test Vision Extraction**:
   - Upload scanned medical documents
   - Upload handwritten prescriptions
   - Verify accuracy of extracted text

3. **Test Metadata Extraction**:
   - Upload documents with clear headers
   - Verify document_type, date, provider extracted
   - Check metadata appears in database

4. **Test End-to-End**:
   - Upload → Extract Facts → Check Quality
   - Verify dates are correct
   - Verify no context loss in chunked documents

## Next Steps

### Recommended (Not Yet Implemented):

1. **Auto-Trigger Fact Extraction**:
   - Automatically extract facts after upload
   - No manual trigger needed
   - Immediate value from uploaded documents

2. **Chunk Quality Validation**:
   - Verify chunks don't split mid-sentence
   - Check overlap contains complete sentences
   - Log warnings for problematic chunks

3. **Document Type Detection**:
   - Use extracted document_type to customize fact extraction
   - Lab results → focus on test_result facts
   - Prescriptions → focus on medication facts

4. **Multi-Page Document Handling**:
   - Better handling of page breaks
   - Preserve page numbers in metadata
   - Link related pages together

## Configuration

All improvements use existing environment variables:
- `LAZARUS_AWS_REGION`: AWS region for Bedrock
- `LAZARUS_S3_BUCKET`: S3 bucket for document storage
- `LAZARUS_LAMBDA_FUNCTION`: Lambda for database storage

No configuration changes needed.

## Deployment

Upload improvements are in `app/api/upload/route.ts`:
- Deploy with Next.js build: `npm run build`
- No Lambda changes required
- No database migrations required

---

**Created**: March 16, 2026  
**Status**: Deployed  
**Impact**: High - Improves all future document uploads
