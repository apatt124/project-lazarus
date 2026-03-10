#!/bin/bash

source .env.local

echo "Testing Enhanced Memory UI"
echo "=========================="
echo ""

# Get current state
MEMORIES=$(curl -s "${VITE_API_URL}/memory/memories")
MEMORIES_COUNT=$(echo "$MEMORIES" | jq -r '.count')

echo "Current Memories: $MEMORIES_COUNT"
echo ""

# Show memory breakdown
echo "Memory Types:"
echo "$MEMORIES" | jq -r '.memories | group_by(.memory_type) | .[] | "  • \(.[0].memory_type): \(length)"'
echo ""

echo "Memory Categories:"
echo "$MEMORIES" | jq -r '.memories | group_by(.category) | .[] | "  • \(.[0].category): \(length)"'
echo ""

echo "Active Status:"
ACTIVE=$(echo "$MEMORIES" | jq '[.memories[] | select(.is_active == true)] | length')
INACTIVE=$(echo "$MEMORIES" | jq '[.memories[] | select(.is_active == false)] | length')
echo "  • Active: $ACTIVE"
echo "  • Inactive: $INACTIVE"
echo ""

echo "Relevance Distribution:"
HIGH=$(echo "$MEMORIES" | jq '[.memories[] | select(.relevance_score >= 0.8)] | length')
MEDIUM=$(echo "$MEMORIES" | jq '[.memories[] | select(.relevance_score >= 0.5 and .relevance_score < 0.8)] | length')
LOW=$(echo "$MEMORIES" | jq '[.memories[] | select(.relevance_score < 0.5)] | length')
echo "  • High (≥80%): $HIGH"
echo "  • Medium (50-79%): $MEDIUM"
echo "  • Low (<50%): $LOW"
echo ""

echo "Usage Statistics:"
USED=$(echo "$MEMORIES" | jq '[.memories[] | select(.usage_count > 0)] | length')
UNUSED=$(echo "$MEMORIES" | jq '[.memories[] | select(.usage_count == 0)] | length')
echo "  • Used: $USED"
echo "  • Unused: $UNUSED"
echo ""

echo "Sample Memories:"
echo "$MEMORIES" | jq -r '.memories[0:3][] | "  • [\(.memory_type)] \(.content[0:60])... (relevance: \(.relevance_score * 100 | floor)%, active: \(.is_active))"'
echo ""

echo "=========================="
echo "UI Features Available:"
echo "=========================="
echo ""
echo "Filters:"
echo "  • Search by content"
echo "  • Filter by type (instruction, preference, learning, correction)"
echo "  • Filter by category (medical, general, behavioral)"
echo "  • Show/hide inactive memories"
echo ""
echo "Sorting:"
echo "  • By relevance (highest first)"
echo "  • By usage count (most used first)"
echo "  • By date (newest first)"
echo ""
echo "Management:"
echo "  • Adjust relevance slider (0-100%)"
echo "  • Toggle active/inactive (eye icon)"
echo "  • Delete memories (trash icon)"
echo "  • View usage count"
echo ""
echo "To test in browser:"
echo "  1. Click user profile icon in chat header"
echo "  2. Switch to 'Memories' tab"
echo "  3. Try search, filters, and sorting"
echo "  4. Adjust relevance sliders"
echo "  5. Toggle memories on/off"
