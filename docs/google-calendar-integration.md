# Google Calendar Integration

Guide for integrating Google Calendar with Project Lazarus.

## Setup Steps

### 1. Create Google Cloud Project

```bash
# Visit Google Cloud Console
# https://console.cloud.google.com/

# Create new project: "Project Lazarus"
# Enable Google Calendar API
```

### 2. Create OAuth 2.0 Credentials

1. Go to APIs & Services > Credentials
2. Create OAuth 2.0 Client ID
3. Application type: Web application
4. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://yourdomain.com/api/auth/callback/google` (prod)
5. Download credentials JSON

### 3. Configure Lambda Function

Store credentials in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name lazarus/google-calendar-credentials \
  --secret-string file://google-credentials.json \
  --region us-east-1
```

### 4. Lambda Implementation

```python
import boto3
import json
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

secrets_client = boto3.client('secretsmanager')

def get_calendar_service():
    """Initialize Google Calendar API service"""
    secret = secrets_client.get_secret_value(
        SecretId='lazarus/google-calendar-credentials'
    )
    creds_data = json.loads(secret['SecretString'])
    
    creds = Credentials.from_authorized_user_info(creds_data)
    service = build('calendar', 'v3', credentials=creds)
    return service

def list_appointments(time_min=None, time_max=None):
    """List upcoming appointments"""
    service = get_calendar_service()
    
    events_result = service.events().list(
        calendarId='primary',
        timeMin=time_min,
        timeMax=time_max,
        maxResults=10,
        singleEvents=True,
        orderBy='startTime'
    ).execute()
    
    return events_result.get('items', [])

def create_appointment(summary, start_time, end_time, description=None):
    """Create new calendar event"""
    service = get_calendar_service()
    
    event = {
        'summary': summary,
        'description': description,
        'start': {'dateTime': start_time, 'timeZone': 'America/New_York'},
        'end': {'dateTime': end_time, 'timeZone': 'America/New_York'},
        'reminders': {
            'useDefault': False,
            'overrides': [
                {'method': 'email', 'minutes': 24 * 60},
                {'method': 'popup', 'minutes': 30}
            ]
        }
    }
    
    event = service.events().insert(calendarId='primary', body=event).execute()
    return event
```

## API Schema for Bedrock Agent

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Calendar Management API",
    "version": "1.0.0"
  },
  "paths": {
    "/appointments": {
      "get": {
        "summary": "List upcoming appointments",
        "operationId": "listAppointments",
        "parameters": [
          {
            "name": "days_ahead",
            "in": "query",
            "schema": {"type": "integer", "default": 30}
          }
        ],
        "responses": {
          "200": {
            "description": "List of appointments"
          }
        }
      },
      "post": {
        "summary": "Create new appointment",
        "operationId": "createAppointment",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "summary": {"type": "string"},
                  "start_time": {"type": "string", "format": "date-time"},
                  "end_time": {"type": "string", "format": "date-time"},
                  "description": {"type": "string"},
                  "provider_name": {"type": "string"}
                },
                "required": ["summary", "start_time", "end_time"]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Appointment created"
          }
        }
      }
    }
  }
}
```

## Usage Examples

### Agent Interaction

User: "Schedule an appointment with Dr. Smith next Tuesday at 2pm"

Agent:
1. Parses request
2. Invokes calendar action group
3. Creates event with metadata:
   - Summary: "Appointment with Dr. Smith"
   - Start: Next Tuesday 2:00 PM
   - Description: "Provider: Dr. Smith (Cardiologist)"
4. Confirms with user

### Attaching Resources

User: "Attach my recent blood work to the appointment with Dr. Smith"

Agent:
1. Finds appointment in calendar
2. Retrieves blood work document from S3
3. Updates event description with document link
4. Confirms attachment

## Security Considerations

- Store OAuth tokens in Secrets Manager
- Rotate credentials regularly
- Use service account for automation (alternative to OAuth)
- Limit calendar API scopes to minimum required
- Audit all calendar access via CloudTrail

## Alternative: Service Account

For fully automated access without user OAuth:

1. Create service account in Google Cloud
2. Enable domain-wide delegation
3. Share calendar with service account
4. Use service account credentials in Lambda

## Testing

```bash
# Test calendar integration locally
python test_calendar.py

# Expected output:
# ✓ Connected to Google Calendar
# ✓ Listed 5 upcoming appointments
# ✓ Created test appointment
# ✓ Deleted test appointment
```
