#!/bin/bash

# Deploy API Lambda functions for Project Lazarus

set -e

REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🚀 Deploying API Lambda Functions"
echo "=================================="
echo "Region: $REGION"
echo "Account: $ACCOUNT_ID"
echo ""

# Get the app password from environment or Amplify
if [ -z "$APP_PASSWORD" ]; then
  APP_PASSWORD=$(aws amplify get-app --app-id dp2mw5m8eaj5o --region $REGION --query 'app.environmentVariables.APP_PASSWORD' --output text 2>/dev/null || echo "")
fi

if [ -z "$APP_PASSWORD" ]; then
  echo "❌ ERROR: APP_PASSWORD not set. Please set it as an environment variable or in Amplify."
  echo "   Example: export APP_PASSWORD='your-secure-password'"
  exit 1
fi

# Function to deploy a Lambda
deploy_lambda() {
  local FUNCTION_NAME=$1
  local LAMBDA_DIR=$2
  local HANDLER=$3
  local DESCRIPTION=$4
  local TIMEOUT=${5:-30}
  local MEMORY=${6:-512}
  
  echo "📦 Deploying $FUNCTION_NAME..."
  
  cd "$LAMBDA_DIR"
  
  # Install dependencies if package.json exists
  if [ -f "package.json" ]; then
    echo "  Installing dependencies..."
    npm install --production
  fi
  
  # Create deployment package
  echo "  Creating deployment package..."
  zip -r function.zip . -x "*.git*" "*.DS_Store"
  
  # Check if function exists
  if aws lambda get-function --function-name "$FUNCTION_NAME" --region $REGION &>/dev/null; then
    echo "  Updating existing function..."
    aws lambda update-function-code \
      --function-name "$FUNCTION_NAME" \
      --zip-file fileb://function.zip \
      --region $REGION \
      --output text
    
    # Update configuration
    aws lambda update-function-configuration \
      --function-name "$FUNCTION_NAME" \
      --timeout $TIMEOUT \
      --memory-size $MEMORY \
      --environment "Variables={VECTOR_SEARCH_FUNCTION=lazarus-vector-search,APP_PASSWORD=$APP_PASSWORD}" \
      --region $REGION \
      --output text
  else
    echo "  Creating new function..."
    
    # Create execution role if it doesn't exist
    ROLE_NAME="LazarusAPILambdaRole"
    ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null || echo "")
    
    if [ -z "$ROLE_ARN" ]; then
      echo "  Creating IAM role..."
      
      # Create trust policy
      cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
      
      aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document file:///tmp/trust-policy.json \
        --description "Execution role for Lazarus API Lambda functions"
      
      # Attach policies
      aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      
      aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
      
      aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
      
      # Create inline policy for Lambda invocation
      cat > /tmp/lambda-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": "arn:aws:lambda:$REGION:$ACCOUNT_ID:function:lazarus-*"
    }
  ]
}
EOF
      
      aws iam put-role-policy \
        --role-name $ROLE_NAME \
        --policy-name LambdaInvokePolicy \
        --policy-document file:///tmp/lambda-policy.json
      
      ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"
      
      echo "  Waiting for role to be ready..."
      sleep 10
    fi
    
    # Create function
    aws lambda create-function \
      --function-name "$FUNCTION_NAME" \
      --runtime nodejs20.x \
      --role "$ROLE_ARN" \
      --handler "$HANDLER" \
      --zip-file fileb://function.zip \
      --description "$DESCRIPTION" \
      --timeout $TIMEOUT \
      --memory-size $MEMORY \
      --environment "Variables={VECTOR_SEARCH_FUNCTION=lazarus-vector-search,APP_PASSWORD=$APP_PASSWORD}" \
      --region $REGION
  fi
  
  # Clean up
  rm function.zip
  
  echo "  ✅ $FUNCTION_NAME deployed"
  echo ""
  
  cd - > /dev/null
}

# Deploy each Lambda function
deploy_lambda \
  "lazarus-api-chat" \
  "lambda/api-chat" \
  "index.handler" \
  "Chat API for Project Lazarus" \
  60 \
  1024

deploy_lambda \
  "lazarus-api-auth" \
  "lambda/api-auth" \
  "index.handler" \
  "Authentication API for Project Lazarus" \
  10 \
  128

deploy_lambda \
  "lazarus-api-upload" \
  "lambda/api-upload" \
  "index.handler" \
  "Document Upload API for Project Lazarus" \
  300 \
  2048

deploy_lambda \
  "lazarus-api-analyze" \
  "lambda/api-analyze" \
  "index.handler" \
  "Document Analysis API for Project Lazarus" \
  30 \
  512

deploy_lambda \
  "lazarus-api-conversations" \
  "lambda/api-conversations" \
  "index.handler" \
  "Conversations API for Project Lazarus" \
  30 \
  256

echo "✅ All Lambda functions deployed!"
echo ""
echo "📋 Next Steps:"
echo "1. Create API Gateway to expose these functions"
echo "2. Update .env.local with API Gateway URL"
echo "3. Test the endpoints"
echo ""
echo "Function URLs:"
echo "  Chat: lazarus-api-chat"
echo "  Auth: lazarus-api-auth"
echo "  Upload: lazarus-api-upload"
echo "  Analyze: lazarus-api-analyze"
echo "  Conversations: lazarus-api-conversations"
