# AWS Amplify Setup - Quick Steps

## ✅ Preparation Complete

I've already done:
- ✅ Created `amplify.yml` build configuration
- ✅ Pushed deployment files to GitHub
- ✅ Created IAM service role: `AmplifyProjectLazarusRole`
- ✅ Attached all necessary permissions (Bedrock, Lambda, S3, Secrets Manager, Textract)

## 🚀 Next: Create Amplify App (5 minutes)

### Step 1: Open AWS Amplify Console

Click this link (or copy to browser):
```
https://console.aws.amazon.com/amplify/home?region=us-east-1#/create
```

### Step 2: Connect Repository

1. Click **"Host web app"**
2. Select **"GitHub"** as the source
3. Click **"Continue"**
4. Authorize AWS Amplify to access your GitHub (one-time setup)
5. Select repository: **apatt124/project-lazarus**
6. Select branch: **main**
7. Click **"Next"**

### Step 3: Configure Build Settings

Amplify will auto-detect Next.js and show:
- App name: `project-lazarus` (you can change this)
- Build settings: Will use `amplify.yml` from your repo ✅

**Important: Configure Service Role**
1. Expand **"Advanced settings"**
2. Under **"Service role"**, select: **AmplifyProjectLazarusRole**
3. Click **"Next"**

### Step 4: Add Environment Variables

Before clicking "Save and deploy", add these environment variables:

1. Scroll down to **"Environment variables"** section
2. Click **"Add environment variable"**
3. Add these one by one:

```
Key: LAZARUS_AWS_REGION
Value: us-east-1

Key: LAZARUS_LAMBDA_FUNCTION
Value: lazarus-vector-search

Key: LAZARUS_S3_BUCKET
Value: project-lazarus-medical-docs-677625843326
```

**Note**: You don't need to add AWS credentials because we're using the IAM service role!

### Step 5: Deploy

1. Click **"Save and deploy"**
2. Wait 5-10 minutes for the build to complete
3. You'll see progress through these stages:
   - Provision
   - Build (npm install, npm run build)
   - Deploy
   - Verify

### Step 6: Get Your URL

Once deployment completes, you'll see:
- ✅ Green checkmark
- Your live URL: `https://main.xxxxxxxxxx.amplifyapp.com`

Click the URL to access your app!

## 🧪 Test Your Deployment

Once live, test these endpoints:

```bash
# Replace with your actual Amplify URL
AMPLIFY_URL="https://main.xxxxxxxxxx.amplifyapp.com"

# Test the homepage
curl $AMPLIFY_URL

# Test document upload
curl -X POST $AMPLIFY_URL/api/upload \
  -F "file=@test-document.pdf" \
  -F "documentType=Lab Results"

# Test search
curl -X POST $AMPLIFY_URL/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "cardiology"}'

# Test chat
curl -X POST $AMPLIFY_URL/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What chronic conditions do I have?"}'
```

## 🎨 Optional: Custom Domain

If you have a domain:
1. Go to **App settings** → **Domain management**
2. Click **"Add domain"**
3. Enter your domain (e.g., `lazarus.yourdomain.com`)
4. Follow DNS configuration steps
5. SSL certificate is automatic and free!

## 🔧 Troubleshooting

### Build Fails
- Check build logs in Amplify Console
- Verify `amplify.yml` is in repo root
- Ensure all dependencies are in `package.json`

### Environment Variables Not Working
- Go to **App settings** → **Environment variables**
- Verify all 3 variables are set
- Redeploy: **App settings** → **Redeploy this version**

### API Calls Failing
- Check service role is attached: **App settings** → **General** → **Service role**
- Verify role has all permissions: IAM Console → Roles → AmplifyProjectLazarusRole
- Check CloudWatch logs for Lambda errors

### Need to Redeploy
```bash
# Push any changes to GitHub
git add .
git commit -m "Update"
git push origin main

# Amplify will auto-deploy on push!
```

## 📊 Monitoring

After deployment:
- **Build logs**: Amplify Console → Your app → Build history
- **Access logs**: Amplify Console → Monitoring → Access logs
- **Lambda logs**: CloudWatch → Log groups → /aws/lambda/lazarus-vector-search
- **Costs**: AWS Cost Explorer → Filter by tag: Project=Lazarus

## 💰 Expected Costs

With Amplify:
- **Amplify hosting**: $0-5/month (free tier: 1000 build minutes, 15GB storage, 5GB served)
- **Existing infrastructure**: $15-20/month (RDS, Lambda, S3)
- **Total**: $15-25/month

## 🎉 You're Done!

Once you see the green checkmark and can access your URL, Project Lazarus is live!

Your medical records are now accessible from anywhere with:
- 🔍 Semantic search
- 💬 AI chat interface
- 📄 Document upload
- 🎨 Beautiful Gemini-inspired UI

---

**Need help?** Check the build logs in Amplify Console or run:
```bash
aws amplify list-apps --region us-east-1
```
