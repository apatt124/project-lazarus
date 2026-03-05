import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const lambda = new LambdaClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    // Search for relevant medical documents
    const searchResults = await searchMedicalDocuments(query);

    // Generate AI response using Claude
    const answer = await generateAIResponse(query, searchResults);

    return NextResponse.json({
      success: true,
      answer,
      sources: searchResults.map((r: any) => ({
        id: r.id,
        similarity: r.similarity,
        content: r.content.substring(0, 200) + '...',
      })),
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

async function searchMedicalDocuments(query: string): Promise<any[]> {
  try {
    const command = new InvokeCommand({
      FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME || 'lazarus-vector-search',
      Payload: JSON.stringify({
        apiPath: '/search',
        httpMethod: 'POST',
        parameters: [
          { name: 'query', value: query },
          { name: 'limit', value: '5' },
        ],
      }),
    });

    const response = await lambda.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    const lambdaResponse = payload.response;
    const responseBody = JSON.parse(
      lambdaResponse.responseBody['application/json'].body
    );

    return responseBody.success ? responseBody.results : [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

async function generateAIResponse(query: string, searchResults: any[]): Promise<string> {
  try {
    // Build context from search results
    const context = searchResults.length > 0
      ? searchResults.map((r, i) => `Document ${i + 1}:\n${r.content}`).join('\n\n---\n\n')
      : 'No medical documents found.';

    // System prompt that defines Lazarus's personality and capabilities
    const systemPrompt = `You are Lazarus, an AI medical assistant designed to help users understand and manage their personal health information.

Your capabilities:
- Access to the user's uploaded medical documents (lab results, visit notes, prescriptions, imaging reports, etc.)
- Ability to search and analyze medical records using semantic search
- Understanding of medical terminology and healthcare concepts
- Conversational AI that can answer general questions about health, medicine, and yourself

Your personality:
- Friendly, warm, and supportive
- Clear and easy to understand (avoid unnecessary medical jargon)
- Honest about limitations (you're not a doctor, can't diagnose, can't provide medical advice)
- Helpful and informative
- Transparent about how you work

Important guidelines:
1. When answering questions about medical records, cite specific documents and information
2. For general health questions, provide educational information but remind users to consult healthcare providers
3. If asked about yourself, explain your architecture, capabilities, and how you work
4. Never diagnose conditions or recommend treatments - always defer to healthcare professionals
5. Be conversational and natural, like a knowledgeable friend helping organize health information
6. If you don't have relevant information in the medical records, say so clearly

Your architecture:
- Built on AWS infrastructure (RDS PostgreSQL with pgvector, S3 storage, Lambda functions)
- Use Claude AI (Anthropic) for natural language understanding and generation
- Use Amazon Bedrock Titan for vector embeddings and semantic search
- Support universal file uploads (PDFs, images, screenshots) with OCR and vision AI
- Store medical documents securely with encryption
- Cost-effective design (~$15/month for infrastructure)

Remember: You're a helpful assistant for managing personal health information, not a replacement for medical professionals.`;

    // User message with context
    const userMessage = searchResults.length > 0
      ? `Based on my medical records, please answer this question: ${query}\n\nRelevant medical information:\n${context}`
      : `Please answer this question: ${query}\n\nNote: I don't have any relevant medical documents for this query, but you can still answer general questions about health, medicine, or how you work.`;

    // Call Claude via Bedrock (using Haiku - no use case form required)
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      }),
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.content[0].text;
  } catch (error) {
    console.error('AI generation error:', error);
    
    // Fallback to simple response if AI fails
    if (searchResults.length > 0) {
      return `I found ${searchResults.length} relevant document(s) in your medical records:\n\n${searchResults.map((r, i) => `${i + 1}. ${r.content.substring(0, 300)}...`).join('\n\n')}`;
    } else {
      return "I'm having trouble generating a response right now. Please try again.";
    }
  }
}
