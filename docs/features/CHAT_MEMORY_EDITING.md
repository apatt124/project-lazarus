# Chat-Based Memory & Fact Editing with Knowledge Graph Integration

## Problem Statement

Users currently cannot:
1. Edit or remove memories/facts through natural chat commands (e.g., "I was never prescribed that drug")
2. Interact with the knowledge graph through chat
3. Modify facts and relationships directly from the knowledge graph UI
4. Have changes persist properly across the system

## Current System Analysis

### Existing Capabilities
- ✅ Backend API supports DELETE/PATCH for facts and memories (`/memory/facts/:id`, `/memory/memories/:id`)
- ✅ UserFactsPanel has UI for manual editing (sliders, delete buttons)
- ✅ Memory extraction happens automatically after conversations
- ✅ Knowledge graph visualizes facts and relationships

### Missing Capabilities
- ❌ No chat command parsing for memory/fact operations
- ❌ No chat interface in knowledge graph
- ❌ No way to edit facts/relationships from graph nodes
- ❌ Changes don't trigger re-extraction or validation

## Proposed Solution

### Phase 1: Chat Command System

#### 1.1 Command Parser
Add natural language command detection to the chat flow:

```typescript
// New file: lib/command-parser.ts
interface MemoryCommand {
  type: 'forget' | 'correct' | 'update' | 'confirm';
  target: 'memory' | 'fact' | 'relationship';
  action: string;
  entities?: string[];
  confidence?: number;
}

function parseMemoryCommand(query: string): MemoryCommand | null {
  // Patterns to detect:
  // - "forget that I take [medication]"
  // - "I was never prescribed [drug]"
  // - "remove the memory about [topic]"
  // - "that's incorrect, I actually [correction]"
  // - "update my [condition] to [new value]"
  // - "delete the fact about [topic]"
}
```

#### 1.2 Command Execution Flow

```
User: "I was never prescribed Metformin"
  ↓
1. Detect command intent (forget/correct)
  ↓
2. Search for matching facts/memories
  ↓
3. Present confirmation with matched items
  ↓
4. User confirms → Execute deletion/update
  ↓
5. Respond with confirmation
```

#### 1.3 Integration Points

**In `app/api/chat/route.ts`:**
```typescript
// After Step 1: Classify intent
const memoryCommand = parseMemoryCommand(query);

if (memoryCommand) {
  // Handle memory command instead of normal chat flow
  return await handleMemoryCommand(memoryCommand, conversationId);
}
```

**New endpoint: `app/api/memory-commands/route.ts`:**
```typescript
POST /api/memory-commands
{
  "command": "forget",
  "query": "I was never prescribed Metformin",
  "conversation_id": "uuid"
}

Response:
{
  "success": true,
  "action": "search_results",
  "matches": [
    {
      "id": "fact-123",
      "type": "fact",
      "content": "Patient takes Metformin 500mg daily",
      "confidence": 0.95
    }
  ],
  "confirmation_required": true
}
```

### Phase 2: Knowledge Graph Chat Integration

#### 2.1 Graph Chat Panel
Add a collapsible chat interface to the knowledge graph:

```typescript
// Update: src/components/KnowledgeGraph.tsx

interface GraphChatMessage {
  role: 'user' | 'assistant';
  content: string;
  affectedNodes?: string[]; // Highlight nodes mentioned
  action?: 'edit' | 'delete' | 'create' | 'query';
}

// New component: GraphChatPanel
<div className="graph-chat-panel">
  <button onClick={toggleChat}>💬 Chat with Graph</button>
  
  {chatOpen && (
    <div className="chat-overlay">
      <ChatInterface 
        mode="graph"
        onNodeAction={handleNodeAction}
        highlightNodes={highlightedNodes}
      />
    </div>
  )}
</div>
```

#### 2.2 Graph-Specific Commands

```typescript
// Commands that work in graph mode:
"Show me all medications"
"What conditions am I diagnosed with?"
"Remove the connection between [A] and [B]"
"Add a relationship: [drug] treats [condition]"
"When was I diagnosed with [condition]?"
"Edit the fact about [topic]"
```

#### 2.3 Visual Feedback
- Highlight nodes mentioned in chat
- Animate changes (fade out deleted nodes, pulse updated nodes)
- Show confidence changes with color transitions

### Phase 3: Node Editing UI

