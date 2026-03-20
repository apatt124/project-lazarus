#!/usr/bin/env node

/**
 * Test improved fact extraction on pancreatitis documents
 * Compares old facts vs new extraction quality
 */

import https from 'https';

const API_URL = process.env.VITE_API_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';

// Test document IDs (pancreatitis-related)
const TEST_DOCUMENTS = [
  'b546020f-64a1-41db-871f-aa4710b06e57', // chunk27 - treatment info
  '018cdf80-af27-4f9c-8045-d5c2daecaad1', // chunk24 - medical history
];

async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getExistingFacts(documentId) {
  const response = await makeRequest(`/facts?source_document_id=${documentId}`);
  return response.facts || [];
}

async function extractFacts(documentId) {
  console.log(`\n📄 Extracting facts from document: ${documentId.substring(0, 8)}...`);
  const response = await makeRequest(`/facts/extract/${documentId}`, 'POST');
  return response;
}

function analyzeFacts(facts, label) {
  console.log(`\n${label}:`);
  console.log(`  Total facts: ${facts.length}`);
  
  const byType = {};
  let withDates = 0;
  let withoutDates = 0;
  
  facts.forEach(f => {
    byType[f.fact_type] = (byType[f.fact_type] || 0) + 1;
    if (f.fact_date) withDates++;
    else withoutDates++;
  });
  
  console.log(`  With dates: ${withDates} (${Math.round(withDates/facts.length*100)}%)`);
  console.log(`  Without dates: ${withoutDates} (${Math.round(withoutDates/facts.length*100)}%)`);
  console.log(`  By type:`);
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`    - ${type}: ${count}`);
  });
}

function showFactSamples(facts, label, limit = 5) {
  console.log(`\n${label} (showing ${Math.min(limit, facts.length)} of ${facts.length}):`);
  facts.slice(0, limit).forEach((f, i) => {
    console.log(`\n  ${i + 1}. [${f.fact_type}] ${f.content}`);
    console.log(`     Date: ${f.fact_date || 'MISSING'}`);
    console.log(`     Confidence: ${f.confidence}`);
    if (f.metadata && Object.keys(f.metadata).length > 0) {
      console.log(`     Metadata: ${JSON.stringify(f.metadata)}`);
    }
  });
}

function findDuplicates(facts) {
  const duplicates = [];
  const seen = new Map();
  
  facts.forEach(f => {
    const normalized = f.content.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\(hcc\)/gi, '')
      .trim();
    
    if (seen.has(normalized)) {
      duplicates.push({
        original: seen.get(normalized),
        duplicate: f.content
      });
    } else {
      seen.set(normalized, f.content);
    }
  });
  
  return duplicates;
}

async function testDocument(documentId) {
  console.log('\n' + '='.repeat(80));
  console.log(`Testing Document: ${documentId}`);
  console.log('='.repeat(80));
  
  // Get existing facts (old extraction)
  console.log('\n🔍 Fetching existing facts (old extraction)...');
  const existingFacts = await getExistingFacts(documentId);
  
  if (existingFacts.length > 0) {
    analyzeFacts(existingFacts, '📊 OLD EXTRACTION ANALYSIS');
    showFactSamples(existingFacts, '📋 OLD FACTS SAMPLE');
    
    const oldDuplicates = findDuplicates(existingFacts);
    if (oldDuplicates.length > 0) {
      console.log(`\n⚠️  Found ${oldDuplicates.length} potential duplicates in old extraction:`);
      oldDuplicates.slice(0, 3).forEach(d => {
        console.log(`  - "${d.original}" ≈ "${d.duplicate}"`);
      });
    }
  } else {
    console.log('  No existing facts found for this document');
  }
  
  // Extract with new system
  console.log('\n\n🚀 Running NEW extraction...');
  const newExtraction = await extractFacts(documentId);
  
  if (newExtraction.success) {
    const newFacts = newExtraction.facts || [];
    analyzeFacts(newFacts, '📊 NEW EXTRACTION ANALYSIS');
    showFactSamples(newFacts, '📋 NEW FACTS SAMPLE');
    
    const newDuplicates = findDuplicates(newFacts);
    if (newDuplicates.length > 0) {
      console.log(`\n⚠️  Found ${newDuplicates.length} potential duplicates in new extraction:`);
      newDuplicates.forEach(d => {
        console.log(`  - "${d.original}" ≈ "${d.duplicate}"`);
      });
    } else {
      console.log('\n✅ No obvious duplicates detected in new extraction!');
    }
    
    // Compare
    if (existingFacts.length > 0) {
      console.log('\n\n📈 COMPARISON:');
      console.log(`  Facts extracted: ${existingFacts.length} → ${newFacts.length} (${newFacts.length > existingFacts.length ? '+' : ''}${newFacts.length - existingFacts.length})`);
      
      const oldWithDates = existingFacts.filter(f => f.fact_date).length;
      const newWithDates = newFacts.filter(f => f.fact_date).length;
      console.log(`  Facts with dates: ${oldWithDates} (${Math.round(oldWithDates/existingFacts.length*100)}%) → ${newWithDates} (${Math.round(newWithDates/newFacts.length*100)}%)`);
      
      const oldDupCount = findDuplicates(existingFacts).length;
      const newDupCount = findDuplicates(newFacts).length;
      console.log(`  Potential duplicates: ${oldDupCount} → ${newDupCount} (${newDupCount < oldDupCount ? '✅ improved' : '⚠️  check'})`);
    }
  } else {
    console.log(`\n❌ Extraction failed: ${newExtraction.error}`);
  }
}

async function main() {
  console.log('🧪 Testing Improved Fact Extraction');
  console.log('Testing on pancreatitis-related documents\n');
  
  for (const docId of TEST_DOCUMENTS) {
    try {
      await testDocument(docId);
    } catch (error) {
      console.error(`\n❌ Error testing document ${docId}:`, error.message);
    }
  }
  
  console.log('\n\n' + '='.repeat(80));
  console.log('✅ Testing complete!');
  console.log('='.repeat(80));
}

main().catch(console.error);
