#!/bin/bash

# Add conversation detail route to API Gateway
# This enables GET/PUT/DELETE /conversations/{id}

set -e

REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
API_NAME="lazarus-api"

echo "🔧 Adding conversation detail route"
echo "===================================="
echo ""

# Get API ID
API_ID=$(aws apigateway get-rest-apis \
  --region $REGION \
  --query "items[?name=='$API_NAME'].id | [0]" \
  --output text)

if [ -z "$API_ID" ] || [ "$API_ID" == "None" ]; then
  echo "❌ API Gateway not found. Run create-api-gateway.sh first."
  exit 1
fi

echo "API ID: $API_ID"

# Get conversations resource ID
CONVERSATIONS_RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query "items[?pathPart=='conversations'].id" \
  --output text)

echo "Conversations Resource ID: $CONVERSATIONS_RESOURCE_ID"

# Create {id} path parameter resource
echo ""
echo "Creating {id} resource..."
ID_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $CONVERSATIONS_RESOURCE_ID \
  --path-part "{id}" \
  --region $REGION \
  --query 'id' \
  --output text 2>/dev/null || \
  aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?pathPart=='{id}'].id" \
    --output text)

echo "ID Resource ID: $ID_RESOURCE_ID"

# Function to add method to {id} resource
add_method() {
  local HTTP_METHOD=$1
  
  echo ""
  echo "Adding $HTTP_METHOD method..."
  
  # Create method
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $ID_RESOURCE_ID \
    --http-method $HTTP_METHOD \
    --authorization-type NONE \
    --region $REGION \
    --no-api-key-required 2>/dev/null || true
  
  # Create integration
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $ID_RESOURCE_ID \
    --http-method $HTTP_METHOD \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:lazarus-api-conversations/invocations" \
    --region $REGION 2>/dev/null || true
  
  echo "  ✅ $HTTP_METHOD method added"
}

# Add GET, PUT, DELETE methods
add_method "GET"
add_method "PUT"
add_method "DELETE"

# Add CORS for {id} resource
echo ""
echo "Adding CORS..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $ID_RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region $REGION 2>/dev/null || true

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $ID_RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
  --region $REGION 2>/dev/null || true

aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $ID_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers": true, "method.response.header.Access-Control-Allow-Methods": true, "method.response.header.Access-Control-Allow-Origin": true}' \
  --region $REGION 2>/dev/null || true

aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $ID_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers": "'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'", "method.response.header.Access-Control-Allow-Methods": "'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'", "method.response.header.Access-Control-Allow-Origin": "'"'"'*'"'"'"}' \
  --region $REGION 2>/dev/null || true

echo "  ✅ CORS configured"

# Update Lambda permission to include path parameter
echo ""
echo "Updating Lambda permissions..."
aws lambda add-permission \
  --function-name lazarus-api-conversations \
  --statement-id "apigateway-conversations-id" \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*/conversations/*" \
  --region $REGION 2>/dev/null || true

echo "  ✅ Permissions updated"

# Deploy API
echo ""
echo "Deploying API..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Added conversation detail route" \
  --region $REGION

echo ""
echo "✅ Conversation detail route added successfully!"
echo ""
echo "🔗 New endpoints:"
echo "  GET    https://$API_ID.execute-api.$REGION.amazonaws.com/prod/conversations/{id}"
echo "  PUT    https://$API_ID.execute-api.$REGION.amazonaws.com/prod/conversations/{id}"
echo "  DELETE https://$API_ID.execute-api.$REGION.amazonaws.com/prod/conversations/{id}"
echo ""
echo "🧪 Test with:"
echo "  curl https://$API_ID.execute-api.$REGION.amazonaws.com/prod/conversations/YOUR_CONVERSATION_ID"
