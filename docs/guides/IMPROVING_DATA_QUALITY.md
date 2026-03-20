# Improving Knowledge Graph Data Quality

## Current Situation

Your database has:
- **592 facts** (medical information extracted from documents)
- **213 relationships** (connections between facts)
- **520 disconnected components** (isolated facts with no connections)

This means only ~8% of facts are connected, limiting the usefulness of the knowledge graph.

## Why This Happens

1. **Fact extraction is easier than relationship extraction**
   - Facts are explicit in documents ("Patient has diabetes")
   - Relationships require inference ("Metformin treats diabetes")

2. **Documents may not mention connections**
   - A lab report shows "HbA1c: 7.2%" but doesn't say it relates to diabetes
   - A prescription lists "Metformin" but doesn't explain why

3. **Cross-document relationships are missed**
   - Document A mentions diabetes diagnosis
   - Document B mentions Metformin prescription
   - System doesn't connect them automatically

## Strategies to Improve

### Strategy 1: AI Relationship Extraction (Recommended)

Use Claude to analyze existing facts and infer relationships.

**How it works:**
- Takes batches of facts (e.g., 50 at a time)
- Sends to Claude with medical knowledge
- Claude identifies relationships (e.g., "Metformin treats Type 2 Diabetes")
- Stores relationships in database

**Pros:**
- ✅ Works on existing data
- ✅ No new documents needed
- ✅ Finds cross-document relationships
- ✅ Uses medical knowledge

**Cons:**
- ⏱️ Takes time (2-3 minutes per batch of 50 facts)
- 💰 Uses Claude API calls
- ⚠️ May create false positives (needs review)

**How to run:**

Option A - Via API (when endpoint is configured):
```bash
curl -X POST ${VITE_API_URL}/relationships/extract-all \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 50, "maxBatches": 10}'
```

Option B - Via Lambda directly:
```bash
aws lambda invoke \
  --function-name lazarus-api-relationships \
  --cli-binary-format raw-in-base64-out \
  --payload '{"path":"/relationships/extract-all","httpMethod":"POST","body":"{\"batchSize\":50,\"maxBatches\":5}"}' \
  --invocation-type Event \
  /tmp/response.json
```

Option C - In batches (to avoid timeouts):
```bash
# Run 5 batches, wait between each
for i in {1..5}; do
  echo "Running batch $i..."
  aws lambda invoke \
    --function-name lazarus-api-relationships \
    --cli-binary-format raw-in-base64-out \
    --payload '{"path":"/relationships/extract","httpMethod":"POST","body":"{\"batchSize\":50}"}' \
    --invocation-type Event \
    /tmp/response_$i.json
  sleep 120  # Wait 2 minutes between batches
done
```

**Expected results:**
- 50 facts → ~20-30 new relationships
- 500 facts → ~200-300 new relationships
- Reduces disconnected components significantly

### Strategy 2: Improve Fact Extraction Prompts

Enhance the fact extraction to also capture relationships.

**Current prompt:** Extracts facts only
**Enhanced prompt:** Extracts facts AND mentions related facts

**Example:**
```
Current: "Metformin 500mg twice daily"
Enhanced: "Metformin 500mg twice daily (for Type 2 Diabetes management)"
```

**Implementation:**
1. Update `lambda/api-fact-extraction/index.mjs`
2. Modify the Claude prompt to ask for context
3. Parse relationships from the enhanced facts
4. Store both facts and relationships

**Pros:**
- ✅ Captures relationships at extraction time
- ✅ More accurate (from source document)
- ✅ No separate processing needed

**Cons:**
- ⏱️ Requires code changes
- 🔄 Only helps for new documents
- 📝 Doesn't fix existing data

### Strategy 3: Manual Relationship Creation

Add a UI for users to create relationships manually.

**Features needed:**
- Click two nodes to connect them
- Select relationship type (treats, causes, etc.)
- Add reasoning/notes
- Save to database

**Pros:**
- ✅ 100% accurate (human verified)
- ✅ Can add domain expertise
- ✅ Good for critical relationships

**Cons:**
- ⏱️ Time-consuming
- 👤 Requires medical knowledge
- 📊 Doesn't scale to 500+ facts

### Strategy 4: Rule-Based Relationship Detection

Create rules to automatically detect common patterns.

**Examples:**
```javascript
// Rule 1: Medication + Condition
if (fact1.type === 'medication' && fact2.type === 'medical_condition') {
  if (medicationTreatsCondition(fact1.content, fact2.content)) {
    createRelationship(fact1, fact2, 'treats', 0.8);
  }
}

// Rule 2: Symptom + Condition
if (fact1.type === 'symptom' && fact2.type === 'medical_condition') {
  if (symptomIndicatesCondition(fact1.content, fact2.content)) {
    createRelationship(fact2, fact1, 'causes', 0.7);
  }
}

// Rule 3: Test Result + Condition
if (fact1.type === 'test_result' && fact2.type === 'medical_condition') {
  if (testMonitorsCondition(fact1.content, fact2.content)) {
    createRelationship(fact1, fact2, 'monitors', 0.9);
  }
}
```

**Pros:**
- ✅ Fast (no AI calls)
- ✅ Deterministic
- ✅ Can run continuously

