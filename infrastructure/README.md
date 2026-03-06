# Project Lazarus Infrastructure

## Overview

AWS infrastructure for Project Lazarus medical record management system. Includes Lambda functions, RDS PostgreSQL with pgvector, S3 storage, and AWS Bedrock integration.

## Contents

- [setup-guide-rds.md](setup-guide-rds.md) - Complete infrastructure deployment guide (recommended)
- [setup-guide.md](setup-guide.md) - Alternative OpenSearch setup (deprecated, higher cost)
- [cost-estimates.md](cost-estimates.md) - Monthly cost breakdown
- [cost-separation-guide.md](cost-separation-guide.md) - Cost tracking setup
- [GITHUB_SETUP.md](GITHUB_SETUP.md) - Repository configuration
- [AMPLIFY_SETUP_STEPS.md](AMPLIFY_SETUP_STEPS.md) - AWS Amplify deployment

## Prerequisites

- [ ] AWS CLI installed and configured
- [ ] AWS BAA signed with your account (for HIPAA compliance)
- [ ] Bedrock model access granted (Claude 3 Haiku, Titan Embeddings)
- [ ] Appropriate IAM permissions

## Quick Links

### Getting Started
[Complete Setup Guide](setup-guide-rds.md) - Follow this for initial deployment

### Deployment
[AWS Amplify Setup](AMPLIFY_SETUP_STEPS.md) - Deploy frontend to AWS

### Cost Management
[Cost Estimates](cost-estimates.md) - Expected monthly costs (~$15-20)
[Cost Separation](cost-separation-guide.md) - Track costs by project

## Common Tasks

### Deploy Infrastructure
```bash
# Follow the setup guide
cat setup-guide-rds.md

# Or use the automated script
./scripts/setup.sh
```

### Check Costs
```bash
# View current month costs
./scripts/check-costs.sh

# View specific service costs
aws ce get-cost-and-usage \
  --time-period Start=2026-03-01,End=2026-03-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

### Deploy Frontend
```bash
# Deploy to AWS Amplify
./scripts/deploy-amplify.sh

# Or follow manual steps
cat AMPLIFY_SETUP_STEPS.md
```

## Resource Tagging

All resources tagged with:
- `Project=Lazarus`
- `Environment=Personal`
- `PHI=Yes`

## Security Checklist

- [ ] AWS BAA signed
- [ ] KMS key created with proper policies
- [ ] S3 bucket encrypted and access-controlled
- [ ] IAM roles follow least-privilege
- [ ] CloudTrail logging enabled
- [ ] VPC endpoints configured (optional but recommended)

## Support

For infrastructure issues, see [docs/troubleshooting.md](../docs/troubleshooting.md)
