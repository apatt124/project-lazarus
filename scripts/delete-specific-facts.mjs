#!/usr/bin/env node

/**
 * Delete specific facts by ID
 * Usage: node scripts/delete-specific-facts.mjs <fact-id-1> <fact-id-2> ...
 */

import pg from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const { Pool } = pg;

async function getDbCredentials() {
  const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
  const command = new GetSecretValueCommand({
    SecretId: 'lazarus-db-credentials',
  });
  const response = await secretsManager.send(command);
  return JSON.parse(response.SecretString);
}

async function deleteSpecificFacts(factIds) {
  if (factIds.length === 0) {
    console.log('❌ No fact IDs provided');
    console.log('Usage: node scripts/delete-specific-facts.mjs <fact-id-1> <fact-id-2> ...');
    process.exit(1);
  }
  
  console.log(`🗑️  Preparing to delete ${factIds.length} facts...\n`);
  
  const credentials = await getDbCredentials();
  const pool = new Pool({
    host: credentials.host,
    port: credentials.port,
    database: credentials.dbname,
    user: credentials.username,
    password: credentials.password,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // First, show what will be deleted
    const factsToDelete = await pool.query(`
      SELECT id, fact_type, content, created_at
      FROM medical.user_facts
      WHERE id = ANY($1::uuid[])
    `, [factIds]);
    
    console.log('📋 Facts to be deleted:');
    factsToDelete.rows.forEach((fact, index) => {
      console.log(`${index + 1}. [${fact.fact_type}] ${fact.content}`);
      console.log(`   ID: ${fact.id}`);
      console.log('');
    });
    
    // Check relationships
    const relCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM medical.relationships
      WHERE source_fact_id = ANY($1::uuid[])
         OR target_fact_id = ANY($1::uuid[])
    `, [factIds]);
    
    console.log(`⚠️  This will also delete ${relCount.rows[0].count} related relationships\n`);
    
    // Confirm deletion
    console.log('⏳ Waiting 5 seconds before deletion... (Press Ctrl+C to cancel)\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Delete relationships first (foreign key constraint)
    console.log('🗑️  Deleting relationships...');
    const deletedRels = await pool.query(`
      DELETE FROM medical.relationships
      WHERE source_fact_id = ANY($1::uuid[])
         OR target_fact_id = ANY($1::uuid[])
      RETURNING id
    `, [factIds]);
    
    console.log(`   ✓ Deleted ${deletedRels.rows.length} relationships`);
    
    // Delete facts
    console.log('🗑️  Deleting facts...');
    const deletedFacts = await pool.query(`
      DELETE FROM medical.user_facts
      WHERE id = ANY($1::uuid[])
      RETURNING id
    `, [factIds]);
    
    console.log(`   ✓ Deleted ${deletedFacts.rows.length} facts`);
    
    console.log('\n✅ Deletion complete!\n');
    
  } catch (error) {
    console.error('❌ Error deleting facts:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get fact IDs from command line arguments
const factIds = process.argv.slice(2);
deleteSpecificFacts(factIds);
