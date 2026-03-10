#!/bin/bash
# Quick script to get database password for RDS Query Editor

echo "🔑 Retrieving database password from Secrets Manager..."
echo ""

DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id lazarus/db-password \
  --query SecretString \
  --output text \
  --region us-east-1)

echo "Database Connection Info:"
echo "========================="
echo "Endpoint: ${DB_HOST}"
echo "Database: postgres"
echo "Username: lazarus_admin"
echo "Password: $DB_PASSWORD"
echo ""
echo "Copy the password above and use it in RDS Query Editor"
echo ""
echo "Next steps:"
echo "1. Go to AWS Console → RDS → Query Editor"
echo "2. Connect using the credentials above"
echo "3. Copy/paste contents of initialize-database.sql"
echo "4. Click 'Run'"
