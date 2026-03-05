# Project Lazarus - AWS CLI Setup Guide

Step-by-step commands for infrastructure deployment.

## 1. Set Target Region

```bash
export AWS_REGION=us-east-1
export PROJECT_NAME=ProjectLazarus
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
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
  --region $AWS_REGION \
  --create-bucket-configuration LocationConstraint=$AWS_REGION

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

## 6. Create IAM Role for Bedrock Knowledge Base

```bash
# Create trust policy
cat > kb-trust-policy.json <<EOF
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

# Create role
aws iam create-role \
  --role-name ProjectLazarusKBRole \
  --assume-role-policy-document file://kb-trust-policy.json \
  --tags Key=Project,Value=Lazarus

# Create and attach policy
cat > kb-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
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
        "aoss:APIAccessAll"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name ProjectLazarusKBRole \
  --policy-name ProjectLazarusKBPolicy \
  --policy-document file://kb-policy.json

KB_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/ProjectLazarusKBRole"
echo "KB Role ARN: $KB_ROLE_ARN"
```

## 7. Create Bedrock Knowledge Base

```bash
# Note: OpenSearch Serverless collection will be auto-created
# Wait 30 seconds for IAM role propagation
sleep 30

aws bedrock-agent create-knowledge-base \
  --name ProjectLazarusKB \
  --role-arn $KB_ROLE_ARN \
  --knowledge-base-configuration '{
    "type": "VECTOR",
    "vectorKnowledgeBaseConfiguration": {
      "embeddingModelArn": "arn:aws:bedrock:'$AWS_REGION'::foundation-model/amazon.titan-embed-text-v2:0"
    }
  }' \
  --storage-configuration '{
    "type": "OPENSEARCH_SERVERLESS",
    "opensearchServerlessConfiguration": {
      "collectionArn": "arn:aws:aoss:'$AWS_REGION':'$AWS_ACCOUNT_ID':collection/lazarus-kb",
      "vectorIndexName": "lazarus-index",
      "fieldMapping": {
        "vectorField": "vector",
        "textField": "text",
        "metadataField": "metadata"
      }
    }
  }' \
  --tags Project=Lazarus,Environment=Personal,PHI=Yes \
  --region $AWS_REGION

# Save KB ID for next steps
KB_ID=$(aws bedrock-agent list-knowledge-bases --region $AWS_REGION \
  --query 'knowledgeBaseSummaries[?name==`ProjectLazarusKB`].knowledgeBaseId' \
  --output text)

echo "Knowledge Base ID: $KB_ID"
```

## 8. Create Bedrock Agent

```bash
# Create agent execution role
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

# Create agent
aws bedrock-agent create-agent \
  --agent-name ProjectLazarus \
  --foundation-model anthropic.claude-3-5-sonnet-20241022-v2:0 \
  --instruction "You are a medical history assistant helping an individual manage their health records. Provide summaries, contextualize information, and help track medical interactions. Always remind users that your responses are for informational purposes only and not medical advice." \
  --agent-resource-role-arn $AGENT_ROLE_ARN \
  --idle-session-ttl-in-seconds 3600 \
  --tags Project=Lazarus,Environment=Personal,PHI=Yes \
  --region $AWS_REGION

AGENT_ID=$(aws bedrock-agent list-agents --region $AWS_REGION \
  --query 'agentSummaries[?agentName==`ProjectLazarus`].agentId' \
  --output text)

echo "Agent ID: $AGENT_ID"
```

## 9. Link Knowledge Base to Agent

```bash
aws bedrock-agent associate-agent-knowledge-base \
  --agent-id $AGENT_ID \
  --agent-version DRAFT \
  --knowledge-base-id $KB_ID \
  --description "Medical history knowledge base" \
  --knowledge-base-state ENABLED \
  --region $AWS_REGION
```

## 10. Create Production Alias

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
echo "Agent ID: $AGENT_ID"
echo "Knowledge Base ID: $KB_ID"
echo "S3 Bucket: $BUCKET_NAME"
```

## Post-Setup Testing

```bash
# Upload test document
echo "Test medical document" > test-doc.txt
aws s3 cp test-doc.txt s3://$BUCKET_NAME/test/

# Sync knowledge base (via console recommended for first time)
# Or use CLI:
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id $KB_ID \
  --data-source-id <DATA_SOURCE_ID> \
  --region $AWS_REGION
```

## Cleanup Commands

```bash
# Use these to tear down resources if needed
# WARNING: This will delete all data

# Delete agent alias
aws bedrock-agent delete-agent-alias --agent-id $AGENT_ID --agent-alias-id <ALIAS_ID> --region $AWS_REGION

# Delete agent
aws bedrock-agent delete-agent --agent-id $AGENT_ID --region $AWS_REGION

# Delete knowledge base
aws bedrock-agent delete-knowledge-base --knowledge-base-id $KB_ID --region $AWS_REGION

# Empty and delete S3 bucket
aws s3 rm s3://$BUCKET_NAME --recursive
aws s3api delete-bucket --bucket $BUCKET_NAME --region $AWS_REGION

# Delete IAM roles
aws iam delete-role-policy --role-name ProjectLazarusKBRole --policy-name ProjectLazarusKBPolicy
aws iam delete-role --role-name ProjectLazarusKBRole
aws iam detach-role-policy --role-name AmazonBedrockExecutionRoleForAgents_ProjectLazarus --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
aws iam delete-role --role-name AmazonBedrockExecutionRoleForAgents_ProjectLazarus

# Schedule KMS key deletion
aws kms schedule-key-deletion --key-id $KMS_KEY_ID --pending-window-in-days 7 --region $AWS_REGION
```
