# Secure Credential Storage Guide

## Overview

After rotating your credentials, you need to store them securely. This guide shows you how to safely manage your Project Lazarus credentials.

## Recommended: Password Manager

### Best Options

1. **1Password** (Recommended)
   - Industry standard
   - Excellent security
   - Cross-platform
   - Team sharing available
   - Cost: $3-8/month

2. **Bitwarden**
   - Open source
   - Self-hosting option
   - Good security
   - Free tier available
   - Cost: Free or $10/year

3. **LastPass**
   - Popular choice
   - Good features
   - Cross-platform
   - Cost: Free or $3/month

### How to Store in Password Manager

Create a new entry with these fields:

**Entry Name**: Project Lazarus - AWS Infrastructure

**Category**: Server / Database

**Fields to Store**:
```
Title: Project Lazarus AWS Credentials
Username: lazarus_admin
Password: [Your DB Password]

Custom Fields:
- DB_HOST: [Your RDS endpoint]
- DB_PORT: 5432
- DB_NAME: postgres
- DB_USER: lazarus_admin
- DB_PASSWORD: [Your DB password]
- APP_PASSWORD: [Your app password]
- AWS_ACCOUNT_ID: [Your AWS account ID]
- AWS_REGION: us-east-1
- S3_BUCKET_NAME: [Your S3 bucket]
- API_GATEWAY_ID: [Your API Gateway ID]
- VITE_API_URL: [Your API Gateway URL]

Notes:
- Rotated on: [Date]
- Next rotation: [Date + 90 days]
- Used for: Medical records management system
```

### Password Manager CLI Access

Most password managers have CLI tools for easy access:

**1Password CLI**:
```bash
# Install
brew install 1password-cli

# Login
op signin

# Get password
op item get "Project Lazarus" --fields password
```

**Bitwarden CLI**:
```bash
# Install
npm install -g @bitwarden/cli

# Login
bw login

# Get password
bw get password "Project Lazarus"
```

## Alternative: AWS Secrets Manager

For production use, store credentials in AWS Secrets Manager:

### Store Database Credentials

```bash
# Create secret with all DB info
aws secretsmanager create-secret \
  --name lazarus/db-credentials \
  --secret-string '{
    "host": "your-rds-endpoint.region.rds.amazonaws.com",
    "port": "5432",
    "dbname": "postgres",
    "username": "lazarus_admin",
    "password": "your_db_password"
  }' \
  --region us-east-1
```

### Store Application Password

```bash
# Create secret for app password
aws secretsmanager create-secret \
  --name lazarus/app-password \
  --secret-string "your_app_password" \
  --region us-east-1
```

### Retrieve from Secrets Manager

```bash
# Get DB credentials
aws secretsmanager get-secret-value \
  --secret-id lazarus/db-credentials \
  --query SecretString \
  --output text | jq -r '.password'

# Get app password
aws secretsmanager get-secret-value \
  --secret-id lazarus/db-password \
  --query SecretString \
  --output text
```

### Update Lambda to Use Secrets Manager

Your Lambda functions already use Secrets Manager for database credentials. To add app password:

```javascript
// In lambda/api-auth/index.mjs
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManagerClient({ region: 'us-east-1' });

async function getAppPassword() {
  const command = new GetSecretValueCommand({
    SecretId: 'lazarus/app-password',
  });
  const response = await secretsManager.send(command);
  return response.SecretString;
}

export const handler = async (event) => {
  const correctPassword = await getAppPassword();
  // ... rest of code
};
```

## Local Development: .env File

For local development, keep credentials in `.env` file:

### Security Rules

1. **NEVER commit .env to git**
   ```bash
   # Verify it's ignored
   git check-ignore .env
   ```

2. **Set proper permissions**
   ```bash
   chmod 600 .env
   ```

3. **Keep backups**
   ```bash
   # Backup before rotation
   cp .env .env.backup.$(date +%Y%m%d)
   ```

4. **Use .env.example for templates**
   ```bash
   # Share template, not actual credentials
   git add .env.example
   ```

### .env File Format

```bash
# Project Lazarus - Environment Configuration
# SECURITY WARNING: This file contains sensitive credentials
# NEVER commit this file to git

# Database credentials
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

# API Gateway Configuration
API_GATEWAY_ID=your-api-gateway-id
VITE_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod

# Application Password
APP_PASSWORD=your_secure_app_password

# Rotated on: 2026-03-10
# Next rotation: 2026-06-08
```

