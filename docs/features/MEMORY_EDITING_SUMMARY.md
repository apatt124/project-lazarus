# Memory & Fact Editing System - Executive Summary

## Problem

Users reported that memory editing commands like "I was never prescribed this drug" don't persist, and there's no way to edit the knowledge graph through chat or modify facts/connections directly from the graph UI.

## Root Causes

1. **No command parsing**: Chat doesn't detect memory/fact editing intents
2. **No graph interaction**: Knowledge graph is view-only, no editing capabilities
3. **Missing UI**: No interface to edit facts/relationships from graph nodes
4. **No persistence**: Changes aren't properly saved or reflected across the system

## Proposed Solution

A comprehensive 5-phase implementation that adds:
- Natural language command parsing for memory operations
- Integrated chat interface in the knowledge graph
- Node editing UI with context menus and modals
- Relationship management system
- Undo/redo functionality

## Key Features

### 1. Chat Commands
```
"forget that I take Metformin"
"I was never prescribed Lisinopril"
"update my diabetes medication"
"show me all my medications"
```

### 2. Knowledge Graph Chat
- Collapsible chat panel in graph view
- Commands highlight relevant nodes
- Real-time visual feedback
- Graph-specific queries

### 3. Node Editing
- Right-click context menu on nodes
- Inline editing modal
- Confidence adjustment
- Source viewing
- Relationship management

### 4. Relationship Editor
- Create connections between facts
- Edit relationship types (treats, causes, etc.)
- Adjust relationship confidence
- Visual relationship updates

### 5. Undo System
- 30-day soft delete
- Restore deleted items
- Command history
- Batch undo

## Architecture

### Frontend Components
```
components/
├── ChatInterface.tsx (enhanced with command detection)
├── KnowledgeGraph.tsx (add chat panel)
├── graph/
│   ├── NodeContextMenu.tsx (new)
│   ├── NodeEditModal.tsx (new)
│   ├── RelationshipEditor.tsx (new)
│   └── GraphChatPanel.tsx (new)
└── UserFactsPanel.tsx (existing, minor updates)
```

### Backend APIs
```
app/api/
├── memory-commands/route.ts (new)
├── relationships/route.ts (new)
└── chat/route.ts (enhanced)

lambda/
└── api-memory/index.mjs (enhanced)
```

### Database Schema
```sql
-- New tables
medical.fact_relationships
medical.memory_commands
medical.deleted_items (for undo)
```

## Implementation Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1. Command Parser | 1 week | Basic "forget" commands working |
| 2. Graph Chat | 1 week | Chat panel in graph, node highlighting |
| 3. Node Editing | 1 week | Context menu, edit modal, visual feedback |
| 4. Relationships | 1 week | Create/edit/delete relationships |
| 5. Polish | 1 week | Undo system, batch ops, testing |

**Total**: 5 weeks

## Technical Decisions

### Why Natural Language Commands?
- More intuitive than UI-only approach
- Matches user mental model ("just tell it what to do")
- Leverages existing chat interface
- Can be enhanced with AI over time

### Why Soft Deletes?
- Allows undo functionality
- Maintains data integrity
- Enables audit trail
- Prevents accidental data loss

### Why Graph Integration?
- Visual context helps users understand relationships
- Easier to spot errors in visual format
- Natural place for relationship editing
- Complements chat-based editing

## Success Metrics

- ✅ 95%+ command parsing accuracy
- ✅ <2s response time for graph chat
- ✅ <500ms modal load time
- ✅ Zero data loss from editing operations
- ✅ 100% undo success rate
- ✅ User satisfaction with editing workflow

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Accidental deletions | Confirmation flow + undo system |
| Data inconsistency | Soft deletes + validation |
| Performance issues | Optimistic UI updates + caching |
| Complex commands | Start simple, iterate based on usage |
| Graph rendering lag | Debounce updates, batch operations |

## User Experience Flow

### Example: Correcting a Medication

```
1. User: "I was never prescribed Metformin"
   ↓
2. AI: Shows 2 matching facts, asks for confirmation
   ↓
3. User: "yes"
   ↓
4. System: Deletes facts, updates graph, shows undo button
   ↓
5. User sees: "✓ Removed 2 facts. [Undo]"
```

### Example: Editing from Graph

```
1. User right-clicks "Metformin" node
   ↓
2. Context menu appears
   ↓
3. User clicks "Edit Fact"
   ↓
4. Modal opens with fact details
   ↓
5. User changes dosage, adjusts confidence
   ↓
6. User clicks "Save"
   ↓
7. Node updates with animation
   ↓
8. Change logged in conversation
```

