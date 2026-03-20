#!/bin/bash

echo "Checking fact extraction coverage..."
echo ""

# Call the fact extraction Lambda to get unprocessed documents
aws lambda invoke \
  --function-name lazarus-fact-extraction \
  --payload '{"path": "/facts/extract-all", "httpMethod": "POST", "body": "{\"limit\": 0}"}' \
  --region us-east-1 \
  response.json

echo ""
echo "=== RESPONSE ==="
cat response.json | jq '.'
rm -f response.json
