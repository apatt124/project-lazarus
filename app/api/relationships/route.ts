import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({
  region: process.env.LAZARUS_AWS_REGION || 'us-east-1',
});

/**
 * GET /api/relationships - List all relationships
 * GET /api/relationships/graph - Get graph data with nodes and edges
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minStrength = searchParams.get('minStrength') || '0.5';
    const isActive = searchParams.get('isActive') !== 'false';
    
    // Check if this is a graph request
    const isGraphRequest = request.url.includes('/graph');
    
    // Invoke Lambda function
    const command = new InvokeCommand({
      FunctionName: process.env.LAZARUS_LAMBDA_FUNCTION || 'lazarus-api',
      Payload: JSON.stringify({
        path: isGraphRequest ? '/relationships/graph' : '/relationships',
        httpMethod: 'GET',
        queryStringParameters: {
          minStrength,
          isActive: String(isActive),
        },
      }),
    });

    const response = await lambda.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    
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
    console.error('Relationships API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/relationships - Create a new relationship
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const command = new InvokeCommand({
      FunctionName: process.env.LAZARUS_LAMBDA_FUNCTION || 'lazarus-api',
      Payload: JSON.stringify({
        path: '/relationships',
        httpMethod: 'POST',
        body: JSON.stringify(body),
      }),
    });

    const response = await lambda.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    
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
    console.error('Create relationship error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/relationships/:id - Delete a relationship
 */
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const relationshipId = pathParts[pathParts.length - 1];
    
    const command = new InvokeCommand({
      FunctionName: process.env.LAZARUS_LAMBDA_FUNCTION || 'lazarus-api',
      Payload: JSON.stringify({
        path: `/relationships/${relationshipId}`,
        httpMethod: 'DELETE',
      }),
    });

    const response = await lambda.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    
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
    console.error('Delete relationship error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
