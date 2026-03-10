import pg from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const { Pool } = pg;
const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

let dbPool = null;

async function getDbCredentials() {
  const command = new GetSecretValueCommand({
    SecretId: 'lazarus-db-credentials',
  });
  const response = await secretsManager.send(command);
  return JSON.parse(response.SecretString);
}

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

// List all relationships
async function listRelationships(filters = {}) {
  const pool = await getDbPool();
  
  let query = `
    SELECT 
      r.*,
      sf.content as source_content,
      sf.fact_type as source_type,
      tf.content as target_content,
      tf.fact_type as target_type
    FROM medical.relationships r
    JOIN medical.user_facts sf ON r.source_fact_id = sf.id
    JOIN medical.user_facts tf ON r.target_fact_id = tf.id
    WHERE 1=1
  `;
  
  const params = [];
  let paramCount = 1;
  
  if (filters.is_active !== undefined) {
    query += ` AND r.is_active = $${paramCount++}`;
    params.push(filters.is_active);
  }
  
  if (filters.is_medical !== undefined) {
    query += ` AND r.is_medical = $${paramCount++}`;
    params.push(filters.is_medical);
  }
  
  if (filters.min_strength !== undefined) {
    query += ` AND r.strength >= $${paramCount++}`;
    params.push(filters.min_strength);
  }
  
  query += ' ORDER BY r.strength DESC, r.created_at DESC';
  
  const result = await pool.query(query, params);
  return result.rows;
}

// Get relationships for a specific fact
async function getFactRelationships(factId) {
  const pool = await getDbPool();
  
  const result = await pool.query(`
    SELECT 
      r.*,
      CASE 
        WHEN r.source_fact_id = $1 THEN tf.content
        ELSE sf.content
      END as related_content,
      CASE 
        WHEN r.source_fact_id = $1 THEN tf.fact_type
        ELSE sf.fact_type
      END as related_type,
      CASE 
        WHEN r.source_fact_id = $1 THEN r.target_fact_id
        ELSE r.source_fact_id
      END as related_fact_id
    FROM medical.relationships r
    JOIN medical.user_facts sf ON r.source_fact_id = sf.id
    JOIN medical.user_facts tf ON r.target_fact_id = tf.id
    WHERE r.source_fact_id = $1 OR r.target_fact_id = $1
    ORDER BY r.strength DESC
  `, [factId]);
  
  return result.rows;
}

