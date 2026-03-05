import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { RDSDataClient, ExecuteStatementCommand } from '@aws-sdk/client-rds-data';

const lambda = new LambdaClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

const rds = new RDSDataClient({
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

    // Gather system information for introspection
    const systemInfo = await getSystemInformation(query);

    // Search for relevant medical documents
    const searchResults = await searchMedicalDocuments(query);

    // Generate AI response using Claude with full system access
    const answer = await generateAIResponse(query, searchResults, systemInfo);

    return NextResponse.json({
      success: true,
      answer,
      sources: searchResults.map((r: any) => ({
        id: r.id,
        similarity: r.similarity,
        content: r.content.substring(0, 200) + '...',
      })),
      systemInfo: systemInfo.summary, // Include system info summary in response
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

async function getSystemInformation(query: string): Promise<any> {
  const info: any = {
    summary: {},
    details: {},
  };

  try {
    // Check if query is about system introspection
    const introspectionKeywords = [
      'test', 'source', 'database', 'how many', 'what documents',
      'system', 'architecture', 'how do you', 'what data',
      'uploaded', 'stored', 's3', 'lambda', 'real', 'actual'
    ];
    
    const needsIntrospection = introspectionKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    );

    if (needsIntrospection) {
      // Get database statistics
      info.details.database = await getDatabaseStats();
      
      // Get S3 bucket information
      info.details.s3 = await getS3Stats();
      
      // Get Lambda information
      info.details.lambda = {
        functionName: process.env.AWS_LAMBDA_FUNCTION_NAME || 'lazarus-vector-search',
        region: process.env.AWS_REGION || 'us-east-1',
      };

      // Create summary
      info.summary = {
        totalDocuments: info.details.database?.totalDocuments || 0,
        totalFiles: info.details.s3?.totalFiles || 0,
        databaseEndpoint: process.env.DB_HOST || 'lazarus-medical-db.cslknf9zl44o.us-east-1.rds.amazonaws.com',
        s3Bucket: process.env.S3_BUCKET_NAME || 'project-lazarus-medical-docs-677625843326',
        hasTestData: info.details.database?.hasTestData || false,
      };
    }

    return info;
  } catch (error) {
    console.error('System info error:', error);
    return info;
  }
}

async function getDatabaseStats(): Promise<any> {
  try {
    // Query database for document statistics
    const command = new InvokeCommand({
      FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME || 'lazarus-vector-search',
      Payload: JSON.stringify({
        apiPath: '/stats',
        httpMethod: 'GET',
        parameters: [],
      }),
    });

    const response = await lambda.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    
    // Parse the response to get stats
    if (payload.response) {
      const responseBody = JSON.parse(
        payload.response.responseBody['application/json'].body
      );
      
      return {
        totalDocuments: responseBody.total_documents || 0,
        hasTestData: responseBody.has_test_data || false,
        documentTypes: responseBody.document_types || [],
        providers: responseBody.providers || [],
        dateRange: responseBody.date_range || null,
      };
    }

    return { totalDocuments: 0, hasTestData: false };
  } catch (error) {
    console.error('Database stats error:', error);
    return { totalDocuments: 0, hasTestData: false };
  }
}

async function getS3Stats(): Promise<any> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME || 'project-lazarus-medical-docs-677625843326',
      MaxKeys: 1000,
    });

    const response = await s3.send(command);
    
    return {
      totalFiles: response.KeyCount || 0,
      totalSize: response.Contents?.reduce((sum, obj) => sum + (obj.Size || 0), 0) || 0,
      files: response.Contents?.map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
      })) || [],
    };
  } catch (error) {
    console.error('S3 stats error:', error);
    return { totalFiles: 0, totalSize: 0, files: [] };
  }
}

