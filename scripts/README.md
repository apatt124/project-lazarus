# Lazarus Helper Scripts

Useful command-line tools for managing and testing Project Lazarus.

## Prerequisites

All tools are now up to date:
- ✅ AWS CLI v2.34.2 (latest)
- ✅ jq v1.7.1
- ✅ PostgreSQL client v14.20
- ✅ Python 3.11.5
- ✅ Node v25.3.0

## Available Scripts

### 1. test-bedrock.sh
Test Bedrock Claude access and verify AI is working.

```bash
./scripts/test-bedrock.sh
```

**Output:**
```
✅ Success!
Response: Lazarus is working!
Tokens used: Input=20, Output=9
```

**What it tests:**
- AWS credentials
- Bedrock API access
- Claude Sonnet 4.5 model availability
- Token usage

---

### 2. test-search.sh
Test vector search functionality.

```bash
./scripts/test-search.sh "blood pressure"
./scripts/test-search.sh "MRI results"
./scripts/test-search.sh "medical history"
```

**Output:**
```
✅ Found 3 documents

1. Document ID: abc-123...
   Similarity: 0.2967
   Content: Patient visited Dr. Sarah Johnson...
```

**What it tests:**
- Lambda function connectivity
- Vector search with embeddings
- Similarity scoring
- Document retrieval

---

### 3. test-chat.sh
Test the full conversational AI pipeline.

```bash
./scripts/test-chat.sh "What's my blood pressure?"
./scripts/test-chat.sh "How do you work?"
./scripts/test-chat.sh "What is chronic pancreatitis?"
```

**Output:**
```
✅ Chat successful!

Answer:
According to your most recent vital signs from October 27, 2025,
your blood pressure was 112/77 mmHg. This is considered normal...

Sources: 1 documents used
```

**What it tests:**
- Frontend API endpoint
- Vector search integration
- Claude AI response generation
- RAG (Retrieval-Augmented Generation)

**Note:** Requires dev server running on port 3737

---

### 4. db-query.sh
Quick database queries and management.

```bash
# List all documents
./scripts/db-query.sh list

# Show statistics
./scripts/db-query.sh count

# Show recent uploads
./scripts/db-query.sh recent

# Clean up bad documents
./scripts/db-query.sh clean
```

**Commands:**

#### `list` - List all documents
```
📋 All documents in database:
id | s3_key | content_preview | filename
```

#### `count` - Show statistics
```
📊 Document statistics:
total_documents | with_content | with_embedding | table_size
4               | 4            | 4              | 1728 kB
```

#### `recent` - Show recent uploads
```
🕐 Most recent documents:
(Last 5 documents with metadata)
```

#### `clean` - Remove bad documents
```
🧹 Cleaning up documents with PDF binary data...
(Removes documents where text extraction failed)
```

---

### 5. logs.sh
View Lambda function logs in real-time.

```bash
# View last 10 minutes
./scripts/logs.sh

# View last 30 minutes
./scripts/logs.sh lazarus-vector-search 30

# Follow logs in real-time
./scripts/logs.sh
```

**Output:**
```
📜 Viewing logs for lazarus-vector-search (last 10 minutes)

2026-03-05T20:51:41 Stored document b3f16ea1-1dbc-4576-8f98-11cbcd6a5c84
2026-03-05T20:51:49 Found 0 documents for query
```

**Use cases:**
- Debug upload issues
- Monitor search queries
- Check for errors
- Verify document storage

---

### 6. check-costs.sh
Check AWS costs for Lazarus project.

```bash
./scripts/check-costs.sh
```

**Output:**
```
💰 Lazarus Project Costs
========================

📅 Period: 2026-03-01 to 2026-03-05

💡 Expected monthly costs:
  - RDS PostgreSQL: ~$13
  - Lambda: ~$0.50
  - S3: ~$0.50
  - Bedrock (AI): ~$1-5 (usage-based)
  - Total: ~$15-20/month

📊 Cost by service (all resources):
Service                | Cost
Amazon RDS             | 12.45
AWS Lambda             | 0.23
Amazon S3              | 0.15
Amazon Bedrock         | 1.87
```

**Note:** Cost data may take 24 hours to appear in AWS Cost Explorer

---

## Common Workflows

### Testing After Code Changes

```bash
# 1. Test Bedrock access
./scripts/test-bedrock.sh

# 2. Test search
./scripts/test-search.sh "test query"

# 3. Test full chat (requires dev server)
./scripts/test-chat.sh "Hello!"
```

### Debugging Upload Issues

