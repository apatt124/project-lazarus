import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({
  region: process.env.LAZARUS_AWS_REGION || 'us-east-1',
});

/**
 * GET /api/relationships/graph - Get graph data with nodes and edges
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minStrength = searchParams.get('minStrength') || '0.5';
    const isActive = searchParams.get('isActive') !== 'false';
    
    console.log('Fetching graph data with minStrength:', minStrength);
    
    // Invoke Lambda function
    const command = new InvokeCommand({
      FunctionName: process.env.LAZARUS_LAMBDA_FUNCTION || 'lazarus-api',
      Payload: JSON.stringify({
        path: '/relationships/graph',
        httpMethod: 'GET',
        queryStringParameters: {
          minStrength,
          isActive: String(isActive),
        },
      }),
    });

    const response = await lambda.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    
    console.log('Lambda response received');
    
    // Parse Lambda response
    let responseBody;
    if (payload.body) {
      responseBody = typeof payload.body === 'string' 
        ? JSON.parse(payload.body) 
        : payload.body;
    } else if (payload.response?.responseBody) {
      responseBody = JSON.parse(
        payload.response.responseBody['application/json'].body
      );
    } else {
      throw new Error('Invalid Lambda response format');
    }

    return NextResponse.json(responseBody);

  } catch (error) {
    console.error('Graph API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        relationships: [], // Return empty array to prevent UI errors
        nodes: [],
        edges: [],
      },
      { status: 500 }
    );
  }
}
