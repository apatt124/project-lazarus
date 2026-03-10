#!/bin/bash

# Create API Gateway for Project Lazarus Lambda functions

set -e

REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
API_NAME="lazarus-api"

echo "🌐 Creating API Gateway"
echo "======================"
echo ""

# Create REST API
echo "Creating REST API..."
API_ID=$(aws apigateway create-rest-api \
  --name "$API_NAME" \
  --description "API Gateway for Project Lazarus" \
  --endpoint-configuration types=REGIONAL \
  --region $REGION \
  --query 'id' \
  --output text 2>/dev/null || \
  aws apigateway get-rest-apis \
    --region $REGION \
    --query "items[?name=='$API_NAME'].id" \
    --output text)

echo "API ID: $API_ID"

# Get root resource ID
ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?path==`/`].id' \
  --output text)

echo "Root Resource ID: $ROOT_ID"

# Function to create API resource and method
create_endpoint() {
  local RESOURCE_PATH=$1
  local LAMBDA_FUNCTION=$2
  local HTTP_METHOD=${3:-POST}
  
  echo ""
  echo "Creating endpoint: $HTTP_METHOD /$RESOURCE_PATH"
  
  # Create resource
  RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part "$RESOURCE_PATH" \
    --region $REGION \
    --query 'id' \
    --output text 2>/dev/null || \
    aws apigateway get-resources \
      --rest-api-id $API_ID \
      --region $REGION \
      --query "items[?pathPart=='$RESOURCE_PATH'].id" \
      --output text)
  
  echo "  Resource ID: $RESOURCE_ID"
  
  # Create method
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method $HTTP_METHOD \
    --authorization-type NONE \
    --region $REGION \
    --no-api-key-required 2>/dev/null || true
  
  # Create integration
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method $HTTP_METHOD \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$LAMBDA_FUNCTION/invocations" \
    --region $REGION 2>/dev/null || true
  
  # Add Lambda permission
  aws lambda add-permission \
    --function-name $LAMBDA_FUNCTION \
    --statement-id "apigateway-$RESOURCE_PATH-$HTTP_METHOD" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/$HTTP_METHOD/$RESOURCE_PATH" \
    --region $REGION 2>/dev/null || true
  
  # Enable CORS
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region $REGION 2>/dev/null || true
  
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
    --region $REGION 2>/dev/null || true
  
  aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers": true, "method.response.header.Access-Control-Allow-Methods": true, "method.response.header.Access-Control-Allow-Origin": true}' \
    --region $REGION 2>/dev/null || true
  
  aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers": "'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'", "method.response.header.Access-Control-Allow-Methods": "'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'", "method.response.header.Access-Control-Allow-Origin": "'"'"'*'"'"'"}' \
    --region $REGION 2>/dev/null || true
  
  echo "  ✅ Endpoint created"
}

# Create endpoints
create_endpoint "chat" "lazarus-api-chat" "POST"
create_endpoint "login" "lazarus-api-auth" "POST"
create_endpoint "upload" "lazarus-api-upload" "POST"
create_endpoint "analyze" "lazarus-api-analyze" "POST"

# Create conversations endpoint with sub-resources
echo ""
echo "Creating conversations endpoints..."
CONVERSATIONS_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part "conversations" \
  --region $REGION \
  --query 'id' \
  --output text 2>/dev/null || \
  aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?pathPart=='conversations'].id" \
    --output text)

echo "Conversations Resource ID: $CONVERSATIONS_RESOURCE_ID"

# GET /conversations - List all
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $CONVERSATIONS_RESOURCE_ID \
  --http-method GET \
  --authorization-type NONE \
  --region $REGION \
  --no-api-key-required 2>/dev/null || true

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $CONVERSATIONS_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:lazarus-api-conversations/invocations" \
  --region $REGION 2>/dev/null || true

# POST /conversations - Create new
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $CONVERSATIONS_RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE \
  --region $REGION \
  --no-api-key-required 2>/dev/null || true

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $CONVERSATIONS_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:lazarus-api-conversations/invocations" \
  --region $REGION 2>/dev/null || true

# Add Lambda permission for conversations
aws lambda add-permission \
  --function-name lazarus-api-conversations \
  --statement-id "apigateway-conversations" \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*/conversations*" \
  --region $REGION 2>/dev/null || true

echo "✅ Conversations endpoints created"

# Deploy API
echo ""
echo "Deploying API to prod stage..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Production deployment" \
  --region $REGION

echo ""
echo "✅ API Gateway created successfully!"
echo ""
echo "📋 API Endpoint:"
echo "  https://$API_ID.execute-api.$REGION.amazonaws.com/prod"
echo ""
echo "🔗 Endpoints:"
echo "  POST https://$API_ID.execute-api.$REGION.amazonaws.com/prod/chat"
echo "  POST https://$API_ID.execute-api.$REGION.amazonaws.com/prod/login"
echo "  POST https://$API_ID.execute-api.$REGION.amazonaws.com/prod/upload"
echo "  POST https://$API_ID.execute-api.$REGION.amazonaws.com/prod/analyze"
echo "  GET  https://$API_ID.execute-api.$REGION.amazonaws.com/prod/conversations"
echo "  POST https://$API_ID.execute-api.$REGION.amazonaws.com/prod/conversations"
echo ""
echo "📝 Next Steps:"
echo "1. Update .env.local:"
echo "   VITE_API_URL=https://$API_ID.execute-api.$REGION.amazonaws.com/prod"
echo ""
echo "2. Test the endpoints:"
echo "   curl -X POST https://$API_ID.execute-api.$REGION.amazonaws.com/prod/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"password\":\"your-password\"}'"
echo ""
echo "3. Update Amplify environment variables with API URL"
