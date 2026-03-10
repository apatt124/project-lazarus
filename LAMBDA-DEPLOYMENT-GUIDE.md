# Lambda Functions Deployment Guide

## Created Lambda Functions

### 1. lazarus-api-chat
**Purpose**: Handle chat requests with AI
**Location**: `lambda/api-chat/`
**Features**:
- Intent classification
- Vector search integration
- Claude AI via Bedrock
- Source validation
- Confidence scoring

### 2. lazarus-api-auth
**Purpose**: Simple password authentication
**Location**: `lambda/api-auth/`
**Features**:
- Password validation
- Session management

## Deployment Steps

### Step 1: Deploy Lambda Functions

```bash
chmod +x scripts/deploy-api-lambdas.sh
./scripts/deploy-api-lambdas.sh
```

This will:
- Create IAM role with necessary permissions
- Package and deploy both Lambda functions
- Configure environment variables
- Set appropriate timeouts and memory

**Time**: ~5 minutes

### Step 2: Create API Gateway

```bash
chmod +x scripts/create-api-gateway.sh
./scripts/create-api-gateway.sh
```

This will:
- Create REST API in API Gateway
- Create `/chat` and `/login` endpoints
- Configure Lambda integrations
- Enable CORS
- Deploy to `prod` stage

**Time**: ~2 minutes

### Step 3: Get API URL

After running the script, you'll get an API URL like:
```
https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod
```

### Step 4: Update Environment Variables

**Local development** (`.env.local`):
```bash
cat > .env.local << EOF
VITE_API_URL=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod
EOF
```

**Amplify** (for production):
```bash
aws amplify update-app \
  --app-id dp2mw5m8eaj5o \
  --environment-variables VITE_API_URL=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod \
  --region us-east-1
```

### Step 5: Test Endpoints

**Test authentication:**
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/login \
  -H 'Content-Type: application/json' \
  -d '{"password":"your_app_password_here"}'
```

**Test chat:**
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/chat \
  -H 'Content-Type: application/json' \
  -d '{"query":"What chronic conditions do I have?"}'
```

## Lambda Configuration

### lazarus-api-chat
- **Runtime**: Node.js 20.x
- **Memory**: 1024 MB
- **Timeout**: 60 seconds
- **Environment Variables**:
  - `AWS_REGION`: us-east-1
  - `VECTOR_SEARCH_FUNCTION`: lazarus-vector-search
  - `APP_PASSWORD`: (from Amplify)

### lazarus-api-auth
- **Runtime**: Node.js 20.x
- **Memory**: 128 MB
- **Timeout**: 10 seconds
- **Environment Variables**:
  - `APP_PASSWORD`: (from Amplify)

## IAM Permissions

The Lambda execution role (`LazarusAPILambdaRole`) has:
- `AWSLambdaBasicExecutionRole` - CloudWatch Logs
- `AmazonBedrockFullAccess` - Claude AI access
- `SecretsManagerReadWrite` - Database credentials
- Custom policy for Lambda invocation

## API Gateway Endpoints

| Method | Path | Lambda Function | Purpose |
|--------|------|-----------------|---------|
| POST | /chat | lazarus-api-chat | Chat with AI |
| POST | /login | lazarus-api-auth | Authentication |
| OPTIONS | /* | MOCK | CORS preflight |

## Cost Estimate

**Lambda**:
- Chat: ~$0.20 per 1000 requests (1GB, 5s avg)
- Auth: ~$0.01 per 1000 requests (128MB, <1s)

**API Gateway**:
- $3.50 per million requests
- First 1 million requests/month free (12 months)

**Total for personal use**: ~$1-5/month

## Monitoring

**View Lambda logs:**
```bash
aws logs tail /aws/lambda/lazarus-api-chat --follow
aws logs tail /aws/lambda/lazarus-api-auth --follow
```

**Check API Gateway metrics:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=lazarus-api \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum
```

## Troubleshooting

### Lambda fails to invoke
- Check IAM role permissions
- Verify environment variables are set
- Check CloudWatch logs

### API Gateway returns 403
- Verify Lambda permissions for API Gateway
- Check CORS configuration
- Ensure API is deployed to `prod` stage

### Chat returns empty response
- Verify `lazarus-vector-search` Lambda exists
- Check Bedrock model access
- Verify database credentials in Secrets Manager

## Updating Lambda Functions

To update after code changes:

```bash
cd lambda/api-chat
zip -r function.zip .
aws lambda update-function-code \
  --function-name lazarus-api-chat \
  --zip-file fileb://function.zip \
  --region us-east-1
```

Or re-run the deployment script:
```bash
./scripts/deploy-api-lambdas.sh
```

## Next Steps

1. ✅ Deploy Lambda functions
2. ✅ Create API Gateway
3. ✅ Update environment variables
4. ✅ Test endpoints
5. ⏳ Build and deploy Vite app
6. ⏳ Test full application

---

**Status**: Lambda functions deployed and tested
**API Gateway URL**: `https://23jhaxp7dh.execute-api.us-east-1.amazonaws.com/prod`
**Estimated time**: 10 minutes total
