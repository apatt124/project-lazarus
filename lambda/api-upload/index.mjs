import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import crypto from 'crypto';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const textract = new TextractClient({ region: process.env.AWS_REGION || 'us-east-1' });
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Extract text from document using Textract
async function extractText(fileBuffer, contentType) {
  try {
    // For text files, just decode
    if (contentType === 'text/plain') {
      return fileBuffer.toString('utf-8');
    }
    
    // For PDFs and images, use Textract
    const command = new DetectDocumentTextCommand({
      Document: { Bytes: fileBuffer }
    });
    
    const response = await textract.send(command);
    const text = response.Blocks
      ?.filter(block => block.BlockType === 'LINE')
      .map(block => block.Text)
      .join('\n') || '';
    
    return text;
  } catch (error) {
    console.error('Textract error:', error);
    return '';
  }
}

// Generate embeddings using Bedrock
async function generateEmbedding(text) {
  try {
    const command = new InvokeModelCommand({
      modelId: 'amazon.titan-embed-text-v2:0',
      body: JSON.stringify({
        inputText: text.substring(0, 8000) // Titan limit
      })
    });
    
    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    return null;
  }
}

// Upload file to S3
async function uploadToS3(key, buffer, contentType, metadata) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: metadata
  });
  
  await s3.send(command);
  return `s3://${BUCKET_NAME}/${key}`;
}

// Store document in vector database
async function storeInVectorDB(s3Key, text, embedding, metadata) {
  try {
    const command = new InvokeCommand({
      FunctionName: process.env.VECTOR_SEARCH_FUNCTION || 'lazarus-vector-search',
      Payload: JSON.stringify({
        apiPath: '/store',
        httpMethod: 'POST',
        parameters: [
          { name: 's3_key', value: s3Key },
          { name: 'content', value: text },
          { name: 'metadata', value: JSON.stringify(metadata) }
        ]
      })
    });
    
    const response = await lambda.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    
    console.log('Vector DB response:', JSON.stringify(payload, null, 2));
    
    return payload.response;
  } catch (error) {
    console.error('Vector DB storage error:', error);
    throw error;
  }
}

// Process a single document
async function processDocument(filename, fileBuffer, metadata) {
  const documentId = crypto.randomUUID();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const s3Key = `documents/${timestamp}-${filename}`;
  
  console.log(`Processing document: ${filename}`);
  
  // Extract text
  const text = await extractText(fileBuffer, metadata.contentType);
  
  if (!text) {
    throw new Error('Could not extract text from document');
  }
  
  console.log(`Extracted ${text.length} characters of text`);
  
  // Upload to S3 first
  const s3Uri = await uploadToS3(s3Key, fileBuffer, metadata.contentType, {
    documentType: metadata.documentType || 'other',
    provider: metadata.provider || '',
    date: metadata.date || '',
    originalFilename: filename
  });
  
  console.log(`Uploaded to S3: ${s3Uri}`);
  
  // Prepare metadata for vector DB
  const vectorMetadata = {
    ...metadata,
    filename,
    uploadedAt: new Date().toISOString(),
    s3_uri: s3Uri,
    document_type: metadata.documentType || 'other'
  };
  
  // Store in vector database (it will generate its own embedding)
  const storeResult = await storeInVectorDB(s3Key, text, null, vectorMetadata);
  
  console.log(`Stored in vector database`);
  
  return {
    documentId: storeResult.responseBody?.['application/json']?.body ? 
      JSON.parse(storeResult.responseBody['application/json'].body).document_id : 
      documentId,
    filename,
    s3Uri,
    textLength: text.length,
    metadata: vectorMetadata
  };
}

export const handler = async (event) => {
  try {
    console.log('Upload event:', JSON.stringify(event, null, 2));
    
    // Parse JSON body (base64-encoded file)
    const body = JSON.parse(event.body || '{}');
    const { fileName, fileType, fileData, metadata } = body;
    
    if (!fileName || !fileData) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing fileName or fileData' 
        })
      };
    }
    
    // Decode base64 file data
    const fileBuffer = Buffer.from(fileData, 'base64');
    
    console.log(`Received file: ${fileName}, size: ${fileBuffer.length} bytes`);
    
    // Process the document
    const result = await processDocument(
      fileName, 
      fileBuffer, 
      { ...metadata, contentType: fileType || 'application/octet-stream' }
    );
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        document: result
      })
    };
    
  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error.message || String(error)
      })
    };
  }
};
