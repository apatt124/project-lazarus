# CLI Tools Upgraded ✅

## Summary

All command-line tools have been upgraded to the latest versions, and new helper scripts have been created to make testing and managing Lazarus much easier.

## What Was Upgraded

### AWS CLI: v2.2.4 → v2.34.2 ✅

**Before:** 2021 version, missing Bedrock commands
**After:** Latest 2026 version with full Bedrock support

**New capabilities:**
- `aws bedrock` commands
- `aws bedrock-runtime` for model invocation
- Better error messages
- Faster performance
- Support for inference profiles

### Model Upgrade: Claude 3.5 Sonnet → Claude Sonnet 4.5 ✅

**Why:** Claude 3.5 Sonnet v2 was marked as "legacy" by AWS
**Solution:** Upgraded to Claude Sonnet 4.5 (latest and most capable)

**Benefits:**
- More intelligent responses
- Better medical knowledge
- Improved reasoning
- Same cost structure
- Future-proof

## New Helper Scripts

Created 6 powerful scripts in `scripts/` directory:

### 1. test-bedrock.sh
Test Claude AI access
```bash
./scripts/test-bedrock.sh
# ✅ Success! Response: Lazarus is working!
```

### 2. test-search.sh
Test vector search
```bash
./scripts/test-search.sh "blood pressure"
# ✅ Found 3 documents
```

### 3. test-chat.sh
Test full conversational AI
```bash
./scripts/test-chat.sh "What's my blood pressure?"
# ✅ Chat successful! Answer: According to your records...
```

### 4. db-query.sh
Database management
```bash
./scripts/db-query.sh count    # Statistics
./scripts/db-query.sh list     # All documents
./scripts/db-query.sh recent   # Recent uploads
./scripts/db-query.sh clean    # Remove bad data
```

### 5. logs.sh
View Lambda logs
```bash
./scripts/logs.sh              # Last 10 minutes
./scripts/logs.sh lazarus-vector-search 30  # Last 30 minutes
```

### 6. check-costs.sh
Monitor AWS costs
```bash
./scripts/check-costs.sh
# 💰 Lazarus Project Costs: ~$15-20/month
```

## Tool Versions (All Latest)

```
✅ AWS CLI: v2.34.2
✅ jq: v1.7.1
✅ PostgreSQL: v14.20
✅ Python: v3.11.5
✅ Node: v25.3.0
✅ npm: v11.6.2
```

## Quick Start

### Test Everything
```bash
# 1. Test Bedrock
./scripts/test-bedrock.sh

# 2. Test search
./scripts/test-search.sh "medical history"

# 3. Test chat (requires dev server)
./scripts/test-chat.sh "Hello!"

# 4. Check database
./scripts/db-query.sh count
```

### Monitor in Real-Time
```bash
# Terminal 1: Watch logs
./scripts/logs.sh

# Terminal 2: Run tests
./scripts/test-search.sh "test"

# Terminal 3: Check database
watch -n 2 './scripts/db-query.sh count'
```

### Debug Issues
```bash
# Check what's in database
./scripts/db-query.sh list

# View recent activity
./scripts/logs.sh

# Test AI access
./scripts/test-bedrock.sh

# Check costs
./scripts/check-costs.sh
```

## Benefits

### For Development
- ✅ Quick testing without UI
- ✅ Debug issues faster
- ✅ Monitor real-time activity
- ✅ Verify deployments

### For Operations
- ✅ Check system health
- ✅ Monitor costs
- ✅ Database maintenance
- ✅ Log analysis

### For Troubleshooting
- ✅ Test each component independently
- ✅ Identify bottlenecks
- ✅ Verify configurations
- ✅ Check permissions

## Documentation

Full documentation available in:
- `scripts/README.md` - Comprehensive guide
- Each script has inline comments
- Help text: `./scripts/script-name.sh --help` (where applicable)

## Examples

### Workflow: Upload and Verify

```bash
# 1. Check current state
./scripts/db-query.sh count

# 2. Upload file via UI (http://localhost:3737)

# 3. Watch logs during upload
./scripts/logs.sh

# 4. Verify document stored
./scripts/db-query.sh recent

# 5. Test search
./scripts/test-search.sh "content from uploaded file"

# 6. Test chat
./scripts/test-chat.sh "What's in my latest document?"
```

### Workflow: Debug Search Issues

```bash
# 1. Test Bedrock access
./scripts/test-bedrock.sh

# 2. Check documents in database
./scripts/db-query.sh list

# 3. Test vector search
./scripts/test-search.sh "test query"

# 4. View Lambda logs
./scripts/logs.sh

# 5. Test full chat pipeline
./scripts/test-chat.sh "test query"
```

### Workflow: Cost Monitoring

```bash
# Weekly cost check
./scripts/check-costs.sh

# Check document count (affects storage costs)
./scripts/db-query.sh count

# Clean up unnecessary documents
./scripts/db-query.sh clean
```

## Cost Impact

Scripts are designed to be cost-effective:
- Most scripts: $0 (free tier)
- test-bedrock.sh: ~$0.0001 per run
- test-chat.sh: ~$0.01 per run
- Total monthly script usage: < $1

## Troubleshooting

### "Command not found"
```bash
chmod +x scripts/*.sh
```

### "AWS credentials not configured"
```bash
aws configure
```

### "Connection refused" (test-chat.sh)
```bash
cd frontend && npm run dev
```

### "Database connection failed"
```bash
# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier lazarus-medical-db
```

## Next Steps

### Immediate
- [x] Upgrade AWS CLI
- [x] Create helper scripts
- [x] Update to Claude Sonnet 4.5
- [x] Test all scripts
- [x] Document usage

### Optional Enhancements
- [ ] Add script for bulk document upload
- [ ] Create backup/restore scripts
- [ ] Add performance benchmarking
- [ ] Create deployment automation
- [ ] Add health check script

## Files Created/Modified

### New Files
- `scripts/test-bedrock.sh` - Test AI access
- `scripts/test-search.sh` - Test vector search
- `scripts/test-chat.sh` - Test conversational AI
- `scripts/db-query.sh` - Database management
- `scripts/logs.sh` - View Lambda logs
- `scripts/check-costs.sh` - Monitor costs
- `scripts/README.md` - Comprehensive documentation

### Modified Files
- `frontend/app/api/chat/route.ts` - Updated to Claude Sonnet 4.5

### System Upgrades
- AWS CLI: v2.2.4 → v2.34.2
- Model: Claude 3.5 Sonnet → Claude Sonnet 4.5

## Success Criteria ✅

- [x] AWS CLI upgraded to latest version
- [x] Bedrock commands working
- [x] Claude Sonnet 4.5 accessible
- [x] All helper scripts created
- [x] Scripts tested and working
- [x] Documentation complete
- [x] No additional costs
- [x] Easier development workflow

## Ready to Use!

All tools are installed and ready. Try them out:

```bash
# Quick test
./scripts/test-bedrock.sh
./scripts/test-search.sh "test"
./scripts/db-query.sh count

# Full documentation
cat scripts/README.md
```

The CLI tools make it much easier to develop, test, and maintain Lazarus! 🎉
