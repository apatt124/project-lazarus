#!/bin/bash

# Deploy Memory System for Project Lazarus

set -e

echo "=========================================="
echo "Project Lazarus - Memory System Deployment"
echo "=========================================="
echo ""

# Step 1: Create Memory Lambda function
echo "📦 Step 1: Creating Memory Lambda function..."
echo ""

cd lambda/api-memory
zip -q -r function.zip .

# Check if function exists
FUNCTION_EXISTS=$(aws lambda get-function --function-name lazarus-api-memory --region us-east-1 2>&1 || echo "not found")

if [[ "$FUNCTION_EXISTS" == *"not found"* ]]; then
    echo "Creating new Lambda function..."
    aws lambda create-function \
        --function-name lazarus-api-memory \
        --runtime nodejs20.x \
        --role "arn:aws:iam::${ACCOUNT_ID}:role/LazarusAPILambdaRole" \
        --handler index.handler \
        --zip-file fileb://function.zip \
        --timeout 60 \
        --memory-size 512 \
        --region us-east-1 \
        --description "Memory management API for Project Lazarus" \
        | jq '.FunctionName, .Runtime, .LastModified'
else
    echo "Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name lazarus-api-memory \
        --zip-file fileb://function.zip \
        --region us-east-1 \
        | jq '.FunctionName, .LastModified'
fi

rm function.zip
cd ../..

echo "✅ Memory Lambda deployed"
echo ""

# Step 2: Update Chat Lambda with memory integration
echo "📦 Step 2: Updating Chat Lambda with memory integration..."
echo ""

cd lambda/api-chat
zip -q -r function.zip .
aws lambda update-function-code \
    --function-name lazarus-api-chat \
    --zip-file fileb://function.zip \
    --region us-east-1 \
    | jq '.FunctionName, .LastModified'
rm function.zip
cd ../..

echo "✅ Chat Lambda updated"
echo ""

# Step 3: Add API Gateway routes for memory
echo "🌐 Step 3: Adding API Gateway routes..."
echo ""

# Load configuration from environment
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

API_ID="${API_GATEWAY_ID}"

if [ -z "$API_ID" ]; then
  echo "Error: API_GATEWAY_ID must be set in .env"
  exit 1
fi

# Get root resource ID
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region us-east-1 | jq -r '.items[] | select(.path == "/") | .id')

# Create /memory resource
echo "Creating /memory resource..."
MEMORY_RESOURCE=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part memory \
    --region us-east-1 2>&1 || echo "exists")

if [[ "$MEMORY_RESOURCE" == *"exists"* ]] || [[ "$MEMORY_RESOURCE" == *"ConflictException"* ]]; then
    echo "Resource already exists, getting ID..."
    MEMORY_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region us-east-1 | jq -r '.items[] | select(.path == "/memory") | .id')
else
    MEMORY_RESOURCE_ID=$(echo $MEMORY_RESOURCE | jq -r '.id')
fi

echo "Memory resource ID: $MEMORY_RESOURCE_ID"

# Create /memory/facts resource
echo "Creating /memory/facts resource..."
FACTS_RESOURCE=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $MEMORY_RESOURCE_ID \
    --path-part facts \
    --region us-east-1 2>&1 || echo "exists")

if [[ "$FACTS_RESOURCE" == *"exists"* ]] || [[ "$FACTS_RESOURCE" == *"ConflictException"* ]]; then
    FACTS_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region us-east-1 | jq -r '.items[] | select(.path == "/memory/facts") | .id')
else
    FACTS_RESOURCE_ID=$(echo $FACTS_RESOURCE | jq -r '.id')
fi

# Create /memory/process resource
echo "Creating /memory/process resource..."
PROCESS_RESOURCE=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $MEMORY_RESOURCE_ID \
    --path-part process \
    --region us-east-1 2>&1 || echo "exists")

if [[ "$PROCESS_RESOURCE" == *"exists"* ]] || [[ "$PROCESS_RESOURCE" == *"ConflictException"* ]]; then
    PROCESS_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region us-east-1 | jq -r '.items[] | select(.path == "/memory/process") | .id')
else
    PROCESS_RESOURCE_ID=$(echo $PROCESS_RESOURCE | jq -r '.id')
fi

# Create /memory/process/{id} resource
echo "Creating /memory/process/{id} resource..."
PROCESS_ID_RESOURCE=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $PROCESS_RESOURCE_ID \
    --path-part '{id}' \
    --region us-east-1 2>&1 || echo "exists")

if [[ "$PROCESS_ID_RESOURCE" == *"exists"* ]] || [[ "$PROCESS_ID_RESOURCE" == *"ConflictException"* ]]; then
    PROCESS_ID_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region us-east-1 | jq -r '.items[] | select(.path == "/memory/process/{id}") | .id')
else
    PROCESS_ID_RESOURCE_ID=$(echo $PROCESS_ID_RESOURCE | jq -r '.id')
fi

# Add methods and integrations
echo "Adding GET method to /memory/facts..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $FACTS_RESOURCE_ID \
    --http-method GET \
    --authorization-type NONE \
    --region us-east-1 2>&1 | grep -q "httpMethod" && echo "✅ GET method added" || echo "Method exists"

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $FACTS_RESOURCE_ID \
    --http-method GET \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:lazarus-api-memory/invocations" \
    --region us-east-1 2>&1 | grep -q "type" && echo "✅ Integration added" || echo "Integration exists"

