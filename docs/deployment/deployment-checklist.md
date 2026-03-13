# Project Lazarus - Deployment Checklist

## Pre-Deployment

- [ ] AWS BAA signed and verified
- [ ] Bedrock model access granted
- [ ] Google Cloud project created (for Calendar API)
- [ ] Domain name registered (if using custom domain)
- [ ] SSL certificate obtained (AWS ACM)

## Infrastructure Setup

- [ ] KMS key created
- [ ] S3 bucket created and configured
- [ ] IAM roles created with least-privilege
- [ ] Bedrock Knowledge Base deployed
- [ ] OpenSearch Serverless collection created
- [ ] Bedrock Agent created and configured
- [ ] Lambda functions deployed
- [ ] Action groups linked to agent
- [ ] Production alias created

## Security Configuration

- [ ] S3 bucket encryption enabled
- [ ] Public access blocked on S3
- [ ] CloudTrail logging enabled
- [ ] VPC endpoints configured (optional)
- [ ] Secrets Manager configured for API keys
- [ ] IAM policies reviewed
- [ ] MFA enabled on AWS account

## Application Deployment

- [ ] Frontend built and tested
- [ ] Cognito user pool created
- [ ] Frontend deployed (Amplify/S3+CloudFront)
- [ ] API Gateway configured (if needed)
- [ ] Environment variables set
- [ ] CORS configured

## Testing

- [ ] Upload test document
- [ ] Query knowledge base
- [ ] Test calendar integration
- [ ] Test all action groups
- [ ] Verify encryption
- [ ] Load testing (if multi-user)

## Monitoring Setup

- [ ] CloudWatch dashboards created
- [ ] Billing alerts configured
- [ ] Error notifications set up (SNS)
- [ ] Log retention configured
- [ ] X-Ray tracing enabled

## Documentation

- [ ] User guide created
- [ ] API documentation complete
- [ ] Runbook for common issues
- [ ] Disaster recovery plan documented

## Post-Deployment

- [ ] Initial data uploaded
- [ ] User training completed
- [ ] Backup verification
- [ ] Security audit scheduled
- [ ] Cost monitoring active
