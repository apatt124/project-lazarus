import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { 
  classifyIntent, 
  getSearchThreshold, 
  getSearchLimit, 
  hasComprehensiveKeywords 
} from '@/lib/intent-classifier';
import { 
  buildSystemPrompt, 
  buildUserMessage 
} from '@/lib/prompts';
import {
  searchRelevantMemories,
  extractAndSaveLearnings,
  getRelevantFacts,
  formatMemoriesForContext,
  formatFactsForContext
} from '@/lib/memory';
import { 
  calculateConfidence, 
  validateSource 
} from '@/lib/source-validator';
import {
  createConversation,
  getConversation,
  createMessage,
  getConversationMessages,
  createMemory,
  searchMemories
} from '@/lib/database';
import type { ChatRequest, ChatResponse, Source } from '@/lib/types';

const lambda = new LambdaClient({
  region: process.env.LAZARUS_AWS_REGION || 'us-east-1',
});

const bedrock = new BedrockRuntimeClient({
  region: process.env.LAZARUS_AWS_REGION || 'us-east-1',
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: ChatRequest = await request.json();
    const { query, conversation_id, include_memory = true } = body;

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    // Step 1: Classify intent
    const intentClassification = classifyIntent(query);
    console.log('Intent classification:', intentClassification);

    // Step 2: Get or create conversation
    let conversationId = conversation_id;
    if (!conversationId) {
      // Create new conversation with title from first query
      const title = query.length > 50 ? query.substring(0, 47) + '...' : query;
      const conversation = await createConversation(title);
      conversationId = conversation.id;
      console.log('Created new conversation:', conversationId);
    } else {
      // Verify conversation exists
      const conversation = await getConversation(conversationId);
      if (!conversation) {
        return NextResponse.json(
          { success: false, error: 'Conversation not found' },
          { status: 404 }
        );
      }
    }

    // Step 3: Save user message
    await createMessage({
      conversation_id: conversationId,
      role: 'user',
      content: query,
      intent: intentClassification.primary,
      confidence_score: intentClassification.confidence,
      confidence_reasoning: intentClassification.reasoning,
      model_version: 'claude-sonnet-4-20250514',
    });

    // Step 4: Load context based on intent
    let medicalDocuments: any[] = [];
    let webSources: any[] = [];
    let memories: any[] = [];
    let userFacts: any[] = [];

    // Load medical documents if needed
    if (intentClassification.needsMedicalContext) {
      const threshold = getSearchThreshold(intentClassification.primary);
      const limit = getSearchLimit(
        intentClassification.primary, 
        hasComprehensiveKeywords(query)
      );
      
      console.log(`Searching medical documents: limit=${limit}, threshold=${threshold}`);
      medicalDocuments = await searchMedicalDocuments(query, limit, threshold);
      console.log(`Found ${medicalDocuments.length} medical documents`);
    }

    // Load memories if enabled
    if (include_memory) {
      try {
        memories = await searchRelevantMemories(
          query,
          intentClassification.primary,
          10, // Limit to 10 most relevant memories
          0.7 // 70% similarity threshold
        );
        console.log(`Found ${memories.length} relevant memories`);
      } catch (error) {
        console.error('Memory search error:', error);
        // Continue without memories if search fails
      }
    }

    // Load user facts for medical queries
    if (intentClassification.primary === 'medical') {
      try {
        userFacts = await getRelevantFacts(intentClassification.primary);
        console.log(`Found ${userFacts.length} relevant user facts`);
      } catch (error) {
        console.error('User facts retrieval error:', error);
        // Continue without facts if retrieval fails
      }
    }

    // TODO: Load web sources if needed
    // if (intentClassification.needsWebSearch) {
    //   webSources = await searchWeb(query);
    // }

    // Step 5: Build dynamic system prompt
    const systemPrompt = buildSystemPrompt(
      intentClassification.primary,
      medicalDocuments.length > 0,
      webSources.length > 0,
      medicalDocuments.length + webSources.length
    );

    // Step 6: Build user message with context
    const userMessage = buildUserMessage(
      query,
      medicalDocuments,
      webSources,
      memories
    );

    // Add user facts to context if available
    let fullUserMessage = userMessage;
    if (userFacts.length > 0) {
      const factsContext = formatFactsForContext(userFacts);
      fullUserMessage = factsContext + userMessage;
    }

    // Add memories to context if available
    if (memories.length > 0) {
      const memoriesContext = formatMemoriesForContext(memories);
      fullUserMessage = memoriesContext + fullUserMessage;
    }

    // Step 7: Generate AI response
    console.log('Generating AI response...');
    const aiResponse = await generateAIResponse(systemPrompt, fullUserMessage);
    console.log(`Generated response: ${aiResponse.length} characters`);

    // Step 8: Validate and classify sources
    const sources: Source[] = medicalDocuments.map(doc => 
      validateSource({
        tier: 1, // Medical records are always Tier 1
        content: doc.content.substring(0, 500),
        documentId: doc.id,
        confidence: doc.similarity || 0.9,
      })
    );

    // Add web sources (when implemented)
    // webSources.forEach(source => {
    //   sources.push(validateSource(source));
    // });

    // Step 9: Calculate confidence score
    const confidenceScore = calculateConfidence(sources);
    console.log('Confidence score:', confidenceScore);

    // Step 10: Save assistant message
    const processingTime = Date.now() - startTime;
    const assistantMessage = await createMessage({
      conversation_id: conversationId,
      role: 'assistant',
      content: aiResponse,
      intent: intentClassification.primary,
      confidence_score: confidenceScore.overall,
      confidence_reasoning: confidenceScore.reasoning,
      sources,
      medical_document_ids: medicalDocuments.map(d => d.id),
      web_sources: webSources,
      model_version: 'claude-sonnet-4-20250514',
      tokens_input: Math.floor(userMessage.length / 4), // Rough estimate
      tokens_output: Math.floor(aiResponse.length / 4), // Rough estimate
      processing_time_ms: processingTime,
      metadata: {
        intent_classification: intentClassification,
        source_breakdown: confidenceScore.sourceBreakdown,
        has_conflicts: confidenceScore.hasConflicts,
        warnings: confidenceScore.warnings,
      }
    });

    // Step 11: Extract learnings for memory system
    try {
      const learningsCount = await extractAndSaveLearnings(
        query,
        aiResponse,
        intentClassification.primary,
        conversationId,
        assistantMessage.id
      );
      console.log(`Extracted and saved ${learningsCount} learnings`);
    } catch (error) {
      console.error('Learning extraction error:', error);
      // Continue even if learning extraction fails
    }

    // Step 12: Build response
    const response: ChatResponse = {
      success: true,
      answer: aiResponse,
      message_id: assistantMessage.id,
      conversation_id: conversationId,
      intent: intentClassification.primary,
      confidence: {
        overall: confidenceScore.overall,
        reasoning: confidenceScore.reasoning,
      },
      sources,
      source_quality: {
        tier1: confidenceScore.sourceBreakdown.tier1Count,
        tier2: confidenceScore.sourceBreakdown.tier2Count,
        tier3: confidenceScore.sourceBreakdown.tier3Count,
        tier4Plus: confidenceScore.sourceBreakdown.tier4PlusCount,
      },
      model_version: 'claude-sonnet-4-20250514',
      tokens_input: Math.floor(userMessage.length / 4),
      tokens_output: Math.floor(aiResponse.length / 4),
      processing_time_ms: processingTime,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

/**
 * Search medical documents using Lambda vector search
 */
async function searchMedicalDocuments(
  query: string, 
  limit: number = 50, 
  threshold: number = 0.01
): Promise<any[]> {
  try {
    const command = new InvokeCommand({
      FunctionName: process.env.LAZARUS_LAMBDA_FUNCTION || 'lazarus-vector-search',
      Payload: JSON.stringify({
        apiPath: '/search',
        httpMethod: 'POST',
        parameters: [
          { name: 'query', value: query },
          { name: 'limit', value: String(limit) },
          { name: 'threshold', value: String(threshold) },
        ],
      }),
    });

    const response = await lambda.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    const lambdaResponse = payload.response;
    const responseBody = JSON.parse(
      lambdaResponse.responseBody['application/json'].body
    );

    return responseBody.success ? responseBody.results : [];
  } catch (error) {
    console.error('Medical document search error:', error);
    return [];
  }
}

/**
 * Generate AI response using Claude via Bedrock
 */
async function generateAIResponse(
  systemPrompt: string, 
  userMessage: string
): Promise<string> {
  try {
    const command = new InvokeModelCommand({
      modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 8000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      }),
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.content[0].text;
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error(`Failed to generate AI response: ${error}`);
  }
}
