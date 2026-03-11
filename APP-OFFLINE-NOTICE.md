# 🔴 App Currently Offline

**Status**: OFFLINE  
**Date**: March 10, 2026 at 4:22 PM  
**Reason**: Security credential rotation in progress

## What Happened

Your Project Lazarus app has been temporarily taken offline for security updates:

1. ✅ All credentials rotated
2. ✅ Code cleaned of exposed credentials  
3. ✅ Amplify auto-build disabled
4. 🔴 App is offline

## How to Bring It Back Online

Simply commit and push your security fixes:

```bash
git add .
git commit -m "Security: Remove exposed credentials and rotate passwords"
git push origin develop
```

The GitHub Actions workflow will:
1. Run security checks
2. Re-enable Amplify auto-build
3. Deploy automatically
4. Bring your app back online

**Expected time**: 10-15 minutes after push

## Manual Override

If you want to bring it back online immediately without waiting for GitHub Actions:

```bash
# Re-enable auto-build
aws amplify update-branch \
  --app-id dp2mw5m8eaj5o \
  --branch-name develop \
  --enable-auto-build \
  --region us-east-1

# Trigger deployment
aws amplify start-job \
  --app-id dp2mw5m8eaj5o \
  --branch-name develop \
  --job-type RELEASE \
  --region us-east-1
```

## Current Configuration

- **App ID**: dp2mw5m8eaj5o
- **Branch**: develop
- **Auto-Build**: DISABLED
- **Domain**: dp2mw5m8eaj5o.amplifyapp.com

## New Credentials

Your new credentials are in:
- `NEW-CREDENTIALS.txt` (local only, gitignored)
- `.env` file (local only, gitignored)

**Remember to save them in your password manager!**

---

**Next Step**: Commit and push to GitHub to bring app back online
