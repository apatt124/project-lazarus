#!/usr/bin/env node

/**
 * Deduplicate relationships in the database
 * Keeps the relationship with highest strength, adds occurrence_count field
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function deduplicateRelationships() {
  console.log('=== Relationship Deduplication ===\n');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current counts
    const beforeResult = await client.query('SELECT COUNT(*) FROM medical.relationships');
    const beforeCount = parseInt(beforeResult.rows[0].count);
    console.log(`Total relationships before: ${beforeCount}`);
    
    // Add occurrence_count column if it doesn't exist
    console.log('\n1. Adding occurrence_count column...');
    await client.query(`
      ALTER TABLE medical.relationships 
      ADD COLUMN IF NOT EXISTS occurrence_count INTEGER DEFAULT 1
    `);
    console.log('   ✓ Column added');
    
    // Find and deduplicate relationships
    console.log('\n2. Finding duplicate relationships...');
    const duplicatesResult = await client.query(`
      SELECT 
        source_fact_id,
        target_fact_id,
        relationship_type,
        COUNT(*) as duplicate_count,
        MAX(strength) as max_strength,
        ARRAY_AGG(id ORDER BY strength DESC, created_at ASC) as all_ids
      FROM medical.relationships
      WHERE is_active = TRUE
      GROUP BY source_fact_id, target_fact_id, relationship_type
      HAVING COUNT(*) > 1
    `);
    
    const duplicateGroups = duplicatesResult.rows;
    console.log(`   Found ${duplicateGroups.length} groups of duplicates`);
    
    if (duplicateGroups.length === 0) {
      console.log('\n✓ No duplicates found!');
      await client.query('ROLLBACK');
      return;
    }
    
    // Show top 10 most duplicated
    console.log('\n   Top 10 most duplicated:');
    const sorted = [...duplicateGroups].sort((a, b) => b.duplicate_count - a.duplicate_count);
    for (let i = 0; i < Math.min(10, sorted.length); i++) {
      const group = sorted[i];
      const sourceResult = await client.query(
        'SELECT content FROM medical.user_facts WHERE id = $1',
        [group.source_fact_id]
      );
      const targetResult = await client.query(
        'SELECT content FROM medical.user_facts WHERE id = $1',
        [group.target_fact_id]
      );
      
      const sourceContent = sourceResult.rows[0]?.content || 'unknown';
      const targetContent = targetResult.rows[0]?.content || 'unknown';
      
      console.log(`   ${i + 1}. ${sourceContent.substring(0, 40)}... → ${targetContent.substring(0, 40)}...`);
      console.log(`      Type: ${group.relationship_type}, Duplicates: ${group.duplicate_count}`);
    }
    
    // Deduplicate each group
    console.log('\n3. Deduplicating relationships...');
    let totalDeleted = 0;
    let processedGroups = 0;
    
    for (const group of duplicateGroups) {
      const keepId = group.all_ids[0]; // First ID (highest strength, earliest created)
      const deleteIds = group.all_ids.slice(1);
      
      // Update the kept relationship with occurrence count
      await client.query(`
        UPDATE medical.relationships
        SET occurrence_count = $1,
            strength = $2
        WHERE id = $3
      `, [group.duplicate_count, group.max_strength, keepId]);
      
      // Delete the duplicates
      if (deleteIds.length > 0) {
        await client.query(`
          DELETE FROM medical.relationships
          WHERE id = ANY($1::uuid[])
        `, [deleteIds]);
        
        totalDeleted += deleteIds.length;
      }
      
      processedGroups++;
      if (processedGroups % 100 === 0) {
        console.log(`   Processed ${processedGroups}/${duplicateGroups.length} groups...`);
      }
    }
    
    console.log(`   ✓ Processed all ${duplicateGroups.length} groups`);
    console.log(`   ✓ Deleted ${totalDeleted} duplicate relationships`);
    
    // Get final counts
    const afterResult = await client.query('SELECT COUNT(*) FROM medical.relationships');
    const afterCount = parseInt(afterResult.rows[0].count);
    
    console.log('\n=== Summary ===');
    console.log(`Before: ${beforeCount} relationships`);
    console.log(`After: ${afterCount} relationships`);
    console.log(`Deleted: ${totalDeleted} duplicates`);
    console.log(`Reduction: ${((totalDeleted / beforeCount) * 100).toFixed(1)}%`);
    
    await client.query('COMMIT');
    console.log('\n✅ Deduplication complete!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error during deduplication:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

deduplicateRelationships().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
