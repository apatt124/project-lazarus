#!/bin/bash
# Test the database stats endpoint

echo "Testing database statistics endpoint..."
echo ""

aws lambda invoke \
  --function-name lazarus-vector-search \
  --cli-binary-format raw-in-base64-out \
  --payload '{"apiPath":"/stats","httpMethod":"GET","parameters":[]}' \
  --region us-east-1 \
  /tmp/stats-response.json

echo ""
echo "Response:"
cat /tmp/stats-response.json | jq .
