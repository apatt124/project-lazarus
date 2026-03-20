#!/bin/bash

# Extract Relationships Asynchronously (No Timeout)
# Runs relationship extraction in background batches

set -e

echo "🔗 Async Relationship Extraction"
echo "================================="

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

NUM_BATCHES=${1:-5}
BATCH_SIZE=${2:-50}

echo ""
echo "Configuration:"
echo "  Number of batches: $NUM_BATCHES"
echo "  Facts per batch: $BATCH_SIZE"
echo "  Total facts to process: ~$((NUM_BATCHES * BATCH_SIZE))"
echo "  Estimated time: ~$((NUM_BATCHES * 2)) minutes"
echo ""

for i in $(seq 1 $NUM_BATCHES); do
  echo "[$i/$NUM_BATCHES] Triggering batch $i..."
  
  # Create payload for single batch
  PAYLOAD=$(cat <<EOF
{
  "path": "/relationships/extract",
  "httpMethod": "POST",
  "body": "{\"batchSize\":$BATCH_SIZE,\"skipExisting\":true}"
}
EOF
)
  
  # Invoke asynchronously (fire and forget)
  aws lambda invoke \
    --function-name lazarus-api-relationships \
    --invocation-type Event \
    --cli-binary-format raw-in-base64-out \
    --payload "$PAYLOAD" \
    --region $AWS_REGION \
    /tmp/extract_batch_$i.json > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "  ✅ Batch $i triggered successfully"
  else
    echo "  ❌ Batch $i failed to trigger"
  fi
  
  # Wait between batches to avoid overwhelming the system
  if [ $i -lt $NUM_BATCHES ]; then
    echo "  ⏳ Waiting 120 seconds before next batch..."
    sleep 120
  fi
done

echo ""
echo "✅ All batches triggered!"
echo ""
echo "The relationship extraction is running in the background."
echo "This will take approximately $((NUM_BATCHES * 2)) minutes to complete."
echo ""
echo "Monitor progress:"
echo "  aws logs tail /aws/lambda/lazarus-api-relationships --follow"
echo ""
echo "Check results after completion:"
echo "  SELECT COUNT(*) FROM medical.relationships WHERE is_active = TRUE;"
echo ""
echo "Then regenerate AI layout:"
echo "  ./scripts/generate-ai-layout.sh default"

# Cleanup
rm -f /tmp/extract_batch_*.json
