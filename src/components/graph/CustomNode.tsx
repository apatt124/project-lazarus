import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const getNodeStyle = (type: string) => {
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    medical_condition: { bg: '#fecaca', border: '#ef4444', text: '#7f1d1d' },
    symptom: { bg: '#fed7aa', border: '#f97316', text: '#7c2d12' },
    medication: { bg: '#bfdbfe', border: '#3b82f6', text: '#1e3a8a' },
    allergy: { bg: '#fef08a', border: '#eab308', text: '#713f12' },
    procedure: { bg: '#e9d5ff', border: '#a855f7', text: '#581c87' },
    test_result: { bg: '#bbf7d0', border: '#22c55e', text: '#14532d' },
    lifestyle: { bg: '#99f6e4', border: '#14b8a6', text: '#134e4a' },
    family_history: { bg: '#fbcfe8', border: '#ec4899', text: '#831843' },
    provider: { bg: '#c7d2fe', border: '#6366f1', text: '#312e81' },
  };
  return styles[type] || { bg: '#e5e7eb', border: '#6b7280', text: '#1f2937' };
};

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

const CustomNode: React.FC<NodeProps> = ({ data, selected }) => {
  const style = getNodeStyle(data.type);
  const icon = getNodeIcon(data.type);
  const isHighlighted = data.highlighted || false;

  return (
    <div 
      style={{
        backgroundColor: style.bg,
        borderColor: selected ? '#fbbf24' : isHighlighted ? '#a78bfa' : style.border,
        color: style.text,
        borderWidth: selected ? '4px' : isHighlighted ? '3px' : '2px',
        borderStyle: 'solid',
        boxShadow: selected 
          ? '0 0 0 6px rgba(251, 191, 36, 0.4), 0 0 30px rgba(251, 191, 36, 0.6), 0 20px 25px -5px rgba(0, 0, 0, 0.3)' 
          : isHighlighted
          ? '0 0 0 4px rgba(167, 139, 250, 0.3), 0 0 20px rgba(167, 139, 250, 0.4)'
          : undefined,
        transform: selected ? 'scale(1.08)' : isHighlighted ? 'scale(1.04)' : 'scale(1)',
      }}
      className={`px-4 py-3 rounded-lg shadow-lg w-[220px] transition-all duration-300 cursor-pointer hover:shadow-xl ${
        selected ? 'animate-pulse-ring-gold' : ''
      }`}
    >
      {/* Handles on all sides for better routing */}
      <Handle type="target" position={Position.Top} id="target-top" className="w-3 h-3 !bg-gray-400" />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className="w-3 h-3 !bg-gray-400" />
      <Handle type="target" position={Position.Left} id="target-left" className="w-3 h-3 !bg-gray-400" />
      <Handle type="target" position={Position.Right} id="target-right" className="w-3 h-3 !bg-gray-400" />
      
      <div className="flex items-start gap-2">
        <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug break-words whitespace-normal">
            {data.content || 'No content'}
          </p>
        </div>
      </div>

      <Handle type="source" position={Position.Top} id="source-top" className="w-3 h-3 !bg-gray-400" />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className="w-3 h-3 !bg-gray-400" />
      <Handle type="source" position={Position.Left} id="source-left" className="w-3 h-3 !bg-gray-400" />
      <Handle type="source" position={Position.Right} id="source-right" className="w-3 h-3 !bg-gray-400" />
    </div>
  );
};

export default memo(CustomNode);
