# AI Layout Timeout Issue

## Problem

When generating AI layouts for large knowledge graphs (>50 nodes), the request times out with a 504 Gateway Timeout error.

## Root Cause

1. **API Gateway Timeout Limit**: AWS API Gateway has a hard limit of 29 seconds for synchronous requests
2. **Claude API Latency**: Generating optimal layouts for large graphs requires Claude to analyze complex relationships, which can take 30-60 seconds
3. **Graph Complexity**: With 89 nodes and 221 edges, the AI needs significant time to:
   - Analyze graph topology
   - Calculate optimal positions
   - Minimize edge crossings
   - Prevent node overlaps

## Current Behavior

- Lambda timeout: 60 seconds (sufficient)
- API Gateway timeout: 29 seconds (hard limit, cannot be increased)
- Result: Request times out at API Gateway before Lambda completes

## Solutions Implemented

### 1. Improved Error Handling
- Frontend now detects timeout errors
- Shows user-friendly message explaining the issue
- Suggests using Custom layout for large graphs

### 2. Server-Side Caching
- First generation may timeout
- Subsequent loads use cached layout (instant)
- Cache invalidates when graph structure changes

### 3. Increased Lambda Timeout
- Lambda timeout increased to 60 seconds
- Allows background completion even if API Gateway times out
- Layout gets cached for next attempt

## Workarounds for Users

### Option 1: Retry After Timeout
1. First attempt may timeout
2. Wait 30-60 seconds
3. Try switching to AI layout again
4. Should load instantly from cache

### Option 2: Use Custom Layout
1. Switch to Custom layout mode
2. Manually arrange nodes
3. Positions are saved automatically

### Option 3: Reduce Graph Size
1. Use filters to show fewer nodes
2. Generate AI layout for smaller subset
3. Gradually add more nodes

## Long-Term Solutions

### Option A: Asynchronous Generation (Recommended)
```
1. User requests AI layout
2. Frontend shows "Generating..." status
3. Backend starts async job
4. Frontend polls for completion
5. Layout loads when ready
```

### Option B: WebSocket Connection
```
1. Establish WebSocket connection
2. Send layout generation request
3. Receive real-time progress updates
4. Get final layout when complete
```

### Option C: Client-Side Layout
```
1. Use simpler layout algorithm in browser
2. No API call needed
3. Instant results
4. Less optimal than Claude-generated
```

## Implementation Priority

For now, the server-side caching provides a good user experience:
- First load: May timeout (user retries)
- Subsequent loads: Instant (from cache)
- Cache persists across devices

Future enhancement: Implement async generation with polling for better UX on first load.

## Technical Details

### API Gateway Limits
- Maximum timeout: 29 seconds (cannot be increased)
- This is a hard AWS limit for REST APIs
- Alternative: Use WebSocket API (no timeout limit)

### Lambda Configuration
```bash
Function: lazarus-api-relationships
Timeout: 60 seconds
Memory: 1024 MB
```

### Cache Table
```sql
Table: medical.ai_layout_cache
Columns: user_id, node_count, edge_count, layout_data, created_at, updated_at
Index: user_id (unique)
```

## Testing

To test the caching behavior:
1. Load Knowledge Graph with many nodes
2. Switch to AI layout (may timeout)
3. Wait 60 seconds
4. Switch to AI layout again (should load instantly)

---

**Date**: March 13, 2026
**Issue**: API Gateway timeout on large graph AI layout generation
**Status**: Mitigated with caching, improved error handling
**Future**: Consider async generation for better UX
