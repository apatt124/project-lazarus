# RDS + pgvector vs OpenSearch Serverless

Comparison for Project Lazarus medical history system.

## Cost Comparison

| Service | Monthly Cost |
|---------|--------------|
| **RDS + pgvector** | **$16-19** |
| OpenSearch Serverless | $179 |
| **Savings** | **$160 (90%)** |

## Performance Comparison

### Query Latency
- **OpenSearch**: 10-50ms
- **RDS + pgvector**: 50-200ms
- **Impact**: Negligible for personal use (1 user)

### Throughput
- **OpenSearch**: 1000+ queries/second
- **RDS + pgvector**: 50-100 queries/second (db.t4g.micro)
- **Your needs**: <10 queries/hour

### Scalability
- **OpenSearch**: Millions of vectors, auto-scales
- **RDS + pgvector**: 100K-1M vectors on small instance
- **Your needs**: <10K documents (years of medical records)

## Feature Comparison

### Vector Search Quality
- **Both**: Identical (same embedding model, same similarity metrics)
- **Winner**: Tie

### Data Management
- **OpenSearch**: Separate vector store, need DynamoDB for structured data
- **RDS + pgvector**: Vectors + structured data in one database
- **Winner**: RDS (simpler architecture)

### Query Flexibility
- **OpenSearch**: Advanced query DSL, aggregations, faceting
- **RDS + pgvector**: Standard SQL + vector similarity
- **Winner**: OpenSearch (but overkill for this use case)

### Maintenance
- **OpenSearch**: Fully managed, auto-scaling
- **RDS + pgvector**: Managed database, manual scaling
- **Winner**: OpenSearch (but both are low-maintenance)

## Integration Complexity

### With Bedrock Agent
- **OpenSearch**: Native integration via Knowledge Base
- **RDS + pgvector**: Custom Lambda function (~150 lines of code)
- **Winner**: OpenSearch (but RDS is still straightforward)

### Development Effort
- **OpenSearch**: Zero code (Bedrock handles everything)
- **RDS + pgvector**: ~2-3 hours to implement Lambda functions
- **Winner**: OpenSearch

## Recommendation

### Choose RDS + pgvector if:
- ✅ Cost is a concern ($16 vs $179/month)
- ✅ Personal use (1 user, <10K documents)
- ✅ Want structured data + vectors in one place
- ✅ Comfortable with SQL
- ✅ Don't need sub-50ms query times

### Choose OpenSearch if:
- ✅ Cost is not a concern
- ✅ Multi-user application (10+ concurrent users)
- ✅ Large scale (100K+ documents)
- ✅ Need advanced analytics and aggregations
- ✅ Want zero-code integration with Bedrock

## For Project Lazarus

**Recommendation: RDS + pgvector**

Reasons:
1. 90% cost savings ($160/month)
2. Performance is more than adequate for 1 user
3. Simpler data model (everything in PostgreSQL)
4. Easy to query with SQL for custom reports
5. Can always migrate to OpenSearch later if needed

## Migration Path

If you start with RDS and later need OpenSearch:

1. Export vectors from PostgreSQL
2. Create OpenSearch collection
3. Import vectors using Bedrock Knowledge Base
4. Update agent configuration
5. Estimated migration time: 2-4 hours

The architecture is designed to make this migration straightforward.
