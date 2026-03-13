#!/bin/bash

# Deploy Knowledge Graph System
# Creates relationships Lambda and API Gateway routes

set -e

REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
FUNCTION_NAME="lazarus-api-relationships"
API_NAME="lazarus-api"

echo "🧠 Deploying Knowledge Graph System"
echo "===================================="
echo ""

# 1. Install dependencies
echo "1️⃣ Installing Lambda dependencies..."
cd lambda/api-relationships
npm install
cd ../..
echo "  ✅ Dependencies installed"

# 2. Package Lambda
echo ""
echo "2️⃣ Packaging Lambda function..."
cd lambda/api-relationships
zip -r function.zip . -x "*.git*" "*.DS_Store"
cd ../..
echo "  ✅ Lambda packaged"

# 3. Create/Update Lambda function
echo ""
echo "3️⃣ Creating Lambda function..."

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
  echo "  Updating existing function..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://lambda/api-relationships/function.zip \
    --region $REGION > /dev/null
else
  echo "  Creating new function..."
  
  # Get execution role ARN
  ROLE_ARN=$(aws iam get-role --role-name LazarusAPILambdaRole --query 'Role.Arn' --output text 2>/dev/null || echo "")
  
  if [ -z "$ROLE_ARN" ]; then
    echo "  ❌ Lambda execution role not found. Create it first."
    exit 1
  fi
  
  aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime nodejs20.x \
    --role $ROLE_ARN \
    --handler index.handler \
    --zip-file fileb://lambda/api-relationships/function.zip \
    --timeout 30 \
    --memory-size 512 \
    --region $REGION > /dev/null
fi

echo "  ✅ Lambda function ready"

# 4. Add API Gateway routes
echo ""
echo "4️⃣ Adding API Gateway routes..."

# Load configuration from environment
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

API_ID="${API_GATEWAY_ID}"

if [ -z "$API_ID" ]; then
  echo "Error: API_GATEWAY_ID must be set in .env"
  exit 1
fi

echo "  API ID: $API_ID"

# Get root resource
ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?path==`/`].id' \
  --output text)

# Create /relationships resource
RELATIONSHIPS_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part "relationships" \
  --region $REGION \
  --query 'id' \
  --output text 2>/dev/null || \
  aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?pathPart=='relationships'].id | [0]" \
    --output text)

echo "  Relationships Resource ID: $RELATIONSHIPS_RESOURCE_ID"

# Function to add method
add_method() {
  local RESOURCE_ID=$1
  local HTTP_METHOD=$2
  
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method $HTTP_METHOD \
    --authorization-type NONE \
    --region $REGION \
    --no-api-key-required 2>/dev/null || true
  
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method $HTTP_METHOD \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME/invocations" \
    --region $REGION 2>/dev/null || true
}

# Add methods to /relationships
add_method $RELATIONSHIPS_RESOURCE_ID "GET"
add_method $RELATIONSHIPS_RESOURCE_ID "POST"

# Create /relationships/{id}
ID_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $RELATIONSHIPS_RESOURCE_ID \
  --path-part "{id}" \
  --region $REGION \
  --query 'id' \
  --output text 2>/dev/null || \
  aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?pathPart=='{id}' && parentId=='$RELATIONSHIPS_RESOURCE_ID'].id | [0]" \
    --output text)

add_method $ID_RESOURCE_ID "GET"
add_method $ID_RESOURCE_ID "PATCH"
add_method $ID_RESOURCE_ID "DELETE"

# Create /relationships/extract
EXTRACT_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $RELATIONSHIPS_RESOURCE_ID \
  --path-part "extract" \
  --region $REGION \
  --query 'id' \
  --output text 2>/dev/null || \
  aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?pathPart=='extract' && parentId=='$RELATIONSHIPS_RESOURCE_ID'].id | [0]" \
    --output text)

add_method $EXTRACT_RESOURCE_ID "POST"

# Create /relationships/graph
GRAPH_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $RELATIONSHIPS_RESOURCE_ID \
  --path-part "graph" \
  --region $REGION \
  --query 'id' \
  --output text 2>/dev/null || \
  aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?pathPart=='graph' && parentId=='$RELATIONSHIPS_RESOURCE_ID'].id | [0]" \
    --output text)

add_method $GRAPH_RESOURCE_ID "GET"

# Create /relationships/timeline
TIMELINE_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $RELATIONSHIPS_RESOURCE_ID \
  --path-part "timeline" \
  --region $REGION \
  --query 'id' \
  --output text 2>/dev/null || \
  aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?pathPart=='timeline' && parentId=='$RELATIONSHIPS_RESOURCE_ID'].id | [0]" \
    --output text)

add_method $TIMELINE_RESOURCE_ID "GET"

# Create /relationships/search
SEARCH_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $RELATIONSHIPS_RESOURCE_ID \
  --path-part "search" \
  --region $REGION \
  --query 'id' \
  --output text 2>/dev/null || \
  aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?pathPart=='search' && parentId=='$RELATIONSHIPS_RESOURCE_ID'].id | [0]" \
    --output text)

add_method $SEARCH_RESOURCE_ID "GET"

# Create /relationships/ai-layout
AI_LAYOUT_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $RELATIONSHIPS_RESOURCE_ID \
  --path-part "ai-layout" \
  --region $REGION \
  --query 'id' \
  --output text 2>/dev/null || \
  aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?pathPart=='ai-layout' && parentId=='$RELATIONSHIPS_RESOURCE_ID'].id | [0]" \
    --output text)

add_method $AI_LAYOUT_RESOURCE_ID "POST"

# Add Lambda permissions
echo ""
echo "5️⃣ Adding Lambda permissions..."
aws lambda add-permission \
  --function-name $FUNCTION_NAME \
  --statement-id "apigateway-relationships" \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*/relationships*" \
  --region $REGION 2>/dev/null || true

echo "  ✅ Permissions added"

# 6. Deploy API
echo ""
echo "6️⃣ Deploying API..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Added knowledge graph endpoints" \
  --region $REGION > /dev/null

echo "  ✅ API deployed"

# Cleanup
rm -f lambda/api-relationships/function.zip

echo ""
echo "✅ Knowledge Graph System Deployed!"
echo ""
echo "🔗 New Endpoints:"
echo "  GET    $VITE_API_URL/relationships"
echo "  POST   $VITE_API_URL/relationships"
echo "  GET    $VITE_API_URL/relationships/{id}"
echo "  PATCH  $VITE_API_URL/relationships/{id}"
echo "  DELETE $VITE_API_URL/relationships/{id}"
echo "  POST   $VITE_API_URL/relationships/extract"
echo "  POST   $VITE_API_URL/relationships/ai-layout"
echo "  GET    $VITE_API_URL/relationships/graph"
echo "  GET    $VITE_API_URL/relationships/timeline"
echo "  GET    $VITE_API_URL/relationships/search?q=keyword"
echo ""
echo "🧪 Test relationship extraction:"
echo "  curl -X POST $VITE_API_URL/relationships/extract"
