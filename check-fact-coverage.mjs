import pg from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const { Pool } = pg;
const secretsManager = new SecretsManagerClient({ region: 'us-east-1' });

async function getDbCredentials() {
  const command = new GetSecretValueCommand({
    SecretId: 'lazarus-db-credentials',
  });
  const response = await secretsManager.send(command);
  return JSON.parse(response.SecretString);
}

async function checkCoverage() {
  const credentials = await getDbCredentials();
  const pool = new Pool({
    host: credentials.host,
    port: credentials.port,
    database: credentials.dbname,
    user: credentials.username,
    password: credentials.password,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Get total documents
    const totalDocs = await pool.query(`
      SELECT COUNT(*) as count FROM medical.documents
    `);
    
    // Get documents with facts
    const docsWithFacts = await pool.query(`
      SELECT COUNT(DISTINCT source_document_id) as count 
      FROM medical.user_facts 
      WHERE source_document_id IS NOT NULL
    `);
    
    // Get documents without facts
    const docsWithoutFacts = await pool.query(`
      SELECT d.id, d.s3_key, d.document_type, d.upload_date,
             LENGTH(d.content_text) as text_length
      FROM medical.documents d
      LEFT JOIN medical.user_facts f ON f.source_document_id = d.id
      WHERE d.content_text IS NOT NULL
      AND d.content_text != ''
      AND f.id IS NULL
      ORDER BY d.upload_date DESC
    `);
    
    // Get total facts
    const totalFacts = await pool.query(`
      SELECT COUNT(*) as count FROM medical.user_facts
    `);
    
    console.log('\n=== FACT EXTRACTION COVERAGE ===\n');
    console.log(`Total documents: ${totalDocs.rows[0].count}`);
    console.log(`Documents with facts extracted: ${docsWithFacts.rows[0].count}`);
    console.log(`Documents without facts: ${docsWithoutFacts.rows.length}`);
    console.log(`Total facts in database: ${totalFacts.rows[0].count}`);
    
    if (docsWithoutFacts.rows.length > 0) {
      console.log('\n=== DOCUMENTS NEEDING FACT EXTRACTION ===\n');
      docsWithoutFacts.rows.forEach((doc, i) => {
        console.log(`${i + 1}. ${doc.s3_key}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Type: ${doc.document_type || 'unknown'}`);
        console.log(`   Uploaded: ${doc.upload_date}`);
        console.log(`   Text length: ${doc.text_length} chars`);
        console.log('');
      });
    } else {
      console.log('\n✓ All documents have had facts extracted!\n');
    }
    
  } finally {
    await pool.end();
  }
}

checkCoverage().catch(console.error);
