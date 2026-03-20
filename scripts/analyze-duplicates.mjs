#!/usr/bin/env node

/**
 * Analyze duplicate facts and relationships in the database
 * Reports on duplication patterns without making any changes
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function analyzeDuplicates() {
  console.log('=== Duplicate Facts & Relationships Analysis ===\n');
  
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 1. Analyze duplicate facts (same content, different IDs)
    console.log('1. DUPLICATE FACTS ANALYSIS');
    console.log('─'.repeat(60));
    
    const duplicateFacts = await pool.query(`
      SELECT 
        content,
        fact_type,
        COUNT(*) as occurrence_count,
        ARRAY_AGG(id) as fact_ids,
        ARRAY_AGG(confidence) as confidences,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen
      FROM medical.user_facts
      WHERE is_active = TRUE
      GROUP BY content, fact_type
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `);
    
    console.log(`Found ${duplicateFacts.rowCount} groups of duplicate facts\n`);
    
    if (duplicateFacts.rows.length > 0) {
      console.log('Top 20 most duplicated facts:');
      duplicateFacts.rows.forEach((row, i) => {
        console.log(`\n${i + 1}. "${row.content.substring(0, 80)}${row.content.length > 80 ? '...' : ''}"`);
        console.log(`   Type: ${row.fact_type}`);
        console.log(`   Occurrences: ${row.occurrence_count}`);
        console.log(`   Fact IDs: ${row.fact_ids.length} unique IDs`);
        console.log(`   Confidences: ${row.confidences.map(c => c.toFixed(2)).join(', ')}`);
        console.log(`   First seen: ${row.first_seen.toISOString().split('T')[0]}`);
        console.log(`   Last seen: ${row.last_seen.toISOString().split('T')[0]}`);
      });
    }

    // 2. Analyze duplicate relationships (same source/target content + type)
    console.log('\n\n2. DUPLICATE RELATIONSHIPS ANALYSIS');
    console.log('─'.repeat(60));
    
    const duplicateRelationships = await pool.query(`
      SELECT 
        sf.content as source_content,
        tf.content as target_content,
        r.relationship_type,
        COUNT(*) as occurrence_count,
        ARRAY_AGG(r.id) as relationship_ids,
        ARRAY_AGG(r.strength) as strengths,
        ARRAY_AGG(r.source_fact_id) as source_ids,
        ARRAY_AGG(r.target_fact_id) as target_ids,
        MIN(r.created_at) as first_seen,
        MAX(r.created_at) as last_seen
      FROM medical.relationships r
      JOIN medical.user_facts sf ON r.source_fact_id = sf.id
      JOIN medical.user_facts tf ON r.target_fact_id = tf.id
      WHERE r.is_active = TRUE
      GROUP BY sf.content, tf.content, r.relationship_type
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `);
    
    console.log(`Found ${duplicateRelationships.rowCount} groups of duplicate relationships\n`);
    
    if (duplicateRelationships.rows.length > 0) {
      console.log('Top 20 most duplicated relationships:');
      duplicateRelationships.rows.forEach((row, i) => {
        console.log(`\n${i + 1}. "${row.source_content.substring(0, 40)}..." → "${row.target_content.substring(0, 40)}..."`);
        console.log(`   Type: ${row.relationship_type}`);
        console.log(`   Occurrences: ${row.occurrence_count}`);
        console.log(`   Relationship IDs: ${row.relationship_ids.length} unique IDs`);
        console.log(`   Strengths: ${row.strengths.map(s => s.toFixed(2)).join(', ')}`);
        console.log(`   Source fact IDs: ${row.source_ids.length} different source facts`);
        console.log(`   Target fact IDs: ${row.target_ids.length} different target facts`);
        console.log(`   First seen: ${row.first_seen.toISOString().split('T')[0]}`);
        console.log(`   Last seen: ${row.last_seen.toISOString().split('T')[0]}`);
      });
    }

    // 3. Overall statistics
    console.log('\n\n3. OVERALL STATISTICS');
    console.log('─'.repeat(60));
    
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM medical.user_facts WHERE is_active = TRUE) as total_facts,
        (SELECT COUNT(DISTINCT content || '|' || fact_type) FROM medical.user_facts WHERE is_active = TRUE) as unique_facts,
        (SELECT COUNT(*) FROM medical.relationships WHERE is_active = TRUE) as total_relationships,
        (SELECT COUNT(*) FROM (
          SELECT sf.content, tf.content, r.relationship_type
          FROM medical.relationships r
          JOIN medical.user_facts sf ON r.source_fact_id = sf.id
          JOIN medical.user_facts tf ON r.target_fact_id = tf.id
          WHERE r.is_active = TRUE
          GROUP BY sf.content, tf.content, r.relationship_type
        ) unique_rels) as unique_relationships
    `);
    
    const s = stats.rows[0];
    const factDuplication = ((s.total_facts - s.unique_facts) / s.total_facts * 100).toFixed(1);
    const relDuplication = ((s.total_relationships - s.unique_relationships) / s.total_relationships * 100).toFixed(1);
    
    console.log(`Total facts: ${s.total_facts}`);
    console.log(`Unique facts (by content + type): ${s.unique_facts}`);
    console.log(`Duplicate facts: ${s.total_facts - s.unique_facts} (${factDuplication}%)`);
    console.log();
    console.log(`Total relationships: ${s.total_relationships}`);
    console.log(`Unique relationships (by content + type): ${s.unique_relationships}`);
    console.log(`Duplicate relationships: ${s.total_relationships - s.unique_relationships} (${relDuplication}%)`);

    // 4. Nodes with excessive connections
    console.log('\n\n4. NODES WITH EXCESSIVE CONNECTIONS');
    console.log('─'.repeat(60));
    
    const highConnectionNodes = await pool.query(`
      SELECT 
        f.id,
        f.content,
        f.fact_type,
        COUNT(DISTINCT r.id) as connection_count,
        COUNT(DISTINCT CASE WHEN r.source_fact_id = f.id THEN r.target_fact_id ELSE r.source_fact_id END) as unique_connected_nodes
      FROM medical.user_facts f
      JOIN medical.relationships r ON (r.source_fact_id = f.id OR r.target_fact_id = f.id)
      WHERE f.is_active = TRUE AND r.is_active = TRUE
      GROUP BY f.id, f.content, f.fact_type
      HAVING COUNT(DISTINCT r.id) > 100
      ORDER BY COUNT(DISTINCT r.id) DESC
      LIMIT 10
    `);
    
    console.log(`Found ${highConnectionNodes.rowCount} nodes with >100 connections\n`);
    
    if (highConnectionNodes.rows.length > 0) {
      highConnectionNodes.rows.forEach((row, i) => {
        console.log(`${i + 1}. "${row.content.substring(0, 60)}${row.content.length > 60 ? '...' : ''}"`);
        console.log(`   Type: ${row.fact_type}`);
        console.log(`   Total connections: ${row.connection_count}`);
        console.log(`   Unique connected nodes: ${row.unique_connected_nodes}`);
        console.log(`   Duplication ratio: ${(row.connection_count / row.unique_connected_nodes).toFixed(1)}x`);
        console.log();
      });
    }

    // 5. Recommendations
    console.log('\n5. CLEANUP RECOMMENDATIONS');
    console.log('─'.repeat(60));
    console.log();
    
    if (factDuplication > 10) {
      console.log('✓ HIGH PRIORITY: Deduplicate facts');
      console.log(`  - ${s.total_facts - s.unique_facts} duplicate facts (${factDuplication}%)`);
      console.log('  - Strategy: Keep highest confidence, merge occurrences');
      console.log();
    }
    
    if (relDuplication > 10) {
      console.log('✓ HIGH PRIORITY: Deduplicate relationships');
      console.log(`  - ${s.total_relationships - s.unique_relationships} duplicate relationships (${relDuplication}%)`);
      console.log('  - Strategy: Keep highest strength, add occurrence count');
      console.log();
    }
    
    if (highConnectionNodes.rowCount > 0) {
      console.log('✓ MEDIUM PRIORITY: Review high-connection nodes');
      console.log(`  - ${highConnectionNodes.rowCount} nodes with >100 connections`);
      console.log('  - Many connections may be duplicates');
      console.log();
    }

    console.log('\nNext steps:');
    console.log('1. Review the duplicate patterns above');
    console.log('2. Run cleanup script to deduplicate (to be created)');
    console.log('3. Add constraints to prevent future duplicates');
    console.log();

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

analyzeDuplicates().catch(console.error);