## Documentation

Created comprehensive documentation:

1. **CHAT_MEMORY_EDITING.md** (this file)
   - Full technical proposal
   - Architecture details
   - API specifications
   - Database schema

2. **MEMORY_EDITING_UI_MOCKUPS.md**
   - Visual mockups (ASCII art)
   - Layout options
   - Component designs
   - Color coding system
   - Accessibility features

3. **IMPLEMENTING_MEMORY_EDITING.md**
   - Step-by-step implementation guide
   - Code examples
   - Testing procedures
   - Common issues & solutions

## Dependencies

### Required
- Existing memory API (`/memory/facts`, `/memory/memories`)
- Knowledge graph component
- Chat interface
- Database with user_facts and memory_embeddings tables

### Optional (Future)
- AI-powered command parsing (Claude/GPT)
- Voice command support
- Multi-user collaboration
- Version control system

## Security Considerations

- ✅ Validate all user inputs
- ✅ Require confirmation for destructive operations
- ✅ Log all modifications (audit trail)
- ✅ Rate limit command endpoints
- ✅ Sanitize entity extraction
- ✅ Prevent SQL injection in searches
- ✅ Implement RBAC for multi-user (future)

## Performance Optimizations

- Optimistic UI updates (instant feedback)
- Debounced graph updates
- Cached command parsing results
- Batch API operations
- Lazy load deleted items
- Virtual scrolling for large lists

## Accessibility

- Keyboard shortcuts for all operations
- Screen reader announcements
- High contrast mode support
- Focus management in modals
- ARIA labels on interactive elements
- Reduced motion option

## Testing Strategy

### Unit Tests
- Command parser with various patterns
- Entity extraction accuracy
- API endpoint responses
- Component rendering

### Integration Tests
- End-to-end command flow
- Graph updates after edits
- Undo/redo functionality
- Multi-step confirmations

### User Testing
- Command discoverability
- Confirmation flow clarity
- Graph editing intuitiveness
- Error recovery

## Future Enhancements

### Short Term (3-6 months)
- Voice commands
- AI-suggested corrections
- Conflict resolution UI
- Timeline view of changes

### Long Term (6-12 months)
- Export/import knowledge graph
- Collaborative editing
- Version history
- Smart suggestions
- Natural language relationship queries

## Cost Analysis

### Development Time
- 5 weeks × 1 developer = 5 person-weeks
- Estimated cost: $15,000 - $25,000 (depending on rates)

### Infrastructure
- No additional AWS costs (uses existing Lambda/RDS)
- Minimal storage increase (soft deletes)
- No new third-party services required

### Maintenance
- Low ongoing maintenance (well-architected)
- Self-documenting code
- Comprehensive tests

## Alternatives Considered

### 1. UI-Only Editing (No Chat Commands)
**Pros**: Simpler to implement, more predictable
**Cons**: Less intuitive, requires more clicks, doesn't match user mental model
**Decision**: Rejected - chat commands are core to user request

### 2. Hard Deletes (No Undo)
**Pros**: Simpler database, no cleanup needed
**Cons**: Accidental data loss, no recovery, poor UX
**Decision**: Rejected - undo is critical for user confidence

### 3. Separate Graph Editor Page
**Pros**: More space, dedicated UI
**Cons**: Context switching, fragmented experience
**Decision**: Rejected - integrated approach is better

## Stakeholder Sign-Off

- [ ] Product Owner: Approved
- [ ] Engineering Lead: Approved
- [ ] UX Designer: Approved
- [ ] Security Team: Approved
- [ ] QA Lead: Approved

## Next Steps

1. **Review** this proposal with team
2. **Refine** based on feedback
3. **Prioritize** phases (can we do Phase 1 first?)
4. **Assign** developer(s)
5. **Create** tickets in project management system
6. **Begin** Phase 1 implementation
7. **Iterate** based on user feedback

## Questions to Resolve

1. Should we support batch operations in Phase 1 or defer to Phase 5?
2. What's the priority: chat commands or graph editing?
3. Do we need AI-powered command parsing or is regex sufficient?
4. Should undo be 30 days or configurable?
5. Do we need admin approval for certain deletions?

## Contact

For questions or feedback on this proposal:
- Technical questions: Engineering team
- UX questions: Design team
- Product questions: Product owner

---

**Status**: Proposal - Awaiting Review  
**Created**: 2026-03-16  
**Last Updated**: 2026-03-16  
**Version**: 1.0  
**Priority**: High  
**Complexity**: Medium-High  
**Estimated Effort**: 5 weeks  
**Risk Level**: Low-Medium
