#!/bin/bash
# Credential Rotation Script for Project Lazarus
# This script helps you rotate all sensitive credentials

set -e

echo "🔐 Project Lazarus - Credential Rotation"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This will rotate all credentials and update AWS resources"
echo "Make sure you have:"
echo "  - AWS CLI configured with admin permissions"
echo "  - Backup of current .env file"
echo "  - Access to update Amplify environment variables"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# Load current configuration
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo ""
echo "Step 1: Generating new credentials..."
echo "======================================"

# Generate new passwords
NEW_DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
NEW_APP_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)

echo "✓ New credentials generated"
echo ""

echo "Step 2: Updating database password..."
echo "======================================"

# Update in Secrets Manager
aws secretsmanager update-secret \
  --secret-id lazarus/db-password \
  --secret-string "$NEW_DB_PASSWORD" \
  --region ${AWS_REGION:-us-east-1}

echo "✓ Updated in Secrets Manager"

# Update RDS master password
echo "Updating RDS instance (this may take a few minutes)..."
aws rds modify-db-instance \
  --db-instance-identifier lazarus-medical-db \
  --master-user-password "$NEW_DB_PASSWORD" \
  --apply-immediately \
  --region ${AWS_REGION:-us-east-1}

echo "✓ RDS password updated"
echo ""

echo "Step 3: Updating application password..."
echo "=========================================="

# Update Lambda environment variables
for FUNCTION in lazarus-api-auth lazarus-api-chat lazarus-api-memory lazarus-api-conversations lazarus-api-upload; do
  echo "Updating $FUNCTION..."
  aws lambda update-function-configuration \
    --function-name $FUNCTION \
    --environment "Variables={APP_PASSWORD=$NEW_APP_PASSWORD,VECTOR_SEARCH_FUNCTION=${AWS_LAMBDA_FUNCTION_NAME:-lazarus-vector-search}}" \
    --region ${AWS_REGION:-us-east-1} \
    > /dev/null 2>&1 || echo "  (Function may not exist)"
done

echo "✓ Lambda functions updated"
echo ""

echo "Step 4: Updating local .env file..."
echo "======================================"

# Backup current .env
if [ -f .env ]; then
  cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
  echo "✓ Backed up current .env"
fi

# Update .env file
cat > .env << EOF
# Project Lazarus - Environment Configuration
# SECURITY WARNING: This file contains sensitive credentials
# NEVER commit this file to git. It should be in .gitignore

# Database credentials
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-postgres}
DB_USER=${DB_USER:-lazarus_admin}
DB_PASSWORD=$NEW_DB_PASSWORD

# AWS Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}

# Lambda Configuration
AWS_LAMBDA_FUNCTION_NAME=${AWS_LAMBDA_FUNCTION_NAME:-lazarus-vector-search}

# S3 Configuration
S3_BUCKET_NAME=${S3_BUCKET_NAME}

# API Gateway Configuration
API_GATEWAY_ID=${API_GATEWAY_ID}
VITE_API_URL=${VITE_API_URL}

# Application Password
APP_PASSWORD=$NEW_APP_PASSWORD

# Rotated on: $(date)
EOF

echo "✓ Updated .env file"
echo ""

echo "Step 5: Manual steps required..."
echo "======================================"
echo ""
echo "You must manually update Amplify environment variables:"
echo ""
echo "1. Go to AWS Amplify Console:"
echo "   https://console.aws.amazon.com/amplify/home?region=${AWS_REGION:-us-east-1}"
echo ""
echo "2. Select your app and go to 'Environment variables'"
echo ""
echo "3. Update APP_PASSWORD to:"
echo "   $NEW_APP_PASSWORD"
echo ""
echo "4. Redeploy your Amplify app"
echo ""
echo "Or use AWS CLI:"
echo "aws amplify update-app \\"
echo "  --app-id YOUR_AMPLIFY_APP_ID \\"
echo "  --environment-variables APP_PASSWORD=$NEW_APP_PASSWORD \\"
echo "  --region ${AWS_REGION:-us-east-1}"
echo ""

echo "=========================================="
echo "✅ Credential Rotation Complete!"
echo "=========================================="
echo ""
echo "📋 Summary:"
echo "  - Database password: ROTATED ✓"
echo "  - Application password: ROTATED ✓"
echo "  - Secrets Manager: UPDATED ✓"
echo "  - Lambda functions: UPDATED ✓"
echo "  - Local .env: UPDATED ✓"
echo "  - Amplify: MANUAL UPDATE REQUIRED ⚠️"
echo ""
echo "🔒 Save these credentials securely:"
echo ""
echo "Database Password: $NEW_DB_PASSWORD"
echo "App Password: $NEW_APP_PASSWORD"
echo ""
echo "⚠️  Store these in your password manager NOW!"
echo ""
echo "Old .env backed up to: .env.backup.$(date +%Y%m%d_%H%M%S)"
echo ""

# Test database connection
echo "Testing database connection..."
if command -v psql &> /dev/null; then
  PGPASSWORD="$NEW_DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -U "${DB_USER:-lazarus_admin}" \
    -d "${DB_NAME:-postgres}" \
    -c "SELECT 1;" > /dev/null 2>&1 && \
    echo "✓ Database connection successful" || \
    echo "⚠️  Database connection failed - RDS may still be updating"
else
  echo "⚠️  psql not installed, skipping connection test"
fi

echo ""
echo "Done! Remember to update Amplify and test your application."
