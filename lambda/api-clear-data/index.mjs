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
    
    // Parse fact IDs from event
    const body = event.body ? JSON.parse(event.body) : event;
    const factIds = body.factIds || [];
    
    if (factIds.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'No fact IDs provided'
        })
      };
    }
    
    console.log('Deleting facts:', factIds);
    
    // Get facts to be deleted
    const factsToDelete = await pool.query(
      'SELECT id, fact_type, content FROM medical.user_facts WHERE id = ANY($1::uuid[])',
      [factIds]
    );
    
    console.log('Facts to delete:', factsToDelete.rows);
    
    // Delete relationships first (foreign key constraint)
    const deletedRels = await pool.query(
      'DELETE FROM medical.relationships WHERE source_fact_id = ANY($1::uuid[]) OR target_fact_id = ANY($1::uuid[]) RETURNING id',
      [factIds]
    );
    
    console.log('Deleted relationships:', deletedRels.rows.length);
    
    // Delete facts
    const deletedFacts = await pool.query(
      'DELETE FROM medical.user_facts WHERE id = ANY($1::uuid[]) RETURNING id',
      [factIds]
    );
    
    console.log('Deleted facts:', deletedFacts.rows.length);
    
    const afterCounts = {
      facts_deleted: deletedFacts.rows.length,
      relationships_deleted: deletedRels.rows.length,
      deleted_facts: factsToDelete.rows
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
        message: 'Facts deleted successfully',
        ...afterCounts
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
