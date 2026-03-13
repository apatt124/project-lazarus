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

// Extract facts from document text using Claude
async function extractFactsFromText(text, documentMetadata = {}) {
  const prompt = `You are a medical information extraction expert. Extract structured medical facts from this document.

DOCUMENT TEXT:
${text.substring(0, 15000)} ${text.length > 15000 ? '...(truncated)' : ''}

DOCUMENT METADATA:
- Type: ${documentMetadata.document_type || 'unknown'}
- Provider: ${documentMetadata.provider || 'unknown'}
- Date: ${documentMetadata.date || 'unknown'}

Extract ALL medical facts from this document. For each fact, provide:

1. **fact_type**: One of:
   - medical_condition (diagnoses, diseases, chronic conditions)
   - symptom (reported symptoms, complaints)
   - medication (drugs, prescriptions, dosages)
   - allergy (allergies, adverse reactions)
   - procedure (surgeries, treatments, interventions)
   - test_result (lab results, imaging findings, vital signs)
   - family_history (family medical history)
   - lifestyle (diet, exercise, smoking, alcohol)
   - provider (doctor, specialist information)

2. **content**: Clear, concise description of the fact
3. **confidence**: 0.0-1.0 (how confident you are this fact is accurate)
4. **fact_date**: ISO date when this fact occurred/was recorded (YYYY-MM-DD or null)
5. **metadata**: Additional context (dosage, frequency, test values, etc.)

IMPORTANT RULES:
- Extract ONLY factual medical information
- Be specific (e.g., "Metformin 500mg twice daily" not just "Metformin")
- Include test values (e.g., "HbA1c: 7.2%" not just "HbA1c test")
- Separate distinct facts (don't combine multiple medications into one fact)
- Use null for fact_date if date is unclear
- Set confidence lower (0.5-0.7) if information is ambiguous

Return ONLY a JSON array, no other text:
[
  {
    "fact_type": "medication",
    "content": "Metformin 500mg twice daily",
    "confidence": 0.95,
    "fact_date": "2024-03-15",
    "metadata": {
      "dosage": "500mg",
      "frequency": "twice daily",
      "route": "oral"
    }
  }
]`;

  try {
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
    
    console.log('AI fact extraction response:', aiResponse.substring(0, 500));
    
    // Parse JSON from response
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in AI response');
      return [];
    }
    
    const facts = JSON.parse(jsonMatch[0]);
    console.log(`Extracted ${facts.length} facts from document`);
    
    return facts;
  } catch (error) {
    console.error('Error extracting facts with AI:', error);
    throw error;
  }
}

// Store facts in database
async function storeFacts(facts, documentId, userId = null) {
  const pool = await getDbPool();
  const storedFacts = [];
  
  for (const fact of facts) {
    try {
      // Check for duplicate facts (same type and similar content)
      const duplicateCheck = await pool.query(`
        SELECT id FROM medical.user_facts
        WHERE fact_type = $1 
        AND content = $2
        AND (valid_until IS NULL OR valid_until > NOW())
        LIMIT 1
      `, [fact.fact_type, fact.content]);
      
      if (duplicateCheck.rows.length > 0) {
        console.log(`Skipping duplicate fact: ${fact.content}`);
        continue;
      }
      
      const result = await pool.query(`
        INSERT INTO medical.user_facts (
          fact_type,
          content,
          confidence,
          source_type,
          source_document_id,
          fact_date,
          metadata,
          verified_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        fact.fact_type,
        fact.content,
        fact.confidence || 0.8,
        'medical_record',
        documentId,
        fact.fact_date || null,
        JSON.stringify(fact.metadata || {}),
        'system'
      ]);
      
      storedFacts.push(result.rows[0]);
      console.log(`Stored fact: ${fact.fact_type} - ${fact.content}`);
    } catch (error) {
      console.error(`Failed to store fact: ${fact.content}`, error);
    }
  }
  
  return storedFacts;
}

// Extract facts from a single document
async function extractFromDocument(documentId) {
  const pool = await getDbPool();
  
  // Get document from database
  const docResult = await pool.query(`
    SELECT id, s3_key, content_text, metadata, document_type
    FROM medical.documents
    WHERE id = $1
  `, [documentId]);
  
  if (docResult.rows.length === 0) {
    throw new Error(`Document not found: ${documentId}`);
  }
  
  const document = docResult.rows[0];
  
  if (!document.content_text) {
    throw new Error(`Document has no text content: ${documentId}`);
  }
  
  console.log(`Extracting facts from document ${documentId}`);
  console.log(`Content length: ${document.content_text.length} characters`);
  
  // Extract facts using AI
  const facts = await extractFactsFromText(document.content_text, {
    document_type: document.document_type,
    ...document.metadata
  });
  
  // Store facts in database
  const storedFacts = await storeFacts(facts, documentId);
  
  return {
    documentId,
    factsExtracted: facts.length,
    factsStored: storedFacts.length,
    facts: storedFacts
  };
}

// Process all documents without facts
async function processAllDocuments(limit = 10) {
  const pool = await getDbPool();
  
  // Find documents that haven't been processed for facts
  const docsResult = await pool.query(`
    SELECT DISTINCT d.id, d.s3_key, d.document_type, d.upload_date
    FROM medical.documents d
    LEFT JOIN medical.user_facts f ON f.source_document_id = d.id
    WHERE d.content_text IS NOT NULL
    AND d.content_text != ''
    AND f.id IS NULL
    ORDER BY d.upload_date DESC
    LIMIT $1
  `, [limit]);
  
  console.log(`Found ${docsResult.rows.length} documents to process`);
  
  const results = [];
  
  for (const doc of docsResult.rows) {
    try {
      console.log(`Processing document: ${doc.s3_key}`);
      const result = await extractFromDocument(doc.id);
      results.push({
        success: true,
        ...result
      });
    } catch (error) {
      console.error(`Failed to process document ${doc.id}:`, error);
      results.push({
        success: false,
        documentId: doc.id,
        error: error.message
      });
    }
  }
  
  return results;
}

export const handler = async (event) => {
  try {
    console.log('Fact extraction event:', JSON.stringify(event, null, 2));
    
    const path = event.path || event.rawPath || event.resource || '';
    const method = event.httpMethod || event.requestContext?.http?.method || 'POST';
    const pathParts = path.split('/').filter(Boolean);
    
    // POST /facts/extract/:documentId - Extract facts from specific document
    if (method === 'POST' && pathParts.includes('extract') && pathParts.length >= 3) {
      const documentId = pathParts[pathParts.length - 1];
      const result = await extractFromDocument(documentId);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          ...result
        })
      };
    }
    
    // POST /facts/extract-all - Process all unprocessed documents
    if (method === 'POST' && pathParts.includes('extract-all')) {
      const body = JSON.parse(event.body || '{}');
      const limit = body.limit || 10;
      
      const results = await processAllDocuments(limit);
      
      const successCount = results.filter(r => r.success).length;
      const totalFacts = results.reduce((sum, r) => sum + (r.factsStored || 0), 0);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          documentsProcessed: results.length,
          documentsSuccessful: successCount,
          totalFactsExtracted: totalFacts,
          results
        })
      };
    }
    
    // POST /facts/extract-text - Extract facts from raw text (for testing)
    if (method === 'POST' && pathParts.includes('extract-text')) {
      const body = JSON.parse(event.body || '{}');
      const { text, metadata } = body;
      
      if (!text) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            error: 'Missing text parameter'
          })
        };
      }
      
      const facts = await extractFactsFromText(text, metadata || {});
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          factsExtracted: facts.length,
          facts
        })
      };
    }
    
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Not found'
      })
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
