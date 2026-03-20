/**
 * Memory Command Parser
 * Detects and parses natural language commands for memory/fact operations
 */

export interface MemoryCommand {
  type: 'forget' | 'correct' | 'update' | 'confirm' | 'show' | 'cancel' | null;
  target: 'memory' | 'fact' | 'relationship' | 'all';
  query: string;
  entities: string[];
  confidence?: number;
  originalQuery: string;
}

/**
 * Parse a user query to detect memory commands
 */
export function parseMemoryCommand(query: string): MemoryCommand | null {
  const lowerQuery = query.toLowerCase().trim();
  const originalQuery = query.trim();
  
  // Cancel/No patterns (highest priority)
  if (isCancelCommand(lowerQuery)) {
    return {
      type: 'cancel',
      target: 'all',
      query: '',
      entities: [],
      originalQuery,
    };
  }
  
  // Confirmation patterns
  if (isConfirmCommand(lowerQuery)) {
    return {
      type: 'confirm',
      target: 'all',
      query: '',
      entities: [],
      originalQuery,
    };
  }
  
  // Forget patterns
  const forgetCommand = parseForgetCommand(query);
  if (forgetCommand) {
    return { ...forgetCommand, originalQuery };
  }
  
  // Update/Correct patterns
  const updateCommand = parseUpdateCommand(query);
  if (updateCommand) {
    return { ...updateCommand, originalQuery };
  }
  
  // Show/List patterns
  const showCommand = parseShowCommand(query);
  if (showCommand) {
    return { ...showCommand, originalQuery };
  }
  
  return null;
}

/**
 * Check if query is a cancellation
 */
function isCancelCommand(lowerQuery: string): boolean {
  const cancelPatterns = [
    /^no$/,
    /^nope$/,
    /^cancel$/,
    /^nevermind$/,
    /^never\s+mind$/,
    /^don't$/,
    /^don't\s+do\s+that$/,
    /^stop$/,
  ];
  
  return cancelPatterns.some(pattern => pattern.test(lowerQuery));
}

/**
 * Check if query is a confirmation
 */
function isConfirmCommand(lowerQuery: string): boolean {
  const confirmPatterns = [
    /^yes$/,
    /^yep$/,
    /^yeah$/,
    /^sure$/,
    /^ok$/,
    /^okay$/,
    /^confirm$/,
    /^do\s+it$/,
    /^remove\s+all$/,
    /^delete\s+all$/,
    /^remove\s+them$/,
    /^delete\s+them$/,
    /^remove\s+it$/,
    /^delete\s+it$/,
  ];
  
  return confirmPatterns.some(pattern => pattern.test(lowerQuery));
}

/**
 * Parse forget/remove/delete commands
 */
