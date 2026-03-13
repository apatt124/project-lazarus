# Project Lazarus - Quick Start Guide

Get up and running in ~30 minutes.

## Prerequisites

- AWS account with BAA signed
- AWS CLI configured
- Bedrock model access granted
- Basic familiarity with AWS

## Step 1: Clone and Configure (5 min)

```bash
# Navigate to project directory
cd project-lazarus

# Copy environment template
cp .env.example .env

# Edit .env with your AWS account details
# At minimum, set:
# - AWS_REGION
# - AWS_ACCOUNT_ID
```

## Step 2: Deploy Infrastructure (15 min)

```bash
# Make setup script executable
chmod +x scripts/setup.sh

# Run automated setup
# This creates: KMS key, S3 bucket, RDS instance, IAM roles
./scripts/setup.sh

# Or run manually:
cd infrastructure
# Follow commands in setup-guide-rds.md
```

This will create:
- KMS encryption key
- S3 bucket for documents
- RDS PostgreSQL instance with pgvector
- IAM roles for Lambda and Bedrock
- Bedrock Agent

## Step 3: Initialize Database (5 min)

```bash
# Deploy database initialization Lambda
cd lambda/db-init
zip -r function.zip .

aws lambda create-function \
  --function-name lazarus-db-init \
  --runtime python3.12 \
  --role $LAMBDA_ROLE_ARN \
  --handler init.lambda_handler \
  --zip-file fileb://function.zip \
  --timeout 60 \
  --vpc-config SubnetIds=$SUBNET_IDS,SecurityGroupIds=$SG_ID \
  --environment Variables="{DB_ENDPOINT=$DB_ENDPOINT}"

# Run initialization
aws lambda invoke \
  --function-name lazarus-db-init \
  response.json

# Check result
cat response.json
```

## Step 4: Deploy Vector Search Lambda (5 min)

```bash
cd lambda/vector-search
pip install -r requirements.txt -t .
zip -r function.zip .

aws lambda create-function \
  --function-name lazarus-vector-search \
  --runtime python3.12 \
  --role $LAMBDA_ROLE_ARN \
  --handler app.lambda_handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 512 \
  --vpc-config SubnetIds=$SUBNET_IDS,SecurityGroupIds=$SG_ID \
  --environment Variables="{DB_ENDPOINT=$DB_ENDPOINT,S3_BUCKET=$BUCKET_NAME}"

# Get Lambda ARN
LAMBDA_ARN=$(aws lambda get-function \
  --function-name lazarus-vector-search \
  --query 'Configuration.FunctionArn' \
  --output text)
```

## Step 5: Link Lambda to Agent (5 min)

```bash
# Create action group
aws bedrock-agent create-agent-action-group \
  --agent-id $AGENT_ID \
  --agent-version DRAFT \
  --action-group-name knowledge-base \
  --action-group-executor lambda=$LAMBDA_ARN \
  --api-schema file://lambda/vector-search/api-schema.json

# Prepare agent
aws bedrock-agent prepare-agent --agent-id $AGENT_ID

# Create production alias
aws bedrock-agent create-agent-alias \
  --agent-id $AGENT_ID \
  --agent-alias-name prod
```

## Step 6: Test (5 min)

```bash
# Upload a test document
echo "Patient visited Dr. Smith on March 1, 2025 for annual checkup. Blood pressure: 120/80. All vitals normal." > test-visit.txt

aws s3 cp test-visit.txt s3://$BUCKET_NAME/documents/test/

# Store in vector database (via Lambda)
aws lambda invoke \
  --function-name lazarus-vector-search \
  --payload '{
    "apiPath": "/store",
    "httpMethod": "POST",
    "parameters": [
      {"name": "s3_key", "value": "documents/test/test-visit.txt"},
      {"name": "content", "value": "Patient visited Dr. Smith on March 1, 2025 for annual checkup. Blood pressure: 120/80. All vitals normal."},
      {"name": "metadata", "value": "{\"document_type\": \"visit_notes\"}"}
    ]
  }' \
  response.json

# Test search
aws lambda invoke \
  --function-name lazarus-vector-search \
  --payload '{
    "apiPath": "/search",
    "httpMethod": "POST",
    "parameters": [
      {"name": "query", "value": "What was my blood pressure at the last visit?"}
    ]
  }' \
  search-response.json

cat search-response.json
```

## Step 7: Test Agent in Console

1. Go to AWS Console → Bedrock → Agents
2. Select "ProjectLazarus" agent
3. Click "Test" in the right panel
4. Try queries like:
   - "What was my blood pressure at the last visit?"
   - "When did I see Dr. Smith?"
   - "Summarize my recent medical history"

## Next Steps

1. **Deploy more Lambda functions**:
   - Provider management
   - Visit tracking
   - Calendar integration

2. **Set up Google Calendar**:
   - Follow `docs/google-calendar-integration.md`

3. **Build frontend**:
   - See `frontend/README.md`

4. **Add real documents**:
   - Upload medical records to S3
   - Process with document-processor Lambda

## Troubleshooting

- **Agent not responding**: Check CloudWatch logs
- **Database connection failed**: Verify VPC/security group config
- **Lambda timeout**: Increase timeout or memory
- **Vector search returns nothing**: Ensure documents are stored with embeddings

See `docs/troubleshooting.md` for detailed help.

## Cost Monitoring

```bash
# Set up billing alert
aws budgets create-budget \
  --account-id $AWS_ACCOUNT_ID \
  --budget file://budget.json

# Check current costs
aws ce get-cost-and-usage \
  --time-period Start=2025-03-01,End=2025-03-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

Expected monthly cost: **$16-19**
