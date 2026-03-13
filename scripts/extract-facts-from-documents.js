#!/usr/bin/env node

/**
 * Extract medical facts from existing documents
 * 
 * This script processes all documents in the database that haven't had
 * facts extracted yet, using the fact extraction Lambda function.
 * 
 * Usage:
 *   node scripts/extract-facts-from-documents.js [--limit=10] [--document-id=uuid]
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  limit: 10,
  documentId: null
};

args.forEach(arg => {
  if (arg.startsWith('--limit=')) {
    options.limit = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--document-id=')) {
    options.documentId = arg.split('=')[1];
  }
});

async function extractFactsFromDocument(documentId) {
  console.log(`\n📄 Extracting facts from document: ${documentId}`);
  
  const command = new InvokeCommand({
    FunctionName: process.env.FACT_EXTRACTION_FUNCTION || 'lazarus-fact-extraction',
    Payload: JSON.stringify({
      path: `/facts/extract/${documentId}`,
      httpMethod: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
  });
  
  const response = await lambda.send(command);
  const payload = JSON.parse(new TextDecoder().decode(response.Payload));
  const result = JSON.parse(payload.body);
  
  if (result.success) {
    console.log(`✅ Success!`);
    console.log(`   Facts extracted: ${result.factsExtracted}`);
    console.log(`   Facts stored: ${result.factsStored}`);
    
    if (result.facts && result.facts.length > 0) {
      console.log(`\n   Extracted facts:`);
      result.facts.forEach((fact, i) => {
        console.log(`   ${i + 1}. [${fact.fact_type}] ${fact.content} (confidence: ${fact.confidence})`);
      });
    }
  } else {
    console.log(`❌ Failed: ${result.error}`);
  }
  
  return result;
}

async function extractFactsFromAllDocuments(limit) {
  console.log(`\n🔍 Processing up to ${limit} documents...`);
  
  const command = new InvokeCommand({
    FunctionName: process.env.FACT_EXTRACTION_FUNCTION || 'lazarus-fact-extraction',
    Payload: JSON.stringify({
      path: '/facts/extract-all',
      httpMethod: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ limit })
    })
  });
  
  const response = await lambda.send(command);
  const payload = JSON.parse(new TextDecoder().decode(response.Payload));
  const result = JSON.parse(payload.body);
  
  if (result.success) {
    console.log(`\n✅ Batch processing complete!`);
    console.log(`   Documents processed: ${result.documentsProcessed}`);
    console.log(`   Documents successful: ${result.documentsSuccessful}`);
    console.log(`   Total facts extracted: ${result.totalFactsExtracted}`);
    
    if (result.results && result.results.length > 0) {
      console.log(`\n   Details:`);
      result.results.forEach((doc, i) => {
        if (doc.success) {
          console.log(`   ${i + 1}. Document ${doc.documentId.substring(0, 8)}... - ${doc.factsStored} facts stored`);
        } else {
          console.log(`   ${i + 1}. Document ${doc.documentId.substring(0, 8)}... - ❌ ${doc.error}`);
        }
      });
    }
  } else {
    console.log(`❌ Batch processing failed: ${result.error}`);
  }
  
  return result;
}

async function main() {
  console.log('🏥 Medical Fact Extraction Tool');
  console.log('================================\n');
  
  try {
    if (options.documentId) {
      // Process single document
      await extractFactsFromDocument(options.documentId);
    } else {
      // Process all unprocessed documents
      await extractFactsFromAllDocuments(options.limit);
    }
    
    console.log('\n✨ Done!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
