#!/bin/bash

echo "🔄 Rebuilding Project Lazarus frontend..."
echo ""

# Kill any running Next.js processes
echo "Stopping any running dev servers..."
lsof -ti:3737 | xargs kill -9 2>/dev/null || true

# Clean build artifacts
echo "Cleaning build artifacts..."
rm -rf .next
rm -rf node_modules/.cache

# Rebuild
echo "Starting fresh dev server..."
npm run dev
