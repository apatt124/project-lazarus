#!/bin/bash

# Add Fact Extraction Routes to API Gateway
# This script adds the necessary routes for the fact extraction Lambda

set -e

echo "🔗 Adding Fact Extraction Routes to API Gateway"
echo "==============================================="

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check required environment variables
if [ -z "$AWS_REGION" ]; then
  echo "❌ Error: AWS_REGION not set"
  exit 1
fi

if [ -z "$API_GATEWAY_ID" ]; then
  echo "❌ Error: API_GATEWAY_ID not set"
  exit 1
fi

FUNCTION_NAME="${FACT_EXTRACTION_FUNCTION:-lazarus-fact-extraction}"

echo ""
echo "API Gateway ID: $API_GATEWAY_ID"
echo "Region: $AWS_REGION"
echo "Lambda Function: $FUNCTION_NAME"

# Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_GATEWAY_ID \
  --region $AWS_REGION \
  --query 'items[?path==`/`].id' \
  --output text)

echo "Root Resource ID: $ROOT_RESOURCE_ID"

# Create /facts resource
echo ""
echo "Creating /facts resource..."
FACTS_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_GATEWAY_ID \
  --parent-id $ROOT_RESOURCE_ID \
  --path-part facts \
  --region $AWS_REGION \
  --query 'id' \
  --output text 2>/dev/null || \
  aws apigateway get-resources \
    --rest-api-id $API_GATEWAY_ID \
    --region $AWS_REGION \
    --query 'items[?pathPart==`facts`].id' \
    --output text)

echo "Facts Resource ID: $FACTS_RESOURCE_ID"

# Create /facts/extract resource
echo ""
echo "Creating /facts/extract resource..."
EXTRACT_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_GATEWAY_ID \
  --parent-id $FACTS_RESOURCE_ID \
  --path-part extract \
  --region $AWS_REGION \
  --query 'id' \
  --output text 2>/dev/null || \
  aws apigateway get-resources \
    --rest-api-id $API_GATEWAY_ID \
    --region $AWS_REGION \
    --query 'items[?pathPart==`extract`].id' \
    --output text)

echo "Extract Resource ID: $EXTRACT_RESOURCE_ID"

# Create /facts/extract/{documentId} resource
echo ""
echo "Creating /facts/extract/{documentId} resource..."
DOCUMENT_ID_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_GATEWAY_ID \
  --parent-id $EXTRACT_RESOURCE_ID \
  --path-part '{documentId}' \
  --region $AWS_REGION \
  --query 'id' \
  --output text 2>/dev/null || \
  aws apigateway get-resources \
    --rest-api-id $API_GATEWAY_ID \
    --region $AWS_REGION \
    --query 'items[?pathPart==`{documentId}`].id' \
    --output text)

echo "Document ID Resource ID: $DOCUMENT_ID_RESOURCE_ID"

# Get Lambda ARN
LAMBDA_ARN=$(aws lambda get-function \
  --function-name $FUNCTION_NAME \
  --region $AWS_REGION \
  --query 'Configuration.FunctionArn' \
  --output text)

echo "Lambda ARN: $LAMBDA_ARN"

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Function to create method
create_method() {
  local RESOURCE_ID=$1
  local HTTP_METHOD=$2
  local PATH=$3
  
  echo ""
  echo "Creating $HTTP_METHOD method for $PATH..."
  
  # Create method
  aws apigateway put-method \
    --rest-api-id $API_GATEWAY_ID \
    --resource-id $RESOURCE_ID \
    --http-method $HTTP_METHOD \
    --authorization-type NONE \
    --region $AWS_REGION \
    2>/dev/null || echo "Method already exists"
  
  # Create integration
  aws apigateway put-integration \
    --rest-api-id $API_GATEWAY_ID \
    --resource-id $RESOURCE_ID \
    --http-method $HTTP_METHOD \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$AWS_REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
    --region $AWS_REGION \
    2>/dev/null || echo "Integration already exists"
  
  # Add Lambda permission
  aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id "apigateway-$RESOURCE_ID-$HTTP_METHOD" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$AWS_REGION:$AWS_ACCOUNT_ID:$API_GATEWAY_ID/*/$HTTP_METHOD$PATH" \
    --region $AWS_REGION \
    2>/dev/null || echo "Permission already exists"
}

# Create methods
create_method $DOCUMENT_ID_RESOURCE_ID POST "/facts/extract/*"
create_method $EXTRACT_RESOURCE_ID POST "/facts/extract"

# Create /facts/extract-all resource
echo ""
echo "Creating /facts/extract-all resource..."
EXTRACT_ALL_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_GATEWAY_ID \
  --parent-id $FACTS_RESOURCE_ID \
  --path-part extract-all \
  --region $AWS_REGION \
  --query 'id' \
  --output text 2>/dev/null || \
  aws apigateway get-resources \
    --rest-api-id $API_GATEWAY_ID \
    --region $AWS_REGION \
    --query 'items[?pathPart==`extract-all`].id' \
    --output text)

create_method $EXTRACT_ALL_RESOURCE_ID POST "/facts/extract-all"

# Create /facts/extract-text resource
echo ""
echo "Creating /facts/extract-text resource..."
EXTRACT_TEXT_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_GATEWAY_ID \
  --parent-id $FACTS_RESOURCE_ID \
  --path-part extract-text \
  --region $AWS_REGION \
  --query 'id' \
  --output text 2>/dev/null || \
  aws apigateway get-resources \
    --rest-api-id $API_GATEWAY_ID \
    --region $AWS_REGION \
    --query 'items[?pathPart==`extract-text`].id' \
    --output text)

create_method $EXTRACT_TEXT_RESOURCE_ID POST "/facts/extract-text"

# Deploy API
echo ""
echo "Deploying API..."
aws apigateway create-deployment \
  --rest-api-id $API_GATEWAY_ID \
  --stage-name prod \
  --region $AWS_REGION

echo ""
echo "✅ API Gateway routes added successfully!"
echo ""
echo "Available endpoints:"
echo "  POST /facts/extract/{documentId}"
echo "  POST /facts/extract-all"
echo "  POST /facts/extract-text"
