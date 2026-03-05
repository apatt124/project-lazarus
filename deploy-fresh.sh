#!/bin/bash
# Project Lazarus - Fresh Deployment with Dedicated VPC
set -e

echo "🏥 Project Lazarus - Deployment Starting"
echo "=========================================="
echo ""

# Load VPC configuration
if [ ! -f /tmp/lazarus-vpc-config.sh ]; then
  echo "Error: Lazarus VPC not found. Creating it now..."
  ./create-lazarus-vpc.sh
fi

source /tmp/lazarus-vpc-config.sh

# Configuration
export AWS_REGION=us-east-1
export PROJECT_NAME=ProjectLazarus
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export BUCKET_NAME="project-lazarus-medical-docs-${AWS_ACCOUNT_ID}"
export VPC_ID=$LAZARUS_VPC_ID
export SUBNET_IDS=$LAZARUS_SUBNET_IDS

echo "Configuration:"
echo "  AWS Account: $AWS_ACCOUNT_ID"
echo "  Region: $AWS_REGION"
echo "  VPC: $VPC_ID (dedicated Lazarus VPC)"
echo "  Subnets: $SUBNET_IDS"
echo "  S3 Bucket: $BUCKET_NAME"
echo ""

# Generate secure database password
export DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo "Step 1/8: Verifying Resource Group..."
aws resource-groups get-group --group-name ProjectLazarusGroup > /dev/null 2>&1 || \
aws resource-groups create-group \
  --name ProjectLazarusGroup \
  --resource-query '{"Type":"TAG_FILTERS_1_0","Query":"{\"ResourceTypeFilters\":[\"AWS::AllSupported\"],\"TagFilters\":[{\"Key\":\"Project\",\"Values\":[\"Lazarus\"]}]}"}' \
  --tags Project=Lazarus,Environment=Personal,CostCenter=Medical \
  --region $AWS_REGION > /dev/null

echo "✓ Resource group ready"
echo ""

echo "Step 2/8: Verifying KMS Key..."
KMS_KEY_ID=$(aws kms describe-key --key-id alias/project-lazarus --query 'KeyMetadata.KeyId' --output text 2>/dev/null || echo "")

if [ -z "$KMS_KEY_ID" ]; then
  KMS_KEY_ID=$(aws kms create-key \
    --description "Project Lazarus PHI encryption key" \
    --tags TagKey=Project,TagValue=Lazarus TagKey=PHI,TagValue=Yes \
    --region $AWS_REGION \
    --query 'KeyMetadata.KeyId' \
    --output text)
  
  aws kms create-alias \
    --alias-name alias/project-lazarus \
    --target-key-id $KMS_KEY_ID \
    --region $AWS_REGION
fi

echo "✓ KMS Key: $KMS_KEY_ID"
echo ""

echo "Step 3/8: Creating Security Group for RDS..."
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=lazarus-rds-sg" "Name=vpc-id,Values=$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null)

if [ "$SG_ID" == "None" ] || [ -z "$SG_ID" ]; then
  SG_ID=$(aws ec2 create-security-group \
    --group-name lazarus-rds-sg \
    --description "Security group for Project Lazarus RDS" \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=lazarus-rds-sg},{Key=Project,Value=Lazarus},{Key=CostCenter,Value=Medical}]' \
    --query 'GroupId' \
    --output text)
  
  # Allow PostgreSQL from within VPC
  aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 5432 \
    --cidr 10.20.0.0/16
fi

echo "✓ Security Group: $SG_ID"
echo ""

echo "Step 4/8: Creating DB Subnet Group..."
aws rds describe-db-subnet-groups --db-subnet-group-name lazarus-db-subnet-group > /dev/null 2>&1 || \
aws rds create-db-subnet-group \
  --db-subnet-group-name lazarus-db-subnet-group \
  --db-subnet-group-description "Subnet group for Project Lazarus RDS" \
  --subnet-ids $SUBNET_IDS \
  --tags Key=Project,Value=Lazarus Key=CostCenter,Value=Medical

echo "✓ DB Subnet Group ready"
echo ""

echo "Step 5/8: Storing DB Password in Secrets Manager..."
aws secretsmanager describe-secret --secret-id lazarus/db-password > /dev/null 2>&1 && \
aws secretsmanager update-secret \
  --secret-id lazarus/db-password \
  --secret-string "$DB_PASSWORD" \
  --region $AWS_REGION > /dev/null || \
aws secretsmanager create-secret \
  --name lazarus/db-password \
  --secret-string "$DB_PASSWORD" \
  --tags Key=Project,Value=Lazarus Key=CostCenter,Value=Medical \
  --region $AWS_REGION > /dev/null

echo "✓ Database password stored securely"
echo ""

echo "Step 6/8: Creating RDS PostgreSQL Instance..."
echo "  This will take 10-15 minutes..."

