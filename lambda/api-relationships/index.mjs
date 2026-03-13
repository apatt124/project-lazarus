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

// Extract relationships using AI (batch processing)
async function extractRelationships(batchSize = 50, skipExisting = true) {
  const pool = await getDbPool();
  
  // Get facts that need relationship analysis
  let query = `
    SELECT f.id, f.fact_type, f.content, f.confidence, f.fact_date, f.metadata, f.created_at
    FROM medical.user_facts f
    WHERE f.is_active = TRUE
  `;
  
  if (skipExisting) {
    // Only get facts that don't have any relationships yet
    query += `
      AND NOT EXISTS (
        SELECT 1 FROM medical.relationships r 
        WHERE (r.source_fact_id = f.id OR r.target_fact_id = f.id)
        AND r.is_active = TRUE
      )
    `;
  }
  
  query += `
    ORDER BY f.created_at DESC
    LIMIT $1
  `;
  
  const factsResult = await pool.query(query, [batchSize]);
  const facts = factsResult.rows;
  
  if (facts.length < 2) {
    return { 
      relationships_created: 0, 
      facts_processed: facts.length,
      message: 'Need at least 2 facts to create relationships' 
    };
  }
  
  console.log(`Processing ${facts.length} facts for relationship extraction`);
  
  // Also get existing facts that these new facts might relate to
  const contextResult = await pool.query(`
    SELECT id, fact_type, content, confidence, fact_date, metadata
    FROM medical.user_facts
    WHERE is_active = TRUE
    AND id NOT IN (${facts.map((_, i) => `$${i + 1}`).join(',')})
    ORDER BY created_at DESC
    LIMIT 100
  `, facts.map(f => f.id));
  
  const contextFacts = contextResult.rows;
  const allFacts = [...facts, ...contextFacts];
  
  console.log(`Total facts for analysis: ${allFacts.length} (${facts.length} new + ${contextFacts.length} context)`);
  
  // Prepare facts for AI - create a lookup map
  const factIdMap = new Map();
  allFacts.forEach(f => factIdMap.set(f.id, f));
  
  const factsText = allFacts.map((f) => 
    `UUID: ${f.id}
Type: ${f.fact_type}
Content: ${f.content}
Date: ${f.fact_date || 'unknown'}
---`
  ).join('\n');
  
  const prompt = `Analyze these medical facts and identify relationships between them.

FACTS LIST:
${factsText}

CRITICAL INSTRUCTIONS:
1. You MUST use the full UUID for source_fact_id and target_fact_id
2. The UUID is the long string like "a1b2c3d4-5678-90ab-cdef-1234567890ab"
3. DO NOT use any other identifier - only the UUID shown above
4. DO NOT use index numbers, content snippets, or anything else

RELATIONSHIP TYPES:
- treats: medication treats condition
- causes: condition causes symptom
- contraindicates: allergy contraindicates medication
- related_to: general relationship
- monitors: medication monitors condition
- requires: condition requires medication
- prescribed_by: medication prescribed by provider
- managed_by: condition managed by provider

CONFIDENCE SCALE (include relationships >= 0.3):
- 0.9-1.0: Very confident (explicit, clear connection)
- 0.7-0.9: Confident (strong evidence)
- 0.5-0.7: Moderately confident (reasonable inference)
- 0.3-0.5: Uncertain (possible connection)
- 0.1-0.3: Speculative (weak evidence)

RESPONSE FORMAT (JSON array only):
[
  {
    "source_fact_id": "full-uuid-here",
    "target_fact_id": "full-uuid-here",
    "relationship_type": "treats",
    "strength": 0.95,
    "reasoning": "Brief explanation"
  }
]

EXAMPLE (using actual UUIDs from the list):
If you see:
UUID: 12345678-1234-1234-1234-123456789abc
Type: medication
Content: Metformin 500mg

UUID: 87654321-4321-4321-4321-cba987654321
Type: medical_condition
Content: Type 2 Diabetes

Then respond:
[
  {
    "source_fact_id": "12345678-1234-1234-1234-123456789abc",
    "target_fact_id": "87654321-4321-4321-4321-cba987654321",
    "relationship_type": "treats",
    "strength": 0.95,
    "reasoning": "Metformin is first-line treatment for Type 2 Diabetes"
  }
]

Now analyze the facts above and return relationships as JSON.`;

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
  
  // UUID validation regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // Insert relationships with validation
  let created = 0;
  let skipped = 0;
  for (const rel of relationships) {
    // Validate UUIDs
    if (!uuidRegex.test(rel.source_fact_id)) {
      console.error(`Invalid source UUID: ${rel.source_fact_id}`);
      skipped++;
      continue;
    }
    if (!uuidRegex.test(rel.target_fact_id)) {
      console.error(`Invalid target UUID: ${rel.target_fact_id}`);
      skipped++;
      continue;
    }
    
    // Verify UUIDs exist in our fact list
    if (!factIdMap.has(rel.source_fact_id)) {
      console.error(`Source UUID not found in facts: ${rel.source_fact_id}`);
      skipped++;
      continue;
    }
    if (!factIdMap.has(rel.target_fact_id)) {
      console.error(`Target UUID not found in facts: ${rel.target_fact_id}`);
      skipped++;
      continue;
    }
    
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
      skipped++;
    }
  }
  
  return { 
    relationships_created: created,
    relationships_skipped: skipped,
    total_analyzed: relationships.length,
    facts_processed: allFacts.length,
    new_facts: facts.length,
    context_facts: contextFacts.length
  };
}

