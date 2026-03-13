#!/usr/bin/env node

/**
 * Clear all test data from medical facts, relationships, and memories
 * This will remove all data from:
 * - medical.user_facts
 * - medical.relationships
 * - medical.knowledge_graph_changes
 * - medical.ai_layout_cache
 * - medical.memories
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

async function clearTestData() {
  console.log('🗑️  Clearing test data from database...\n');
  
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
    // Get counts before deletion
    console.log('📊 Current data counts:');
    const factCount = await pool.query('SELECT COUNT(*) FROM medical.user_facts');
    const relCount = await pool.query('SELECT COUNT(*) FROM medical.relationships');
    const memoryCount = await pool.query('SELECT COUNT(*) FROM medical.memories');
    const changeCount = await pool.query('SELECT COUNT(*) FROM medical.knowledge_graph_changes');
    const cacheCount = await pool.query('SELECT COUNT(*) FROM medical.ai_layout_cache');
    
    console.log(`  - User facts: ${factCount.rows[0].count}`);
    console.log(`  - Relationships: ${relCount.rows[0].count}`);
    console.log(`  - Memories: ${memoryCount.rows[0].count}`);
    console.log(`  - Knowledge graph changes: ${changeCount.rows[0].count}`);
    console.log(`  - AI layout cache: ${cacheCount.rows[0].count}`);
    console.log('');

    // Confirm deletion
    console.log('⚠️  WARNING: This will delete ALL data from these tables!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete in correct order (respecting foreign keys)
    console.log('🗑️  Deleting data...\n');
    
    // 1. Delete AI layout cache (no dependencies)
    console.log('  - Clearing AI layout cache...');
    await pool.query('DELETE FROM medical.ai_layout_cache');
    
    // 2. Delete knowledge graph changes (references relationships and facts)
    console.log('  - Clearing knowledge graph changes...');
    await pool.query('DELETE FROM medical.knowledge_graph_changes');
    
    // 3. Delete relationships (references facts)
    console.log('  - Clearing relationships...');
    await pool.query('DELETE FROM medical.relationships');
    
    // 4. Delete user facts (referenced by relationships)
    console.log('  - Clearing user facts...');
    await pool.query('DELETE FROM medical.user_facts');
    
    // 5. Delete memories (no dependencies)
    console.log('  - Clearing memories...');
    await pool.query('DELETE FROM medical.memories');
    
    console.log('\n✅ All test data cleared successfully!\n');
    
    // Verify deletion
    console.log('📊 Final data counts:');
    const finalFactCount = await pool.query('SELECT COUNT(*) FROM medical.user_facts');
    const finalRelCount = await pool.query('SELECT COUNT(*) FROM medical.relationships');
    const finalMemoryCount = await pool.query('SELECT COUNT(*) FROM medical.memories');
    const finalChangeCount = await pool.query('SELECT COUNT(*) FROM medical.knowledge_graph_changes');
    const finalCacheCount = await pool.query('SELECT COUNT(*) FROM medical.ai_layout_cache');
    
    console.log(`  - User facts: ${finalFactCount.rows[0].count}`);
    console.log(`  - Relationships: ${finalRelCount.rows[0].count}`);
    console.log(`  - Memories: ${finalMemoryCount.rows[0].count}`);
    console.log(`  - Knowledge graph changes: ${finalChangeCount.rows[0].count}`);
    console.log(`  - AI layout cache: ${finalCacheCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error clearing test data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearTestData();
