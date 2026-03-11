#!/bin/bash

# Update AWS Secrets Manager with current database credentials
# This fixes Lambda authentication issues

set -e

echo "🔐 Updating AWS Secrets Manager secret: lazarus-db-credentials"

# Load environment variables
source .env

# Create secret JSON
SECRET_JSON=$(cat <<EOF
{
  "host": "${DB_HOST}",
  "port": ${DB_PORT},
  "dbname": "${DB_NAME}",
  "username": "${DB_USER}",
  "password": "${DB_PASSWORD}"
}
EOF
)

# Update the secret
aws secretsmanager update-secret \
  --secret-id lazarus-db-credentials \
  --secret-string "$SECRET_JSON" \
  --region ${AWS_REGION}

echo "✅ Secret updated successfully"
echo ""
echo "Note: Lambda functions will use the new credentials on next invocation"
echo "No redeployment needed - Lambdas fetch credentials at runtime"
