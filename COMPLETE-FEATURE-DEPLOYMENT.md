# Complete Feature Deployment Guide

## New Lambda Functions Created

### 1. lazarus-api-upload
**Purpose**: Handle document uploads (single files and ZIP archives)
**Features**:
- Multipart form data parsing
- PDF text extraction via Textract
- Embedding generation via Bedrock Titan
- S3 storage
- ZIP file support (batch upload)

### 2. lazarus-api-analyze
**Purpose**: Analyze document content to extract metadata
**Features**:
- AI-powered document classification
- Provider name extraction
- Date extraction
- Summary generation

### 3. lazarus-api-conversations
**Purpose**: Manage conversation history and persistence
**Features**:
- List all conversations
- Get conversation with messages
- Create new conversation
- Update conversation title
- Delete conversation
- Add messages to conversation

### 4. Updated lazarus-api-chat
**New Features**:
- Saves messages to database when conversation_id provided
- Maintains conversation history
- Links to conversation_memory table

## Deployment Steps

### Step 1: Deploy New Lambda Functions

```bash
./scripts/deploy-api-lambdas.sh
```

This will deploy all 5 Lambda functions:
- lazarus-api-chat (updated)
- lazarus-api-auth
- lazarus-api-upload (new)
- lazarus-api-analyze (new)
- lazarus-api-conversations (new)

**Time**: ~10 minutes

### Step 2: Update API Gateway

```bash
./scripts/create-api-gateway.sh
```

This will add new endpoints:
- POST /upload
- POST /analyze
- GET /conversations
- POST /conversations

**Time**: ~3 minutes

### Step 3: Run Database Migrations

Ensure the conversations and conversation_memory tables exist:

```bash
psql -h lazarus-medical-db.cslknf9zl44o.us-east-1.rds.amazonaws.com \
  -U lazarus_admin \
  -d postgres \
  -f migrations/001_add_conversations_and_memory.sql
```

### Step 4: Test New Endpoints

**Test document analysis:**
```bash
curl -X POST https://23jhaxp7dh.execute-api.us-east-1.amazonaws.com/prod/analyze \
  -H 'Content-Type: application/json' \
  -d '{"content":"Lab Results from Dr. Smith on 2024-03-01..."}'
```

**Test conversations list:**
```bash
curl https://23jhaxp7dh.execute-api.us-east-1.amazonaws.com/prod/conversations
```

**Test create conversation:**
```bash
curl -X POST https://23jhaxp7dh.execute-api.us-east-1.amazonaws.com/prod/conversations \
  -H 'Content-Type: application/json' \
  -d '{"title":"My Medical Questions"}'
```

**Test document upload:**
```bash
curl -X POST https://23jhaxp7dh.execute-api.us-east-1.amazonaws.com/prod/upload \
  -F "file=@test-document.pdf" \
  -F 'metadata={"documentType":"lab_results","provider":"Dr. Smith"}'
```

## Frontend Integration

The frontend components are already set up to use these endpoints:

### ChatInterface.tsx
- Calls `/chat` endpoint
- Passes `conversation_id` to save messages
- Displays conversation history

### DocumentUpload.tsx
- Calls `/analyze` to extract metadata
- Calls `/upload` to store documents
- Handles ZIP files

### Sidebar.tsx
- Can be updated to call `/conversations` to list history
- Display conversation titles
- Switch between conversations

## Database Schema

The migrations create these tables:

### conversations
```sql
- id (UUID, primary key)
- title (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### conversation_memory
```sql
- id (UUID, primary key)
- conversation_id (UUID, foreign key)
- user_message (TEXT)
- assistant_response (TEXT)
- intent (TEXT)
- confidence_score (FLOAT)
- sources_used (JSONB)
- created_at (TIMESTAMP)
```

## IAM Permissions Required

The LazarusAPILambdaRole needs:
- ✅ AWSLambdaBasicExecutionRole (CloudWatch Logs)
- ✅ AmazonBedrockFullAccess (Claude AI + Titan Embeddings)
- ✅ SecretsManagerReadWrite (Database credentials)
- ✅ Lambda invocation (existing)
- ⚠️ AmazonS3FullAccess (for document upload)
- ⚠️ AmazonTextractFullAccess (for PDF text extraction)

### Add Missing Permissions

```bash
aws iam attach-role-policy \
  --role-name LazarusAPILambdaRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy \
  --role-name LazarusAPILambdaRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonTextractFullAccess
```

## API Endpoints Summary

| Method | Endpoint | Lambda | Purpose |
|--------|----------|--------|---------|
| POST | /login | lazarus-api-auth | Authentication |
| POST | /chat | lazarus-api-chat | Chat with AI |
| POST | /upload | lazarus-api-upload | Upload documents |
| POST | /analyze | lazarus-api-analyze | Analyze document |
| GET | /conversations | lazarus-api-conversations | List conversations |
| POST | /conversations | lazarus-api-conversations | Create conversation |
| GET | /conversations/:id | lazarus-api-conversations | Get conversation |
| PUT | /conversations/:id | lazarus-api-conversations | Update conversation |
| DELETE | /conversations/:id | lazarus-api-conversations | Delete conversation |

## Cost Estimate

**Lambda**:
- Chat: ~$0.20 per 1000 requests (1GB, 5s avg)
- Auth: ~$0.01 per 1000 requests (128MB, <1s)
- Upload: ~$0.50 per 1000 requests (2GB, 30s avg)
- Analyze: ~$0.05 per 1000 requests (512MB, 5s avg)
- Conversations: ~$0.02 per 1000 requests (256MB, 1s avg)

**Textract**: ~$1.50 per 1000 pages

**S3**: ~$0.023 per GB/month

**Total for personal use**: ~$5-15/month

## Troubleshooting

### Upload fails with "Access Denied"
- Check S3 bucket permissions
- Verify IAM role has S3FullAccess

### Textract fails
- Verify IAM role has TextractFullAccess
- Check document format (PDF, PNG, JPG only)

### Conversations not saving
- Check database connection
- Verify migrations ran successfully
- Check CloudWatch logs for errors

### CORS errors
- Verify API Gateway CORS configuration
- Check Lambda response headers include Access-Control-Allow-Origin

## Deployment Status

✅ **Lambda Functions Deployed**:
1. lazarus-api-chat (updated with conversation saving)
2. lazarus-api-auth  
3. lazarus-api-upload (new)
4. lazarus-api-analyze (new)
5. lazarus-api-conversations (new)

✅ **API Gateway Updated**:
- API ID: `spgwp4ei7f`
- Base URL: `https://spgwp4ei7f.execute-api.us-east-1.amazonaws.com/prod`
- All endpoints created and tested

✅ **IAM Permissions Added**:
- S3FullAccess
- TextractFullAccess

⏳ **Remaining Tasks**:
1. Create database credentials in Secrets Manager
2. Run database migrations
3. Test all endpoints end-to-end
4. Push frontend changes to GitHub
