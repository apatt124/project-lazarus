#!/usr/bin/env node

/**
 * List facts related to diabetes to identify test data
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

async function listDiabetesFacts() {
  console.log('🔍 Searching for diabetes-related facts...\n');
  
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
    // Search for diabetes-related facts
    const result = await pool.query(`
      SELECT 
        id,
        fact_type,
        content,
        confidence,
        fact_date,
        created_at,
        metadata
      FROM medical.user_facts
      WHERE 
        content ILIKE '%diabetes%'
        OR content ILIKE '%metformin%'
        OR content ILIKE '%insulin%'
        OR content ILIKE '%glucose%'
        OR content ILIKE '%blood sugar%'
      ORDER BY created_at ASC
    `);
    
    console.log(`Found ${result.rows.length} diabetes-related facts:\n`);
    
    result.rows.forEach((fact, index) => {
      console.log(`${index + 1}. [${fact.fact_type}] ${fact.content}`);
      console.log(`   ID: ${fact.id}`);
      console.log(`   Created: ${fact.created_at}`);
      console.log(`   Confidence: ${fact.confidence}`);
      if (fact.metadata?.source_document_id) {
        console.log(`   Source: Document ${fact.metadata.source_document_id}`);
      }
      console.log('');
    });
    
    // Check if these facts have relationships
    const relCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM medical.relationships r
      WHERE r.source_fact_id IN (
        SELECT id FROM medical.user_facts
        WHERE content ILIKE '%diabetes%'
           OR content ILIKE '%metformin%'
           OR content ILIKE '%insulin%'
           OR content ILIKE '%glucose%'
           OR content ILIKE '%blood sugar%'
      )
      OR r.target_fact_id IN (
        SELECT id FROM medical.user_facts
        WHERE content ILIKE '%diabetes%'
           OR content ILIKE '%metformin%'
           OR content ILIKE '%insulin%'
           OR content ILIKE '%glucose%'
           OR content ILIKE '%blood sugar%'
      )
    `);
    
    console.log(`\n📊 These facts are involved in ${relCount.rows[0].count} relationships\n`);
    
  } catch (error) {
    console.error('❌ Error listing facts:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

listDiabetesFacts();
