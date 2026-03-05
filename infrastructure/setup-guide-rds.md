# Project Lazarus - AWS CLI Setup Guide (RDS + pgvector)

Step-by-step commands for infrastructure deployment using RDS PostgreSQL with pgvector extension.

## Cost Estimate: ~$16-19/month

## 1. Set Target Region

```bash
export AWS_REGION=us-east-1
export PROJECT_NAME=ProjectLazarus
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export DB_PASSWORD=$(openssl rand -base64 32)  # Generate secure password
```

## 2. Verify Prerequisites

```bash
# Check AWS BAA status (manual verification required)
# Confirm in AWS Artifact console

# Check Bedrock model access
aws bedrock list-foundation-models --region $AWS_REGION \
  --query 'modelSummaries[?contains(modelId, `claude-3-5-sonnet`)].modelId'
```

## 3. Create Resource Group

```bash
aws resource-groups create-group \
  --name ProjectLazarusGroup \
  --resource-query '{"Type":"TAG_FILTERS_1_0","Query":"{\"ResourceTypeFilters\":[\"AWS::AllSupported\"],\"TagFilters\":[{\"Key\":\"Project\",\"Values\":[\"Lazarus\"]}]}"}' \
  --tags Project=Lazarus,Environment=Personal \
  --region $AWS_REGION
```

## 4. Create KMS Key

```bash
# Create key
KMS_KEY_ID=$(aws kms create-key \
  --description "Project Lazarus PHI encryption key" \
  --tags TagKey=Project,TagValue=Lazarus TagKey=PHI,TagValue=Yes \
  --region $AWS_REGION \
  --query 'KeyMetadata.KeyId' \
  --output text)

# Create alias
aws kms create-alias \
  --alias-name alias/project-lazarus \
  --target-key-id $KMS_KEY_ID \
  --region $AWS_REGION

echo "KMS Key ID: $KMS_KEY_ID"
```

## 5. Create S3 Bucket

```bash
BUCKET_NAME="project-lazarus-medical-docs-${AWS_ACCOUNT_ID}"

# Create bucket
aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region $AWS_REGION

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket $BUCKET_NAME \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "'$KMS_KEY_ID'"
      },
      "BucketKeyEnabled": true
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

# Add tags
aws s3api put-bucket-tagging \
  --bucket $BUCKET_NAME \
  --tagging 'TagSet=[{Key=Project,Value=Lazarus},{Key=Environment,Value=Personal},{Key=PHI,Value=Yes}]'

echo "S3 Bucket: $BUCKET_NAME"
```

## 6. Create VPC and Security Group for RDS

```bash
# Create VPC (optional - can use default VPC)
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text)

# Create security group for RDS
SG_ID=$(aws ec2 create-security-group \
  --group-name lazarus-rds-sg \
  --description "Security group for Project Lazarus RDS" \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Project,Value=Lazarus}]' \
  --query 'GroupId' \
  --output text)

# Allow PostgreSQL access from Lambda (will add Lambda SG later)
# For now, allow from VPC CIDR
VPC_CIDR=$(aws ec2 describe-vpcs \
  --vpc-ids $VPC_ID \
  --query 'Vpcs[0].CidrBlock' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr $VPC_CIDR

echo "Security Group ID: $SG_ID"
```

## 7. Create DB Subnet Group

```bash
# Get subnet IDs from default VPC
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[*].SubnetId' \
  --output text | tr '\t' ' ')

# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name lazarus-db-subnet-group \
  --db-subnet-group-description "Subnet group for Project Lazarus RDS" \
  --subnet-ids $SUBNET_IDS \
  --tags Key=Project,Value=Lazarus

echo "DB Subnet Group created"
```

## 8. Create RDS PostgreSQL Instance with pgvector

```bash
# Store password in Secrets Manager
aws secretsmanager create-secret \
  --name lazarus/db-password \
  --secret-string "$DB_PASSWORD" \
  --tags Key=Project,Value=Lazarus \
  --region $AWS_REGION

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier lazarus-medical-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 15.5 \
  --master-username lazarus_admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --storage-encrypted \
  --kms-key-id $KMS_KEY_ID \
  --vpc-security-group-ids $SG_ID \
  --db-subnet-group-name lazarus-db-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --enable-cloudwatch-logs-exports '["postgresql"]' \
  --tags Key=Project,Value=Lazarus Key=PHI,Value=Yes \
  --no-publicly-accessible \
  --region $AWS_REGION

echo "RDS instance creation initiated (takes ~10 minutes)..."
echo "Waiting for instance to be available..."

# Wait for RDS to be available
aws rds wait db-instance-available \
  --db-instance-identifier lazarus-medical-db \
  --region $AWS_REGION

# Get endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier lazarus-medical-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "RDS Endpoint: $DB_ENDPOINT"
```

