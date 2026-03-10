# Knowledge Graph System - Implementation Status

## ✅ Completed (Backend)

### Database Schema
- ✅ `medical.relationships` table with temporal support
- ✅ `medical.knowledge_graph_changes` audit log
- ✅ Added `metadata` column to `user_facts` for provider tracking
- ✅ Added `end_date` and `is_active` to facts for temporal tracking
- ✅ Database triggers for cascading updates
- ✅ View for current graph state
- ✅ Function to get graph at any point in time
- ✅ Function to get timeline events

### API Lambda (lazarus-api-relationships)
- ✅ List all relationships with filters
- ✅ Get relationships for specific fact
- ✅ Create relationship
- ✅ Update relationship (strength, active status, verification)
- ✅ Delete relationship
- ✅ Search facts by keyword
- ✅ Get knowledge graph (current or at timestamp)
- ✅ Get timeline events
- ✅ AI relationship extraction using Claude

### API Endpoints
Ready to deploy:
- `GET /relationships` - List all relationships
- `POST /relationships` - Create relationship
- `GET /relationships/{id}` - Get relationship details
- `PATCH /relationships/{id}` - Update relationship
- `DELETE /relationships/{id}` - Delete relationship
- `POST /relationships/extract` - AI extraction
- `GET /relationships/graph` - Get graph data
- `GET /relationships/timeline` - Get timeline events
- `GET /relationships/search?q=keyword` - Search facts

## 🚧 Next Steps

### 1. Deploy Backend (5 min)
```bash
./deploy-knowledge-graph.sh
```

### 2. Test AI Extraction (5 min)
```bash
curl -X POST $VITE_API_URL/relationships/extract
```

### 3. Frontend - React Flow Graph Component (4-6 hours)

**Install Dependencies:**
```bash
npm install reactflow
```

**Create Components:**
- `src/components/KnowledgeGraph.tsx` - Main graph component
- `src/components/graph/CustomNode.tsx` - Styled nodes for facts
- `src/components/graph/CustomEdge.tsx` - Styled edges for relationships
- `src/components/graph/TimelineSlider.tsx` - Temporal navigation
- `src/components/graph/GraphControls.tsx` - Filters and settings
- `src/components/graph/NodeDetailPanel.tsx` - Fact details on click

**Features to Implement:**
- Load graph data from API
- Custom nodes colored by fact type
- Custom edges with relationship labels
- Timeline slider for temporal navigation
- Pinch-to-zoom and pan gestures (mobile)
- Click node → show detail panel
- Click edge → show relationship details
- Filters: medical only, min strength, date range
- Auto-layout with force-directed algorithm
- Event markers on timeline

### 4. Chat Integration - Tool Calling (2-3 hours)

**Update `lambda/api-chat/index.mjs`:**

Add tools for graph management:
```javascript
tools: [
  {
    name: "create_relationship",
    description: "Create relationship between facts",
    input_schema: { ... }
  },
  {
    name: "update_relationship",
    description: "Update relationship strength/status",
    input_schema: { ... }
  },
  {
    name: "delete_relationship",
    description: "Remove relationship",
    input_schema: { ... }
  },
  {
    name: "search_facts",
    description: "Find facts by keyword",
    input_schema: { ... }
  },
  {
    name: "rebuild_graph",
    description: "Trigger AI relationship extraction",
    input_schema: { ... }
  }
]
```

**User can say:**
- "Connect my diabetes to metformin"
- "Remove the link between aspirin and headaches"
- "Show me everything related to my blood pressure"
- "Rebuild my knowledge graph"

### 5. Provider Extraction (1-2 hours)

**Update `lambda/api-memory/index.mjs`:**

Enhance fact extraction to identify:
- Doctor names (Dr. X, Physician Y)
- Facilities (Hospital, Clinic, Lab)
- Specialties
- Store in fact metadata:
```json
{
  "provider": {
    "name": "Dr. Sarah Johnson",
    "specialty": "Endocrinology",
    "facility": "City Medical Center"
  }
}
```

Create provider nodes in graph for frequently mentioned doctors.

### 6. Document-Based Fact Extraction (2-3 hours)

**Update `lambda/api-upload/index.mjs`:**

After OCR, extract medical facts:
- Medications mentioned
- Conditions/diagnoses
- Procedures performed
- Lab results
- Allergies noted
- Provider information

Store with `source: 'document'` and `source_document_id`.

## 📊 Graph Features

