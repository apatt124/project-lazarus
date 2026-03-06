#!/bin/bash

# Project Lazarus - Database Migration Runner
# This script runs database migrations against your RDS PostgreSQL instance

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection details
DB_HOST="${DB_HOST:-lazarus-medical-db.cslknf9zl44o.us-east-1.rds.amazonaws.com}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-lazarus_medical}"
DB_USER="${DB_USER:-lazarus_admin}"
DB_PASSWORD="${DB_PASSWORD}"

if [ -z "$DB_PASSWORD" ]; then
    echo "Error: DB_PASSWORD not set"
    echo "Please set it in .env file or export it as an environment variable"
    exit 1
fi

echo "=========================================="
echo "Project Lazarus - Database Migration"
echo "=========================================="
echo ""
echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "User: $DB_USER"
echo ""

# Check if migration file is specified
MIGRATION_FILE="${1:-migrations/001_add_conversations_and_memory.sql}"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "Running migration: $MIGRATION_FILE"
echo ""

# Run the migration
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ Migration completed successfully!"
    echo "=========================================="
else
    echo ""
    echo "=========================================="
    echo "✗ Migration failed!"
    echo "=========================================="
    exit 1
fi
