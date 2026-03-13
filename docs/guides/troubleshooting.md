# Project Lazarus - Troubleshooting Guide

## Common Issues

### Bedrock Agent Not Responding

**Symptoms**: Agent returns errors or no response

**Solutions**:
1. Check agent status in AWS Console
2. Verify IAM role permissions
3. Check CloudWatch logs for errors
4. Ensure agent is prepared and alias exists

```bash
# Check agent status
aws bedrock-agent get-agent --agent-id $AGENT_ID --region $AWS_REGION

# View logs
aws logs tail /aws/bedrock/agent/$AGENT_ID --follow
```

### Knowledge Base Not Finding Documents

**Symptoms**: Agent can't answer questions about uploaded documents

**Solutions**:
1. Verify documents uploaded to S3
2. Check data source sync status
3. Trigger manual sync
4. Verify OpenSearch collection is healthy

```bash
# List ingestion jobs
aws bedrock-agent list-ingestion-jobs \
  --knowledge-base-id $KB_ID \
  --data-source-id $DATA_SOURCE_ID

# Start new ingestion
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id $KB_ID \
  --data-source-id $DATA_SOURCE_ID
```

### Lambda Function Errors

**Symptoms**: Action groups fail or timeout

**Solutions**:
1. Check Lambda logs in CloudWatch
2. Verify IAM permissions
3. Check timeout settings
4. Verify environment variables

```bash
# View Lambda logs
aws logs tail /aws/lambda/lazarus-document-processor --follow

# Test Lambda directly
aws lambda invoke \
  --function-name lazarus-document-processor \
  --payload file://test-event.json \
  response.json
```

### S3 Access Denied

**Symptoms**: Cannot upload or retrieve documents

**Solutions**:
1. Check bucket policy
2. Verify IAM role permissions
3. Check KMS key policy
4. Verify bucket encryption settings

```bash
# Check bucket policy
aws s3api get-bucket-policy --bucket $BUCKET_NAME

# Test access
aws s3 ls s3://$BUCKET_NAME/
```

### High Costs

**Symptoms**: AWS bill higher than expected

**Solutions**:
1. Check Cost Explorer
2. Review OpenSearch usage (largest cost)
3. Consider alternative vector store
4. Set up billing alerts

```bash
# Get cost breakdown
aws ce get-cost-and-usage \
  --time-period Start=2025-03-01,End=2025-03-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

### Calendar Integration Not Working

**Symptoms**: Cannot create or view appointments

**Solutions**:
1. Verify Google OAuth credentials
2. Check token expiration
3. Verify API permissions
4. Check Lambda logs

## Debugging Tips

### Enable Debug Logging

```python
# In Lambda functions
import logging
logger = logging.getLogger()
logger.setLevel(logging.DEBUG)
```

### Test Components Individually

```bash
# Test S3 upload
aws s3 cp test.txt s3://$BUCKET_NAME/test/

# Test Bedrock model access
aws bedrock invoke-model \
  --model-id $MODEL_ID \
  --body '{"prompt":"Hello"}' \
  output.json

# Test Knowledge Base
aws bedrock-agent retrieve \
  --knowledge-base-id $KB_ID \
  --retrieval-query '{"text":"test query"}'
```

### Check Resource Tags

```bash
# Verify all resources tagged correctly
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Project,Values=Lazarus
```

## Getting Help

1. Check CloudWatch Logs first
2. Review AWS documentation
3. Check GitHub issues
4. Contact AWS Support (if BAA in place)

## Emergency Procedures

### Data Breach Response
1. Immediately revoke all access
2. Rotate all credentials
3. Review CloudTrail logs
4. Notify affected parties
5. Document incident

### Service Outage
1. Check AWS Service Health Dashboard
2. Verify region availability
3. Implement failover if configured
4. Communicate with users

### Data Loss
1. Check S3 versioning
2. Restore from backup
3. Review deletion logs
4. Implement additional safeguards
