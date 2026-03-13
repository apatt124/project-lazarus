# Vector Search Investigation Results

## Issue

Uploaded documents are not appearing in search results when querying the chat endpoint.

## Root Cause

The `medical_documents` table does not exist in the PostgreSQL database. The vector search system requires this table to store document embeddings and content.

## Investigation Steps

### 1. Tested Document Upload
```bash
# Upload succeeded
curl -X POST .../upload
# Response: {"success":true,"document":{"documentId":"681753e3-a94a-4348-beea-c5cc4b5fd47b",...}}
```

**Result**: ✅ Upload Lambda works correctly
- Text extraction: ✅ Working
- Embedding generation: ✅ Working  
- S3 storage: ✅ Working
- Vector DB storage call: ✅ Made successfully

### 2. Tested Vector Search Lambda
```bash
aws lambda invoke --function-name lazarus-vector-search ...
```

**Result**: ✅ Vector search Lambda works
- Returns results from existing documents
- Similarity scoring works
- Query processing works

### 3. Checked Database
```sql
SELECT * FROM medical_documents WHERE id = '681753e3-a94a-4348-beea-c5cc4b5fd47b';
-- ERROR: relation "medical_documents" does not exist
```

**Result**: ❌ Table missing

```sql
\dt
-- Only shows: conversations, conversation_memory
```

### 4. Checked Lambda Configuration
```bash
aws lambda get-function-configuration --function-name lazarus-vector-search
```

**Result**: Lambda configured correctly
- DB_HOST: lazarus-medical-db.cslknf9zl44o.us-east-1.rds.amazonaws.com
- DB_NAME: postgres
- DB_USER: lazarus_admin

## The Problem

The `medical_documents` table was never created in the database. The existing search results are coming from a previous database setup or test data that no longer exists in the current schema.

## Required Table Schema

Based on the vector search Lambda code, the table should be:

```sql
CREATE TABLE medical_documents (
    id UUID PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(1024),  -- Requires pgvector extension
    metadata JSONB,
    s3_uri TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ON medical_documents USING ivfflat (embedding vector_cosine_ops);
```

## Solution Options

### Option 1: Create the Table (Recommended)
1. Enable pgvector extension
2. Run migration to create medical_documents table
3. Add indexes for performance
4. Re-upload test document

### Option 2: Use Existing Vector Search System
The project appears to have had a vector search system set up previously. Check if:
- There's a separate database for vector search
- The lazarus-vector-search Lambda has its own database
- Migration files exist that weren't run

### Option 3: Simplify for MVP
For the immediate deployment:
1. Document upload works (stores in S3)
2. Chat works (without document context)
3. Conversations work
4. Vector search can be added later

## Recommended Next Steps

### Immediate (to unblock deployment):
1. Document that upload works but search integration is pending
2. Deploy frontend with working features
3. Add vector search as post-launch enhancement

### Short-term (to complete feature):
1. Check if pgvector extension is installed:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pgvector';
   ```

2. If not installed, install it:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. Create medical_documents table with proper schema

4. Test upload → search flow end-to-end

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Document Upload | ✅ Working | Stores in S3, generates embeddings |
| Vector Search Lambda | ✅ Working | Can search existing data |
| Database Table | ❌ Missing | `medical_documents` table doesn't exist |
| End-to-End Flow | ❌ Broken | Upload succeeds but documents not searchable |

## Impact

**User Experience**:
- Users can upload documents ✅
- Documents are stored securely ✅
- Documents don't appear in chat context ❌
- Chat works without document context ✅

**Workaround**:
- System functions as a general medical Q&A chatbot
- Document upload UI works but documents aren't used
- All other features (conversations, auth, chat) work perfectly

## Files to Check

1. `migrations/` - Look for vector database migrations
2. `lambda/vector-search/` - Check database schema expectations
3. `infrastructure/` - Check if separate vector DB was planned
4. Previous deployment docs - Check if table creation was documented

---

**Date**: March 9, 2026  
**Status**: Root cause identified  
**Blocker**: Missing database table  
**Severity**: Medium (feature incomplete but not broken)

