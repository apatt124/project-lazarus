# Lambda CORS Fix - Deployment Checklist

## Pre-Deployment Verification

- [x] CORS_HEADERS constant defined in lambda/api-relationships/index.mjs
- [x] OPTIONS handler added for CORS preflight requests
- [x] All 16 response headers replaced with CORS_HEADERS constant
- [x] No hardcoded credentials in code
- [x] Documentation created

## Deployment Steps

### 1. Package Lambda Function
```bash
cd lambda/api-relationships
npm install
zip -r function.zip index.mjs node_modules/
```

- [ ] Dependencies installed
- [ ] Deployment package created
- [ ] Package size verified (< 50MB)

### 2. Deploy to AWS
```bash
aws lambda update-function-code \
  --function-name YOUR_LAMBDA_FUNCTION_NAME \
  --zip-file fileb://function.zip \
  --region us-east-1
```

- [ ] Lambda function name identified
- [ ] Function deployed successfully
- [ ] Deployment timestamp verified

### 3. Test CORS Headers
```bash
# Test OPTIONS request
curl -X OPTIONS "YOUR_API_URL/relationships/graph" \
  -H "Origin: http://localhost:3737" \
  -v

# Test GET request
curl -X GET "YOUR_API_URL/relationships/graph?minStrength=0" \
  -H "Origin: http://localhost:3737" \
  -v
```

- [ ] OPTIONS returns 200 with CORS headers
- [ ] GET returns data with CORS headers
- [ ] Access-Control-Allow-Origin: * present
- [ ] Access-Control-Allow-Methods present
- [ ] Access-Control-Allow-Headers present

### 4. Test in Browser
```bash
# Start dev server if not running
npm run dev
```

- [ ] App loads at http://localhost:3737
- [ ] Navigate to Knowledge Graph page
- [ ] No CORS errors in console
- [ ] Graph data loads successfully
- [ ] Timeline events load successfully
- [ ] AI layout generation works

## Troubleshooting

### If CORS Errors Persist
- [ ] Check API Gateway CORS configuration
- [ ] Verify Lambda function was actually updated
- [ ] Check CloudWatch logs for errors
- [ ] Clear browser cache and reload

### If 502 Bad Gateway Errors
- [ ] Verify Lambda function exists and is deployed
- [ ] Check Lambda timeout (should be 30s+)
- [ ] Check Lambda memory (should be 512MB+)
- [ ] Verify Lambda can connect to RDS
- [ ] Verify Lambda can read from Secrets Manager
- [ ] Check VPC and security group configuration

## Success Criteria

- [ ] ✅ No CORS errors in browser console
- [ ] ✅ Knowledge Graph loads data
- [ ] ✅ Timeline events display
- [ ] ✅ AI layout generation works
- [ ] ✅ All graph controls functional
- [ ] ✅ Node details panel works

## Rollback Plan

If issues occur:
```bash
# Revert to previous version
git checkout HEAD~1 lambda/api-relationships/index.mjs
# Redeploy
cd lambda/api-relationships
zip -r function.zip index.mjs node_modules/
aws lambda update-function-code \
  --function-name YOUR_LAMBDA_FUNCTION_NAME \
  --zip-file fileb://function.zip
```

## Documentation

- Deployment Guide: docs/deployment/DEPLOY_LAMBDA_CORS_FIX.md
- Technical Details: docs/fixes/LAMBDA_CORS_FIX_COMPLETE.md
- Summary: CORS_FIX_SUMMARY.md

---

**Date**: March 17, 2026
**Status**: Ready for deployment
**Priority**: HIGH
