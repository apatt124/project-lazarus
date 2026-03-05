# Project Lazarus - Cost Estimates

Estimated monthly AWS costs for personal use.

## Assumptions
- Light personal use (~100 queries/month)
- ~1GB medical documents stored
- Minimal data transfer

## Service Breakdown

### Bedrock Agent
- Model: Claude 3.5 Sonnet
- Input tokens: ~500K/month @ $3.00/MTok = $1.50
- Output tokens: ~100K/month @ $15.00/MTok = $1.50
- **Subtotal: ~$3.00/month**

### Bedrock Knowledge Base
- Embedding model: Titan Text Embeddings V2
- ~1M tokens embedded @ $0.10/MTok = $0.10
- **Subtotal: ~$0.10/month**

### OpenSearch Serverless
- OCU hours: ~730 hours @ $0.24/OCU-hour = $175.20
- Storage: 1GB @ $0.024/GB-month = $0.02
- **Subtotal: ~$175.22/month**
- Note: This is the largest cost component

### S3 Storage
- Standard storage: 1GB @ $0.023/GB = $0.02
- Requests: ~1000 @ $0.0004/1000 = $0.0004
- **Subtotal: ~$0.02/month**

### KMS
- Customer managed key: $1.00/month
- API requests: ~10K @ $0.03/10K = $0.03
- **Subtotal: ~$1.03/month**

### Data Transfer
- Minimal (within region): ~$0.10/month

## Total Estimated Cost

### Option 1: OpenSearch Serverless (Original)
**~$179.47/month**

### Option 2: RDS + pgvector (RECOMMENDED)
**~$16-19/month**

Breakdown:
- RDS db.t4g.micro: ~$12-15/month
- Bedrock Agent: ~$3/month
- S3 + KMS: ~$1/month
- Lambda: <$1/month (within free tier)

**Savings: ~$160/month (90% reduction)**

### Option 3: Pinecone Free Tier
**~$4/month**
- Limited to 100K vectors
- Good for testing/light use

## Cost Optimization Options

### Recommended: RDS + pgvector
- 10x cheaper than OpenSearch
- More than adequate performance for personal use
- Can store structured data alongside vectors
- See `infrastructure/setup-guide-rds.md` for implementation

### Development vs Production
- Development: Use smaller models, minimal storage
- Production: Scale up as needed

## Free Tier Considerations
- S3: 5GB free for 12 months (new accounts)
- Lambda: 1M requests/month free (if used)
- CloudWatch: 10 custom metrics free

## Monitoring Costs
Set up billing alerts:
```bash
aws budgets create-budget \
  --account-id $AWS_ACCOUNT_ID \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```
