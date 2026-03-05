"""
Project Lazarus - Document Processor Lambda
Handles document uploads, transcription, and metadata extraction
"""

import json
import boto3
import os
from datetime import datetime
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
tracer = Tracer()

s3_client = boto3.client('s3')
transcribe_client = boto3.client('transcribe')

BUCKET_NAME = os.environ.get('S3_BUCKET')
REGION = os.environ.get('REGION', 'us-east-1')


@tracer.capture_method
def upload_document(document_name: str, content: str, metadata: dict) -> dict:
    """Upload a medical document to S3"""
    try:
        key = f"documents/{datetime.now().strftime('%Y/%m')}/{document_name}"
        
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=content,
            Metadata=metadata,
            ServerSideEncryption='aws:kms'
        )
        
        logger.info(f"Document uploaded successfully: {key}")
        return {
            "success": True,
            "document_key": key,
            "message": "Document uploaded successfully"
        }
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@tracer.capture_method
def transcribe_audio(audio_key: str) -> dict:
    """Transcribe audio recording of medical visit"""
    try:
        job_name = f"lazarus-transcribe-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        transcribe_client.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': f's3://{BUCKET_NAME}/{audio_key}'},
            MediaFormat='mp3',
            LanguageCode='en-US',
            OutputBucketName=BUCKET_NAME,
            OutputKey=f'transcriptions/{job_name}.json'
        )
        
        logger.info(f"Transcription job started: {job_name}")
        return {
            "success": True,
            "job_name": job_name,
            "message": "Transcription started"
        }
    except Exception as e:
        logger.error(f"Error starting transcription: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@tracer.capture_method
def extract_metadata(document_key: str) -> dict:
    """Extract metadata from document (placeholder for future ML integration)"""
    try:
        # Future: Use Textract or Comprehend Medical for extraction
        # For now, return basic metadata
        
        obj = s3_client.head_object(Bucket=BUCKET_NAME, Key=document_key)
        
        return {
            "success": True,
            "metadata": {
                "upload_date": obj['LastModified'].isoformat(),
                "size": obj['ContentLength'],
                "document_key": document_key
            }
        }
    except Exception as e:
        logger.error(f"Error extracting metadata: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    """Main Lambda handler for Bedrock Agent action group"""
    
    logger.info(f"Received event: {json.dumps(event)}")
    
    # Extract action and parameters from Bedrock Agent event
    action = event.get('actionGroup', '')
    api_path = event.get('apiPath', '')
    parameters = event.get('parameters', [])
    
    # Convert parameters list to dict
    params = {p['name']: p['value'] for p in parameters}
    
    # Route to appropriate function
    if api_path == '/upload':
        result = upload_document(
            params.get('document_name'),
            params.get('content'),
            params.get('metadata', {})
        )
    elif api_path == '/transcribe':
        result = transcribe_audio(params.get('audio_key'))
    elif api_path == '/extract-metadata':
        result = extract_metadata(params.get('document_key'))
    else:
        result = {
            "success": False,
            "error": f"Unknown API path: {api_path}"
        }
    
    # Return in Bedrock Agent format
    return {
        'messageVersion': '1.0',
        'response': {
            'actionGroup': action,
            'apiPath': api_path,
            'httpMethod': event.get('httpMethod'),
            'httpStatusCode': 200 if result.get('success') else 400,
            'responseBody': {
                'application/json': {
                    'body': json.dumps(result)
                }
            }
        }
    }
