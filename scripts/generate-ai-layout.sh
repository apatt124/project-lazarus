#!/bin/bash

# Generate AI Layout in Background
# Triggers async AI layout generation for all users

set -e

USER_ID="${1:-default}"
REGION="${AWS_REGION:-us-east-1}"

echo "🎨 Triggering AI Layout Generation"
echo "=================================="
echo ""
echo "User ID: $USER_ID"
echo "Region: $REGION"
echo ""

# Invoke Lambda asynchronously
PAYLOAD=$(echo -n "{\"action\":\"generate-ai-layout\",\"userId\":\"$USER_ID\",\"forceRegenerate\":true}" | base64)

aws lambda invoke \
  --function-name lazarus-api-relationships \
  --invocation-type Event \
  --payload "$PAYLOAD" \
  --region $REGION \
  /dev/null

echo "✅ AI layout generation triggered successfully!"
echo ""
echo "The layout is being generated in the background."
echo "This may take 1-2 minutes for large graphs."
echo ""
echo "Once complete, the layout will be cached and ready to use."
echo "You can check the Lambda logs to monitor progress:"
echo ""
echo "  aws logs tail /aws/lambda/lazarus-api-relationships --follow"