### Node Types
- **Medical Condition** (red circle)
- **Medication** (blue pill shape)
- **Allergy** (yellow warning triangle)
- **Procedure** (green square)
- **Provider** (purple person icon)
- **Facility** (gray building icon)

### Relationship Types
- **treats** - Medication treats condition
- **causes** - Condition causes symptom
- **contraindicates** - Allergy contraindicates medication
- **related_to** - General relationship
- **monitors** - Medication monitors condition
- **requires** - Condition requires procedure
- **prescribed_by** - Medication prescribed by provider
- **managed_by** - Condition managed by provider
- **works_at** - Provider works at facility

### Temporal Features
- Timeline slider shows graph evolution
- Event markers for key moments:
  - 🏥 New diagnosis
  - 💊 Medication started/stopped
  - 🔬 Major procedure
  - ⚠️ New allergy discovered
- Scrub through time to see past states
- "Play" button to animate changes
- Compare two time periods side-by-side

### Mobile Optimizations
- Pinch-to-zoom
- Swipe timeline to scrub
- Tap node → detail panel slides up
- Double-tap → center and highlight
- Long-press edge → edit relationship
- Floating action button for recenter

## 🎯 User Experience Flow

1. **Initial Load**
   - User opens Knowledge Graph tab
   - System loads current graph state
   - Shows all active facts and relationships
   - Timeline shows full history

2. **Exploration**
   - User pinches to zoom in on diabetes cluster
   - Taps "Type 2 Diabetes" node
   - Detail panel shows: diagnosis date, confidence, related facts
   - Sees connections to Metformin, Dr. Johnson, blood pressure

3. **Temporal Navigation**
   - User drags timeline slider to 2022
   - Graph morphs to show state at that time
   - Metformin node appears (started in 2022)
   - Connection to diabetes appears

4. **Chat Editing**
   - User says: "Actually, I stopped taking metformin last month"
   - AI updates fact: `end_date: '2026-02-10'`, `is_active: false`
   - AI deactivates relationships from metformin
   - Graph updates: metformin node grays out, connections become dashed
   - AI asks: "Should I note why you stopped?"

5. **AI Insights**
   - User says: "What changed in my health this year?"
   - AI analyzes graph changes since Jan 2026
   - Reports: "Added blood pressure diagnosis, started lisinopril, diabetes now well-controlled"
   - Shows before/after graph comparison

## 🔧 Technical Details

### Graph Data Structure
```typescript
interface GraphNode {
  id: string;
  type: 'condition' | 'medication' | 'allergy' | 'procedure' | 'provider';
  label: string;
  confidence: number;
  date: string;
  metadata: {
    provider?: {
      name: string;
      specialty: string;
    };
  };
  position?: { x: number; y: number };
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'treats' | 'causes' | 'contraindicates' | 'related_to';
  strength: number;
  reasoning: string;
  validFrom: string;
  validUntil?: string;
}
```

### Performance Considerations
- Lazy load graph data (only when tab is active)
- Cache graph layout positions
- Debounce timeline scrubbing
- Use React Flow's built-in virtualization for large graphs
- Limit visible nodes based on zoom level

### Accessibility
- Keyboard navigation (tab through nodes)
- Screen reader support for node/edge descriptions
- High contrast mode for relationships
- Text alternatives for visual indicators

## 📝 Testing Plan

1. **Backend Tests**
   - Create relationships via API
   - Update relationship strength
   - Delete relationships and verify cascade
   - AI extraction with sample facts
   - Temporal queries at different timestamps

2. **Frontend Tests**
   - Load graph with 50+ nodes
   - Timeline scrubbing performance
   - Mobile touch gestures
   - Node/edge click interactions
   - Filter and search functionality

3. **Integration Tests**
   - Chat creates relationship → graph updates
   - Fact deleted → relationships removed
   - Document uploaded → facts extracted → graph updated
   - Timeline shows correct historical state

## 🚀 Deployment Checklist

- [ ] Run database migration
- [ ] Deploy relationships Lambda
- [ ] Add API Gateway routes
- [ ] Test AI extraction endpoint
- [ ] Install React Flow in frontend
- [ ] Create graph components
- [ ] Add graph tab to profile page
- [ ] Integrate with chat for tool calling
- [ ] Test on mobile device
- [ ] Update documentation

## 💡 Future Enhancements

- Export graph as image/PDF
- Share graph with healthcare providers
- AI-suggested relationships for review
- Graph diff view (compare two time periods)
- Cluster analysis (identify related conditions)
- Predictive insights based on graph patterns
- Integration with wearable data
- Voice commands for graph navigation
