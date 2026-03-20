# AI Layout Stale Cache Fallback

## Problem

With 773 nodes and 580 edges, Claude cannot generate valid JSON for all node positions. The response is too large and gets truncated or malformed, causing JSON parsing errors.

## Solution

Implemented stale cache fallback: when AI layout generation fails, the system returns the most recent cached layout even if it's for a different node count.

## How It Works

### Normal Flow (Cache Valid)
1. User clicks "AI Layout"
2. Frontend sends request with 773 nodes
3. Lambda checks cache: 592 nodes (stale)
4. Lambda tries to generate new layout
5. Claude fails (JSON error)
6. **Lambda returns stale cache as fallback**
7. Frontend applies 44 cached positions
8. Remaining nodes use circular layout

### Response Format
```json
{
  "success": true,
  "positions": { /* 44 node positions */ },
  "cached": true,
  "stale": true,
  "cacheAge": "2026-03-13T22:16:33.620075Z",
  "warning": "Using cached layout for 592 nodes (current graph has 773 nodes). Some nodes may not have positions."
}
```

## Benefits

1. **No More Timeouts**: Always returns quickly
2. **Partial Layout Better Than None**: 44 positioned nodes > 0
3. **Graceful Degradation**: System works even when AI fails
4. **User Can Still Use Graph**: Custom layout available

## Limitations

### Current State
- **Cached positions**: 44 nodes (from 592-node graph)
- **Current graph**: 773 nodes
- **Coverage**: ~6% of nodes have AI positions
- **Remaining nodes**: Use circular layout

### Why So Few Positions?

The cached layout was generated when:
- Graph had 592 nodes
- 520 disconnected components (87% isolated)
- Claude only positioned largest clusters
- Result: 44 positions for most-connected nodes

## User Experience

### What Users See

When clicking "AI Layout":
1. Loading indicator appears
2. Request completes quickly (< 2 seconds)
3. 44 nodes move to AI-optimized positions
4. Remaining 729 nodes stay in circular layout
5. No error message (graceful fallback)

### What Users Can Do

1. **Use Custom Layout**: Manually arrange nodes
2. **Use Filters**: Show only connected facts
3. **Wait for Better Data**: More relationship extraction = better AI layout
4. **Hybrid Approach**: AI layout for clusters, manual for isolated nodes

## Future Improvements

### Short Term: Chunked Generation

Generate layout for connected components separately:

```javascript
if (nodes.length > 200) {
  // Find largest connected component
  const mainCluster = components.sort((a, b) => b.length - a.length)[0];
  
  // Generate layout for main cluster only
  const clusterNodes = nodes.filter(n => mainCluster.includes(n.id));
  const clusterLayout = await generateLayoutForCluster(clusterNodes);
  
  // Position other nodes around the main cluster
  const remainingLayout = positionAroundCluster(clusterLayout, remainingNodes);
  
  return { ...clusterLayout, ...remainingLayout };
}
```

### Medium Term: Progressive Generation

Generate and cache layouts incrementally:

1. Generate for 100 most-connected nodes
2. Cache partial result
3. Generate for next 100 nodes
4. Merge with existing cache
5. Repeat until all nodes positioned

### Long Term: Smarter Fallback

Instead of circular layout for uncached nodes:

1. **Force-Directed Layout**: Use physics simulation
2. **Hierarchical Layout**: Based on relationship depth
3. **Cluster-Based**: Group by fact type
4. **Temporal Layout**: Arrange by date

## Monitoring

### Check Cache Status
```sql
SELECT 
  user_id,
  node_count as cached_nodes,
  edge_count as cached_edges,
  (SELECT COUNT(*) FROM jsonb_object_keys(layout_data)) as positions,
  updated_at,
  AGE(NOW(), updated_at) as cache_age
FROM medical.ai_layout_cache;
```

### Check Current Graph Size
```sql
SELECT 
  COUNT(*) FILTER (WHERE is_active = TRUE) as total_facts,
  COUNT(*) FILTER (WHERE is_active = TRUE AND EXISTS (
    SELECT 1 FROM medical.relationships r 
    WHERE (r.source_fact_id = id OR r.target_fact_id = id) 
    AND r.is_active = TRUE
  )) as connected_facts
FROM medical.user_facts;
```

### Calculate Coverage
```sql
WITH cache_info AS (
  SELECT 
    (SELECT COUNT(*) FROM jsonb_object_keys(layout_data)) as cached_positions
  FROM medical.ai_layout_cache 
  WHERE user_id = 'default'
),
graph_info AS (
  SELECT COUNT(*) as total_nodes
  FROM medical.user_facts
  WHERE is_active = TRUE
)
SELECT 
  cached_positions,
  total_nodes,
  ROUND(100.0 * cached_positions / total_nodes, 1) as coverage_percent
FROM cache_info, graph_info;
```

## Recommendations

### For Users

1. **Use Custom Layout** for now - manually arrange important nodes
2. **Filter by relationship strength** - show only well-connected facts
3. **Focus on clusters** - AI layout works best for connected subgraphs
4. **Be patient** - more relationship extraction = better AI layouts

### For Developers

1. **Implement chunked generation** - handle large graphs better
2. **Add filter UI** - let users show/hide isolated facts
3. **Improve relationship extraction** - reduce isolated facts
4. **Add manual positioning tools** - let users refine AI layout

## Testing

### Test Stale Cache Fallback

1. Check current cache:
   ```sql
   SELECT node_count, edge_count FROM medical.ai_layout_cache WHERE user_id = 'default';
   ```

2. Try AI layout in UI (should use stale cache)

3. Check browser console for:
   ```
   === USING STALE CACHE AS FALLBACK ===
   Stale cache has 44 positions
   Current graph has 773 nodes
   ```

4. Verify 44 nodes have AI positions, rest are circular

### Test Cache Regeneration

When graph size stabilizes (no new facts for a while):

```bash
# Manually trigger regeneration for smaller subset
./scripts/generate-ai-layout.sh default
```

This will attempt to generate for current graph size.

## Related Documentation

- [Background AI Layout Generation](./BACKGROUND_AI_LAYOUT_GENERATION.md)
- [Data Quality Improvement Results](./DATA_QUALITY_IMPROVEMENT_RESULTS.md)
- [Improving Data Quality Guide](../guides/IMPROVING_DATA_QUALITY.md)

---

**Date**: March 16, 2026
**Status**: Implemented - Stale cache fallback working
**Impact**: Users can now use AI layout without timeouts
**Coverage**: ~6% (44/773 nodes) - will improve with better data quality
