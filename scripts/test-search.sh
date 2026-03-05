#!/bin/bash
# Test vector search functionality

QUERY="${1:-medical history}"

echo "Testing vector search with query: '$QUERY'"
echo ""

python3 << PYTHON
import boto3
import json

lambda_client = boto3.client('lambda', region_name='us-east-1')

payload = {
    "apiPath": "/search",
    "httpMethod": "POST",
    "parameters": [
        {"name": "query", "value": "$QUERY"},
        {"name": "limit", "value": "3"}
    ]
}

try:
    response = lambda_client.invoke(
        FunctionName='lazarus-vector-search',
        Payload=json.dumps(payload)
    )
    
    result = json.loads(response['Payload'].read())
    lambda_response = result['response']
    body = json.loads(lambda_response['responseBody']['application/json']['body'])
    
    if body['success']:
        results = body['results']
        print(f"✅ Found {len(results)} documents")
        print("")
        
        for i, doc in enumerate(results, 1):
            print(f"{i}. Document ID: {doc['id']}")
            print(f"   Similarity: {doc['similarity']:.4f}")
            print(f"   Content: {doc['content'][:100]}...")
            print("")
    else:
        print(f"❌ Search failed: {body.get('error', 'Unknown error')}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
PYTHON
