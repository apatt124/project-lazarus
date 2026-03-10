#!/bin/bash

# Project Lazarus - Database Migration Runner
# This script runs database migrations against your RDS PostgreSQL instance

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection details
DB_HOST="${DB_HOST}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-lazarus_medical}"
DB_USER="${DB_USER}"
DB_PASSWORD="${DB_PASSWORD}"

if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "Error: DB_HOST, DB_USER, and DB_PASSWORD environment variables are required"
    echo "Set them in .env file or export them before running this script"
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
