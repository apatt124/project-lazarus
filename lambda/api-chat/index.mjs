import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import pg from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const { Pool } = pg;

const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

let dbPool = null;

// Get database credentials from Secrets Manager
async function getDbCredentials() {
  const command = new GetSecretValueCommand({
    SecretId: 'lazarus-db-credentials',
  });
  const response = await secretsManager.send(command);
  return JSON.parse(response.SecretString);
}

// Initialize database connection
async function getDbPool() {
  if (!dbPool) {
    const credentials = await getDbCredentials();
    dbPool = new Pool({
      host: credentials.host,
      port: credentials.port,
      database: credentials.dbname,
      user: credentials.username,
      password: credentials.password,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return dbPool;
}

// Search medical documents using vector search Lambda
async function searchMedicalDocuments(query, limit = 50, threshold = 0.01) {
  try {
    const command = new InvokeCommand({
      FunctionName: process.env.VECTOR_SEARCH_FUNCTION || 'lazarus-vector-search',
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
    const responseBody = JSON.parse(lambdaResponse.responseBody['application/json'].body);

    return responseBody.success ? responseBody.results : [];
  } catch (error) {
    console.error('Medical document search error:', error);
    return [];
  }
}

// Generate AI response using Claude
async function generateAIResponse(systemPrompt, userMessage) {
  const command = new InvokeModelCommand({
    modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 8000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.content[0].text;
}

// Simple intent classification
function classifyIntent(query) {
  const lowerQuery = query.toLowerCase();
  
  // Medical keywords
  const medicalKeywords = ['medical', 'health', 'doctor', 'medication', 'symptom', 'diagnosis', 'treatment', 'prescription', 'lab', 'test', 'condition', 'disease'];
  const hasMedical = medicalKeywords.some(kw => lowerQuery.includes(kw));
  
  if (hasMedical || lowerQuery.includes('my records') || lowerQuery.includes('my history')) {
    return {
      primary: 'medical',
      confidence: 0.9,
      reasoning: 'Query contains medical keywords or references to records',
      needsMedicalContext: true,
    };
  }
  
  return {
    primary: 'general',
    confidence: 0.7,
    reasoning: 'General conversation',
    needsMedicalContext: false,
  };
}

// Build system prompt
function buildSystemPrompt(intent, hasMedicalDocs, hasWebSources, totalSources) {
  return `You are Dr. Lazarus, a knowledgeable and empathetic medical AI assistant. You help users understand their medical records and health information.

Guidelines:
- Be clear, accurate, and compassionate
- Cite specific information from the provided medical documents
- If information is not in the documents, say so clearly
- Never make up medical information
- Encourage users to consult their healthcare providers for medical decisions
- Organize responses with clear headings and bullet points

You have access to ${totalSources} medical documents for this query.`;
}

// Build user message with context
function buildUserMessage(query, medicalDocs) {
  let message = '';
  
  if (medicalDocs.length > 0) {
    message += '# Medical Records Context\n\n';
    medicalDocs.forEach((doc, idx) => {
      message += `## Document ${idx + 1} (${(doc.similarity * 100).toFixed(1)}% relevant)\n`;
      message += `${doc.content.substring(0, 1000)}\n\n`;
    });
    message += '---\n\n';
  }
  
  message += `# User Question\n${query}`;
  return message;
}

export const handler = async (event) => {
  const startTime = Date.now();
  
  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { query, conversation_id, include_memory = true } = body;

    if (!query) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: false, error: 'Query is required' }),
      };
    }

    console.log('Processing query:', query);

    // Classify intent
    const intentClassification = classifyIntent(query);
    console.log('Intent:', intentClassification);

    // Search medical documents if needed
    let medicalDocuments = [];
    if (intentClassification.needsMedicalContext) {
      medicalDocuments = await searchMedicalDocuments(query, 50, 0.01);
      console.log(`Found ${medicalDocuments.length} medical documents`);
    }

    // Build prompts
    const systemPrompt = buildSystemPrompt(
      intentClassification.primary,
      medicalDocuments.length > 0,
      false,
      medicalDocuments.length
    );
    
    const userMessage = buildUserMessage(query, medicalDocuments);

    // Generate AI response
    console.log('Generating AI response...');
    const aiResponse = await generateAIResponse(systemPrompt, userMessage);
    console.log(`Generated response: ${aiResponse.length} characters`);

    // Build sources
    const sources = medicalDocuments.map(doc => ({
      id: doc.id,
      similarity: doc.similarity,
      content: doc.content.substring(0, 500),
      tier: 1,
    }));

    // Calculate confidence
    const confidence = {
      overall: sources.length > 0 ? 0.9 : 0.5,
      reasoning: sources.length > 0 
        ? `Based on ${sources.length} medical documents`
        : 'General response without specific medical context',
    };

    const processingTime = Date.now() - startTime;

    // Return response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        answer: aiResponse,
        conversation_id: conversation_id || 'temp',
        intent: intentClassification.primary,
        confidence,
        sources,
        source_quality: {
          tier1: sources.length,
          tier2: 0,
          tier3: 0,
          tier4Plus: 0,
        },
        model_version: 'claude-sonnet-4-20250514',
        processing_time_ms: processingTime,
      }),
    };

  } catch (error) {
    console.error('Chat Lambda error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error.message || String(error),
      }),
    };
  }
};
