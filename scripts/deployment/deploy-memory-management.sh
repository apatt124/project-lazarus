#!/bin/bash

source .env.local

echo "Deploying Memory Management Updates"
echo "===================================="
echo ""

# Deploy updated memory Lambda
echo "1. Deploying updated memory Lambda..."
cd lambda/api-memory
zip -q -r function.zip index.mjs package.json node_modules
aws lambda update-function-code \
  --function-name lazarus-api-memory \
  --zip-file fileb://function.zip \
  --region us-east-1 \
  | jq '.FunctionName, .LastModified'
rm function.zip
cd ../..

echo "   ✓ Lambda updated"
echo ""

# Load configuration from environment
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# API Gateway configuration
API_ID="${API_GATEWAY_ID}"
ACCOUNT_ID="${AWS_ACCOUNT_ID}"

if [ -z "$API_ID" ] || [ -z "$ACCOUNT_ID" ]; then
  echo "Error: API_GATEWAY_ID and AWS_ACCOUNT_ID must be set in .env"
  exit 1
fi

echo "2. Configuring API Gateway routes..."

# Get resource IDs
MEMORY_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region us-east-1 | jq -r '.items[] | select(.path == "/memory") | .id')
FACTS_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region us-east-1 | jq -r '.items[] | select(.path == "/memory/facts") | .id')

# Create /memory/facts/{factId} resource
echo "Creating /memory/facts/{factId} resource..."
FACTS_ID_RESOURCE=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $FACTS_RESOURCE_ID \
    --path-part '{factId}' \
    --region us-east-1 2>&1 || echo "exists")

if [[ "$FACTS_ID_RESOURCE" == *"exists"* ]] || [[ "$FACTS_ID_RESOURCE" == *"ConflictException"* ]]; then
    FACTS_ID_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region us-east-1 | jq -r '.items[] | select(.path == "/memory/facts/{factId}") | .id')
else
    FACTS_ID_RESOURCE_ID=$(echo $FACTS_ID_RESOURCE | jq -r '.id')
fi

# Create /memory/memories resource
echo "Creating /memory/memories resource..."
MEMORIES_RESOURCE=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $MEMORY_RESOURCE_ID \
    --path-part memories \
    --region us-east-1 2>&1 || echo "exists")

if [[ "$MEMORIES_RESOURCE" == *"exists"* ]] || [[ "$MEMORIES_RESOURCE" == *"ConflictException"* ]]; then
    MEMORIES_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region us-east-1 | jq -r '.items[] | select(.path == "/memory/memories") | .id')
else
    MEMORIES_RESOURCE_ID=$(echo $MEMORIES_RESOURCE | jq -r '.id')
fi

# Create /memory/memories/{memoryId} resource
echo "Creating /memory/memories/{memoryId} resource..."
MEMORIES_ID_RESOURCE=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $MEMORIES_RESOURCE_ID \
    --path-part '{memoryId}' \
    --region us-east-1 2>&1 || echo "exists")

if [[ "$MEMORIES_ID_RESOURCE" == *"exists"* ]] || [[ "$MEMORIES_ID_RESOURCE" == *"ConflictException"* ]]; then
    MEMORIES_ID_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region us-east-1 | jq -r '.items[] | select(.path == "/memory/memories/{memoryId}") | .id')
else
    MEMORIES_ID_RESOURCE_ID=$(echo $MEMORIES_ID_RESOURCE | jq -r '.id')
fi

# Add methods for /memory/facts/{factId}
echo "Adding DELETE method to /memory/facts/{factId}..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $FACTS_ID_RESOURCE_ID \
    --http-method DELETE \
    --authorization-type NONE \
    --region us-east-1 2>&1 | grep -q "httpMethod" && echo "✅ DELETE method added" || echo "Method exists"

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $FACTS_ID_RESOURCE_ID \
    --http-method DELETE \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:$ACCOUNT_ID:function:lazarus-api-memory/invocations" \
    --region us-east-1 2>&1 | grep -q "type" && echo "✅ Integration added" || echo "Integration exists"

echo "Adding PATCH method to /memory/facts/{factId}..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $FACTS_ID_RESOURCE_ID \
    --http-method PATCH \
    --authorization-type NONE \
    --region us-east-1 2>&1 | grep -q "httpMethod" && echo "✅ PATCH method added" || echo "Method exists"

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $FACTS_ID_RESOURCE_ID \
    --http-method PATCH \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:$ACCOUNT_ID:function:lazarus-api-memory/invocations" \
    --region us-east-1 2>&1 | grep -q "type" && echo "✅ Integration added" || echo "Integration exists"

# Add methods for /memory/memories
echo "Adding GET method to /memory/memories..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $MEMORIES_RESOURCE_ID \
    --http-method GET \
    --authorization-type NONE \
    --region us-east-1 2>&1 | grep -q "httpMethod" && echo "✅ GET method added" || echo "Method exists"

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $MEMORIES_RESOURCE_ID \
    --http-method GET \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:$ACCOUNT_ID:function:lazarus-api-memory/invocations" \
    --region us-east-1 2>&1 | grep -q "type" && echo "✅ Integration added" || echo "Integration exists"

# Add methods for /memory/memories/{memoryId}
echo "Adding DELETE method to /memory/memories/{memoryId}..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $MEMORIES_ID_RESOURCE_ID \
    --http-method DELETE \
    --authorization-type NONE \
    --region us-east-1 2>&1 | grep -q "httpMethod" && echo "✅ DELETE method added" || echo "Method exists"

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $MEMORIES_ID_RESOURCE_ID \
    --http-method DELETE \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:$ACCOUNT_ID:function:lazarus-api-memory/invocations" \
    --region us-east-1 2>&1 | grep -q "type" && echo "✅ Integration added" || echo "Integration exists"

echo "Adding PATCH method to /memory/memories/{memoryId}..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $MEMORIES_ID_RESOURCE_ID \
    --http-method PATCH \
    --authorization-type NONE \
    --region us-east-1 2>&1 | grep -q "httpMethod" && echo "✅ PATCH method added" || echo "Method exists"

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $MEMORIES_ID_RESOURCE_ID \
    --http-method PATCH \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:$ACCOUNT_ID:function:lazarus-api-memory/invocations" \
    --region us-east-1 2>&1 | grep -q "type" && echo "✅ Integration added" || echo "Integration exists"

echo ""
echo "3. Granting API Gateway permissions..."

# Grant permissions for new routes
aws lambda add-permission \
  --function-name lazarus-api-memory \
  --statement-id apigateway-memory-management-$(date +%s) \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:$ACCOUNT_ID:$API_ID/*/*/memory/*" \
  --region us-east-1 2>&1 | grep -q "Statement" && echo "✅ Permission added" || echo "Permission exists"

echo ""
echo "4. Deploying API Gateway..."
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --region us-east-1 \
    | jq '.id, .createdDate'

echo ""
echo "Deployment Complete!"
echo "===================="
echo ""
echo "New endpoints available:"
echo "  DELETE ${VITE_API_URL}/memory/facts/{factId}"
echo "  PATCH  ${VITE_API_URL}/memory/facts/{factId}"
echo "  GET    ${VITE_API_URL}/memory/memories"
echo "  DELETE ${VITE_API_URL}/memory/memories/{memoryId}"
echo "  PATCH  ${VITE_API_URL}/memory/memories/{memoryId}"

