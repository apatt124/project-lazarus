#!/usr/bin/env node

/**
 * Script to replace all CORS header objects in Lambda function with CORS_HEADERS constant
 * This ensures consistent CORS headers across all responses
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const lambdaFile = path.join(__dirname, '..', 'lambda', 'api-relationships', 'index.mjs');

console.log('Reading Lambda function:', lambdaFile);

let content = fs.readFileSync(lambdaFile, 'utf8');

// Pattern to match the old header format
const oldHeaderPattern = /headers: \{\s*'Content-Type': 'application\/json',\s*'Access-Control-Allow-Origin': '\*',\s*\}/g;

// Replacement with CORS_HEADERS constant
const newHeaders = 'headers: CORS_HEADERS';

// Count matches before replacement
const matches = content.match(oldHeaderPattern);
const matchCount = matches ? matches.length : 0;

console.log(`Found ${matchCount} header objects to replace`);

if (matchCount === 0) {
  console.log('No header objects found to replace. Already updated?');
  process.exit(0);
}

// Perform replacement
content = content.replace(oldHeaderPattern, newHeaders);

// Verify replacement worked
const remainingMatches = content.match(oldHeaderPattern);
const remainingCount = remainingMatches ? remainingMatches.length : 0;

if (remainingCount > 0) {
  console.error(`Warning: ${remainingCount} header objects still remain`);
} else {
  console.log('✅ All header objects replaced successfully');
}

// Write back to file
fs.writeFileSync(lambdaFile, content, 'utf8');

console.log('✅ Lambda function updated');
console.log('');
console.log('Next steps:');
console.log('1. Review the changes: git diff lambda/api-relationships/index.mjs');
console.log('2. Deploy to AWS Lambda');
console.log('3. Test the endpoints');