// Helper function to detect overlaps
function hasOverlap(pos1, pos2, minHorizontalGap = 280, minVerticalGap = 120) {
  const dx = Math.abs(pos1.x - pos2.x);
  const dy = Math.abs(pos1.y - pos2.y);
  return dx < minHorizontalGap && dy < minVerticalGap;
}

// Helper function to fix overlaps using force-directed adjustment
function fixOverlaps(positions, minHorizontalGap = 280, minVerticalGap = 120, maxIterations = 100) {
  const nodeIds = Object.keys(positions);
  let iteration = 0;
  let hasOverlaps = true;
  
  while (hasOverlaps && iteration < maxIterations) {
    hasOverlaps = false;
    iteration++;
    
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const id1 = nodeIds[i];
        const id2 = nodeIds[j];
        const pos1 = positions[id1];
        const pos2 = positions[id2];
        
        if (hasOverlap(pos1, pos2, minHorizontalGap, minVerticalGap)) {
          hasOverlaps = true;
          
          // Calculate repulsion vector
          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Determine which direction to push (horizontal or vertical)
          const horizontalGap = Math.abs(dx);
          const verticalGap = Math.abs(dy);
          
          if (horizontalGap < minHorizontalGap && verticalGap < minVerticalGap) {
            // Push in the direction with less gap
            if (horizontalGap < verticalGap) {
              // Push horizontally
              const pushDistance = (minHorizontalGap - horizontalGap) / 2 + 10;
              const direction = dx > 0 ? 1 : -1;
              pos1.x -= direction * pushDistance;
              pos2.x += direction * pushDistance;
            } else {
              // Push vertically
              const pushDistance = (minVerticalGap - verticalGap) / 2 + 10;
              const direction = dy > 0 ? 1 : -1;
              pos1.y -= direction * pushDistance;
              pos2.y += direction * pushDistance;
            }
          }
        }
      }
    }
    
    // Keep nodes within bounds
    for (const id of nodeIds) {
      positions[id].x = Math.max(100, Math.min(900, positions[id].x));
      positions[id].y = Math.max(100, Math.min(700, positions[id].y));
    }
  }
  
  console.log(`Fixed overlaps in ${iteration} iterations`);
  return positions;
}