## 9. Initialize Database with pgvector

```bash
# Create initialization script
cat > init-db.sql <<'EOF'
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create schema for medical documents
CREATE SCHEMA IF NOT EXISTS medical;

-- Documents table with vector embeddings
CREATE TABLE medical.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    s3_key TEXT NOT NULL,
    document_type VARCHAR(50),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    content_text TEXT,
    embedding vector(1024),  -- Titan V2 produces 1024-dim vectors
    metadata JSONB,
    visit_id UUID,
    provider_id UUID
);

-- Create index for vector similarity search
CREATE INDEX ON medical.documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Providers table
CREATE TABLE medical.providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(100),
    contact JSONB,
    first_visit DATE,
    last_visit DATE,
    visit_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Visits table
CREATE TABLE medical.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES medical.providers(id),
    visit_date TIMESTAMP NOT NULL,
    visit_type VARCHAR(50),
    chief_complaint TEXT,
    notes TEXT,
    calendar_event_id VARCHAR(255),
    transcription_s3_key TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Health metrics table
CREATE TABLE medical.health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    value JSONB NOT NULL,
    unit VARCHAR(20),
    context TEXT,
    provider_id UUID REFERENCES medical.providers(id),
    visit_id UUID REFERENCES medical.visits(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_documents_type ON medical.documents(document_type);
CREATE INDEX idx_documents_upload_date ON medical.documents(upload_date);
CREATE INDEX idx_visits_date ON medical.visits(visit_date);
CREATE INDEX idx_visits_provider ON medical.visits(provider_id);
CREATE INDEX idx_metrics_type_time ON medical.health_metrics(metric_type, timestamp);

-- Create function for similarity search
CREATE OR REPLACE FUNCTION medical.search_documents(
    query_embedding vector(1024),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    s3_key TEXT,
    content_text TEXT,
    similarity float,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.s3_key,
        d.content_text,
        1 - (d.embedding <=> query_embedding) as similarity,
        d.metadata
    FROM medical.documents d
    WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA medical TO lazarus_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA medical TO lazarus_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA medical TO lazarus_admin;
EOF

echo "Database initialization script created: init-db.sql"
echo ""
echo "To initialize the database, you need to connect from a machine that can reach the RDS instance."
echo "Options:"
echo "1. Use AWS Systems Manager Session Manager with port forwarding"
echo "2. Create a temporary bastion host"
echo "3. Run from Lambda (see lambda/db-init/ directory)"
```

## 10. Create Lambda Execution Role

```bash
# Create trust policy
cat > lambda-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "lambda.amazonaws.com"
    },
    "Action": "sts:AssumeRole"
  }]
}
EOF

# Create role
aws iam create-role \
  --role-name LazarusLambdaExecutionRole \
  --assume-role-policy-document file://lambda-trust-policy.json \
  --tags Key=Project,Value=Lazarus

# Attach managed policies
aws iam attach-role-policy \
  --role-name LazarusLambdaExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole

# Create custom policy for Lazarus resources
cat > lambda-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${BUCKET_NAME}",
        "arn:aws:s3:::${BUCKET_NAME}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:lazarus/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "arn:aws:kms:${AWS_REGION}:${AWS_ACCOUNT_ID}:key/${KMS_KEY_ID}"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name LazarusLambdaExecutionRole \
  --policy-name LazarusResourceAccess \
  --policy-document file://lambda-policy.json

LAMBDA_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/LazarusLambdaExecutionRole"
echo "Lambda Role ARN: $LAMBDA_ROLE_ARN"
```

## 11. Create Bedrock Agent Role

```bash
# Create trust policy
cat > agent-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "bedrock.amazonaws.com"
    },
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
  --role-name AmazonBedrockExecutionRoleForAgents_ProjectLazarus \
  --assume-role-policy-document file://agent-trust-policy.json \
  --tags Key=Project,Value=Lazarus

# Attach managed policy
aws iam attach-role-policy \
  --role-name AmazonBedrockExecutionRoleForAgents_ProjectLazarus \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess

AGENT_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/AmazonBedrockExecutionRoleForAgents_ProjectLazarus"

# Wait for role propagation
sleep 30
```

## 12. Create Bedrock Agent (Without Knowledge Base)

