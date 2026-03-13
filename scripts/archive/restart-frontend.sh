#!/bin/bash

echo "🔄 Restarting frontend with fresh cache..."

# Kill any existing Next.js processes
pkill -f "next dev" || true

# Clear Next.js cache
cd frontend
rm -rf .next
rm -rf node_modules/.cache

echo "✅ Cache cleared"
echo "🚀 Starting dev server..."

# Start fresh
npm run dev
