// Project Lazarus - Memory Management
// Handles memory creation, search, and retrieval for cross-conversation learning

import { generateEmbedding } from './embeddings';
import { 
  createMemory, 
  searchMemories, 
  updateMemoryUsage,
  createUserFact,
  getUserFacts 
} from './database';
import type { 
  MemoryEmbedding, 
  MemoryType, 
  MemoryCategory,
  UserFact,
  FactType,
  SourceType,
  MessageIntent 
} from './types';

/**
 * Creates a memory from a learning with embedding
 */
export async function createMemoryFromLearning(
  content: string,
  memoryType: MemoryType,
  category: MemoryCategory,
  conversationId: string,
  messageId: string
): Promise<MemoryEmbedding> {
  try {
    // Generate embedding for the learning
    const embedding = await generateEmbedding(content);

    // Create memory in database
    const memory = await createMemory({
      content,
      embedding,
      memory_type: memoryType,
      category,
      source_conversation_id: conversationId,
      source_message_id: messageId,
      extracted_at: new Date(),
      model_version: 'titan-embed-text-v1',
      is_active: true,
      relevance_score: 1.0, // Initial relevance
      usage_count: 0,
      metadata: {
        created_by: 'learning_extractor',
        extraction_timestamp: new Date().toISOString(),
      }
    });

    console.log(`Created memory: ${memory.id} (${memoryType})`);
    return memory;
  } catch (error) {
    console.error('Error creating memory:', error);
    throw error;
  }
}

/**
 * Searches for relevant memories based on a query
 */
export async function searchRelevantMemories(
  query: string,
  intent: MessageIntent,
  limit: number = 10,
  threshold: number = 0.7
): Promise<MemoryEmbedding[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Determine which memory types to search based on intent
    let memoryTypes: string[] | undefined;
    if (intent === 'medical') {
      memoryTypes = ['instruction', 'preference', 'learning', 'correction'];
    } else if (intent === 'conversation') {
      memoryTypes = ['preference', 'instruction'];
    }
    // For research and general, search all types

    // Search memories
    const memories = await searchMemories(
      queryEmbedding,
      memoryTypes,
      threshold,
      limit,
      true // Only active memories
    );

    // Update usage count for retrieved memories
    await Promise.all(
      memories.map(memory => updateMemoryUsage(memory.id))
    );

    console.log(`Found ${memories.length} relevant memories for query`);
    return memories;
  } catch (error) {
    console.error('Error searching memories:', error);
    return []; // Return empty array on error, don't fail the whole request
  }
}

/**
 * Extracts and saves learnings from a conversation
 */