#### 3.1 Node Context Menu
Add right-click/long-press menu to graph nodes:

```typescript
interface NodeContextMenu {
  node: GraphNode;
  actions: [
    { label: 'Edit Fact', icon: '✏️', action: 'edit' },
    { label: 'Adjust Confidence', icon: '🎚️', action: 'confidence' },
    { label: 'View Sources', icon: '📄', action: 'sources' },
    { label: 'Delete', icon: '🗑️', action: 'delete', danger: true },
    { label: 'Add Relationship', icon: '🔗', action: 'relate' },
  ];
}
```

#### 3.2 Inline Editing Modal

```typescript
// New component: NodeEditModal
<Modal>
  <h3>Edit Fact: {node.label}</h3>
  
  <textarea 
    value={factContent}
    onChange={handleContentChange}
  />
  
  <ConfidenceSlider 
    value={confidence}
    onChange={handleConfidenceChange}
  />
  
  <DatePicker 
    label="Fact Date"
    value={factDate}
    onChange={handleDateChange}
  />
  
  <SourcesList sources={node.sources} />
  
  <div className="actions">
    <button onClick={handleSave}>Save Changes</button>
    <button onClick={handleCancel}>Cancel</button>
  </div>
</Modal>
```

#### 3.3 Relationship Editor

```typescript
// New component: RelationshipEditor
<Modal>
  <h3>Edit Relationship</h3>
  
  <NodeSelector 
    label="From"
    value={fromNode}
    onChange={setFromNode}
  />
  
  <RelationshipTypeSelector
    value={relationType}
    onChange={setRelationType}
    options={['treats', 'causes', 'diagnosed_with', 'prescribed_for']}
  />
  
  <NodeSelector 
    label="To"
    value={toNode}
    onChange={setToNode}
  />
  
  <ConfidenceSlider 
    value={confidence}
    onChange={setConfidence}
  />
  
  <button onClick={handleCreateRelationship}>Create</button>
</Modal>
```

### Phase 4: Backend Enhancements

#### 4.1 New API Endpoints

```typescript
// POST /api/memory-commands/search
// Search for facts/memories matching a query
{
  "query": "Metformin",
  "type": "fact" | "memory" | "both"
}

// POST /api/memory-commands/execute
// Execute a memory command after confirmation
{
  "command_id": "uuid",
  "action": "delete" | "update",
  "target_ids": ["fact-123", "memory-456"],
  "updates": { confidence: 0.5 }
}

// POST /api/relationships
// Create/update relationships between facts
{
  "from_fact_id": "fact-123",
  "to_fact_id": "fact-456",
  "relationship_type": "treats",
  "confidence": 0.9
}

// GET /api/relationships/:factId
// Get all relationships for a fact

// DELETE /api/relationships/:relationshipId
// Delete a relationship
```

#### 4.2 Database Schema Updates

```sql
-- New table for relationships
CREATE TABLE medical.fact_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_fact_id UUID REFERENCES medical.user_facts(id),
  to_fact_id UUID REFERENCES medical.user_facts(id),
  relationship_type VARCHAR(50) NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.8,
  source_type VARCHAR(50) DEFAULT 'user_stated',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- New table for command history
CREATE TABLE medical.memory_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES medical.conversations(id),
  command_type VARCHAR(50) NOT NULL,
  query TEXT NOT NULL,
  matched_items JSONB,
  executed BOOLEAN DEFAULT false,
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4.3 Lambda Function Updates

Update `lambda/api-memory/index.mjs` to support:
- Batch operations (delete multiple facts/memories at once)
- Relationship CRUD operations
- Command history tracking
- Undo functionality (soft deletes with restore capability)

### Phase 5: UX Enhancements

#### 5.1 Confirmation Flow

```typescript
// Multi-step confirmation for destructive actions
User: "forget that I take Metformin"
  ↓
AI: "I found 2 facts about Metformin:
     1. Patient takes Metformin 500mg daily (95% confidence)
     2. Metformin prescribed on 2024-01-15 (90% confidence)
     
     Would you like me to remove these?"
  ↓
User: "yes" or "just the first one"
  ↓
AI: "✓ Removed 1 fact about Metformin. 
     Your knowledge graph has been updated."
