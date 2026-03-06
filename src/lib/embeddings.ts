// Project Lazarus - Embedding Generation
// Generates vector embeddings for queries and learnings using Amazon Bedrock Titan

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Generates a vector embedding for text using Amazon Bedrock Titan Embeddings
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Clean and prepare text
    const cleanText = text.trim().substring(0, 8000); // Titan limit is 8k tokens

    const command = new InvokeModelCommand({
      modelId: 'amazon.titan-embed-text-v1',
      body: JSON.stringify({
        inputText: cleanText,
      }),
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Titan returns 1024-dimensional embeddings
    return responseBody.embedding;
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw new Error(`Failed to generate embedding: ${error}`);
  }
}

/**
 * Generates embeddings for multiple texts in batch
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    // Process in parallel for better performance
    const embeddings = await Promise.all(
      texts.map(text => generateEmbedding(text))
    );
    return embeddings;
  } catch (error) {
    console.error('Batch embedding generation error:', error);
    throw new Error(`Failed to generate batch embeddings: ${error}`);
  }
}

/**
 * Calculates cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same dimension');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Finds the most similar embeddings from a list
 */
export function findMostSimilar(
  queryEmbedding: number[],
  candidateEmbeddings: Array<{ embedding: number[]; data: any }>,
  topK: number = 5
): Array<{ similarity: number; data: any }> {
  const similarities = candidateEmbeddings.map(candidate => ({
    similarity: cosineSimilarity(queryEmbedding, candidate.embedding),
    data: candidate.data,
  }));

  // Sort by similarity descending
  similarities.sort((a, b) => b.similarity - a.similarity);

  // Return top K
  return similarities.slice(0, topK);
}
