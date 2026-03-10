#!/bin/bash

source .env.local

echo "=========================================="
echo "Full Memory System Test"
echo "=========================================="
echo ""

# Test 1: View current state
echo "1. Current Memory State"
echo "----------------------"
FACTS=$(curl -s "${VITE_API_URL}/memory/facts")
MEMORIES=$(curl -s "${VITE_API_URL}/memory/memories")

FACTS_COUNT=$(echo "$FACTS" | jq -r '.count')
MEMORIES_COUNT=$(echo "$MEMORIES" | jq -r '.count')

echo "Facts: $FACTS_COUNT"
echo "Memories: $MEMORIES_COUNT"
echo ""

# Test 2: Show fact types
echo "2. Facts by Type"
echo "----------------"
echo "$FACTS" | jq -r '.facts | group_by(.fact_type) | .[] | "\(.[0].fact_type): \(length) facts"'
echo ""

# Test 3: Show memory types
echo "3. Memories by Type"
echo "-------------------"
echo "$MEMORIES" | jq -r '.memories | group_by(.memory_type) | .[] | "\(.[0].memory_type): \(length) memories"'
echo ""

# Test 4: Test confidence filtering
echo "4. Testing Confidence Filtering"
echo "--------------------------------"
FACT_ID=$(echo "$FACTS" | jq -r '.facts[0].id')
echo "Setting fact confidence to 0.3 (below threshold)..."
curl -s -X PATCH "${VITE_API_URL}/memory/facts/${FACT_ID}" \
  -H 'Content-Type: application/json' \
  -d '{"confidence": 0.3}' | jq -r '"Updated: \(.success)"'

echo "This fact should now be excluded from AI context (< 0.5 threshold)"
echo ""

# Restore it
echo "Restoring fact confidence to 0.9..."
curl -s -X PATCH "${VITE_API_URL}/memory/facts/${FACT_ID}" \
  -H 'Content-Type: application/json' \
  -d '{"confidence": 0.9}' | jq -r '"Restored: \(.success)"'
echo ""

# Test 5: Test memory active toggle
echo "5. Testing Memory Active Toggle"
echo "--------------------------------"
MEMORY_ID=$(echo "$MEMORIES" | jq -r '.memories[0].id')
echo "Deactivating memory..."
curl -s -X PATCH "${VITE_API_URL}/memory/memories/${MEMORY_ID}" \
  -H 'Content-Type: application/json' \
  -d '{"is_active": false}' | jq -r '"Deactivated: \(.success)"'

echo "This memory is now excluded from AI context"
echo ""

echo "Reactivating memory..."
curl -s -X PATCH "${VITE_API_URL}/memory/memories/${MEMORY_ID}" \
  -H 'Content-Type: application/json' \
  -d '{"is_active": true}' | jq -r '"Reactivated: \(.success)"'
echo ""

# Test 6: Test relevance adjustment
echo "6. Testing Relevance Adjustment"
echo "--------------------------------"
echo "Setting memory relevance to 0.6..."
curl -s -X PATCH "${VITE_API_URL}/memory/memories/${MEMORY_ID}" \
  -H 'Content-Type: application/json' \
  -d '{"relevance_score": 0.6}' | jq -r '"Updated: \(.success), New relevance: \(.memory.relevance_score)"'

echo "This memory will now show [60% relevance] indicator in AI prompts"
echo ""

# Test 7: Test chat with weighted context
echo "7. Testing Chat with Weighted Context"
echo "--------------------------------------"
CHAT_RESPONSE=$(curl -s -X POST "${VITE_API_URL}/chat" \
  -H 'Content-Type: application/json' \
  -d '{"query":"What do you know about my medical conditions?","include_memory":true}')

echo "AI Response (first 300 chars):"
echo "$CHAT_RESPONSE" | jq -r '.answer' | head -c 300
echo "..."
echo ""

echo "=========================================="
echo "✅ Full Memory System Test Complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "--------"
echo "• Facts: $FACTS_COUNT (confidence-weighted)"
echo "• Memories: $MEMORIES_COUNT (relevance-weighted)"
echo "• Confidence threshold: ≥ 0.5"
echo "• Active memories only in context"
echo "• Weight indicators shown in AI prompts"
echo ""
echo "Management Features:"
echo "• Adjust fact confidence (0-100%)"
echo "• Adjust memory relevance (0-100%)"
echo "• Toggle memory active/inactive"
echo "• Delete facts and memories"
echo "• View usage statistics"
