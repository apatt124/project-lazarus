#!/bin/bash

# Project Lazarus - Start Script
# This script starts the Next.js development server

echo "🏥 Starting Project Lazarus..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "⚠️  Warning: AWS credentials not configured"
    echo "Run 'aws configure' to set up your credentials"
    echo ""
fi

# Start the development server
echo "🚀 Starting development server..."
echo "Opening http://localhost:3737 in your browser..."
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
