#!/bin/bash
# Quick database queries

# Get DB credentials from environment or Secrets Manager
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DB_HOST="${DB_HOST}"
DB_USER="${DB_USER:-lazarus_admin}"
DB_NAME="${DB_NAME:-postgres}"

# Get password from Secrets Manager if not in environment
if [ -z "$DB_PASSWORD" ]; then
  DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id lazarus/db-password --query SecretString --output text)
fi

case "$1" in
  "list")
    echo "📋 All documents in database:"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
      SELECT 
        id, 
        s3_key, 
        LEFT(content_text, 80) as content_preview,
        metadata->>'filename' as filename
      FROM medical.documents 
      ORDER BY id;
    "
    ;;
    
  "count")
    echo "📊 Document statistics:"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN content_text IS NOT NULL AND content_text != '' THEN 1 END) as with_content,
        COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embedding,
        pg_size_pretty(pg_total_relation_size('medical.documents')) as table_size
      FROM medical.documents;
    "
    ;;
    
  "recent")
    echo "🕐 Most recent documents:"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
      SELECT 
        id,
        s3_key,
        metadata->>'filename' as filename,
        LENGTH(content_text) as content_length
      FROM medical.documents 
      ORDER BY id DESC
      LIMIT 5;
    "
    ;;
    
  "clean")
    echo "🧹 Cleaning up documents with PDF binary data..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
      DELETE FROM medical.documents 
      WHERE content_text LIKE '%PDF-1.%'
      RETURNING id, s3_key;
    "
    ;;
    
  *)
    echo "Usage: $0 {list|count|recent|clean}"
    echo ""
    echo "Commands:"
    echo "  list   - List all documents"
    echo "  count  - Show document statistics"
    echo "  recent - Show 5 most recent documents"
    echo "  clean  - Remove documents with PDF binary data"
    exit 1
    ;;
esac
