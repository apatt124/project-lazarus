import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import pg from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const { Pool } = pg;

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

let dbPool = null;

// Get database credentials
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

// Generate embedding using Bedrock
async function generateEmbedding(text) {
  const command = new InvokeModelCommand({
    modelId: 'amazon.titan-embed-text-v2:0',
    body: JSON.stringify({
      inputText: text.substring(0, 8000),
      dimensions: 1024,
      normalize: true
    })
  });
  
  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.embedding;
}

// Extract facts from conversation using Claude
async function extractFacts(conversationMessages) {
  const prompt = `Analyze this medical conversation and extract key facts about the user. Focus on:
- Medical conditions (current or past)
- Allergies
- Medications (current or past)
- Procedures or surgeries
- Family history
- Lifestyle factors (diet, exercise, smoking, etc.)
- Preferences (communication style, concerns, goals)

For each fact, provide:
1. fact_type: One of [medical_condition, allergy, medication, procedure, family_history, lifestyle, preference]
2. content: Clear, concise statement of the fact
3. confidence: 0.0-1.0 (how confident you are this is accurate)
4. source_type: One of [user_stated, inferred, medical_record]
5. fact_date: Date when this occurred (if mentioned), format YYYY-MM-DD

Return ONLY a JSON array of facts. If no facts found, return empty array.

Conversation:
${conversationMessages.map(m => `${m.role}: ${m.content}`).join('\n\n')}`;

  const command = new InvokeModelCommand({
    modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const text = responseBody.content[0].text;
  
  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  return [];
}

// Extract learnings from conversation using Claude
async function extractLearnings(conversationMessages) {
  const prompt = `Analyze this conversation and extract key learnings, preferences, and instructions that should be remembered for future conversations. Focus on:
- User preferences (how they like information presented)
- Corrections or clarifications the user made
- Instructions for future behavior
- Important context about the user's situation
- Communication style preferences

For each learning, provide:
1. memory_type: One of [instruction, preference, learning, correction]
2. category: One of [medical, general, behavioral]
3. content: Clear statement of what to remember

Return ONLY a JSON array of learnings. If none found, return empty array.

Conversation:
${conversationMessages.map(m => `${m.role}: ${m.content}`).join('\n\n')}`;

  const command = new InvokeModelCommand({
    modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const text = responseBody.content[0].text;
  
  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  return [];
}

// Store user facts
async function storeFacts(conversationId, facts) {
  const pool = await getDbPool();
  const stored = [];
  
  for (const fact of facts) {
    const result = await pool.query(`
      INSERT INTO medical.user_facts (
        fact_type,
        content,
        confidence,
        source_type,
        source_conversation_id,
        fact_date,
        verified_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      fact.fact_type,
      fact.content,
      fact.confidence || 0.8,
      fact.source_type || 'user_stated',
      conversationId,
      fact.fact_date || null,
      'system'
    ]);
    
    stored.push(result.rows[0]);
  }
  
  return stored;
}

// Store memory embeddings
async function storeMemories(conversationId, learnings) {
  const pool = await getDbPool();
  const stored = [];
  
  for (const learning of learnings) {
    // Generate embedding for semantic search
    const embedding = await generateEmbedding(learning.content);
    
    const result = await pool.query(`
      INSERT INTO medical.memory_embeddings (
        content,
        embedding,
        memory_type,
        category,
        source_conversation_id,
        model_version
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      learning.content,
      `[${embedding.join(',')}]`, // Format as PostgreSQL array
      learning.memory_type,
      learning.category || 'general',
      conversationId,
      'claude-sonnet-4-20250514'
    ]);
    
    stored.push(result.rows[0]);
  }
  
  return stored;
}

// Get user facts
async function getUserFacts(factTypes = null, onlyValid = true) {
  const pool = await getDbPool();
  
  let query = `
    SELECT * FROM medical.user_facts
    WHERE 1=1
  `;
  
  const params = [];
  
  if (onlyValid) {
    query += ` AND (valid_until IS NULL OR valid_until > NOW())`;
  }
  
  if (factTypes && factTypes.length > 0) {
    params.push(factTypes);
    query += ` AND fact_type = ANY($${params.length})`;
  }
  
  query += ` ORDER BY confidence DESC, created_at DESC`;
  
  const result = await pool.query(query, params);
  return result.rows;
}

// Search memories using semantic similarity
async function searchMemories(query, limit = 10, threshold = 0.7) {
  const pool = await getDbPool();
  
  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);
  
  const result = await pool.query(`
    SELECT * FROM medical.search_memories(
      $1::vector(1024),
      NULL,
      $2,
      $3,
      TRUE
    )
  `, [queryEmbedding, threshold, limit]);
  
  return result.rows;
}

// Process conversation for memory extraction
async function processConversation(conversationId) {
  const pool = await getDbPool();
  
  // Get conversation messages
  const messagesResult = await pool.query(`
    SELECT role, content, created_at
    FROM medical.messages
    WHERE conversation_id = $1
    ORDER BY created_at ASC
  `, [conversationId]);
  
  const messages = messagesResult.rows;
  
  if (messages.length === 0) {
    return { facts: [], memories: [] };
  }
  
  // Extract facts and learnings
  const [facts, learnings] = await Promise.all([
    extractFacts(messages),
    extractLearnings(messages)
  ]);
  
  // Store in database
  const [storedFacts, storedMemories] = await Promise.all([
    storeFacts(conversationId, facts),
    storeMemories(conversationId, learnings)
  ]);
  
  return {
    facts: storedFacts,
    memories: storedMemories
  };
}

export const handler = async (event) => {
  try {
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
    const body = event.body ? JSON.parse(event.body) : {};
    
    console.log('Memory API:', method, path);
    
    // POST /memory/process/:conversationId - Extract facts and memories from conversation
    if (method === 'POST' && path.includes('/process/')) {
      const conversationId = path.split('/').pop();
      const result = await processConversation(conversationId);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          facts_extracted: result.facts.length,
          memories_extracted: result.memories.length,
          facts: result.facts,
          memories: result.memories
        })
      };
    }
    
    // GET /memory/facts - Get user facts
    if (method === 'GET' && path.includes('/facts')) {
      const factTypes = body.fact_types || null;
      const facts = await getUserFacts(factTypes);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          facts,
          count: facts.length
        })
      };
    }
    
    // POST /memory/search - Search memories semantically
    if (method === 'POST' && path.includes('/search')) {
      const { query, limit, threshold } = body;
      const memories = await searchMemories(query, limit, threshold);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          memories,
          count: memories.length
        })
      };
    }
    
    // DELETE /memory/facts/:factId - Delete a user fact
    if (method === 'DELETE' && path.includes('/facts/')) {
      const factId = path.split('/').pop();
      const pool = await getDbPool();
      
      await pool.query('DELETE FROM medical.user_facts WHERE id = $1', [factId]);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true })
      };
    }
    
    // PATCH /memory/facts/:factId - Update fact confidence
    if (method === 'PATCH' && path.includes('/facts/')) {
      const factId = path.split('/').pop();
      const { confidence } = body;
      const pool = await getDbPool();
      
      const result = await pool.query(`
        UPDATE medical.user_facts 
        SET confidence = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [confidence, factId]);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          fact: result.rows[0]
        })
      };
    }
    
    // GET /memory/memories - Get all memory embeddings
    if (method === 'GET' && path.includes('/memories')) {
      const pool = await getDbPool();
      
      const result = await pool.query(`
        SELECT 
          id, content, memory_type, category, relevance_score, 
          is_active, usage_count, last_used_at, created_at
        FROM medical.memory_embeddings
        ORDER BY relevance_score DESC, created_at DESC
      `);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          memories: result.rows,
          count: result.rows.length
        })
      };
    }
    
    // DELETE /memory/memories/:memoryId - Delete a memory
    if (method === 'DELETE' && path.includes('/memories/')) {
      const memoryId = path.split('/').pop();
      const pool = await getDbPool();
      
      await pool.query('DELETE FROM medical.memory_embeddings WHERE id = $1', [memoryId]);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true })
      };
    }
    
    // PATCH /memory/memories/:memoryId - Update memory relevance or active status
    if (method === 'PATCH' && path.includes('/memories/')) {
      const memoryId = path.split('/').pop();
      const { relevance_score, is_active } = body;
      const pool = await getDbPool();
      
      const updates = [];
      const params = [];
      let paramCount = 1;
      
      if (relevance_score !== undefined) {
        updates.push(`relevance_score = $${paramCount++}`);
        params.push(relevance_score);
      }
      
      if (is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        params.push(is_active);
      }
      
      params.push(memoryId);
      
      const result = await pool.query(`
        UPDATE medical.memory_embeddings 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, params);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          memory: result.rows[0]
        })
      };
    }
    
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ success: false, error: 'Not found' })
    };
    
  } catch (error) {
    console.error('Memory API error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error.message || String(error)
      })
    };
  }
};
