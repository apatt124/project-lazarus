#!/usr/bin/env node

/**
 * Check uploaded documents and data quality
 * Run from frontend directory: node ../check-uploads.js
 */

const path = require('path');
const { LambdaClient, InvokeCommand } = require(path.join(__dirname, 'frontend/node_modules/@aws-sdk/client-lambda'));

const lambda = new LambdaClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

async function checkUploads() {
  try {
    console.log('🔍 Checking uploaded documents...\n');

    const command = new InvokeCommand({
      FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME || 'lazarus-vector-search',
      Payload: JSON.stringify({
        apiPath: '/stats',
        httpMethod: 'GET',
        parameters: [],
      }),
    });

    const response = await lambda.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    const lambdaResponse = payload.response;
    const responseBody = JSON.parse(
      lambdaResponse.responseBody['application/json'].body
    );

    if (!responseBody.success) {
      console.error('❌ Error:', responseBody.error);
      return;
    }

    // Summary
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Documents: ${responseBody.total_documents}`);
    console.log(`Real Documents: ${responseBody.real_document_count}`);
    console.log(`Test Documents: ${responseBody.test_document_count}`);
    console.log(`Has Test Data: ${responseBody.has_test_data ? '⚠️  Yes' : '✅ No'}`);
    console.log();

    // Document types
    if (responseBody.document_types && responseBody.document_types.length > 0) {
      console.log('📋 DOCUMENT TYPES');
      console.log('═══════════════════════════════════════════════════════');
      responseBody.document_types.forEach(type => {
        console.log(`  ${type.document_type || 'unknown'}: ${type.count}`);
      });
      console.log();
    }

    // Providers
    if (responseBody.providers && responseBody.providers.length > 0) {
      console.log('🏥 PROVIDERS');
      console.log('═══════════════════════════════════════════════════════');
      responseBody.providers.forEach(provider => {
        console.log(`  • ${provider}`);
      });
      console.log();
    }

    // All documents
    if (responseBody.all_documents && responseBody.all_documents.length > 0) {
      console.log('📄 ALL DOCUMENTS');
      console.log('═══════════════════════════════════════════════════════');
      
      const realDocs = responseBody.all_documents.filter(d => !d.is_test_data);
      const testDocs = responseBody.all_documents.filter(d => d.is_test_data);
      
      if (realDocs.length > 0) {
        console.log('\n✅ REAL DOCUMENTS:');
        realDocs.forEach((doc, idx) => {
          console.log(`\n${idx + 1}. ${doc.filename || doc.s3_key}`);
          console.log(`   ID: ${doc.id}`);
          console.log(`   Type: ${doc.document_type || 'unknown'}`);
          console.log(`   Provider: ${doc.provider || 'N/A'}`);
          console.log(`   Date: ${doc.document_date || 'N/A'}`);
          console.log(`   Preview: ${doc.content_preview || 'N/A'}...`);
        });
      }
      
      if (testDocs.length > 0) {
        console.log('\n\n⚠️  TEST DOCUMENTS:');
        testDocs.forEach((doc, idx) => {
          console.log(`\n${idx + 1}. ${doc.filename || doc.s3_key}`);
          console.log(`   ID: ${doc.id}`);
          console.log(`   Type: ${doc.document_type || 'unknown'}`);
        });
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    
    // Data quality assessment
    console.log('\n🏥 DATA QUALITY ASSESSMENT');
    console.log('═══════════════════════════════════════════════════════');
    
    const realCount = responseBody.real_document_count;
    const testCount = responseBody.test_document_count;
    
    if (realCount === 0 && testCount === 0) {
      console.log('❌ No documents uploaded yet');
    } else if (realCount === 0 && testCount > 0) {
      console.log('⚠️  Only test data present - no real documents uploaded');
    } else if (realCount > 0 && testCount > 0) {
      console.log('⚠️  Mix of real and test data');
      console.log(`   Consider cleaning test data for production use`);
    } else {
      console.log('✅ Only real documents present');
    }
    
    if (realCount > 0) {
      console.log(`✅ ${realCount} real document(s) available for search`);
    }
    
    console.log();

  } catch (error) {
    console.error('❌ Error checking uploads:', error.message);
    process.exit(1);
  }
}

checkUploads();
