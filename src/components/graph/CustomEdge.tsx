import React, { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';

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
}) => {
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
  const strokeWidth = 1 + strength * 3; // 1-4px based on strength

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
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="bg-white px-2 py-1 rounded text-xs font-medium shadow-sm border"
          title={data?.reasoning}
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(CustomEdge);
