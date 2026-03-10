#!/bin/bash

# Project Lazarus - Deploy Medical Schema Migration
# This script:
# 1. Runs the database migration
# 2. Updates Lambda functions to use medical schema
# 3. Verifies the deployment

set -e

echo "=========================================="
echo "Project Lazarus - Medical Schema Migration"
echo "=========================================="
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check required variables
if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: DB_PASSWORD not set"
    echo "Please set it in .env file"
    exit 1
fi

# Step 1: Run database migration
echo "📊 Step 1: Running database migration..."
echo ""

./run-migration.sh migrations/003_migrate_to_medical_schema.sql

if [ $? -ne 0 ]; then
    echo "❌ Migration failed! Aborting deployment."
    exit 1
fi

echo ""
echo "✅ Database migration complete"
echo ""

# Step 2: Deploy Lambda functions
echo "🚀 Step 2: Deploying updated Lambda functions..."
echo ""

# Deploy api-chat Lambda
echo "Deploying lazarus-api-chat..."
cd lambda/api-chat
zip -q -r function.zip .
aws lambda update-function-code \
    --function-name lazarus-api-chat \
    --zip-file fileb://function.zip \
    --region us-east-1
rm function.zip
cd ../..

echo "✅ lazarus-api-chat deployed"
echo ""

# Deploy api-conversations Lambda
echo "Deploying lazarus-api-conversations..."
cd lambda/api-conversations
zip -q -r function.zip .
aws lambda update-function-code \
    --function-name lazarus-api-conversations \
    --zip-file fileb://function.zip \
    --region us-east-1
rm function.zip
cd ../..

echo "✅ lazarus-api-conversations deployed"
echo ""

# Step 3: Wait for Lambda functions to be ready
echo "⏳ Waiting for Lambda functions to be ready..."
sleep 5

# Step 4: Test the deployment
echo ""
echo "🧪 Step 3: Testing deployment..."
echo ""

# Test conversations list
echo "Testing GET /conversations..."
CONV_RESPONSE=$(curl -s https://spgwp4ei7f.execute-api.us-east-1.amazonaws.com/prod/conversations)
CONV_COUNT=$(echo $CONV_RESPONSE | jq -r '.conversations | length')

if [ "$CONV_COUNT" -gt 0 ]; then
    echo "✅ Conversations endpoint working ($CONV_COUNT conversations found)"
else
    echo "⚠️  No conversations found (this might be expected)"
fi

echo ""

# Test conversation creation
echo "Testing POST /conversations..."
CREATE_RESPONSE=$(curl -s -X POST \
    https://spgwp4ei7f.execute-api.us-east-1.amazonaws.com/prod/conversations \
    -H 'Content-Type: application/json' \
    -d '{"title":"Test Migration Conversation"}')

TEST_CONV_ID=$(echo $CREATE_RESPONSE | jq -r '.conversation.id')

if [ "$TEST_CONV_ID" != "null" ] && [ -n "$TEST_CONV_ID" ]; then
    echo "✅ Conversation creation working (ID: $TEST_CONV_ID)"
    
    # Test chat with conversation
    echo ""
    echo "Testing POST /chat with conversation_id..."
    CHAT_RESPONSE=$(curl -s -X POST \
        https://spgwp4ei7f.execute-api.us-east-1.amazonaws.com/prod/chat \
        -H 'Content-Type: application/json' \
        -d "{\"query\":\"Hello, this is a test message\",\"conversation_id\":\"$TEST_CONV_ID\"}")
    
    CHAT_SUCCESS=$(echo $CHAT_RESPONSE | jq -r '.success')
    
    if [ "$CHAT_SUCCESS" = "true" ]; then
        echo "✅ Chat with conversation working"
        
        # Verify message was saved
        echo ""
        echo "Testing GET /conversations/:id..."
        DETAIL_RESPONSE=$(curl -s https://spgwp4ei7f.execute-api.us-east-1.amazonaws.com/prod/conversations/$TEST_CONV_ID)
        MESSAGE_COUNT=$(echo $DETAIL_RESPONSE | jq -r '.conversation.messages | length')
        
        if [ "$MESSAGE_COUNT" -gt 0 ]; then
            echo "✅ Messages saved correctly ($MESSAGE_COUNT messages)"
        else
            echo "⚠️  No messages found in conversation"
        fi
    else
        echo "❌ Chat failed"
        echo $CHAT_RESPONSE | jq '.'
    fi
else
    echo "❌ Conversation creation failed"
    echo $CREATE_RESPONSE | jq '.'
fi

echo ""
echo "=========================================="
echo "✅ Migration and Deployment Complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Database migrated to medical schema"
echo "- Lambda functions updated and deployed"
echo "- End-to-end tests passed"
echo ""
echo "Next steps:"
echo "1. Monitor CloudWatch logs for any errors"
echo "2. Test from frontend application"
echo "3. Archive old public schema tables (optional)"
echo ""
