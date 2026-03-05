# Universal File Support - Ready for Testing

## Status: ✅ READY FOR TESTING

All dependencies installed, code fixed, and dev server running on http://localhost:3737

## Recent Fix Applied

Fixed DocumentUpload component to properly handle binary files (PDFs, images) instead of trying to read them as text. The component now:
- Stores the actual File object
- Passes binary files directly to the upload API
- Server-side handles all text extraction (PDF parsing, OCR, Vision AI)

## What's Been Implemented

### 1. PDF Text Extraction
- Uses `pdf-parse` library to extract text from PDFs
- Automatically falls back to Textract OCR if minimal text found (scanned PDFs)

### 2. OCR with AWS Textract
- Handles scanned PDFs and images with text
- Extracts text from documents that aren't machine-readable
- Works with: PNG, JPG, GIF, BMP, TIFF, WEBP

### 3. Vision AI with Claude
- Uses Claude 3 Haiku with vision capabilities
- Analyzes screenshots and complex medical images
- Extracts all visible text, data, and information
- Specifically tuned for medical documents

### 4. Smart Fallback Logic
```
PDF → Try PDF text extraction
   ↓ (if < 100 chars)
   → Try Textract OCR
   ↓ (if fails)
   → Error

Image → Claude Vision
   ↓ (if fails)
   → Error

Unknown → Try Textract
   ↓ (if fails)
   → Error message
```

### 5. Duplicate Detection
- SHA-256 content hash prevents duplicates
- Checks database before S3 upload
- Returns existing document if duplicate found

## Test Cases to Try

### Test 1: Regular PDF with Text
Upload a standard PDF with machine-readable text (like a typed document).
- Expected: PDF text extraction works
- Should extract clean text
- Search should find content

### Test 2: Scanned PDF
Upload a scanned PDF (image-based PDF with no text layer).
- Expected: Falls back to Textract OCR
- Should extract text from image
- Search should work

### Test 3: Screenshot
Upload a screenshot of a medical document or lab results.
- Expected: Claude Vision analyzes image
- Should extract all visible text and data
- AI analysis should detect provider, date, type

### Test 4: Photo of Document
Upload a phone photo of a prescription or medical form.
- Expected: Claude Vision processes image
- Should handle rotation, lighting variations
- Should extract key information

### Test 5: Duplicate Upload
Re-upload the same file.
- Expected: Duplicate detected
- No new S3 upload
- Returns existing document ID
- Shows "already uploaded" message

### Test 6: Plain Text File
Upload a .txt file with medical notes.
- Expected: Direct text read
- Fast processing
- Search works immediately

## How to Test

1. Open http://localhost:3737 in your browser
2. Click "Upload Document" button
3. Drag and drop or select a test file
4. Wait for AI analysis (auto-fills metadata)
5. Review extracted information
6. Click "Upload Document"
7. Wait for success message
8. Try searching for content from the document

## Monitoring

Check CloudWatch logs for the Lambda function:
```bash
aws logs tail /aws/lambda/lazarus-vector-search --follow
```

Check Next.js console output for frontend processing:
- PDF extraction logs
- Textract calls
- Vision API calls
- Content hash calculations

## Known Issues

### Old Document with Binary Data
The previously uploaded "My Health Summary.PDF" contains PDF binary data instead of extracted text. This is why search returned 0 results.

To clean it up:
```bash
# Check the document in database
aws lambda invoke --function-name lazarus-vector-search \
  --payload '{"apiPath":"/search","httpMethod":"POST","parameters":[{"name":"query","value":"health"}]}' \
  response.json && cat response.json

# If needed, delete from S3
aws s3 rm s3://project-lazarus-medical-docs-677625843326/documents/2026-03-05T20-38-38-972Z-1\ of\ 1\ -\ My\ Health\ Summary.PDF
```

## Next Steps After Testing

1. Test each file type listed above
2. Verify search works with extracted content
3. Check duplicate detection
4. Monitor costs (Textract: $1.50/1000 pages, Claude Vision: ~$0.00025/image)
5. Consider adding file size limits if needed
6. Add progress indicators for long OCR operations

## Cost Estimates

- PDF text extraction: Free (local processing)
- Textract OCR: $1.50 per 1,000 pages
- Claude Vision: ~$0.00025 per image
- AI analysis (metadata): ~$0.00025 per document
- Storage: $0.023 per GB/month

For typical usage (10-20 documents/month):
- Monthly cost: < $1 for document processing
- Storage: < $0.50/month

## Architecture

```
User uploads file
    ↓
Frontend API Route (/api/upload)
    ↓
Detect file type
    ↓
Extract text (PDF/Textract/Vision)
    ↓
Calculate content hash
    ↓
Check for duplicate (Lambda)
    ↓
Upload to S3 (if not duplicate)
    ↓
Store in RDS with embedding (Lambda)
    ↓
Return success
```

## Files Modified

- `frontend/app/api/upload/route.ts` - Universal file support
- `frontend/components/DocumentUpload.tsx` - Image file types in dropzone
- `frontend/package.json` - Added dependencies
- `lambda/vector-search/app.py` - Duplicate detection endpoint

## Dependencies Added

- `@aws-sdk/client-textract` - OCR service
- `pdf-parse` - PDF text extraction

All dependencies installed and server running!
