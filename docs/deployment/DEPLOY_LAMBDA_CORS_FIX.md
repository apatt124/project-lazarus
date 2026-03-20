# Deploy Lambda CORS Fix

## Overview
This guide walks through deploying the CORS fix to the Lambda function that powers the relationships API endpoints.

## What Was Fixed

### Code Changes
1. Added `CORS_HEADERS` constant for consistent CORS headers across all responses
2. Added OPTIONS handler for CORS preflight requests
3. Replaced all individual header objects with the CORS_HEADERS constant (16 locations)

### Files Modified
- `lambda/api-relationships/index.mjs` - Main Lambda function
- `scripts/fix-lambda-cors-headers.mjs` - Helper script for bulk header replacement
- `docs/fixes/LAMBDA_CORS_FIX_COMPLETE.md` - Documentation

## Deployment Steps

### Step 1: Verify Changes Locally

```bash
# Check that CORS_HEADERS constant is defined
grep -A 4 "const CORS_HEADERS" lambda/api-relationships/index.mjs

# Verify OPTIONS handler exists
grep -A 10 "Handle CORS preflight" lambda/api-relationships/index.mjs

# Count how many times CORS_HEADERS is used (should be 16+)
grep -c "headers: CORS_HEADERS" lambda/api-relationships/index.mjs
```

### Step 2: Package Lambda Function

```bash
# Navigate to Lambda directory
cd lambda/api-relationships

# Install dependencies (if not already done)
npm install

# Create deployment package
zip -r function.zip index.mjs node_modules/

# Verify package size (should be reasonable, < 50MB)
ls -lh function.zip
```

### Step 3: Deploy to AWS Lambda

You'll need to know your Lambda function name. Check your `.env` file or AWS Console.

```bash
# Option A: Deploy using AWS CLI
aws lambda update-function-code \
  --function-name YOUR_LAMBDA_FUNCTION_NAME \
  --zip-file fileb://function.zip \
  --region us-east-1

# Option B: Deploy using AWS Console
# 1. Go to AWS Lambda Console
# 2. Find your function (likely named something like "lazarus-relationships-api")
# 3. Click "Upload from" > ".zip file"
# 4. Upload function.zip
# 5. Click "Save"
```

**IMPORTANT**: Replace `YOUR_LAMBDA_FUNCTION_NAME` with your actual function name.

### Step 4: Verify Deployment

```bash
# Check function was updated
aws lambda get-function \
  --function-name YOUR_LAMBDA_FUNCTION_NAME \
  --region us-east-1 \
  --query 'Configuration.LastModified'

# View recent logs
aws logs tail /aws/lambda/YOUR_LAMBDA_FUNCTION_NAME --follow
```

### Step 5: Test CORS Headers

Test that CORS headers are now present:

```bash
# Test OPTIONS (preflight) request
curl -X OPTIONS "YOUR_API_GATEWAY_URL/relationships/graph" \
  -H "Origin: http://localhost:3737" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Test GET request
curl -X GET "YOUR_API_GATEWAY_URL/relationships/graph?minStrength=0" \
  -H "Origin: http://localhost:3737" \
  -v
```

**Expected Response Headers**:
```
HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

### Step 6: Test in Browser

1. Open your app: `http://localhost:3737`
2. Navigate to the Knowledge Graph page
3. Open browser DevTools > Console
4. Look for CORS errors - they should be gone!
5. Verify the graph loads data successfully

## Troubleshooting

### Still Getting CORS Errors

**Check API Gateway CORS Configuration**:
1. Go to API Gateway Console
2. Find your API
3. Check CORS settings on each route
4. Ensure CORS is enabled and matches Lambda headers

**Check Lambda Logs**:
```bash
aws logs tail /aws/lambda/YOUR_LAMBDA_FUNCTION_NAME --follow
```

Look for:
- Function errors
- OPTIONS requests being handled
- Response headers being set

### Still Getting 502 Bad Gateway

This indicates Lambda isn't responding properly:

1. **Check Lambda Timeout**: Should be at least 30 seconds
   ```bash
   aws lambda get-function-configuration \
     --function-name YOUR_LAMBDA_FUNCTION_NAME \
     --query 'Timeout'
   ```

2. **Check Lambda Memory**: Should be at least 512MB
   ```bash
   aws lambda get-function-configuration \
     --function-name YOUR_LAMBDA_FUNCTION_NAME \
     --query 'MemorySize'
   ```

3. **Check Database Connection**: Verify Lambda can connect to RDS
   - Check VPC configuration
   - Check security groups
   - Check RDS is running

4. **Check Secrets Manager**: Verify Lambda can read credentials
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id lazarus-db-credentials \
     --region us-east-1
   ```

### Lambda Not Updating

If changes don't appear after deployment:

1. **Clear Lambda Cache**:
   ```bash
   aws lambda update-function-configuration \
     --function-name YOUR_LAMBDA_FUNCTION_NAME \
     --environment Variables={CACHE_BUST=$(date +%s)}
   ```

2. **Check Function Version**: Ensure you're not using a pinned version
   ```bash
   aws lambda get-function \
     --function-name YOUR_LAMBDA_FUNCTION_NAME \
     --query 'Configuration.Version'
   ```

3. **Redeploy with Force**:
   ```bash
   aws lambda update-function-code \
     --function-name YOUR_LAMBDA_FUNCTION_NAME \
     --zip-file fileb://function.zip \
     --publish
   ```

## Environment Variables

Ensure these are set in your `.env` file:

```bash
# API Gateway URL (used by frontend)
VITE_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod

# Lambda function name (for deployment)
AWS_LAMBDA_FUNCTION_NAME=your-lambda-function-name

# AWS region
AWS_REGION=us-east-1
```

## Security Notes

- All credentials are retrieved from AWS Secrets Manager
- No credentials are hardcoded in the Lambda function
- CORS is set to `*` for development
- Consider restricting CORS origin in production to your domain only

## Rollback Plan

If deployment causes issues:

1. **Revert to Previous Version**:
   ```bash
   # List versions
   aws lambda list-versions-by-function \
     --function-name YOUR_LAMBDA_FUNCTION_NAME

   # Update alias to previous version
   aws lambda update-alias \
     --function-name YOUR_LAMBDA_FUNCTION_NAME \
     --name PROD \
     --function-version PREVIOUS_VERSION_NUMBER
   ```

2. **Restore from Git**:
   ```bash
   git checkout HEAD~1 lambda/api-relationships/index.mjs
   # Then redeploy
   ```

## Success Criteria

✅ OPTIONS requests return 200 with CORS headers
✅ GET requests return data with CORS headers
✅ No CORS errors in browser console
✅ Knowledge Graph loads successfully
✅ Timeline events load successfully
✅ AI layout generation works

## Next Steps

After successful deployment:

1. Monitor CloudWatch logs for errors
2. Test all Knowledge Graph features
3. Verify AI layout generation works
4. Test relationship filtering
5. Test timeline navigation

## Related Documentation

- `docs/fixes/LAMBDA_CORS_FIX_COMPLETE.md` - Technical details of the fix
- `docs/fixes/LAMBDA_CORS_ISSUE.md` - Original problem documentation
- `docs/fixes/ENDPOINT_CORS_FIX.md` - Previous attempted fixes

---

**Created**: March 17, 2026
**Status**: Ready for deployment
**Priority**: HIGH - Blocks KnowledgeGraph functionality
