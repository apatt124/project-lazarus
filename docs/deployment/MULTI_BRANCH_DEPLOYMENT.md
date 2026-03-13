# Multi-Branch Deployment Setup

## Overview

Project Lazarus uses AWS Amplify with multi-branch deployment for development and production environments.

## Branch Configuration

### Production Branch: `main`
- **Stage**: PRODUCTION
- **Auto-build**: Enabled
- **URLs**: 
  - https://doctorlazarus.com
  - https://www.doctorlazarus.com
- **Trigger**: Push to `main` branch

### Development Branch: `develop`
- **Stage**: DEVELOPMENT
- **Auto-build**: Enabled
- **URL**: https://develop.doctorlazarus.com
- **Trigger**: Push to `develop` branch

## Deployment Workflow

### Developing New Features

1. **Work on develop branch**:
   ```bash
   git checkout develop
   # Make your changes
   git add .
   git commit -m "Add new feature"
   ```

2. **Push to trigger deployment**:
   ```bash
   git push origin develop
   ```

3. **Amplify automatically**:
   - Detects the push
   - Runs build process
   - Deploys to https://develop.doctorlazarus.com
   - Takes ~3-5 minutes

4. **Test on develop subdomain**:
   - Visit https://develop.doctorlazarus.com
   - Verify your changes work
   - Test thoroughly

### Promoting to Production

1. **Merge develop to main**:
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

2. **Amplify automatically**:
   - Detects the push to main
   - Runs production build
   - Deploys to https://doctorlazarus.com
   - Takes ~3-5 minutes

## Monitoring Deployments

### Via AWS Console

```bash
# Open Amplify console
aws amplify console --app-id dp2mw5m8eaj5o --region us-east-1
```

Or visit: https://console.aws.amazon.com/amplify/home?region=us-east-1#/dp2mw5m8eaj5o

### Via CLI

```bash
# List recent builds for develop
aws amplify list-jobs \
  --app-id dp2mw5m8eaj5o \
  --branch-name develop \
  --max-results 5 \
  --region us-east-1

# List recent builds for main
aws amplify list-jobs \
  --app-id dp2mw5m8eaj5o \
  --branch-name main \
  --max-results 5 \
  --region us-east-1
```

### Check Build Status

```bash
# Get latest build status for develop
aws amplify list-jobs \
  --app-id dp2mw5m8eaj5o \
  --branch-name develop \
  --max-results 1 \
  --region us-east-1 \
  --query 'jobSummaries[0].[status,commitMessage,commitTime]' \
  --output table
```

## Environment Variables

Both branches use the same environment variables configured in Amplify:

- `VITE_API_URL` - API Gateway endpoint
- `VITE_APP_PASSWORD` - Application password

To update environment variables:

```bash
# Update for all branches
aws amplify update-app \
  --app-id dp2mw5m8eaj5o \
  --region us-east-1 \
  --environment-variables \
    VITE_API_URL=https://your-api-url.execute-api.us-east-1.amazonaws.com/prod \
    VITE_APP_PASSWORD=your-password
```

## Build Configuration

Amplify uses the build settings from `amplify.yml` in the repository root:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

## Troubleshooting

### Build Fails

1. **Check build logs**:
   ```bash
   aws amplify get-job \
     --app-id dp2mw5m8eaj5o \
     --branch-name develop \
     --job-id <job-id> \
     --region us-east-1
   ```

2. **Common issues**:
   - Missing environment variables
   - Build script errors
   - Dependency issues
   - TypeScript errors

### Deployment Not Triggering

1. **Verify auto-build is enabled**:
   ```bash
   aws amplify get-branch \
     --app-id dp2mw5m8eaj5o \
     --branch-name develop \
     --region us-east-1 \
     --query 'branch.enableAutoBuild'
   ```

2. **Check webhook**:
   - Amplify uses GitHub webhooks
   - Verify webhook is active in GitHub repo settings
   - Check webhook delivery history

### Wrong Environment Deployed

- **develop branch** → https://develop.doctorlazarus.com
- **main branch** → https://doctorlazarus.com

Make sure you're pushing to the correct branch:
```bash
git branch  # Check current branch
git push origin develop  # Deploy to develop
git push origin main     # Deploy to production
```

## Manual Deployment Trigger

If auto-build doesn't trigger, manually start a build:

```bash
# Trigger develop build
aws amplify start-job \
  --app-id dp2mw5m8eaj5o \
  --branch-name develop \
  --job-type RELEASE \
  --region us-east-1

# Trigger main build
aws amplify start-job \
  --app-id dp2mw5m8eaj5o \
  --branch-name main \
  --job-type RELEASE \
  --region us-east-1
```

## Branch Management

### Create New Branch

```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# Work on feature
git add .
git commit -m "Add feature"

# Push to GitHub (won't auto-deploy unless configured)
git push origin feature/new-feature

# Merge to develop when ready
git checkout develop
git merge feature/new-feature
git push origin develop  # This triggers deployment
```

### Delete Branch

```bash
# Delete local branch
git branch -d feature/old-feature

# Delete remote branch
git push origin --delete feature/old-feature

# Delete from Amplify (if configured)
aws amplify delete-branch \
  --app-id dp2mw5m8eaj5o \
  --branch-name feature/old-feature \
  --region us-east-1
```

## Best Practices

1. **Always test on develop first**
   - Push to develop
   - Test on https://develop.doctorlazarus.com
   - Only merge to main when verified

2. **Use descriptive commit messages**
   - Amplify shows commit messages in build history
   - Makes it easier to track what was deployed

3. **Monitor build times**
   - Typical build: 3-5 minutes
   - If longer, check for issues

4. **Keep branches in sync**
   ```bash
   # Regularly update develop from main
   git checkout develop
   git merge main
   git push origin develop
   ```

5. **Use pull requests**
   - Create PR from develop to main
   - Review changes before merging
   - Ensures quality control

## Quick Reference

```bash
# Check current branch
git branch

# Switch to develop
git checkout develop

# Push and deploy to develop
git push origin develop

# Switch to main
git checkout main

# Push and deploy to production
git push origin main

# View Amplify console
open https://console.aws.amazon.com/amplify/home?region=us-east-1#/dp2mw5m8eaj5o
```

## URLs Summary

- **Production**: https://doctorlazarus.com
- **Production (www)**: https://www.doctorlazarus.com
- **Development**: https://develop.doctorlazarus.com
- **Amplify Console**: https://console.aws.amazon.com/amplify/home?region=us-east-1#/dp2mw5m8eaj5o

---

**Last Updated**: March 13, 2026  
**App ID**: dp2mw5m8eaj5o  
**Region**: us-east-1  
**Status**: ✅ Fully configured
