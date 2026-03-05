# Project Lazarus - Infrastructure Setup

AWS infrastructure for HIPAA-compliant medical history AI agent.

## Prerequisites

- AWS CLI installed and configured
- AWS BAA signed with your account
- Bedrock model access granted (Claude 3.5 Sonnet)
- Appropriate IAM permissions

## Setup Steps

Follow these steps in order. See [setup-guide-rds.md](setup-guide-rds.md) for detailed CLI commands using RDS + pgvector (recommended, ~$16/month).

Alternative: See [setup-guide.md](setup-guide.md) for OpenSearch Serverless setup (~$179/month).

### 1. Configuration
- Set target region (us-east-1 or us-west-2 recommended)
- Configure environment variables

### 2. KMS Key
- Create customer-managed KMS key for PHI encryption
- Set key policy for S3 and Bedrock access

### 3. S3 Bucket
- Create encrypted bucket for medical documents
- Enable versioning and lifecycle policies
- Block all public access

### 4. IAM Roles
- Bedrock Knowledge Base execution role
- Bedrock Agent execution role
- Lambda function roles (if needed)

### 5. RDS PostgreSQL Database
- Create db.t4g.micro instance
- Enable pgvector extension
- Initialize schema for medical data

### 6. Bedrock Agent
- Create agent with Claude 3.5 Sonnet
- Configure system prompt and instructions
- Link Knowledge Base

### 7. Production Alias
- Create stable endpoint for application

## Resource Tagging

All resources tagged with:
- `Project=Lazarus`
- `Environment=Personal`
- `PHI=Yes`

## Cost Estimates

See [cost-estimates.md](cost-estimates.md) for monthly projections.

## Security Checklist

- [ ] AWS BAA signed
- [ ] KMS key created with proper policies
- [ ] S3 bucket encrypted and access-controlled
- [ ] IAM roles follow least-privilege
- [ ] CloudTrail logging enabled
- [ ] VPC endpoints configured (optional but recommended)
