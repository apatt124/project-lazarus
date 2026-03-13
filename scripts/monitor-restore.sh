#!/bin/bash

echo "🔄 Monitoring database restore progress..."
echo ""

while true; do
  STATUS=$(aws rds describe-db-instances \
    --db-instance-identifier lazarus-medical-db-restored \
    --region us-east-1 \
    --query 'DBInstances[0].DBInstanceStatus' \
    --output text 2>&1)
  
  if [ "$STATUS" = "available" ]; then
    echo "✅ Restore complete! Database is available."
    echo ""
    
    ENDPOINT=$(aws rds describe-db-instances \
      --db-instance-identifier lazarus-medical-db-restored \
      --region us-east-1 \
      --query 'DBInstances[0].Endpoint.Address' \
      --output text)
    
    echo "📍 New endpoint: $ENDPOINT"
    echo ""
    echo "Next steps:"
    echo "1. Update AWS Secrets Manager with new endpoint"
    echo "2. Or rename databases to swap them"
    echo ""
    break
  elif [[ "$STATUS" == *"error"* ]] || [[ "$STATUS" == *"failed"* ]]; then
    echo "❌ Restore failed with status: $STATUS"
    exit 1
  else
    echo "⏳ Status: $STATUS (checking again in 30 seconds...)"
    sleep 30
  fi
done
