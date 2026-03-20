import pg from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const { Pool } = pg;
const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

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
  const prompt = `You are a medical information extraction expert. Extract structured, high-quality medical facts from this document.

DOCUMENT TEXT:
${text.substring(0, 15000)} ${text.length > 15000 ? '...(truncated)' : ''}

DOCUMENT METADATA:
- Type: ${documentMetadata.document_type || 'unknown'}
- Provider: ${documentMetadata.provider || 'unknown'}
- Document Date: ${documentMetadata.date || 'unknown'}

Extract ALL medical facts from this document. For each fact, provide:

1. **fact_type**: One of:
   - medical_condition (diagnoses, diseases, chronic conditions - NOT temporary states)
   - symptom (reported symptoms, complaints)
   - medication (drugs, prescriptions, dosages)
   - allergy (allergies, adverse reactions)
   - procedure (surgeries, treatments, interventions)
   - test_result (lab results, imaging findings, vital signs)
   - family_history (family medical history)
   - lifestyle (diet, exercise, smoking, alcohol)
   - provider (doctor, specialist information)

2. **content**: Clear, concise, standardized description
3. **confidence**: 0.0-1.0 (how confident you are this fact is accurate)
4. **fact_date**: ISO date when this fact occurred/was recorded (YYYY-MM-DD)
5. **metadata**: Additional context (dosage, frequency, test values, etc.)

CRITICAL DATE EXTRACTION RULES:
- ALWAYS try to extract the date when the medical event occurred
- Look for explicit dates in the text (e.g., "on 2024-03-15", "March 15, 2024", "02/15/2024")
- For test results, use the test/collection date
- For medications, use the prescription/start date if mentioned
- For procedures, use the procedure date
- For diagnoses, use the diagnosis date if mentioned
- If no explicit date in text, use the document date: ${documentMetadata.date || 'null'}
- Only use null if document date is also unavailable
- Format all dates as YYYY-MM-DD

CRITICAL CONTENT QUALITY RULES:

**Standardization:**
- Use consistent medical terminology (e.g., "Type 2 Diabetes Mellitus" not "T2DM" or "Diabetes Type 2")
- Remove unnecessary qualifiers (e.g., "Rheumatoid Arthritis" not "Rheumatoid arthritis involving multiple sites")
- Remove billing codes like "(HCC)" from content - put in metadata instead
- Use generic drug names when both brand and generic are present

**Specificity:**
- Medications: MUST include dosage and frequency (e.g., "Metformin 500mg twice daily")
- Test results: MUST include value and units (e.g., "HbA1c: 7.2%")
- Procedures: Include key details (e.g., "Cesarean section" not just "delivery")

**Metadata Standardization:**
- Use consistent keys: `dosage` (not dose), `frequency` (not freq), `value` (not result), `units` (not unit)
- Standardize units: "mg" (not milligrams), "mL" (not ml), "%" (not percent)
- Standardize frequencies: "twice daily" or "BID" (not "2x/day"), "three times daily" or "TID"
- Include route for medications: "oral", "IV", "subcutaneous", "topical"
- For tests, always include: `value`, `units`, `reference_range` (if available)
- For medications, always include: `dosage`, `frequency`, `route`, `generic_name` (if brand name used)

**Avoid Temporal States as Conditions:**
- DON'T extract: "36 weeks gestation", "third trimester pregnancy" (these are temporal states)
- DO extract: "Pregnancy" with metadata: {"gestational_age": "36 weeks", "trimester": "third"}
- DON'T extract: "PICC line in place" (this is a device status)
- DO extract: "PICC line placement" as a procedure

**Avoid Descriptive States:**
- DON'T extract: "Markedly enlarged uterus, consistent with postpartum atony"
- DO extract: "Postpartum uterine atony"
- DON'T extract: "Requires enteral feeding tube for supplement"
- DO extract: "Enteral feeding tube placement" as a procedure

**Consolidate Related Information:**
- If multiple mentions of same condition with different details, create ONE fact with comprehensive metadata
- Example: "Pregnancy" (not separate facts for "pregnancy", "third trimester pregnancy", "high-risk pregnancy")

**Confidence Guidelines:**
- 0.95-1.0: Explicit diagnosis/prescription with clear documentation (e.g., "Diagnosis: Type 2 Diabetes", "Prescribed: Metformin 500mg")
- 0.85-0.95: Clear clinical finding or test result with specific values (e.g., "HbA1c: 7.2%", "Blood pressure: 140/90")
- 0.75-0.85: Documented fact with some ambiguity (e.g., "History of diabetes", "Possible allergy to penicillin")
- 0.60-0.75: Reasonable inference from clinical notes (e.g., inferring condition from treatment pattern)
- 0.50-0.60: Ambiguous or unclear documentation (e.g., "Patient reports occasional chest pain")
- Below 0.50: Don't extract (too uncertain)

**Confidence Calibration Rules:**
- If document explicitly states diagnosis/prescription → 0.95+
- If you're inferring from context → reduce by 0.1-0.2
- If wording is vague ("possible", "suspected", "rule out") → 0.6-0.75
- If historical ("history of", "prior") → 0.85 (documented but not current)
- If patient-reported without confirmation → 0.7-0.8

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
      "route": "oral",
      "generic_name": "metformin"
    }
  },
  {
    "fact_type": "medical_condition",
    "content": "Type 2 Diabetes Mellitus",
    "confidence": 0.95,
    "fact_date": "2024-01-10",
    "metadata": {
      "icd10": "E11",
      "hcc_code": "19"
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

// Find semantically similar facts using AI
async function findSimilarFacts(content, factType) {
  const pool = await getDbPool();
  
  // Get existing facts of the same type
  const result = await pool.query(`
    SELECT id, content, fact_date, confidence, metadata
    FROM medical.user_facts
    WHERE fact_type = $1
    AND is_active = TRUE
    AND (valid_until IS NULL OR valid_until > NOW())
    ORDER BY created_at DESC
    LIMIT 50
  `, [factType]);
  
  if (result.rows.length === 0) {
    return [];
  }
  
  // First check for exact duplicates (case-insensitive, normalized whitespace)
  const normalizedContent = content.toLowerCase().replace(/\s+/g, ' ').trim();
  const exactMatch = result.rows.find(f => 
    f.content.toLowerCase().replace(/\s+/g, ' ').trim() === normalizedContent
  );
  
  if (exactMatch) {
    console.log(`Found exact duplicate: "${content}" matches existing: "${exactMatch.content}"`);
    return [exactMatch];
  }
  
  // Use AI to check for semantic similarity
  const existingFacts = result.rows.map((f, i) => `${i + 1}. ${f.content}`).join('\n');
  
  const prompt = `You are a medical fact deduplication expert. Determine if the new fact is semantically similar to any existing facts.

