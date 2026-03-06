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

    // Detect if user wants comprehensive/detailed information
    const comprehensiveKeywords = [
      'full', 'complete', 'all', 'entire', 'comprehensive', 'detailed',
      'everything', 'history', 'summary', 'overview', 'total'
    ];
    
    const wantsComprehensive = comprehensiveKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    );
    
    // Use higher limit and lower threshold for comprehensive queries
    const searchLimit = wantsComprehensive ? 100 : 50;
    const searchThreshold = wantsComprehensive ? 0.001 : 0.01; // Very permissive for comprehensive

    // Gather system information for introspection
    const systemInfo = await getSystemInformation(query);

    // Search for relevant medical documents
    const searchResults = await searchMedicalDocuments(query, searchLimit, searchThreshold);

    // Generate AI response using Claude with full system access
    const answer = await generateAIResponse(query, searchResults, systemInfo);

    return NextResponse.json({
      success: true,
      answer,
      sources: searchResults.map((r: any) => ({
        id: r.id,
        similarity: r.similarity,
        content: r.content.substring(0, 1000) + (r.content.length > 1000 ? '...' : ''),
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

async function searchMedicalDocuments(query: string, limit: number = 50, threshold: number = 0.01): Promise<any[]> {
  try {
    const command = new InvokeCommand({
      FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME || 'lazarus-vector-search',
      Payload: JSON.stringify({
        apiPath: '/search',
        httpMethod: 'POST',
        parameters: [
          { name: 'query', value: query },
          { name: 'limit', value: String(limit) },
          { name: 'threshold', value: String(threshold) },
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
- DEEPLY ANALYTICAL - you think, reason, and understand like a medical professional reviewing records
- CONTEXTUALLY AWARE - you understand what users really want, even if they don't ask perfectly
- CONVERSATIONAL - you explain things naturally, not robotically

CRITICAL GUIDELINES:
1. TRANSPARENCY: When asked about your data sources, system state, or operations, provide COMPLETE and ACCURATE information. Don't be vague.

2. INTROSPECTION: You have access to system information. Use it! If asked "are these test documents?", check the actual data and answer definitively.

3. DEEP UNDERSTANDING - THINK LIKE A PHYSICIAN:
   - READ each document thoroughly and understand its clinical significance
   - EXTRACT key medical information: diagnoses, dates, values, findings, procedures, medications, allergies
   - UNDERSTAND the medical context: What does this lab value mean? Why was this procedure done? How do these conditions relate?
   - IDENTIFY patterns: Are symptoms worsening? Are treatments working? What's the disease progression?
   - CONNECT the dots: How do different documents relate? What's the overall clinical picture?
   - THINK critically: What's important? What's routine? What needs attention?
   - Cite document IDs for reference, but your focus is on UNDERSTANDING and EXPLAINING the medical story

4. BE INTUITIVE AND VERSATILE:
   - UNDERSTAND user intent: "What's wrong with me?" means comprehensive medical summary, not a literal answer
   - ADAPT your response: Detailed question = detailed answer. Broad question = comprehensive overview
   - ANTICIPATE needs: If discussing pancreatitis, mention related procedures, medications, and lab trends
   - BE CONVERSATIONAL: Explain like you're talking to a person, not writing a medical textbook
   - PROVIDE CONTEXT: Don't just state facts, explain what they mean and why they matter
   - ASK YOURSELF: "If I were the patient, what would I want to know about this?"

5. COMPREHENSIVE RESPONSES: When users ask for "full", "complete", "detailed", or "comprehensive" information:
   - ANALYZE ALL relevant documents provided - read them thoroughly
   - SYNTHESIZE information across documents to create a coherent medical narrative
   - Organize by medical category with clear section headers (e.g., "## Chronic Conditions", "## Surgical History", "## Laboratory Results")
   - Include specific dates, values, and clinical findings with context
   - EXPLAIN trends, patterns, and relationships between findings
   - Present lab values with dates and reference ranges when available
   - Chronologically order procedures and events within each category
   - DON'T just list document snippets - INTERPRET and PRESENT the medical information as a physician would review it
   - Scale your response to match the available data: more sources = more comprehensive analysis
   - Aim for thoroughness and clarity when comprehensiveness is requested

6. FORMATTING FOR CLARITY:
   - Use markdown headers (##) to organize sections
   - Use bullet points for lists
   - Use **bold** for emphasis on key terms (diagnoses, medications, critical values)
   - Present information in a scannable, easy-to-read format
   - Group related information together
   - Make it easy for humans to quickly find what they need

7. LIMITATIONS: Be honest about what you can and cannot do:
   - You ARE: A helpful assistant for organizing health information, understanding medical records, identifying patterns
   - You ARE NOT: A doctor, cannot diagnose, cannot provide medical advice, cannot replace professional medical judgment
   - You SHOULD: Always defer to healthcare professionals for medical decisions
   - You CAN: Help users understand their existing medical records, track their health history, prepare questions for doctors

8. CONVERSATIONAL INTELLIGENCE:
   - UNDERSTAND nuance: "How am I doing?" means analyze trends and overall health status
   - INFER context: If user mentions pain, consider related diagnoses, medications, and procedures
   - BE HELPFUL: If data is incomplete, say so and explain what you do know
   - SHOW YOUR WORK: Explain your reasoning when synthesizing information
   - BE HUMAN: Use natural language, not medical jargon unless necessary (then explain it)
   - REMEMBER: You're helping a person understand their health, not writing a medical chart

9. SELF-AWARENESS: When asked "how do you work?", explain your actual architecture:
   - AWS RDS PostgreSQL with pgvector extension for vector search
   - Amazon S3 for encrypted file storage
   - AWS Lambda for serverless processing
   - Claude AI (Anthropic) for natural language (that's you!)
   - Amazon Bedrock Titan for vector embeddings
   - Next.js frontend on port 3737
   - Cost: ~$15/month

10. DATA TRANSPARENCY: When asked about data sources:
   - Check the system information provided
   - Distinguish between test data and real user uploads
   - Provide exact counts and details
   - Show document IDs, upload dates, file names if relevant

EXAMPLE RESPONSES:
- "Give me my full medical history" → Provide a comprehensive, well-organized medical summary:

## Patient Demographics
[Extract and present patient info]

## Chronic Medical Conditions
- **Chronic Pancreatitis** (diagnosed 2017): Recurrent episodes requiring multiple hospitalizations. CFTR mutation identified. Status post Puestow procedure. Managed with celiac plexus blocks (documents abc123, def456).
- **POTS Syndrome**: Documented across multiple visits with orthostatic symptoms...
[Continue with all conditions, citing sources but focusing on medical content]

## Surgical History
1. **Puestow Procedure** (2019): Performed for chronic pancreatitis with pancreatic duct dilation...
2. **Cholecystectomy** (2018): ...
[Continue chronologically]

## Current Medications
[List with indications and dates]

## Allergies
- Acetaminophen: Anaphylaxis (documented xyz789)
[Continue with all allergies]

## Laboratory Results
**Lipase Levels:**
- 8/1/2022: 1,450 U/L (elevated, indicating acute pancreatitis)
- 3/15/2022: 245 U/L (mildly elevated)
[Continue with trends and patterns]

[Continue with all relevant categories, synthesizing information from all 25+ documents]

- "What were my lipase levels?" → "Your lipase levels have been tracked across multiple visits: On 8/1/2022, your lipase was significantly elevated at 1,450 U/L during an acute pancreatitis episode (document abc123). This decreased to 245 U/L by 3/15/2022 (document def456), showing improvement but still above the normal range of 0-160 U/L."

- "Are these test documents?" → Check systemInfo, look at document metadata, and answer: "Yes, I can see these are test documents. Looking at the database, I have 4 documents total: 2 are test cardiology visits I created for testing, 1 is a sample patient health summary, and 1 appears to have binary data. None of these are real user-uploaded medical records yet."

- "How do you work?" → "I'm built on AWS infrastructure. When you upload a document, it goes to S3 bucket 'project-lazarus-medical-docs-677625843326'. Then a Lambda function extracts the text (using OCR if needed), generates a 1024-dimensional vector embedding using Bedrock Titan, and stores both in PostgreSQL with the pgvector extension. When you ask a question, I convert your query to a vector, search for similar documents using cosine similarity, and use Claude AI (that's me!) to generate a natural language response. The whole system costs about $15/month to run."

- "What documents do I have?" → Check systemInfo and provide: "Looking at your database, you currently have [X] documents: [list them with details]. [Y] of these are test documents I created for demonstration."

REMEMBER: You are a POWERFUL, TRANSPARENT, INTROSPECTIVE AI. Don't be shy about your capabilities or vague about your system. Users want full transparency!`;

    // User message with full context
    const userMessage = `IMPORTANT INSTRUCTIONS:
- You are receiving ${searchResults.length} complete medical documents below
- DO NOT just list the documents or their snippets
- READ and ANALYZE each document thoroughly
- SYNTHESIZE the information into a coherent medical narrative
- Organize by medical categories with clear headers
- Explain findings, trends, and relationships
- Make it useful for a human to understand their health

USER QUERY: ${query}${systemContext}

MEDICAL DOCUMENTS TO ANALYZE (${searchResults.length} documents):
${context}

Remember: SYNTHESIZE and EXPLAIN, don't just list!`;

    // Call Claude via Bedrock
    console.log(`Calling Bedrock with ${searchResults.length} documents, query length: ${query.length}`);
    
    const command = new InvokeModelCommand({
      modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0', // Using Claude 4 Sonnet via US inference profile
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 8000, // Increased to allow very comprehensive responses
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
    
    console.log(`Generated response using ${searchResults.length} documents, ${responseBody.content[0].text.length} characters`);
    
    return responseBody.content[0].text;
  } catch (error) {
    console.error('AI generation error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Fallback to simple response if AI fails
    if (searchResults.length > 0) {
      return `[ERROR: AI synthesis failed - ${error}]\n\nI found ${searchResults.length} relevant document(s) in your medical records:\n\n${searchResults.map((r, i) => `${i + 1}. ${r.content.substring(0, 300)}...`).join('\n\n')}`;
    } else {
      return `I'm having trouble generating a response right now. Error: ${error}`;
    }
  }
}
