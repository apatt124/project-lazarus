# Data Quality Improvement Results

## Summary (March 16, 2026)

Successfully ran AI relationship extraction to improve knowledge graph connectivity.

## Results

### Before Relationship Extraction
- **Facts**: 592
- **Relationships**: 213
- **Connected Facts**: ~50 (8%)
- **Isolated Facts**: ~542 (92%)
- **Disconnected Components**: 520

### After Relationship Extraction
- **Facts**: 773 (↑ 181 new facts)
- **Relationships**: 580 (↑ 367 new relationships, +172% increase!)
- **Connected Facts**: 201 (26%)
- **Isolated Facts**: 572 (74%)
- **Recent Relationships**: 25 created in last 30 minutes

### Key Improvements
- **Relationship density**: 0.36 → 0.75 relationships per fact (+108%)
- **Connected facts**: 8% → 26% (+225%)
- **Total relationships**: 213 → 580 (+172%)

## What Worked

### AI Relationship Extraction
Successfully ran 5 batches of 50 facts each using Claude AI to infer medical relationships.

**Process:**
1. Triggered async Lambda invocations (no timeouts)
2. Claude analyzed fact pairs for medical relationships
3. Created relationships with confidence scores
4. Stored in database with reasoning

**Example relationships created:**
- Medications → Conditions (treats)
- Symptoms → Conditions (caused_by)
- Test Results → Conditions (monitors)
- Providers → Procedures (performed_by)

## Current Challenges

### AI Layout Generation
With 773 nodes and 580 edges, Claude struggles to generate valid JSON for all positions.

**Issue**: JSON parsing errors at position ~8500
**Cause**: Response too large, Claude truncates or malforms JSON
**Impact**: AI layout only covers subset of nodes

### Remaining Isolated Facts
Still have 572 isolated facts (74%) that need relationships.

**Reasons:**
- Facts may be truly isolated (one-time observations)
- Need more relationship extraction runs
- Some facts may need manual review
- Cross-document relationships harder to detect

## Next Steps

### Short Term (This Week)

1. **Run More Relationship Extraction Batches**
   ```bash
   ./scripts/extract-relationships-async.sh 10 50
   ```
   - Process remaining isolated facts
   - Target: 400+ connected facts (50%+)

2. **Use Custom Layout for Now**
   - AI layout works for smaller subgraphs
   - Custom layout allows manual arrangement
   - Users can save preferred positions

3. **Review Relationship Quality**
   ```sql
   -- Check low-confidence relationships
   SELECT * FROM medical.relationships 
   WHERE strength < 0.5 AND is_active = TRUE
   ORDER BY strength ASC
   LIMIT 20;
   ```

### Medium Term (Next Month)

1. **Improve AI Layout for Large Graphs**
   
   Options:
   - **Chunking**: Generate layout for connected components separately
   - **Simplified prompt**: Ask for fewer nodes at a time
   - **Fallback strategy**: Use force-directed layout for nodes Claude doesn't position
   
   Implementation:
   ```javascript
   // In generateAILayout function
   if (nodes.length > 200) {
     // Split into connected components
     // Generate layout for each component separately
     // Combine results
   }
   ```

2. **Enhance Fact Extraction**
   
   Update `lambda/api-fact-extraction/index.mjs` to capture relationships during extraction:
   ```javascript
   const prompt = `Extract facts AND their relationships.
   
   For each fact, also identify:
   - What condition does this medication treat?
   - What condition causes this symptom?
   - What condition does this test monitor?
   
   Return both facts and relationships.`;
   ```

3. **Add Rule-Based Relationship Detection**
   
   Create `lambda/api-relationship-rules/index.mjs`:
   ```javascript
   // High-confidence rules
   const rules = [
     {
       pattern: /metformin/i,
       relatesTo: /diabetes|type 2/i,
       type: 'treats',
       confidence: 0.95
     },
     {
       pattern: /hba1c|hemoglobin a1c/i,
       relatesTo: /diabetes/i,
       type: 'monitors',
       confidence: 0.9
     }
   ];
   ```

### Long Term (Future)

1. **Manual Relationship Editor UI**
   - Click two nodes to connect
   - Select relationship type
   - Add reasoning/notes
   - Verify AI-generated relationships

2. **Relationship Quality Scoring**
   - User feedback on relationships
   - Track accuracy over time
   - Auto-improve prompts

3. **Medical Knowledge Base**
   - Common medications and uses
   - Symptoms and conditions
   - Test results and meanings
   - Use for rule-based detection

## Recommendations

### For Immediate Use

1. **Use the knowledge graph as-is**
   - 201 connected facts provide useful insights
   - Custom layout works well
   - Search and filtering functional

2. **Continue relationship extraction**
   - Run more batches weekly
   - Review and verify results
   - Delete low-quality relationships

3. **Focus on high-value relationships**
   - Medication → Condition
   - Test Result → Condition
   - Symptom → Condition
   - Provider → Procedure

### For Better AI Layout

**Option A: Reduce graph size**
- Filter by relationship strength (>0.7)
- Show only connected components
- Hide isolated facts

**Option B: Chunked generation**
- Generate layout for largest component first
- Add smaller components around it
- Combine into single layout

**Option C: Hybrid approach**
- AI layout for main cluster (50-100 nodes)
- Force-directed for remaining nodes
- User can refine with custom layout

## Monitoring

### Check Relationship Growth
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as relationships_created
FROM medical.relationships
WHERE is_active = TRUE
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 7;
```

### Check Connection Quality
```sql
SELECT 
  relationship_type,
  COUNT(*) as count,
  AVG(strength) as avg_confidence,
  MIN(strength) as min_confidence,
  MAX(strength) as max_confidence
FROM medical.relationships
WHERE is_active = TRUE
GROUP BY relationship_type
ORDER BY count DESC;
```

### Find Highly Connected Facts
```sql
SELECT 
  f.content,
  f.fact_type,
  COUNT(r.id) as connections
FROM medical.user_facts f
JOIN medical.relationships r ON (r.source_fact_id = f.id OR r.target_fact_id = f.id)
WHERE f.is_active = TRUE AND r.is_active = TRUE
GROUP BY f.id, f.content, f.fact_type
ORDER BY connections DESC
LIMIT 10;
```

## Success Metrics

### Current Progress
- ✅ Relationship extraction working
- ✅ 172% increase in relationships
- ✅ 225% increase in connected facts
- ⚠️ AI layout needs optimization for large graphs
- 🔄 More extraction runs needed

### Targets
- **Relationships**: 580 → 1000+ (target: 1.5 per fact)
- **Connected facts**: 26% → 60%+ (target: majority connected)
- **AI layout coverage**: Needs chunking strategy
- **User engagement**: Monitor usage patterns

## Conclusion

The AI relationship extraction was highly successful, nearly tripling the number of relationships and significantly improving graph connectivity. The knowledge graph is now much more useful for discovering connections between medical facts.

The main remaining challenge is optimizing AI layout generation for large graphs (773 nodes). This can be addressed through chunking strategies or by focusing AI layout on the most connected subgraphs.

---

**Date**: March 16, 2026
**Status**: Successful - Major improvement in data quality
**Next Action**: Continue relationship extraction, implement chunked AI layout
