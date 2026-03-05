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

# Delete test documents from database
echo "Deleting test documents from database..."
PGPASSWORD=$DB_PASSWORD psql \
  -h lazarus-medical-db.cslknf9zl44o.us-east-1.rds.amazonaws.com \
  -U lazarus_admin \
  -d postgres \
  -c "DELETE FROM medical.documents WHERE s3_key LIKE 'test/%';"

# Delete test files from S3
echo ""
echo "Deleting test files from S3..."
aws s3 rm s3://project-lazarus-medical-docs-677625843326/test/ \
  --recursive \
  --region us-east-1

# Show remaining documents
echo ""
echo "✅ Test data cleaned!"
echo ""
echo "Remaining documents:"
./scripts/db-query.sh count
