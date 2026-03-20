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
import { calculateForceDirectedLayout } from '../lib/forceDirectedLayout';
import { calculateRadialLayout } from '../lib/radialLayout';
import { calculateHierarchicalClusterLayout } from '../lib/hierarchicalClusterLayout';
import { calculateIterativeRefinementLayout } from '../lib/iterativeRefinementLayout';
import { calculateMagneticClusterLayout, updateClusterPosition } from '../lib/magneticClusterLayout';

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
    noteTypes: [] as string[], // New: filter by fact types
    minStrength: 0.7, // Increased default to reduce clutter
    maxConnectionsPerNode: 50, // New: limit connections per node
  });
  const [isLoading, setIsLoading] = useState(true);
  const [allRelationships, setAllRelationships] = useState<Relationship[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Node[]>([]);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [manuallyShownNodes, setManuallyShownNodes] = useState<Set<string>>(new Set()); // New: nodes shown by clicking connections
  const [layoutType, setLayoutType] = useState<LayoutType>('custom');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isGeneratingAILayout, setIsGeneratingAILayout] = useState(false);
  const [layoutRecalcTrigger, setLayoutRecalcTrigger] = useState(0); // Increment to trigger recalc
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set()); // Track expanded clusters for magnetic layout
  const [clusterInfo, setClusterInfo] = useState<Map<string, any>>(new Map()); // Store cluster data for magnetic layout
  const [magneticClusterPositions, setMagneticClusterPositions] = useState<Record<string, { x: number; y: number }>>({}); // Store user-adjusted positions for magnetic layout
  const [magneticClusterOffsets, setMagneticClusterOffsets] = useState<Record<string, { dx: number; dy: number; anchorId: string }>>({}); // Store relative offsets from anchor
  const [magneticClusterMode, setMagneticClusterMode] = useState<'toggle' | 'navigate'>('toggle'); // Mode for magnetic cluster interaction
  const clusterInfoRef = React.useRef<Map<string, any>>(new Map()); // Ref to persist cluster info across renders

  // Use Lambda API directly (Vite app, not Next.js)
  const API_BASE = import.meta.env.VITE_API_URL;

  // Callback for magnetic cluster node clicks
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
  const handleNodeDragStop = useCallback((_event: React.MouseEvent, draggedNode: Node, nodes: Node[]) => {
    // If in magnetic cluster layout and dragging an anchor, update cluster positions
    if (layoutType === 'magnetic-cluster') {
      const cluster = clusterInfoRef.current.get(draggedNode.id);
      if (cluster) {
        // This is an anchor node - save its position
        console.log(`Anchor ${draggedNode.id} dragged to (${draggedNode.position.x}, ${draggedNode.position.y})`);
        setMagneticClusterPositions(prev => ({
          ...prev,
          [draggedNode.id]: draggedNode.position,
        }));
        
        // If cluster is expanded, update positions of connected nodes to move with anchor
        const isExpanded = expandedClusters.has(draggedNode.id);
        console.log(`Cluster ${draggedNode.id} is ${isExpanded ? 'expanded' : 'collapsed'}`);
        
        if (isExpanded) {
          // Load parameters for cluster radius
          const savedParams = localStorage.getItem('graphLayoutParams');
          let clusterRadius = 250;
          if (savedParams) {
            try {
              const allParams = JSON.parse(savedParams);
              if (allParams['magnetic-cluster']?.clusterRadius) {
                clusterRadius = allParams['magnetic-cluster'].clusterRadius;
              }
            } catch (e) {
              console.error('Failed to parse layout params:', e);
            }
          }
          
          // Calculate new positions for connected nodes based on new anchor position
          const updatedPositions = updateClusterPosition(
            draggedNode.id,
            draggedNode.position,
            cluster,
            clusterRadius
          );
          
          console.log(`Updated ${updatedPositions.size} connected node positions`);
          
          // Save all updated positions (anchor + connected nodes)
          setMagneticClusterPositions(prev => {
            const newPositions = { ...prev };
            updatedPositions.forEach((pos, nodeId) => {
              newPositions[nodeId] = pos;
            });
            return newPositions;
          });
          
          // Update offsets for all connected nodes relative to new anchor position
          setMagneticClusterOffsets(prev => {
            const newOffsets = { ...prev };
            updatedPositions.forEach((pos, nodeId) => {
              newOffsets[nodeId] = {
                dx: pos.x - draggedNode.position.x,
                dy: pos.y - draggedNode.position.y,
                anchorId: draggedNode.id,
              };
            });
            return newOffsets;
          });
          
          // Apply updated positions to visible nodes immediately
          setNodes((currentNodes) =>
            currentNodes.map(node => {
              const newPos = updatedPositions.get(node.id);
              if (newPos) {
                return {
                  ...node,
                  position: { x: newPos.x, y: newPos.y },
                };
              }
              return node;
            })
          );
        } else {
          console.log(`Cluster collapsed - only anchor position saved, connected node positions will be recalculated on re-expansion`);
          // When cluster is collapsed and anchor moves, we should NOT save absolute positions for connected nodes
          // The offsets will be applied when re-expanded
          // Clear any saved absolute positions for connected nodes to avoid confusion
          setMagneticClusterPositions(prev => {
            const newPositions = { ...prev };
            cluster.connectedNodes.forEach((nodeId: string) => {
              delete newPositions[nodeId];
            });
            return newPositions;
          });
        }
        // If cluster is collapsed, don't touch offsets - they'll be applied when re-expanded
      } else {
        // Check if this is a connected node (has an anchor)
        const offset = magneticClusterOffsets[draggedNode.id];
        if (offset) {
          // This is a connected node - update its offset relative to its anchor
          const anchorNode = nodes.find(n => n.id === offset.anchorId);
          if (anchorNode) {
            const newOffset = {
              dx: draggedNode.position.x - anchorNode.position.x,
              dy: draggedNode.position.y - anchorNode.position.y,
              anchorId: offset.anchorId,
            };
            setMagneticClusterOffsets(prev => ({
              ...prev,
              [draggedNode.id]: newOffset,
            }));
          }
        } else {
          // Not an anchor or connected node, just save absolute position
          setMagneticClusterPositions(prev => ({
            ...prev,
            [draggedNode.id]: draggedNode.position,
          }));
        }
      }
      return; // Don't trigger other save logic for magnetic layout
    }
    
    if (layoutType === 'custom') {
      // In custom mode, auto-save to custom layout
      saveNodePositions(nodes, 'custom');
    } else {
      // In AI mode, mark as having unsaved changes
      setHasUnsavedChanges(true);
    }
  }, [layoutType, saveNodePositions, setNodes, expandedClusters]);

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
      } catch (error) {
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
      if (!API_BASE) {
        console.warn('API_BASE not configured - skipping timeline fetch');
        return;
      }
      
      try {
        const response = await fetch(`${API_BASE}/relationships/timeline`);
        const data = await response.json();
        if (data.success) {
          setTimelineEvents(data.events);
        }
      } catch (error) {
        // Silently fail - CORS/Lambda issue documented in docs/fixes/LAMBDA_CORS_ISSUE.md
        console.warn('Timeline fetch failed (CORS/Lambda issue):', error instanceof Error ? error.message : String(error));
      }
    };
    fetchTimelineEvents();
  }, [API_BASE]);

  // Fetch graph data
  useEffect(() => {
    const fetchGraphData = async () => {
      if (!API_BASE) {
        console.warn('API_BASE not configured - skipping graph fetch');
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE}/relationships/graph?minStrength=${filters.minStrength}`);
        const data = await response.json();

        if (data.success) {
          setAllRelationships(data.relationships);
        }
      } catch (error) {
        // Silently fail - CORS/Lambda issue documented in docs/fixes/LAMBDA_CORS_ISSUE.md
        console.warn('Graph fetch failed (CORS/Lambda issue):', error instanceof Error ? error.message : String(error));
        setAllRelationships([]); // Set empty array to show "no data" message
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

    // Limit connections per node to prevent performance issues
    if (filters.maxConnectionsPerNode > 0) {
      const nodeConnectionCount = new Map<string, number>();
      const sortedRels = [...filteredRelationships].sort((a, b) => 
        parseFloat(b.strength.toString()) - parseFloat(a.strength.toString())
      );
      
      filteredRelationships = sortedRels.filter((rel) => {
        const sourceCount = nodeConnectionCount.get(rel.source_fact_id) || 0;
        const targetCount = nodeConnectionCount.get(rel.target_fact_id) || 0;
        
        if (sourceCount >= filters.maxConnectionsPerNode && targetCount >= filters.maxConnectionsPerNode) {
          return false; // Both nodes at limit
        }
        
        // Keep this relationship and increment counts
        nodeConnectionCount.set(rel.source_fact_id, sourceCount + 1);
        nodeConnectionCount.set(rel.target_fact_id, targetCount + 1);
        return true;
      });
    }

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

    // Apply note type filters (but keep manually shown nodes)
    if (filters.noteTypes.length > 0) {
      const filteredFactMap = new Map<string, any>();
      factMap.forEach((fact, id) => {
        // Keep if matches filter OR is manually shown
        if (filters.noteTypes.includes(fact.type) || manuallyShownNodes.has(id)) {
          filteredFactMap.set(id, fact);
        }
      });
      factMap.clear();
      filteredFactMap.forEach((fact, id) => factMap.set(id, fact));
    } else {
      // No note type filter, but still include manually shown nodes
      // (they're already in factMap from relationships)
    }

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
    } else if (layoutType === 'force-directed') {
      // Force-Directed layout: calculate positions using physics simulation
      console.log('Calculating force-directed layout for', nodeArray.length, 'nodes');
      
      // Load parameters from localStorage
      const savedParams = localStorage.getItem('graphLayoutParams');
      let params = {
        nodeSpacing: 420,
        edgeLength: 300,
        repulsionStrength: 200000,
        attractionStrength: 0.05,
        damping: 0.88,
        iterations: 400,
      };
      
      if (savedParams) {
        try {
          const allParams = JSON.parse(savedParams);
          if (allParams['force-directed']) {
            params = { ...params, ...allParams['force-directed'] };
          }
        } catch (e) {
          console.error('Failed to parse layout params:', e);
        }
      }
      
      // Dynamic canvas sizing based on node count
      const nodeCount = nodeArray.length;
      const baseSize = Math.sqrt(nodeCount) * 400;
      const minSize = 2000;
      const maxSize = 15000;
      const canvasWidth = Math.max(minSize, Math.min(maxSize, baseSize));
      const canvasHeight = Math.max(minSize, Math.min(maxSize, baseSize * 0.8));
      
      const density = nodeCount / (canvasWidth * canvasHeight / 1000000);
      const spacingMultiplier = density > 0.5 ? 0.8 : 1.0;
      
      console.log(`Canvas: ${canvasWidth}x${canvasHeight}, Density: ${density.toFixed(3)}, Nodes: ${nodeCount}`);
      console.log('Using params:', params);
      
      const positions = calculateForceDirectedLayout(
        nodeArray.map(f => ({ id: f.id })),
        filteredRelationships.map(r => ({
          source: r.source_fact_id,
          target: r.target_fact_id,
          strength: parseFloat(r.strength.toString()),
        })),
        {
          width: canvasWidth,
          height: canvasHeight,
          iterations: Math.min(600, params.iterations + nodeCount * 2),
          nodeSpacing: params.nodeSpacing * spacingMultiplier,
          edgeLength: params.edgeLength * spacingMultiplier,
          repulsionStrength: params.repulsionStrength,
          attractionStrength: params.attractionStrength,
          damping: params.damping,
        }
      );
      
      nodeArray.forEach((fact) => {
        const pos = positions[fact.id];
        if (pos) {
          graphNodes.push({
            id: fact.id,
            type: 'custom',
            position: { x: pos.x, y: pos.y },
            data: {
              content: fact.content,
              type: fact.type,
              highlighted: highlightedNodes.has(fact.id),
            },
          });
        }
      });
      
      console.log('Force-directed layout complete:', graphNodes.length, 'nodes positioned');
    } else if (layoutType === 'radial') {
      // Radial layout: hub nodes in center with connected nodes radiating outward
      console.log('Calculating radial layout for', nodeArray.length, 'nodes');
      
      // Load parameters from localStorage
      const savedParams = localStorage.getItem('graphLayoutParams');
      let params = {
        centerRadius: 300,
        ringSpacing: 350,
        nodeSpacing: 280,
      };
      
      if (savedParams) {
        try {
          const allParams = JSON.parse(savedParams);
          if (allParams['radial']) {
            params = { ...params, ...allParams['radial'] };
          }
        } catch (e) {
          console.error('Failed to parse layout params:', e);
        }
      }
      
      // Use same dynamic canvas sizing
      const nodeCount = nodeArray.length;
      const baseSize = Math.sqrt(nodeCount) * 400;
      const minSize = 2000;
      const maxSize = 15000;
      const canvasWidth = Math.max(minSize, Math.min(maxSize, baseSize));
      const canvasHeight = Math.max(minSize, Math.min(maxSize, baseSize * 0.8));
      
      console.log(`Canvas: ${canvasWidth}x${canvasHeight}, Nodes: ${nodeCount}`);
      console.log('Using params:', params);
      
      const positions = calculateRadialLayout(
        nodeArray.map(f => ({ id: f.id })),
        filteredRelationships.map(r => ({
          source: r.source_fact_id,
          target: r.target_fact_id,
          strength: parseFloat(r.strength.toString()),
        })),
        {
          width: canvasWidth,
          height: canvasHeight,
          centerRadius: params.centerRadius,
          ringSpacing: params.ringSpacing,
          nodeSpacing: params.nodeSpacing,
        }
      );
      
      nodeArray.forEach((fact) => {
        const pos = positions[fact.id];
        if (pos) {
          graphNodes.push({
            id: fact.id,
            type: 'custom',
            position: { x: pos.x, y: pos.y },
            data: {
              content: fact.content,
              type: fact.type,
              highlighted: highlightedNodes.has(fact.id),
            },
          });
        }
      });
      
      console.log('Radial layout complete:', graphNodes.length, 'nodes positioned');
    } else if (layoutType === 'hierarchical-cluster') {
      // Hierarchical Cluster layout: detect clusters and position them hierarchically
      console.log('Calculating hierarchical cluster layout for', nodeArray.length, 'nodes');
      
      // Load parameters from localStorage
      const savedParams = localStorage.getItem('graphLayoutParams');
      let params = {
        clusterSpacing: 500,
        nodeSpacing: 200,
        minClusterSize: 2,
      };
      
      if (savedParams) {
        try {
          const allParams = JSON.parse(savedParams);
          if (allParams['hierarchical-cluster']) {
            params = { ...params, ...allParams['hierarchical-cluster'] };
          }
        } catch (e) {
          console.error('Failed to parse layout params:', e);
        }
      }
      
      // Use same dynamic canvas sizing
      const nodeCount = nodeArray.length;
      const baseSize = Math.sqrt(nodeCount) * 400;
      const minSize = 2000;
      const maxSize = 15000;
      const canvasWidth = Math.max(minSize, Math.min(maxSize, baseSize));
      const canvasHeight = Math.max(minSize, Math.min(maxSize, baseSize * 0.8));
      
      console.log(`Canvas: ${canvasWidth}x${canvasHeight}, Nodes: ${nodeCount}`);
      console.log('Using params:', params);
      
      const positions = calculateHierarchicalClusterLayout(
        nodeArray.map(f => ({ id: f.id })),
        filteredRelationships.map(r => ({
          source: r.source_fact_id,
          target: r.target_fact_id,
          strength: parseFloat(r.strength.toString()),
        })),
        {
          width: canvasWidth,
          height: canvasHeight,
          clusterSpacing: params.clusterSpacing,
          nodeSpacing: params.nodeSpacing,
          minClusterSize: params.minClusterSize,
        }
      );
      
      nodeArray.forEach((fact) => {
        const pos = positions[fact.id];
        if (pos) {
          graphNodes.push({
            id: fact.id,
            type: 'custom',
            position: { x: pos.x, y: pos.y },
            data: {
              content: fact.content,
              type: fact.type,
              highlighted: highlightedNodes.has(fact.id),
            },
          });
        }
      });
      
      console.log('Hierarchical cluster layout complete:', graphNodes.length, 'nodes positioned');
    } else if (layoutType === 'iterative-refinement') {
      // Iterative Refinement layout: position nodes in passes (hubs, neighbors, remaining, isolated)
      console.log('Calculating iterative refinement layout for', nodeArray.length, 'nodes');
      
      // Load parameters from localStorage
      const savedParams = localStorage.getItem('graphLayoutParams');
      let params = {
        hubRadius: 400,
        neighborRadius: 300,
        isolatedRadius: 800,
        hubThreshold: 5,
      };
      
      if (savedParams) {
        try {
          const allParams = JSON.parse(savedParams);
          if (allParams['iterative-refinement']) {
            params = { ...params, ...allParams['iterative-refinement'] };
          }
        } catch (e) {
          console.error('Failed to parse layout params:', e);
        }
      }
      
      // Use same dynamic canvas sizing
      const nodeCount = nodeArray.length;
      const baseSize = Math.sqrt(nodeCount) * 400;
      const minSize = 2000;
      const maxSize = 15000;
      const canvasWidth = Math.max(minSize, Math.min(maxSize, baseSize));
      const canvasHeight = Math.max(minSize, Math.min(maxSize, baseSize * 0.8));
      
      console.log(`Canvas: ${canvasWidth}x${canvasHeight}, Nodes: ${nodeCount}`);
      console.log('Using params:', params);
      
      const positions = calculateIterativeRefinementLayout(
        nodeArray.map(f => ({ id: f.id })),
        filteredRelationships.map(r => ({
          source: r.source_fact_id,
          target: r.target_fact_id,
          strength: parseFloat(r.strength.toString()),
        })),
        {
          width: canvasWidth,
          height: canvasHeight,
          hubRadius: params.hubRadius,
          neighborRadius: params.neighborRadius,
          isolatedRadius: params.isolatedRadius,
          hubThreshold: params.hubThreshold,
        }
      );
      
      nodeArray.forEach((fact) => {
        const pos = positions[fact.id];
        if (pos) {
          graphNodes.push({
            id: fact.id,
            type: 'custom',
            position: { x: pos.x, y: pos.y },
            data: {
              content: fact.content,
              type: fact.type,
              highlighted: highlightedNodes.has(fact.id),
            },
          });
        }
      });
      
      console.log('Iterative refinement layout complete:', graphNodes.length, 'nodes positioned');
    } else if (layoutType === 'magnetic-cluster') {
      // Magnetic Cluster layout: show only anchor nodes initially, expand on click
      console.log('Calculating magnetic cluster layout for', nodeArray.length, 'nodes');
      
      // Load parameters from localStorage
      const savedParams = localStorage.getItem('graphLayoutParams');
      let params = {
        conditionSpacing: 600,
        clusterRadius: 250,
      };
      
      if (savedParams) {
        try {
          const allParams = JSON.parse(savedParams);
          if (allParams['magnetic-cluster']) {
            params = { ...params, ...allParams['magnetic-cluster'] };
          }
        } catch (e) {
          console.error('Failed to parse layout params:', e);
        }
      }
      
      // Use same dynamic canvas sizing
      const nodeCount = nodeArray.length;
      const baseSize = Math.sqrt(nodeCount) * 400;
      const minSize = 2000;
      const maxSize = 15000;
      const canvasWidth = Math.max(minSize, Math.min(maxSize, baseSize));
      const canvasHeight = Math.max(minSize, Math.min(maxSize, baseSize * 0.8));
      
      console.log(`Canvas: ${canvasWidth}x${canvasHeight}, Nodes: ${nodeCount}`);
      console.log('Using params:', params);
      console.log('Expanded clusters:', Array.from(expandedClusters));
      
      const result = calculateMagneticClusterLayout(
        nodeArray.map(f => ({ id: f.id, type: f.type })),
        filteredRelationships.map(r => ({
          source: r.source_fact_id,
          target: r.target_fact_id,
          strength: parseFloat(r.strength.toString()),
        })),
        {
          width: canvasWidth,
          height: canvasHeight,
          conditionSpacing: params.conditionSpacing,
          clusterRadius: params.clusterRadius,
        },
        expandedClusters
      );
      
      // Store cluster info for drag operations
      setClusterInfo(result.clusters);
      clusterInfoRef.current = result.clusters; // Also store in ref for persistence
      
      // IMPORTANT: Update result.positions with saved anchor positions BEFORE processing connected nodes
      // This ensures connected nodes use the correct (saved) anchor positions when applying offsets
      const anchorPositionUpdates = new Map<string, { old: { x: number; y: number }, new: { x: number; y: number } }>();
      result.clusters.forEach((clusterData, anchorId) => {
        const savedAnchorPos = magneticClusterPositions[anchorId];
        const originalAnchorPos = result.positions[anchorId];
        if (savedAnchorPos && originalAnchorPos) {
          console.log(`Updating anchor ${anchorId} position from calculated (${originalAnchorPos.x.toFixed(0)}, ${originalAnchorPos.y.toFixed(0)}) to saved (${savedAnchorPos.x.toFixed(0)}, ${savedAnchorPos.y.toFixed(0)})`);
          anchorPositionUpdates.set(anchorId, { old: originalAnchorPos, new: savedAnchorPos });
          result.positions[anchorId] = savedAnchorPos;
        }
      });
      
      // Also update calculated positions for connected nodes to account for anchor moves
      // This ensures that when we initialize offsets, they're relative to the correct anchor position
      if (anchorPositionUpdates.size > 0) {
        result.clusters.forEach((clusterData, anchorId) => {
          const update = anchorPositionUpdates.get(anchorId);
          if (update && clusterData.isExpanded) {
            const dx = update.new.x - update.old.x;
            const dy = update.new.y - update.old.y;
            console.log(`Adjusting ${clusterData.connectedNodes.length} connected nodes by offset (${dx.toFixed(0)}, ${dy.toFixed(0)})`);
            clusterData.connectedNodes.forEach(nodeId => {
              const nodePos = result.positions[nodeId];
              if (nodePos) {
                result.positions[nodeId] = {
                  x: nodePos.x + dx,
                  y: nodePos.y + dy,
                };
              }
            });
          }
        });
      }
      
      // Only create nodes for visible nodes
      nodeArray.forEach((fact) => {
        if (result.visibleNodes.has(fact.id)) {
          const pos = result.positions[fact.id];
          if (pos) {
            const cluster = result.clusters.get(fact.id);
            let finalPos: { x: number; y: number };
            
            // Check if this node has a custom offset relative to its anchor
            const offset = magneticClusterOffsets[fact.id];
            
            // Determine if this is a connected node (not an anchor)
            let belongsToAnchor: string | null = null;
            if (!cluster) {
              // Find which anchor this node belongs to
              result.clusters.forEach((clusterData, anchorId) => {
                if (clusterData.connectedNodes.includes(fact.id)) {
                  belongsToAnchor = anchorId;
                }
              });
            }
            
            if (offset && belongsToAnchor) {
              // This is a connected node with a saved offset - apply it relative to current anchor position
              // Use the current anchor position from the layout result (which includes any moves)
              const currentAnchorPos = result.positions[belongsToAnchor];
              if (currentAnchorPos) {
                // Check if the offset's anchor matches the current anchor
                if (offset.anchorId === belongsToAnchor) {
                  // Verify the offset is reasonable (not too large)
                  const offsetDistance = Math.sqrt(offset.dx * offset.dx + offset.dy * offset.dy);
                  const maxReasonableOffset = params.clusterRadius * 3; // 3x cluster radius
                  
                  if (offsetDistance > maxReasonableOffset) {
                    console.warn(`Offset for ${fact.id} is too large (${offsetDistance.toFixed(0)} > ${maxReasonableOffset}), using fresh calculated position`);
                    // Offset is unreasonable, use calculated position and reinitialize
                    finalPos = pos;
                    const newOffset = {
                      dx: pos.x - currentAnchorPos.x,
                      dy: pos.y - currentAnchorPos.y,
                      anchorId: belongsToAnchor,
                    };
                    setMagneticClusterOffsets(prev => ({
                      ...prev,
                      [fact.id]: newOffset,
                    }));
                  } else {
                    console.log(`Applying saved offset for ${fact.id}: anchor ${belongsToAnchor} at (${currentAnchorPos.x.toFixed(0)}, ${currentAnchorPos.y.toFixed(0)}), offset (${offset.dx.toFixed(0)}, ${offset.dy.toFixed(0)})`);
                    finalPos = {
                      x: currentAnchorPos.x + offset.dx,
                      y: currentAnchorPos.y + offset.dy,
                    };
                    console.log(`Final position: (${finalPos.x.toFixed(0)}, ${finalPos.y.toFixed(0)})`);
                  }
                } else {
                  // Anchor mismatch - this node belonged to a different anchor, use calculated position
                  console.warn(`Anchor mismatch for ${fact.id}: offset anchor ${offset.anchorId} != current anchor ${belongsToAnchor}, using fresh calculated position`);
                  finalPos = pos;
                  const newOffset = {
                    dx: pos.x - currentAnchorPos.x,
                    dy: pos.y - currentAnchorPos.y,
                    anchorId: belongsToAnchor,
                  };
                  setMagneticClusterOffsets(prev => ({
                    ...prev,
                    [fact.id]: newOffset,
                  }));
                }
              } else {
                // Anchor not found, use calculated position
                console.log(`Anchor ${belongsToAnchor} not found in positions, using calculated position`);
                finalPos = pos;
              }
            } else if (belongsToAnchor) {
              // This is a connected node without a saved offset - use calculated position and initialize offset
              const anchorPos = result.positions[belongsToAnchor];
              if (anchorPos) {
                // Use the calculated position from the layout algorithm (which is already relative to current anchor)
                finalPos = pos;
                
                // Initialize the offset for future use
                const newOffset = {
                  dx: pos.x - anchorPos.x,
                  dy: pos.y - anchorPos.y,
                  anchorId: belongsToAnchor,
                };
                console.log(`Initializing offset for ${fact.id}: calculated pos (${pos.x}, ${pos.y}), anchor at (${anchorPos.x}, ${anchorPos.y}), offset (${newOffset.dx}, ${newOffset.dy})`);
                setMagneticClusterOffsets(prev => ({
                  ...prev,
                  [fact.id]: newOffset,
                }));
              } else {
                finalPos = pos;
              }
            } else {
              // This is an anchor node - use saved absolute position or calculated position
              finalPos = magneticClusterPositions[fact.id] || pos;
            }
            
            graphNodes.push({
              id: fact.id,
              type: 'custom',
              position: { x: finalPos.x, y: finalPos.y },
              data: {
                content: fact.content,
                type: fact.type,
                highlighted: highlightedNodes.has(fact.id),
                clusterInfo: cluster, // Pass cluster info directly in node data
              },
            });
          }
        }
      });
      
      console.log('Magnetic cluster layout complete:', graphNodes.length, 'visible nodes out of', nodeArray.length, 'total');
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
  }, [allRelationships, filters, currentTime, highlightedNodes, manuallyShownNodes, layoutType, layoutRecalcTrigger, expandedClusters, setNodes, setEdges, calculateOptimalHandles, loadNodePositions]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    // If in magnetic cluster layout, check the mode
    if (layoutType === 'magnetic-cluster' && magneticClusterMode === 'toggle') {
      console.log('Clicked node in magnetic-cluster toggle mode:', node.id, 'Type:', node.data.type);
      const cluster = clusterInfoRef.current.get(node.id);
      console.log('Cluster info:', cluster);
      if (cluster) {
        // This is an anchor node - toggle expansion
        console.log('Toggling cluster expansion for:', node.id);
        setExpandedClusters(prev => {
          const newSet = new Set(prev);
          if (newSet.has(node.id)) {
            console.log('Collapsing cluster:', node.id);
            newSet.delete(node.id);
          } else {
            console.log('Expanding cluster:', node.id, 'with', cluster.connectedNodes.length, 'nodes');
            newSet.add(node.id);
          }
          console.log('New expanded clusters:', Array.from(newSet));
          return newSet;
        });
        return; // Don't select the node, just toggle expansion
      }
    }
    
    // In navigate mode or non-anchor nodes, show details
    setSelectedNode(node);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === node.id,
      }))
    );
  }, [layoutType, magneticClusterMode, setNodes]);

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
      // Add to manually shown nodes so it stays visible even if filtered out
      setManuallyShownNodes(prev => new Set(prev).add(nodeId));
      
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
    // Clear manually shown nodes when filters change
    setManuallyShownNodes(new Set());
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
          zoomable
          pannable
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
        onRecalculateLayout={() => setLayoutRecalcTrigger(prev => prev + 1)}
        isGeneratingAILayout={isGeneratingAILayout}
        magneticClusterMode={magneticClusterMode}
        onMagneticClusterModeChange={setMagneticClusterMode}
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