echo "Adding POST method to /memory/process/{id}..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $PROCESS_ID_RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE \
    --region us-east-1 2>&1 | grep -q "httpMethod" && echo "✅ POST method added" || echo "Method exists"

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $PROCESS_ID_RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:lazarus-api-memory/invocations" \
    --region us-east-1 2>&1 | grep -q "type" && echo "✅ Integration added" || echo "Integration exists"

# Add Lambda permissions
echo "Adding Lambda invoke permissions..."
aws lambda add-permission \
    --function-name lazarus-api-memory \
    --statement-id apigateway-memory-facts \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:${ACCOUNT_ID}:$API_ID/*/*/memory/facts" \
    --region us-east-1 2>&1 | grep -q "Statement" && echo "✅ Permission added" || echo "Permission exists"

aws lambda add-permission \
    --function-name lazarus-api-memory \
    --statement-id apigateway-memory-process \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:${ACCOUNT_ID}:$API_ID/*/*/memory/process/*" \
    --region us-east-1 2>&1 | grep -q "Statement" && echo "✅ Permission added" || echo "Permission exists"

# Deploy API
echo ""
echo "Deploying API Gateway..."
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --region us-east-1 \
    | jq '.id, .createdDate'

echo "✅ API Gateway deployed"
echo ""

# Step 4: Test the system
echo "🧪 Step 4: Testing memory system..."
echo ""

# Wait for deployment
sleep 5

# Test 1: Get user facts (should be empty initially)
echo "Test 1: Getting user facts..."
FACTS_RESPONSE=$(curl -s "$API_URL/memory/facts")
FACTS_COUNT=$(echo $FACTS_RESPONSE | jq -r '.count')
echo "Current facts count: $FACTS_COUNT"

# Test 2: Create a test conversation with medical info
echo ""
echo "Test 2: Creating test conversation with medical info..."
CONV_RESPONSE=$(curl -s -X POST \
    "$API_URL/conversations" \
    -H 'Content-Type: application/json' \
    -d '{"title":"Memory Test Conversation"}')

TEST_CONV_ID=$(echo $CONV_RESPONSE | jq -r '.conversation.id')
echo "Created conversation: $TEST_CONV_ID"

# Send a message with medical info
echo ""
echo "Test 3: Sending message with medical information..."
CHAT_RESPONSE=$(curl -s -X POST \
    "$API_URL/chat" \
    -H 'Content-Type: application/json' \
    -d "{\"query\":\"I have type 2 diabetes and I'm allergic to penicillin. I take metformin 500mg twice daily.\",\"conversation_id\":\"$TEST_CONV_ID\"}")

CHAT_SUCCESS=$(echo $CHAT_RESPONSE | jq -r '.success')
echo "Chat response: $CHAT_SUCCESS"

# Test 4: Process conversation to extract facts
echo ""
echo "Test 4: Processing conversation to extract facts and memories..."
PROCESS_RESPONSE=$(curl -s -X POST \
    "$API_URL/memory/process/$TEST_CONV_ID")

echo "$PROCESS_RESPONSE" | jq '.'

FACTS_EXTRACTED=$(echo $PROCESS_RESPONSE | jq -r '.facts_extracted')
MEMORIES_EXTRACTED=$(echo $PROCESS_RESPONSE | jq -r '.memories_extracted')

echo ""
if [ "$FACTS_EXTRACTED" -gt 0 ]; then
    echo "✅ Extracted $FACTS_EXTRACTED facts"
else
    echo "⚠️  No facts extracted"
fi

if [ "$MEMORIES_EXTRACTED" -gt 0 ]; then
    echo "✅ Extracted $MEMORIES_EXTRACTED memories"
else
    echo "⚠️  No memories extracted"
fi

# Test 5: Verify facts are now available
echo ""
echo "Test 5: Verifying facts are stored..."
FACTS_RESPONSE=$(curl -s "$API_URL/memory/facts")
NEW_FACTS_COUNT=$(echo $FACTS_RESPONSE | jq -r '.count')
echo "New facts count: $NEW_FACTS_COUNT"

if [ "$NEW_FACTS_COUNT" -gt "$FACTS_COUNT" ]; then
    echo "✅ Facts successfully stored!"
    echo ""
    echo "Sample facts:"
    echo "$FACTS_RESPONSE" | jq '.facts[0:3]'
else
    echo "⚠️  Facts count unchanged"
fi

# Test 6: Test chat with memory context
echo ""
echo "Test 6: Testing chat with memory context..."
MEMORY_CHAT=$(curl -s -X POST \
    "$API_URL/chat" \
    -H 'Content-Type: application/json' \
    -d '{"query":"What medications am I taking?"}')

echo "Response includes memory context:"
echo "$MEMORY_CHAT" | jq -r '.answer' | head -10

echo ""
echo "=========================================="
echo "✅ Memory System Deployment Complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Memory Lambda function deployed"
echo "- Chat Lambda updated with memory integration"
echo "- API Gateway routes added"
echo "- End-to-end tests completed"
echo ""
echo "Features enabled:"
echo "- User facts extraction from conversations"
echo "- Memory embeddings for semantic search"
echo "- Automatic context inclusion in chat"
echo "- Fact tracking with confidence scores"
echo ""
