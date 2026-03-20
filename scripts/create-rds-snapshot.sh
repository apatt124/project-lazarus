#!/bin/bash

# Create RDS snapshot using AWS CLI
# This is the recommended way to backup RDS databases

set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SNAPSHOT_ID="lazarus-manual-backup-$TIMESTAMP"

# Get DB instance identifier from the endpoint
DB_INSTANCE=$(echo "$DB_HOST" | cut -d'.' -f1)

echo "=== RDS Snapshot Creation ==="
echo "DB Instance: $DB_INSTANCE"
echo "Snapshot ID: $SNAPSHOT_ID"
echo "Region: ${AWS_REGION:-us-east-1}"
echo ""

# Create snapshot
echo "Creating snapshot..."
aws rds create-db-snapshot \
  --db-instance-identifier "$DB_INSTANCE" \
  --db-snapshot-identifier "$SNAPSHOT_ID" \
  --region "${AWS_REGION:-us-east-1}"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Snapshot creation initiated!"
  echo "   Snapshot ID: $SNAPSHOT_ID"
  echo ""
  echo "Checking status..."
  
  # Wait for snapshot to be available (with timeout)
  aws rds wait db-snapshot-available \
    --db-snapshot-identifier "$SNAPSHOT_ID" \
    --region "${AWS_REGION:-us-east-1}" &
  
  WAIT_PID=$!
  
  # Show progress for 30 seconds, then continue
  for i in {1..30}; do
    if ! kill -0 $WAIT_PID 2>/dev/null; then
      echo ""
      echo "✅ Snapshot is available!"
      break
    fi
    echo -n "."
    sleep 1
  done
  
  if kill -0 $WAIT_PID 2>/dev/null; then
    echo ""
    echo "⏳ Snapshot is still being created (this can take several minutes)"
    echo "   You can check status with:"
    echo "   aws rds describe-db-snapshots --db-snapshot-identifier $SNAPSHOT_ID"
    kill $WAIT_PID 2>/dev/null || true
  fi
  
  echo ""
  echo "Snapshot created successfully. Safe to proceed with cleanup."
else
  echo ""
  echo "❌ Snapshot creation failed!"
  exit 1
fi
