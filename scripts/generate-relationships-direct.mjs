#!/usr/bin/env node

/**
 * Generate relationships by invoking Lambda directly (bypasses API Gateway timeout)
 * This version uses AWS SDK to invoke Lambda directly with 120s timeout
 */

import 'dotenv/config';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROGRESS_FILE = path.join(__dirname, '.relationship-generation-progress.json');
const LAMBDA_FUNCTION = 'lazarus-api-relationships';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const lambda = new LambdaClient({ region: AWS_REGION });

// Load or initialize progress
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      console.log('📂 Resuming from previous session...');
      console.log(`   Last run: ${new Date(data.lastRun).toLocaleString()}`);
      console.log(`   Progress: ${data.totalCreated} relationships, ${data.totalProcessed} facts`);
      console.log('');
      return data;
    }
  } catch (error) {
    console.warn('Warning: Could not load progress file, starting fresh');
  }
  
  return {
    totalCreated: 0,
    totalProcessed: 0,
    batchNumber: 0,
    lastRun: new Date().toISOString(),
    completed: false,
  };
}

// Save progress
function saveProgress(progress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
      ...progress,
      lastRun: new Date().toISOString(),
    }, null, 2));
  } catch (error) {
    console.error('Warning: Could not save progress:', error.message);
  }
}

// Clear progress file when complete
function clearProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
    }
  } catch (error) {
    console.error('Warning: Could not clear progress file:', error.message);
  }
}

// Handle graceful shutdown
let isShuttingDown = false;
let currentProgress = null;

function setupShutdownHandlers() {
  const shutdown = (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log(`\n\n⚠️  Received ${signal}, saving progress and shutting down...`);
    
    if (currentProgress) {
      saveProgress(currentProgress);
      console.log('✓ Progress saved');
      console.log('  Run the script again to resume.');
    }
    
    console.log('\nGoodbye! 👋\n');
    process.exit(0);
  };
  
  process.on('SIGINT', () => shutdown('SIGINT (Ctrl+C)'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

async function invokeLambda(batchSize) {
  const payload = {
    path: '/relationships/extract',
    httpMethod: 'POST',
    body: JSON.stringify({
      batchSize: batchSize,
      skipExisting: true,
    }),
  };
  
  const command = new InvokeCommand({
    FunctionName: LAMBDA_FUNCTION,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(payload),
  });
  
  const response = await lambda.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.Payload));
  
  if (result.statusCode !== 200) {
    throw new Error(`Lambda returned ${result.statusCode}: ${result.body}`);
  }
  
  return JSON.parse(result.body);
}

async function generateRelationships() {
  const batchSize = 50; // Can use larger batches with direct Lambda invocation
  const maxBatches = 500; // Increased to handle larger datasets
  
  console.log('=== Relationship Generation (Direct Lambda) ===');
  console.log('Lambda function:', LAMBDA_FUNCTION);
  console.log('Region:', AWS_REGION);
  console.log('Batch size:', batchSize);
  console.log('Max batches:', maxBatches);
  console.log('');
  console.log('💡 Tip: Press Ctrl+C to pause and save progress');
  console.log('');
  
  const progress = loadProgress();
  currentProgress = progress;
  
  if (progress.completed) {
    console.log('✓ Previous run completed successfully!');
    console.log('  Starting fresh...\n');
    progress.totalCreated = 0;
    progress.totalProcessed = 0;
    progress.batchNumber = 0;
    progress.completed = false;
  }
  
  const startTime = Date.now();
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 3;
  
  while (progress.batchNumber < maxBatches && !isShuttingDown) {
    progress.batchNumber++;
    const batchStartTime = Date.now();
    
    console.log(`\n--- Batch ${progress.batchNumber}/${maxBatches} ---`);
    
    try {
      const result = await invokeLambda(batchSize);
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown API error');
      }
      
      consecutiveErrors = 0;
      
      const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
      const created = result.relationships_created || 0;
      const processed = result.new_facts || 0;
      
      console.log(`✓ Relationships created: ${created}`);
      console.log(`  Facts processed: ${processed}`);
      console.log(`  Context facts: ${result.context_facts || 0}`);
      console.log(`  Time: ${batchTime}s`);
      
      progress.totalCreated += created;
      progress.totalProcessed += processed;
      
      saveProgress(progress);
      
      if (processed === 0) {
        console.log('\n✓ All facts have been processed!');
        progress.completed = true;
        break;
      }
      
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      const avgPerBatch = (progress.totalCreated / progress.batchNumber).toFixed(1);
      console.log(`  Running total: ${progress.totalCreated} relationships, ${progress.totalProcessed} facts (${elapsed}m, avg ${avgPerBatch}/batch)`);
      
      if (!isShuttingDown) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      consecutiveErrors++;
      console.error(`❌ Error in batch ${progress.batchNumber}:`, error.message);
      
      if (consecutiveErrors >= maxConsecutiveErrors) {
        console.error(`\n⚠️  ${maxConsecutiveErrors} consecutive errors, stopping.`);
        saveProgress(progress);
        process.exit(1);
      }
      
      console.log(`   Retrying in 5 seconds... (${consecutiveErrors}/${maxConsecutiveErrors} errors)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n=== Summary ===');
  console.log(`Total batches processed: ${progress.batchNumber}`);
  console.log(`Total relationships created: ${progress.totalCreated}`);
  console.log(`Total facts processed: ${progress.totalProcessed}`);
  console.log(`Total time: ${totalTime} minutes`);
  console.log('');
  
  if (progress.completed) {
    console.log('✅ Relationship generation complete!');
    console.log('   Refresh your Knowledge Graph to see the results.');
    clearProgress();
  } else if (isShuttingDown) {
    console.log('⏸️  Paused - progress saved');
  } else {
    console.log('⚠️  Stopped before completion');
  }
  
  console.log('');
}

setupShutdownHandlers();

generateRelationships().catch(error => {
  console.error('\n❌ Fatal error:', error);
  if (currentProgress) {
    saveProgress(currentProgress);
    console.log('Progress saved.');
  }
  process.exit(1);
});