export async function extractAndSaveLearnings(
  userQuery: string,
  assistantResponse: string,
  intent: MessageIntent,
  conversationId: string,
  messageId: string
): Promise<number> {
  let savedCount = 0;

  try {
    // Extract user preferences
    const preferencePatterns = [
      { pattern: /i prefer/i, type: 'preference' as MemoryType },
      { pattern: /i like/i, type: 'preference' as MemoryType },
      { pattern: /i don't like/i, type: 'preference' as MemoryType },
      { pattern: /i want/i, type: 'preference' as MemoryType },
      { pattern: /i need/i, type: 'preference' as MemoryType },
    ];

    for (const { pattern, type } of preferencePatterns) {
      if (pattern.test(userQuery)) {
        await createMemoryFromLearning(
          `User preference: ${userQuery}`,
          type,
          intent === 'medical' ? 'medical' : 'general',
          conversationId,
          messageId
        );
        savedCount++;
        break; // Only save once per query
      }
    }

    // Extract corrections
    const correctionPatterns = [
      /that's (not|wrong|incorrect)/i,
      /actually/i,
      /no,/i,
      /correction:/i,
    ];

    for (const pattern of correctionPatterns) {
      if (pattern.test(userQuery)) {
        await createMemoryFromLearning(
          `User correction: ${userQuery}`,
          'correction',
          intent === 'medical' ? 'medical' : 'general',
          conversationId,
          messageId
        );
        savedCount++;
        break;
      }
    }

    // Extract instructions
    const instructionPatterns = [
      /always/i,
      /never/i,
      /from now on/i,
      /remember to/i,
      /make sure/i,
      /please (always|never)/i,
    ];

    for (const pattern of instructionPatterns) {
      if (pattern.test(userQuery)) {
        await createMemoryFromLearning(
          `User instruction: ${userQuery}`,
          'instruction',
          intent === 'medical' ? 'medical' : 'behavioral',
          conversationId,
          messageId
        );
        savedCount++;
        break;
      }
    }

    // Extract general learnings from medical queries
    if (intent === 'medical' && userQuery.length > 20) {
      // Save significant medical queries as learnings
      const medicalKeywords = [
        'diagnosis', 'symptom', 'medication', 'treatment', 'procedure',
        'test', 'result', 'condition', 'disease', 'surgery'
      ];

      const hasMedicalKeyword = medicalKeywords.some(keyword =>
        userQuery.toLowerCase().includes(keyword)
      );

      if (hasMedicalKeyword) {
        await createMemoryFromLearning(
          `Medical query context: ${userQuery}`,
          'learning',
          'medical',
          conversationId,
          messageId
        );
        savedCount++;
      }
    }

    console.log(`Extracted and saved ${savedCount} learnings`);
    return savedCount;
  } catch (error) {
    console.error('Error extracting learnings:', error);
    return savedCount;
  }
}

/**
 * Extracts structured facts from medical documents
 */
export async function extractFactsFromDocument(
  documentContent: string,
  documentId: string,
  conversationId?: string,
  messageId?: string
): Promise<number> {
  let savedCount = 0;

  try {
    const facts: Array<{
      type: FactType;
      content: string;
      confidence: number;
    }> = [];

    // Extract allergies
    const allergyPatterns = [
      /allerg(?:y|ies|ic) to:?\s*([^.\n]+)/gi,
      /allergic reaction to\s+([^.\n]+)/gi,
      /known allergies?:?\s*([^.\n]+)/gi,
    ];

    for (const pattern of allergyPatterns) {
      const matches = documentContent.matchAll(pattern);
      for (const match of matches) {
        facts.push({
          type: 'allergy',
          content: match[1].trim(),
          confidence: 0.9,
        });
      }
    }

    // Extract medications
    const medicationPatterns = [
      /(?:taking|prescribed|medication):?\s*([^.\n]+(?:mg|ml|units))/gi,
      /current medications?:?\s*([^.\n]+)/gi,
    ];

    for (const pattern of medicationPatterns) {
      const matches = documentContent.matchAll(pattern);
      for (const match of matches) {
        facts.push({
          type: 'medication',
          content: match[1].trim(),
          confidence: 0.85,
        });
      }
    }

    // Extract conditions
    const conditionPatterns = [
      /diagnos(?:is|ed with):?\s*([^.\n]+)/gi,
      /medical condition:?\s*([^.\n]+)/gi,
      /history of\s+([^.\n]+)/gi,
    ];

    for (const pattern of conditionPatterns) {
      const matches = documentContent.matchAll(pattern);
      for (const match of matches) {
        facts.push({
          type: 'medical_condition',
          content: match[1].trim(),
          confidence: 0.8,
        });
      }
    }

    // Extract procedures
    const procedurePatterns = [
      /(?:underwent|procedure|surgery):?\s*([^.\n]+)/gi,
      /surgical history:?\s*([^.\n]+)/gi,
    ];

    for (const pattern of procedurePatterns) {
      const matches = documentContent.matchAll(pattern);
      for (const match of matches) {
        facts.push({
          type: 'procedure',
          content: match[1].trim(),
          confidence: 0.85,
        });
      }
    }

    // Save facts to database
    for (const fact of facts) {
      try {
        await createUserFact({
          fact_type: fact.type,
          content: fact.content,
          confidence: fact.confidence,
          source_type: 'medical_record',
          source_document_id: documentId,
          source_conversation_id: conversationId,
          source_message_id: messageId,
          fact_date: new Date(),
          valid_from: new Date(),
          verified_by: 'automated_extraction',
          metadata: {
            extraction_method: 'pattern_matching',
            document_id: documentId,
          }
        });
        savedCount++;
      } catch (error) {
        console.error('Error saving fact:', error);
      }
    }

    console.log(`Extracted ${savedCount} facts from document`);
    return savedCount;
  } catch (error) {
    console.error('Error extracting facts:', error);
    return savedCount;
  }
}

/**
 * Gets relevant user facts for a query
 */
export async function getRelevantFacts(
  intent: MessageIntent,
  factTypes?: FactType[]
): Promise<UserFact[]> {
  try {
    // Determine which fact types to retrieve based on intent
    let types = factTypes;
    if (!types && intent === 'medical') {
      types = ['medical_condition', 'allergy', 'medication', 'procedure'];
    }

    const facts = await getUserFacts(types, true); // Only valid facts
    console.log(`Retrieved ${facts.length} relevant facts`);
    return facts;
  } catch (error) {
    console.error('Error getting relevant facts:', error);
    return [];
  }
}

/**
 * Formats memories for inclusion in context
 */
export function formatMemoriesForContext(memories: MemoryEmbedding[]): string {
  if (memories.length === 0) {
    return '';
  }

  let context = 'RELEVANT MEMORIES FROM PAST CONVERSATIONS:\n';
  
  memories.forEach((memory, index) => {
    const typeEmoji = {
      instruction: '📋',
      preference: '⭐',
      learning: '💡',
      correction: '✏️',
    }[memory.memory_type] || '📝';

    context += `${index + 1}. ${typeEmoji} ${memory.content}\n`;
    context += `   (${memory.memory_type}, relevance: ${(memory.relevance_score * 100).toFixed(0)}%, used ${memory.usage_count} times)\n`;
  });

  return context + '\n';
}

/**
 * Formats user facts for inclusion in context
 */
export function formatFactsForContext(facts: UserFact[]): string {
  if (facts.length === 0) {
    return '';
  }

  let context = 'KNOWN USER FACTS:\n';

  // Group facts by type
  const factsByType: Record<string, UserFact[]> = {};
  facts.forEach(fact => {
    if (!factsByType[fact.fact_type]) {
      factsByType[fact.fact_type] = [];
    }
    factsByType[fact.fact_type].push(fact);
  });

  // Format each type
  for (const [type, typeFacts] of Object.entries(factsByType)) {
    const typeLabel = type.replace(/_/g, ' ').toUpperCase();
    context += `\n${typeLabel}:\n`;
    typeFacts.forEach(fact => {
      const confidenceIcon = fact.confidence >= 0.9 ? '✓✓' : fact.confidence >= 0.7 ? '✓' : '?';
      context += `  ${confidenceIcon} ${fact.content}\n`;
    });
  }

  return context + '\n';
}
