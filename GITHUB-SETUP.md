# GitHub Repository Setup

## Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. Fill in the details:
   - **Repository name**: `project-lazarus`
   - **Description**: `AI-powered personal medical record management system`
   - **Visibility**: ✅ Public
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)

3. Click "Create repository"

## Step 2: Push to GitHub

After creating the repository, run these commands:

```bash
# Add the remote
git remote add origin https://github.com/YOUR_USERNAME/project-lazarus.git

# Push to GitHub
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 3: Get the URL

Once pushed, your repository URL will be:
```
https://github.com/YOUR_USERNAME/project-lazarus
```

## Step 4: Use in AWS Bedrock Form

Now you can use this URL in the Anthropic use case form:

**Company website URL:**
```
https://github.com/YOUR_USERNAME/project-lazarus
```

This shows AWS/Anthropic that:
- ✅ It's a real, documented project
- ✅ Open source and transparent
- ✅ Legitimate use case (medical record management)
- ✅ Well-architected and professional

## Alternative: Use GitHub Profile

If you prefer, you can also use your GitHub profile URL:
```
https://github.com/YOUR_USERNAME
```

Both are acceptable for the form!

## After Approval

Once you get Claude access approved, you can:
1. Add a badge to the README showing it uses Claude AI
2. Update documentation with setup instructions
3. Share the project if you want
4. Keep it private by changing visibility later (Settings → Danger Zone → Change visibility)

## Quick Commands

```bash
# Check current remote
git remote -v

# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/project-lazarus.git

# Push
git push -u origin main

# Verify
git status
```

## Troubleshooting

### "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/project-lazarus.git
```

### Authentication issues
Use GitHub CLI or personal access token:
```bash
# Install GitHub CLI (if not installed)
brew install gh

# Authenticate
gh auth login

# Then push
git push -u origin main
```

## Next Steps

1. Create repo on GitHub
2. Push code
3. Copy the URL
4. Fill out Bedrock form with the URL
5. Wait for approval (usually < 15 minutes)
6. Test with `./scripts/test-bedrock.sh`
7. Enjoy conversational AI! 🎉
