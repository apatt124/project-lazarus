import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './graph/CustomNode';
import CustomEdge from './graph/CustomEdge';
import GraphControls, { LayoutType } from './graph/GraphControls';
import NodeDetailPanel from './graph/NodeDetailPanel';
import { Theme } from '../lib/themes';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

interface KnowledgeGraphProps {
  userId: string;
  theme: Theme;
}

interface Relationship {
  id: string;
  source_fact_id: string;
  target_fact_id: string;
  relationship_type: string;
  strength: number;
  reasoning: string;
  category: string;
  is_medical: boolean;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  source_content: string;
  source_type: string;
  target_content: string;
  target_type: string;
}

interface TimelineEvent {
  event_date: string;
  event_type: string;
  description: string;
  fact_id: string;
}

const KnowledgeGraphInner: React.FC<KnowledgeGraphProps> = ({ userId, theme }) => {
  const { setCenter } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [filters, setFilters] = useState({
    showMedical: true,
    showGeneral: true,
    relationshipTypes: [] as string[],
    minStrength: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [allRelationships, setAllRelationships] = useState<Relationship[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Node[]>([]);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [layoutType, setLayoutType] = useState<LayoutType>('custom');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isGeneratingAILayout, setIsGeneratingAILayout] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL;

  // Function to calculate optimal handles based on node positions
  const calculateOptimalHandles = useCallback((sourceNode: Node, targetNode: Node) => {
    const dx = targetNode.position.x - sourceNode.position.x;
    const dy = targetNode.position.y - sourceNode.position.y;
    
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    
    let sourceHandle = 'source-right';
    let targetHandle = 'target-left';
    
    if (absX > absY) {
      if (dx > 0) {
        sourceHandle = 'source-right';
        targetHandle = 'target-left';
      } else {
        sourceHandle = 'source-left';
        targetHandle = 'target-right';
      }
    } else {
      if (dy > 0) {
        sourceHandle = 'source-bottom';
        targetHandle = 'target-top';
      } else {
        sourceHandle = 'source-top';
        targetHandle = 'target-bottom';
      }
    }
    
    return { sourceHandle, targetHandle };
  }, []);

  // Update edge handles when nodes move
  useEffect(() => {
    if (nodes.length === 0 || edges.length === 0) return;
    
    const updatedEdges = edges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const { sourceHandle, targetHandle } = calculateOptimalHandles(sourceNode, targetNode);
        return {
          ...edge,
          sourceHandle,
          targetHandle,
        };
      }
      return edge;
    });
    
    const handlesChanged = updatedEdges.some((edge, i) => 
      edge.sourceHandle !== edges[i].sourceHandle || 
      edge.targetHandle !== edges[i].targetHandle
    );
    
    if (handlesChanged) {
      setEdges(updatedEdges);
    }
  }, [nodes, edges, setEdges, calculateOptimalHandles]);

  // Load node positions from localStorage (separate storage for custom and AI)
  const loadNodePositions = useCallback((layoutType: LayoutType) => {
    const storageKey = layoutType === 'custom' 
      ? 'knowledgeGraphCustomLayout' 
      : 'knowledgeGraphAILayout';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to parse saved positions:', error);
        return {};
      }
    }
    return {};
  }, []);

  // Save node positions to localStorage
  const saveNodePositions = useCallback((nodes: Node[], layoutType: LayoutType) => {
    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach(node => {
      positions[node.id] = { x: node.position.x, y: node.position.y };
    });
    const storageKey = layoutType === 'custom' 
      ? 'knowledgeGraphCustomLayout' 
      : 'knowledgeGraphAILayout';
    localStorage.setItem(storageKey, JSON.stringify(positions));
  }, []);

  // Handle node drag end
  const handleNodeDragStop = useCallback((_event: React.MouseEvent, _node: Node, nodes: Node[]) => {
    if (layoutType === 'custom') {
      // In custom mode, auto-save to custom layout
      saveNodePositions(nodes, 'custom');
    } else {
      // In AI mode, mark as having unsaved changes
      setHasUnsavedChanges(true);
    }
  }, [layoutType, saveNodePositions]);

  // Save current positions as custom layout
  const handleSaveCustomLayout = useCallback(() => {
    saveNodePositions(nodes, 'custom');
    setLayoutType('custom');
    setHasUnsavedChanges(false);
  }, [nodes, saveNodePositions]);

  // Regenerate AI layout (clear cache and generate new)
  const handleRegenerateAILayout = useCallback(async () => {
    console.log('=== FRONTEND: Regenerating AI Layout ===');
    
    // Clear the saved AI layout from localStorage
    localStorage.removeItem('knowledgeGraphAILayout');
    
    setIsGeneratingAILayout(true);
    try {
      // Prepare graph data for AI
      const graphData = {
        userId: userId, // Pass userId for server-side caching
        nodes: nodes.map(n => ({
          id: n.id,
          content: n.data.content,
          type: n.data.type,
        })),
        edges: edges.map(e => ({
          source: e.source,
          target: e.target,
          relationshipType: e.data?.relationshipType,
          strength: e.data?.strength,
        })),
        forceRegenerate: true // Force regeneration, bypass cache
      };
      
      console.log('Requesting new AI layout for', graphData.nodes.length, 'nodes (force regenerate)');
      
      const response = await fetch(`${API_BASE}/relationships/ai-layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphData),
      });
      
      const result = await response.json();
      
      console.log('AI Layout regeneration response:', result.success);
      
      if (result.success && result.positions) {
        // Save the new positions to localStorage
        const positions: Record<string, { x: number; y: number }> = {};
        Object.entries(result.positions).forEach(([nodeId, pos]: [string, any]) => {
          positions[nodeId] = { x: pos.x, y: pos.y };
        });
        localStorage.setItem('knowledgeGraphAILayout', JSON.stringify(positions));
        
        // Update nodes with new positions
        setNodes((currentNodes) => 
          currentNodes.map(node => {
            const newPos = positions[node.id];
            if (newPos) {
              return {
                ...node,
                position: { x: newPos.x, y: newPos.y },
              };
            }
            return node;
          })
        );
        
        console.log('AI layout regenerated and cached on server successfully');
      } else {
        console.error('AI layout regeneration failed:', result.error);
        alert(`Failed to regenerate AI layout: ${result.error || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      console.error('Error regenerating AI layout:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to regenerate AI layout: ${errorMessage}`);
    } finally {
      setIsGeneratingAILayout(false);
    }
  }, [nodes, edges, API_BASE, userId, setNodes]);

  // Handle layout change
  const handleLayoutChange = useCallback(async (layout: LayoutType) => {
    console.log('=== FRONTEND: Layout Change Requested ===', layout);
    
    // If switching to AI layout, check if we need to generate it
    if (layout === 'ai') {
      setIsGeneratingAILayout(true);
      try {
        console.log('=== FRONTEND: Requesting AI Layout ===');
        
        // Prepare graph data for AI
        const graphData = {
          userId: userId, // Pass userId for server-side caching
          nodes: nodes.map(n => ({
            id: n.id,
            content: n.data.content,
            type: n.data.type,
          })),
          edges: edges.map(e => ({
            source: e.source,
            target: e.target,
            relationshipType: e.data?.relationshipType,
            strength: e.data?.strength,
          })),
          forceRegenerate: false // Use cache if available
        };
        
        console.log('Graph data being sent:', {
          userId: graphData.userId,
          nodeCount: graphData.nodes.length,
          edgeCount: graphData.edges.length,
          forceRegenerate: graphData.forceRegenerate
        });
        
        const response = await fetch(`${API_BASE}/relationships/ai-layout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(graphData),
        });
        
        const result = await response.json();
        
        console.log('=== FRONTEND: AI Layout Response ===');
        console.log('Success:', result.success);
        console.log('Cached:', result.cached);
        console.log('Positions received:', result.positions ? Object.keys(result.positions).length : 0);
        
        if (result.success && result.positions) {
          // Save to localStorage as backup
          const positions: Record<string, { x: number; y: number }> = {};
          Object.entries(result.positions).forEach(([nodeId, pos]: [string, any]) => {
            positions[nodeId] = { x: pos.x, y: pos.y };
          });
          localStorage.setItem('knowledgeGraphAILayout', JSON.stringify(positions));
          console.log(result.cached ? 'Loaded from server cache' : 'Generated new layout and cached on server');
        } else {
          console.error('AI layout generation failed:', result.error);
          alert(`AI layout failed: ${result.error || 'Unknown error'}`);
          setIsGeneratingAILayout(false);
          return; // Don't change layout type if generation failed
        }
      } catch (error: unknown) {
        console.error('=== FRONTEND: AI Layout Error ===');
        console.error('Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check if it's a timeout or network error
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('timeout')) {
          alert(`AI layout generation timed out. This can happen with large graphs (${nodes.length} nodes). Try using Custom layout instead, or wait a moment and try again - the layout may have been cached on the server.`);
        } else {
          alert(`Failed to generate AI layout: ${errorMessage}`);
        }
        
        setIsGeneratingAILayout(false);
        return; // Don't change layout type if generation failed
      } finally {
        setIsGeneratingAILayout(false);
      }
    }
    
    // Now change the layout type, which will trigger the useEffect to apply positions
    setLayoutType(layout);
    setHasUnsavedChanges(false);
  }, [nodes, edges, API_BASE, userId]);

  // Fetch timeline events
  useEffect(() => {
    const fetchTimelineEvents = async () => {
      try {
        const response = await fetch(`${API_BASE}/relationships/timeline`);
        const data = await response.json();
        if (data.success) {
          setTimelineEvents(data.events);
        }
      } catch (error) {
        console.error('Failed to fetch timeline events:', error);
      }
    };
    fetchTimelineEvents();
  }, [API_BASE]);

  // Fetch graph data
  useEffect(() => {
    const fetchGraphData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE}/relationships/graph?minStrength=${filters.minStrength}`);
        const data = await response.json();

        if (data.success) {
          setAllRelationships(data.relationships);
        }
      } catch (error) {
        console.error('Failed to fetch graph data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGraphData();
  }, [API_BASE, filters.minStrength]);

  // Apply filters and update graph
  useEffect(() => {
    if (allRelationships.length === 0) return;

    // Filter relationships
    let filteredRelationships = allRelationships.filter((rel) => {
      if (!filters.showMedical && rel.is_medical) return false;
      if (!filters.showGeneral && !rel.is_medical) return false;
      if (parseFloat(rel.strength.toString()) < filters.minStrength) return false;
      if (filters.relationshipTypes.length > 0 && !filters.relationshipTypes.includes(rel.relationship_type)) {
        return false;
      }

      // Temporal filtering
      const validFrom = new Date(rel.valid_from);
      const validUntil = rel.valid_until ? new Date(rel.valid_until) : new Date();
      if (currentTime < validFrom || currentTime > validUntil) {
        return false;
      }

      return true;
    });

    // Build nodes from filtered relationships
    const factMap = new Map<string, any>();
    filteredRelationships.forEach((rel) => {
      if (!factMap.has(rel.source_fact_id)) {
        factMap.set(rel.source_fact_id, {
          id: rel.source_fact_id,
          content: rel.source_content,
          type: rel.source_type,
        });
      }
      if (!factMap.has(rel.target_fact_id)) {
        factMap.set(rel.target_fact_id, {
          id: rel.target_fact_id,
          content: rel.target_content,
          type: rel.target_type,
        });
      }
    });

    const savedPositions = loadNodePositions(layoutType);

    const nodeArray = Array.from(factMap.values());
    const graphNodes: Node[] = [];
    const centerX = 500;
    const centerY = 400;

    // Apply layout based on selected type
    if (layoutType === 'custom') {
      // Custom layout: use saved positions, fall back to AI if none exist
      const hasCustomPositions = Object.keys(savedPositions).length > 0;
      
      if (hasCustomPositions) {
        nodeArray.forEach((fact) => {
          const savedPos = savedPositions[fact.id];
          if (savedPos) {
            graphNodes.push({
              id: fact.id,
              type: 'custom',
              position: { x: savedPos.x, y: savedPos.y },
              data: {
                content: fact.content,
                type: fact.type,
                highlighted: highlightedNodes.has(fact.id),
              },
            });
          }
        });
      }
      
      // If no custom positions or some nodes missing, use AI layout for those
      if (!hasCustomPositions || graphNodes.length < nodeArray.length) {
        // Fall through to AI layout for missing nodes
      } else {
        // All nodes positioned, skip to edges
      }
    }
    
    if (layoutType === 'ai' || (layoutType === 'custom' && graphNodes.length < nodeArray.length)) {
      // AI-Optimized layout: use saved AI positions or wait for API call
      const positionedIds = new Set(graphNodes.map(n => n.id));
      const nodesToPosition = nodeArray.filter(n => !positionedIds.has(n.id));
      
      // Check if we have saved AI positions
      const hasSavedAIPositions = Object.keys(savedPositions).length > 0;
      
      if (layoutType === 'ai' && hasSavedAIPositions) {
        // Use saved AI positions
        nodeArray.forEach((fact) => {
          const savedPos = savedPositions[fact.id];
          if (savedPos) {
            graphNodes.push({
              id: fact.id,
              type: 'custom',
              position: { x: savedPos.x, y: savedPos.y },
              data: {
                content: fact.content,
                type: fact.type,
                highlighted: highlightedNodes.has(fact.id),
              },
            });
          }
        });
      } else if (layoutType === 'ai' && !hasSavedAIPositions) {
        // AI layout requested but no positions yet - use temporary fallback
        // The handleLayoutChange function will call the API and update positions
        nodeArray.forEach((fact, index) => {
          const angle = (index / nodeArray.length) * 2 * Math.PI;
          const radius = 400;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          graphNodes.push({
            id: fact.id,
            type: 'custom',
            position: { x, y },
            data: {
              content: fact.content,
              type: fact.type,
              highlighted: highlightedNodes.has(fact.id),
            },
          });
        });
      } else if (layoutType === 'custom' && nodesToPosition.length > 0) {
        // Custom layout with some missing nodes - use simple circular for new ones
        nodesToPosition.forEach((fact, index) => {
          const angle = (index / nodesToPosition.length) * 2 * Math.PI;
          const radius = 400;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          graphNodes.push({
            id: fact.id,
            type: 'custom',
            position: { x, y },
            data: {
              content: fact.content,
              type: fact.type,
              highlighted: highlightedNodes.has(fact.id),
            },
          });
        });
      }
    }

    // Create edges
    const graphEdges: Edge[] = filteredRelationships.map((rel) => {
      const sourceNode = graphNodes.find(n => n.id === rel.source_fact_id);
      const targetNode = graphNodes.find(n => n.id === rel.target_fact_id);
      
      let sourceHandle = 'source-right';
      let targetHandle = 'target-left';
      
      if (sourceNode && targetNode) {
        const handles = calculateOptimalHandles(sourceNode, targetNode);
        sourceHandle = handles.sourceHandle;
        targetHandle = handles.targetHandle;
      }
      
      return {
        id: rel.id,
        source: rel.source_fact_id,
        target: rel.target_fact_id,
        sourceHandle,
        targetHandle,
        type: 'custom',
        data: {
          relationshipType: rel.relationship_type,
          strength: parseFloat(rel.strength.toString()),
          reasoning: rel.reasoning,
          category: rel.category,
          isMedical: rel.is_medical,
        },
      };
    });

    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [allRelationships, filters, currentTime, highlightedNodes, layoutType, setNodes, setEdges, calculateOptimalHandles, loadNodePositions]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === node.id,
      }))
    );
  }, [setNodes]);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: false,
      }))
    );
  }, [setNodes]);

  const handleNodeSelect = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === nodeId,
        }))
      );
      const x = node.position.x + (node.width || 220) / 2;
      const y = node.position.y + (node.height || 56) / 2;
      setCenter(x, y, { zoom: 1, duration: 800 });
    }
  }, [nodes, setCenter, setNodes]);

  const handleTimeChange = useCallback((date: Date) => {
    setCurrentTime(date);
  }, []);

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setHighlightedNodes(new Set());
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = nodes.filter(node => 
      node.data.content.toLowerCase().includes(lowerQuery) ||
      node.data.type.toLowerCase().includes(lowerQuery)
    );
    
    setSearchResults(results);
    setHighlightedNodes(new Set(results.map(n => n.id)));
  }, [nodes]);

  const handleSearchResultClick = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === nodeId,
        }))
      );
      const x = node.position.x + (node.width || 220) / 2;
      const y = node.position.y + (node.height || 56) / 2;
      setCenter(x, y, { zoom: 1, duration: 800 });
    }
  }, [nodes, setCenter, setNodes]);

  return (
    <div className="h-full w-full relative bg-gray-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          animated: false,
        }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        panOnDrag={true}
        panOnScroll={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
      >
        <Background color="#444" gap={16} size={1} />
        <Controls showInteractive={false} showFitView={false} showZoom={true} />
        <MiniMap 
          nodeColor={(node) => {
            const type = node.data.type;
            const colors: Record<string, string> = {
              medical_condition: '#ef4444',
              symptom: '#f97316',
              medication: '#3b82f6',
              allergy: '#eab308',
              procedure: '#a855f7',
              test_result: '#22c55e',
              lifestyle: '#14b8a6',
              family_history: '#ec4899',
              provider: '#6366f1',
            };
            return colors[type] || '#6b7280';
          }}
          maskColor="rgba(0, 0, 0, 0.6)"
          style={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
          }}
        />
      </ReactFlow>

      {/* Graph Controls Sidebar - Outside ReactFlow for proper z-index */}
      <GraphControls 
        filters={filters} 
        onFilterChange={handleFilterChange}
        currentTime={currentTime}
        timelineEvents={timelineEvents}
        onTimeChange={handleTimeChange}
        searchQuery={searchQuery}
        searchResults={searchResults.map(n => ({
          id: n.id,
          content: n.data.content,
          type: n.data.type,
        }))}
        onSearch={handleSearch}
        onSearchResultClick={handleSearchResultClick}
        layoutType={layoutType}
        onLayoutChange={handleLayoutChange}
        hasUnsavedChanges={hasUnsavedChanges}
        onSaveCustomLayout={handleSaveCustomLayout}
        onRegenerateAILayout={handleRegenerateAILayout}
        isGeneratingAILayout={isGeneratingAILayout}
        theme={theme}
      />

      {selectedNode && createPortal(
        <>
          <div 
            className="fixed inset-0 pointer-events-auto"
            style={{ 
              zIndex: 2147483647,
              backgroundColor: 'transparent'
            }}
            onClick={() => setSelectedNode(null)}
          />
          <div 
            style={{ 
              position: 'fixed',
              top: '80px',
              right: '16px',
              maxHeight: 'calc(100vh - 200px)',
              zIndex: 2147483647,
              pointerEvents: 'auto',
            }}
          >
            <NodeDetailPanel
              node={selectedNode}
              edges={edges}
              nodes={nodes}
              onClose={() => setSelectedNode(null)}
              onNodeSelect={handleNodeSelect}
            />
          </div>
        </>,
        document.body
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading knowledge graph...</p>
          </div>
        </div>
      )}
    </div>
  );
};

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <KnowledgeGraphInner {...props} />
    </ReactFlowProvider>
  );
};

export default KnowledgeGraph;
