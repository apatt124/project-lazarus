import pg from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const { Pool } = pg;
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

// List all conversations
async function listConversations() {
  const pool = await getDbPool();
  const result = await pool.query(`
    SELECT 
      id,
      title,
      created_at,
      updated_at,
      is_pinned,
      is_archived,
      message_count,
      last_message_at
    FROM medical.conversations
    WHERE is_archived = FALSE
    ORDER BY 
      is_pinned DESC,
      updated_at DESC
    LIMIT 50
  `);
  return result.rows;
}

// Get a single conversation with messages
async function getConversation(conversationId) {
  const pool = await getDbPool();
  
  // Get conversation
  const convResult = await pool.query(
    'SELECT * FROM medical.conversations WHERE id = $1',
    [conversationId]
  );
  
  if (convResult.rows.length === 0) {
    return null;
  }
  
  // Get messages
  const messagesResult = await pool.query(`
    SELECT 
      id,
      role,
      content,
      created_at,
      intent,
      confidence_score,
      sources,
      model_version,
      processing_time_ms
    FROM medical.messages
    WHERE conversation_id = $1
    ORDER BY created_at ASC
  `, [conversationId]);
  
  return {
    ...convResult.rows[0],
    messages: messagesResult.rows
  };
}

// Create a new conversation
async function createConversation(title) {
  const pool = await getDbPool();
  const result = await pool.query(
    'INSERT INTO medical.conversations (title) VALUES ($1) RETURNING *',
    [title || 'New Conversation']
  );
  return result.rows[0];
}

// Update conversation
async function updateConversation(conversationId, updates) {
  const pool = await getDbPool();
  const { title, is_pinned, is_archived } = updates;
  
  // Build dynamic update query
  const updateFields = [];
  const values = [];
  let paramCount = 1;
  
  if (title !== undefined) {
    updateFields.push(`title = $${paramCount++}`);
    values.push(title);
  }
  
  if (is_pinned !== undefined) {
    updateFields.push(`is_pinned = $${paramCount++}`);
    values.push(is_pinned);
  }
  
  if (is_archived !== undefined) {
    updateFields.push(`is_archived = $${paramCount++}`);
    values.push(is_archived);
  }
  
  updateFields.push(`updated_at = NOW()`);
  values.push(conversationId);
  
  const query = `
    UPDATE medical.conversations 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

// Delete conversation
async function deleteConversation(conversationId) {
  const pool = await getDbPool();
  
  // Messages will be deleted automatically by CASCADE
  await pool.query('DELETE FROM medical.conversations WHERE id = $1', [conversationId]);
  
  return { success: true };
}

// Add message to conversation
async function addMessage(conversationId, role, content, metadata = {}) {
  const pool = await getDbPool();
  
  const result = await pool.query(`
    INSERT INTO medical.messages (
      conversation_id,
      role,
      content,
      intent,
      confidence_score,
      sources,
      model_version
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    conversationId,
    role,
    content,
    metadata.intent || 'general',
    metadata.confidence || 0.5,
    JSON.stringify(metadata.sources || []),
    metadata.model_version || null
  ]);
  
  // Conversation timestamp and message count are updated automatically by trigger
  
  return result.rows[0];
}

export const handler = async (event) => {
  try {
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
    const pathParts = path.split('/').filter(Boolean);
    
    console.log('Conversations API:', method, path);
    
    // GET /conversations - List all conversations
    if (method === 'GET' && pathParts.length === 1) {
      const conversations = await listConversations();
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true, conversations })
      };
    }
    
    // GET /conversations/:id - Get single conversation
    if (method === 'GET' && pathParts.length === 2) {
      const conversationId = pathParts[1];
      const conversation = await getConversation(conversationId);
      
      if (!conversation) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ success: false, error: 'Conversation not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true, conversation })
      };
    }
    
    // POST /conversations - Create new conversation
    if (method === 'POST' && pathParts.length === 1) {
      const body = JSON.parse(event.body || '{}');
      const conversation = await createConversation(body.title);
      
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true, conversation })
      };
    }
    
    // PUT /conversations/:id - Update conversation
    if (method === 'PUT' && pathParts.length === 2) {
      const conversationId = pathParts[1];
      const body = JSON.parse(event.body || '{}');
      const conversation = await updateConversation(conversationId, body);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true, conversation })
      };
    }
    
    // DELETE /conversations/:id - Delete conversation
    if (method === 'DELETE' && pathParts.length === 2) {
      const conversationId = pathParts[1];
      await deleteConversation(conversationId);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true })
      };
    }
    
    // POST /conversations/:id/messages - Add message to conversation
    if (method === 'POST' && pathParts.length === 3 && pathParts[2] === 'messages') {
      const conversationId = pathParts[1];
      const body = JSON.parse(event.body || '{}');
      
      const message = await addMessage(
        conversationId,
        body.role || 'user',
        body.content,
        body.metadata
      );
      
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true, message })
      };
    }
    
    // Method not allowed
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
    
  } catch (error) {
    console.error('Conversations API error:', error);
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