```

#### 5.2 Undo System

```typescript
// Store deleted items for 30 days
interface DeletedItem {
  id: string;
  type: 'fact' | 'memory' | 'relationship';
  content: any;
  deleted_at: Date;
  deleted_by_command: string;
  restorable_until: Date;
}

// Commands:
"undo that" → Restore last deleted item
"undo delete Metformin" → Restore specific deletion
"show deleted items" → List restorable items
```

#### 5.3 Batch Operations

```typescript
// Support bulk operations
"remove all facts about diabetes"
"update confidence for all medications to 80%"
"show me all low-confidence facts"
"delete all memories older than 6 months"
```

## Implementation Plan

### Week 1: Command Parser & Basic Execution
- [ ] Create `lib/command-parser.ts`
- [ ] Add command detection to chat route
- [ ] Implement search endpoint
- [ ] Add confirmation flow
- [ ] Test with basic "forget" commands

### Week 2: Graph Chat Integration
- [ ] Add chat panel to KnowledgeGraph component
- [ ] Implement graph-specific commands
- [ ] Add node highlighting
- [ ] Test chat → graph interaction

### Week 3: Node Editing UI
- [ ] Create NodeContextMenu component
- [ ] Build NodeEditModal
- [ ] Implement RelationshipEditor
- [ ] Add visual feedback for changes

### Week 4: Backend & Relationships
- [ ] Create relationships table
- [ ] Add relationship API endpoints
- [ ] Update Lambda functions
- [ ] Implement undo system

### Week 5: Polish & Testing
- [ ] Add batch operations
- [ ] Implement command history
- [ ] Add comprehensive error handling
- [ ] Write tests
- [ ] Update documentation

## Example User Flows

### Flow 1: Correcting a Medication
```
User: "I was never prescribed Metformin"
AI: "I found this fact: 'Patient takes Metformin 500mg daily' (95% confidence). 
     Should I remove it?"
User: "yes"
AI: "✓ Removed. I've also removed the related fact about the prescription date."
```

### Flow 2: Editing from Graph
```
1. User right-clicks "Metformin" node in graph
2. Selects "Edit Fact"
3. Modal opens with fact details
4. User changes dosage from 500mg to 1000mg
5. Adjusts confidence to 100%
6. Clicks "Save"
7. Node updates in real-time
8. Change is logged in conversation history
```

### Flow 3: Adding Relationship
```
User: "Add a connection: Metformin treats Type 2 Diabetes"
AI: "I'll create a relationship between:
     • Metformin (medication)
     • Type 2 Diabetes (condition)
     Relationship type: treats
     
     Is this correct?"
User: "yes"
AI: "✓ Relationship created. Your knowledge graph now shows this connection."
```

### Flow 4: Graph Chat Query
```
User: (in graph chat) "What medications am I taking?"
AI: "Based on your knowledge graph, you're currently taking:
     • Metformin 500mg (for Type 2 Diabetes)
     • Lisinopril 10mg (for Hypertension)
     
     [Nodes highlight in graph]
     
     Would you like to see more details about any of these?"
```

## Technical Considerations

### Performance
- Cache parsed commands to avoid re-parsing
- Debounce graph updates during batch operations
- Use optimistic UI updates for better UX

### Security
- Validate all user inputs
- Require confirmation for destructive operations
- Log all memory/fact modifications
- Implement rate limiting on command endpoints

### Data Integrity
- Soft delete by default (set `is_active = false`)
- Maintain audit trail of all changes
- Validate relationships before creation
- Check for orphaned relationships after fact deletion

### Accessibility
- Keyboard shortcuts for graph operations
- Screen reader support for graph chat
- High contrast mode for confidence indicators
- Focus management in modals

## Success Metrics

- Users can successfully edit/delete facts via chat commands
- Graph chat has <2s response time
- Node editing modal loads in <500ms
- 95%+ accuracy in command parsing
- Zero data loss from editing operations
- Undo functionality works 100% of the time

## Future Enhancements

- Voice commands for graph interaction
- AI-suggested corrections based on new information
- Conflict resolution UI when facts contradict
- Timeline view of fact changes
- Export/import knowledge graph
- Collaborative editing (multi-user)
- Version history for facts
- Smart suggestions: "Did you mean to update this related fact too?"

---

**Status**: Proposal  
**Created**: 2026-03-16  
**Author**: System  
**Priority**: High  
**Estimated Effort**: 5 weeks
