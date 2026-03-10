import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const getNodeColor = (type: string) => {
  const colors: Record<string, string> = {
    medical_condition: 'bg-red-100 border-red-400 text-red-800',
    symptom: 'bg-orange-100 border-orange-400 text-orange-800',
    medication: 'bg-blue-100 border-blue-400 text-blue-800',
    allergy: 'bg-yellow-100 border-yellow-400 text-yellow-800',
    procedure: 'bg-purple-100 border-purple-400 text-purple-800',
    test_result: 'bg-green-100 border-green-400 text-green-800',
    lifestyle: 'bg-teal-100 border-teal-400 text-teal-800',
    family_history: 'bg-pink-100 border-pink-400 text-pink-800',
    provider: 'bg-indigo-100 border-indigo-400 text-indigo-800',
  };
  return colors[type] || 'bg-gray-100 border-gray-400 text-gray-800';
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

const CustomNode: React.FC<NodeProps> = ({ data }) => {
  const colorClass = getNodeColor(data.type);
  const icon = getNodeIcon(data.type);

  return (
    <div className={`px-4 py-3 rounded-lg border-2 shadow-md min-w-[180px] max-w-[250px] ${colorClass}`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-start gap-2">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight break-words">
            {data.content}
          </p>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

export default memo(CustomNode);
