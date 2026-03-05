#!/bin/bash

# Quick test script to verify the upload API is accessible

echo "Testing Lazarus Upload API..."
echo ""

# Test 1: Check if server is running
echo "1. Checking if server is running on port 3737..."
if curl -s http://localhost:3737 > /dev/null; then
    echo "   ✓ Server is running"
else
    echo "   ✗ Server is not responding"
    exit 1
fi

echo ""
echo "2. Server is ready for testing!"
echo ""
echo "Open http://localhost:3737 in your browser to test file uploads."
echo ""
echo "Test files to try:"
echo "  - Regular PDF (machine-readable text)"
echo "  - Scanned PDF (image-based)"
echo "  - Screenshot of medical document"
echo "  - Photo of prescription"
echo "  - Plain text file"
echo ""
echo "Watch the logs:"
echo "  - Frontend: Check the terminal running 'npm run dev'"
echo "  - Lambda: aws logs tail /aws/lambda/lazarus-vector-search --follow"
echo ""
