# Lambda CORS & 502 Issues - Needs AWS Fix

## Current Problem

The knowledge graph cannot load data due to:
1. **502 Bad Gateway** - Lambda function not responding to requests
2. **CORS errors** - No 'Access-Control-Allow-Origin' header

## Error Details

```
Access to fetch at 'https://[api-gateway].execute-api.us-east-1.amazonaws.com/prod/relationships/timeline' 
from origin 'http://localhost:3737' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.

GET https://[api-gateway].execute-api.us-east-1.amazonaws.com/prod/relationships/timeline 
net::ERR_FAILED 502 (Bad Gateway)
```

## Root Cause

This is a Vite + React app (not Next.js), so it makes direct API calls from the browser to Lambda. The Lambda function needs:
1. Proper CORS headers in responses
2. To be deployed and responding correctly

## What We Tried

### Attempt 1: Next.js API Routes
Created `app/api/relationships/*` routes to proxy requests. **Failed** because this is a Vite app, not Next.js.

### Attempt 2: Vite Proxy
Added proxy configuration to `vite.config.ts`. **Failed** because it still returned HTML instead of JSON.

### Attempt 3: Direct Lambda Calls
Reverted to calling Lambda directly. **Current state** - blocked by CORS and 502 errors.

## Solution Required

### Option A: Fix Lambda CORS (Recommended)

The Lambda function needs to return proper CORS headers. Check `lambda/api-relationships/index.mjs`:

```javascript
export const handler = async (event) => {
  // ... existing code ...
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',  // ← ADD THIS
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(responseData)
  };
};
```

**Also handle OPTIONS requests** (preflight):

```javascript
if (event.httpMethod === 'OPTIONS') {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
    body: ''
  };
}
```

### Option B: API Gateway CORS Configuration

Configure CORS in API Gateway:
1. Go to AWS Console → API Gateway
2. Select your API
3. Select the resource (e.g., `/relationships/graph`)
4. Actions → Enable CORS
5. Set:
   - Access-Control-Allow-Origin: `*` or `http://localhost:3737`
   - Access-Control-Allow-Methods: `GET,POST,PUT,DELETE,OPTIONS`
   - Access-Control-Allow-Headers: `Content-Type`
6. Deploy API

### Option C: Deploy Frontend to Same Domain

Deploy the Vite app to the same domain as the API Gateway (e.g., via CloudFront) to avoid CORS entirely.

## Checking Lambda Deployment

To verify the Lambda is deployed and responding:

```bash
# Test the endpoint directly
curl -X GET 'https://[api-gateway-url]/prod/relationships/graph?minStrength=0'

# Should return JSON, not 502
```

If you get 502, the Lambda might not be:
- Deployed
- Configured correctly in API Gateway
- Have the right permissions

## Temporary Workaround

While waiting for Lambda CORS fix, you can:
1. Use a CORS proxy for development (not recommended for production)
2. Test the memory commands feature (doesn't require graph data)
3. Check database directly to verify extraction worked

## Files to Update

Once CORS is fixed in Lambda:
- ✅ `src/components/KnowledgeGraph.tsx` - Already configured correctly
- ✅ `vite.config.ts` - Already reverted to no proxy
- ❌ `lambda/api-relationships/index.mjs` - Needs CORS headers added
- ❌ AWS API Gateway - Needs CORS enabled

## Testing After Fix

1. Restart Vite dev server
2. Open knowledge graph
3. Check browser console - should see no CORS errors
4. Graph should load with data

---

**Status**: ⚠️ Blocked - Needs AWS Lambda/API Gateway fix  
**Impact**: High - Knowledge graph cannot load  
**Workaround**: Test memory commands feature instead  
**Next Step**: Add CORS headers to Lambda function and redeploy
