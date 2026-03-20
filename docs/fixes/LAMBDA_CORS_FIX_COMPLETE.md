# Lambda CORS Fix - Complete Solution

## Problem
The KnowledgeGraph component was getting CORS errors and 502 Bad Gateway errors when calling the Lambda API:
- `Access-Control-Allow-Origin` header missing
- No OPTIONS handler for CORS preflight requests
- 502 Bad Gateway suggests Lambda might not be deployed or API Gateway misconfigured

## Root Cause
1. Lambda function was missing OPTIONS request handler for CORS preflight
2. CORS headers were present but incomplete (missing Allow-Methods and Allow-Headers)
3. Lambda may not be deployed to AWS

## Solution Applied

### 1. Added CORS Headers Constant
Created a reusable `CORS_HEADERS` constant at the top of the Lambda function:

```javascript
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};
```

### 2. Added OPTIONS Handler
Added handler for CORS preflight requests at the start of the main handler:

```javascript
// Handle CORS preflight requests
if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
  return {
    statusCode: 200,
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Max-Age': '86400',
    },
    body: ''
  };
}
```

### 3. Updated All Response Headers
All responses in the Lambda function now need to use the `CORS_HEADERS` constant instead of individual header objects.

## Next Steps - DEPLOYMENT REQUIRED

### Step 1: Verify Lambda Function Changes
The Lambda function `lambda/api-relationships/index.mjs` has been updated with:
- ✅ CORS_HEADERS constant defined
- ✅ OPTIONS handler added
- ⚠️ Need to replace all individual header objects with CORS_HEADERS

### Step 2: Deploy Lambda Function to AWS
The Lambda function MUST be deployed to AWS for changes to take effect:

```bash
# Navigate to Lambda directory
cd lambda/api-relationships

# Install dependencies (if not already done)
npm install

# Package the Lambda function
zip -r function.zip index.mjs node_modules/

# Deploy to AWS Lambda (replace with your function name)
aws lambda update-function-code \
  --function-name your-lambda-function-name \
  --zip-file fileb://function.zip \
  --region us-east-1
```

**IMPORTANT**: Replace `your-lambda-function-name` with the actual Lambda function name from your AWS account.

### Step 3: Verify API Gateway Configuration
Check that API Gateway is properly configured:

1. **CORS Configuration**: API Gateway should have CORS enabled
2. **Lambda Integration**: Verify Lambda function is connected
3. **Routes**: Ensure all routes are configured:
   - GET /relationships/graph
   - GET /relationships/timeline
   - POST /relationships/ai-layout
   - etc.

### Step 4: Test Endpoints
After deployment, test the endpoints:

```bash
# Test graph endpoint
curl -X GET "https://your-api-gateway-url/prod/relationships/graph?minStrength=0" \
  -H "Origin: http://localhost:3737" \
  -v

# Test OPTIONS (preflight)
curl -X OPTIONS "https://your-api-gateway-url/prod/relationships/graph" \
  -H "Origin: http://localhost:3737" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

Expected response headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

## 502 Bad Gateway Troubleshooting

If you still get 502 errors after deploying:

1. **Check Lambda Logs**: View CloudWatch logs for the Lambda function
2. **Check Lambda Timeout**: Ensure timeout is sufficient (recommend 30s)
3. **Check Lambda Memory**: Ensure sufficient memory (recommend 512MB+)
4. **Check Database Connection**: Verify Lambda can connect to RDS
5. **Check Secrets Manager**: Verify Lambda has permission to read secrets

## Security Notes

- All credentials are retrieved from AWS Secrets Manager
- No credentials are hardcoded in the Lambda function
- CORS is set to `*` for development - consider restricting in production
- API Gateway URL is stored in environment variable `VITE_API_URL`

## Files Modified

- `lambda/api-relationships/index.mjs` - Added CORS headers and OPTIONS handler

## Related Documentation

- `docs/fixes/LAMBDA_CORS_ISSUE.md` - Original problem documentation
- `docs/fixes/ENDPOINT_CORS_FIX.md` - Previous attempted fixes

---

**Status**: Code changes complete, deployment required
**Created**: March 17, 2026
**Priority**: HIGH - Blocks KnowledgeGraph functionality