## Backup Strategy

### 1. Encrypted Backup

Create an encrypted backup of your `.env` file:

```bash
# Encrypt with GPG
gpg --symmetric --cipher-algo AES256 .env

# This creates .env.gpg
# Store this in a secure location (not in git!)

# To decrypt later:
gpg --decrypt .env.gpg > .env
```

### 2. Secure Cloud Storage

Store encrypted backup in:
- Personal encrypted cloud storage (not in git repo)
- USB drive in safe location
- Encrypted external hard drive

### 3. Paper Backup (Optional)

For critical credentials, consider a paper backup:
1. Print credentials
2. Store in safe or safety deposit box
3. Update when rotated

## Team Sharing (If Applicable)

If you need to share credentials with team members:

### Option 1: Password Manager Sharing
- 1Password: Create shared vault
- Bitwarden: Use organization
- LastPass: Use shared folders

### Option 2: AWS Secrets Manager + IAM
```bash
# Grant team member access to secrets
aws secretsmanager put-resource-policy \
  --secret-id lazarus/db-credentials \
  --resource-policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:user/team-member"
      },
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "*"
    }]
  }'
```

### Option 3: Encrypted File Transfer
```bash
# Encrypt for specific recipient
gpg --encrypt --recipient team@example.com .env

# Send .env.gpg via secure channel
# Recipient decrypts with their private key
```

## Credential Rotation Schedule

Set reminders to rotate credentials:

### Calendar Reminders

Add to your calendar:
- **Every 90 days**: Rotate database password
- **Every 90 days**: Rotate application password
- **Every 90 days**: Rotate AWS access keys (if using)
- **Every 30 days**: Review access logs

### Automated Reminders

Create a cron job to remind you:

```bash
# Add to crontab
# Remind every 90 days to rotate credentials
0 9 1 */3 * echo "Time to rotate Project Lazarus credentials!" | mail -s "Credential Rotation Reminder" you@example.com
```

## Emergency Access

In case you lose access to credentials:

### Recovery Steps

1. **AWS Console Access**
   - Use root account (if you have MFA)
   - Reset RDS password via console
   - Update Secrets Manager

2. **Database Access**
   - Use AWS Systems Manager Session Manager
   - Connect to RDS via bastion host
   - Reset password via SQL

3. **Backup Recovery**
   - Decrypt backup .env file
   - Restore from password manager
   - Use paper backup (if created)

### Prevention

- Enable MFA on AWS root account
- Keep recovery codes in safe place
- Maintain multiple backup methods
- Document recovery procedures

## Security Best Practices

### Do's ✅

- Use a password manager
- Enable MFA everywhere
- Rotate credentials regularly
- Keep backups encrypted
- Use AWS Secrets Manager for production
- Set proper file permissions (chmod 600)
- Review access logs regularly

### Don'ts ❌

- Don't commit .env to git
- Don't share credentials via email
- Don't store in plain text files
- Don't use same password for multiple services
- Don't share credentials in Slack/Teams
- Don't store in browser password manager
- Don't write passwords in code comments

## Verification Checklist

After setting up credential storage:

- [ ] Credentials stored in password manager
- [ ] Encrypted backup created
- [ ] Backup stored in secure location
- [ ] .env file has proper permissions (600)
- [ ] .env file is gitignored
- [ ] Calendar reminders set for rotation
- [ ] Team members have access (if needed)
- [ ] Recovery procedure documented
- [ ] MFA enabled on AWS account
- [ ] Access logs monitoring configured

## Tools & Resources

### Password Managers
- 1Password: https://1password.com
- Bitwarden: https://bitwarden.com
- LastPass: https://lastpass.com

### AWS Tools
- Secrets Manager: https://aws.amazon.com/secrets-manager/
- Systems Manager: https://aws.amazon.com/systems-manager/
- IAM: https://aws.amazon.com/iam/

### Security Tools
- GPG: https://gnupg.org
- AWS CLI: https://aws.amazon.com/cli/
- jq: https://stedolan.github.io/jq/

## Support

If you need help:
1. Check AWS Secrets Manager documentation
2. Review password manager documentation
3. Consult `SECURITY-CREDENTIALS-GUIDE.md`
4. Contact AWS Support (for AWS issues)

---

**Last Updated**: March 10, 2026  
**Next Review**: June 10, 2026  
**Status**: Active
