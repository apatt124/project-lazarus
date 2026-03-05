#!/bin/bash
# Test the full chat pipeline (search + AI generation)

QUERY="${1:-What's in my medical records?}"

echo "Testing chat with query: '$QUERY'"
echo ""
echo "This will:"
echo "1. Search medical documents"
echo "2. Generate AI response with Claude"
echo "3. Show the final answer"
echo ""

curl -s -X POST http://localhost:3737/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"$QUERY\"}" | jq -r '
  if .success then
    "✅ Chat successful!\n\n" +
    "Answer:\n" + .answer + "\n\n" +
    "Sources: \(.sources | length) documents used"
  else
    "❌ Error: " + .error
  end
'
