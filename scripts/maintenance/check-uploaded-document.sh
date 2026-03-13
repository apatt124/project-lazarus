#!/bin/bash

if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Load from environment or .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DB_HOST="${DB_HOST}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-lazarus_medical}"
DB_USER="${DB_USER:-lazarus_admin}"

echo "Checking for recently uploaded documents..."
echo ""

PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "
    SELECT 
        id,
        LEFT(content_text, 100) as content_preview,
        upload_date,
        document_type,
        metadata->>'provider' as provider
    FROM medical.documents 
    WHERE upload_date > NOW() - INTERVAL '1 hour'
    ORDER BY upload_date DESC
    LIMIT 5;
    "
