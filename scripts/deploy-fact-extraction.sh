#!/bin/bash

# Deploy Fact Extraction Lambda Function
# This script packages and deploys the fact extraction Lambda to AWS

set -e

echo "🏥 Deploying Fact Extraction Lambda Function"
echo "============================================="

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check required environment variables
if [ -z "$AWS_REGION" ]; then
  echo "❌ Error: AWS_REGION not set"
  exit 1
fi

FUNCTION_NAME="${FACT_EXTRACTION_FUNCTION:-lazarus-fact-extraction}"
LAMBDA_DIR="lambda/api-fact-extraction"

echo ""
echo "📦 Installing dependencies..."
cd $LAMBDA_DIR
npm install --production
cd ../..

echo ""
echo "📦 Creating deployment package..."
cd $LAMBDA_DIR
zip -r ../fact-extraction.zip . -x "*.git*" "node_modules/aws-sdk/*"
cd ../..

echo ""
echo "☁️  Deploying to AWS Lambda..."

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION 2>/dev/null; then
  echo "Updating existing function..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://lambda/fact-extraction.zip \
    --region $AWS_REGION
  
  echo "Updating function configuration..."
  aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --timeout 300 \
    --memory-size 512 \
    --region $AWS_REGION
else
  echo "Creating new function..."
  
  # Get Lambda execution role ARN
  ROLE_ARN=$(aws iam get-role --role-name LazarusLambdaExecutionRole --query 'Role.Arn' --output text 2>/dev/null || echo "")
  
  if [ -z "$ROLE_ARN" ]; then
    echo "❌ Error: Lambda execution role not found"
    echo "Please create the LazarusLambdaExecutionRole first"
    exit 1
  fi
  
  aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime nodejs20.x \
    --role $ROLE_ARN \
    --handler index.handler \
    --zip-file fileb://lambda/fact-extraction.zip \
    --timeout 300 \
    --memory-size 512 \
    --region $AWS_REGION
fi

echo ""
echo "🔗 Creating API Gateway integration..."
# Note: You'll need to manually add this to your API Gateway
echo "   Add route: POST /facts/extract/{documentId}"
echo "   Add route: POST /facts/extract-all"
echo "   Add route: POST /facts/extract-text"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Function name: $FUNCTION_NAME"
echo "Region: $AWS_REGION"
echo ""
echo "Test the function:"
echo "  node scripts/extract-facts-from-documents.js --limit=5"
