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

// Get user facts from database
async function getUserFacts() {
  try {
    const pool = await getDbPool();
    const result = await pool.query(`
      SELECT fact_type, content, confidence, fact_date
      FROM medical.user_facts
      WHERE (valid_until IS NULL OR valid_until > NOW())
        AND confidence >= 0.5
      ORDER BY confidence DESC, created_at DESC
      LIMIT 50
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching user facts:', error);
    return [];
  }
}

// Search memory embeddings
async function searchMemories(query) {
  try {
    const pool = await getDbPool();
    
    // Generate embedding for query
    const command = new InvokeModelCommand({
      modelId: 'amazon.titan-embed-text-v2:0',
      body: JSON.stringify({
        inputText: query.substring(0, 8000),
        dimensions: 1024,
        normalize: true
      })
    });
    
    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const embedding = responseBody.embedding;
    
    // Search memories
    const result = await pool.query(`
      SELECT * FROM medical.search_memories(
        $1,
        NULL,
        0.7,
        10,
        TRUE
      )
    `, [`[${embedding.join(',')}]`]); // Format as PostgreSQL array
    
    // Update usage count for retrieved memories
    if (result.rows.length > 0) {
      const memoryIds = result.rows.map(r => r.id);
      await pool.query(`
        UPDATE medical.memory_embeddings
        SET usage_count = usage_count + 1,
            last_used_at = NOW()
        WHERE id = ANY($1)
      `, [memoryIds]);
    }
    
    return result.rows;
  } catch (error) {
    console.error('Error searching memories:', error);
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
function buildSystemPrompt(intent, hasMedicalDocs, hasMemories, hasFacts, totalSources) {
  let prompt = `You are Dr. Lazarus, a knowledgeable and empathetic medical AI assistant. You help users understand their medical records and health information.

Guidelines:
- Be clear, accurate, and compassionate
- Cite specific information from the provided medical documents
- If information is not in the documents, say so clearly
- Never make up medical information
- Encourage users to consult their healthcare providers for medical decisions
- Organize responses with clear headings and bullet points

You have access to ${totalSources} medical documents for this query.`;

  if (hasFacts) {
    prompt += `\n\nYou also have access to verified facts about the user from previous conversations and medical records. Use these to personalize your responses.`;
  }
  
  if (hasMemories) {
    prompt += `\n\nYou have memory of previous conversations and learned preferences. Use this context to provide more relevant and personalized responses.`;
  }
  
  return prompt;
}

// Build user message with context
function buildUserMessage(query, medicalDocs, userFacts, memories) {
  let message = '';
  
  // Add user facts context (weighted by confidence)
  if (userFacts.length > 0) {
    message += '# Known Facts About User\n\n';
    
    const factsByType = {};
    userFacts.forEach(fact => {
      if (!factsByType[fact.fact_type]) {
        factsByType[fact.fact_type] = [];
      }
      factsByType[fact.fact_type].push(fact);
    });
    
    Object.entries(factsByType).forEach(([type, facts]) => {
      message += `## ${type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
      facts.forEach(fact => {
        // Include confidence indicator for lower confidence facts
        const confidenceNote = fact.confidence < 0.8 ? ` [${(fact.confidence * 100).toFixed(0)}% confidence]` : '';
        message += `- ${fact.content}${confidenceNote}`;
        if (fact.fact_date) {
          message += ` (${fact.fact_date})`;
        }
        message += `\n`;
      });
      message += '\n';
    });
    
    message += '---\n\n';
  }
  
  // Add memory context (weighted by relevance)
  if (memories.length > 0) {
    message += '# Relevant Context from Previous Conversations\n\n';
    memories.forEach((mem, idx) => {
      // Include relevance indicator for lower relevance memories
      const relevanceNote = mem.relevance_score < 0.8 ? ` [${(mem.relevance_score * 100).toFixed(0)}% relevance]` : '';
      message += `${idx + 1}. ${mem.content} (${mem.memory_type})${relevanceNote}\n`;
    });
    message += '\n---\n\n';
  }
  
  // Add medical documents
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

// Save message to conversation
async function saveToConversation(conversationId, userMessage, assistantResponse, metadata) {
  if (!conversationId || conversationId === 'temp') {
    return; // Skip saving for temporary conversations
  }
  
  try {
    const pool = await getDbPool();
    
    // Save user message
    await pool.query(`
      INSERT INTO medical.messages (
        conversation_id,
        role,
        content,
        intent,
        confidence_score,
        sources,
        model_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      conversationId,
      'user',
      userMessage,
      metadata.intent || 'general',
      metadata.confidence || 0.5,
      JSON.stringify(metadata.sources || []),
      null
    ]);
    
    // Save assistant message
    await pool.query(`
      INSERT INTO medical.messages (
        conversation_id,
        role,
        content,
        intent,
        confidence_score,
        sources,
        model_version,
        processing_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      conversationId,
      'assistant',
      assistantResponse,
      metadata.intent || 'general',
      metadata.confidence || 0.5,
      JSON.stringify(metadata.sources || []),
      'claude-sonnet-4-20250514',
      metadata.processing_time_ms || null
    ]);
    
    // Conversation timestamp and message count are updated automatically by trigger
  } catch (error) {
    console.error('Failed to save to conversation:', error);
    // Don't fail the request if saving fails
  }
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

    // Fetch context in parallel
    const [medicalDocuments, userFacts, memories] = await Promise.all([
      intentClassification.needsMedicalContext ? searchMedicalDocuments(query, 50, 0.01) : Promise.resolve([]),
      getUserFacts(),
      searchMemories(query)
    ]);
    
    console.log(`Found ${medicalDocuments.length} medical documents`);
    console.log(`Found ${userFacts.length} user facts`);
    console.log(`Found ${memories.length} relevant memories`);

    // Build prompts
    const systemPrompt = buildSystemPrompt(
      intentClassification.primary,
      medicalDocuments.length > 0,
      memories.length > 0,
      userFacts.length > 0,
      medicalDocuments.length
    );
    
    const userMessage = buildUserMessage(query, medicalDocuments, userFacts, memories);

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

    // Save to conversation if conversation_id provided
    await saveToConversation(conversation_id, query, aiResponse, {
      intent: intentClassification.primary,
      confidence: confidence.overall,
      sources,
      processing_time_ms: processingTime
    });

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
