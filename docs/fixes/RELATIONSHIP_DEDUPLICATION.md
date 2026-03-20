# Relationship Deduplication Fix

## Problem

The relationship extraction system was creating massive duplicates (96.6% duplication rate):
- 3,287 total relationships but only 112 unique
- Some nodes had 1,598 connections when they should have had ~23
- Example: "Peustow procedure → pancreatitis" appeared 284 times

## Root Cause

1. **No unique constraint**: Database schema had no constraint to prevent duplicate relationships
2. **Ineffective conflict handling**: Lambda code used `ON CONFLICT DO NOTHING` but there was no conflict to detect
3. **Fact duplication**: Same medical content appeared in multiple documents, each got its own fact ID
4. **Cartesian explosion**: Relationships were created between every combination of fact IDs with similar content

## Solution

### 1. Database Migration (`009_add_relationship_unique_constraint.sql`)

Added unique constraint to prevent duplicates:
```sql
CREATE UNIQUE INDEX idx_relationships_unique 
ON medical.relationships (source_fact_id, target_fact_id, relationship_type)
WHERE is_active = TRUE;
```

Added `occurrence_count` field to track how many times a relationship was discovered.

### 2. Cleanup Script (`scripts/deduplicate-relationships.mjs`)

Deduplicates existing relationships:
- Finds all duplicate groups (same source, target, type)
- Keeps relationship with highest strength
- Sets `occurrence_count` to number of duplicates found
- Deletes duplicate entries

### 3. Lambda Function Update (`lambda/api-relationships/index.mjs`)

Changed relationship insertion logic:
- **Before**: Used `ON CONFLICT DO NOTHING` (didn't work)
- **After**: Explicitly checks for existing relationships before inserting
- If exists: Updates strength (if higher) and increments `occurrence_count`
- If new: Inserts with `occurrence_count = 1`

## Usage

### Step 1: Stop the relationship generator
```bash
pkill -f generate-relationships-direct.mjs
```

### Step 2: Run the migration
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f database/migrations/009_add_relationship_unique_constraint.sql
```

### Step 3: Run the cleanup script
```bash
node scripts/deduplicate-relationships.mjs
```

### Step 4: Deploy updated Lambda
```bash
cd lambda/api-relationships
zip -r function.zip .
aws lambda update-function-code \
  --function-name lazarus-api-relationships \
  --zip-file fileb://function.zip
```

### Step 5: Resume relationship generation
```bash
node scripts/generate-relationships-direct.mjs
```

## Expected Results

- Relationships reduced from ~3,287 to ~112 unique
- Graph performance dramatically improved
- Node with 1,598 connections reduced to ~23
- `occurrence_count` field shows how many times each relationship was discovered
- Future relationships automatically deduplicated

## Benefits

1. **Performance**: Graph loads much faster with 96% fewer edges
2. **Clarity**: Users see unique relationships, not duplicates
3. **Context**: `occurrence_count` shows relationship strength across documents
4. **Prevention**: Unique constraint prevents future duplicates

## Notes

- The `occurrence_count` field is useful for understanding how frequently a relationship appears across different documents
- Higher occurrence counts might indicate more important/consistent relationships
- The unique constraint only applies to active relationships (`is_active = TRUE`)
- Deactivated relationships can still have duplicates (by design, for historical tracking)

---

**Created**: 2026-03-17  
**Issue**: Massive relationship duplication (96.6%)  
**Status**: Fixed - cleanup script ready, Lambda updated, migration created
