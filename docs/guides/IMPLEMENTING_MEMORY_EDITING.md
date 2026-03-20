# Quick Start: Implementing Memory Editing

## Prerequisites
- Read `docs/features/CHAT_MEMORY_EDITING.md` for full proposal
- Review `docs/features/MEMORY_EDITING_UI_MOCKUPS.md` for UI designs
- Ensure backend API endpoints are working (`/memory/facts`, `/memory/memories`)

---

## Phase 1: Basic Chat Commands (Week 1)

### Step 1: Create Command Parser

Create `lib/command-parser.ts`:

```typescript
export interface MemoryCommand {
  type: 'forget' | 'correct' | 'update' | 'confirm' | 'show' | null;
  target: 'memory' | 'fact' | 'relationship' | 'all';
  query: string;
  entities: string[];
  confidence?: number;
}

export function parseMemoryCommand(query: string): MemoryCommand | null {
  const lowerQuery = query.toLowerCase().trim();
  
  // Forget patterns
  const forgetPatterns = [
    /(?:forget|remove|delete)\s+(?:that\s+)?(?:i\s+)?(.+)/i,
    /i\s+(?:was\s+)?never\s+(.+)/i,
    /(?:not|don't|didn't)\s+(?:take|have|get)\s+(.+)/i,
  ];
  
  for (const pattern of forgetPatterns) {
    const match = query.match(pattern);
    if (match) {
      return {
        type: 'forget',
        target: 'all', // Will search both facts and memories
        query: match[1],
        entities: extractEntities(match[1]),
      };
    }
  }
  
  // Update patterns
  const updatePatterns = [
    /(?:update|change|correct)\s+(.+?)\s+to\s+(.+)/i,
    /(?:actually|really)\s+(.+)/i,
  ];
  
  for (const pattern of updatePatterns) {
    const match = query.match(pattern);
    if (match) {
      return {
        type: 'update',
        target: 'fact',
        query: match[1],
        entities: extractEntities(match[1]),
      };
    }
  }
  
  // Show patterns
  const showPatterns = [
    /(?:show|list|what)\s+(?:me\s+)?(?:all\s+)?(?:my\s+)?(.+)/i,
  ];
  
  for (const pattern of showPatterns) {
    const match = query.match(pattern);
    if (match) {
      const subject = match[1];
      if (subject.includes('medication') || subject.includes('drug')) {
        return {
          type: 'show',
          target: 'fact',
          query: 'medication',
          entities: ['medication'],
        };
      }
    }
  }
  
  return null;
}

function extractEntities(text: string): string[] {
  // Simple entity extraction - can be enhanced with NER
  const words = text.split(/\s+/);
  // Capitalize first letter of each word for medication names
  return words
    .filter(w => w.length > 3)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
```

### Step 2: Create Memory Command Handler

Create `app/api/memory-commands/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { parseMemoryCommand } from '@/lib/command-parser';

export async function POST(request: NextRequest) {
  try {
    const { query, conversation_id } = await request.json();
    
    const command = parseMemoryCommand(query);
    
    if (!command) {
      return NextResponse.json({
        success: false,
        error: 'Not a memory command',
      });
    }
    
    // Search for matching facts/memories
    const matches = await searchMatches(command);
    
    return NextResponse.json({
      success: true,
      command,
      matches,
      confirmation_required: matches.length > 0,
    });
    
  } catch (error) {
    console.error('Memory command error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

async function searchMatches(command: MemoryCommand) {
  const matches = [];
  
  // Search facts
  if (command.target === 'fact' || command.target === 'all') {
    const factsResponse = await fetch(
      `${process.env.VITE_API_URL}/memory/facts`
    );
    const factsData = await factsResponse.json();
    
    if (factsData.success) {
      const matchingFacts = factsData.facts.filter((fact: any) =>
        command.entities.some(entity =>
          fact.content.toLowerCase().includes(entity.toLowerCase())
        )
      );
      
      matches.push(...matchingFacts.map((f: any) => ({
        ...f,
        type: 'fact',
      })));
    }
  }
  
  // Search memories
  if (command.target === 'memory' || command.target === 'all') {
    const memoriesResponse = await fetch(
      `${process.env.VITE_API_URL}/memory/memories`
    );
    const memoriesData = await memoriesResponse.json();
    
    if (memoriesData.success) {
      const matchingMemories = memoriesData.memories.filter((memory: any) =>
        command.entities.some(entity =>
          memory.content.toLowerCase().includes(entity.toLowerCase())
        )
      );
      
      matches.push(...matchingMemories.map((m: any) => ({
        ...m,
        type: 'memory',
      })));
    }
  }
  
  return matches;
}
```

### Step 3: Integrate into Chat Route

Update `app/api/chat/route.ts`:

