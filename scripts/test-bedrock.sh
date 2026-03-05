#!/bin/bash
# Test Bedrock Claude access

echo "Testing Bedrock Claude 3.5 Sonnet access..."
echo ""

# Create test request
cat > /tmp/bedrock_test.json << 'EOF'
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 100,
  "messages": [
    {
      "role": "user",
      "content": "Say 'Lazarus is working!' in one sentence."
    }
  ]
}
EOF

# Test with Python SDK (more reliable than CLI)
python3 << 'PYTHON'
import boto3
import json

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

with open('/tmp/bedrock_test.json', 'r') as f:
    body = f.read()

try:
    response = bedrock.invoke_model(
        modelId='us.anthropic.claude-sonnet-4-5-20250929-v1:0',
        body=body
    )
    
    result = json.loads(response['body'].read())
    print("✅ Success!")
    print(f"Response: {result['content'][0]['text']}")
    print(f"\nTokens used: Input={result['usage']['input_tokens']}, Output={result['usage']['output_tokens']}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
PYTHON

echo ""
echo "Bedrock access is working correctly!"
