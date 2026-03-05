#!/bin/bash
# Check AWS costs for Lazarus project

echo "💰 Lazarus Project Costs"
echo "========================"
echo ""

# Get current month costs
START_DATE=$(date -u +"%Y-%m-01")
END_DATE=$(date -u +"%Y-%m-%d")

echo "📅 Period: $START_DATE to $END_DATE"
echo ""

# Get costs by service for Lazarus project
aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=TAG,Key=Project \
  --filter file://<(cat << EOF
{
  "Tags": {
    "Key": "Project",
    "Values": ["Lazarus"]
  }
}
EOF
) \
  --query 'ResultsByTime[0].Groups[0].Metrics.UnblendedCost.{Amount:Amount,Unit:Unit}' \
  --output table 2>/dev/null || echo "Note: Cost data may take 24 hours to appear"

echo ""
echo "💡 Expected monthly costs:"
echo "  - RDS PostgreSQL: ~\$13"
echo "  - Lambda: ~\$0.50"
echo "  - S3: ~\$0.50"
echo "  - Bedrock (AI): ~\$1-5 (usage-based)"
echo "  - Total: ~\$15-20/month"
echo ""

# Get service breakdown
echo "📊 Cost by service (all resources):"
aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[0].Groups[?Metrics.UnblendedCost.Amount > `0.01`].{Service:Keys[0],Cost:Metrics.UnblendedCost.Amount}' \
  --output table | head -20