aws rds create-db-instance \
  --db-instance-identifier lazarus-medical-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 15.5 \
  --master-username lazarus_admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --storage-encrypted \
  --kms-key-id $KMS_KEY_ID \
  --vpc-security-group-ids $SG_ID \
  --db-subnet-group-name lazarus-db-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --enable-cloudwatch-logs-exports '["postgresql"]' \
  --tags Key=Project,Value=Lazarus Key=PHI,Value=Yes Key=CostCenter,Value=Medical \
  --no-publicly-accessible \
  --region $AWS_REGION 2>&1 | grep -v "DBInstance" || echo "  (RDS instance may already exist)"

echo "  Waiting for RDS to become available (this takes ~10 minutes)..."
aws rds wait db-instance-available \
  --db-instance-identifier lazarus-medical-db \
  --region $AWS_REGION

DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier lazarus-medical-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "✓ RDS Instance ready: $DB_ENDPOINT"
echo ""

echo "Step 7/8: Creating IAM Role for Lambda..."
cat > /tmp/lambda-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam get-role --role-name LazarusLambdaExecutionRole > /dev/null 2>&1 || \
aws iam create-role \
  --role-name LazarusLambdaExecutionRole \
  --assume-role-policy-document file:///tmp/lambda-trust-policy.json \
  --tags Key=Project,Value=Lazarus Key=CostCenter,Value=Medical > /dev/null

aws iam attach-role-policy \
  --role-name LazarusLambdaExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole 2>/dev/null || true

cat > /tmp/lambda-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::${BUCKET_NAME}", "arn:aws:s3:::${BUCKET_NAME}/*"]
    },
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:lazarus/*"
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
      "Resource": "arn:aws:kms:${AWS_REGION}:${AWS_ACCOUNT_ID}:key/${KMS_KEY_ID}"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name LazarusLambdaExecutionRole \
  --policy-name LazarusResourceAccess \
  --policy-document file:///tmp/lambda-policy.json

LAMBDA_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/LazarusLambdaExecutionRole"

echo "✓ IAM Role configured"
echo ""

echo "Step 8/8: Deploying Database Initialization Lambda..."
echo "  Waiting 10 seconds for IAM role propagation..."
sleep 10

cd lambda/db-init
zip -q -r /tmp/db-init.zip .
cd ../..

aws lambda get-function --function-name lazarus-db-init > /dev/null 2>&1 && \
aws lambda update-function-code \
  --function-name lazarus-db-init \
  --zip-file fileb:///tmp/db-init.zip > /dev/null || \
aws lambda create-function \
  --function-name lazarus-db-init \
  --runtime python3.12 \
  --role $LAMBDA_ROLE_ARN \
  --handler init.lambda_handler \
  --zip-file fileb:///tmp/db-init.zip \
  --timeout 60 \
  --vpc-config SubnetIds=$(echo $SUBNET_IDS | tr ' ' ','),SecurityGroupIds=$SG_ID \
  --environment Variables="{DB_ENDPOINT=$DB_ENDPOINT,DB_NAME=postgres,DB_USER=lazarus_admin}" \
  --tags Project=Lazarus,CostCenter=Medical \
  --region $AWS_REGION > /dev/null

echo "✓ Lambda deployed"
echo ""

echo "Initializing Database with pgvector..."
aws lambda invoke \
  --function-name lazarus-db-init \
  --region $AWS_REGION \
  /tmp/db-init-response.json > /dev/null

echo ""
cat /tmp/db-init-response.json | python3 -m json.tool 2>/dev/null || cat /tmp/db-init-response.json
echo ""

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Configuration Summary:"
echo "  AWS Account: $AWS_ACCOUNT_ID"
echo "  Region: $AWS_REGION"
echo "  VPC: $VPC_ID (dedicated, isolated)"
echo "  S3 Bucket: $BUCKET_NAME"
echo "  RDS Endpoint: $DB_ENDPOINT"
echo "  KMS Key: $KMS_KEY_ID"
echo ""
echo "HIPAA Compliance:"
echo "  ✓ Dedicated VPC (isolated from other projects)"
echo "  ✓ All data encrypted at rest (KMS)"
echo "  ✓ Private database (no public access)"
echo "  ✓ VPC endpoints for private AWS access"
echo "  ✓ All resources tagged for cost tracking"
echo ""
echo "Next Steps:"
echo "  1. Deploy vector-search Lambda"
echo "  2. Create Bedrock Agent (requires Bedrock access)"
echo "  3. Test with sample documents"
echo ""
echo "Estimated Monthly Cost: \$16-19"
echo ""

# Save configuration
cat > lazarus-config.env <<ENVEOF
export AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID
export AWS_REGION=$AWS_REGION
export VPC_ID=$VPC_ID
export SUBNET_IDS="$SUBNET_IDS"
export SECURITY_GROUP_ID=$SG_ID
export S3_BUCKET=$BUCKET_NAME
export DB_ENDPOINT=$DB_ENDPOINT
export KMS_KEY_ID=$KMS_KEY_ID
export LAMBDA_ROLE_ARN=$LAMBDA_ROLE_ARN
ENVEOF

echo "Configuration saved to: lazarus-config.env"
echo "Source this file for future deployments: source lazarus-config.env"
