# Security & Credentials Management Guide

## ⚠️ IMPORTANT: Credential Rotation Required

If you're seeing this file, your repository has been cleaned of exposed credentials. However, you should rotate all credentials immediately as they may have been exposed in git history.

## Immediate Actions Required

### 1. Rotate Database Password

```bash
# Generate new secure password
NEW_DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Update in AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id lazarus/db-password \
  --secret-string "$NEW_DB_PASSWORD" \
  --region us-east-1

# Update RDS master password
aws rds modify-db-instance \
  --db-instance-identifier lazarus-medical-db \
  --master-user-password "$NEW_DB_PASSWORD" \
  --apply-immediately \
  --region us-east-1

# Save to your local .env file (DO NOT COMMIT)
echo "DB_PASSWORD=$NEW_DB_PASSWORD" >> .env
```

### 2. Change Application Password

```bash
# Generate new app password
NEW_APP_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)

# Update in Amplify
aws amplify update-app \
  --app-id YOUR_AMPLIFY_APP_ID \
  --environment-variables APP_PASSWORD="$NEW_APP_PASSWORD" \
  --region us-east-1

# Update Lambda environment variables
aws lambda update-function-configuration \
  --function-name lazarus-api-auth \
  --environment "Variables={APP_PASSWORD=$NEW_APP_PASSWORD}" \
  --region us-east-1

# Save to your password manager
echo "New APP_PASSWORD: $NEW_APP_PASSWORD"
```

### 3. Review AWS Security

```bash
# Check for unauthorized access
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=ConsoleLogin \
  --max-results 50 \
  --region us-east-1

# Review RDS access logs
aws rds describe-db-log-files \
  --db-instance-identifier lazarus-medical-db \
  --region us-east-1
```

## Secure Credential Storage

### Local Development (.env file)

Create a `.env` file in your project root (already gitignored):

```bash
# Database Configuration
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=lazarus_admin
DB_PASSWORD=your_secure_db_password

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your_account_id

# Lambda Configuration
AWS_LAMBDA_FUNCTION_NAME=lazarus-vector-search

# S3 Configuration
S3_BUCKET_NAME=your-s3-bucket-name

# Application Password
APP_PASSWORD=your_secure_app_password

# API Gateway
VITE_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod
```

### AWS Secrets Manager (Production)

Store sensitive credentials in AWS Secrets Manager:

```bash
# Database credentials
aws secretsmanager create-secret \
  --name lazarus/db-password \
  --secret-string "your_secure_password" \
  --region us-east-1

# Application password
aws secretsmanager create-secret \
  --name lazarus/app-password \
  --secret-string "your_app_password" \
  --region us-east-1
```

### Password Manager

Use a password manager (1Password, LastPass, Bitwarden) to store:
- Database password
- Application password
- AWS account credentials
- API Gateway URLs
- RDS endpoints

## Security Best Practices

### 1. Never Commit Credentials

Files that should NEVER be committed:
- `.env`
- `.env.local`
- `.env.production`
- Any file containing passwords, API keys, or secrets

Verify with:
```bash
git check-ignore .env .env.local
# Should output both files
```

### 2. Use Environment Variables

Always reference credentials via environment variables:

```javascript
// ✅ GOOD
const password = process.env.DB_PASSWORD;

// ❌ BAD
const password = "hardcoded_password";
```

### 3. Rotate Credentials Regularly

Set a reminder to rotate credentials every 90 days:
- Database passwords
- Application passwords
- AWS access keys (if using)

### 4. Use IAM Roles (Not Access Keys)

For Lambda functions and EC2 instances, use IAM roles instead of access keys:

```bash
# Lambda automatically uses its execution role
# No need to store AWS credentials in code
```

### 5. Enable MFA

Enable Multi-Factor Authentication on:
- AWS root account
- AWS IAM users
- GitHub account

### 6. Monitor Access

Set up CloudWatch alarms for:
- Failed login attempts
- Unusual database access patterns
- Lambda errors
- API Gateway 4xx/5xx errors

## Git History Cleanup (Optional)

If credentials were committed to git history, consider:

### Option 1: BFG Repo-Cleaner (Recommended)

```bash
# Install BFG
brew install bfg  # macOS
# or download from https://rtyley.github.io/bfg-repo-cleaner/

# Remove .env files from history
bfg --delete-files .env
bfg --delete-files .env.local

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: This rewrites history)
git push --force
```

### Option 2: Start Fresh (Nuclear Option)

If the repository is private and you want a clean slate:

1. Create a new repository
2. Copy current files (excluding .git)
3. Initialize new git repo
4. Push to new repository
5. Delete old repository

## Verification Checklist

After rotating credentials, verify:

- [ ] Database connection works with new password
- [ ] Application login works with new password
- [ ] Lambda functions can access Secrets Manager
- [ ] No credentials in git history
- [ ] `.env` files are gitignored
- [ ] Documentation doesn't contain real credentials
- [ ] Password manager has all credentials saved
- [ ] MFA enabled on AWS account
- [ ] CloudWatch alarms configured

## Emergency Response

If you suspect credentials have been compromised:

1. **Immediately rotate all credentials**
2. **Check AWS CloudTrail for unauthorized access**
3. **Review RDS logs for suspicious queries**
4. **Check S3 access logs**
5. **Review Lambda execution logs**
6. **Consider enabling AWS GuardDuty**
7. **Contact AWS Support if needed**

## Additional Resources

- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [OWASP Credential Management](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Storage_Cheat_Sheet.html)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security/getting-started/best-practices-for-preventing-data-leaks-in-your-organization)

## Support

If you need help with credential rotation or security:
1. Check AWS documentation
2. Review CloudWatch logs
3. Test in development environment first
4. Keep backups before making changes

---

**Last Updated**: March 10, 2026
**Status**: Credentials cleaned from repository, rotation required
