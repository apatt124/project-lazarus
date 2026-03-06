#!/bin/bash

# Project Lazarus - Quick Amplify Deployment Script
# This script helps you deploy to AWS Amplify via CLI

set -e

echo "🚀 Project Lazarus - AWS Amplify Deployment"
echo "==========================================="
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if Amplify CLI is installed
if ! command -v amplify &> /dev/null; then
    echo "📦 Amplify CLI not found. Installing..."
    npm install -g @aws-amplify/cli
fi

echo "✅ Prerequisites checked"
echo ""

# Get AWS account info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-east-1"

echo "📋 Deployment Configuration:"
echo "   AWS Account: $AWS_ACCOUNT_ID"
echo "   Region: $AWS_REGION"
echo "   Repository: https://github.com/apatt124/project-lazarus"
echo ""

# Create Amplify app
echo "🔨 Creating Amplify app..."
echo ""
echo "⚠️  IMPORTANT: This script will guide you through AWS Console setup"
echo "    because Amplify CLI doesn't support GitHub OAuth via CLI."
echo ""
echo "Please follow these steps:"
echo ""
echo "1. Open AWS Amplify Console:"
echo "   https://console.aws.amazon.com/amplify/home?region=us-east-1"
echo ""
echo "2. Click 'New app' → 'Host web app'"
echo ""
echo "3. Choose 'GitHub' as source"
echo ""
echo "4. Authorize AWS Amplify to access your GitHub account"
echo ""
echo "5. Select repository: apatt124/project-lazarus"
echo ""
echo "6. Select branch: main"
echo ""
echo "7. Amplify will auto-detect Next.js and use amplify.yml"
echo ""
echo "8. Click 'Next' → 'Save and deploy'"
echo ""
echo "9. Add environment variables in Amplify Console:"
echo "   - Go to App settings → Environment variables"
echo "   - Add these:"
echo ""
echo "   AWS_REGION=us-east-1"
echo "   AWS_LAMBDA_FUNCTION_NAME=lazarus-vector-search"
echo "   AWS_S3_BUCKET=project-lazarus-medical-docs-$AWS_ACCOUNT_ID"
echo ""
echo "10. For AWS credentials, choose one:"
echo ""
echo "    Option A (Recommended): Use IAM Service Role"
echo "    - Go to App settings → General → Service role"
echo "    - Create new role with these permissions:"
echo "      * AWSLambdaExecute"
echo "      * AmazonS3ReadOnlyAccess"
echo "      * Custom policy (see DEPLOYMENT-GUIDE.md)"
echo ""
echo "    Option B (Simpler): Use Access Keys"
echo "    - Add environment variables:"
echo "      AWS_ACCESS_KEY_ID=your_key"
echo "      AWS_SECRET_ACCESS_KEY=your_secret"
echo ""
echo "11. Wait 5-10 minutes for deployment to complete"
echo ""
echo "12. You'll get a URL like: https://main.d1234abcd.amplifyapp.com"
echo ""
echo "📖 For detailed instructions, see: DEPLOYMENT-GUIDE.md"
echo ""

read -p "Press Enter when you've completed the setup in AWS Console..."

echo ""
echo "🎉 Deployment initiated!"
echo ""
echo "Next steps:"
echo "1. Wait for build to complete in Amplify Console"
echo "2. Test your live URL"
echo "3. (Optional) Add custom domain"
echo ""
echo "To check deployment status:"
echo "  aws amplify list-apps --region us-east-1"
echo ""
echo "To view logs:"
echo "  Check Amplify Console → Your App → Build logs"
echo ""
