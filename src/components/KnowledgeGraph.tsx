import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './graph/CustomNode';
import CustomEdge from './graph/CustomEdge';
import TimelineSlider from './graph/TimelineSlider';
import GraphControls from './graph/GraphControls';
import NodeDetailPanel from './graph/NodeDetailPanel';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

interface KnowledgeGraphProps {
  userId: string;
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
  date: string;
  event_type: string;
  description: string;
  fact_id: string;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ userId }) => {
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

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  // Fetch timeline events
  const fetchTimelineEvents = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/relationships/timeline`);
      const data = await response.json();
      if (data.success) {
        setTimelineEvents(data.events);
      }
    } catch (error) {
      console.error('Failed to fetch timeline events:', error);
    }
  }, [API_BASE]);

  // Fetch graph data at specific time
  const fetchGraphData = useCallback(async (timestamp?: Date) => {
    setIsLoading(true);
    try {
      const url = timestamp
        ? `${API_BASE}/relationships/graph?timestamp=${timestamp.toISOString()}`
        : `${API_BASE}/relationships/graph`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const relationships: Relationship[] = data.relationships;

        // Build nodes from unique facts
        const factMap = new Map<string, any>();
        relationships.forEach((rel) => {
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

        // Create nodes with auto-layout
        const nodeArray = Array.from(factMap.values());
        const graphNodes: Node[] = nodeArray.map((fact, index) => {
          const angle = (index / nodeArray.length) * 2 * Math.PI;
          const radius = 300;
          return {
            id: fact.id,
            type: 'custom',
            position: {
              x: Math.cos(angle) * radius + 400,
              y: Math.sin(angle) * radius + 300,
            },
            data: {
              content: fact.content,
              type: fact.type,
            },
          };
        });

        // Create edges
        const graphEdges: Edge[] = relationships.map((rel) => ({
          id: rel.id,
          source: rel.source_fact_id,
          target: rel.target_fact_id,
          type: 'custom',
          data: {
            relationshipType: rel.relationship_type,
            strength: rel.strength,
            reasoning: rel.reasoning,
            category: rel.category,
            isMedical: rel.is_medical,
          },
        }));

        setNodes(graphNodes);
        setEdges(graphEdges);
      }
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE, setNodes, setEdges]);

  useEffect(() => {
    fetchGraphData();
    fetchTimelineEvents();
  }, [fetchGraphData, fetchTimelineEvents]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleTimeChange = useCallback((date: Date) => {
    setCurrentTime(date);
    fetchGraphData(date);
  }, [fetchGraphData]);

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
        
        <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-4 m-4">
          <GraphControls filters={filters} onFilterChange={handleFilterChange} />
        </Panel>

        <Panel position="bottom-center" className="w-full max-w-4xl px-4">
          <TimelineSlider
            currentTime={currentTime}
            events={timelineEvents}
            onTimeChange={handleTimeChange}
          />
        </Panel>
      </ReactFlow>

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
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

export default KnowledgeGraph;
