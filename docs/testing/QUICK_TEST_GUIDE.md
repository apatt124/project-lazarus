# Quick Test Guide - Universal File Support

## 🚀 Ready to Test!

Server running: **http://localhost:3737**

## What to Test

### 1️⃣ Upload a PDF
- Any medical PDF document
- System will extract text automatically
- If scanned, OCR kicks in automatically

### 2️⃣ Upload a Screenshot
- Take a screenshot of any medical document
- PNG or JPG format
- Claude Vision will analyze it

### 3️⃣ Upload a Photo
- Take a phone photo of a prescription or lab result
- System handles rotation and lighting
- Extracts all visible text

### 4️⃣ Test Duplicate Detection
- Upload the same file twice
- Second upload should say "already uploaded"
- No duplicate in S3

### 5️⃣ Test Search
- After uploading, try searching
- Use words from your document
- Should return results with context

## What You'll See

### During Upload
1. Drop file → AI analyzes metadata
2. Form auto-fills (provider, date, type)
3. Review and click "Upload Document"
4. Progress indicator shows
5. Success message appears

### Behind the Scenes
- PDF: Text extracted locally (fast)
- Scanned PDF: Textract OCR (2-3 sec)
- Image: Claude Vision analysis (1-3 sec)
- Hash calculated for duplicate check
- File uploaded to S3
- Embedding generated
- Stored in database

## Watch the Logs

### Frontend Terminal
Look for these messages:
```
Processing file: example.pdf, type: application/pdf
Attempting PDF text extraction...
Extracted 1234 characters of text
Content hash: abc123...
```

Or for images:
```
Processing file: screenshot.png, type: image/png
Image detected, using Claude Vision...
Claude Vision extracted 567 characters
```

### Check Lambda
```bash
aws logs tail /aws/lambda/lazarus-vector-search --follow
```

## Expected Results

✅ File uploads successfully
✅ Metadata auto-detected
✅ Text extracted from any format
✅ Search finds uploaded content
✅ Duplicates detected
✅ No errors in console

## If Something Goes Wrong

### Upload fails
- Check file size (< 5MB recommended)
- Check file format (PDF, PNG, JPG, etc.)
- Look at browser console for errors

### Search returns nothing
- Wait 5 seconds after upload
- Try different search terms
- Check Lambda logs for errors

### Duplicate not detected
- File content might be different
- Check if you edited the file
- Hash is based on extracted text, not filename

## Cost Per Upload

- Regular PDF: Free (local processing)
- Scanned PDF: $0.0015 (Textract)
- Screenshot: $0.00025 (Claude Vision)
- All files: $0.00035 (AI analysis + embedding)

**Total: < $0.002 per document**

## Files to Try

Good test files:
- Lab results PDF
- Prescription screenshot
- Visit notes document
- Vaccination record
- Insurance card photo
- Medical bill

## Success Checklist

- [ ] Uploaded a regular PDF
- [ ] Uploaded a scanned PDF or image
- [ ] Uploaded a screenshot
- [ ] Tested duplicate detection
- [ ] Searched for uploaded content
- [ ] Verified results are relevant

## Ready? Go!

Open **http://localhost:3737** and start testing! 🎉
