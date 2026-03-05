#!/bin/bash
# Project Lazarus - Quick Setup Script
# Run this after configuring environment variables

set -e

echo "🏥 Project Lazarus Setup"
echo "========================"

# Check prerequisites
echo "Checking prerequisites..."
command -v aws >/dev/null 2>&1 || { echo "AWS CLI required but not installed. Aborting." >&2; exit 1; }

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
else
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "Please edit .env with your configuration and run again."
    exit 1
fi

# Verify AWS credentials
echo "Verifying AWS credentials..."
aws sts get-caller-identity > /dev/null || { echo "AWS credentials not configured. Run 'aws configure'." >&2; exit 1; }

export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✓ AWS Account: $AWS_ACCOUNT_ID"

# Execute setup steps
echo ""
echo "Starting infrastructure setup..."
echo "This will create AWS resources. Continue? (y/n)"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

# Run the full setup
cd infrastructure
bash setup-guide.md

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Upload test documents to S3"
echo "2. Test the Bedrock Agent in AWS Console"
echo "3. Deploy the frontend application"