// Build adjacency information for clustering
function buildGraphStructure(nodes, edges) {
  const adjacency = new Map();
  const nodeMap = new Map();
  
  nodes.forEach(n => {
    nodeMap.set(n.id, n);
    adjacency.set(n.id, []);
  });
  
  edges.forEach(e => {
    if (adjacency.has(e.source)) {
      adjacency.get(e.source).push({ target: e.target, strength: e.strength || 0.5 });
    }
    if (adjacency.has(e.target)) {
      adjacency.get(e.target).push({ target: e.source, strength: e.strength || 0.5 });
    }
  });
  
  return { adjacency, nodeMap };
}

// Find connected components
function findConnectedComponents(nodes, adjacency) {
  const visited = new Set();
  const components = [];
  
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const component = [];
      const queue = [node.id];
      
      while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current)) continue;
        
        visited.add(current);
        component.push(current);
        
        const neighbors = adjacency.get(current) || [];
        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor.target)) {
            queue.push(neighbor.target);
          }
        });
      }
      
      components.push(component);
    }
  });
  
  return components;
}

// Generate AI-optimized graph layout
async function generateAILayout(graphData, userId = 'default', forceRegenerate = false) {
  const { nodes, edges } = graphData;
  
  console.log('=== AI LAYOUT REQUEST ===');
  console.log('User ID:', userId);
  console.log('Number of nodes:', nodes.length);
  console.log('Number of edges:', edges.length);
  console.log('Force regenerate:', forceRegenerate);
  
  // Check cache first (unless force regenerate)
  if (!forceRegenerate) {
    try {
      const pool = await getDbPool();
      const cacheResult = await pool.query(
        'SELECT layout_data, node_count, edge_count, updated_at FROM medical.ai_layout_cache WHERE user_id = $1',
        [userId]
      );
      
      if (cacheResult.rows.length > 0) {
        const cached = cacheResult.rows[0];
        
        // Validate cache is still valid (same node/edge count)
        if (cached.node_count === nodes.length && cached.edge_count === edges.length) {
          console.log('=== USING CACHED AI LAYOUT ===');
          console.log('Cache age:', new Date().getTime() - new Date(cached.updated_at).getTime(), 'ms');
          console.log('Cached positions:', Object.keys(cached.layout_data).length);
          
          return {
            success: true,
            positions: cached.layout_data,
            cached: true,
            cacheAge: cached.updated_at
          };
        } else {
          console.log('=== CACHE INVALID ===');
          console.log('Cached node count:', cached.node_count, 'Current:', nodes.length);
          console.log('Cached edge count:', cached.edge_count, 'Current:', edges.length);
        }
      } else {
        console.log('=== NO CACHE FOUND ===');
      }
    } catch (error) {
      console.error('Error checking cache:', error);
      // Continue to generate new layout
    }
  }
  
  // Build graph structure
  const { adjacency, nodeMap } = buildGraphStructure(nodes, edges);
  const components = findConnectedComponents(nodes, adjacency);
  
  console.log('Connected components:', components.length);
  components.forEach((comp, i) => {
    console.log(`Component ${i}: ${comp.length} nodes`);
  });
  
  // Prepare graph description for Claude with component information
  const graphDescription = {
    nodes: nodes.map(n => ({
      id: n.id,
      content: n.content,
      type: n.type,
      connectionCount: (adjacency.get(n.id) || []).length
    })),
    relationships: edges.map(e => ({
      source: e.source,
      target: e.target,
      type: e.relationshipType,
      strength: e.strength
    })),
    components: components.map((comp, i) => ({
      id: i,
      nodeIds: comp,
      size: comp.length
    }))
  };
  
  console.log('Graph structure:', JSON.stringify({
    totalNodes: nodes.length,
    totalEdges: edges.length,
    components: components.length
  }, null, 2));
  
  const prompt = `You are a medical knowledge graph visualization expert. Create a layout that minimizes edge crossings and keeps edges clear of nodes.

GRAPH DATA:
${JSON.stringify(graphDescription, null, 2)}

CANVAS: 1000px × 800px (safe area: 100-900 x, 100-700 y)
NODE SIZE: 220px wide × 56px tall

CRITICAL OBJECTIVES (in priority order):
1. MINIMIZE EDGE CROSSINGS - edges should not cross each other
2. KEEP EDGES CLEAR - edges should not pass behind/through unrelated nodes
3. TIGHT CLUSTERING - connected nodes should be close together
4. COMPONENT SEPARATION - disconnected subgraphs should be far apart

LAYOUT ALGORITHM:

STEP 1: COMPONENT ANALYSIS
- There are ${components.length} disconnected component(s)
- Each component gets its own spatial region (400px+ separation)
${components.length === 1 ? '- Single component: use full canvas' : '- Multiple components: divide canvas into quadrants/regions'}

STEP 2: IDENTIFY GRAPH STRUCTURE
For each component:
- Find hub node (highest connectionCount) - this is the anchor
- Identify "chains" (sequences of nodes connected in a line)
- Identify "stars" (one node connected to many)
- Identify "triangles" (3 nodes all connected to each other)

STEP 3: LAYERED POSITIONING (CRITICAL FOR EDGE CLARITY)
Use a hierarchical/layered approach to prevent edge crossings:

Layer 0 (Center): Hub node (highest connectionCount)
Layer 1 (Inner ring): Nodes directly connected to hub
  - Position at 200-250px from hub
  - Spread evenly around hub (360° / node_count)
  - Group by type: medications right (0-90°), symptoms left (180-270°)
  
Layer 2 (Outer ring): Nodes connected to Layer 1 nodes
  - Position at 350-400px from hub
  - Place BEHIND their parent node (same angle ±30°)
  - This keeps edges from crossing through the center

STEP 4: EDGE CROSSING PREVENTION
For each edge, check if it would cross other edges:
- If edge A-B would cross edge C-D, adjust node positions
- Prefer adjusting outer layer nodes (Layer 2) over inner (Layer 1)
- Use angular separation: nodes with many connections get more angular space

STEP 5: CLEAR EDGE PATHS
Ensure edges don't pass through unrelated nodes:
- For edge A→B, check if any node C is on the line segment
- If node C is within 150px of the edge line, adjust positions
- Move C perpendicular to the edge, or adjust A/B angles

STEP 6: NODE TYPE POSITIONING (within layers)
- medical_condition: Layer 0 (hub) or Layer 1 if not hub
- medication: Right side (0-90°), Layer 1 or 2
- symptom: Left side (180-270°), Layer 1 or 2  
- provider: Bottom (240-300°), Layer 2
- allergy: Top-right (30-60°), Layer 2
- lifestyle: Left (150-210°), Layer 2

SPACING RULES:
- Minimum 280px horizontal between node centers
- Minimum 120px vertical between node centers
- Minimum 150px clearance between edge and unrelated node

EXAMPLE LAYOUT PATTERN (for star topology):
- Hub at (500, 400)
- 6 connected nodes arranged in circle at 250px radius
- Each at 60° intervals: 0°, 60°, 120°, 180°, 240°, 300°
- This creates clear, non-crossing edges

EXAMPLE LAYOUT PATTERN (for chain topology):
- Arrange nodes in a line or gentle curve
- Each node 280px from previous
- Avoids any edge crossings (chain has no crossing edges)

RESPONSE FORMAT (JSON only, no markdown):
{
  "positions": {
    "node_id": { 
      "x": 500, 
      "y": 400, 
      "reasoning": "Hub node, Layer 0, 8 connections, medical_condition"
    },
    "another_id": { 
      "x": 700, 
      "y": 400, 
      "reasoning": "Medication, Layer 1, 0° from hub, strong connection (0.9), no edge crossings"
    }
  }
}

VERIFICATION CHECKLIST:
✓ Hub nodes at component centers
✓ Connected nodes arranged in layers (not scattered randomly)
✓ Nodes with many connections have more angular space
✓ No edges cross each other within a component
✓ No edges pass through unrelated nodes
✓ All positions within bounds: x[100-900], y[100-700]
✓ Minimum spacing maintained (280px horizontal, 120px vertical)

Think step-by-step:
1. For each component, identify hub and topology (star/chain/mesh)
2. Assign nodes to layers based on distance from hub
3. Position Layer 0 (hub) at component center
4. Position Layer 1 nodes in circle around hub, evenly spaced
5. Position Layer 2 nodes behind their Layer 1 parents
6. Check for edge crossings and adjust angles
7. Check for edges passing through nodes and adjust positions
8. Verify spacing rules and adjust if needed`;

  try {
    console.log('=== SENDING TO CLAUDE ===');
    console.log('Model:', 'us.anthropic.claude-sonnet-4-20250514-v1:0');
    console.log('Prompt length:', prompt.length, 'characters');
    console.log('First 500 chars of prompt:', prompt.substring(0, 500));
    
    const command = new ConverseCommand({
      modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      messages: [{
        role: 'user',
        content: [{ text: prompt }]
      }],
      inferenceConfig: {
        maxTokens: 4000,
        temperature: 0.2,
      }
    });
    
    const response = await bedrock.send(command);
    const aiResponse = response.output.message.content[0].text;
    
    console.log('=== CLAUDE RESPONSE ===');
    console.log('Response length:', aiResponse.length, 'characters');
    console.log('Full response:', aiResponse);
    
    // Parse JSON response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('ERROR: No JSON found in response');
      return {
        success: false,
        error: 'No JSON found in Claude response'
      };
    }
    
    console.log('Extracted JSON:', jsonMatch[0].substring(0, 500));
    const layoutData = JSON.parse(jsonMatch[0]);
    
    console.log('=== PARSED LAYOUT ===');
    console.log('Number of positions:', Object.keys(layoutData.positions || {}).length);
    console.log('Sample positions (before overlap fix):', JSON.stringify(Object.entries(layoutData.positions || {}).slice(0, 3), null, 2));
    
    // Post-process: Fix any overlaps
    const positions = layoutData.positions;
    const fixedPositions = fixOverlaps(positions, 280, 120, 100);
    
    // Verify no overlaps remain
    const nodeIds = Object.keys(fixedPositions);
    let overlapCount = 0;
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        if (hasOverlap(fixedPositions[nodeIds[i]], fixedPositions[nodeIds[j]], 280, 120)) {
          overlapCount++;
        }
      }
    }
    
    console.log('=== OVERLAP CHECK ===');
    console.log('Remaining overlaps:', overlapCount);
    console.log('Sample positions (after overlap fix):', JSON.stringify(Object.entries(fixedPositions).slice(0, 3), null, 2));
    
    // Save to cache
    try {
      const pool = await getDbPool();
      await pool.query(`
        INSERT INTO medical.ai_layout_cache (user_id, node_count, edge_count, layout_data, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          node_count = EXCLUDED.node_count,
          edge_count = EXCLUDED.edge_count,
          layout_data = EXCLUDED.layout_data,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, nodes.length, edges.length, JSON.stringify(fixedPositions)]);
      
      console.log('=== SAVED TO CACHE ===');
      console.log('User:', userId, 'Nodes:', nodes.length, 'Edges:', edges.length);
    } catch (error) {
      console.error('Error saving to cache:', error);
      // Continue anyway - cache failure shouldn't break the response
    }
    
    return {
      success: true,
      positions: fixedPositions,
      cached: false
    };
  } catch (error) {
    console.error('=== AI LAYOUT ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}


export const handler = async (event) => {
  try {
    // Handle async invocation for background AI layout generation
    if (event.action === 'generate-ai-layout') {
      console.log('=== ASYNC AI LAYOUT GENERATION ===');
      console.log('User ID:', event.userId);
      
      try {
        // Get all facts and relationships for this user
        const pool = await getDbPool();
        
        const factsResult = await pool.query(`
          SELECT id, fact_type, content
          FROM medical.user_facts
          WHERE is_active = TRUE
          ORDER BY created_at DESC
        `);
        
        const relationshipsResult = await pool.query(`
          SELECT source_fact_id, target_fact_id, relationship_type, strength
          FROM medical.relationships
          WHERE is_active = TRUE
        `);
        
        const graphData = {
          nodes: factsResult.rows.map(f => ({
            id: f.id,
            content: f.content,
            type: f.fact_type
          })),
          edges: relationshipsResult.rows.map(r => ({
            source: r.source_fact_id,
            target: r.target_fact_id,
            relationshipType: r.relationship_type,
            strength: r.strength
          }))
        };
        
        console.log(`Generating AI layout for ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`);
        
        const result = await generateAILayout(graphData, event.userId || 'default', true);
        
        if (result.success) {
          console.log('AI layout generated and cached successfully');
        } else {
          console.error('AI layout generation failed:', result.error);
        }
        
        return { success: true, message: 'AI layout generation completed' };
      } catch (error) {
        console.error('Error in async AI layout generation:', error);
        return { success: false, error: error.message };
      }
    }
    
    // Handle both API Gateway REST API and direct invocation formats
    const path = event.path || event.rawPath || event.resource || '';
    const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
    const pathParts = path.split('/').filter(Boolean);
    const pathParams = event.pathParameters || {};
    
    console.log('Relationships API:', method, path, 'PathParams:', pathParams);
    
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
      const body = JSON.parse(event.body || '{}');
      const batchSize = body.batchSize || 50;
      const skipExisting = body.skipExisting !== false; // default true
      
      const result = await extractRelationships(batchSize, skipExisting);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true, ...result })
      };
    }
    
    // POST /relationships/extract-all - Process all facts in batches
    if (method === 'POST' && pathParts.length === 2 && pathParts[1] === 'extract-all') {
      const body = JSON.parse(event.body || '{}');
      const batchSize = body.batchSize || 50;
      const maxBatches = body.maxBatches || 10;
      
      const results = [];
      let totalCreated = 0;
      let totalProcessed = 0;
      
      for (let i = 0; i < maxBatches; i++) {
        console.log(`Processing batch ${i + 1}/${maxBatches}`);
        
        const result = await extractRelationships(batchSize, true);
        results.push(result);
        
        totalCreated += result.relationships_created;
        totalProcessed += result.new_facts;
        
        // Stop if no more facts to process
        if (result.new_facts === 0) {
          console.log('No more facts to process');
          break;
        }
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          success: true,
          batches_processed: results.length,
          total_relationships_created: totalCreated,
          total_facts_processed: totalProcessed,
          results
        })
      };
    }
    
    // POST /relationships/ai-layout - Generate AI-optimized layout
    if (method === 'POST' && pathParts.length === 2 && pathParts[1] === 'ai-layout') {
      const body = JSON.parse(event.body || '{}');
      const userId = body.userId || 'default';
      const forceRegenerate = body.forceRegenerate || false;
      const result = await generateAILayout(body, userId, forceRegenerate);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(result)
      };
    }
    
    // PATCH /relationships/:id - Update relationship
    if (method === 'PATCH' && (pathParts.length === 2 || pathParams.id)) {
      const relationshipId = pathParams.id || pathParts[1];
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
    if (method === 'DELETE' && (pathParts.length === 2 || pathParams.id)) {
      const relationshipId = pathParams.id || pathParts[1];
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
      const minStrength = parseFloat(event.queryStringParameters?.minStrength || '0.5');
      const pool = await getDbPool();
      
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
            AND r.strength >= $1
          ORDER BY r.strength DESC
        `, [minStrength]);
        relationships = result.rows;
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          success: true, 
          relationships,
          minStrength 
        })
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
