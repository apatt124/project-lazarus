#!/bin/bash

# Check if we can recover data from the knowledge_graph_changes audit log

echo "Checking audit log for recoverable data..."

aws lambda invoke \
  --function-name lazarus-api-relationships \
  --payload '{"path":"/relationships/check-audit","httpMethod":"GET"}' \
  --region us-east-1 \
  /tmp/audit-check.json

cat /tmp/audit-check.json | jq '.'
