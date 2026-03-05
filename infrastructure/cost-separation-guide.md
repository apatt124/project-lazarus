# Project Lazarus - Cost Separation Guide

Ensuring Project Lazarus costs are tracked separately from BridgeFirst.

## Tagging Strategy

All Project Lazarus resources are tagged with:
- `Project=Lazarus` (primary identifier)
- `Environment=Personal`
- `CostCenter=Medical` (optional, for additional categorization)
- `PHI=Yes` (for resources containing health data)

Your BridgeFirst resources use:
- `Project=BridgeFirst` (or variations: bridge-first, bridgefirst)

## Cost Tracking in AWS

### 1. Cost Explorer - Tag-Based Filtering

View costs by project:
```bash
# Lazarus costs
aws ce get-cost-and-usage \
  --time-period Start=2025-03-01,End=2025-03-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter '{"Tags":{"Key":"Project","Values":["Lazarus"]}}' \
  --region us-east-1

# BridgeFirst costs
aws ce get-cost-and-usage \
  --time-period Start=2025-03-01,End=2025-03-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter '{"Tags":{"Key":"Project","Values":["BridgeFirst","bridge-first","bridgefirst"]}}' \
  --region us-east-1
```

### 2. Cost Allocation Tags

Activate the Project tag for cost allocation:

1. Go to AWS Console → Billing → Cost Allocation Tags
2. Find "Project" tag
3. Click "Activate"
4. Wait 24 hours for data to appear in reports

Or via CLI:
```bash
aws ce update-cost-allocation-tags-status \
  --cost-allocation-tags-status TagKey=Project,Status=Active
```

### 3. AWS Budgets - Separate Budgets

Create a dedicated budget for Lazarus:

```bash
cat > lazarus-budget.json <<EOF
{
  "BudgetName": "ProjectLazarusBudget",
  "BudgetLimit": {
    "Amount": "25",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostFilters": {
    "TagKeyValue": ["user:Project$Lazarus"]
  }
}
EOF

cat > budget-notifications.json <<EOF
{
  "Notification": {
    "NotificationType": "ACTUAL",
    "ComparisonOperator": "GREATER_THAN",
    "Threshold": 80,
    "ThresholdType": "PERCENTAGE"
  },
  "Subscribers": [
    {
      "SubscriptionType": "EMAIL",
      "Address": "your-email@example.com"
    }
  ]
}
EOF

aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://lazarus-budget.json \
  --notifications-with-subscribers file://budget-notifications.json
```

### 4. Resource Groups

View all Lazarus resources:
```bash
aws resource-groups list-group-resources \
  --group-name ProjectLazarusGroup \
  --region us-east-1
```

### 5. Cost and Usage Reports

Create a detailed report with tag breakdown:

1. Go to AWS Console → Billing → Cost & Usage Reports
2. Create report with:
   - Report name: "ProjectCostBreakdown"
   - Time granularity: Daily
   - Include: Resource IDs
   - Enable: Tag keys (Project, Environment, CostCenter)
   - S3 bucket: Your reporting bucket

## Verification Checklist

After deployment, verify cost separation:

- [ ] All Lazarus resources have `Project=Lazarus` tag
- [ ] Cost allocation tag "Project" is activated
- [ ] Separate budget created for Lazarus
- [ ] Cost Explorer shows Lazarus costs separately
- [ ] Resource group contains all Lazarus resources

## Monthly Cost Breakdown

Expected Lazarus costs:
```
RDS db.t4g.micro:        $12-15/month
S3 Storage (1GB):        $0.02/month
KMS Key:                 $1.00/month
Secrets Manager:         $0.40/month
Lambda (within free):    $0.00/month
Data Transfer:           $0.10/month
CloudWatch Logs:         $0.50/month
--------------------------------
Total:                   $14-17/month
```

BridgeFirst costs remain separate and unchanged.

## Viewing Costs in Console

### Cost Explorer
1. Go to AWS Console → Cost Management → Cost Explorer
2. Click "Explore costs"
3. Group by: Tag → Project
4. Filter: Time range
5. See separate bars for "Lazarus" and "BridgeFirst"

### Billing Dashboard
1. Go to AWS Console → Billing
2. Click "Bills"
3. Expand "Charges by service"
4. Each service shows tag breakdown

## Automated Cost Reports

Create a Lambda to send weekly cost reports:

```python
import boto3
from datetime import datetime, timedelta

ce = boto3.client('ce')

def lambda_handler(event, context):
    end = datetime.now().date()
    start = end - timedelta(days=7)
    
    # Get Lazarus costs
    lazarus_response = ce.get_cost_and_usage(
        TimePeriod={'Start': str(start), 'End': str(end)},
        Granularity='DAILY',
        Metrics=['BlendedCost'],
        Filter={'Tags': {'Key': 'Project', 'Values': ['Lazarus']}}
    )
    
    # Get BridgeFirst costs
    bridge_response = ce.get_cost_and_usage(
        TimePeriod={'Start': str(start), 'End': str(end)},
        Granularity='DAILY',
        Metrics=['BlendedCost'],
        Filter={'Tags': {'Key': 'Project', 'Values': ['BridgeFirst']}}
    )
    
    # Send email via SES with cost breakdown
    # ... implementation
```

## Troubleshooting

### Resources not showing in Cost Explorer
- Wait 24 hours after activating cost allocation tags
- Verify resources have correct tags
- Check tag key is exactly "Project" (case-sensitive)

### Costs showing as "No tag"
- Resource was created before tagging
- Service doesn't support tagging (rare)
- Tag wasn't applied correctly

### Mixed costs between projects
- Check for resources with wrong tags
- Verify shared resources (VPC, etc.) are tagged appropriately
- Review untagged resources

## Best Practices

1. **Always tag on creation**: Include tags in all create commands
2. **Consistent naming**: Use "Lazarus" (not "lazarus" or "LAZARUS")
3. **Regular audits**: Monthly review of tagged resources
4. **Automated tagging**: Use CloudFormation/Terraform for consistency
5. **Cost alerts**: Set up budget alerts for both projects

## Additional Separation Options

### Separate AWS Accounts (Advanced)
For complete isolation:
- Create separate AWS account for Lazarus
- Use AWS Organizations
- Consolidated billing with separate line items
- Complete cost and security isolation

### Separate Regions (Not Recommended)
- Deploy Lazarus in different region
- Easier to filter, but:
  - Higher latency
  - More complex management
  - No real benefit for cost tracking
