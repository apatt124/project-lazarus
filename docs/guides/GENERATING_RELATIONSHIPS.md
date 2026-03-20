# Generating Relationships Between Facts

This guide explains how to generate relationships between your medical facts using AI.

## Overview

The relationship generation process:
1. Takes facts from your database
2. Uses AI (Claude) to identify meaningful connections
3. Creates relationship records linking related facts
4. Can be paused and resumed at any time

## Quick Start

```bash
# Run the relationship generator
node scripts/generate-relationships.mjs
```

The script will:
- Process facts in batches of 50
- Show progress after each batch
- Save progress automatically
- Can be stopped with Ctrl+C and resumed later

## Features

### Resumable
- Press Ctrl+C to pause at any time
- Progress is saved automatically after each batch
- Run the script again to resume from where you left off
- Progress file: `scripts/.relationship-generation-progress.json`

### Progress Tracking
```
--- Batch 5/100 ---
✓ Relationships created: 23
  Facts processed: 50
  Context facts: 100
  Time: 45.2s
  Running total: 115 relationships, 250 facts (3.8m, avg 23.0/batch)
```

### Error Handling
- Retries failed batches automatically
- Stops after 3 consecutive errors
- Saves progress before exiting
- Shows clear error messages

## Running in Background

### Option 1: Using nohup (macOS/Linux)
```bash
nohup node scripts/generate-relationships.mjs > relationship-generation.log 2>&1 &
```

View progress:
```bash
tail -f relationship-generation.log
```

Stop the process:
```bash
# Find the process ID
ps aux | grep generate-relationships

# Kill it (it will save progress)
kill <PID>
```

### Option 2: Using screen (macOS/Linux)
```bash
# Start a screen session
screen -S relationships

# Run the script
node scripts/generate-relationships.mjs

# Detach: Press Ctrl+A then D

# Reattach later
screen -r relationships
```

### Option 3: Using tmux (macOS/Linux)
```bash
# Start a tmux session
tmux new -s relationships

# Run the script
node scripts/generate-relationships.mjs

# Detach: Press Ctrl+B then D

# Reattach later
tmux attach -t relationships
```

## Monitoring Progress

### Check Database
```bash
# Count relationships
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
  "SELECT COUNT(*) FROM medical.relationships WHERE is_active = true;"

# Count facts with relationships
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
  "SELECT 
    COUNT(DISTINCT source_fact_id) + COUNT(DISTINCT target_fact_id) as facts_with_relationships
   FROM medical.relationships 
   WHERE is_active = true;"
```

### Check Progress File
```bash
cat scripts/.relationship-generation-progress.json
```

## Troubleshooting

### Script Won't Resume
If the script starts from scratch instead of resuming:
```bash
# Check if progress file exists
ls -la scripts/.relationship-generation-progress.json

# View progress file
cat scripts/.relationship-generation-progress.json
```

### API Timeouts
If you're getting timeouts:
- The Lambda function has a 120-second timeout
- Each batch should complete in 30-60 seconds
- If batches are timing out, reduce batch size in the script

### No Relationships Created
If batches process but create 0 relationships:
- Facts might be too dissimilar to relate
- AI might not find meaningful connections
- Check Lambda logs for errors:
  ```bash
  aws logs tail /aws/lambda/lazarus-api-relationships --follow
  ```

### Out of Memory
If the Lambda runs out of memory:
- Current Lambda has 2048MB
- Reduce batch size in the script
- Or increase Lambda memory in AWS Console

## Performance

### Expected Times
- Batch size: 50 facts
- Time per batch: 30-60 seconds
- Relationships per batch: 15-30 (varies)
- Total time for 2000 facts: 30-60 minutes

### Optimization Tips
1. Run during off-peak hours
2. Use background execution
3. Monitor Lambda CloudWatch metrics
4. Increase Lambda memory if needed

## After Generation

Once relationships are generated:

1. **Refresh Knowledge Graph**
   - Open your app
   - Navigate to Knowledge Graph
   - Graph should now show nodes and connections

2. **Verify Results**
   ```bash
   # Count relationships by type
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
     "SELECT relationship_type, COUNT(*) 
      FROM medical.relationships 
      WHERE is_active = true 
      GROUP BY relationship_type 
      ORDER BY COUNT(*) DESC;"
   ```

3. **Check Quality**
   - Review some relationships in the UI
   - Check if connections make sense
   - Look at relationship reasoning

## Cleaning Up

### Clear Progress File
```bash
rm scripts/.relationship-generation-progress.json
```

### Regenerate All Relationships
```bash
# Delete existing relationships
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
  "DELETE FROM medical.relationships;"

# Clear progress file
rm scripts/.relationship-generation-progress.json

# Run generator
node scripts/generate-relationships.mjs
```

## Advanced Usage

### Custom Batch Size
Edit `scripts/generate-relationships.mjs`:
```javascript
const batchSize = 25; // Smaller batches for slower processing
```

### Custom Max Batches
```javascript
const maxBatches = 200; // Process more batches
```

### Skip Existing Relationships
The script automatically skips facts that already have relationships. To force regeneration, delete existing relationships first.

## Related Documentation

- `docs/fixes/LAMBDA_CORS_FIX_COMPLETE.md` - CORS fix details
- `docs/deployment/DEPLOY_LAMBDA_CORS_FIX.md` - Lambda deployment
- `lambda/api-relationships/index.mjs` - Relationship extraction code

---

**Created**: March 17, 2026  
**Purpose**: Guide for generating relationships between facts  
**Status**: Ready to use
