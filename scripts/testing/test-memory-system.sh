#!/bin/bash
# Test memory management system

# Load API URL from environment
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

API_URL="${VITE_API_URL}"

if [ -z "$API_URL" ]; then
  echo "Error: VITE_API_URL not set in .env.local"
  exit 1
fi

echo "Testing Memory System"
echo "===================="
echo ""

# Test 1: Get current facts
echo "1. Getting current user facts..."
curl -s "$API_URL/memory/facts" | jq '.count, .facts[0:2]'

echo ""
echo "2. Creating test conversation..."
CONV=$(curl -s -X POST "$API_URL/conversations" \
    -H 'Content-Type: application/json' \
    -d '{"title":"Memory Extraction Test"}')

CONV_ID=$(echo $CONV | jq -r '.conversation.id')
echo "Conversation ID: $CONV_ID"

echo ""
echo "3. Sending message with medical facts..."
curl -s -X POST "$API_URL/chat" \
    -H 'Content-Type: application/json' \
    -d "{\"query\":\"I have type 2 diabetes diagnosed in 2020. I'm allergic to penicillin and sulfa drugs. I currently take metformin 500mg twice daily and lisinopril 10mg once daily for blood pressure.\",\"conversation_id\":\"$CONV_ID\"}" \
    | jq '.success'

echo ""
echo "4. Processing conversation to extract facts..."
PROCESS=$(curl -s -X POST "$API_URL/memory/process/$CONV_ID")
echo "$PROCESS" | jq '{success, facts_extracted, memories_extracted}'

echo ""
echo "5. Checking extracted facts..."
echo "$PROCESS" | jq '.facts[0:3] | .[] | {fact_type, content, confidence}'

echo ""
echo "6. Getting all facts..."
curl -s "$API_URL/memory/facts" | jq '{count, facts: .facts[0:5] | .[] | {fact_type, content}}'

echo ""
echo "7. Testing chat with memory (should reference stored facts)..."
curl -s -X POST "$API_URL/chat" \
    -H 'Content-Type: application/json' \
    -d '{"query":"What do you know about my medical conditions?"}' \
    | jq -r '.answer' | head -15

echo ""
echo "Done!"
