# Project Lazarus - Agent Action Groups

Action groups extend the agent's capabilities through Lambda functions.

## Planned Action Groups

### 1. Calendar Management
**Purpose**: Integrate with Google Calendar for appointment tracking

**Functions**:
- `list_appointments`: Get upcoming medical appointments
- `create_appointment`: Schedule new appointment
- `update_appointment`: Modify existing appointment
- `attach_resources`: Link documents/notes to calendar event

**Lambda**: `lazarus-calendar-integration`

### 2. Document Processing
**Purpose**: Handle document uploads and transcription

**Functions**:
- `upload_document`: Store new medical document
- `transcribe_audio`: Convert visit recordings to text
- `extract_metadata`: Pull key info from documents (dates, providers, diagnoses)

**Lambda**: `lazarus-document-processor`

### 3. Provider Management
**Purpose**: Track healthcare providers and specialists

**Functions**:
- `list_providers`: Get all tracked providers
- `add_provider`: Add new doctor/specialist
- `get_provider_history`: View all visits with specific provider
- `update_provider_info`: Modify provider contact details

**Lambda**: `lazarus-provider-manager`

### 4. Visit Tracking
**Purpose**: Manage individual medical visits

**Functions**:
- `create_visit_record`: Log new visit
- `update_visit_notes`: Add/edit visit notes
- `link_documents`: Associate documents with visit
- `get_visit_summary`: Retrieve visit details

**Lambda**: `lazarus-visit-tracker`

### 5. Health Metrics
**Purpose**: Track measurements and trends

**Functions**:
- `log_metric`: Record blood pressure, weight, etc.
- `get_metric_history`: View trends over time
- `generate_metric_report`: Create summary for doctor

**Lambda**: `lazarus-metrics-tracker`

## Implementation Priority

1. Document Processing (core functionality)
2. Provider Management (organizational foundation)
3. Visit Tracking (connects providers and documents)
4. Calendar Management (scheduling integration)
5. Health Metrics (advanced tracking)

## Lambda Function Template

Each Lambda should:
- Use Python 3.12 runtime
- Include error handling and logging
- Validate inputs
- Return structured responses
- Tag with Project=Lazarus
- Use IAM roles with least-privilege access

## API Schema Example

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Provider Management API",
    "version": "1.0.0"
  },
  "paths": {
    "/providers": {
      "get": {
        "summary": "List all providers",
        "operationId": "listProviders",
        "responses": {
          "200": {
            "description": "List of providers",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Provider"
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Provider": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "name": {"type": "string"},
          "specialty": {"type": "string"},
          "contact": {"type": "string"}
        }
      }
    }
  }
}
```
