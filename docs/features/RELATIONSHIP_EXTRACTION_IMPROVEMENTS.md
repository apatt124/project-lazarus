# Relationship Extraction Improvements

## Overview
Enhanced the AI-powered relationship extraction system to handle large datasets and support configurable confidence thresholds for the knowledge graph.

## Changes Made

### 1. Batch Processing for Large Datasets
**Problem**: Original implementation tried to process all facts at once, causing timeouts and memory issues with 600+ facts.

**Solution**: 
- Modified `extractRelationships()` to process facts in configurable batches (default 50)
- Added `skipExisting` parameter to only process facts without relationships
- Included 100 context facts from existing graph to help AI find cross-connections
- Increased Lambda timeout to 900 seconds and memory to 1024MB

**Endpoints**:
- `POST /relationships/extract` - Process single batch
  - Parameters: `batchSize` (default 50), `skipExisting` (default true)
- `POST /relationships/extract-all` - Process multiple batches automatically
  - Parameters: `batchSize`, `maxBatches` (default 10)

### 2. UUID Validation and Error Handling
**Problem**: AI was returning fact indices (like "25", "26") instead of UUIDs, causing database errors.

**Solution**:
- Completely restructured prompt to emphasize UUID usage
- Removed index numbers from fact list presentation
- Added UUID validation regex before database insertion
- Added fact existence verification against known fact map
- Gracefully skip invalid relationships with detailed error logging

**Validation**:
```javascript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

### 3. Configurable Confidence Threshold
**Problem**: Users wanted to see ALL potential relationships, including low-confidence ones, to adjust threshold during development.

**Solution**:
- Lowered AI confidence threshold from 0.5 to 0.3
- Updated AI prompt with detailed confidence scale:
  - 0.9-1.0: Very confident (explicit, clear connection)
  - 0.7-0.9: Confident (strong evidence)
  - 0.5-0.7: Moderately confident (reasonable inference)
  - 0.3-0.5: Uncertain (possible connection)
  - 0.1-0.3: Speculative (weak evidence)
- Modified `/relationships/graph` endpoint to accept `minStrength` query parameter
- Frontend already has slider in GraphControls component to filter by strength

**Usage**:
```bash
# Get all relationships with strength >= 0.3
GET /relationships/graph?minStrength=0.3

# Get only high-confidence relationships
GET /relationships/graph?minStrength=0.7
```

### 4. Improved AI Prompt Structure
**New Format**:
```
UUID: a1b2c3d4-5678-90ab-cdef-1234567890ab
Type: medication
Content: Metformin 500mg
Date: 2024-01-15
---
```

**Key Improvements**:
- Removed confusing index numbers
- UUID prominently displayed first
- Clear separation between facts
- Explicit examples showing correct UUID usage
- Validation instructions in prompt

## Results

### Before Improvements
- Could only process small batches
- AI returned invalid indices causing errors
- Fixed confidence threshold (0.5)
- ~0 relationships created due to errors

### After Improvements
- Successfully processing 600+ facts in batches
- 223+ relationships created
- 89+ unique facts with relationships
- Configurable confidence threshold (0.3-1.0)
- Proper UUID validation and error handling

## Current Statistics
- Total relationships: 223
- Unique facts with relationships: 89
- Minimum confidence threshold: 0.3
- Batch size: 20 facts per request
- Context facts: 100 additional facts for cross-connections

## Usage Examples

### Process Next Batch of Facts
```bash
curl -X POST "https://your-api-url/relationships/extract" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 20, "skipExisting": true}'
```

### Process All Remaining Facts
```bash
curl -X POST "https://your-api-url/relationships/extract-all" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 50, "maxBatches": 10}'
```

### View Knowledge Graph with Low-Confidence Relationships
```bash
curl "https://your-api-url/relationships/graph?minStrength=0.3"
```

### View Only High-Confidence Relationships
```bash
curl "https://your-api-url/relationships/graph?minStrength=0.8"
```

## Frontend Integration

The knowledge graph frontend already supports the confidence threshold filter:

1. Open the Knowledge Graph view
2. Use the "Min Strength" slider in GraphControls
3. Adjust from 0.0 to 1.0 to filter relationships
4. Graph updates in real-time

## Next Steps

1. Continue processing remaining facts in batches
2. Monitor relationship quality and adjust confidence threshold
3. Consider adding relationship type filters
4. Add user feedback mechanism to improve AI accuracy
5. Implement relationship editing/verification UI

## Files Modified

- `lambda/api-relationships/index.mjs` - Core extraction logic
- `src/components/KnowledgeGraph.tsx` - Frontend integration
- `src/components/graph/GraphControls.tsx` - UI controls (already had slider)

## Deployment

Lambda function `lazarus-api-relationships` has been updated with all changes.

---

**Created**: March 13, 2026  
**Status**: Deployed and operational  
**Next Review**: After processing all facts
