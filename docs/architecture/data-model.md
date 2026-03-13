# Project Lazarus - Data Model

## Overview

Data is stored across multiple AWS services for optimal performance and compliance.

## Storage Services

### S3 Bucket Structure
```
project-lazarus-medical-docs-{account-id}/
├── documents/
│   ├── 2025/
│   │   ├── 01/
│   │   ├── 02/
│   │   └── 03/
│   └── {YYYY}/{MM}/{document-name}
├── transcriptions/
│   └── {job-name}.json
├── audio/
│   └── {visit-id}.mp3
└── exports/
    └── {export-id}.pdf
```

### DynamoDB Tables (Optional)

#### Providers Table
```json
{
  "TableName": "lazarus-providers",
  "KeySchema": [
    {"AttributeName": "provider_id", "KeyType": "HASH"}
  ],
  "AttributeDefinitions": [
    {"AttributeName": "provider_id", "AttributeType": "S"},
    {"AttributeName": "specialty", "AttributeType": "S"}
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "specialty-index",
      "KeySchema": [
        {"AttributeName": "specialty", "KeyType": "HASH"}
      ]
    }
  ]
}
```

#### Visits Table
```json
{
  "TableName": "lazarus-visits",
  "KeySchema": [
    {"AttributeName": "visit_id", "KeyType": "HASH"}
  ],
  "AttributeDefinitions": [
    {"AttributeName": "visit_id", "AttributeType": "S"},
    {"AttributeName": "provider_id", "AttributeType": "S"},
    {"AttributeName": "visit_date", "AttributeType": "S"}
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "provider-date-index",
      "KeySchema": [
        {"AttributeName": "provider_id", "KeyType": "HASH"},
        {"AttributeName": "visit_date", "KeyType": "RANGE"}
      ]
    }
  ]
}
```

#### Health Metrics Table
```json
{
  "TableName": "lazarus-metrics",
  "KeySchema": [
    {"AttributeName": "metric_type", "KeyType": "HASH"},
    {"AttributeName": "timestamp", "KeyType": "RANGE"}
  ],
  "AttributeDefinitions": [
    {"AttributeName": "metric_type", "AttributeType": "S"},
    {"AttributeName": "timestamp", "AttributeType": "S"}
  ]
}
```

## Data Schemas

### Provider Record
```json
{
  "provider_id": "uuid",
  "name": "Dr. Jane Smith",
  "specialty": "Cardiology",
  "contact": {
    "phone": "[phone]",
    "email": "[email]",
    "address": "[address]"
  },
  "first_visit": "2024-01-15",
  "last_visit": "2025-03-01",
  "visit_count": 5,
  "notes": "Primary cardiologist"
}
```

### Visit Record
```json
{
  "visit_id": "uuid",
  "provider_id": "uuid",
  "visit_date": "2025-03-01T14:00:00Z",
  "visit_type": "Follow-up",
  "chief_complaint": "Chest pain follow-up",
  "notes": "Patient reports improvement...",
  "documents": ["s3://bucket/documents/2025/03/visit-notes.pdf"],
  "calendar_event_id": "google-calendar-event-id",
  "transcription_key": "s3://bucket/transcriptions/visit-123.json"
}
```

### Health Metric Record
```json
{
  "metric_type": "blood_pressure",
  "timestamp": "2025-03-01T09:00:00Z",
  "value": {
    "systolic": 128,
    "diastolic": 82
  },
  "unit": "mmHg",
  "context": "Morning reading",
  "provider_id": "uuid"
}
```

### Document Metadata
```json
{
  "document_id": "uuid",
  "s3_key": "documents/2025/03/lab-results.pdf",
  "document_type": "lab_results",
  "upload_date": "2025-03-01T10:00:00Z",
  "visit_id": "uuid",
  "provider_id": "uuid",
  "tags": ["blood_work", "cholesterol"],
  "extracted_data": {
    "test_date": "2025-02-28",
    "results": {}
  }
}
```

## Vector Store (OpenSearch)

### Document Structure
```json
{
  "id": "doc-uuid",
  "vector": [0.123, 0.456, ...],
  "text": "Full document text or chunk",
  "metadata": {
    "source": "s3://bucket/documents/2025/03/file.pdf",
    "document_type": "lab_results",
    "date": "2025-03-01",
    "provider": "Dr. Smith",
    "tags": ["blood_work"]
  }
}
```

## Data Retention

- Documents: Indefinite (user-controlled deletion)
- Transcriptions: 7 years (HIPAA compliance)
- Metrics: Indefinite
- Logs: 90 days (CloudWatch)
- Backups: 30 days (S3 versioning)

## Privacy Considerations

- All PHI encrypted at rest (KMS)
- Access logged via CloudTrail
- No data shared across users
- User can export all data
- User can request deletion
