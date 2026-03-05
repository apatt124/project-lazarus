# Project Lazarus - Architecture

## System Overview

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         Frontend Layer              │
│  (Web App / Mobile / CLI)           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Authentication Layer           │
│        (AWS Cognito)                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│       Bedrock Agent Layer           │
│  ┌─────────────────────────────┐   │
│  │   Project Lazarus Agent     │   │
│  │  (Claude 3.5 Sonnet)        │   │
│  └────────┬────────────────────┘   │
│           │                         │
│  ┌────────▼────────┐  ┌──────────┐ │
│  │ Knowledge Base  │  │  Action  │ │
│  │  (Medical Docs) │  │  Groups  │ │
│  └─────────────────┘  └──────────┘ │
└─────────────────────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌─────────────┐  ┌──────────────┐
│  Storage    │  │   Lambda     │
│  Layer      │  │  Functions   │
│             │  │              │
│ • S3        │  │ • Calendar   │
│ • OpenSearch│  │ • Documents  │
│ • DynamoDB  │  │ • Providers  │
└─────────────┘  └──────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│      External Integrations          │
│  • Google Calendar API              │
│  • (Future: EHR systems)            │
└─────────────────────────────────────┘
```

## Component Details

### Frontend Layer
- Provides user interface for all interactions
- Handles authentication flow
- Manages file uploads
- Displays chat interface and calendar

### Authentication Layer
- AWS Cognito User Pool
- JWT token-based authentication
- MFA recommended for PHI access
- Session management

### Bedrock Agent Layer
- Core AI agent using Claude 3.5 Sonnet
- Orchestrates all medical history interactions
- Routes requests to appropriate action groups
- Queries knowledge base for context

### Knowledge Base
- Vector store for medical documents
- OpenSearch Serverless (or alternative)
- Semantic search capabilities
- Automatic document indexing

### Action Groups (Lambda Functions)
1. Calendar Integration: Google Calendar API
2. Document Processor: Upload, transcribe, extract
3. Provider Manager: Track doctors and specialists
4. Visit Tracker: Log and organize visits
5. Metrics Tracker: Health measurements

### Storage Layer
- S3: Document storage (encrypted)
- OpenSearch: Vector embeddings
- DynamoDB: Structured metadata (optional)

### External Integrations
- Google Calendar API for scheduling
- Future: HL7 FHIR for EHR integration

## Data Flow

### Document Upload
1. User uploads document via frontend
2. Frontend sends to S3 via presigned URL
3. S3 event triggers Lambda
4. Lambda extracts metadata
5. Document indexed in Knowledge Base
6. User receives confirmation

### Query Flow
1. User asks question via chat
2. Request sent to Bedrock Agent
3. Agent searches Knowledge Base
4. Agent may invoke action groups
5. Response synthesized and returned
6. Frontend displays response

### Appointment Scheduling
1. User requests appointment via agent
2. Agent invokes Calendar action group
3. Lambda calls Google Calendar API
4. Event created with metadata
5. Confirmation returned to user

## Security Architecture

### Encryption
- At rest: KMS encryption for S3, OpenSearch
- In transit: TLS 1.2+ for all connections
- Keys: Customer-managed KMS keys

### Access Control
- IAM roles with least-privilege
- Cognito for user authentication
- Resource-based policies on S3
- VPC endpoints for private connectivity (optional)

### Compliance
- HIPAA-eligible services only
- AWS BAA in place
- Audit logging via CloudTrail
- Regular security reviews

## Scalability Considerations

### Current (Personal Use)
- Single user
- ~100 queries/month
- ~1GB documents
- Minimal concurrent requests

### Future (Multi-User)
- Cognito user pool
- DynamoDB for user metadata
- S3 partitioning by user
- API Gateway rate limiting
- Lambda concurrency limits

## Monitoring

- CloudWatch Logs for all components
- CloudWatch Metrics for usage tracking
- X-Ray for distributed tracing
- Cost Explorer for budget monitoring

## Disaster Recovery

- S3 versioning enabled
- Cross-region replication (optional)
- Regular backup testing
- RTO: 4 hours
- RPO: 1 hour
