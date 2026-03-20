#!/bin/bash

# Test API Endpoints
# Run this after starting the dev server to verify all endpoints are accessible

echo "🧪 Testing API Endpoints"
echo "========================"
echo ""

BASE_URL="http://localhost:3000"

# Test relationships/graph endpoint
echo "1. Testing /api/relationships/graph..."
curl -s "${BASE_URL}/api/relationships/graph?minStrength=0" | head -c 100
echo ""
echo ""

# Test relationships/timeline endpoint
echo "2. Testing /api/relationships/timeline..."
curl -s "${BASE_URL}/api/relationships/timeline" | head -c 100
echo ""
echo ""

# Test memory-commands endpoint
echo "3. Testing /api/memory-commands..."
curl -s -X POST "${BASE_URL}/api/memory-commands" \
  -H "Content-Type: application/json" \
  -d '{"query":"show me all medications"}' | head -c 100
echo ""
echo ""

echo "✅ Test complete!"
echo ""
echo "If you see JSON responses above, the endpoints are working."
echo "If you see errors, check:"
echo "  1. Dev server is running (npm run dev)"
echo "  2. Environment variables are set"
echo "  3. Lambda function is deployed"
