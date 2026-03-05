import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import crypto from 'crypto';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

const lambda = new LambdaClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const textract = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

async function extractTextWithTextract(buffer: Buffer): Promise<string> {
  try {
    console.log('Using Textract for OCR...');
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: buffer,
      },
    });

    const response = await textract.send(command);
    
    // Extract text from Textract response
    const text = response.Blocks
      ?.filter(block => block.BlockType === 'LINE')
      .map(block => block.Text)
      .join('\n') || '';

    console.log(`Textract extracted ${text.length} characters`);
    return text;
  } catch (error) {
    console.error('Textract error:', error);
    throw new Error('Failed to extract text with Textract');
  }
}

async function extractTextWithVision(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    console.log('Using Claude Vision for image analysis...');
    
    const base64Image = buffer.toString('base64');
    
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: 'This is a medical document (lab results, prescription, visit notes, or health record). Please extract ALL text content from this image. Include:\n\n1. All visible text, numbers, and data\n2. Patient information\n3. Provider/doctor names\n4. Dates\n5. Test results, measurements, or values\n6. Medications or prescriptions\n7. Diagnoses or notes\n\nProvide a complete transcription of everything visible in the document. Format it clearly and preserve the structure.',
              },
            ],
          },
        ],
      }),
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const text = responseBody.content[0].text;

    console.log(`Claude Vision extracted ${text.length} characters`);
    return text;
  } catch (error) {
    console.error('Vision extraction error:', error);
    throw new Error('Failed to extract text with vision AI');
  }
}

async function checkForDuplicate(contentHash: string): Promise<any | null> {
  try {
    // Query Lambda to check if document with this hash exists
    const command = new InvokeCommand({
      FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME || 'lazarus-vector-search',
      Payload: JSON.stringify({
        apiPath: '/check-duplicate',
        httpMethod: 'POST',
        parameters: [
          { name: 'content_hash', value: contentHash },
        ],
      }),
    });

    const response = await lambda.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    
    if (payload.response && payload.response.httpStatusCode === 200) {
      const responseBody = JSON.parse(payload.response.responseBody['application/json'].body);
      return responseBody.exists ? responseBody.document : null;
    }
    
    return null;
  } catch (error) {
    console.error('Duplicate check error:', error);
    // If check fails, continue with upload (better to have duplicate than fail)
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadataStr = formData.get('metadata') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const metadata = metadataStr ? JSON.parse(metadataStr) : {};

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Extract text based on file type
    let content: string;
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    console.log(`Processing file: ${file.name}, type: ${fileType}, size: ${buffer.length}`);
    
    // Determine extraction method based on file type
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      console.log('Attempting PDF text extraction...');
      try {
        content = await extractTextFromPDF(buffer);
        
        // If PDF extraction yields very little text, it might be a scanned PDF
        if (content.trim().length < 100) {
          console.log('PDF has minimal text, trying Textract OCR...');
          content = await extractTextWithTextract(buffer);
        }
      } catch (error) {
        console.log('PDF extraction failed, falling back to Textract...');
        content = await extractTextWithTextract(buffer);
      }
    } else if (fileType.startsWith('image/') || 
               fileName.match(/\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/)) {
      // Images - use Claude Vision for best results
      console.log('Image detected, using Claude Vision...');
      const mimeType = fileType || 'image/png';
      content = await extractTextWithVision(buffer, mimeType);
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      // Plain text files
      content = buffer.toString('utf-8');
    } else {
      // Unknown file type - try Textract as fallback
      console.log('Unknown file type, attempting Textract...');
      try {
        content = await extractTextWithTextract(buffer);
      } catch (error) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Unsupported file type: ${fileType}. Please upload PDF, image, or text files.` 
          },
          { status: 400 }
        );
      }
    }

    console.log(`Extracted ${content.length} characters of text`);

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'No text content could be extracted from the file' },
        { status: 400 }
      );
    }

    // Calculate content hash for duplicate detection
    const contentHash = calculateHash(content);
    console.log(`Content hash: ${contentHash}`);

    // Check for duplicate
    const existingDoc = await checkForDuplicate(contentHash);
    if (existingDoc) {
      console.log(`Duplicate found: ${existingDoc.id}`);
      return NextResponse.json({
        success: true,
        documentId: existingDoc.id,
        s3Key: existingDoc.s3_key,
        duplicate: true,
        message: 'This document has already been uploaded',
      });
    }

    // Generate S3 key
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const s3Key = `documents/${timestamp}-${file.name}`;

    // Upload to S3
    const bucketName = process.env.AWS_S3_BUCKET || 'project-lazarus-medical-docs-677625843326';
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: file.type,
        Metadata: {
          documentType: metadata.documentType || 'other',
          provider: metadata.provider || '',
          date: metadata.date || '',
        },
      })
    );

    // Store in database with chunking for large documents
    // For documents with 100+ pages (or 100,000+ characters), we'll chunk them
    const chunkSize = 10000; // 10,000 characters per chunk (roughly 5-7 pages)
    const chunks: string[] = [];
    
    if (content.length > chunkSize) {
      // Split into overlapping chunks for better context
      const overlapSize = 500; // 500 character overlap between chunks
      for (let i = 0; i < content.length; i += (chunkSize - overlapSize)) {
        const chunk = content.substring(i, Math.min(i + chunkSize, content.length));
        if (chunk.trim().length > 100) { // Only add non-empty chunks
          chunks.push(chunk);
        }
      }
      console.log(`Split document into ${chunks.length} chunks`);
    } else {
      chunks.push(content);
    }
    
    // Store each chunk as a separate document with chunk metadata
    const lambdaPayload = {
      apiPath: '/store-chunked',
      httpMethod: 'POST',
      parameters: [
        { name: 's3_key', value: s3Key },
        { name: 'chunks', value: JSON.stringify(chunks) },
        {
          name: 'metadata',
          value: JSON.stringify({
            ...metadata,
            filename: file.name,
            uploadedAt: new Date().toISOString(),
            contentHash: contentHash,
            fileSize: buffer.length,
            fullContentLength: content.length,
            totalChunks: chunks.length,
          }),
        },
      ],
    };

    const command = new InvokeCommand({
      FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME || 'lazarus-vector-search',
      Payload: JSON.stringify(lambdaPayload),
    });

    const response = await lambda.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    const lambdaResponse = payload.response;
    const responseBody = JSON.parse(
      lambdaResponse.responseBody['application/json'].body
    );

    if (responseBody.success) {
      return NextResponse.json({
        success: true,
        documentId: responseBody.document_id,
        s3Key: responseBody.s3_key,
      });
    } else {
      throw new Error(responseBody.error || 'Failed to store document');
    }
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
