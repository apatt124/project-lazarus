#!/bin/bash
# Clean all test data from the database and S3

echo "🧹 Cleaning test data from Project Lazarus..."
echo ""

# Get database password
DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id lazarus/db-password \
  --query SecretString \
  --output text \
  --region us-east-1)

# Load other DB config from environment
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DB_HOST="${DB_HOST}"
DB_USER="${DB_USER:-lazarus_admin}"
DB_NAME="${DB_NAME:-postgres}"

if [ -z "$DB_HOST" ]; then
  echo "Error: DB_HOST not set in .env file"
  exit 1
fi

# Delete test documents from database
echo "Deleting test documents from database..."
PGPASSWORD=$DB_PASSWORD psql \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -c "DELETE FROM medical.documents WHERE s3_key LIKE 'test/%';"

# Delete test files from S3
echo ""
echo "Deleting test files from S3..."
S3_BUCKET="${S3_BUCKET_NAME}"

if [ -z "$S3_BUCKET" ]; then
  echo "Error: S3_BUCKET_NAME not set in .env file"
  exit 1
fi

aws s3 rm "s3://${S3_BUCKET}/test/" \
  --recursive \
  --region us-east-1

# Show remaining documents
echo ""
echo "✅ Test data cleaned!"
echo ""
echo "Remaining documents:"
./scripts/db-query.sh count