function parseForgetCommand(query: string): Omit<MemoryCommand, 'originalQuery'> | null {
  const forgetPatterns = [
    // "forget that I take Metformin"
    /(?:forget|remove|delete)\s+(?:that\s+)?(?:i\s+)?(.+)/i,
    
    // "I was never prescribed Metformin"
    /i\s+(?:was\s+)?never\s+(?:prescribed|given|told|diagnosed)\s+(.+)/i,
    
    // "I don't take Metformin"
    /i\s+(?:don't|do\s+not|didn't|did\s+not)\s+(?:take|have|get|use)\s+(.+)/i,
    
    // "I'm not taking Metformin"
    /i'?m\s+not\s+(?:taking|using|on)\s+(.+)/i,
    
    // "I never had diabetes"
    /i\s+never\s+(?:had|have)\s+(.+)/i,
    
    // "That's wrong about Metformin"
    /(?:that'?s|this\s+is)\s+(?:wrong|incorrect|not\s+true)\s+(?:about\s+)?(.+)/i,
  ];
  
  for (const pattern of forgetPatterns) {
    const match = query.match(pattern);
    if (match) {
      const extractedText = match[1].trim();
      return {
        type: 'forget',
        target: 'all', // Will search both facts and memories
        query: extractedText,
        entities: extractEntities(extractedText),
      };
    }
  }
  
  return null;
}

/**
 * Parse update/correct commands
 */
function parseUpdateCommand(query: string): Omit<MemoryCommand, 'originalQuery'> | null {
  const updatePatterns = [
    // "update my diabetes medication to Insulin"
    /(?:update|change|correct)\s+(?:my\s+)?(.+?)\s+to\s+(.+)/i,
    
    // "actually I take Insulin"
    /(?:actually|really)\s+(?:i\s+)?(.+)/i,
    
    // "it's actually 500mg not 1000mg"
    /it'?s\s+(?:actually|really)\s+(.+?)\s+not\s+(.+)/i,
  ];
  
  for (const pattern of updatePatterns) {
    const match = query.match(pattern);
    if (match) {
      const extractedText = match[1].trim();
      return {
        type: 'update',
        target: 'fact',
        query: extractedText,
        entities: extractEntities(extractedText),
      };
    }
  }
  
  return null;
}

/**
 * Parse show/list commands
 */
function parseShowCommand(query: string): Omit<MemoryCommand, 'originalQuery'> | null {
  const showPatterns = [
    // "show me all medications"
    /(?:show|list|display)\s+(?:me\s+)?(?:all\s+)?(?:my\s+)?(.+)/i,
    
    // "what medications am I taking"
    /what\s+(.+?)\s+(?:am\s+i|do\s+i)\s+(?:taking|have|on)/i,
    
    // "what are my medications"
    /what\s+(?:are|is)\s+(?:my\s+)?(.+)/i,
  ];
  
  for (const pattern of showPatterns) {
    const match = query.match(pattern);
    if (match) {
      const subject = match[1].trim().toLowerCase();
      
      // Determine target based on subject
      let target: 'fact' | 'memory' | 'all' = 'all';
      let factType: string | null = null;
      
      if (subject.includes('medication') || subject.includes('drug') || subject.includes('medicine')) {
        target = 'fact';
        factType = 'medication';
      } else if (subject.includes('condition') || subject.includes('diagnosis') || subject.includes('disease')) {
        target = 'fact';
        factType = 'medical_condition';
      } else if (subject.includes('allerg')) {
        target = 'fact';
        factType = 'allergy';
      } else if (subject.includes('procedure') || subject.includes('surgery')) {
        target = 'fact';
        factType = 'procedure';
      } else if (subject.includes('memor')) {
        target = 'memory';
      }
      
      return {
        type: 'show',
        target,
        query: factType || subject,
        entities: factType ? [factType] : extractEntities(subject),
      };
    }
  }
  
  return null;
}

/**
 * Extract entities (medication names, conditions, etc.) from text
 */
function extractEntities(text: string): string[] {
  // Remove common words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'about', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'my', 'i', 'me', 'take', 'taking', 'have', 'had', 'has', 'am', 'is',
    'are', 'was', 'were', 'been', 'being', 'do', 'does', 'did', 'doing',
  ]);
  
  // Split into words and filter
  const words = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Remove punctuation except hyphens
    .split(/\s+/)
    .filter(word => {
      return (
        word.length > 2 && // At least 3 characters
        !stopWords.has(word) &&
        !/^\d+$/.test(word) // Not just numbers
      );
    });
  
  // Capitalize first letter for proper nouns (medication names, etc.)
  return words.map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  );
}

/**
 * Get a human-readable description of the command
 */
export function describeCommand(command: MemoryCommand): string {
  switch (command.type) {
    case 'forget':
      return `Remove items about "${command.query}"`;
    case 'update':
      return `Update items about "${command.query}"`;
    case 'show':
      return `Show items about "${command.query}"`;
    case 'confirm':
      return 'Confirm action';
    case 'cancel':
      return 'Cancel action';
    default:
      return 'Unknown command';
  }
}

/**
 * Check if a command requires confirmation
 */
export function requiresConfirmation(command: MemoryCommand): boolean {
  return command.type === 'forget' || command.type === 'update';
}
