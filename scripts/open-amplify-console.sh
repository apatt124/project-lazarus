#!/bin/bash

# Open AWS Amplify Console for deployment

echo "🚀 Opening AWS Amplify Console..."
echo ""
echo "✅ Preparation complete:"
echo "   - amplify.yml created"
echo "   - IAM role created: AmplifyProjectLazarusRole"
echo "   - All permissions configured"
echo "   - Files pushed to GitHub"
echo ""
echo "📋 Follow the steps in AMPLIFY-SETUP-STEPS.md"
echo ""
echo "Opening browser in 3 seconds..."
sleep 3

# Open the Amplify create app page
open "https://console.aws.amazon.com/amplify/home?region=us-east-1#/create"

echo ""
echo "✨ Quick checklist:"
echo "   1. Click 'Host web app'"
echo "   2. Select 'GitHub' → Authorize"
echo "   3. Choose: apatt124/project-lazarus (main branch)"
echo "   4. Advanced settings → Service role: AmplifyProjectLazarusRole"
echo "   5. Add environment variables:"
echo "      - LAZARUS_AWS_REGION=us-east-1"
echo "      - LAZARUS_LAMBDA_FUNCTION=lazarus-vector-search"
echo "      - LAZARUS_S3_BUCKET=project-lazarus-medical-docs-677625843326"
echo "   6. Click 'Save and deploy'"
echo ""
echo "⏱️  Build takes ~5-10 minutes"
echo "📖 Full instructions: AMPLIFY-SETUP-STEPS.md"
echo ""
