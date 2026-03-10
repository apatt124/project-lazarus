# Fixed: Amplify Environment Variables

## Issue
AWS Amplify doesn't allow environment variables starting with `AWS_` prefix (reserved by AWS).

## Solution
Changed all environment variable names to use `LAZARUS_` prefix:

| Old Name | New Name |
|----------|----------|
| `AWS_REGION` | `LAZARUS_AWS_REGION` |
| `AWS_LAMBDA_FUNCTION_NAME` | `LAZARUS_LAMBDA_FUNCTION` |
| `AWS_S3_BUCKET` | `LAZARUS_S3_BUCKET` |

## Files Updated
- ✅ `frontend/app/api/upload/route.ts`
- ✅ `frontend/app/api/chat/route.ts`
- ✅ `frontend/app/api/analyze/route.ts`
- ✅ `frontend/.env.example`
- ✅ `DEPLOYMENT-GUIDE.md`
- ✅ `QUICK_START.md`
- ✅ `frontend/SETUP.md`
- ✅ `infrastructure/AMPLIFY_SETUP_STEPS.md`
- ✅ `scripts/open-amplify-console.sh`

## Environment Variables for Amplify

Add these in Amplify Console → Environment variables:

```
LAZARUS_AWS_REGION=us-east-1
LAZARUS_LAMBDA_FUNCTION=lazarus-vector-search
LAZARUS_S3_BUCKET=your-s3-bucket-name
```

## Changes Committed
All changes have been committed and pushed to GitHub. Amplify will use the latest code on next deployment.

## Next Steps
1. Go back to Amplify Console
2. Add the 3 environment variables with new names (above)
3. Click "Save and deploy"
4. Wait 5-10 minutes for build to complete
5. Get your live URL!

---

**Status**: Ready for deployment ✅
