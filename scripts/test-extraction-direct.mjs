#!/usr/bin/env node

/**
 * Test extraction by directly invoking Lambda
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });

const TEST_DOCUMENT_ID = 'b546020f-64a1-41db-871f-aa4710b06e57'; // Pancreatitis document

async function testExtraction() {
  console.log('🧪 Testing Improved Fact Extraction\n');
  console.log(`📄 Document ID: ${TEST_DOCUMENT_ID}`);
  console.log('⏳ Invoking Lambda...\n');
  
  const payload = {
    path: `/facts/extract/${TEST_DOCUMENT_ID}`,
    httpMethod: 'POST',
    resource: '/facts/extract/{documentId}',
    pathParameters: {
      documentId: TEST_DOCUMENT_ID
    }
  };
  
  try {
    const command = new InvokeCommand({
      FunctionName: 'lazarus-fact-extraction',
      Payload: JSON.stringify(payload)
    });
    
    const response = await lambda.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    
    console.log('📊 Lambda Response Status:', result.statusCode);
    
    if (result.statusCode === 200) {
      const body = JSON.parse(result.body);
      
      console.log('\n✅ Extraction Successful!\n');
      console.log(`📈 Facts Extracted: ${body.factsExtracted || 0}`);
      console.log(`💾 Facts Stored: ${body.factsStored || 0}`);
      
      if (body.facts && body.facts.length > 0) {
        console.log('\n📋 Sample Facts:\n');
        
        // Group by type
        const byType = {};
        body.facts.forEach(f => {
          if (!byType[f.fact_type]) byType[f.fact_type] = [];
          byType[f.fact_type].push(f);
        });
        
        // Show samples from each type
        Object.entries(byType).forEach(([type, facts]) => {
          console.log(`\n  ${type.toUpperCase()} (${facts.length}):`);
          facts.slice(0, 3).forEach(f => {
            console.log(`    • ${f.content}`);
            console.log(`      Date: ${f.fact_date || 'MISSING'} | Confidence: ${f.confidence}`);
            if (f.metadata && Object.keys(f.metadata).length > 0) {
              console.log(`      Metadata: ${JSON.stringify(f.metadata)}`);
            }
          });
          if (facts.length > 3) {
            console.log(`    ... and ${facts.length - 3} more`);
          }
        });
        
        // Check for dates
        const withDates = body.facts.filter(f => f.fact_date).length;
        const withoutDates = body.facts.length - withDates;
        console.log(`\n📅 Date Coverage:`);
        console.log(`  With dates: ${withDates} (${Math.round(withDates/body.facts.length*100)}%)`);
        console.log(`  Without dates: ${withoutDates} (${Math.round(withoutDates/body.facts.length*100)}%)`);
        
        // Check for potential duplicates in this extraction
        const contents = body.facts.map(f => f.content.toLowerCase().replace(/\s+/g, ' ').trim());
        const uniqueContents = new Set(contents);
        if (contents.length !== uniqueContents.size) {
          console.log(`\n⚠️  Warning: ${contents.length - uniqueContents.size} potential duplicates in this extraction`);
        } else {
          console.log(`\n✅ No obvious duplicates in this extraction`);
        }
      }
    } else {
      console.log('\n❌ Extraction Failed');
      console.log('Response:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

testExtraction();
