# Endpoint CORS Issues - Fixed

## Problem

The KnowledgeGraph component was making direct calls to the Lambda API Gateway, which caused:
1. **CORS errors** - Browser blocked requests from localhost to AWS API Gateway
2. **502 Bad Gateway errors** - Lambda function not responding correctly
3. **Failed fetches** - All graph data loading failed

## Root Cause

```typescript
// BEFORE (in KnowledgeGraph.tsx)
const API_BASE = import.meta.env.VITE_API_URL;
// This pointed directly to: https://[api-gateway-url]/prod

// Component made direct calls:
fetch(`${API_BASE}/relationships/graph`)
fetch(`${API_BASE}/relationships/timeline`)
fetch(`${API_BASE}/relationships/ai-layout`)
```

This bypassed the Next.js server and tried to call Lambda directly from the browser, causing CORS issues.

## Solution

### 1. Updated KnowledgeGraph Component

```typescript
// AFTER (in KnowledgeGraph.tsx)
const API_BASE = '/api';
// Now uses Next.js API routes

// Component makes proxied calls:
fetch('/api/relationships/graph')
fetch('/api/relationships/timeline')
fetch('/api/relationships/ai-layout')
```

### 2. Created Missing API Routes

Created Next.js API routes that proxy to Lambda:

**`app/api/relationships/route.ts`**
- GET /api/relationships - List all relationships
- POST /api/relationships - Create relationship
- DELETE /api/relationships/:id - Delete relationship

**`app/api/relationships/graph/route.ts`**
- GET /api/relationships/graph - Get graph data with nodes and edges

**`app/api/relationships/timeline/route.ts`**
- GET /api/relationships/timeline - Get timeline events

**`app/api/relationships/ai-layout/route.ts`**
- POST /api/relationships/ai-layout - Generate AI layout

### 3. Fixed Memory Commands API

Updated `app/api/memory-commands/route.ts`:
- Changed from `VITE_API_URL` to `NEXT_PUBLIC_API_URL`
- Added fallback to relative paths
- Works in both development and production

## How It Works Now

```
Browser Request Flow:
┌─────────────────────────────────────────────────────────┐
│ 1. Browser: fetch('/api/relationships/graph')          │
│    ↓                                                    │
│ 2. Next.js API Route: /app/api/relationships/graph/    │
│    ↓                                                    │
│ 3. Lambda Client: Invoke Lambda function               │
│    ↓                                                    │
│ 4. AWS Lambda: Process request                         │
│    ↓                                                    │
│ 5. Lambda Response: Return data                        │
│    ↓                                                    │
│ 6. Next.js: Parse and forward response                 │
│    ↓                                                    │
│ 7. Browser: Receive data (no CORS issues!)             │
└─────────────────────────────────────────────────────────┘
```

## Benefits

✅ **No CORS issues** - All requests go through Next.js server  
✅ **Consistent API pattern** - All endpoints use `/api/*`  
✅ **Better error handling** - Centralized error responses  
✅ **Easier debugging** - Can log requests in Next.js  
✅ **Production ready** - Works in both dev and prod  

## Files Modified

```
Modified:
✅ src/components/KnowledgeGraph.tsx (1 line changed)
✅ app/api/memory-commands/route.ts (API URL handling)

Created:
✅ app/api/relationships/route.ts
✅ app/api/relationships/graph/route.ts
✅ app/api/relationships/timeline/route.ts
✅ app/api/relationships/ai-layout/route.ts
```

## Testing

After these changes:

1. ✅ Knowledge graph loads without CORS errors
2. ✅ Timeline events load correctly
3. ✅ AI layout generation works
4. ✅ Memory commands can search facts/memories
5. ✅ All API calls go through Next.js proxy

## Security

All changes follow security guidelines:
- ✅ No hardcoded credentials
- ✅ Environment variables used correctly
- ✅ Lambda function names from env vars
- ✅ No sensitive data in logs

## Environment Variables Required

```bash
# .env.local
LAZARUS_AWS_REGION=us-east-1
LAZARUS_LAMBDA_FUNCTION=lazarus-api
NEXT_PUBLIC_API_URL=http://localhost:3000  # For development
```

## Common Issues

### Issue: Still seeing CORS errors
**Solution**: Hard refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)

### Issue: 502 Bad Gateway
**Solution**: Check Lambda function is deployed and environment variables are set

### Issue: Empty graph
**Solution**: Check that relationships exist in database

---

**Fixed**: 2026-03-16  
**Status**: ✅ Complete  
**Impact**: High - Fixes all graph loading issues