```typescript
// Add after Step 1: Classify intent
import { parseMemoryCommand } from '@/lib/command-parser';

// ... existing code ...

// After intent classification
const memoryCommand = parseMemoryCommand(query);

if (memoryCommand) {
  // Forward to memory command handler
  const commandResponse = await fetch(
    `${process.env.VITE_API_URL}/memory-commands`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, conversation_id: conversationId }),
    }
  );
  
  const commandData = await commandResponse.json();
  
  if (commandData.success && commandData.matches.length > 0) {
    // Build confirmation message
    const confirmationMessage = buildConfirmationMessage(
      memoryCommand,
      commandData.matches
    );
    
    // Save as assistant message
    await createMessage({
      conversation_id: conversationId,
      role: 'assistant',
      content: confirmationMessage,
      intent: 'memory_command',
      metadata: {
        command: memoryCommand,
        matches: commandData.matches,
        awaiting_confirmation: true,
      },
    });
    
    return NextResponse.json({
      success: true,
      answer: confirmationMessage,
      conversation_id: conversationId,
      memory_command: true,
      matches: commandData.matches,
    });
  }
}

// ... continue with normal chat flow ...

function buildConfirmationMessage(
  command: MemoryCommand,
  matches: any[]
): string {
  let message = `🔍 I found ${matches.length} item(s) matching "${command.query}":\n\n`;
  
  matches.forEach((match, index) => {
    message += `${index + 1}. ${match.content}\n`;
    message += `   Type: ${match.type}\n`;
    message += `   Confidence: ${(match.confidence * 100).toFixed(0)}%\n`;
    if (match.fact_date) {
      message += `   Date: ${match.fact_date}\n`;
    }
    message += '\n';
  });
  
  if (command.type === 'forget') {
    message += 'Would you like me to remove these items?';
  } else if (command.type === 'update') {
    message += 'Would you like me to update these items?';
  }
  
  return message;
}
```

### Step 4: Update ChatInterface Component

Update `components/ChatInterface.tsx` to handle confirmation:

```typescript
// Add state for pending command
const [pendingCommand, setPendingCommand] = useState<{
  command: any;
  matches: any[];
} | null>(null);

// In handleSendMessage, check for confirmation
if (pendingCommand) {
  const lowerInput = input.toLowerCase().trim();
  
  if (lowerInput === 'yes' || lowerInput === 'remove all' || lowerInput === 'confirm') {
    // Execute deletion
    await executeMemoryCommand(pendingCommand);
    setPendingCommand(null);
  } else if (lowerInput === 'no' || lowerInput === 'cancel') {
    // Cancel
    setPendingCommand(null);
    setMessages([...messages, {
      role: 'assistant',
      content: 'Okay, I won\'t make any changes.',
    }]);
    return;
  }
}

// In response handling
if (data.memory_command && data.matches) {
  setPendingCommand({
    command: data.command,
    matches: data.matches,
  });
}

async function executeMemoryCommand(pending: any) {
  const { matches } = pending;
  
  // Delete each match
  for (const match of matches) {
    if (match.type === 'fact') {
      await fetch(`${import.meta.env.VITE_API_URL}/memory/facts/${match.id}`, {
        method: 'DELETE',
      });
    } else if (match.type === 'memory') {
      await fetch(`${import.meta.env.VITE_API_URL}/memory/memories/${match.id}`, {
        method: 'DELETE',
      });
    }
  }
  
  // Add confirmation message
  setMessages([...messages, {
    role: 'assistant',
    content: `✓ Successfully removed ${matches.length} item(s). Your knowledge graph has been updated.`,
  }]);
}
```

---

## Testing Phase 1

### Test Cases

1. **Basic Forget Command**
   ```
   User: "forget that I take Metformin"
   Expected: Shows matching facts, asks for confirmation
   ```

2. **Never Pattern**
   ```
   User: "I was never prescribed Lisinopril"
   Expected: Shows matching facts, asks for confirmation
   ```

3. **Confirmation**
   ```
   User: "yes"
   Expected: Deletes items, shows success message
   ```

4. **Cancellation**
   ```
   User: "no"
   Expected: Cancels operation, no changes made
   ```

### Manual Testing Steps

1. Start the application
2. Open chat interface
3. Type: "I was never prescribed Metformin"
4. Verify: System shows matching facts
5. Type: "yes"
6. Verify: Facts are deleted
7. Open UserFactsPanel
8. Verify: Metformin facts are gone

---

## Phase 2: Knowledge Graph Integration (Week 2)

### Step 1: Add Chat Panel to Graph

Update `src/components/KnowledgeGraph.tsx`:

```typescript
// Add state
const [graphChatOpen, setGraphChatOpen] = useState(false);
const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);

// Add chat toggle button
<button
  onClick={() => setGraphChatOpen(!graphChatOpen)}
  className="graph-chat-toggle"
  style={{
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: theme.colors.primary,
    color: 'white',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
  }}
>
  💬 {graphChatOpen ? 'Close Chat' : 'Chat with Graph'}
</button>

// Add chat panel
{graphChatOpen && (
  <div
    className="graph-chat-panel"
    style={{
      position: 'absolute',
      top: '4rem',
      right: '1rem',
      width: '400px',
      height: 'calc(100% - 5rem)',
      backgroundColor: theme.colors.surface,
      borderRadius: '1rem',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <ChatInterface
      theme={theme}
      mode="graph"
      onNodeHighlight={setHighlightedNodes}
    />
  </div>
)}
```

