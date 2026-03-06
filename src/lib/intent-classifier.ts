// Project Lazarus - Intent Classification
// Detects query intent to load appropriate context and system prompt

import type { IntentClassification, MessageIntent } from './types';

// Keywords for different intent types
const MEDICAL_KEYWORDS = [
  // Direct medical terms
  'medical', 'health', 'diagnosis', 'symptom', 'symptoms', 'condition', 'disease',
  'medication', 'medicine', 'drug', 'prescription', 'treatment', 'therapy',
  'doctor', 'physician', 'hospital', 'clinic', 'appointment', 'visit',
  'surgery', 'procedure', 'operation', 'test', 'lab', 'results', 'report',
  'pain', 'ache', 'hurt', 'discomfort', 'chronic', 'acute',
  
  // Body parts and systems
  'heart', 'lung', 'liver', 'kidney', 'pancreas', 'stomach', 'intestine',
  'brain', 'blood', 'bone', 'muscle', 'skin', 'eye', 'ear',
  
  // Common conditions
  'diabetes', 'hypertension', 'cancer', 'infection', 'inflammation',
  'allergy', 'allergic', 'asthma', 'arthritis', 'migraine',
  
  // Medical record references
  'my records', 'my history', 'my documents', 'my medical',
  'my test', 'my lab', 'my results', 'my diagnosis',
  'what were my', 'show me my', 'find my',
  
  // Specific medical values
  'lipase', 'glucose', 'cholesterol', 'blood pressure', 'heart rate',
  'hemoglobin', 'white blood', 'platelet', 'creatinine',
];

const RESEARCH_KEYWORDS = [
  'research', 'study', 'studies', 'find', 'search', 'look up', 'lookup',
  'what is', 'what are', 'how does', 'how do', 'why does', 'why do',
  'explain', 'tell me about', 'information about', 'learn about',
  'latest', 'recent', 'new', 'current', 'update', 'news',
  'compare', 'difference between', 'versus', 'vs',
  'best', 'recommend', 'suggestion', 'advice',
];

const CONVERSATIONAL_KEYWORDS = [
  'hello', 'hi', 'hey', 'thanks', 'thank you', 'please',
  'how are you', 'what can you do', 'help me', 'i need',
  'feeling', 'think', 'believe', 'opinion', 'worried', 'concerned',
  'anxious', 'scared', 'nervous', 'excited', 'happy', 'sad',
];

// Patterns that strongly indicate medical intent
const MEDICAL_PATTERNS = [
  /\b(my|mine)\s+(medical|health|doctor|hospital|test|lab|result|record|history|condition|diagnosis|medication|prescription|surgery|procedure)\b/i,
  /\b(what|when|where|how)\s+(was|were|is|are)\s+my\s+/i,
  /\b(show|find|get|retrieve|display)\s+(my|me)\s+/i,
  /\b\d+\s*(mg|ml|units|U\/L|mmol|mmHg|bpm)\b/i, // Medical units
  /\b(diagnosed|prescribed|treated|tested|examined)\b/i,
];

// Patterns that indicate research intent
const RESEARCH_PATTERNS = [
  /\b(what|how|why|when|where)\s+(is|are|does|do|can|should|would)\b/i,
  /\b(explain|describe|define|clarify)\b/i,
  /\b(latest|recent|new|current)\s+(research|study|treatment|therapy|drug|medication)\b/i,
];

/**
 * Classifies the intent of a user query
 */
