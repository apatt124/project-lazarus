#!/usr/bin/env node

/**
 * Clean all extracted data and re-extract with improved quality
 * 
 * This script:
 * 1. Backs up current data (optional)
 * 2. Clears all facts, relationships, and occurrences
 * 3. Clears AI layout cache
 * 4. Re-extracts facts from all documents
 * 5. Re-generates relationships
 * 6. Generates new AI layout
 */

import 'dotenv/config';
import pg from 'pg';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import * as readline from 'readline';

const { Pool } = pg;

// Configure SSL based on environment
const sslConfig = process.env.DB_HOST?.includes('rds.amazonaws.com') 
  ? { rejectUnauthorized: false }  // AWS RDS requires SSL
  : undefined;  // Let the database decide for local/other databases

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: sslConfig,
});

const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function getStats() {
  const result = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM medical.user_facts WHERE is_active = TRUE) as facts,
      (SELECT COUNT(*) FROM medical.relationships WHERE is_active = TRUE) as relationships,
      (SELECT COUNT(*) FROM medical.fact_occurrences) as occurrences,
      (SELECT COUNT(*) FROM medical.documents WHERE content_text IS NOT NULL) as documents
  `);
  return result.rows[0];
}

async function clearAllData() {
  console.log('\n🗑️  Clearing all extracted data...\n');
  
  // Clear in correct order (respecting foreign keys)
  await pool.query('DELETE FROM medical.knowledge_graph_changes');
  console.log('  ✓ Cleared knowledge graph changes');
  
  await pool.query('DELETE FROM medical.relationships');
  console.log('  ✓ Cleared relationships');
  
  await pool.query('DELETE FROM medical.fact_occurrences');
  console.log('  ✓ Cleared fact occurrences');
  
  await pool.query('DELETE FROM medical.user_facts');
  console.log('  ✓ Cleared facts');
  
  await pool.query('DELETE FROM medical.ai_layout_cache');
  console.log('  ✓ Cleared AI layout cache');
  
  console.log('\n✅ All data cleared successfully\n');
}

async function extractFactsFromAllDocuments() {
  console.log('📄 Starting fact extraction from all documents...\n');
  
  // Get all documents with content
  const docsResult = await pool.query(`
    SELECT id, s3_key, metadata->>'filename' as filename
    FROM medical.documents
    WHERE content_text IS NOT NULL
    AND content_text != ''
    ORDER BY upload_date ASC
  `);
  
  const documents = docsResult.rows;
  console.log(`Found ${documents.length} documents to process\n`);
  
  let successCount = 0;
  let errorCount = 0;
  let totalFacts = 0;
  let totalOccurrences = 0;
  
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const progress = `[${i + 1}/${documents.length}]`;
    
    try {
      console.log(`${progress} Processing: ${doc.filename || doc.s3_key}`);
      
      // Invoke fact extraction Lambda
      const payload = {
        path: `/facts/extract/${doc.id}`,
        httpMethod: 'POST',
        resource: '/facts/extract/{documentId}',
        pathParameters: { documentId: doc.id }
      };
      
      const command = new InvokeCommand({
        FunctionName: 'lazarus-fact-extraction',
        Payload: JSON.stringify(payload)
      });
      
      const response = await lambda.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.Payload));
      
      if (result.statusCode === 200) {
        const body = JSON.parse(result.body);
        if (body.success) {
          successCount++;
          totalFacts += body.factsStored || 0;
          
          // Count occurrences added (factsExtracted - factsStored)
          const occurrences = (body.factsExtracted || 0) - (body.factsStored || 0);
          totalOccurrences += occurrences;
          
          console.log(`  ✓ Extracted ${body.factsExtracted} facts (${body.factsStored} new, ${occurrences} occurrences)`);
        } else {
          errorCount++;
          console.log(`  ✗ Error: ${body.error}`);
        }
      } else {
        errorCount++;
        console.log(`  ✗ Lambda error: ${result.statusCode}`);
      }
      
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      errorCount++;
      console.log(`  ✗ Error: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Fact extraction complete:`);
  console.log(`  • Documents processed: ${successCount}/${documents.length}`);
  console.log(`  • Errors: ${errorCount}`);
  console.log(`  • New facts: ${totalFacts}`);
  console.log(`  • Occurrences added: ${totalOccurrences}`);
  console.log(`  • Total facts extracted: ${totalFacts + totalOccurrences}\n`);
  
  return { successCount, errorCount, totalFacts, totalOccurrences };
}

async function extractRelationships() {
  console.log('🔗 Extracting relationships...\n');
  
  try {
    // Invoke relationship extraction Lambda
    const payload = {
      path: '/relationships/extract-all',
      httpMethod: 'POST',
      body: JSON.stringify({
        batchSize: 50,
        maxBatches: 20
      })
    };
    
    const command = new InvokeCommand({
      FunctionName: 'lazarus-api-relationships',
      Payload: JSON.stringify(payload)
    });
    
    const response = await lambda.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    
    if (result.statusCode === 200) {
      const body = JSON.parse(result.body);
      if (body.success) {
        console.log(`✅ Relationship extraction complete:`);
        console.log(`  • Batches processed: ${body.batches_processed}`);
        console.log(`  • Relationships created: ${body.total_relationships_created}`);
        console.log(`  • Facts processed: ${body.total_facts_processed}\n`);
        return body;
      }
    }
    
    throw new Error('Relationship extraction failed');
    
  } catch (error) {
    console.error(`✗ Error extracting relationships: ${error.message}\n`);
    return null;
  }
}

async function generateAILayout() {
  console.log('🎨 Generating AI layout...\n');
  
  try {
    // Trigger async AI layout generation
    const payload = {
      action: 'generate-ai-layout',
      userId: 'default',
      forceRegenerate: true
    };
    
    const command = new InvokeCommand({
      FunctionName: 'lazarus-api-relationships',
      InvocationType: 'Event', // Async
      Payload: JSON.stringify(payload)
    });
    
    await lambda.send(command);
    console.log('✅ AI layout generation triggered (running in background)\n');
    
  } catch (error) {
    console.error(`✗ Error triggering AI layout: ${error.message}\n`);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Clean and Re-Extract Medical Facts                      ║');
  console.log('║   With Improved Quality & Duplicate Detection             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Show current stats
    console.log('📊 Current database stats:\n');
    const beforeStats = await getStats();
    console.log(`  • Facts: ${beforeStats.facts}`);
    console.log(`  • Relationships: ${beforeStats.relationships}`);
    console.log(`  • Occurrences: ${beforeStats.occurrences}`);
    console.log(`  • Documents: ${beforeStats.documents}\n`);
    
    // Confirm deletion
    const answer = await question('⚠️  This will DELETE all facts and relationships. Continue? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Aborted by user\n');
      rl.close();
      pool.end();
      process.exit(0);
    }
    
    // Clear all data
    await clearAllData();
    
    // Re-extract facts
    const extractionResults = await extractFactsFromAllDocuments();
    
    // Extract relationships
    await extractRelationships();
    
    // Generate AI layout
    await generateAILayout();
    
    // Show final stats
    console.log('📊 Final database stats:\n');
    const afterStats = await getStats();
    console.log(`  • Facts: ${afterStats.facts} (${afterStats.facts > 0 ? '+' : ''}${afterStats.facts - beforeStats.facts})`);
    console.log(`  • Relationships: ${afterStats.relationships} (${afterStats.relationships > 0 ? '+' : ''}${afterStats.relationships - beforeStats.relationships})`);
    console.log(`  • Occurrences: ${afterStats.occurrences} (${afterStats.occurrences > 0 ? '+' : ''}${afterStats.occurrences - beforeStats.occurrences})`);
    console.log(`  • Documents: ${afterStats.documents}\n`);
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ Re-extraction Complete!                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('Next steps:');
    console.log('  1. Check knowledge graph for improved quality');
    console.log('  2. Verify duplicate detection worked');
    console.log('  3. Review fact sources and confidence scores');
    console.log('  4. Check relationship quality\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error.stack);
  } finally {
    rl.close();
    pool.end();
  }
}

main();
