// Project Lazarus - Database Utilities
// PostgreSQL connection and query helpers

import { Pool, PoolClient } from 'pg';
import type { 
  Conversation, 
  Message, 
  ConversationWithMessages,
  UserFact,
  MemoryEmbedding 
} from './types';

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'lazarus-medical-db.cslknf9zl44o.us-east-1.rds.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'lazarus_admin',
  password: String(process.env.DB_PASSWORD || ''),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: false, // Required for AWS RDS
  },
});

// ============================================
// CONVERSATION OPERATIONS
// ============================================

export async function createConversation(title: string, userId?: string): Promise<Conversation> {
  const result = await pool.query(
    `INSERT INTO medical.conversations (title, user_id)
     VALUES ($1, $2)
     RETURNING *`,
    [title, userId]
  );
  return result.rows[0];
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const result = await pool.query(
    `SELECT * FROM medical.conversations WHERE id = $1`,
    [conversationId]
  );
  return result.rows[0] || null;
}

export async function listConversations(
  userId?: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ conversations: Conversation[]; total: number }> {
  const whereClause = userId ? 'WHERE user_id = $1 AND is_archived = FALSE' : 'WHERE is_archived = FALSE';
  const params = userId ? [userId, limit, offset] : [limit, offset];
  const paramOffset = userId ? 2 : 1;
  
  const [conversationsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT * FROM medical.conversations 
       ${whereClause}
       ORDER BY is_pinned DESC, updated_at DESC
       LIMIT $${paramOffset} OFFSET $${paramOffset + 1}`,
      params
    ),
    pool.query(
      `SELECT COUNT(*) FROM medical.conversations ${whereClause}`,
      userId ? [userId] : []
    )
  ]);
  
  return {
    conversations: conversationsResult.rows,
    total: parseInt(countResult.rows[0].count)
  };
}

export async function updateConversation(
  conversationId: string,
  updates: Partial<Pick<Conversation, 'title' | 'is_pinned' | 'is_archived'>>
): Promise<Conversation> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (updates.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(updates.title);
  }
  if (updates.is_pinned !== undefined) {
    fields.push(`is_pinned = $${paramIndex++}`);
    values.push(updates.is_pinned);
  }
  if (updates.is_archived !== undefined) {
    fields.push(`is_archived = $${paramIndex++}`);
    values.push(updates.is_archived);
  }
  
  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(conversationId);
  
  const result = await pool.query(
    `UPDATE medical.conversations 
     SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );
  
  return result.rows[0];
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await pool.query(
    `DELETE FROM medical.conversations WHERE id = $1`,
    [conversationId]
  );
}

// ============================================
// MESSAGE OPERATIONS
// ============================================

export async function createMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
  const result = await pool.query(
    `INSERT INTO medical.messages (
      conversation_id, role, content, intent, confidence_score, 
      confidence_reasoning, sources, medical_document_ids, web_sources,
      model_version, tokens_input, tokens_output, processing_time_ms, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      message.conversation_id,
      message.role,
      message.content,
      message.intent,
      message.confidence_score,
      message.confidence_reasoning,
      JSON.stringify(message.sources || []),
      message.medical_document_ids || [],
      JSON.stringify(message.web_sources || []),
      message.model_version,
      message.tokens_input,
      message.tokens_output,
      message.processing_time_ms,
      JSON.stringify(message.metadata || {})
    ]
  );
  
  return result.rows[0];
}

export async function getConversationMessages(
  conversationId: string,
  limit: number = 50
): Promise<Message[]> {
  const result = await pool.query(
    `SELECT * FROM medical.messages 
     WHERE conversation_id = $1 
     ORDER BY created_at ASC 
     LIMIT $2`,
    [conversationId, limit]
  );
  
  return result.rows;
}

export async function getConversationWithMessages(
  conversationId: string,
  messageLimit: number = 50
): Promise<ConversationWithMessages | null> {
  const conversation = await getConversation(conversationId);
  if (!conversation) return null;
  
  const messages = await getConversationMessages(conversationId, messageLimit);
  
  return {
    ...conversation,
    messages
  };
}

// ============================================
// USER FACTS OPERATIONS
// ============================================

export async function createUserFact(fact: Omit<UserFact, 'id' | 'created_at' | 'updated_at'>): Promise<UserFact> {
  const result = await pool.query(
    `INSERT INTO medical.user_facts (
      fact_type, content, confidence, source_type, source_document_id,
      source_conversation_id, source_message_id, fact_date, valid_from,
      valid_until, verified_by, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      fact.fact_type,
      fact.content,
      fact.confidence,
      fact.source_type,
      fact.source_document_id,
      fact.source_conversation_id,
      fact.source_message_id,
      fact.fact_date,
      fact.valid_from,
      fact.valid_until,
      fact.verified_by,
      JSON.stringify(fact.metadata)
    ]
  );
  
  return result.rows[0];
}

export async function getUserFacts(
  factTypes?: string[],
  onlyValid: boolean = true
): Promise<UserFact[]> {
  let query = `SELECT * FROM medical.user_facts WHERE 1=1`;
  const params: any[] = [];
  let paramIndex = 1;
  
  if (onlyValid) {
    query += ` AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP)`;
  }
  
  if (factTypes && factTypes.length > 0) {
    query += ` AND fact_type = ANY($${paramIndex++})`;
    params.push(factTypes);
  }
  
  query += ` ORDER BY confidence DESC, created_at DESC`;
  
  const result = await pool.query(query, params);
  return result.rows;
}

// ============================================
// MEMORY OPERATIONS
// ============================================

export async function createMemory(memory: Omit<MemoryEmbedding, 'id' | 'created_at'>): Promise<MemoryEmbedding> {
  const result = await pool.query(
    `INSERT INTO medical.memory_embeddings (
      content, embedding, memory_type, category, source_conversation_id,
      source_message_id, model_version, is_active, relevance_score, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      memory.content,
      memory.embedding ? `[${memory.embedding.join(',')}]` : null,
      memory.memory_type,
      memory.category,
      memory.source_conversation_id,
      memory.source_message_id,
      memory.model_version,
      memory.is_active,
      memory.relevance_score,
      JSON.stringify(memory.metadata)
    ]
  );
  
  return result.rows[0];
}

export async function searchMemories(
  queryEmbedding: number[],
  memoryTypes?: string[],
  matchThreshold: number = 0.7,
  matchCount: number = 10,
  onlyActive: boolean = true
): Promise<MemoryEmbedding[]> {
  const result = await pool.query(
    `SELECT * FROM medical.search_memories($1, $2, $3, $4, $5)`,
    [
      `[${queryEmbedding.join(',')}]`,
      memoryTypes,
      matchThreshold,
      matchCount,
      onlyActive
    ]
  );
  
  return result.rows;
}

export async function updateMemoryUsage(memoryId: string): Promise<void> {
  await pool.query(
    `UPDATE medical.memory_embeddings 
     SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [memoryId]
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}

// Export pool for advanced usage
export { pool };
