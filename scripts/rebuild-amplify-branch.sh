#!/bin/bash

# Rebuild Amplify Branch
# Triggers a new build for a specific branch

set -e

# Load environment variables
if [ -f .env ]; then
  source .env
fi

BRANCH_NAME="${1:-develop}"
APP_ID="${AMPLIFY_APP_ID}"
REGION="${AWS_REGION:-us-east-1}"

if [ -z "$APP_ID" ]; then
  echo "Error: AMPLIFY_APP_ID not set in .env"
  exit 1
fi

echo "🔄 Triggering rebuild for branch: $BRANCH_NAME"
echo ""

# Check if there's already a running job
CURRENT_STATUS=$(aws amplify list-jobs \
  --app-id $APP_ID \
  --branch-name $BRANCH_NAME \
  --region $REGION \
  --max-results 1 \
  --query 'jobSummaries[0].status' \
  --output text)

if [ "$CURRENT_STATUS" == "PENDING" ] || [ "$CURRENT_STATUS" == "RUNNING" ]; then
  echo "⚠️  Build already in progress (status: $CURRENT_STATUS)"
  echo "   Please wait for it to complete before triggering a new build."
  echo ""
  echo "   Monitor at: https://console.aws.amazon.com/amplify/home?region=$REGION#/$APP_ID/branches/$BRANCH_NAME"
  exit 1
fi

# Start new build
RESULT=$(aws amplify start-job \
  --app-id $APP_ID \
  --branch-name $BRANCH_NAME \
  --job-type RELEASE \
  --region $REGION \
  --query 'jobSummary.{jobId:jobId,status:status}' \
  --output json)

JOB_ID=$(echo $RESULT | jq -r '.jobId')
STATUS=$(echo $RESULT | jq -r '.status')

echo "✅ Build triggered successfully!"
echo ""
echo "   Job ID: $JOB_ID"
echo "   Status: $STATUS"
echo ""
echo "   Monitor at: https://console.aws.amazon.com/amplify/home?region=$REGION#/$APP_ID/branches/$BRANCH_NAME"
echo ""
echo "   Build typically takes 5-10 minutes to complete."
