#!/bin/bash

# Query the relationships API to get facts count
echo "Checking facts in database..."
curl -s "https://${API_GATEWAY_ID}.execute-api.us-east-1.amazonaws.com/prod/relationships/facts" | jq '.'

echo ""
echo "Checking relationships in database..."
curl -s "https://${API_GATEWAY_ID}.execute-api.us-east-1.amazonaws.com/prod/relationships/graph?minStrength=0.0" | jq '.summary'
