#!/bin/bash

# Extract Relationships Between Existing Facts
# Uses Claude AI to find medical relationships between facts

set -e

echo "🔗 Extracting Relationships Between Facts"
echo "=========================================="

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

BATCH_SIZE=${1:-100}
MAX_BATCHES=${2:-10}

echo ""
echo "Configuration:"
echo "  Batch Size: $BATCH_SIZE facts per batch"
echo "  Max Batches: $MAX_BATCHES batches"
echo "  Region: $AWS_REGION"
echo ""

# Create payload
PAYLOAD=$(cat <<EOF
{
  "path": "/relationships/extract-all",
  "httpMethod": "POST",
  "body": "{\"batchSize\":$BATCH_SIZE,\"maxBatches\":$MAX_BATCHES}"
}
EOF
)

echo "Invoking Lambda function..."
echo ""

# Invoke Lambda
aws lambda invoke \
  --function-name lazarus-api-relationships \
  --cli-binary-format raw-in-base64-out \
  --payload "$PAYLOAD" \
  --region $AWS_REGION \
  /tmp/extract-response.json > /dev/null

# Parse response
if [ -f /tmp/extract-response.json ]; then
  echo "Response:"
  cat /tmp/extract-response.json | python3 -m json.tool
  echo ""
  
  # Extract key metrics
  SUCCESS=$(cat /tmp/extract-response.json | python3 -c "import sys, json; data = json.loads(sys.stdin.read()); body = json.loads(data.get('body', '{}')); print(body.get('success', False))" 2>/dev/null || echo "false")
  
  if [ "$SUCCESS" = "True" ]; then
    TOTAL_CREATED=$(cat /tmp/extract-response.json | python3 -c "import sys, json; data = json.loads(sys.stdin.read()); body = json.loads(data.get('body', '{}')); print(body.get('total_relationships_created', 0))" 2>/dev/null || echo "0")
    BATCHES=$(cat /tmp/extract-response.json | python3 -c "import sys, json; data = json.loads(sys.stdin.read()); body = json.loads(data.get('body', '{}')); print(body.get('batches_processed', 0))" 2>/dev/null || echo "0")
    
    echo "✅ Relationship extraction completed!"
    echo ""
    echo "Summary:"
    echo "  Batches Processed: $BATCHES"
    echo "  Relationships Created: $TOTAL_CREATED"
    echo ""
    echo "Next steps:"
    echo "  1. Regenerate AI layout: ./scripts/generate-ai-layout.sh default"
    echo "  2. Refresh knowledge graph in browser"
  else
    echo "❌ Relationship extraction failed"
    echo "Check the response above for details"
  fi
else
  echo "❌ No response file created"
fi

# Cleanup
rm -f /tmp/extract-response.json
