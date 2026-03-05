#!/bin/bash
# Project Lazarus - Automated Deployment Script
set -e

echo "🏥 Project Lazarus - Deployment Starting"
echo "=========================================="
echo ""

# Configuration
export AWS_REGION=us-east-1
export PROJECT_NAME=ProjectLazarus
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export BUCKET_NAME="project-lazarus-medical-docs-${AWS_ACCOUNT_ID}"

echo "Configuration:"
echo "  AWS Account: $AWS_ACCOUNT_ID"
echo "  Region: $AWS_REGION"
echo "  S3 Bucket: $BUCKET_NAME"
echo ""

# Generate secure database password
export DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo "Step 1/10: Creating Resource Group and Cost Allocation Tags..."

# Activate cost allocation tags
aws ce create-cost-category-definition \
  --name "ProjectLazarus" \
  --rules '[{"Value":"Lazarus","Rule":{"Tags":{"Key":"Project","Values":["Lazarus"]}}}]' \
  --rule-version "CostCategoryExpression.v1" 2>/dev/null || echo "  Cost category exists"

aws resource-groups create-group \
  --name ProjectLazarusGroup \
  --resource-query '{"Type":"TAG_FILTERS_1_0","Query":"{\"ResourceTypeFilters\":[\"AWS::AllSupported\"],\"TagFilters\":[{\"Key\":\"Project\",\"Values\":[\"Lazarus\"]}]}"}' \
  --tags Project=Lazarus,Environment=Personal,CostCenter=Medical \
  --region $AWS_REGION 2>/dev/null || echo "  Resource group already exists"

echo "✓ Resource group and cost tracking ready"
echo ""

echo "Step 2/10: Creating KMS Key..."
KMS_KEY_ID=$(aws kms create-key \
  --description "Project Lazarus PHI encryption key" \
  --tags TagKey=Project,TagValue=Lazarus TagKey=PHI,TagValue=Yes \
  --region $AWS_REGION \
  --query 'KeyMetadata.KeyId' \
  --output text 2>/dev/null || aws kms list-aliases --query "Aliases[?AliasName=='alias/project-lazarus'].TargetKeyId" --output text)

if [ -z "$KMS_KEY_ID" ]; then
  echo "Error: Could not create or find KMS key"
  exit 1
fi

aws kms create-alias \
  --alias-name alias/project-lazarus \
  --target-key-id $KMS_KEY_ID \
  --region $AWS_REGION 2>/dev/null || echo "  Alias already exists"

echo "✓ KMS Key: $KMS_KEY_ID"
echo ""

echo "Step 3/10: Creating S3 Bucket..."
aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region $AWS_REGION 2>/dev/null || echo "  Bucket already exists"

aws s3api put-bucket-encryption \
  --bucket $BUCKET_NAME \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "'$KMS_KEY_ID'"
      },
      "BucketKeyEnabled": true
    }]
  }'

aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-tagging \
  --bucket $BUCKET_NAME \
  --tagging 'TagSet=[{Key=Project,Value=Lazarus},{Key=Environment,Value=Personal},{Key=PHI,Value=Yes},{Key=CostCenter,Value=Medical}]'

echo "✓ S3 Bucket configured"
echo ""

echo "Step 4/10: Setting up VPC and Security Group..."
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text 2>/dev/null)

# If no default VPC, use first available VPC
if [ "$VPC_ID" == "None" ] || [ -z "$VPC_ID" ]; then
  VPC_ID=$(aws ec2 describe-vpcs \
    --query 'Vpcs[0].VpcId' \
    --output text)
  echo "  Using VPC: $VPC_ID (no default VPC found)"
fi

SG_ID=$(aws ec2 create-security-group \
  --group-name lazarus-rds-sg \
  --description "Security group for Project Lazarus RDS" \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Project,Value=Lazarus},{Key=CostCenter,Value=Medical}]' \
  --query 'GroupId' \
  --output text 2>/dev/null || aws ec2 describe-security-groups --filters "Name=group-name,Values=lazarus-rds-sg" --query 'SecurityGroups[0].GroupId' --output text)

VPC_CIDR=$(aws ec2 describe-vpcs \
  --vpc-ids $VPC_ID \
  --query 'Vpcs[0].CidrBlock' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr $VPC_CIDR 2>/dev/null || echo "  Security group rule already exists"

echo "✓ Security Group: $SG_ID"
echo ""

echo "Step 5/10: Creating DB Subnet Group..."
SUBNET_IDS=$LAZARUS_SUBNET_IDS

aws rds create-db-subnet-group \
  --db-subnet-group-name lazarus-db-subnet-group \
  --db-subnet-group-description "Subnet group for Project Lazarus RDS" \
  --subnet-ids $SUBNET_IDS \
  --tags Key=Project,Value=Lazarus Key=CostCenter,Value=Medical 2>/dev/null || echo "  Subnet group already exists"

echo "✓ DB Subnet Group ready"
echo ""

echo "Step 6/10: Storing DB Password in Secrets Manager..."
aws secretsmanager create-secret \
  --name lazarus/db-password \
  --secret-string "$DB_PASSWORD" \
  --tags Key=Project,Value=Lazarus Key=CostCenter,Value=Medical \
  --region $AWS_REGION 2>/dev/null || \
aws secretsmanager update-secret \
  --secret-id lazarus/db-password \
  --secret-string "$DB_PASSWORD" \
  --region $AWS_REGION

echo "✓ Database password stored securely"
echo ""

echo "Step 7/10: Creating RDS PostgreSQL Instance..."
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
  --region $AWS_REGION 2>/dev/null || echo "  RDS instance already exists"

echo "  Waiting for RDS to become available..."
aws rds wait db-instance-available \
  --db-instance-identifier lazarus-medical-db \
  --region $AWS_REGION

DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier lazarus-medical-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "✓ RDS Instance ready: $DB_ENDPOINT"
echo ""

echo "Step 8/10: Creating IAM Roles..."

# Lambda execution role
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

aws iam create-role \
  --role-name LazarusLambdaExecutionRole \
  --assume-role-policy-document file:///tmp/lambda-trust-policy.json \
  --tags Key=Project,Value=Lazarus Key=CostCenter,Value=Medical 2>/dev/null || echo "  Lambda role already exists"

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

echo "✓ IAM Roles configured"
echo ""

echo "Step 9/10: Deploying Lambda Functions..."
echo "  Waiting 10 seconds for IAM role propagation..."
sleep 10

# Deploy db-init Lambda
cd lambda/db-init
zip -q -r /tmp/db-init.zip .
cd ../..

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
  --region $AWS_REGION 2>/dev/null || \
aws lambda update-function-code \
  --function-name lazarus-db-init \
  --zip-file fileb:///tmp/db-init.zip

echo "✓ Lambda functions deployed"
echo ""

echo "Step 10/10: Initializing Database..."
aws lambda invoke \
  --function-name lazarus-db-init \
  --region $AWS_REGION \
  /tmp/db-init-response.json

cat /tmp/db-init-response.json
echo ""

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Configuration Summary:"
echo "  AWS Account: $AWS_ACCOUNT_ID"
echo "  Region: $AWS_REGION"
echo "  S3 Bucket: $BUCKET_NAME"
echo "  RDS Endpoint: $DB_ENDPOINT"
echo "  KMS Key: $KMS_KEY_ID"
echo ""
echo "Next Steps:"
echo "  1. Deploy vector-search Lambda"
echo "  2. Create Bedrock Agent"
echo "  3. Link action groups"
echo "  4. Test with sample documents"
echo ""
echo "Estimated Monthly Cost: \$16-19"
echo ""
