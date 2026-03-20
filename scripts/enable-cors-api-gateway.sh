#!/bin/bash

# Enable CORS for API Gateway endpoints
# This script adds OPTIONS method with proper CORS headers

API_ID="spgwp4ei7f"
REGION="us-east-1"

echo "Enabling CORS for /memory/memories/{memoryId}..."

# Add integration response with proper CORS headers
aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id zcr1xj \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters "{\"method.response.header.Access-Control-Allow-Headers\":\"'Content-Type,Authorization'\",\"method.response.header.Access-Control-Allow-Methods\":\"'GET,POST,PUT,PATCH,DELETE,OPTIONS'\",\"method.response.header.Access-Control-Allow-Origin\":\"'*'\"}" \
  --region $REGION

echo "Deploying API..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Enable CORS for memory endpoints" \
  --region $REGION

echo "CORS enabled successfully!"