NEW FACT:
"${content}"

EXISTING FACTS:
${existingFacts}

SIMILARITY RULES:

**SIMILAR (should be marked as duplicate):**
- Same condition with different wording:
  * "Type 2 Diabetes Mellitus" ≈ "T2DM" ≈ "Diabetes Type 2" ≈ "Type 2 Diabetes"
  * "Rheumatoid Arthritis" ≈ "Rheumatoid arthritis involving multiple sites" ≈ "RA"
  * "Mast cell activation syndrome" ≈ "Mast cell activation" ≈ "MCAS"
- Same medication with equivalent dosing:
  * "Metformin 500mg twice daily" ≈ "Metformin 500mg BID" ≈ "Metformin 500 mg PO BID"
- Same test with equivalent values:
  * "HbA1c: 7.2%" ≈ "Hemoglobin A1c 7.2%" ≈ "A1C 7.2"
- Same condition with/without qualifiers:
  * "Pregnancy" ≈ "Third trimester pregnancy" ≈ "High-risk pregnancy"
  * "Pancreatitis" ≈ "Chronic pancreatitis" ≈ "Other chronic pancreatitis"
- Same condition with/without billing codes:
  * "Rheumatoid Arthritis" ≈ "Rheumatoid arthritis (HCC)"

**NOT SIMILAR (should be separate facts):**
- Different dosages: "Metformin 500mg" ≠ "Metformin 1000mg"
- Different test values: "HbA1c: 7.2%" ≠ "HbA1c: 6.5%"
- Different conditions: "Type 1 Diabetes" ≠ "Type 2 Diabetes"
- Different medications: "Metformin" ≠ "Insulin"
- Different body locations: "Left knee arthritis" ≠ "Right knee arthritis"
- Condition vs complication: "Diabetes" ≠ "Diabetic neuropathy"

**EDGE CASES:**
- Pregnancy at different gestational ages: SIMILAR (same pregnancy, different time points)
- Same condition at different severity: SIMILAR (same underlying condition)
- Generic vs brand name: SIMILAR if same drug and dosage

