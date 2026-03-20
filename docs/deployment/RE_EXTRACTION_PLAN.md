# Re-Extraction Plan - Clean Start with Improved Quality

## Overview
Complete re-extraction of all medical facts with improved quality, duplicate detection, and relationship extraction.

## What Will Be Deleted

### ⚠️ Data to be Removed:
1. **All extracted facts** (`medical.user_facts`)
2. **All relationships** (`medical.relationships`)
3. **All fact occurrences** (`medical.fact_occurrences`)
4. **All knowledge graph changes** (`medical.knowledge_graph_changes`)
5. **AI layout cache** (`medical.ai_layout_cache`)

### ✅ Data to be Preserved:
1. **Original documents** (`medical.documents`) - All uploaded files stay
2. **Document content** - Text extracted from PDFs/images
3. **Conversations** - Chat history
4. **Messages** - All chat messages

## Improvements in New Extraction

### Fact Extraction:
1. ✅ **Semantic duplicate detection** - "T2DM" = "Type 2 Diabetes"
2. ✅ **Exact duplicate check** - Fast pre-check before AI
3. ✅ **Better date extraction** - Extracts when events occurred
4. ✅ **Standardized terminology** - Consistent medical terms
5. ✅ **Avoid temporal states** - "Pregnancy" not "36 weeks gestation"
6. ✅ **Better confidence scoring** - Calibrated 0.5-1.0
7. ✅ **Metadata standardization** - Consistent keys and units
8. ✅ **Fact validation** - Checks dates, confidence, content
9. ✅ **Occurrence tracking** - Multiple instances consolidated

### Relationship Extraction:
1. ✅ **13 relationship types** - More specific than before
2. ✅ **Avoid vague "related_to"** - Only use as last resort
3. ✅ **Temporal context** - Consider dates for causality
4. ✅ **Better reasoning** - Clinical explanations with mechanisms
5. ✅ **Quality thresholds** - Won't create weak relationships
6. ✅ **Prioritization** - Focus on high-value connections

### Document Processing:
1. ✅ **Smart paragraph chunking** - No mid-sentence splits
2. ✅ **Upgraded to Sonnet 4** - Better vision extraction
3. ✅ **Automatic metadata extraction** - Date, provider, type
4. ✅ **1000 char overlap** - Better context preservation

## Expected Results

### Before (Current State):
- Facts: ~792
- Relationships: ~580
- Many duplicates (e.g., "Allergic to penicillin" x3)
- Vague relationships (174 "related_to")
- Missing dates (55% of conditions)
- Inconsistent metadata

### After (Expected):
- Facts: ~500-600 (fewer due to deduplication)
- Relationships: ~400-500 (higher quality)
- No exact duplicates
- Specific relationship types
- Better date coverage (80%+)
- Standardized metadata
- Occurrence tracking for repeated facts

## Re-Extraction Process

### Step 1: Backup (Optional)
```bash
# Export current data for backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -t medical.user_facts \
  -t medical.relationships \
  -t medical.fact_occurrences \
  > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Clear Data
```sql
DELETE FROM medical.knowledge_graph_changes;
DELETE FROM medical.relationships;
DELETE FROM medical.fact_occurrences;
DELETE FROM medical.user_facts;
DELETE FROM medical.ai_layout_cache;
```

### Step 3: Extract Facts
- Process all documents in order
- Extract facts with improved prompts
- Detect duplicates (exact + semantic)
- Track occurrences
- Validate data quality

### Step 4: Extract Relationships
- Analyze all facts in batches
- Create specific relationships
- Avoid weak connections
- Consider temporal context

### Step 5: Generate Layout
- Trigger AI layout generation
- Cache for performance
- Optimize node positions

## Running the Re-Extraction

### Prerequisites:
```bash
# Ensure environment variables are set
export DB_HOST=your-db-host
export DB_PORT=5432
export DB_NAME=postgres
export DB_USER=your-user
export DB_PASSWORD=your-password
export AWS_REGION=us-east-1
```

### Execute:
```bash
node scripts/clean-and-reextract.mjs
```

### What It Does:
1. Shows current stats
2. Asks for confirmation
3. Clears all data
4. Extracts facts from all documents
5. Extracts relationships
6. Generates AI layout
7. Shows final stats

### Expected Duration:
- Small dataset (10-20 docs): 2-5 minutes
- Medium dataset (50-100 docs): 10-20 minutes
- Large dataset (200+ docs): 30-60 minutes

## Monitoring Progress

### Watch Logs:
```bash
# Lambda logs for fact extraction
aws logs tail /aws/lambda/lazarus-fact-extraction --follow

