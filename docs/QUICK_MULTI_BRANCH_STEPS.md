# Quick Multi-Branch Setup Steps

## What You're Setting Up
- **Main branch** → `doctorlazarus.com` (production)
- **Develop branch** → `develop.doctorlazarus.com` (staging)

## Step 1: Connect Develop Branch (2 minutes)

1. In Amplify Console, click on your **project-lazarus** app
2. Look for **"Connect branch"** button (usually top right or in branch dropdown)
3. Select branch: **develop**
4. Keep all settings same as main:
   - Service role: **AmplifyProjectLazarusRole**
   - Environment variables: (automatically inherited)
5. Click **"Save and deploy"**
6. Wait ~5 minutes for build

## Step 2: Add Custom Domain (5 minutes)

1. In your Amplify app, click **"Domain management"** (left sidebar)
2. Click **"Add domain"**
3. Enter: **doctorlazarus.com**
4. Amplify will show DNS records to add

### DNS Records to Add (at your domain registrar)

Amplify will provide specific values, but it will look like:

**Root domain:**
```
Type: A or CNAME
Name: @ (or blank)
Value: [Amplify provides this]
```

**Develop subdomain:**
```
Type: CNAME
Name: develop
Value: [Amplify provides this]
```

**WWW (optional):**
```
Type: CNAME
Name: www
Value: [Amplify provides this]
```

## Step 3: Branch Mapping (Automatic)

Amplify automatically maps:
- `doctorlazarus.com` → main branch
- `develop.doctorlazarus.com` → develop branch
- `www.doctorlazarus.com` → main branch

You can customize this in Domain management if needed.

## Step 4: Wait for DNS Propagation

- DNS changes take 5-60 minutes to propagate
- SSL certificates are automatically provisioned
- You'll see status in Amplify Console

## Testing

Once DNS propagates:

```bash
# Test production
curl https://doctorlazarus.com

# Test development
curl https://develop.doctorlazarus.com
```

## Workflow Going Forward

```bash
# Work on develop
git checkout develop
git add .
git commit -m "New feature"
git push origin develop
# Auto-deploys to develop.doctorlazarus.com

# When ready for production
git checkout main
git merge develop
git push origin main
# Auto-deploys to doctorlazarus.com
```

## Current Status

✅ Develop branch exists and pushed to GitHub
✅ Main branch already deployed
⏳ Need to connect develop branch in Amplify Console
⏳ Need to add custom domain

---

**Browser should be opening to Amplify Console now!**
