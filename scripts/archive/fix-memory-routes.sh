#!/bin/bash

# Load configuration from environment
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

API_ID="${API_GATEWAY_ID}"

if [ -z "$API_ID" ]; then
  echo "Error: API_GATEWAY_ID must be set in .env"
  exit 1
fi

# Get memory resource IDs
MEMORY_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region us-east-1 | jq -r '.items[] | select(.path == "/memory") | .id')
FACTS_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region us-east-1 | jq -r '.items[] | select(.path == "/memory/facts") | .id')
PROCESS_ID_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region us-east-1 | jq -r '.items[] | select(.path == "/memory/process/{id}") | .id')

echo "Resource IDs:"
echo "Memory: $MEMORY_RESOURCE_ID"
echo "Facts: $FACTS_RESOURCE_ID"
echo "Process ID: $PROCESS_ID_RESOURCE_ID"
echo ""

# Add CORS to GET /memory/facts
echo "Adding CORS to /memory/facts..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $FACTS_RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region us-east-1 2>&1 > /dev/null

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $FACTS_RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\": 200}"}' \
    --region us-east-1 2>&1 > /dev/null

aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $FACTS_RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":false,"method.response.header.Access-Control-Allow-Methods":false,"method.response.header.Access-Control-Allow-Origin":false}' \
    --region us-east-1 2>&1 > /dev/null

aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $FACTS_RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
    --region us-east-1 2>&1 > /dev/null

# Add CORS to POST /memory/process/{id}
echo "Adding CORS to /memory/process/{id}..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $PROCESS_ID_RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region us-east-1 2>&1 > /dev/null

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $PROCESS_ID_RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\": 200}"}' \
    --region us-east-1 2>&1 > /dev/null

aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $PROCESS_ID_RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":false,"method.response.header.Access-Control-Allow-Methods":false,"method.response.header.Access-Control-Allow-Origin":false}' \
    --region us-east-1 2>&1 > /dev/null

aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $PROCESS_ID_RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'POST,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
    --region us-east-1 2>&1 > /dev/null

# Deploy
echo ""
echo "Deploying API Gateway..."
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --region us-east-1 \
    | jq '.id'

echo "✅ CORS configured and deployed"
