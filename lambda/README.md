# Project Lazarus - Lambda Functions

AWS Lambda functions that extend Bedrock Agent capabilities.

## Structure

Each Lambda function has its own directory:
```
lambda/
├── calendar-integration/
├── document-processor/
├── provider-manager/
├── visit-tracker/
└── metrics-tracker/
```

## Development

### Local Testing
Use AWS SAM CLI for local development:
```bash
sam local invoke FunctionName -e events/test-event.json
```

### Deployment
```bash
# Package
sam build

# Deploy
sam deploy --guided
```

## Common Dependencies

All functions use:
- `boto3`: AWS SDK
- `aws-lambda-powertools`: Logging, tracing, metrics

## Environment Variables

Each Lambda requires:
- `REGION`: AWS region
- `S3_BUCKET`: Document storage bucket
- `TABLE_NAME`: DynamoDB table (if used)
- `LOG_LEVEL`: INFO or DEBUG

## IAM Permissions

Functions need access to:
- S3 (read/write documents)
- DynamoDB (metadata storage)
- Bedrock (agent invocation)
- CloudWatch Logs
- KMS (encryption/decryption)

## Testing

Include unit tests in each function directory:
```
function-name/
├── app.py
├── requirements.txt
└── tests/
    └── test_app.py
```

Run tests:
```bash
pytest tests/
```