export function classifyIntent(query: string): IntentClassification {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);
  
  // Count keyword matches
  let medicalScore = 0;
  let researchScore = 0;
  let conversationalScore = 0;
  
  // Check keywords
  for (const word of words) {
    if (MEDICAL_KEYWORDS.some(kw => word.includes(kw) || kw.includes(word))) {
      medicalScore += 1;
    }
    if (RESEARCH_KEYWORDS.some(kw => word.includes(kw) || kw.includes(word))) {
      researchScore += 1;
    }
    if (CONVERSATIONAL_KEYWORDS.some(kw => word.includes(kw) || kw.includes(word))) {
      conversationalScore += 1;
    }
  }
  
  // Check patterns (stronger signals)
  for (const pattern of MEDICAL_PATTERNS) {
    if (pattern.test(query)) {
      medicalScore += 3; // Patterns are stronger signals
    }
  }
  
  for (const pattern of RESEARCH_PATTERNS) {
    if (pattern.test(query)) {
      researchScore += 2;
    }
  }
  
  // Normalize scores
  const totalScore = medicalScore + researchScore + conversationalScore;
  const medicalConfidence = totalScore > 0 ? medicalScore / totalScore : 0;
  const researchConfidence = totalScore > 0 ? researchScore / totalScore : 0;
  const conversationalConfidence = totalScore > 0 ? conversationalScore / totalScore : 0;
  
  // Determine primary intent
  let primary: MessageIntent;
  let confidence: number;
  let reasoning: string;
  
  if (medicalScore > researchScore && medicalScore > conversationalScore) {
    primary = 'medical';
    confidence = Math.min(0.95, 0.5 + medicalConfidence * 0.5);
    reasoning = `Medical keywords/patterns detected (score: ${medicalScore})`;
  } else if (researchScore > medicalScore && researchScore > conversationalScore) {
    primary = 'research';
    confidence = Math.min(0.9, 0.5 + researchConfidence * 0.4);
    reasoning = `Research keywords/patterns detected (score: ${researchScore})`;
  } else if (conversationalScore > 0 && totalScore < 3) {
    primary = 'conversation';
    confidence = Math.min(0.85, 0.4 + conversationalConfidence * 0.45);
    reasoning = `Conversational keywords detected (score: ${conversationalScore})`;
  } else {
    // Default to general for ambiguous queries
    primary = 'general';
    confidence = 0.6;
    reasoning = 'No strong intent signals detected, defaulting to general';
  }
  
  // Determine context needs
  const needsMedicalContext = primary === 'medical' || medicalScore > 0;
  const needsWebSearch = primary === 'research' || 
                         (primary === 'general' && researchScore > 0) ||
                         (primary === 'medical' && researchScore > 1); // Medical research
  
  return {
    primary,
    confidence,
    needsMedicalContext,
    needsWebSearch,
    reasoning
  };
}

/**
 * Determines if a query is asking about the user's personal medical information
 */
export function isPersonalMedicalQuery(query: string): boolean {
  const personalPatterns = [
    /\b(my|mine|i|me)\b/i,
    /\b(what|when|where|how)\s+(was|were|is|are)\s+my\b/i,
    /\b(show|find|get|display)\s+(my|me)\b/i,
  ];
  
  return personalPatterns.some(pattern => pattern.test(query));
}

/**
 * Determines if a query is asking for general medical information
 */
export function isGeneralMedicalQuery(query: string): boolean {
  const generalPatterns = [
    /\b(what|how|why)\s+(is|are|does|do)\b/i,
    /\b(explain|describe|tell me about)\b/i,
  ];
  
  const hasMedicalTerms = MEDICAL_KEYWORDS.some(kw => 
    query.toLowerCase().includes(kw)
  );
  
  return hasMedicalTerms && generalPatterns.some(pattern => pattern.test(query));
}

/**
 * Extracts medical terms from a query for better context loading
 */
export function extractMedicalTerms(query: string): string[] {
  const terms: string[] = [];
  const lowerQuery = query.toLowerCase();
  
  for (const keyword of MEDICAL_KEYWORDS) {
    if (lowerQuery.includes(keyword)) {
      terms.push(keyword);
    }
  }
  
  return [...new Set(terms)]; // Remove duplicates
}

/**
 * Determines the appropriate search threshold based on intent
 */
export function getSearchThreshold(intent: MessageIntent): number {
  switch (intent) {
    case 'medical':
      return 0.01; // Very permissive for medical queries
    case 'research':
      return 0.05; // Moderate for research
    case 'general':
      return 0.1; // More restrictive for general
    case 'conversation':
      return 0.2; // Most restrictive for conversation
    default:
      return 0.05;
  }
}

/**
 * Determines the appropriate search limit based on intent
 */
export function getSearchLimit(intent: MessageIntent, hasComprehensiveKeywords: boolean): number {
  if (hasComprehensiveKeywords) {
    return 100; // Maximum for comprehensive queries
  }
  
  switch (intent) {
    case 'medical':
      return 50; // More documents for medical
    case 'research':
      return 30; // Moderate for research
    case 'general':
      return 20; // Fewer for general
    case 'conversation':
      return 10; // Minimal for conversation
    default:
      return 30;
  }
}

/**
 * Checks if query contains comprehensive keywords
 */
export function hasComprehensiveKeywords(query: string): boolean {
  const comprehensiveKeywords = [
    'full', 'complete', 'all', 'entire', 'comprehensive', 'detailed',
    'everything', 'history', 'summary', 'overview', 'total', 'whole'
  ];
  
  const lowerQuery = query.toLowerCase();
  return comprehensiveKeywords.some(kw => lowerQuery.includes(kw));
}
