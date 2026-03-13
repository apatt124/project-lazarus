#!/bin/bash

# Check if medical.documents or medical_documents exists

set -e

if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

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

echo "Checking for documents table..."
echo ""

PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "
    -- Check medical.documents
    SELECT 'medical.documents' as table_name, COUNT(*) as row_count 
    FROM medical.documents;
    "

echo ""

PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "
    -- Show sample document
    SELECT id, document_type, upload_date, 
           LEFT(content_text, 100) as content_preview,
           metadata
    FROM medical.documents 
    LIMIT 3;
    "

echo ""

PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "
    -- Check if pgvector extension is installed
    SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
    "
