#!/bin/bash
# View Lambda logs

FUNCTION="${1:-lazarus-vector-search}"
MINUTES="${2:-10}"

echo "📜 Viewing logs for $FUNCTION (last $MINUTES minutes)"
echo ""

aws logs tail "/aws/lambda/$FUNCTION" \
  --since ${MINUTES}m \
  --follow \
  --format short
