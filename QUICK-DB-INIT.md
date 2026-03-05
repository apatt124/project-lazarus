# Quick Database Initialization Guide

The Lambda dependency issue is a common challenge with compiled libraries. Here's the fastest way to initialize your database:

## Option 1: AWS RDS Query Editor (Easiest - 5 minutes)

1. Go to AWS Console → RDS → Query Editor
2. Click "Connect to database"
3. Select:
   - **Database instance**: lazarus-medical-db
   - **Database name**: postgres
   - **Database username**: lazarus_admin
   - **Password**: Get from Secrets Manager (lazarus/db-password)

4. Copy and paste the contents of `initialize-database.sql`
5. Click "Run"
6. You should see success messages for each table created

## Option 2: AWS Systems Manager Session Manager (10 minutes)

```bash
# 1. Create a temporary EC2 instance in the Lazarus VPC
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --subnet-id subnet-0ef25dad358fe0f6a \
  --security-group-ids sg-095539d6a1236597e \
  --iam-instance-profile Name=SSMInstanceProfile \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=lazarus-temp-bastion}]'

# 2. Connect via Session Manager (no SSH key needed)
# In AWS Console → Systems Manager → Session Manager → Start session

# 3. Install PostgreSQL client
sudo yum install -y postgresql15

# 4. Get database password
DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id lazarus/db-password \
  --query SecretString \
  --output text \
  --region us-east-1)

# 5. Connect and run SQL
psql -h lazarus-medical-db.cslknf9zl44o.us-east-1.rds.amazonaws.com \
  -U lazarus_admin \
  -d postgres \
  -f initialize-database.sql

# 6. Terminate the EC2 instance when done
```

## Option 3: Local psql with SSH Tunnel (If you have psql installed)

```bash
# 1. Create temporary EC2 bastion (as above)

# 2. Set up SSH tunnel
aws ssm start-session \
  --target <instance-id> \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["lazarus-medical-db.cslknf9zl44o.us-east-1.rds.amazonaws.com"],"portNumber":["5432"],"localPortNumber":["5432"]}'

# 3. In another terminal, connect locally
DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id lazarus/db-password \
  --query SecretString \
  --output text)

psql -h localhost -U lazarus_admin -d postgres -f initialize-database.sql
```

## Verification

After running the SQL, verify it worked:

```sql
-- Check pgvector is installed
SELECT extversion FROM pg_extension WHERE extname = 'vector';

-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'medical';

-- Should return: documents, providers, visits, health_metrics
```

## What This Creates

- ✅ pgvector extension (for semantic search)
- ✅ medical schema
- ✅ 4 tables: documents, providers, visits, health_metrics
- ✅ Vector similarity search function
- ✅ Indexes for performance

## After Initialization

Once the database is initialized, we can:
1. Deploy the vector-search Lambda (will work now)
2. Create the Bedrock Agent
3. Test end-to-end with a sample document

## Estimated Time

- Query Editor: 5 minutes
- Session Manager: 10 minutes
- SSH Tunnel: 15 minutes

**Recommendation**: Use Query Editor - it's the fastest and requires no additional setup.
