# Amplify Multi-Branch Deployment Setup

## Goal
- **Main branch** → `doctorlazarus.com` (production)
- **Develop branch** → `develop.doctorlazarus.com` (staging/development)

Both deployments in the same Amplify app for easy management.

## Step 1: Add Develop Branch to Amplify

1. Go to AWS Amplify Console:
   ```
   https://console.aws.amazon.com/amplify/home?region=us-east-1
   ```

2. Click on your **project-lazarus** app

3. In the left sidebar, click **"App settings"** → **"Branch management"** (or look for "Connect branch" button)

4. Click **"Connect branch"**

5. Select branch: **develop**

6. Configure build settings:
   - Use the same build settings as main (amplify.yml)
   - Service role: **AmplifyProjectLazarusRole**
   - Environment variables: Same as main branch (they're inherited)

7. Click **"Save and deploy"**

## Step 2: Configure Custom Domain

### Add Your Domain to Amplify

1. In your Amplify app, go to **"Domain management"** in the left sidebar

2. Click **"Add domain"**

3. Enter your domain: **doctorlazarus.com**

4. Amplify will show you DNS records to add to your domain registrar

### DNS Configuration

Add these records to your domain registrar (e.g., GoDaddy, Namecheap, Route 53):

**For Root Domain (doctorlazarus.com):**
```
Type: A
Name: @ (or leave blank)
Value: [Amplify will provide the IP or CNAME]
```

**For Develop Subdomain (develop.doctorlazarus.com):**
```
Type: CNAME
Name: develop
Value: [Amplify will provide the CNAME target]
```

Amplify will automatically configure:
- `doctorlazarus.com` → main branch
- `develop.doctorlazarus.com` → develop branch
- `www.doctorlazarus.com` → main branch (optional)

### SSL Certificates

Amplify automatically provisions and manages SSL certificates for all domains and subdomains. No action needed!

## Step 3: Branch-Specific Environment Variables (Optional)

If you need different settings for develop vs main:

1. Go to **"App settings"** → **"Environment variables"**

2. Click on a variable to edit

3. You'll see options to set different values per branch:
   - **All branches**: Same value everywhere
   - **Branch-specific**: Different values for main vs develop

Example use cases:
- Different S3 buckets for dev/prod
- Different Lambda functions
- Feature flags

## Step 4: Configure Branch Auto-Deploy

By default, Amplify auto-deploys on every push. You can configure this:

1. Go to **"App settings"** → **"Branch management"**

2. For each branch, you can:
   - Enable/disable auto-deploy
   - Set up pull request previews
   - Configure build settings

## Architecture After Setup

```
┌─────────────────────────────────────────┐
│     AWS Amplify App: project-lazarus    │
├─────────────────────────────────────────┤
│                                         │
│  Main Branch                            │
│  ├─ doctorlazarus.com                   │
│  ├─ www.doctorlazarus.com               │
│  └─ main.xxxxxx.amplifyapp.com          │
│                                         │
│  Develop Branch                         │
│  ├─ develop.doctorlazarus.com           │
│  └─ develop.xxxxxx.amplifyapp.com       │
│                                         │
└─────────────────────────────────────────┘
```

## Workflow

### Development Workflow
```bash
# Work on develop branch
git checkout develop
# Make changes
git add .
git commit -m "New feature"
git push origin develop
# Amplify auto-deploys to develop.doctorlazarus.com

# Test on develop subdomain
# When ready, merge to main
git checkout main
git merge develop
git push origin main
# Amplify auto-deploys to doctorlazarus.com
```

### Quick Commands

```bash
# Switch to develop
git checkout develop

# Switch to main
git checkout main

# Sync develop with main
git checkout develop
git merge main
git push origin develop

# Create feature branch from develop
git checkout develop
git checkout -b feature/new-feature
# Work on feature
git push origin feature/new-feature
# Merge back to develop when ready
```

## Testing Your Setup

Once configured, test both deployments:

```bash
# Test production (main branch)
curl https://doctorlazarus.com/api/health

# Test development (develop branch)
curl https://develop.doctorlazarus.com/api/health
```

## Monitoring

View logs and metrics for each branch:
1. Go to Amplify Console → Your app
2. Select branch from dropdown (main or develop)
3. View:
   - Build history
   - Access logs
   - Performance metrics

## Cost Impact

Adding a second branch deployment:
- **Build minutes**: 2x (one build per branch on push)
- **Storage**: Minimal (both use same backend resources)
- **Data transfer**: Based on actual usage per environment

Estimated additional cost: **$0-2/month** (within free tier for most use cases)

## Rollback Strategy

If production breaks:
1. Go to Amplify Console → main branch
2. Click on a previous successful deployment
3. Click **"Redeploy this version"**
4. Or: Revert the commit in git and push

## Advanced: Pull Request Previews

Enable automatic preview deployments for PRs:
1. Go to **"App settings"** → **"Previews"**
2. Enable previews for develop branch
3. Each PR gets a unique URL: `pr-123.xxxxxx.amplifyapp.com`

## Summary

After setup, you'll have:
- ✅ Production at `doctorlazarus.com` (main branch)
- ✅ Staging at `develop.doctorlazarus.com` (develop branch)
- ✅ Auto-deploy on git push
- ✅ Automatic SSL certificates
- ✅ Same backend resources (RDS, Lambda, S3)
- ✅ Easy rollback and monitoring

---

**Ready to set up?** Follow Step 1 to connect the develop branch!
