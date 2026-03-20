import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({
  region: process.env.LAZARUS_AWS_REGION || 'us-east-1',
});

/**
 * GET /api/relationships/timeline - Get timeline events for facts
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching timeline events');
    
    // Invoke Lambda function
    const command = new InvokeCommand({
      FunctionName: process.env.LAZARUS_LAMBDA_FUNCTION || 'lazarus-api',
      Payload: JSON.stringify({
        path: '/relationships/timeline',
        httpMethod: 'GET',
      }),
    });

    const response = await lambda.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    
    console.log('Lambda response received for timeline');
    
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
    console.error('Timeline API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        events: [], // Return empty array to prevent UI errors
      },
      { status: 500 }
    );
  }
}
