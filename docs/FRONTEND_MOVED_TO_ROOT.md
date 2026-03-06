# Frontend Moved to Repository Root

## What Changed

Moved the entire Next.js application from `frontend/` subdirectory to the repository root to enable proper AWS Amplify Hosting support.

## Why This Was Necessary

AWS Amplify Hosting (Gen 1) has limited support for Next.js SSR in monorepo structures. Moving to root enables:
- ✅ Proper Next.js framework detection
- ✅ Native SSR support
- ✅ Correct build artifact structure
- ✅ Multi-branch deployments with subdomains

## File Structure Changes

### Before:
```
project-lazarus/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── package.json
│   └── ...
├── lambda/
├── docs/
└── amplify.yml
```

### After:
```
project-lazarus/
├── app/              # Next.js app directory (moved from frontend/app)
├── components/       # React components (moved from frontend/components)
├── lib/              # Utilities (moved from frontend/lib)
├── public/           # Static assets (moved from frontend/public)
├── package.json      # Root package.json (moved from frontend/)
├── next.config.mjs   # Next.js config (moved from frontend/)
├── lambda/           # Lambda functions (unchanged)
├── docs/             # Documentation (unchanged)
├── old-frontend-docs/  # Original frontend docs preserved
└── amplify.yml       # Updated for root-level deployment
```

## Updated Configuration

### amplify.yml
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
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### .gitignore
Merged frontend and root .gitignore files, updated paths to reflect new structure.

## Deployment Configuration

### Branch Mappings (Unchanged)
- **main branch** → `doctorlazarus.com` (production)
- **develop branch** → `develop.doctorlazarus.com` (staging)

### Environment Variables (Unchanged)
- `LAZARUS_AWS_REGION=us-east-1`
- `LAZARUS_LAMBDA_FUNCTION=lazarus-vector-search`
- `LAZARUS_S3_BUCKET=project-lazarus-medical-docs-677625843326`

## Local Development

### Before:
```bash
cd frontend
npm install
npm run dev
```

### After:
```bash
npm install
npm run dev
```

The app still runs on port 3737 (configured in package.json).

## What Stayed the Same

- ✅ All AWS backend resources (RDS, Lambda, S3, Bedrock)
- ✅ Environment variables
- ✅ Domain configuration
- ✅ Application functionality
- ✅ API routes
- ✅ Database connections

## Testing After Deployment

Once deployed, test:

```bash
# Test develop branch
curl https://develop.doctorlazarus.com

# Test main branch
curl https://doctorlazarus.com

# Test API endpoints
curl https://develop.doctorlazarus.com/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

## Rollback Plan

If issues occur, the previous structure is preserved in git history:
```bash
git revert HEAD
git push origin develop
```

## Next Steps

1. Push this commit to develop branch
2. Wait for Amplify build (~5 minutes)
3. Test develop.doctorlazarus.com
4. If successful, merge to main
5. Test doctorlazarus.com

---

**Status**: Ready for deployment
**Commit**: Move Next.js app to repository root for Amplify compatibility