Return ONLY a JSON object:
{
  "is_duplicate": true/false,
  "similar_fact_number": 1-50 or null,
  "reasoning": "brief explanation"
}`;

  try {
    const command = new ConverseCommand({
      modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      messages: [{
        role: 'user',
        content: [{ text: prompt }]
      }],
      inferenceConfig: {
        maxTokens: 500,
        temperature: 0.1,
      }
    });

    const response = await bedrock.send(command);
    const aiResponse = response.output.message.content[0].text;
    
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('No JSON found in similarity check, assuming not duplicate');
      return [];
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    if (analysis.is_duplicate && analysis.similar_fact_number) {
      const similarFact = result.rows[analysis.similar_fact_number - 1];
      console.log(`Found similar fact: "${similarFact.content}" - ${analysis.reasoning}`);
      return [similarFact];
    }
    
    return [];
  } catch (error) {
    console.error('Error checking for similar facts:', error);
    // On error, fall back to exact match to avoid duplicates
    const exactMatch = result.rows.find(f => f.content.toLowerCase() === content.toLowerCase());
    return exactMatch ? [exactMatch] : [];
  }
}

// Add occurrence to existing fact
async function addFactOccurrence(factId, occurrence, documentId) {
  const pool = await getDbPool();
  
  try {
    // Check if this exact occurrence already exists
    const existingOccurrence = await pool.query(`
      SELECT id FROM medical.fact_occurrences
      WHERE fact_id = $1 
      AND source_document_id = $2
      AND (occurrence_date = $3 OR (occurrence_date IS NULL AND $3 IS NULL))
    `, [factId, documentId, occurrence.fact_date]);
    
    if (existingOccurrence.rows.length > 0) {
      console.log(`Occurrence already exists for fact ${factId}`);
      return existingOccurrence.rows[0];
    }
    
    const result = await pool.query(`
      INSERT INTO medical.fact_occurrences (
        fact_id,
        occurrence_date,
        source_document_id,
        source_type,
        metadata,
        confidence,
        original_content,
        verified_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      factId,
      occurrence.fact_date || null,
      documentId,
      'medical_record',
      JSON.stringify(occurrence.metadata || {}),
      occurrence.confidence || 0.8,
      occurrence.content, // Store original wording
      'system'
    ]);
    
    console.log(`Added occurrence to fact ${factId}: ${occurrence.content} (date: ${occurrence.fact_date || 'none'})`);
    return result.rows[0];
  } catch (error) {
    console.error(`Failed to add occurrence to fact ${factId}:`, error);
    throw error;
  }
}

// Store facts in database
async function storeFacts(facts, documentId, userId = null) {
  const pool = await getDbPool();
  const storedFacts = [];
  const addedOccurrences = [];
  const skippedFacts = [];
  
  for (const fact of facts) {
    try {
      // Basic validation
      if (!fact.content || fact.content.trim().length === 0) {
        console.log('Skipping fact with empty content');
        skippedFacts.push({ reason: 'empty_content', fact });
        continue;
      }
      
      // Validate confidence is in range
      if (fact.confidence < 0 || fact.confidence > 1) {
        console.log(`Invalid confidence ${fact.confidence} for fact: ${fact.content}`);
        fact.confidence = Math.max(0, Math.min(1, fact.confidence)); // Clamp to 0-1
      }
      
      // Validate date format if present
      if (fact.fact_date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(fact.fact_date)) {
          console.log(`Invalid date format ${fact.fact_date} for fact: ${fact.content}`);
          fact.fact_date = null; // Clear invalid date
        } else {
          // Check if date is reasonable (not in future, not before 1900)
          const factDate = new Date(fact.fact_date);
          const now = new Date();
          const minDate = new Date('1900-01-01');
          
          if (factDate > now) {
            console.log(`Future date ${fact.fact_date} for fact: ${fact.content} - clearing`);
            fact.fact_date = null;
          } else if (factDate < minDate) {
            console.log(`Date too old ${fact.fact_date} for fact: ${fact.content} - clearing`);
            fact.fact_date = null;
          }
        }
      }
      
      // Check for semantic duplicates using AI
      const similarFacts = await findSimilarFacts(fact.content, fact.fact_type);
      
      if (similarFacts.length > 0) {
        // Found a duplicate - add as occurrence instead of new fact
        const existingFact = similarFacts[0];
        console.log(`Found duplicate: "${fact.content}" matches existing: "${existingFact.content}"`);
        
        const occurrence = await addFactOccurrence(existingFact.id, fact, documentId);
        addedOccurrences.push({
          fact_id: existingFact.id,
          fact_content: existingFact.content,
          occurrence_content: fact.content,
          occurrence_date: fact.fact_date
        });
        continue;
      }
      
      // New unique fact - store it
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
      console.log(`Stored new fact: ${fact.fact_type} - ${fact.content} (date: ${fact.fact_date || 'none'})`);
    } catch (error) {
      console.error(`Failed to store fact: ${fact.content}`, error);
      skippedFacts.push({ reason: 'error', fact, error: error.message });
    }
  }
  
  console.log(`Stored ${storedFacts.length} new facts, added ${addedOccurrences.length} occurrences to existing facts, skipped ${skippedFacts.length} facts`);
  
  return storedFacts;
}

// Trigger async AI layout generation (fire and forget)
async function triggerAILayoutGeneration(userId = 'default') {
  try {
    console.log('Triggering async AI layout generation for user:', userId);
    
    const payload = {
      action: 'generate-ai-layout',
      userId: userId,
      forceRegenerate: true
    };
    
    const command = new InvokeCommand({
      FunctionName: 'lazarus-api-relationships',
      InvocationType: 'Event', // Async invocation
      Payload: JSON.stringify(payload)
    });
    
    await lambda.send(command);
    console.log('AI layout generation triggered successfully');
  } catch (error) {
    // Don't fail the main request if background job fails
    console.error('Failed to trigger AI layout generation:', error);
  }
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
  
  // Trigger async AI layout generation in background
  await triggerAILayoutGeneration('default');
  
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