```bash
# Create agent
AGENT_ID=$(aws bedrock-agent create-agent \
  --agent-name ProjectLazarus \
  --foundation-model anthropic.claude-3-5-sonnet-20241022-v2:0 \
  --instruction "You are a medical history assistant helping an individual manage their health records. You can search medical documents, track providers and visits, manage appointments, and help organize health information. Always remind users that your responses are for informational purposes only and not medical advice. When searching documents, use the knowledge base action to find relevant information." \
  --agent-resource-role-arn $AGENT_ROLE_ARN \
  --idle-session-ttl-in-seconds 3600 \
  --tags Project=Lazarus,Environment=Personal,PHI=Yes \
  --region $AWS_REGION \
  --query 'agent.agentId' \
  --output text)

echo "Agent ID: $AGENT_ID"
```

## 13. Deploy Lambda Functions

See `lambda/` directory for function code. Deploy after database initialization.

```bash
# Example: Deploy vector search Lambda
cd lambda/vector-search
zip -r function.zip .
aws lambda create-function \
  --function-name lazarus-vector-search \
  --runtime python3.12 \
  --role $LAMBDA_ROLE_ARN \
  --handler app.lambda_handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment Variables="{DB_ENDPOINT=$DB_ENDPOINT,DB_NAME=postgres,S3_BUCKET=$BUCKET_NAME}" \
  --vpc-config SubnetIds=$SUBNET_IDS,SecurityGroupIds=$SG_ID \
  --tags Project=Lazarus \
  --region $AWS_REGION
```

## 14. Create Agent Action Groups

After deploying Lambda functions, link them to the agent as action groups.

```bash
# Example: Add knowledge base action group
aws bedrock-agent create-agent-action-group \
  --agent-id $AGENT_ID \
  --agent-version DRAFT \
  --action-group-name knowledge-base \
  --action-group-executor lambda=$LAMBDA_ARN \
  --api-schema file://lambda/vector-search/api-schema.json \
  --region $AWS_REGION
```

## 15. Prepare and Create Agent Alias

```bash
# Prepare agent
aws bedrock-agent prepare-agent \
  --agent-id $AGENT_ID \
  --region $AWS_REGION

# Wait for preparation
sleep 10

# Create alias
aws bedrock-agent create-agent-alias \
  --agent-id $AGENT_ID \
  --agent-alias-name prod \
  --description "Production alias for Project Lazarus" \
  --tags Project=Lazarus,Environment=Personal \
  --region $AWS_REGION

echo "Setup complete!"
echo ""
echo "=== Configuration Summary ==="
echo "Agent ID: $AGENT_ID"
echo "RDS Endpoint: $DB_ENDPOINT"
echo "S3 Bucket: $BUCKET_NAME"
echo "DB Password stored in: lazarus/db-password"
echo ""
echo "Next steps:"
echo "1. Initialize database with pgvector (run init-db.sql)"
echo "2. Deploy Lambda functions"
echo "3. Link action groups to agent"
echo "4. Test with sample documents"
```

## Database Initialization via Lambda

```bash
# Create one-time Lambda to initialize database
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
  --environment Variables="{DB_ENDPOINT=$DB_ENDPOINT}" \
  --region $AWS_REGION

# Invoke to initialize
aws lambda invoke \
  --function-name lazarus-db-init \
  --region $AWS_REGION \
  response.json

cat response.json
```

## Cleanup Commands

```bash
# Delete agent
aws bedrock-agent delete-agent --agent-id $AGENT_ID --region $AWS_REGION

# Delete RDS
aws rds delete-db-instance \
  --db-instance-identifier lazarus-medical-db \
  --skip-final-snapshot \
  --region $AWS_REGION

# Delete S3 bucket
aws s3 rm s3://$BUCKET_NAME --recursive
aws s3api delete-bucket --bucket $BUCKET_NAME

# Delete secrets
aws secretsmanager delete-secret \
  --secret-id lazarus/db-password \
  --force-delete-without-recovery

# Delete Lambda functions
aws lambda delete-function --function-name lazarus-vector-search
aws lambda delete-function --function-name lazarus-db-init

# Delete IAM roles
aws iam delete-role-policy --role-name LazarusLambdaExecutionRole --policy-name LazarusResourceAccess
aws iam detach-role-policy --role-name LazarusLambdaExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
aws iam delete-role --role-name LazarusLambdaExecutionRole

# Schedule KMS key deletion
aws kms schedule-key-deletion --key-id $KMS_KEY_ID --pending-window-in-days 7
```
