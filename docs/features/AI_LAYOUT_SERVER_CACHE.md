# AI Layout Server-Side Caching

## Overview

The Knowledge Graph AI layout system now includes server-side caching to provide consistent layouts across devices and faster loading times.

## Implementation Summary

### Database Schema

Created table `medical.ai_layout_cache` to store cached AI-generated layouts:

```sql
CREATE TABLE medical.ai_layout_cache (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    node_count INTEGER NOT NULL,
    edge_count INTEGER NOT NULL,
    layout_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Cache Validation

The cache is validated by comparing:
- Node count (number of facts in the graph)
- Edge count (number of relationships)

If either count changes, the cache is invalidated and a new layout is generated.

### API Endpoint

**POST** `/relationships/ai-layout`

Request body:
```json
{
  "userId": "user_identifier",
  "nodes": [...],
  "edges": [...],
  "forceRegenerate": false
}
```

Response:
```json
{
  "success": true,
  "positions": {
    "node_id": { "x": 500, "y": 400 },
    ...
  },
  "cached": true,
  "cacheAge": "2026-03-13T19:40:00Z"
}
```

### Frontend Integration

The frontend:
1. Passes `userId` to identify the user's cached layout
2. Sets `forceRegenerate: false` for normal loading (uses cache if valid)
3. Sets `forceRegenerate: true` when user clicks "Regenerate AI Layout" button
4. Stores positions in localStorage as backup

### Cache Behavior

- **Normal Load**: Checks server cache first, uses if valid (same node/edge count)
- **Regenerate**: Bypasses cache, generates new layout, saves to server
- **New Facts Added**: Server detects node/edge count change, generates new layout automatically
- **Cross-Device**: Same layout appears on all devices for the same user

## Benefits

1. **Consistency**: Same layout across all devices
2. **Performance**: Faster loading (no AI generation needed if cached)
3. **Automatic Updates**: Cache invalidates when facts change
4. **User Control**: Manual regeneration available via button

## Files Modified

- `database/migrations/008_add_ai_layout_cache.sql` - Database schema
- `lambda/api-relationships/index.mjs` - Server-side caching logic
- `src/components/KnowledgeGraph.tsx` - Frontend integration
- `scripts/deployment/deploy-knowledge-graph.sh` - Deployment script

## Deployment

Migration applied: March 13, 2026
Lambda deployed: March 13, 2026
API endpoint active: `/relationships/ai-layout`

## Testing

To test the cache:
1. Load the Knowledge Graph (generates and caches layout)
2. Refresh the page (should load from cache instantly)
3. Add new facts programmatically
4. Reload graph (should detect change and regenerate)
5. Click "Regenerate AI Layout" (should bypass cache and create new layout)

## Future Enhancements

- Cache expiration (e.g., 30 days)
- Cache versioning for layout algorithm updates
- Per-user layout preferences
- Layout history/undo functionality
