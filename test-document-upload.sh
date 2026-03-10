#!/bin/bash

# Test document upload end-to-end

echo "=========================================="
echo "Testing Document Upload End-to-End"
echo "=========================================="
echo ""

# Create a test document
TEST_CONTENT="Patient: Test User
Date: March 9, 2026
Blood Pressure: 120/80 mmHg
Heart Rate: 72 bpm
Temperature: 98.6°F
Notes: Patient reports feeling well. No concerns."

# Base64 encode the content
BASE64_CONTENT=$(echo "$TEST_CONTENT" | base64)

echo "1. Uploading test document..."
UPLOAD_RESPONSE=$(curl -s -X POST \
  https://spgwp4ei7f.execute-api.us-east-1.amazonaws.com/prod/upload \
  -H 'Content-Type: application/json' \
  -d "{
    \"fileName\": \"test-vitals-$(date +%s).txt\",
    \"fileType\": \"text/plain\",
    \"fileData\": \"$BASE64_CONTENT\",
    \"metadata\": {
      \"documentType\": \"visit_notes\",
      \"provider\": \"Dr. Test\",
      \"date\": \"2026-03-09\"
    }
  }")

echo "$UPLOAD_RESPONSE" | jq '.'

DOCUMENT_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.document.documentId')

if [ "$DOCUMENT_ID" != "null" ] && [ -n "$DOCUMENT_ID" ]; then
    echo ""
    echo "✅ Upload successful! Document ID: $DOCUMENT_ID"
    echo ""
    echo "2. Waiting 5 seconds for indexing..."
    sleep 5
    
    echo ""
    echo "3. Testing chat with query about blood pressure..."
    CHAT_RESPONSE=$(curl -s -X POST \
      https://spgwp4ei7f.execute-api.us-east-1.amazonaws.com/prod/chat \
      -H 'Content-Type: application/json' \
      -d '{"query":"What was my blood pressure in the most recent test?"}')
    
    echo "$CHAT_RESPONSE" | jq '.sources | length' > /tmp/source_count.txt
    SOURCE_COUNT=$(cat /tmp/source_count.txt)
    
    echo ""
    echo "Sources found: $SOURCE_COUNT"
    
    if [ "$SOURCE_COUNT" -gt 0 ]; then
        echo "✅ Documents are being found in search!"
        echo ""
        echo "Sample sources:"
        echo "$CHAT_RESPONSE" | jq '.sources[0:3]'
    else
        echo "⚠️  No sources found in search results"
        echo ""
        echo "This could mean:"
        echo "- Similarity threshold too high"
        echo "- Indexing delay"
        echo "- Vector search not finding matches"
    fi
    
    echo ""
    echo "AI Response:"
    echo "$CHAT_RESPONSE" | jq -r '.answer' | head -20
else
    echo "❌ Upload failed"
    echo "$UPLOAD_RESPONSE"
fi

echo ""
echo "=========================================="
