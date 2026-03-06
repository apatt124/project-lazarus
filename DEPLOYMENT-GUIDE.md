# Project Lazarus - Deployment Guide

## Deploy to AWS Amplify (Recommended)

AWS Amplify provides a fully managed hosting solution for your Next.js app with automatic HTTPS, CI/CD, and environment variable management.

### Prerequisites
- AWS Account (same one with your RDS/Lambda setup)
- GitHub repository (already set up: https://github.com/apatt124/project-lazarus)
- AWS CLI configured with credentials

### Step 1: Create Amplify App

```bash
# Install Amplify CLI if needed
npm install -g @aws-amplify/cli

# Or use AWS Console (easier):
# 1. Go to https://console.aws.amazon.com/amplify/
# 2. Click "New app" → "Host web app"
# 3. Choose "GitHub" as source
# 4. Authorize AWS Amplify to access your GitHub
# 5. Select repository: apatt124/project-lazarus
# 6. Select branch: main (or master)
# 7. Amplify will auto-detect Next.js and use amplify.yml config
```

### Step 2: Configure Environment Variables

In the Amplify Console:
1. Go to your app → "Environment variables"
2. Add these variables:

```
AWS_REGION=us-east-1
AWS_LAMBDA_FUNCTION_NAME=lazarus-vector-search
AWS_S3_BUCKET=project-lazarus-medical-docs-677625843326
```

For AWS credentials, you have two options:

**Option A: Use IAM Role (Recommended - More Secure)**
1. In Amplify Console → App settings → General
2. Under "Service role", create a new role or use existing
3. Attach these policies to the role:
   - `AWSLambdaExecute`
   - `AmazonS3ReadOnlyAccess`
   - Custom policy for Bedrock and Secrets Manager (see below)

**Option B: Use Access Keys (Simpler)**
Add these environment variables:
```
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
```

### Step 3: Custom IAM Policy for Amplify

If using Option A, create this custom policy and attach to the Amplify service role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:677625843326:secret:lazarus-db-credentials-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": "arn:aws:lambda:us-east-1:677625843326:function:lazarus-vector-search"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::project-lazarus-medical-docs-677625843326/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "textract:DetectDocumentText",
        "textract:AnalyzeDocument"
      ],
      "Resource": "*"
    }
  ]
}
```

### Step 4: Deploy

1. Click "Save and deploy" in Amplify Console
2. Amplify will:
   - Clone your repo
   - Install dependencies
   - Build the Next.js app
   - Deploy to CloudFront CDN
3. Wait 5-10 minutes for first deployment
4. You'll get a URL like: `https://main.d1234abcd.amplifyapp.com`

### Step 5: Custom Domain (Optional)

If you have a domain:
1. Go to Amplify Console → Domain management
2. Click "Add domain"
3. Follow DNS configuration steps
4. Get free SSL certificate automatically

### Step 6: Test Your Deployment

```bash
# Test the deployed URL
curl https://your-amplify-url.amplifyapp.com/api/health

# Test document upload
curl -X POST https://your-amplify-url.amplifyapp.com/api/upload \
  -F "file=@test-document.pdf" \
  -F "documentType=Lab Results"
```

## Alternative: Deploy to Vercel

Vercel is another excellent option for Next.js:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from frontend directory
cd frontend
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: project-lazarus
# - Directory: ./
# - Override settings? No

# Set environment variables
vercel env add AWS_REGION
vercel env add AWS_LAMBDA_FUNCTION_NAME
vercel env add AWS_S3_BUCKET
vercel env add AWS_ACCESS_KEY_ID
vercel env add AWS_SECRET_ACCESS_KEY

# Deploy to production
vercel --prod
```

## Alternative: Deploy to EC2 (Self-Hosted)

For complete control:

```bash
# Launch EC2 instance (t3.micro is fine)
# SSH into instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Clone repo
git clone https://github.com/apatt124/project-lazarus.git
cd project-lazarus/frontend

# Install dependencies
npm install

# Create .env.local with your AWS credentials
cat > .env.local << EOF
AWS_REGION=us-east-1
AWS_LAMBDA_FUNCTION_NAME=lazarus-vector-search
AWS_S3_BUCKET=project-lazarus-medical-docs-677625843326
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
EOF

# Build and start
npm run build
npm start

# Install PM2 to keep it running
sudo npm install -g pm2
pm2 start npm --name "lazarus" -- start
pm2 startup
pm2 save

# Configure nginx as reverse proxy (optional)
sudo yum install -y nginx
# Configure nginx to proxy port 80 → 3737
```

## Cost Comparison

| Option | Monthly Cost | Pros | Cons |
|--------|-------------|------|------|
| **Amplify** | $0-5 | Easy, auto-scaling, HTTPS | AWS-specific |
| **Vercel** | $0-20 | Fastest, great DX | Serverless limits |
| **EC2** | $5-10 | Full control | Manual management |

## Recommended: AWS Amplify

Since your infrastructure is already on AWS, Amplify is the best choice:
- Integrates seamlessly with your Lambda/RDS/S3
- Same AWS account = easier IAM permissions
- Free tier covers personal use
- Automatic deployments from GitHub
- Built-in monitoring and logs

## Security Notes

1. **Never commit .env.local** - Already in .gitignore
2. **Use IAM roles** when possible instead of access keys
3. **Enable CloudFront** for DDoS protection (Amplify does this automatically)
4. **Set up CloudWatch alarms** for unusual API usage
5. **Consider adding authentication** (Cognito, Auth0, etc.) before sharing URL

## Next Steps After Deployment

1. Test all features on the live URL
2. Set up custom domain if desired
3. Configure CloudWatch alarms for errors
4. Add authentication if sharing with others
5. Set up automated backups of RDS database

---

**Ready to deploy?** Start with AWS Amplify - it's the fastest path to a live URL!