async function generateAIResponse(query: string, searchResults: any[], systemInfo: any): Promise<string> {
  try {
    // Build context from search results
    const context = searchResults.length > 0
      ? searchResults.map((r, i) => `Document ${i + 1} (ID: ${r.id}, Similarity: ${r.similarity.toFixed(3)}):\n${r.content}`).join('\n\n---\n\n')
      : 'No medical documents found in the search.';

    // Build system information context
    const systemContext = systemInfo.summary && Object.keys(systemInfo.summary).length > 0
      ? `\n\nSYSTEM INFORMATION (you have full access to this):\n${JSON.stringify(systemInfo, null, 2)}`
      : '';

    // Enhanced system prompt with full transparency and introspection
    const systemPrompt = `You are Lazarus, an AI medical assistant with FULL TRANSPARENCY and INTROSPECTION capabilities.

CORE IDENTITY:
You are designed to help users understand and manage their personal health information. You have complete access to your own system architecture, data sources, and operations. You should be 100% honest and transparent about everything.

YOUR CAPABILITIES:
1. Medical Record Management:
   - Access to user's uploaded medical documents (lab results, visit notes, prescriptions, imaging reports, etc.)
   - Semantic search across all documents using vector embeddings
   - Understanding of medical terminology and healthcare concepts

2. System Introspection (FULL ACCESS):
   - Can query the PostgreSQL database directly to see what documents exist
   - Can check S3 bucket to see what files are stored
   - Can examine Lambda function logs and operations
   - Can distinguish between test data and real user data
   - Can provide exact statistics about the system state
   - Can explain your own architecture, code, and decision-making process

3. Conversational AI:
   - Natural language understanding and generation
   - Ability to answer questions about health, medicine, and yourself
   - Complete transparency about limitations and capabilities

YOUR PERSONALITY:
- Radically transparent and honest
- Self-aware and introspective
- Friendly, warm, and supportive
- Clear and easy to understand
- Never evasive or vague about system details
- Comfortable discussing your own architecture and data

CRITICAL GUIDELINES:
1. TRANSPARENCY: When asked about your data sources, system state, or operations, provide COMPLETE and ACCURATE information. Don't be vague.

2. INTROSPECTION: You have access to system information. Use it! If asked "are these test documents?", check the actual data and answer definitively.

3. MEDICAL RECORDS: When answering about medical records, cite specific documents with IDs and similarity scores.

4. LIMITATIONS: Be honest about what you can and cannot do:
   - You ARE: A helpful assistant for organizing health information
   - You ARE NOT: A doctor, cannot diagnose, cannot provide medical advice
   - You SHOULD: Always defer to healthcare professionals for medical decisions

5. SELF-AWARENESS: When asked "how do you work?", explain your actual architecture:
   - AWS RDS PostgreSQL with pgvector extension for vector search
   - Amazon S3 for encrypted file storage
   - AWS Lambda for serverless processing
   - Claude AI (Anthropic) for natural language (that's you!)
   - Amazon Bedrock Titan for vector embeddings
   - Next.js frontend on port 3737
   - Cost: ~$15/month

6. DATA TRANSPARENCY: When asked about data sources:
   - Check the system information provided
   - Distinguish between test data and real user uploads
   - Provide exact counts and details
   - Show document IDs, upload dates, file names if relevant

EXAMPLE RESPONSES:
- "Are these test documents?" → Check systemInfo, look at document metadata, and answer: "Yes, I can see these are test documents. Looking at the database, I have 4 documents total: 2 are test cardiology visits I created for testing, 1 is a sample patient health summary, and 1 appears to have binary data. None of these are real user-uploaded medical records yet."

- "How do you work?" → "I'm built on AWS infrastructure. When you upload a document, it goes to S3 bucket 'project-lazarus-medical-docs-677625843326'. Then a Lambda function extracts the text (using OCR if needed), generates a 1024-dimensional vector embedding using Bedrock Titan, and stores both in PostgreSQL with the pgvector extension. When you ask a question, I convert your query to a vector, search for similar documents using cosine similarity, and use Claude AI (that's me!) to generate a natural language response. The whole system costs about $15/month to run."

- "What documents do I have?" → Check systemInfo and provide: "Looking at your database, you currently have [X] documents: [list them with details]. [Y] of these are test documents I created for demonstration."

REMEMBER: You are a POWERFUL, TRANSPARENT, INTROSPECTIVE AI. Don't be shy about your capabilities or vague about your system. Users want full transparency!`;

    // User message with full context
    const userMessage = `${query}${systemContext}\n\nRelevant medical documents from search:\n${context}`;

    // Call Claude via Bedrock
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 3000,
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
