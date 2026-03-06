# ZIP File Upload Feature

## Overview
You can now upload ZIP files containing multiple medical documents. The system will automatically extract and process each file individually.

## How It Works

1. **Upload a ZIP file** through the document upload interface
2. The system extracts all files from the ZIP
3. Each file is processed individually:
   - Text extraction (PDF, images, text files)
   - Duplicate detection
   - Vector embedding generation
   - Storage in S3 and database

## Supported File Types in ZIP
- PDF documents (`.pdf`)
- Text files (`.txt`)
- Images (`.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.tiff`, `.webp`)

## Features

### Automatic Processing
- Skips hidden files and system folders (like `__MACOSX`)
- Processes files sequentially to avoid overwhelming the system
- Provides detailed results for each file

### Duplicate Detection
- Each file is checked against existing documents
- Duplicates are skipped automatically
- You'll see which files were duplicates in the results

### Error Handling
- If a file fails to process, others continue
- Detailed error messages for each failed file
- Summary shows: uploaded, duplicates, and errors

## Usage

Simply drag and drop a ZIP file or click to browse, just like uploading a single file. After processing, you'll see:

```
ZIP file processed: 5 uploaded, 2 duplicates, 1 errors
```

With a detailed breakdown showing the status of each file.

## Technical Details

### Backend Changes
- Added `adm-zip` package for ZIP extraction
- Refactored upload logic into `processFile()` function
- Added ZIP detection and extraction logic
- Batch processing with individual file results

### Frontend Changes
- Updated accepted file types to include `.zip`
- Enhanced status display for ZIP results
- Shows per-file status with icons (✓, ⚠️, ✗)
- Scrollable results list for large ZIP files

## Example Use Cases

1. **Bulk Upload Medical Records**: Upload an entire folder of lab results at once
2. **Patient History**: Upload all documents from a patient's file
3. **Annual Checkups**: Upload all documents from a year's worth of visits
4. **Migration**: Move existing digital records into the system

## Notes

- The metadata you provide (document type, provider, date) applies to all files in the ZIP
- Large ZIP files may take longer to process
- Each file is stored separately and can be searched individually
