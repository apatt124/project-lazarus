#!/bin/bash

# Database backup script
# Creates a timestamped backup of the PostgreSQL database

set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Create backups directory if it doesn't exist
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/lazarus_backup_$TIMESTAMP.sql"

echo "=== Database Backup ==="
echo "Host: $DB_HOST"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""

# Run pg_dump
echo "Creating backup..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "${DB_PORT:-5432}" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -F p \
  -f "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
  # Get file size
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo ""
  echo "✅ Backup complete!"
  echo "   File: $BACKUP_FILE"
  echo "   Size: $SIZE"
  echo ""
  
  # List recent backups
  echo "Recent backups:"
  ls -lh "$BACKUP_DIR" | tail -5
else
  echo ""
  echo "❌ Backup failed!"
  exit 1
fi
