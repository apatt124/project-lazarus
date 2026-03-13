# Amplify Environment Variables Fix

## Issue

The develop branch deployment was failing because `VITE_API_URL` was undefined, causing API calls to fail with 404 errors.

## Root Cause

Environment variables were set at the app level but not at the branch level. Amplify requires environment variables to be set specifically for each branch.

## Solution Applied

Set environment variables at the branch level for both `develop` and `main` branches:

```bash
# Variables set for each branch:
- VITE_API_URL (API Gateway endpoint)
- APP_PASSWORD (Application password)
```

## Current Build Status

A build is currently running (Job ID: 21) that was started before the branch-level environment variables were set. This build will NOT have the correct environment variables.

## Next Steps

Once the current build completes, trigger a new build to pick up the environment variables:

```bash
./scripts/rebuild-amplify-branch.sh develop
```

Or manually via AWS Console:
1. Go to Amplify Console
2. Select the develop branch
3. Click "Redeploy this version"

## Verification

After the new build completes, verify:
1. Visit your develop deployment URL
2. Open browser console
3. Check that API calls go to the correct endpoint (not `undefined`)
4. Conversations should load successfully

## Helper Script

Created `scripts/rebuild-amplify-branch.sh` to easily trigger rebuilds:

```bash
# Rebuild develop branch
./scripts/rebuild-amplify-branch.sh develop

# Rebuild main branch
./scripts/rebuild-amplify-branch.sh main
```

## Environment Variable Configuration

To update environment variables in the future:

```bash
# Update develop branch
aws amplify update-branch \
  --app-id $AMPLIFY_APP_ID \
  --branch-name develop \
  --region $AWS_REGION \
  --environment-variables "VITE_API_URL=<url>,APP_PASSWORD=<password>"

# Update main branch
aws amplify update-branch \
  --app-id $AMPLIFY_APP_ID \
  --branch-name main \
  --region $AWS_REGION \
  --environment-variables "VITE_API_URL=<url>,APP_PASSWORD=<password>"
```

## Important Notes

- Environment variables must be set at the BRANCH level, not just app level
- Changes to environment variables require a rebuild to take effect
- Vite requires environment variables at build time (not runtime)
- All Vite environment variables must be prefixed with `VITE_`

## Related Files

- `scripts/rebuild-amplify-branch.sh` - Helper script to trigger rebuilds
- `.env.example` - Updated with AMPLIFY_APP_ID
- `amplify.yml` - Build configuration (no changes needed)

---

**Date**: March 13, 2026
**Issue**: Environment variables not set at branch level
**Status**: Fixed, awaiting rebuild
