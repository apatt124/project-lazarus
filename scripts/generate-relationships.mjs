#!/usr/bin/env node

/**
 * Generate relationships between facts using AI
 * This script processes facts in batches and creates relationships
 * 
 * Features:
 * - Resumable: Can be stopped and restarted, picks up where it left off
 * - Progress tracking: Saves progress to a file
 * - Graceful shutdown: Handles Ctrl+C to save progress
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.VITE_API_URL;
const PROGRESS_FILE = path.join(__dirname, '.relationship-generation-progress.json');

if (!API_URL) {
  console.error('Error: VITE_API_URL not set in .env file');
  process.exit(1);
}

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
      console.log('✓ Progress saved to:', PROGRESS_FILE);
      console.log('  Run the script again to resume from this point.');
    }
    
    console.log('\nGoodbye! 👋\n');
    process.exit(0);
  };
  
  process.on('SIGINT', () => shutdown('SIGINT (Ctrl+C)'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

async function generateRelationships() {
  const batchSize = 10; // Process 10 facts at a time (reduced to avoid timeouts)
  const maxBatches = 250; // Process up to 250 batches (2500 facts)
  
  console.log('=== Relationship Generation ===');
  console.log('API URL:', API_URL);
  console.log('Batch size:', batchSize);
  console.log('Max batches:', maxBatches);
  console.log('');
  console.log('💡 Tip: Press Ctrl+C to pause and save progress');
  console.log('');
  
  // Load previous progress
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
      const response = await fetch(`${API_URL}/relationships/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchSize: batchSize,
          skipExisting: true, // Only process facts without relationships
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown API error');
      }
      
      // Reset error counter on success
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
      
      // Save progress after each successful batch
      saveProgress(progress);
      
      // If no new facts to process, we're done
      if (processed === 0) {
        console.log('\n✓ All facts have been processed!');
        progress.completed = true;
        break;
      }
      
      // Show running totals
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      const avgPerBatch = (progress.totalCreated / progress.batchNumber).toFixed(1);
      console.log(`  Running total: ${progress.totalCreated} relationships, ${progress.totalProcessed} facts (${elapsed}m, avg ${avgPerBatch}/batch)`);
      
      // Small delay between batches to avoid overwhelming the API
      if (!isShuttingDown) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      consecutiveErrors++;
      console.error(`❌ Error in batch ${progress.batchNumber}:`, error.message);
      
      if (consecutiveErrors >= maxConsecutiveErrors) {
        console.error(`\n⚠️  ${maxConsecutiveErrors} consecutive errors, stopping.`);
        console.error('   Progress has been saved. Fix the issue and run again to resume.');
        saveProgress(progress);
        process.exit(1);
      }
      
      console.log(`   Retrying in 5 seconds... (${consecutiveErrors}/${maxConsecutiveErrors} errors)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Final summary
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
    console.log('   Run the script again to resume.');
  } else {
    console.log('⚠️  Stopped before completion');
    console.log('   Run the script again to continue.');
  }
  
  console.log('');
}

// Setup handlers and run
setupShutdownHandlers();

generateRelationships().catch(error => {
  console.error('\n❌ Fatal error:', error);
  if (currentProgress) {
    saveProgress(currentProgress);
    console.log('Progress saved. Fix the error and run again to resume.');
  }
  process.exit(1);
});
