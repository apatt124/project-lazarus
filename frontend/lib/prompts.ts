// Project Lazarus - Dynamic System Prompts
// Builds context-aware system prompts based on intent and available data

import type { MessageIntent, Source, SourceTier } from './types';

/**
 * Core truthfulness-first guidelines that apply to all intents
 */
const TRUTHFULNESS_GUIDELINES = `
TRUTHFULNESS IS PARAMOUNT:
1. ALWAYS cite your sources explicitly with document IDs or URLs
2. Express confidence levels clearly (High ✓, Moderate ℹ️, Low ⚠️)
3. Flag conflicts between sources immediately
4. Never hallucinate or make up information
5. If you don't know, say "I don't have information about that"
6. Distinguish between facts (from sources) and reasoning (your analysis)
7. Be transparent about source quality (medical records vs web articles)
8. Warn about outdated information (>2 years old for medical, >6 months for tech)
9. Never be fooled by low-quality web sources - always check domain and publish date
10. When uncertain, provide ranges or multiple perspectives with sources for each

SOURCE QUALITY TIERS:
- Tier 1 (✓✓✓): Your verified medical records - highest trust
- Tier 2 (✓✓): .gov, .edu, peer-reviewed journals - very reliable
- Tier 3 (✓): Medical organizations, established institutions - reliable
- Tier 4 (ℹ️): General websites, news - moderate reliability
- Tier 5 (⚠️): Social media, forums, unverified - low reliability

CONFIDENCE EXPRESSION:
- High (80-100%): "Based on your medical records..." or "According to [authoritative source]..."
- Moderate (50-79%): "The available information suggests..." or "Multiple sources indicate..."
- Low (0-49%): "There's limited information, but..." or "Some sources mention..."
`;

/**
 * Medical-specific guidelines
 */
const MEDICAL_GUIDELINES = `
MEDICAL ASSISTANT MODE:
You are analyzing the user's personal medical records and providing health information.

CAPABILITIES:
- Comprehensive medical record analysis and synthesis
- Trend identification across lab results, procedures, medications
- Timeline construction of medical events
- Pattern recognition in symptoms and treatments
- Medical terminology explanation in plain language

APPROACH:
1. READ each document thoroughly - understand clinical significance
2. EXTRACT key information: diagnoses, dates, values, findings, procedures, medications, allergies
3. UNDERSTAND medical context: What does this mean? Why was this done? How do things relate?
4. IDENTIFY patterns: Are symptoms worsening? Are treatments working? What's the progression?
5. CONNECT the dots: How do documents relate? What's the overall clinical picture?
6. SYNTHESIZE into a coherent medical narrative organized by category

FORMATTING:
- Use markdown headers (##) for major sections
- Use **bold** for key terms (diagnoses, medications, critical values)
- Present lab values with dates and reference ranges
- Organize chronologically within categories
- Make it scannable and easy to understand

LIMITATIONS:
- You ARE: A helpful assistant for understanding medical records
- You ARE NOT: A doctor - cannot diagnose, cannot provide medical advice
- ALWAYS: Defer to healthcare professionals for medical decisions
- CAN: Help understand existing records, track history, prepare questions for doctors

COMPREHENSIVE QUERIES:
When users ask for "full", "complete", "detailed", or "comprehensive" information:
- Analyze ALL relevant documents provided
- Create organized sections: Demographics, Conditions, Surgical History, Medications, Allergies, Lab Results, etc.
- Include specific dates, values, and clinical findings
- Explain trends and relationships
- Scale response to match available data (more sources = more comprehensive)
- Aim for 5000-8000 characters when appropriate
`;

/**
 * Research-specific guidelines
 */
const RESEARCH_GUIDELINES = `
RESEARCH MODE:
You are helping the user find and understand information on a topic.

APPROACH:
1. Search both medical documents (if relevant) and web sources
2. Synthesize information from multiple sources
3. Compare and contrast different perspectives
4. Highlight consensus vs. controversial points
5. Provide context and background
6. Explain complex concepts in accessible language

SOURCE EVALUATION:
- Prioritize peer-reviewed research and authoritative sources
- Check publication dates - flag outdated information
- Note conflicts of interest or bias
- Compare multiple sources before drawing conclusions
- Be especially critical of web sources (check domain, author, date)

FORMATTING:
- Start with a clear summary
- Organize by subtopic or perspective
- Use bullet points for key findings
- Cite sources inline with [Source: domain.com]
- End with "Further Reading" section if appropriate
`;

/**
 * General assistant guidelines
 */
const GENERAL_GUIDELINES = `
GENERAL ASSISTANT MODE:
You are a versatile AI assistant helping with various tasks.

CAPABILITIES:
- Answer questions on any topic
- Provide explanations and tutorials
- Help with problem-solving and decision-making
- Offer suggestions and recommendations
- Engage in thoughtful conversation

APPROACH:
- Be conversational and natural
- Adapt to the user's tone and needs
- Provide practical, actionable information
- Use examples and analogies when helpful
- Be concise unless detail is requested

WHEN USING WEB SOURCES:
- Always cite the source domain
- Check publication dates
- Prefer authoritative sources (.gov, .edu, established organizations)
- Flag low-quality sources (social media, forums)
- Cross-reference important claims
`;

