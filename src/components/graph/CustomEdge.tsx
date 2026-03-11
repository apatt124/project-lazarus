import React, { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, useStore } from 'reactflow';

const getEdgeColor = (type: string) => {
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

const getEdgeLabel = (type: string) => {
  const labels: Record<string, string> = {
    treats: 'treats',
    causes: 'causes',
    contraindicates: 'contraindicates',
    related_to: 'related to',
    monitors: 'monitors',
    requires: 'requires',
    prescribed_by: 'prescribed by',
    managed_by: 'managed by',
    works_at: 'works at',
  };
  return labels[type] || type;
};

const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) => {
  // Get current zoom level to adjust label visibility
  const zoom = useStore((state) => state.transform[2]);
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const color = getEdgeColor(data?.relationshipType || '');
  const label = getEdgeLabel(data?.relationshipType || '');
  const strength = data?.strength || 0.5;
  
  // Visual strength indicators
  const strokeWidth = 2 + strength * 4; // 2-6px based on strength (more dramatic)
  const opacity = selected ? 1 : 0.5 + (strength * 0.5); // 0.5-1.0 based on strength
  
  // Strength indicator for label
  const strengthBars = '█'.repeat(Math.ceil(strength * 5)); // 1-5 bars

  // Only show labels when zoomed in enough or when selected
  const showLabel = zoom > 0.5 || selected;

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        markerEnd="url(#arrowhead)"
        style={{
          opacity: opacity,
          transition: 'all 0.2s ease',
        }}
      />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              backgroundColor: selected ? '#ffffff' : 'rgba(255, 255, 255, 0.95)',
              color: color,
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: color,
              fontSize: Math.max(10, 10 * zoom) + 'px', // Scale with zoom
              fontWeight: 600,
              padding: selected ? '6px 10px' : '4px 8px',
              borderRadius: '12px',
              boxShadow: selected 
                ? `0 4px 12px ${color}40, 0 2px 4px rgba(0,0,0,0.1)` 
                : '0 2px 4px rgba(0,0,0,0.08)',
              zIndex: selected ? 20 : 10,
              transition: 'all 0.2s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
            title={data?.reasoning}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = `translate(-50%, -50%) translate(${labelX}px,${labelY}px) scale(1.05)`;
              e.currentTarget.style.boxShadow = `0 6px 16px ${color}50, 0 3px 6px rgba(0,0,0,0.15)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = `translate(-50%, -50%) translate(${labelX}px,${labelY}px) scale(1)`;
              e.currentTarget.style.boxShadow = selected 
                ? `0 4px 12px ${color}40, 0 2px 4px rgba(0,0,0,0.1)` 
                : '0 2px 4px rgba(0,0,0,0.08)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{label}</span>
              <span style={{ fontSize: '8px', opacity: 0.7 }} title={`Strength: ${Math.round(strength * 100)}%`}>
                {strengthBars}
              </span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(CustomEdge);
