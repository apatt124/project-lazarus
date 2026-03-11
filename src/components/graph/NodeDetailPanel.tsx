import React from 'react';
import { Node, Edge } from 'reactflow';

interface NodeDetailPanelProps {
  node: Node;
  edges: Edge[];
  onClose: () => void;
}

const getNodeIcon = (type: string) => {
  const icons: Record<string, string> = {
    medical_condition: '🏥',
    symptom: '🤒',
    medication: '💊',
    allergy: '⚠️',
    procedure: '🔬',
    test_result: '📊',
    lifestyle: '🏃',
    family_history: '👨‍👩‍👧‍👦',
    provider: '👨‍⚕️',
  };
  return icons[type] || '📌';
};

const getRelationshipColor = (type: string) => {
  const colors: Record<string, string> = {
    treats: '#3b82f6',
    causes: '#ef4444',
    contraindicates: '#f59e0b',
    related_to: '#8b5cf6',
    monitors: '#10b981',
    requires: '#6366f1',
    prescribed_by: '#06b6d4',
    managed_by: '#ec4899',
    works_at: '#14b8a6',
  };
  return colors[type] || '#6b7280';
};

const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, edges, onClose }) => {
  // Find all edges connected to this node
  const connectedEdges = edges.filter(
    edge => edge.source === node.id || edge.target === node.id
  );

  return (
    <div 
      className="rounded-lg shadow-2xl max-w-md overflow-hidden"
      style={{
        backgroundColor: '#ffffff',
        border: '2px solid #e5e7eb',
        maxHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div 
        className="p-4 flex justify-between items-start"
        style={{
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getNodeIcon(node.data.type)}</span>
          <h3 className="font-semibold text-lg" style={{ color: '#111827' }}>
            {node.data.type.replace(/_/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-2xl leading-none font-bold hover:opacity-70 transition-opacity"
          style={{ color: '#9ca3af' }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto" style={{ flex: 1 }}>
        {/* Main Content */}
        <div className="mb-4">
          <p className="text-base leading-relaxed" style={{ color: '#111827' }}>
            {node.data.content}
          </p>
        </div>

        {/* Connections */}
        {connectedEdges.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3" style={{ color: '#6b7280' }}>
              CONNECTIONS ({connectedEdges.length})
            </h4>
            <div className="space-y-2">
              {connectedEdges.map((edge) => {
                const isSource = edge.source === node.id;
                const relationshipType = edge.data?.relationshipType || 'related_to';
                const strength = edge.data?.strength || 0.5;
                const color = getRelationshipColor(relationshipType);
                
                return (
                  <div
                    key={edge.id}
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: '#f9fafb',
                      border: `1px solid ${color}20`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span 
                        className="text-xs font-semibold uppercase"
                        style={{ color }}
                      >
                        {relationshipType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs ml-auto" style={{ color: '#9ca3af' }}>
                        {Math.round(strength * 100)}% strength
                      </span>
                    </div>
                    {edge.data?.reasoning && (
                      <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                        {edge.data.reasoning}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div 
        className="p-3 text-center"
        style={{
          backgroundColor: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
        }}
      >
        <p className="text-xs" style={{ color: '#9ca3af' }}>
          Click edges to see detailed relationship information
        </p>
      </div>
    </div>
  );
};

export default NodeDetailPanel;
