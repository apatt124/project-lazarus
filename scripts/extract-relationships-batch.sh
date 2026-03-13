#!/bin/bash

# Extract relationships from facts in batches
# This processes facts that don't have relationships yet

set -e

echo "🔗 Batch Relationship Extraction"
echo "================================"

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$VITE_API_URL" ]; then
  echo "❌ Error: VITE_API_URL not set"
  exit 1
fi

BATCH_SIZE=${1:-50}
MAX_BATCHES=${2:-10}

echo ""
echo "Configuration:"
echo "  Batch size: $BATCH_SIZE facts per batch"
echo "  Max batches: $MAX_BATCHES"
echo "  API URL: $VITE_API_URL"
echo ""
echo "Processing..."

curl -X POST "$VITE_API_URL/relationships/extract-all" \
  -H "Content-Type: application/json" \
  -d "{\"batchSize\": $BATCH_SIZE, \"maxBatches\": $MAX_BATCHES}" \
  2>/dev/null | jq '.'

echo ""
echo "✅ Done!"
