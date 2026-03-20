import { NextRequest, NextResponse } from 'next/server';
import { parseMemoryCommand, requiresConfirmation } from '@/lib/command-parser';

/**
 * Memory Commands API
 * Handles natural language commands for memory/fact operations
 */

export async function POST(request: NextRequest) {
  try {
    const { query, conversation_id, action } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }
    
    // Parse the command
    const command = parseMemoryCommand(query);
    
    if (!command) {
      return NextResponse.json({
        success: false,
        is_command: false,
        error: 'Not a memory command',
      });
    }
    
    console.log('Parsed memory command:', command);
    
    // Handle different command types
    switch (command.type) {
      case 'forget':
      case 'update':
        return await handleModificationCommand(command, conversation_id);
      
      case 'show':
        return await handleShowCommand(command);
      
      case 'confirm':
      case 'cancel':
        return NextResponse.json({
          success: true,
          is_command: true,
          command,
          requires_context: true, // Needs previous command context
        });
      
      default:
        return NextResponse.json({
          success: false,
          is_command: false,
          error: 'Unknown command type',
        });
    }
    
  } catch (error) {
    console.error('Memory command error:', error);
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
 * Handle forget/update commands - search for matches and prepare confirmation
 */
async function handleModificationCommand(
  command: any,
  conversationId?: string
) {
  try {
    // Search for matching items
    const matches = await searchMatches(command);
    
    console.log(`Found ${matches.length} matches for command:`, command);
    
    if (matches.length === 0) {
      return NextResponse.json({
        success: true,
        is_command: true,
        command,
        matches: [],
        message: `I couldn't find any items matching "${command.query}". Could you be more specific?`,
      });
    }
    
    // Build confirmation message
    const confirmationMessage = buildConfirmationMessage(command, matches);
    
    return NextResponse.json({
      success: true,
      is_command: true,
      command,
      matches,
      confirmation_required: requiresConfirmation(command),
      message: confirmationMessage,
    });
    
  } catch (error) {
    console.error('Error handling modification command:', error);
    throw error;
  }
}

/**
 * Handle show commands - display matching items
 */
async function handleShowCommand(command: any) {
  try {
    const matches = await searchMatches(command);
    
    console.log(`Found ${matches.length} matches for show command:`, command);
    
    if (matches.length === 0) {
      return NextResponse.json({
        success: true,
        is_command: true,
        command,
        matches: [],
        message: `I don't have any information about "${command.query}".`,
      });
    }
    
    const message = buildShowMessage(command, matches);
    
    return NextResponse.json({
      success: true,
      is_command: true,
      command,
      matches,
      message,
    });
    
  } catch (error) {
    console.error('Error handling show command:', error);
    throw error;
  }
}

/**
 * Search for facts and memories matching the command
 */
async function searchMatches(command: any): Promise<any[]> {
  const matches: any[] = [];
  
  // Use relative API paths for Next.js API routes
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  
  if (!apiUrl) {
    console.warn('API URL not configured, using relative paths');
  }
  
  try {
    // Search facts
    if (command.target === 'fact' || command.target === 'all') {
      const factsUrl = apiUrl ? `${apiUrl}/memory/facts` : '/api/memory/facts';
      const factsResponse = await fetch(factsUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (factsResponse.ok) {
        const factsData = await factsResponse.json();
        
        if (factsData.success && factsData.facts) {
          const matchingFacts = factsData.facts.filter((fact: any) => {
            // Check if any entity matches the fact content
            const contentLower = fact.content.toLowerCase();
            const queryLower = command.query.toLowerCase();
            
            // Direct query match
            if (contentLower.includes(queryLower)) {
              return true;
            }
            
            // Entity match
            return command.entities.some((entity: string) =>
              contentLower.includes(entity.toLowerCase())
            );
          });
          
          matches.push(...matchingFacts.map((f: any) => ({
            ...f,
            item_type: 'fact',
          })));
        }
      }
    }
    
    // Search memories
    if (command.target === 'memory' || command.target === 'all') {
      const memoriesUrl = apiUrl ? `${apiUrl}/memory/memories` : '/api/memory/memories';
      const memoriesResponse = await fetch(memoriesUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (memoriesResponse.ok) {
        const memoriesData = await memoriesResponse.json();
        
        if (memoriesData.success && memoriesData.memories) {
          const matchingMemories = memoriesData.memories.filter((memory: any) => {
            const contentLower = memory.content.toLowerCase();
            const queryLower = command.query.toLowerCase();
            
            // Direct query match
            if (contentLower.includes(queryLower)) {
              return true;
            }
            
            // Entity match
            return command.entities.some((entity: string) =>
              contentLower.includes(entity.toLowerCase())
            );
          });
          
          matches.push(...matchingMemories.map((m: any) => ({
            ...m,
            item_type: 'memory',
          })));
        }
      }
    }
    
  } catch (error) {
    console.error('Error searching matches:', error);
  }
  
  return matches;
}

/**
 * Build confirmation message for modification commands
 */
function buildConfirmationMessage(command: any, matches: any[]): string {
  const action = command.type === 'forget' ? 'remove' : 'update';
  let message = `🔍 I found ${matches.length} item${matches.length === 1 ? '' : 's'} matching "${command.query}":\n\n`;
  
  matches.forEach((match, index) => {
    const number = index + 1;
    const type = match.item_type === 'fact' ? '📋 Fact' : '🧠 Memory';
    const content = match.content.length > 100 
      ? match.content.substring(0, 100) + '...' 
      : match.content;
    
    message += `${number}. ${type}\n`;
    message += `   "${content}"\n`;
    
    if (match.confidence !== undefined) {
      message += `   Confidence: ${(match.confidence * 100).toFixed(0)}%\n`;
    }
    
    if (match.fact_date) {
      message += `   Date: ${new Date(match.fact_date).toLocaleDateString()}\n`;
    }
    
    if (match.fact_type) {
      message += `   Type: ${match.fact_type.replace(/_/g, ' ')}\n`;
    }
    
    message += '\n';
  });
  
  if (command.type === 'forget') {
    message += `Would you like me to ${action} ${matches.length === 1 ? 'this item' : 'these items'}?\n`;
    message += `Reply with "yes" to confirm or "no" to cancel.`;
  } else if (command.type === 'update') {
    message += `Would you like me to ${action} ${matches.length === 1 ? 'this item' : 'these items'}?\n`;
    message += `Reply with "yes" to confirm or "no" to cancel.`;
  }
  
  return message;
}

/**
 * Build message for show commands
 */
function buildShowMessage(command: any, matches: any[]): string {
  let message = `📋 Here's what I found about "${command.query}":\n\n`;
  
  // Group by type
  const facts = matches.filter(m => m.item_type === 'fact');
  const memories = matches.filter(m => m.item_type === 'memory');
  
  if (facts.length > 0) {
    message += `**Facts (${facts.length}):**\n`;
    facts.forEach((fact, index) => {
      const content = fact.content.length > 150 
        ? fact.content.substring(0, 150) + '...' 
        : fact.content;
      message += `${index + 1}. ${content}\n`;
      if (fact.confidence !== undefined) {
        message += `   Confidence: ${(fact.confidence * 100).toFixed(0)}%\n`;
      }
      message += '\n';
    });
  }
  
  if (memories.length > 0) {
    message += `**Memories (${memories.length}):**\n`;
    memories.forEach((memory, index) => {
      const content = memory.content.length > 150 
        ? memory.content.substring(0, 150) + '...' 
        : memory.content;
      message += `${index + 1}. ${content}\n`;
      message += '\n';
    });
  }
  
  return message;
}

/**
 * Execute deletion of items
 */
export async function executeDelete(matches: any[]): Promise<{ success: boolean; deleted: number; errors: any[] }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const deleted: string[] = [];
  const errors: any[] = [];
  
  for (const match of matches) {
    try {
      if (match.item_type === 'fact') {
        const url = apiUrl ? `${apiUrl}/memory/facts/${match.id}` : `/api/memory/facts/${match.id}`;
        const response = await fetch(url, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          deleted.push(match.id);
        } else {
          errors.push({ id: match.id, error: 'Delete failed' });
        }
      } else if (match.item_type === 'memory') {
        const url = apiUrl ? `${apiUrl}/memory/memories/${match.id}` : `/api/memory/memories/${match.id}`;
        const response = await fetch(url, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          deleted.push(match.id);
        } else {
          errors.push({ id: match.id, error: 'Delete failed' });
        }
      }
    } catch (error) {
      console.error(`Error deleting ${match.item_type} ${match.id}:`, error);
      errors.push({ id: match.id, error: String(error) });
    }
  }
  
  return {
    success: errors.length === 0,
    deleted: deleted.length,
    errors,
  };
}
