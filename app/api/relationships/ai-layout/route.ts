import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({
  region: process.env.LAZARUS_AWS_REGION || 'us-east-1',
});

/**
 * POST /api/relationships/ai-layout - Generate AI-powered graph layout
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Requesting AI layout generation for', body.nodes?.length || 0, 'nodes');
    
    // Invoke Lambda function
    const command = new InvokeCommand({
      FunctionName: process.env.LAZARUS_LAMBDA_FUNCTION || 'lazarus-api',
      Payload: JSON.stringify({
        path: '/relationships/ai-layout',
        httpMethod: 'POST',
        body: JSON.stringify(body),
      }),
    });

    const response = await lambda.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    
    console.log('Lambda response received for AI layout');
    
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
    console.error('AI Layout API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        layout: null,
      },
      { status: 500 }
    );
  }
}