**Cons:**
- 📝 Requires medical knowledge database
- ⚠️ May miss nuanced relationships
- 🔧 Needs maintenance

### Strategy 5: Temporal Relationship Detection

Connect facts that occur close together in time.

**Logic:**
```javascript
// Facts within 30 days are likely related
if (Math.abs(fact1.date - fact2.date) < 30 days) {
  createRelationship(fact1, fact2, 'related_to', 0.5);
}
```

**Pros:**
- ✅ Simple to implement
- ✅ Finds temporal patterns
- ✅ No AI needed

**Cons:**
- ⚠️ Low confidence (correlation ≠ causation)
- 📊 Creates many weak relationships
- 🗓️ Requires accurate dates

## Recommended Approach

### Phase 1: Quick Wins (This Week)

1. **Run AI Relationship Extraction** on existing facts
   - Start with 5 batches of 50 facts each
   - Review results
   - Expand if quality is good

2. **Monitor Results**
   ```sql
   -- Check relationship growth
   SELECT COUNT(*) FROM medical.relationships WHERE is_active = TRUE;
   
   -- Check connected components
   SELECT COUNT(DISTINCT component_id) 
   FROM (
     SELECT id, 
            ROW_NUMBER() OVER () as component_id
     FROM medical.user_facts
     WHERE NOT EXISTS (
       SELECT 1 FROM medical.relationships r
       WHERE r.source_fact_id = id OR r.target_fact_id = id
     )
   ) isolated_facts;
   ```

3. **Regenerate AI Layout**
   ```bash
   ./scripts/generate-ai-layout.sh default
   ```

### Phase 2: Systematic Improvement (Next Month)

1. **Enhance Fact Extraction**
   - Update prompts to capture context
   - Extract relationships during fact extraction
   - Test on new documents

2. **Add Rule-Based Detection**
   - Start with high-confidence rules
   - Medication → Condition
   - Test Result → Condition
   - Expand gradually

3. **Build Medical Knowledge Base**
   - Common medications and their uses
   - Symptoms and associated conditions
   - Test results and what they monitor

### Phase 3: Advanced Features (Future)

1. **Manual Relationship Editor**
   - UI for creating/editing relationships
   - Verification workflow
   - Confidence scoring

2. **Relationship Quality Scoring**
   - Track accuracy of AI-generated relationships
   - User feedback mechanism
   - Auto-improve prompts

3. **Cross-Patient Patterns**
   - Anonymized pattern detection
   - Population-level insights
   - Improved relationship inference

## Measuring Success

### Key Metrics

1. **Relationship Density**
   ```
   Current: 213 relationships / 592 facts = 0.36 relationships per fact
   Target: 1.5+ relationships per fact
   ```

2. **Connected Components**
   ```
   Current: 520 components (87% isolated)
   Target: < 50 components (< 10% isolated)
   ```

3. **AI Layout Coverage**
   ```
   Current: 44 / 592 nodes = 7% coverage
   Target: 400+ / 592 nodes = 70%+ coverage
   ```

4. **User Engagement**
   - Time spent on knowledge graph
   - Number of searches
   - Relationship verifications

### Quality Checks

After running relationship extraction:

```sql
-- Check relationship types distribution
SELECT relationship_type, COUNT(*) as count
FROM medical.relationships
WHERE is_active = TRUE
GROUP BY relationship_type
ORDER BY count DESC;

-- Check confidence distribution
SELECT 
  CASE 
    WHEN strength >= 0.9 THEN 'Very High (0.9-1.0)'
    WHEN strength >= 0.7 THEN 'High (0.7-0.9)'
    WHEN strength >= 0.5 THEN 'Medium (0.5-0.7)'
    ELSE 'Low (< 0.5)'
  END as confidence_level,
  COUNT(*) as count
FROM medical.relationships
WHERE is_active = TRUE
GROUP BY confidence_level
ORDER BY MIN(strength) DESC;

-- Find most connected facts
SELECT 
  f.content,
  f.fact_type,
  COUNT(r.id) as connection_count
FROM medical.user_facts f
JOIN medical.relationships r ON (r.source_fact_id = f.id OR r.target_fact_id = f.id)
WHERE f.is_active = TRUE AND r.is_active = TRUE
GROUP BY f.id, f.content, f.fact_type
ORDER BY connection_count DESC
LIMIT 20;
```

## Troubleshooting

### "Relationship extraction times out"
- Reduce batch size (try 25 instead of 50)
- Use async invocation (Event type)
- Run in smaller batches with delays

### "Too many false positive relationships"
- Increase confidence threshold (filter < 0.7)
- Review and delete low-quality relationships
- Improve Claude prompt with more constraints

### "Relationships not showing in graph"
- Check `is_active = TRUE` on relationships
- Verify both facts exist and are active
- Clear and regenerate AI layout cache

### "AI layout still shows few nodes"
- Check connected components count
- Verify relationships were created
- May need more relationship extraction runs

## Next Steps

1. Run the relationship extraction script (see Strategy 1)
2. Monitor Lambda logs for progress
3. Check database for new relationships
4. Regenerate AI layout cache
5. Review results in knowledge graph UI

---

**Created**: March 13, 2026
**Purpose**: Guide for improving knowledge graph data quality
**Priority**: High - directly impacts user experience
