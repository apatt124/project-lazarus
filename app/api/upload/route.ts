import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import pdf from 'pdf-parse';
import crypto from 'crypto';
import AdmZip from 'adm-zip';

const s3 = new S3Client({
  region: process.env.LAZARUS_AWS_REGION || 'us-east-1',
});

const lambda = new LambdaClient({
  region: process.env.LAZARUS_AWS_REGION || 'us-east-1',
});

const textract = new TextractClient({
  region: process.env.LAZARUS_AWS_REGION || 'us-east-1',
});

const bedrock = new BedrockRuntimeClient({
  region: process.env.LAZARUS_AWS_REGION || 'us-east-1',
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
      FunctionName: process.env.LAZARUS_LAMBDA_FUNCTION || 'lazarus-vector-search',
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

async function processFile(
  fileName: string,
  buffer: Buffer,
  fileType: string,
  metadata: any
): Promise<{ success: boolean; documentId?: string; s3Key?: string; error?: string; duplicate?: boolean }> {
  try {
    
    // Extract text based on file type
    let content: string;
    const lowerFileName = fileName.toLowerCase();
    const lowerFileType = fileType.toLowerCase();
    
    console.log(`Processing file: ${fileName}, type: ${fileType}, size: ${buffer.length}`);
    
    // Determine extraction method based on file type
    if (lowerFileType === 'application/pdf' || lowerFileName.endsWith('.pdf')) {
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
    } else if (lowerFileType.startsWith('image/') || 
               lowerFileName.match(/\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/)) {
      // Images - use Claude Vision for best results
      console.log('Image detected, using Claude Vision...');
      const mimeType = lowerFileType || 'image/png';
      content = await extractTextWithVision(buffer, mimeType);
    } else if (lowerFileType === 'text/plain' || lowerFileName.endsWith('.txt')) {
      // Plain text files
      content = buffer.toString('utf-8');
    } else {
      // Unknown file type - try Textract as fallback
      console.log('Unknown file type, attempting Textract...');
      try {
        content = await extractTextWithTextract(buffer);
      } catch (error) {
        return {
          success: false,
          error: `Unsupported file type: ${fileType}. Please upload PDF, image, or text files.`
        };
      }
    }

    console.log(`Extracted ${content.length} characters of text`);

    if (!content || content.trim().length === 0) {
      return {
        success: false,
        error: 'No text content could be extracted from the file'
      };
    }

    // Calculate content hash for duplicate detection
    const contentHash = calculateHash(content);
    console.log(`Content hash: ${contentHash}`);

    // Check for duplicate
    const existingDoc = await checkForDuplicate(contentHash);
    if (existingDoc) {
      console.log(`Duplicate found: ${existingDoc.id}`);
      return {
        success: true,
        documentId: existingDoc.id,
        s3Key: existingDoc.s3_key,
        duplicate: true,
      };
    }

    // Generate S3 key
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const s3Key = `documents/${timestamp}-${fileName}`;

    // Upload to S3
    const bucketName = process.env.LAZARUS_S3_BUCKET;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: fileType,
        Metadata: {
          documentType: metadata.documentType || 'other',
          provider: metadata.provider || '',
          date: metadata.date || '',
        },
      })
    );

    // Store in database with chunking for large documents
    const chunkSize = 10000;
    const chunks: string[] = [];
    
    if (content.length > chunkSize) {
      const overlapSize = 500;
      for (let i = 0; i < content.length; i += (chunkSize - overlapSize)) {
        const chunk = content.substring(i, Math.min(i + chunkSize, content.length));
        if (chunk.trim().length > 100) {
          chunks.push(chunk);
        }
      }
      console.log(`Split document into ${chunks.length} chunks`);
    } else {
      chunks.push(content);
    }
    
    // Store each chunk
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
            filename: fileName,
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
      FunctionName: process.env.LAZARUS_LAMBDA_FUNCTION || 'lazarus-vector-search',
      Payload: JSON.stringify(lambdaPayload),
    });

    const response = await lambda.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    const lambdaResponse = payload.response;
    const responseBody = JSON.parse(
      lambdaResponse.responseBody['application/json'].body
    );

    if (responseBody.success) {
      return {
        success: true,
        documentId: responseBody.document_id,
        s3Key: responseBody.s3_key,
      };
    } else {
      throw new Error(responseBody.error || 'Failed to store document');
    }
  } catch (error) {
    console.error('File processing error:', error);
    return {
      success: false,
      error: String(error)
    };
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
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Check if it's a zip file
    const isZip = file.type === 'application/zip' || 
                  file.type === 'application/x-zip-compressed' ||
                  file.name.toLowerCase().endsWith('.zip');
    
    if (isZip) {
      console.log('Processing ZIP file...');
      
      try {
        const zip = new AdmZip(buffer);
        const zipEntries = zip.getEntries();
        
        const results: any[] = [];
        let successCount = 0;
        let errorCount = 0;
        let duplicateCount = 0;
        
        for (const entry of zipEntries) {
          // Skip directories and hidden files
          if (entry.isDirectory || entry.entryName.startsWith('__MACOSX') || entry.name.startsWith('.')) {
            continue;
          }
          
          console.log(`Processing: ${entry.entryName}`);
          
          // Get file buffer
          const fileBuffer = entry.getData();
          
          // Determine file type from extension
          const fileName = entry.name;
          let fileType = 'application/octet-stream';
          
          if (fileName.endsWith('.pdf')) fileType = 'application/pdf';
          else if (fileName.endsWith('.txt')) fileType = 'text/plain';
          else if (fileName.match(/\.(jpg|jpeg)$/i)) fileType = 'image/jpeg';
          else if (fileName.endsWith('.png')) fileType = 'image/png';
          else if (fileName.endsWith('.gif')) fileType = 'image/gif';
          else if (fileName.endsWith('.bmp')) fileType = 'image/bmp';
          else if (fileName.match(/\.(tiff|tif)$/i)) fileType = 'image/tiff';
          else if (fileName.endsWith('.webp')) fileType = 'image/webp';
          
          // Process the file
          const result = await processFile(fileName, fileBuffer, fileType, metadata);
          
          if (result.success) {
            if (result.duplicate) {
              duplicateCount++;
            } else {
              successCount++;
            }
          } else {
            errorCount++;
          }
          
          results.push({
            fileName: entry.entryName,
            ...result
          });
        }
        
        console.log(`ZIP processing complete: ${successCount} uploaded, ${duplicateCount} duplicates, ${errorCount} errors`);
        
        return NextResponse.json({
          success: true,
          isZip: true,
          totalFiles: results.length,
          successCount,
          duplicateCount,
          errorCount,
          results,
        });
        
      } catch (zipError) {
        console.error('ZIP extraction error:', zipError);
        return NextResponse.json(
          { success: false, error: `Failed to extract ZIP file: ${zipError}` },
          { status: 400 }
        );
      }
    }
    
    // Single file processing (existing logic)
    const result = await processFile(file.name, buffer, file.type, metadata);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        documentId: result.documentId,
        s3Key: result.s3Key,
        duplicate: result.duplicate,
        message: result.duplicate ? 'This document has already been uploaded' : undefined,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