### Step 2: Implement Node Highlighting

```typescript
// In graph rendering, check if node should be highlighted
const isHighlighted = highlightedNodes.includes(node.id);

// Apply highlight style
<circle
  r={nodeRadius}
  fill={isHighlighted ? theme.colors.primary : getNodeColor(node)}
  stroke={isHighlighted ? theme.colors.primary : theme.colors.border}
  strokeWidth={isHighlighted ? 3 : 1}
  style={{
    transition: 'all 0.3s ease',
    filter: isHighlighted ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))' : 'none',
  }}
/>
```

---

## Phase 3: Node Editing (Week 3)

### Step 1: Add Context Menu

Create `src/components/graph/NodeContextMenu.tsx`:

```typescript
interface NodeContextMenuProps {
  node: any;
  position: { x: number; y: number };
  theme: Theme;
  onEdit: () => void;
  onDelete: () => void;
  onAddRelationship: () => void;
  onClose: () => void;
}

export default function NodeContextMenu({
  node,
  position,
  theme,
  onEdit,
  onDelete,
  onAddRelationship,
  onClose,
}: NodeContextMenuProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        backgroundColor: theme.colors.surface,
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '0.5rem',
        zIndex: 1000,
      }}
    >
      <button onClick={onEdit}>✏️ Edit Fact</button>
      <button onClick={onAddRelationship}>🔗 Add Relationship</button>
      <button onClick={onDelete} style={{ color: '#ef4444' }}>
        🗑️ Delete
      </button>
    </div>
  );
}
```

### Step 2: Add Edit Modal

Create `src/components/graph/NodeEditModal.tsx`:

```typescript
interface NodeEditModalProps {
  node: any;
  theme: Theme;
  onSave: (updates: any) => void;
  onClose: () => void;
}

export default function NodeEditModal({
  node,
  theme,
  onSave,
  onClose,
}: NodeEditModalProps) {
  const [content, setContent] = useState(node.content);
  const [confidence, setConfidence] = useState(node.confidence);
  const [factDate, setFactDate] = useState(node.fact_date || '');
  
  const handleSave = () => {
    onSave({
      id: node.id,
      content,
      confidence,
      fact_date: factDate,
    });
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Edit Fact: {node.label}</h3>
        
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
        />
        
        <label>
          Confidence: {(confidence * 100).toFixed(0)}%
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={confidence}
            onChange={(e) => setConfidence(parseFloat(e.target.value))}
          />
        </label>
        
        <label>
          Fact Date:
          <input
            type="date"
            value={factDate}
            onChange={(e) => setFactDate(e.target.value)}
          />
        </label>
        
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
```

---

## Quick Wins

### 1. Add "Undo" Button
After any deletion, show an undo button for 10 seconds:

```typescript
const [recentDeletion, setRecentDeletion] = useState<any>(null);

// After deletion
setRecentDeletion({ items: deletedItems, timestamp: Date.now() });
setTimeout(() => setRecentDeletion(null), 10000);

// Undo button
{recentDeletion && (
  <button onClick={handleUndo}>
    ↩️ Undo (deleted {recentDeletion.items.length} items)
  </button>
)}
```

### 2. Add Command Suggestions
Show quick action buttons for common commands:

```typescript
<div className="quick-actions">
  <button onClick={() => handleCommand('show medications')}>
    💊 Show Medications
  </button>
  <button onClick={() => handleCommand('show conditions')}>
    🏥 Show Conditions
  </button>
  <button onClick={() => handleCommand('show all facts')}>
    📋 Show All Facts
  </button>
</div>
```

### 3. Add Loading States
Show loading indicator during operations:

```typescript
const [isProcessing, setIsProcessing] = useState(false);

// During deletion
setIsProcessing(true);
await deleteItems();
setIsProcessing(false);

// UI
{isProcessing && <LoadingSpinner />}
```

---

## Common Issues & Solutions

### Issue: Commands not detected
**Solution**: Add more patterns to `parseMemoryCommand()`, log the query to debug

### Issue: Matches not found
**Solution**: Check entity extraction, try case-insensitive search

### Issue: Deletion doesn't persist
**Solution**: Verify API endpoint is working, check network tab

### Issue: Graph doesn't update after deletion
**Solution**: Trigger graph refresh after deletion, reload data

---

## Next Steps

1. Implement Phase 1 (basic commands)
2. Test thoroughly with various command patterns
3. Add Phase 2 (graph integration)
4. Implement Phase 3 (node editing)
5. Add undo system
6. Polish UI/UX
7. Write comprehensive tests

---

**Status**: Implementation Guide  
**Created**: 2026-03-16  
**Difficulty**: Medium  
**Estimated Time**: 3-5 weeks
