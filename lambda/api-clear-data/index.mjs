import pg from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const { Pool } = pg;
const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

let dbPool = null;

async function getDbCredentials() {
  const command = new GetSecretValueCommand({
    SecretId: 'lazarus-db-credentials',
  });
  const response = await secretsManager.send(command);
  return JSON.parse(response.SecretString);
}

async function getDbPool() {
  if (!dbPool) {
    const credentials = await getDbCredentials();
    dbPool = new Pool({
      host: credentials.host,
      port: credentials.port,
      database: credentials.dbname,
      user: credentials.username,
      password: credentials.password,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return dbPool;
}

export const handler = async (event) => {
  try {
    const pool = await getDbPool();
    
    // Get counts before deletion
    const beforeCounts = {
      facts: (await pool.query('SELECT COUNT(*) FROM medical.user_facts')).rows[0].count,
      relationships: (await pool.query('SELECT COUNT(*) FROM medical.relationships')).rows[0].count,
      changes: (await pool.query('SELECT COUNT(*) FROM medical.knowledge_graph_changes')).rows[0].count,
      cache: (await pool.query('SELECT COUNT(*) FROM medical.ai_layout_cache')).rows[0].count,
    };
    
    console.log('Before deletion:', beforeCounts);
    
    // Delete in correct order (respecting foreign keys)
    await pool.query('DELETE FROM medical.ai_layout_cache');
    await pool.query('DELETE FROM medical.knowledge_graph_changes');
    await pool.query('DELETE FROM medical.relationships');
    await pool.query('DELETE FROM medical.user_facts');
    
    // Get counts after deletion
    const afterCounts = {
      facts: (await pool.query('SELECT COUNT(*) FROM medical.user_facts')).rows[0].count,
      relationships: (await pool.query('SELECT COUNT(*) FROM medical.relationships')).rows[0].count,
      changes: (await pool.query('SELECT COUNT(*) FROM medical.knowledge_graph_changes')).rows[0].count,
      cache: (await pool.query('SELECT COUNT(*) FROM medical.ai_layout_cache')).rows[0].count,
    };
    
    console.log('After deletion:', afterCounts);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: 'All test data cleared successfully',
        before: beforeCounts,
        after: afterCounts,
      }),
    };
    
  } catch (error) {
    console.error('Error clearing data:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};