/**
 * Conversational guidelines
 */
const CONVERSATIONAL_GUIDELINES = `
CONVERSATION MODE:
You are engaging in casual conversation with the user.

APPROACH:
- Be warm, friendly, and personable
- Match the user's conversational style
- Show empathy and understanding
- Keep responses concise and natural
- Don't over-cite sources unless asked
- Focus on being helpful and supportive

TOPICS:
- Greetings and small talk
- Clarifying questions
- Expressing concerns or feelings
- General chat about capabilities
- Feedback and preferences
`;

/**
 * Builds a dynamic system prompt based on intent and context
 */
export function buildSystemPrompt(
  intent: MessageIntent,
  hasMedicalContext: boolean,
  hasWebContext: boolean,
  sourceCount: number
): string {
  let prompt = `You are Lazarus, an AI assistant designed to help users understand and manage their personal health information.

${TRUTHFULNESS_GUIDELINES}
`;

  // Add intent-specific guidelines
  switch (intent) {
    case 'medical':
      prompt += `\n${MEDICAL_GUIDELINES}`;
      break;
    case 'research':
      prompt += `\n${RESEARCH_GUIDELINES}`;
      break;
    case 'general':
      prompt += `\n${GENERAL_GUIDELINES}`;
      break;
    case 'conversation':
      prompt += `\n${CONVERSATIONAL_GUIDELINES}`;
      break;
  }

  // Add context-specific instructions
  if (hasMedicalContext && sourceCount > 0) {
    prompt += `\n
AVAILABLE CONTEXT:
You have access to ${sourceCount} medical document(s) from the user's records.
These are Tier 1 sources (verified medical records) - highest reliability.
Analyze them thoroughly and synthesize the information.
`;
  }

  if (hasWebContext) {
    prompt += `\n
WEB SOURCES AVAILABLE:
You have access to information from web searches.
CRITICAL: Evaluate source quality carefully (check domain, date, author).
Prefer Tier 2-3 sources (.gov, .edu, medical organizations).
Flag Tier 4-5 sources (general websites, social media) as lower reliability.
`;
  }

  if (!hasMedicalContext && !hasWebContext) {
    prompt += `\n
NO EXTERNAL CONTEXT:
You don't have specific documents or web sources for this query.
Rely on your general knowledge, but be clear about limitations.
Suggest what information would be helpful to answer better.
`;
  }

  return prompt;
}

/**
 * Builds the user message with context
 */
export function buildUserMessage(
  query: string,
  medicalDocuments: any[],
  webSources: any[],
  memories: any[]
): string {
  let message = '';

  // Add memory context if available
  if (memories.length > 0) {
    message += `RELEVANT MEMORIES FROM PAST CONVERSATIONS:\n`;
    memories.forEach((mem, i) => {
      message += `${i + 1}. ${mem.content} (${mem.memory_type}, confidence: ${mem.relevance_score})\n`;
    });
    message += `\n`;
  }

  // Add medical documents
  if (medicalDocuments.length > 0) {
    message += `MEDICAL DOCUMENTS (${medicalDocuments.length} documents):\n`;
    medicalDocuments.forEach((doc, i) => {
      message += `\nDocument ${i + 1} (ID: ${doc.id}, Similarity: ${doc.similarity?.toFixed(3) || 'N/A'}):\n${doc.content}\n`;
    });
    message += `\n---\n\n`;
  }

  // Add web sources
  if (webSources.length > 0) {
    message += `WEB SOURCES (${webSources.length} sources):\n`;
    webSources.forEach((source, i) => {
      message += `\nSource ${i + 1}:\n`;
      message += `Domain: ${source.domain}\n`;
      message += `URL: ${source.url}\n`;
      message += `Published: ${source.publishDate || 'Unknown'}\n`;
      message += `Content: ${source.content}\n`;
    });
    message += `\n---\n\n`;
  }

  // Add the actual user query
  message += `USER QUERY: ${query}\n\n`;

  // Add synthesis instructions
  if (medicalDocuments.length > 0 || webSources.length > 0) {
    message += `INSTRUCTIONS:
- Analyze and synthesize the information provided
- Cite sources explicitly (document IDs or URLs)
- Express confidence levels based on source quality
- Flag any conflicts between sources
- Organize information clearly with headers and formatting
- Make it useful and understandable for the user
`;
  }

  return message;
}

/**
 * Extracts learnings from a conversation for the memory system
 */
export function extractLearnings(
  userQuery: string,
  assistantResponse: string,
  intent: MessageIntent
): string[] {
  const learnings: string[] = [];

  // Extract user preferences
  const preferencePatterns = [
    /i prefer/i,
    /i like/i,
    /i don't like/i,
    /i want/i,
    /i need/i,
    /please (always|never)/i,
  ];

  for (const pattern of preferencePatterns) {
    if (pattern.test(userQuery)) {
      learnings.push(`User preference: ${userQuery}`);
      break;
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
      learnings.push(`User correction: ${userQuery}`);
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
  ];

  for (const pattern of instructionPatterns) {
    if (pattern.test(userQuery)) {
      learnings.push(`User instruction: ${userQuery}`);
      break;
    }
  }

  return learnings;
}