// Create relationship
async function createRelationship(data) {
  const pool = await getDbPool();
  
  const result = await pool.query(`
    INSERT INTO medical.relationships (
      source_fact_id,
      target_fact_id,
      relationship_type,
      strength,
      reasoning,
      category,
      is_medical,
      valid_from
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    data.source_fact_id,
    data.target_fact_id,
    data.relationship_type,
    data.strength || 0.5,
    data.reasoning || '',
    data.category || 'medical',
    data.is_medical !== false,
    data.valid_from || new Date().toISOString()
  ]);
  
  // Log creation
  await pool.query(`
    INSERT INTO medical.knowledge_graph_changes (
      change_type, entity_type, entity_id, new_value, reasoning
    ) VALUES ($1, $2, $3, $4, $5)
  `, [
    'relationship_created',
    'relationship',
    result.rows[0].id,
    JSON.stringify(result.rows[0]),
    data.reasoning || 'Created via API'
  ]);
  
  return result.rows[0];
}

// Update relationship
async function updateRelationship(relationshipId, updates) {
  const pool = await getDbPool();
  
  // Get old value for audit
  const oldResult = await pool.query(
    'SELECT * FROM medical.relationships WHERE id = $1',
    [relationshipId]
  );
  
  const updateFields = [];
  const values = [];
  let paramCount = 1;
  
  if (updates.strength !== undefined) {
    updateFields.push(`strength = $${paramCount++}`);
    values.push(updates.strength);
  }
  
  if (updates.is_active !== undefined) {
    updateFields.push(`is_active = $${paramCount++}`);
    values.push(updates.is_active);
    
    if (updates.is_active === false) {
      updateFields.push(`valid_until = NOW()`);
    }
  }
  
  if (updates.user_verified !== undefined) {
    updateFields.push(`user_verified = $${paramCount++}`);
    values.push(updates.user_verified);
    updateFields.push(`last_verified_at = NOW()`);
  }
  
  if (updates.reasoning !== undefined) {
    updateFields.push(`reasoning = $${paramCount++}`);
    values.push(updates.reasoning);
  }
  
  values.push(relationshipId);
  
  const result = await pool.query(`
    UPDATE medical.relationships
    SET ${updateFields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `, values);
  
  // Log update
  await pool.query(`
    INSERT INTO medical.knowledge_graph_changes (
      change_type, entity_type, entity_id, old_value, new_value
    ) VALUES ($1, $2, $3, $4, $5)
  `, [
    'relationship_updated',
    'relationship',
    relationshipId,
    JSON.stringify(oldResult.rows[0]),
    JSON.stringify(result.rows[0])
  ]);
  
  return result.rows[0];
}

// Delete relationship
async function deleteRelationship(relationshipId) {
  const pool = await getDbPool();
  
  // Get for audit
  const oldResult = await pool.query(
    'SELECT * FROM medical.relationships WHERE id = $1',
    [relationshipId]
  );
  
  await pool.query('DELETE FROM medical.relationships WHERE id = $1', [relationshipId]);
  
  // Log deletion
  await pool.query(`
    INSERT INTO medical.knowledge_graph_changes (
      change_type, entity_type, entity_id, old_value
    ) VALUES ($1, $2, $3, $4)
  `, [
    'relationship_deleted',
    'relationship',
    relationshipId,
    JSON.stringify(oldResult.rows[0])
  ]);
  
  return { success: true };
}

// Search facts by keyword
async function searchFacts(query) {
  const pool = await getDbPool();
  
  const result = await pool.query(`
    SELECT id, fact_type, content, confidence, fact_date, metadata
    FROM medical.user_facts
    WHERE content ILIKE $1 AND is_active = TRUE
    ORDER BY confidence DESC
    LIMIT 20
  `, [`%${query}%`]);
  
  return result.rows;
}

// Get knowledge graph at specific time
async function getGraphAtTime(timestamp) {
  const pool = await getDbPool();
  
  const result = await pool.query(
    'SELECT * FROM medical.get_knowledge_graph_at_time($1)',
    [timestamp]
  );
  
  return result.rows;
}

// Get timeline events
async function getTimelineEvents() {
  const pool = await getDbPool();
  
  const result = await pool.query('SELECT * FROM medical.get_timeline_events()');
  return result.rows;
}

// Extract relationships using AI
async function extractRelationships() {
  const pool = await getDbPool();
  
  // Get all active facts
  const factsResult = await pool.query(`
    SELECT id, fact_type, content, confidence, fact_date, metadata
    FROM medical.user_facts
    WHERE is_active = TRUE
    ORDER BY fact_date DESC NULLS LAST
  `);
  
  const facts = factsResult.rows;
  
  if (facts.length < 2) {
    return { relationships_created: 0, message: 'Need at least 2 facts to create relationships' };
  }
  
  // Prepare facts for AI
  const factsText = facts.map((f, i) => 
    `[${i}] ${f.fact_type}: ${f.content} (ID: ${f.id}, Date: ${f.fact_date || 'unknown'})`
  ).join('\n');
  
  const prompt = `Analyze these medical facts and identify relationships between them:

${factsText}

For each meaningful relationship, provide:
1. Source fact ID (the UUID)
2. Target fact ID (the UUID)
3. Relationship type: treats, causes, contraindicates, related_to, monitors, requires, prescribed_by, managed_by
4. Strength (0.0-1.0): How confident you are in this relationship
5. Reasoning: Brief explanation

Focus on:
- Medications treating conditions
- Conditions causing symptoms
- Allergies contraindicating medications
- Providers managing conditions or prescribing medications
- Related conditions or comorbidities
- Medications that monitor conditions

Return as JSON array:
[
  {
    "source_fact_id": "uuid",
    "target_fact_id": "uuid",
    "relationship_type": "treats",
    "strength": 0.95,
    "reasoning": "Metformin is first-line treatment for Type 2 Diabetes"
  }
]

Only include relationships you're confident about (strength >= 0.5).`;

  const command = new ConverseCommand({
    modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
    messages: [
      {
        role: 'user',
        content: [{ text: prompt }],
      },
    ],
    inferenceConfig: {
      maxTokens: 4000,
      temperature: 0.3,
    },
  });

  const response = await bedrock.send(command);
  const aiResponse = response.output.message.content[0].text;
  
  // Parse AI response
  let relationships;
  try {
    // Extract JSON from response (might have markdown code blocks)
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    relationships = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return { relationships_created: 0, error: 'Failed to parse AI response' };
  }
  
  // Insert relationships
  let created = 0;
  for (const rel of relationships) {
    try {
      await pool.query(`
        INSERT INTO medical.relationships (
          source_fact_id,
          target_fact_id,
          relationship_type,
          strength,
          reasoning,
          is_medical
        ) VALUES ($1, $2, $3, $4, $5, TRUE)
        ON CONFLICT DO NOTHING
      `, [
        rel.source_fact_id,
        rel.target_fact_id,
        rel.relationship_type,
        rel.strength,
        rel.reasoning
      ]);
      created++;
    } catch (error) {
      console.error('Failed to create relationship:', error);
    }
  }
  
  return { 
    relationships_created: created,
    total_analyzed: relationships.length,
    facts_processed: facts.length
  };
}

export const handler = async (event) => {
  try {
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
    const pathParts = path.split('/').filter(Boolean);
    
    console.log('Relationships API:', method, path);
    
    // GET /relationships - List all relationships
    if (method === 'GET' && pathParts.length === 1) {
      const filters = event.queryStringParameters || {};
      const relationships = await listRelationships(filters);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true, relationships })
      };
    }
    
    // GET /relationships/fact/:factId - Get relationships for a fact
    if (method === 'GET' && pathParts.length === 3 && pathParts[1] === 'fact') {
      const factId = pathParts[2];
      const relationships = await getFactRelationships(factId);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true, relationships })
      };
    }
    
    // POST /relationships - Create relationship
    if (method === 'POST' && pathParts.length === 1) {
      const body = JSON.parse(event.body || '{}');
      const relationship = await createRelationship(body);
      
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true, relationship })
      };
    }
    
    // POST /relationships/extract - AI relationship extraction
    if (method === 'POST' && pathParts.length === 2 && pathParts[1] === 'extract') {
      const result = await extractRelationships();
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true, ...result })
      };
    }
    
    // PATCH /relationships/:id - Update relationship
    if (method === 'PATCH' && pathParts.length === 2) {
      const relationshipId = pathParts[1];
      const body = JSON.parse(event.body || '{}');
      const relationship = await updateRelationship(relationshipId, body);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true, relationship })
      };
    }
    
    // DELETE /relationships/:id - Delete relationship
    if (method === 'DELETE' && pathParts.length === 2) {
      const relationshipId = pathParts[1];
      await deleteRelationship(relationshipId);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true })
      };
    }
    
    // GET /relationships/graph - Get current knowledge graph
    if (method === 'GET' && pathParts.length === 2 && pathParts[1] === 'graph') {
      const timestamp = event.queryStringParameters?.timestamp;
      
      let relationships;
      if (timestamp) {
        // Get historical graph
        const result = await pool.query(
          'SELECT * FROM medical.get_knowledge_graph_at_time($1)',
          [timestamp]
        );
        relationships = result.rows;
      } else {
        // Get current active relationships with fact details
        const result = await pool.query(`
          SELECT 
            r.id,
            r.source_fact_id,
            r.target_fact_id,
            r.relationship_type,
            r.strength,
            r.reasoning,
            r.category,
            r.is_medical,
            r.is_active,
            r.user_verified,
            r.valid_from,
            r.valid_until,
            r.created_at,
            r.last_verified_at,
            sf.content as source_content,
            sf.fact_type as source_type,
            tf.content as target_content,
            tf.fact_type as target_type
          FROM medical.relationships r
          JOIN medical.user_facts sf ON r.source_fact_id = sf.id
          JOIN medical.user_facts tf ON r.target_fact_id = tf.id
          WHERE r.is_active = true
            AND sf.is_active = true
            AND tf.is_active = true
          ORDER BY r.strength DESC
        `);
        relationships = result.rows;
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true, relationships })
      };
    }
    
    // GET /relationships/timeline - Get timeline events
    if (method === 'GET' && pathParts.length === 2 && pathParts[1] === 'timeline') {
      const events = await getTimelineEvents();
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true, events })
      };
    }
    
    // GET /relationships/search - Search facts
    if (method === 'GET' && pathParts.length === 2 && pathParts[1] === 'search') {
      const query = event.queryStringParameters?.q || '';
      const facts = await searchFacts(query);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true, facts })
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
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        success: false, 
        error: error.message 
      })
    };
  }
};
