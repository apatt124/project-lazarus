# Quick Start - Project Lazarus

## What You're Building

A conversational AI assistant for your medical records. Upload documents, ask questions in natural language, and get instant answers with source citations.

## Prerequisites

- [ ] AWS infrastructure deployed (see [infrastructure/setup-guide-rds.md](infrastructure/setup-guide-rds.md))
- [ ] Node.js 18+ installed
- [ ] AWS CLI configured with credentials
- [ ] Git repository cloned

## 5-Minute Setup

### Step 1: Install Dependencies (2 minutes)

```bash
# Navigate to frontend directory
cd frontend

# Install packages
npm install
```

### Step 2: Configure Environment (1 minute)

```bash
# Copy example environment file
cp .env.example .env.local

# Edit with your AWS settings (already configured if you followed setup guide)
# LAZARUS_AWS_REGION=us-east-1
# LAZARUS_LAMBDA_FUNCTION=lazarus-vector-search
# LAZARUS_S3_BUCKET=project-lazarus-medical-docs-[your-account-id]
```

### Step 3: Start the Application (1 minute)

```bash
# Start development server
npm run dev

# Or use the convenience script
./START_LAZARUS.command
```

The app will open at http://localhost:3737

### Step 4: Upload Your First Document (1 minute)

1. Click the "Upload" tab
2. Drag and drop a medical document (PDF, image, or text file)
3. Review auto-detected metadata
4. Click "Upload Document"

### Step 5: Ask a Question (30 seconds)

1. Click the "Chat" tab
2. Type: "What documents do I have?"
3. Get an instant AI-powered response with source citations

## Testing

Verify everything works:

```bash
# Test AWS Bedrock access
./scripts/test-bedrock.sh

# Test vector search
./scripts/test-search.sh "blood pressure"

# Test full chat pipeline
./scripts/test-chat.sh "What's in my records?"
```

Expected output:
```
✅ Bedrock access: OK
✅ Search results: 3 documents found
✅ Chat response: Based on your records...
```

## What's Deployed

After setup, you have:

- Next.js React application running locally
- AWS Lambda function for vector search
- PostgreSQL database with pgvector extension
- S3 bucket for encrypted document storage
- AWS Bedrock integration for AI

## Next Steps

- [User Guide](frontend/USER_GUIDE.md) - Learn all features
- [Deployment Guide](DEPLOYMENT-GUIDE.md) - Deploy to AWS Amplify for remote access
- [Architecture Documentation](docs/architecture.md) - Understand the system design
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions

## Troubleshooting

### Port 3737 already in use

```bash
# Kill existing process
lsof -ti:3737 | xargs kill

# Or use a different port
npm run dev -- -p 3738
```

### AWS credentials error

```bash
# Configure AWS CLI
aws configure

# Verify credentials
aws sts get-caller-identity
```

### Dependencies won't install

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Cost Estimate

Monthly infrastructure cost: $15-20
- RDS PostgreSQL: ~$13
- Lambda: ~$0.50
- S3 Storage: ~$0.50
- Bedrock AI: ~$1-5 (usage-based)

Frontend is free when running locally.
