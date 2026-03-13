# Search & Response Improvements

## Changes Made

### 1. Increased Search Results
**Before:** Only 5 documents returned per query
**After:** 
- Default: 50 documents
- Comprehensive queries: 100 documents

### 2. Lower Similarity Threshold
**Before:** 0.05 threshold (restrictive)
**After:**
- Default: 0.01 threshold
- Comprehensive queries: 0.001 threshold (very permissive)

This means more documents will be considered relevant, especially for broad queries like "full medical history".

### 3. Intelligent Query Detection
The system now detects when you want comprehensive information by looking for keywords:
- "full"
- "complete"
- "all"
- "entire"
- "comprehensive"
- "detailed"
- "everything"
- "history"
- "summary"
- "overview"
- "total"

When detected, it automatically:
- Increases search limit to 100 documents
- Lowers similarity threshold to 0.001
- Allows Claude to generate up to 8000 tokens (very long responses)

### 4. Increased Response Length
**Before:** 4096 tokens max (~3000 words)
**After:** 8000 tokens max (~6000 words)

This allows for much more detailed, comprehensive responses.

### 5. Enhanced System Prompt
Updated Claude's instructions to:
- Use ALL relevant documents in comprehensive queries
- Cite document IDs frequently
- Organize information chronologically or by category
- Include specific dates, values, and details
- Not over-summarize when detail is requested

## How to Use

### For Comprehensive Queries
Ask questions like:
- "Give me the full, most detailed possible, medical history you can"
- "Show me all lab results"
- "Complete summary of all procedures"
- "Entire medication history"

### For Specific Queries
Ask targeted questions:
- "What was my lipase level in 2022?"
- "Show me ERCP procedures"
- "What medications am I allergic to?"

## Technical Details

### API Changes
- `searchMedicalDocuments()` now accepts `limit` and `threshold` parameters
- POST handler detects comprehensive queries and adjusts parameters
- Lambda function accepts `threshold` parameter

### Lambda Changes
- `/search` endpoint now accepts optional `threshold` parameter
- Default threshold lowered from 0.05 to 0.01

### Expected Results
With 321 documents in your database, comprehensive queries should now return:
- 50-100 relevant documents (vs. 5 before)
- Much more detailed responses
- Better coverage of your medical history
- More source citations

## Example

**Query:** "Give me the full, most detailed possible, medical history you can"

**System Response:**
- Searches with limit=100, threshold=0.001
- Returns ~80-100 relevant documents
- Claude generates 6000+ word comprehensive response
- Cites 50+ document IDs throughout
- Organizes by category (labs, procedures, medications, etc.)
- Includes specific dates, values, and details from all documents
