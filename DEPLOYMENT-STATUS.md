# Project Lazarus - Deployment Status

## ✅ Successfully Deployed

### 1. Dedicated VPC (HIPAA Compliant)
- **VPC ID**: vpc-05ce7788dea975cbf
- **CIDR**: 10.20.0.0/16 (isolated from BridgeFirst: 10.10.0.0/16)
- **Subnets**: 
  - subnet-0ef25dad358fe0f6a (us-east-1a)
  - subnet-05e1af39973dcbc15 (us-east-1b)
- **Security Group**: sg-095539d6a1236597e
- **VPC Endpoints**: S3 (private access)

### 2. KMS Encryption
- **Key ID**: 3b94863b-e6ce-4eef-bdab-84808d752793
- **Alias**: alias/project-lazarus
- **Purpose**: Encrypt all PHI data at rest

### 3. S3 Bucket
- **Name**: project-lazarus-medical-docs-677625843326
- **Encryption**: KMS (at rest)
- **Versioning**: Enabled
- **Public Access**: Blocked
- **Tags**: Project=Lazarus, CostCenter=Medical, PHI=Yes

### 4. RDS PostgreSQL Database
- **Identifier**: lazarus-medical-db
- **Endpoint**: lazarus-medical-db.cslknf9zl44o.us-east-1.rds.amazonaws.com
- **Engine**: PostgreSQL 15.17
- **Instance Class**: db.t4g.micro
- **Storage**: 20GB gp3, encrypted with KMS
- **Backup**: 7-day retention
- **Status**: ✅ AVAILABLE
- **Access**: Private only (no public access)

### 5. Secrets Manager
- **Secret**: lazarus/db-password
- **Contains**: Database master password
- **Access**: Lambda functions only

### 6. IAM Roles
- **Lambda Role**: LazarusLambdaExecutionRole
- **Permissions**: 
  - VPC access
  - S3 read/write
  - Secrets Manager read
  - KMS encrypt/decrypt

### 7. Resource Group
- **Name**: ProjectLazarusGroup
- **Filter**: Project=Lazarus tag
- **Purpose**: Cost tracking and resource management

### 8. Cost Allocation
- **Cost Category**: ProjectLazarus
- **Tags**: Project=Lazarus, CostCenter=Medical
- **Separation**: Complete isolation from BridgeFirst costs

## ⚠️ Pending Tasks

### 1. Database Initialization
The Lambda function for database initialization encountered a dependency issue with psycopg2.

**Manual Workaround** (Recommended):
Since the RDS instance is running, you can initialize it manually:

```bash
# Option A: Use psql from a bastion host or EC2 instance in the VPC
# Option B: Use AWS Systems Manager Session Manager with port forwarding
# Option C: Temporarily enable public access (not recommended for production)
```

**SQL to run** (see `infrastructure/setup-guide-rds.md` step 9):
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA IF NOT EXISTS medical;
-- (full schema in setup guide)
```

### 2. Vector Search Lambda
- Deploy lambda/vector-search with proper dependencies
- Link to Bedrock Agent as action group

### 3. Bedrock Agent
- Requires Bedrock model access verification
- Create agent with Claude 3.5 Sonnet
- Link action groups

### 4. Additional Lambda Functions
- Document processor
- Provider manager
- Visit tracker
- Calendar integration

## 💰 Current Monthly Cost

Based on deployed resources:

| Resource | Monthly Cost |
|----------|--------------|
| RDS db.t4g.micro (24/7) | $12-15 |
| S3 Storage (~1GB) | $0.02 |
| KMS Key | $1.00 |
| Secrets Manager | $0.40 |
| VPC (no NAT Gateway) | $0.00 |
| Lambda (minimal use) | $0.00 |
| **Total** | **~$13-16/month** |

Note: This is lower than estimated because we haven't deployed all Lambda functions yet.

## 🔒 HIPAA Compliance Status

✅ **Compliant Infrastructure**:
- Dedicated VPC (isolated)
- All data encrypted at rest (KMS)
- All data encrypted in transit (TLS)
- No public database access
- VPC endpoints for private AWS access
- Audit logging ready (CloudTrail)
- Proper resource tagging

⚠️ **Still Required**:
- Accept AWS BAA in AWS Artifact
- Enable CloudTrail logging
- Set up CloudWatch alarms
- Regular security audits

## 📋 Next Steps

### Immediate (To Complete Deployment):

1. **Initialize Database**:
   ```bash
   # Connect to RDS and run initialization SQL
   # See infrastructure/setup-guide-rds.md for full SQL
   ```

2. **Fix Lambda Dependencies**:
   - Rebuild Lambda package with correct psycopg2 for Amazon Linux 2
   - Or use Docker to build Lambda deployment package
   - Or use AWS SAM for proper dependency management

3. **Deploy Vector Search Lambda**:
   ```bash
   # Build with dependencies
   # Deploy to VPC
   # Test database connection
   ```

### Short Term (This Week):

4. **Create Bedrock Agent**:
   - Verify Bedrock access in console
   - Create agent with system prompt
   - Link vector search action group

5. **Test End-to-End**:
   - Upload test document to S3
   - Store in vector database
   - Query via Bedrock Agent

### Medium Term (Next 2 Weeks):

6. **Deploy Additional Features**:
   - Provider management
   - Visit tracking
   - Google Calendar integration

7. **Build Frontend**:
   - Simple web interface
   - Or CLI tool for testing

## 🛠️ Troubleshooting

### Database Connection Issues
- Ensure Lambda is in correct VPC subnets
- Verify security group allows port 5432
- Check database is in "available" state

### Lambda Dependency Issues
- Use Docker to build packages: `docker run --rm -v "$PWD":/var/task public.ecr.aws/lambda/python:3.12 pip install -t . psycopg2-binary`
- Or use AWS SAM: `sam build`
- Or use Lambda layers

### Cost Monitoring
```bash
# Check current Lazarus costs
aws ce get-cost-and-usage \
  --time-period Start=2025-03-01,End=2025-03-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter '{"Tags":{"Key":"Project","Values":["Lazarus"]}}'
```

## 📞 Support

- AWS Documentation: https://docs.aws.amazon.com/
- Project Issues: Check docs/troubleshooting.md
- Cost Concerns: See infrastructure/cost-estimates.md

## 🎯 Success Criteria

- [x] Dedicated VPC created
- [x] RDS PostgreSQL running
- [x] S3 bucket configured
- [x] KMS encryption enabled
- [x] Cost tracking configured
- [ ] Database initialized with pgvector
- [ ] Vector search working
- [ ] Bedrock Agent responding
- [ ] End-to-end test passing

---

**Deployment Date**: March 4, 2025  
**AWS Account**: 677625843326  
**Region**: us-east-1  
**Status**: 70% Complete - Core infrastructure deployed, application layer pending
