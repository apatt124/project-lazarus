# Deployment Instructions - Security Update

## Current Status

🔴 **App is OFFLINE**
- Amplify auto-build: DISABLED
- Reason: Security credential rotation
- Date: March 10, 2026

## What Needs to Happen

You need to commit and push the security fixes to GitHub. The app will automatically come back online after a successful deployment.

## Step-by-Step Deployment

### 1. Review Changes

Check what will be committed:
```bash
git status
git diff --stat
```

You should see:
- 48 modified files (security fixes)
- 10 new files (security documentation)
- Updated .gitignore

### 2. Commit Security Fixes

```bash
git add .
git commit -m "Security: Remove exposed credentials and rotate passwords

- Removed all hardcoded credentials from code
- Updated 48 files to use environment variables
- Rotated database and application passwords
- Added comprehensive security documentation
- Created security steering file for future protection
- Updated .gitignore to prevent credential exposure

All sensitive data now uses environment variables.
See SECURITY-AUDIT-SUMMARY.md for details."
```

### 3. Push to GitHub

```bash
git push origin develop
```

### 4. Automatic Deployment

Once pushed, GitHub Actions will:

1. ✅ **Run security checks**
   - Verify no credentials in code
   - Check .gitignore is configured
   - Validate environment variable usage

2. ✅ **Re-enable Amplify**
   - Turn auto-build back on
   - Trigger deployment

3. ✅ **Deploy application**
   - Build with new security fixes
   - Deploy to production

4. ✅ **Verify deployment**
   - Check app is accessible
   - Confirm deployment success

### 5. Monitor Deployment

Watch the deployment progress:

**GitHub Actions**:
- Go to: https://github.com/YOUR_USERNAME/project-lazarus/actions
- Watch the "Deploy After Security Fixes" workflow

**Amplify Console**:
```bash
# Watch deployment status
aws amplify list-jobs \
  --app-id dp2mw5m8eaj5o \
  --branch-name develop \
  --max-results 1 \
  --region us-east-1
```

Or visit: https://console.aws.amazon.com/amplify/home?region=us-east-1#/dp2mw5m8eaj5o

### 6. Test After Deployment

Once deployment completes:

```bash
# Test login with new password
curl -X POST https://dp2mw5m8eaj5o.amplifyapp.com/api/login \
  -H 'Content-Type: application/json' \
  -d '{"password":"JSVAevhzvXsqpkajDGMI"}'

# Or test in browser
open https://dp2mw5m8eaj5o.amplifyapp.com
```

## If Deployment Fails

If the GitHub Actions workflow fails:

1. **Check the logs** in GitHub Actions
2. **Fix any issues** identified
3. **Commit and push again**

If you need to manually re-enable:

```bash
# Re-enable auto-build
aws amplify update-branch \
  --app-id dp2mw5m8eaj5o \
  --branch-name develop \
  --enable-auto-build \
  --region us-east-1

# Start deployment
aws amplify start-job \
  --app-id dp2mw5m8eaj5o \
  --branch-name develop \
  --job-type RELEASE \
  --region us-east-1
```

## Security Verification

Before the app goes live, the workflow verifies:

- No credentials in tracked files
- .env files properly gitignored
- Environment variables used correctly
- No hardcoded endpoints in code

## Files Modified (Ready to Commit)

### Code Files (13)
- Database connection files
- Lambda functions
- API routes
- Shell scripts

### Test Scripts (5)
- All load from environment variables

### Deployment Scripts (13)
- All require environment variables

### Documentation (12)
- All use placeholders

### Configuration (3)
- .env.example updated
- .gitignore updated
- Security steering file added

### New Security Files (10)
- Security guides
- Rotation scripts
- GitHub Actions workflow
- Status documents

## Expected Timeline

1. **Commit & Push**: 2 minutes
2. **GitHub Actions**: 3-5 minutes
3. **Amplify Build**: 5-10 minutes
4. **Total**: 10-17 minutes

## App URLs

After deployment:
- **Production**: https://dp2mw5m8eaj5o.amplifyapp.com
- **API Gateway**: https://spgwp4ei7f.execute-api.us-east-1.amazonaws.com/prod

## Support

If you need help:
1. Check GitHub Actions logs
2. Check Amplify build logs
3. Review `SECURITY-AUDIT-SUMMARY.md`
4. Test locally first: `npm run dev`

---

**Status**: Ready to deploy  
**Action**: Commit and push to GitHub  
**Expected Result**: App automatically comes back online