# Lambda logs for relationships
aws logs tail /aws/lambda/lazarus-api-relationships --follow
```

### Check Progress:
```sql
-- Count facts as they're extracted
SELECT COUNT(*) FROM medical.user_facts WHERE is_active = TRUE;

-- Count relationships
SELECT COUNT(*) FROM medical.relationships WHERE is_active = TRUE;

-- Check for duplicates (should be 0)
SELECT content, COUNT(*) 
FROM medical.user_facts 
WHERE is_active = TRUE 
GROUP BY content 
HAVING COUNT(*) > 1;
```

## Quality Checks After Re-Extraction

### 1. Duplicate Check:
```sql
-- Should return 0 rows
SELECT content, COUNT(*) as count
FROM medical.user_facts
WHERE is_active = TRUE
GROUP BY content
HAVING COUNT(*) > 1;
```

### 2. Date Coverage:
```sql
-- Should be 80%+
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE fact_date IS NOT NULL) as with_dates,
  ROUND(100.0 * COUNT(*) FILTER (WHERE fact_date IS NOT NULL) / COUNT(*), 1) as percentage
FROM medical.user_facts
WHERE is_active = TRUE;
```

### 3. Relationship Quality:
```sql
-- Should have fewer "related_to"
SELECT relationship_type, COUNT(*) as count
FROM medical.relationships
WHERE is_active = TRUE
GROUP BY relationship_type
ORDER BY count DESC;
```

### 4. Confidence Distribution:
```sql
-- Should have good distribution
SELECT 
  CASE 
    WHEN confidence >= 0.95 THEN '0.95-1.0 (Excellent)'
    WHEN confidence >= 0.85 THEN '0.85-0.95 (Good)'
    WHEN confidence >= 0.70 THEN '0.70-0.85 (Fair)'
    ELSE 'Below 0.70 (Review)'
  END as confidence_range,
  COUNT(*) as count
FROM medical.user_facts
WHERE is_active = TRUE
GROUP BY confidence_range
ORDER BY confidence_range DESC;
```

### 5. Occurrence Tracking:
```sql
-- Check facts with multiple occurrences
SELECT 
  f.content,
  COUNT(o.id) as occurrence_count
FROM medical.user_facts f
LEFT JOIN medical.fact_occurrences o ON o.fact_id = f.id
WHERE f.is_active = TRUE
GROUP BY f.id, f.content
HAVING COUNT(o.id) > 0
ORDER BY COUNT(o.id) DESC
LIMIT 10;
```

## Rollback Plan

If re-extraction fails or results are poor:

### Option 1: Restore from Backup
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup_YYYYMMDD_HHMMSS.sql
```

### Option 2: Re-run Extraction
```bash
# Fix any issues in Lambda code
# Deploy updated code
# Run script again
node scripts/clean-and-reextract.mjs
```

## Success Criteria

✅ **Extraction successful if:**
1. No exact duplicates in facts
2. Date coverage > 80%
3. Fewer "related_to" relationships
4. Confidence scores well-distributed
5. Occurrence tracking working
6. All documents processed
7. Knowledge graph renders correctly

## Post-Extraction Tasks

1. **Verify in UI**:
   - Check knowledge graph
   - Verify facts are consolidated
   - Check relationship quality

2. **Test Queries**:
   - Search for conditions
   - View timeline
   - Check fact sources

3. **Monitor Performance**:
   - Graph load time
   - Query response time
   - AI layout quality

4. **Document Results**:
   - Before/after stats
   - Quality improvements
   - Any issues found

---

**Created**: March 16, 2026  
**Status**: Ready to execute  
**Risk**: Low (documents preserved, can re-run)  
**Duration**: 10-60 minutes depending on dataset size
