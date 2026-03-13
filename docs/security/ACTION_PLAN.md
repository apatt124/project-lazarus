# 🔐 Security Action Plan - IMMEDIATE ACTIONS REQUIRED

## Status: Repository Cleaned ✅ | Credentials Need Rotation ⚠️

Your repository has been cleaned of exposed credentials in code and documentation. However, since these credentials were present in your local files and may have been exposed, you must rotate them immediately.

## Quick Start: Automated Rotation

Run this script to rotate all credentials automatically:

```bash
./rotate-credentials.sh
```

This will:
1. Generate new secure passwords
2. Update AWS Secrets Manager
3. Rotate RDS master password
4. Update Lambda environment variables
5. Update your local `.env` file
6. Provide instructions for Amplify update

## Manual Rotation Steps

If you prefer manual control:

### Step 1: Rotate Database Password (5 minutes)

```bash
# Generate new password
NEW_DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "New DB Password: $NEW_DB_PASSWORD"

# Update Secrets Manager
aws secretsmanager update-secret \
  --secret-id lazarus/db-password \
  --secret-string "$NEW_DB_PASSWORD" \
  --region us-east-1

# Update RDS (takes 2-3 minutes)
aws rds modify-db-instance \
  --db-instance-identifier lazarus-medical-db \
  --master-user-password "$NEW_DB_PASSWORD" \
  --apply-immediately \
  --region us-east-1

# Update your .env file
# Replace DB_PASSWORD=old_password with DB_PASSWORD=$NEW_DB_PASSWORD
```

### Step 2: Rotate Application Password (3 minutes)

```bash
# Generate new password
NEW_APP_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
echo "New App Password: $NEW_APP_PASSWORD"

# Update Lambda functions
for FUNCTION in lazarus-api-auth lazarus-api-chat lazarus-api-memory lazarus-api-conversations lazarus-api-upload; do
  aws lambda update-function-configuration \
    --function-name $FUNCTION \
    --environment "Variables={APP_PASSWORD=$NEW_APP_PASSWORD,VECTOR_SEARCH_FUNCTION=lazarus-vector-search}" \
    --region us-east-1
done

# Update your .env file
# Replace APP_PASSWORD=old_password with APP_PASSWORD=$NEW_APP_PASSWORD
```

### Step 3: Update Amplify (2 minutes)

```bash
# Get your Amplify app ID
aws amplify list-apps --region us-east-1

# Update environment variable
aws amplify update-app \
  --app-id YOUR_AMPLIFY_APP_ID \
  --environment-variables APP_PASSWORD="$NEW_APP_PASSWORD" \
  --region us-east-1

# Trigger new deployment
aws amplify start-job \
  --app-id YOUR_AMPLIFY_APP_ID \
  --branch-name main \
  --job-type RELEASE \
  --region us-east-1
```

### Step 4: Store Credentials Securely

Save these in your password manager (1Password, LastPass, Bitwarden, etc.):

**Entry Name**: Project Lazarus - AWS Credentials

**Fields**:
- Database Password: [paste NEW_DB_PASSWORD]
- Application Password: [paste NEW_APP_PASSWORD]
- RDS Endpoint: [from .env DB_HOST]
- API Gateway URL: [from .env VITE_API_URL]
- AWS Account ID: [from .env AWS_ACCOUNT_ID]
- S3 Bucket: [from .env S3_BUCKET_NAME]

### Step 5: Test Everything (5 minutes)

```bash
# Test database connection
./scripts/db-query.sh count

# Test API authentication
curl -X POST "$VITE_API_URL/login" \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"$NEW_APP_PASSWORD\"}"

# Test conversation API
./test-conversation-history.sh

# Test memory system
./test-memory-system.sh
```

## What Was Changed

### Code Files (13 files)
All hardcoded credentials replaced with environment variables:
- Database connection files
- Lambda functions
- API routes
- Shell scripts

### Documentation Files (12 files)
All real credentials replaced with placeholders:
- Deployment guides
- Status documents
- Infrastructure configs
- README files

### Test Scripts (5 files)
Now load API URLs from `.env.local`:
- test-memory-system.sh
- test-conversation-history.sh
- test-document-upload.sh
- deploy-knowledge-graph.sh
- fix-memory-routes.sh

### New Security Files Created

1. **SECURITY-CREDENTIALS-GUIDE.md**
   - Complete credential management guide
   - Rotation procedures
   - Best practices
   - Emergency response

2. **rotate-credentials.sh**
   - Automated rotation script
   - Updates all AWS resources
   - Tests connectivity
   - Backs up old .env

3. **SECURITY-AUDIT-SUMMARY.md**
   - Detailed audit findings
   - Remediation actions
   - Verification checklist

4. **SECURITY-ACTION-PLAN.md** (this file)
   - Quick start guide
   - Step-by-step instructions
   - Testing procedures

## Current .env File Status

Your `.env` file currently contains:
- ✅ Properly gitignored (not tracked by git)
- ⚠️ Contains OLD credentials that need rotation
- ✅ Now includes all required variables
- ✅ Has security warnings

## Verification Checklist

After rotation, verify:

- [ ] Database password rotated in AWS
- [ ] Application password rotated in AWS
- [ ] Local `.env` file updated with new passwords
- [ ] Amplify environment variables updated
- [ ] Database connection works: `./scripts/db-query.sh count`
- [ ] Login works with new password
- [ ] API endpoints respond correctly
- [ ] Credentials saved in password manager
- [ ] Old `.env` backup saved
- [ ] Application tested end-to-end

## Timeline

- **Audit Completed**: March 10, 2026
- **Code Cleaned**: March 10, 2026
- **Rotation Required**: IMMEDIATELY
- **Estimated Time**: 15-20 minutes total

## Why This Matters

Your repository contains a medical records system with:
- Personal health information (PHI)
- Database with medical documents
- AI chat history
- Sensitive metadata

Exposed credentials could allow unauthorized:
- Database access (read/modify medical records)
- Application access (impersonate you)
- S3 access (download documents)
- Lambda invocation (incur costs)

## Support

If you encounter issues:

1. Check `SECURITY-CREDENTIALS-GUIDE.md` for detailed help
2. Review AWS CloudWatch logs for errors
3. Test in small steps (database first, then app)
4. Keep backups before making changes

## Quick Reference

**Rotation Script**:
```bash
./rotate-credentials.sh
```

**Manual Database Test**:
```bash
source .env
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;"
```

**Manual API Test**:
```bash
source .env.local
curl -X POST "$VITE_API_URL/login" \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"$APP_PASSWORD\"}"
```

---

**Priority**: 🔴 CRITICAL  
**Action Required**: Rotate credentials immediately  
**Estimated Time**: 15-20 minutes  
**Difficulty**: Easy (automated script provided)
