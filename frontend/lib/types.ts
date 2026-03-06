// Project Lazarus - TypeScript Type Definitions

// ============================================
// CONVERSATIONS & MESSAGES
// ============================================

export interface Conversation {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  is_pinned: boolean;
  is_archived: boolean;
  user_id?: string;
  metadata: Record<string, any>;
  message_count: number;
  last_message_at?: Date;
}

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageIntent = 'medical' | 'general' | 'research' | 'conversation';

export interface Source {
  tier: SourceTier;
  content: string;
  url?: string;
  domain?: string;
  documentId?: string;
  publishDate?: Date;
  author?: string;
  confidence: number;
  warnings?: string[];
}

export enum SourceTier {
  TIER_1_VERIFIED = 1,      // User's actual medical records
  TIER_2_AUTHORITATIVE = 2, // .gov, .edu, peer-reviewed journals
  TIER_3_PROFESSIONAL = 3,  // Medical organizations, established institutions
  TIER_4_GENERAL = 4,       // General websites, news
  TIER_5_UNVERIFIED = 5     // Social media, forums, unverified sources
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: Date;
  
  // Intent and confidence
  intent?: MessageIntent;
  confidence_score?: number;
  confidence_reasoning?: string;
  
  // Sources
  sources?: Source[];
  medical_document_ids?: string[];
  web_sources?: any[];
  
  // Metadata
  model_version?: string;
  tokens_input?: number;
  tokens_output?: number;
  processing_time_ms?: number;
  metadata?: Record<string, any>;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

// ============================================
// MEMORY SYSTEM
// ============================================

export type FactType = 
  | 'medical_condition'
  | 'allergy'
  | 'medication'
  | 'procedure'
  | 'preference'
  | 'family_history'
  | 'lifestyle';

export type SourceType = 'medical_record' | 'user_stated' | 'inferred';

export interface UserFact {
  id: string;
  fact_type: FactType;
  content: string;
  confidence: number;
  
  // Source tracking
  source_type: SourceType;
  source_document_id?: string;
  source_conversation_id?: string;
  source_message_id?: string;
  
  // Temporal tracking
  fact_date?: Date;
  valid_from: Date;
  valid_until?: Date;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  verified_by: string;
  metadata: Record<string, any>;
}

export type MemoryType = 'instruction' | 'preference' | 'learning' | 'correction';
export type MemoryCategory = 'medical' | 'general' | 'behavioral';

export interface MemoryEmbedding {
  id: string;
  content: string;
  embedding?: number[]; // Vector embedding
  
  // Classification
  memory_type: MemoryType;
  category?: MemoryCategory;
  
  // Source tracking
  source_conversation_id?: string;
  source_message_id?: string;
  extracted_at: Date;
  
  // Lifecycle management
  model_version?: string;
  is_active: boolean;
  relevance_score: number;
  usage_count: number;
  last_used_at?: Date;
  
  // Metadata
  created_at: Date;
  metadata: Record<string, any>;
}

// ============================================
// API TYPES
// ============================================

export interface ChatRequest {
  query: string;
  conversation_id?: string;
  include_memory?: boolean;
}

export interface ChatResponse {
  success: boolean;
  answer: string;
  message_id: string;
  conversation_id: string;
  
  // Intent and confidence
  intent: MessageIntent;
  confidence: {
    overall: number;
    reasoning: string;
  };
  
  // Sources
  sources: Source[];
  source_quality: {
    tier1: number;
    tier2: number;
    tier3: number;
    tier4Plus: number;
  };
  
  // Metadata
  model_version: string;
  tokens_input: number;
  tokens_output: number;
  processing_time_ms: number;
  
  error?: string;
}

export interface ConversationListResponse {
  success: boolean;
  conversations: Conversation[];
  total: number;
  error?: string;
}

export interface ConversationDetailResponse {
  success: boolean;
  conversation: ConversationWithMessages;
  error?: string;
}

// ============================================
// INTENT DETECTION
// ============================================

export interface IntentClassification {
  primary: MessageIntent;
  confidence: number;
  needsMedicalContext: boolean;
  needsWebSearch: boolean;
  reasoning: string;
}

// ============================================
// CONFIDENCE SCORING
// ============================================

export interface ConfidenceScore {
  overall: number; // 0.0 to 1.0
  reasoning: string;
  sourceBreakdown: {
    tier1Count: number;
    tier2Count: number;
    tier3Count: number;
    tier4PlusCount: number;
  };
  hasConflicts: boolean;
  warnings: string[];
}
