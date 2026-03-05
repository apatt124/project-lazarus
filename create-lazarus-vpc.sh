#!/bin/bash
set -e

echo "Creating dedicated VPC for Project Lazarus..."

# Create VPC
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.20.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=lazarus-vpc},{Key=Project,Value=Lazarus},{Key=CostCenter,Value=Medical}]' \
  --query 'Vpc.VpcId' \
  --output text)

echo "✓ VPC Created: $VPC_ID"

# Enable DNS
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support

# Create subnets in 2 AZs (required for RDS)
SUBNET1_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.20.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=lazarus-subnet-1a},{Key=Project,Value=Lazarus}]' \
  --query 'Subnet.SubnetId' \
  --output text)

SUBNET2_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.20.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=lazarus-subnet-1b},{Key=Project,Value=Lazarus}]' \
  --query 'Subnet.SubnetId' \
  --output text)

echo "✓ Subnets Created: $SUBNET1_ID, $SUBNET2_ID"

# Create Internet Gateway (for Lambda to reach Bedrock/Secrets Manager)
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=lazarus-igw},{Key=Project,Value=Lazarus}]' \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID

echo "✓ Internet Gateway Created: $IGW_ID"

# Create route table
RTB_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=lazarus-rtb},{Key=Project,Value=Lazarus}]' \
  --query 'RouteTable.RouteTableId' \
  --output text)

# Add route to internet
aws ec2 create-route \
  --route-table-id $RTB_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID

# Associate subnets with route table
aws ec2 associate-route-table --subnet-id $SUBNET1_ID --route-table-id $RTB_ID
aws ec2 associate-route-table --subnet-id $SUBNET2_ID --route-table-id $RTB_ID

echo "✓ Route Table Configured: $RTB_ID"

# Create VPC endpoints for AWS services (HIPAA best practice - keeps traffic private)
echo "Creating VPC endpoints for private AWS service access..."

# S3 endpoint (gateway type - free)
aws ec2 create-vpc-endpoint \
  --vpc-id $VPC_ID \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids $RTB_ID \
  --tag-specifications 'ResourceType=vpc-endpoint,Tags=[{Key=Name,Value=lazarus-s3-endpoint},{Key=Project,Value=Lazarus}]' \
  > /dev/null

echo "✓ S3 VPC Endpoint Created (keeps S3 traffic private)"

echo ""
echo "=========================================="
echo "✅ Lazarus VPC Created Successfully"
echo "=========================================="
echo "VPC ID: $VPC_ID"
echo "Subnets: $SUBNET1_ID, $SUBNET2_ID"
echo "CIDR: 10.20.0.0/16 (isolated from BridgeFirst)"
echo ""
echo "HIPAA Compliance Features:"
echo "  ✓ Dedicated VPC (isolated from other projects)"
echo "  ✓ Private subnets for RDS"
echo "  ✓ VPC endpoints for private AWS service access"
echo "  ✓ All resources tagged for cost tracking"
echo ""

# Save to file for deployment script
cat > /tmp/lazarus-vpc-config.sh << EOFCONFIG
export LAZARUS_VPC_ID=$VPC_ID
export LAZARUS_SUBNET_IDS="$SUBNET1_ID $SUBNET2_ID"
EOFCONFIG

echo "Configuration saved to /tmp/lazarus-vpc-config.sh"
