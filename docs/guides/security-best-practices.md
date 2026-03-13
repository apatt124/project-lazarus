# Project Lazarus - Security Best Practices

## HIPAA Compliance

### AWS BAA
- Sign Business Associate Agreement with AWS
- Use only HIPAA-eligible services
- Document all PHI handling procedures

### Encryption
- At rest: KMS encryption for all storage
- In transit: TLS 1.2+ for all connections
- Key management: Customer-managed KMS keys
- Key rotation: Annual rotation recommended

### Access Control
- Principle of least privilege
- IAM roles over IAM users
- MFA required for console access
- Regular access reviews

## Data Protection

### S3 Security
```bash
# Block all public access
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

# Enable logging
aws s3api put-bucket-logging \
  --bucket $BUCKET_NAME \
  --bucket-logging-status file://logging.json
```

### Secrets Management
- Store API keys in Secrets Manager
- Rotate credentials regularly
- Never commit secrets to Git
- Use environment variables

## Network Security

### VPC Configuration (Optional)
- Deploy Lambda in VPC
- Use VPC endpoints for AWS services
- Network ACLs for additional security
- Security groups with minimal ports

### API Security
- API Gateway with authentication
- Rate limiting
- Request validation
- CORS properly configured

## Monitoring & Auditing

### CloudTrail
```bash
# Enable CloudTrail
aws cloudtrail create-trail \
  --name lazarus-audit-trail \
  --s3-bucket-name lazarus-audit-logs \
  --is-multi-region-trail
```

### CloudWatch Alarms
- Failed authentication attempts
- Unusual API call patterns
- High error rates
- Cost anomalies

### Log Analysis
- Centralize logs in CloudWatch
- Set up log retention policies
- Regular log reviews
- Automated anomaly detection

## Application Security

### Frontend
- Content Security Policy headers
- XSS protection
- CSRF tokens
- Secure session management
- No PHI in localStorage

### Backend
- Input validation
- SQL injection prevention (if using RDS)
- Rate limiting
- Error handling without info leakage

## Incident Response

### Preparation
1. Document incident response plan
2. Identify key contacts
3. Set up alerting
4. Regular drills

### Detection
- CloudWatch alarms
- GuardDuty for threat detection
- Security Hub for compliance

### Response
1. Isolate affected resources
2. Preserve evidence
3. Notify stakeholders
4. Remediate vulnerability
5. Document lessons learned

## Compliance Checklist

- [ ] AWS BAA signed
- [ ] All data encrypted at rest
- [ ] All data encrypted in transit
- [ ] Access controls implemented
- [ ] Audit logging enabled
- [ ] Regular security reviews scheduled
- [ ] Incident response plan documented
- [ ] Backup and recovery tested
- [ ] Vulnerability scanning enabled
- [ ] Penetration testing scheduled

## Regular Security Tasks

### Daily
- Monitor CloudWatch alarms
- Review error logs

### Weekly
- Review access logs
- Check for security updates

### Monthly
- Access review
- Cost review
- Security patch updates

### Quarterly
- Full security audit
- Disaster recovery test
- Update documentation

### Annually
- Penetration testing
- Compliance audit
- Key rotation
- Policy review