```bash
# 1. Check database
./scripts/db-query.sh count

# 2. View recent uploads
./scripts/db-query.sh recent

# 3. Watch Lambda logs
./scripts/logs.sh

# 4. Upload a file via UI and watch logs
```

### Monitoring Costs

```bash
# Check monthly costs
./scripts/check-costs.sh

# Set up billing alert (one-time)
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget.json
```

### Database Maintenance

```bash
# Check document count
./scripts/db-query.sh count

# List all documents
./scripts/db-query.sh list

# Clean up bad documents
./scripts/db-query.sh clean

# Verify cleanup
./scripts/db-query.sh count
```

## Troubleshooting

### "AWS credentials not found"
```bash
aws configure
# Or check: aws sts get-caller-identity
```

### "Connection refused" (test-chat.sh)
```bash
# Start dev server
cd frontend && npm run dev
```

### "Database connection failed"
```bash
# Check RDS is running
aws rds describe-db-instances \
  --db-instance-identifier lazarus-medical-db \
  --query 'DBInstances[0].DBInstanceStatus'
```

### "Lambda function not found"
```bash
# Check Lambda exists
aws lambda get-function --function-name lazarus-vector-search
```

### "Bedrock access denied"
```bash
# Check IAM permissions
aws iam get-user
# User needs bedrock:InvokeModel permission
```

## Advanced Usage

### Custom Search Queries

```bash
# Search with Python
python3 << 'EOF'
import boto3, json
lambda_client = boto3.client('lambda', region_name='us-east-1')
response = lambda_client.invoke(
    FunctionName='lazarus-vector-search',
    Payload=json.dumps({
        "apiPath": "/search",
        "httpMethod": "POST",
        "parameters": [
            {"name": "query", "value": "your query here"},
            {"name": "limit", "value": "10"}
        ]
    })
)
print(json.loads(response['Payload'].read()))
EOF
```

### Direct Database Queries

```bash
# Get password
DB_PASS=$(aws secretsmanager get-secret-value \
  --secret-id lazarus/db-password \
  --query SecretString --output text)

# Connect to database
PGPASSWORD="$DB_PASS" psql \
  -h lazarus-medical-db.cslknf9zl44o.us-east-1.rds.amazonaws.com \
  -U lazarus_admin \
  -d postgres

# Run custom query
PGPASSWORD="$DB_PASS" psql ... -c "SELECT * FROM medical.documents LIMIT 5;"
```

### Monitor Real-Time Uploads

```bash
# Terminal 1: Watch logs
./scripts/logs.sh

# Terminal 2: Upload files via UI
open http://localhost:3737

# Terminal 3: Monitor database
watch -n 2 './scripts/db-query.sh count'
```

## Script Maintenance

All scripts are located in `scripts/` directory:
- Executable: `chmod +x scripts/*.sh`
- Version controlled: Committed to git
- Self-documenting: Comments in each script

To add a new script:
1. Create `scripts/new-script.sh`
2. Add shebang: `#!/bin/bash`
3. Make executable: `chmod +x scripts/new-script.sh`
4. Document in this README

## Environment Variables

Scripts use these AWS resources:
- **Region:** us-east-1
- **Lambda:** lazarus-vector-search
- **RDS:** lazarus-medical-db.cslknf9zl44o.us-east-1.rds.amazonaws.com
- **S3:** project-lazarus-medical-docs-677625843326
- **Secret:** lazarus/db-password

To change defaults, edit the scripts or set environment variables:
```bash
export AWS_REGION=us-west-2
export LAMBDA_FUNCTION=my-function
```

## Cost Optimization

These scripts are designed to be cost-effective:
- No long-running processes
- Minimal API calls
- Efficient queries
- Reuse connections

Estimated cost per script execution:
- test-bedrock.sh: $0.0001
- test-search.sh: $0.0001
- test-chat.sh: $0.01
- db-query.sh: $0 (direct DB connection)
- logs.sh: $0 (CloudWatch Logs free tier)
- check-costs.sh: $0 (Cost Explorer free)

## Support

For issues or questions:
1. Check script output for error messages
2. Review CloudWatch logs: `./scripts/logs.sh`
3. Verify AWS credentials: `aws sts get-caller-identity`
4. Check database: `./scripts/db-query.sh count`
5. Test Bedrock: `./scripts/test-bedrock.sh`

## Updates

Scripts are updated with the project. To get latest versions:
```bash
git pull origin main
chmod +x scripts/*.sh
```

Last updated: March 5, 2026
