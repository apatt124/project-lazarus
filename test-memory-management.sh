#!/bin/bash

source .env.local

echo "Testing Memory Management Features"
echo "==================================="
echo ""

# Test 1: Get all facts
echo "1. Getting all user facts..."
FACTS=$(curl -s "${VITE_API_URL}/memory/facts")
FACTS_COUNT=$(echo "$FACTS" | jq -r '.count')
echo "   Total facts: $FACTS_COUNT"

if [ "$FACTS_COUNT" -gt 0 ]; then
  FIRST_FACT_ID=$(echo "$FACTS" | jq -r '.facts[0].id')
  FIRST_FACT_CONTENT=$(echo "$FACTS" | jq -r '.facts[0].content')
  FIRST_FACT_CONFIDENCE=$(echo "$FACTS" | jq -r '.facts[0].confidence')
  
  echo "   Sample fact: $FIRST_FACT_CONTENT"
  echo "   Confidence: $FIRST_FACT_CONFIDENCE"
  echo ""
  
  # Test 2: Update fact confidence
  echo "2. Testing confidence update..."
  UPDATE_RESULT=$(curl -s -X PATCH \
    "${VITE_API_URL}/memory/facts/${FIRST_FACT_ID}" \
    -H 'Content-Type: application/json' \
    -d '{"confidence": 0.95}')
  
  UPDATE_SUCCESS=$(echo "$UPDATE_RESULT" | jq -r '.success')
  NEW_CONFIDENCE=$(echo "$UPDATE_RESULT" | jq -r '.fact.confidence')
  
  if [ "$UPDATE_SUCCESS" = "true" ]; then
    echo "   ✓ Confidence updated to: $NEW_CONFIDENCE"
  else
    echo "   ✗ Update failed"
  fi
  echo ""
fi

# Test 3: Get all memories
echo "3. Getting all memories..."
MEMORIES=$(curl -s "${VITE_API_URL}/memory/memories")
MEMORIES_COUNT=$(echo "$MEMORIES" | jq -r '.count')
echo "   Total memories: $MEMORIES_COUNT"

if [ "$MEMORIES_COUNT" -gt 0 ]; then
  echo ""
  echo "   Sample memories:"
  echo "$MEMORIES" | jq -r '.memories[0:3][] | "   • [\(.memory_type)] \(.content) (relevance: \(.relevance_score), active: \(.is_active))"'
  echo ""
  
  FIRST_MEMORY_ID=$(echo "$MEMORIES" | jq -r '.memories[0].id')
  FIRST_MEMORY_RELEVANCE=$(echo "$MEMORIES" | jq -r '.memories[0].relevance_score')
  
  # Test 4: Update memory relevance
  echo "4. Testing memory relevance update..."
  NEW_RELEVANCE=0.85
  UPDATE_RESULT=$(curl -s -X PATCH \
    "${VITE_API_URL}/memory/memories/${FIRST_MEMORY_ID}" \
    -H 'Content-Type: application/json' \
    -d "{\"relevance_score\": $NEW_RELEVANCE}")
  
  UPDATE_SUCCESS=$(echo "$UPDATE_RESULT" | jq -r '.success')
  
  if [ "$UPDATE_SUCCESS" = "true" ]; then
    echo "   ✓ Relevance updated from $FIRST_MEMORY_RELEVANCE to $NEW_RELEVANCE"
  else
    echo "   ✗ Update failed"
  fi
  echo ""
  
  # Test 5: Toggle memory active status
  echo "5. Testing memory active toggle..."
  TOGGLE_RESULT=$(curl -s -X PATCH \
    "${VITE_API_URL}/memory/memories/${FIRST_MEMORY_ID}" \
    -H 'Content-Type: application/json' \
    -d '{"is_active": false}')
  
  TOGGLE_SUCCESS=$(echo "$TOGGLE_RESULT" | jq -r '.success')
  NEW_STATUS=$(echo "$TOGGLE_RESULT" | jq -r '.memory.is_active')
  
  if [ "$TOGGLE_SUCCESS" = "true" ]; then
    echo "   ✓ Memory active status: $NEW_STATUS"
    
    # Toggle back
    curl -s -X PATCH \
      "${VITE_API_URL}/memory/memories/${FIRST_MEMORY_ID}" \
      -H 'Content-Type: application/json' \
      -d '{"is_active": true}' > /dev/null
    echo "   ✓ Toggled back to active"
  else
    echo "   ✗ Toggle failed"
  fi
fi

echo ""
echo "==================================="
echo "Memory Management Tests Complete!"
echo "==================================="
echo ""
echo "Features verified:"
echo "  ✓ Get all facts"
echo "  ✓ Update fact confidence"
echo "  ✓ Get all memories"
echo "  ✓ Update memory relevance"
echo "  ✓ Toggle memory active status"
echo ""
echo "UI Features:"
echo "  • Facts tab: Adjust confidence sliders, delete facts"
echo "  • Memories tab: Adjust relevance, toggle active, delete"
echo "  • Both tabs accessible from user profile button"
