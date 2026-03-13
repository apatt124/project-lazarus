---
inclusion: always
---

# CRITICAL SECURITY REMINDER: PUBLIC REPOSITORY

## ⚠️ THIS REPOSITORY IS PUBLIC ON GITHUB

This repository contains a medical records management system and is publicly accessible. You must NEVER expose sensitive information.

## ABSOLUTE RULES - NEVER VIOLATE

### 1. NEVER Store Credentials in Code or Documentation

❌ **FORBIDDEN**:
- Hardcoded passwords in any file
- Database connection strings with credentials
- API keys or secrets in code
- AWS account IDs in documentation
- RDS endpoints in code files
- S3 bucket names in code files
- API Gateway URLs in code files
- Real credentials in markdown files
- Real credentials in comments
- Example credentials that are real

✅ **REQUIRED**:
- Always use environment variables: `process.env.DB_PASSWORD`
- Always use placeholders in docs: `your_password_here`
- Always use generic examples: `your-rds-endpoint.region.rds.amazonaws.com`
- Always reference `.env` file for local credentials
- Always use AWS Secrets Manager for production

### 2. NEVER Commit .env Files

The following files must NEVER be committed:
- `.env`
- `.env.local`
- `.env.production`
- `.env.development`
- Any file containing real passwords

**Verify before any commit**:
```bash
git status | grep -E "\.env"
git check-ignore .env .env.local
```

### 3. ALWAYS Use Environment Variables

**NEVER ask the user for passwords** - all credentials are stored in AWS Secrets Manager or environment variables. The user does not know passwords and should never be prompted to enter them.

**In Code**:
```javascript
// ✅ CORRECT
const dbHost = process.env.DB_HOST;
const password = process.env.DB_PASSWORD;

// ❌ WRONG - NEVER DO THIS
const dbHost = "lazarus-medical-db.cslknf9zl44o.us-east-1.rds.amazonaws.com";
const password = "actual_password_here";
```

**For Database Access**:
- Use Lambda functions that retrieve credentials from AWS Secrets Manager
- Use the API endpoints that are already configured (VITE_API_URL)
- NEVER attempt direct database connections that require password input

**In Shell Scripts**:
```bash
# ✅ CORRECT
DB_HOST="${DB_HOST}"
DB_PASSWORD="${DB_PASSWORD}"

# ❌ WRONG - NEVER DO THIS
DB_HOST="lazarus-medical-db.cslknf9zl44o.us-east-1.rds.amazonaws.com"
DB_PASSWORD="actual_password_here"
```

**In Documentation**:
```markdown
✅ CORRECT:
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod

❌ WRONG - NEVER DO THIS:
DB_HOST=lazarus-medical-db.cslknf9zl44o.us-east-1.rds.amazonaws.com
API_URL=https://spgwp4ei7f.execute-api.us-east-1.amazonaws.com/prod
```

### 4. ALWAYS Review Before Committing

Before any git commit or push:

1. **Check for credentials**:
   ```bash
   git diff | grep -i "password\|secret\|key"
   ```

2. **Check for endpoints**:
   ```bash
   git diff | grep -E "amazonaws\.com|rds\.|execute-api"
   ```

3. **Check for account IDs**:
   ```bash
   git diff | grep -E "[0-9]{12}"
   ```

4. **Verify .env not staged**:
   ```bash
   git status | grep -E "\.env"
   ```

### 5. MEDICAL DATA PRIVACY

This system stores MEDICAL RECORDS. Extra caution required:

- Never include sample medical data with real patient info
- Never commit database dumps
- Never include real names, dates, or medical details in examples
- Always use generic placeholders: `[patient_name]`, `[date]`, `[condition]`

## Pre-Commit Checklist

Before EVERY commit, verify:

- [ ] No passwords in code
- [ ] No API keys in code
- [ ] No database credentials in code
- [ ] No real AWS account IDs
- [ ] No real RDS endpoints
- [ ] No real API Gateway URLs
- [ ] No real S3 bucket names
- [ ] No .env files staged
- [ ] All examples use placeholders
- [ ] No real medical data in examples

## If You Accidentally Commit Credentials

**STOP IMMEDIATELY**:

1. **Do NOT push to GitHub**
2. **Amend the commit**:
   ```bash
   git reset HEAD~1
   # Remove credentials from files
   git add .
   git commit -m "Your message"
   ```

3. **If already pushed**:
   - Rotate ALL credentials immediately
   - Use BFG Repo-Cleaner to remove from history
   - Force push cleaned history
   - See `SECURITY-CREDENTIALS-GUIDE.md`

## Environment Variable Reference

All credentials must be in `.env` (gitignored):

```bash
# Database
DB_HOST=
DB_PASSWORD=
DB_USER=
DB_NAME=
DB_PORT=

# AWS
AWS_REGION=
AWS_ACCOUNT_ID=
AWS_LAMBDA_FUNCTION_NAME=
S3_BUCKET_NAME=
API_GATEWAY_ID=

# Application
APP_PASSWORD=
VITE_API_URL=
```

## Code Review Checklist

When reviewing code changes:

- [ ] No hardcoded credentials
- [ ] Environment variables used correctly
- [ ] No sensitive data in logs
- [ ] No credentials in error messages
- [ ] No credentials in comments
- [ ] Documentation uses placeholders
- [ ] Test scripts load from .env

## Emergency Contacts

If credentials are exposed:

1. **Rotate immediately**: `./rotate-credentials.sh`
2. **Check AWS CloudTrail** for unauthorized access
3. **Review RDS logs** for suspicious queries
4. **Check S3 access logs** for unauthorized downloads
5. **Enable AWS GuardDuty** if not already enabled

## Remember

This is a PUBLIC repository containing a MEDICAL RECORDS system. Security is not optional - it's mandatory. Every commit must be reviewed for credential exposure.

**When in doubt, use environment variables and placeholders.**

---

**Created**: March 10, 2026  
**Purpose**: Prevent credential exposure in public repository  
**Severity**: CRITICAL  
**Always Active**: YES
