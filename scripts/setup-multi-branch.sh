#!/bin/bash

# Setup multi-branch deployment for Amplify

set -e

echo "🌳 Project Lazarus - Multi-Branch Deployment Setup"
echo "=================================================="
echo ""

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"
echo ""

# Ensure develop branch exists and is up to date
echo "🔄 Ensuring develop branch is ready..."
if git show-ref --verify --quiet refs/heads/develop; then
    echo "✅ Develop branch exists locally"
else
    echo "📝 Creating develop branch from main..."
    git checkout -b develop
fi

# Push develop branch to remote
echo "📤 Pushing develop branch to GitHub..."
git checkout develop
git push -u origin develop

echo ""
echo "✅ Develop branch is ready on GitHub!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps - AWS Amplify Console:"
echo ""
echo "1. Open Amplify Console:"
echo "   https://console.aws.amazon.com/amplify/home?region=us-east-1"
echo ""
echo "2. Click on your 'project-lazarus' app"
echo ""
echo "3. Connect develop branch:"
echo "   • Click 'Connect branch' button"
echo "   • Select branch: develop"
echo "   • Service role: AmplifyProjectLazarusRole"
echo "   • Environment variables: (inherited from main)"
echo "   • Click 'Save and deploy'"
echo ""
echo "4. Add custom domain:"
echo "   • Go to 'Domain management'"
echo "   • Click 'Add domain'"
echo "   • Enter: doctorlazarus.com"
echo "   • Follow DNS configuration steps"
echo ""
echo "5. Amplify will automatically configure:"
echo "   • doctorlazarus.com → main branch"
echo "   • develop.doctorlazarus.com → develop branch"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 Full guide: AMPLIFY-MULTI-BRANCH-SETUP.md"
echo ""

# Switch back to original branch
if [ "$CURRENT_BRANCH" != "develop" ]; then
    echo "🔙 Switching back to $CURRENT_BRANCH..."
    git checkout "$CURRENT_BRANCH"
fi

echo ""
echo "✨ Setup complete! Follow the steps above in AWS Console."
echo ""
