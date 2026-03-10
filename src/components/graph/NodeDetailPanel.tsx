import React from 'react';
import { Node } from 'reactflow';

interface NodeDetailPanelProps {
  node: Node;
  onClose: () => void;
}

const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, onClose }) => {
  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-xl p-6 max-w-md z-10">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-lg text-gray-900">Fact Details</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Type</label>
          <p className="text-sm text-gray-900 mt-1">{node.data.type.replace(/_/g, ' ')}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Content</label>
          <p className="text-sm text-gray-900 mt-1">{node.data.content}</p>
        </div>

        <div className="pt-3 border-t">
          <p className="text-xs text-gray-500">
            Click on connections to see relationship details
          </p>
        </div>
      </div>
    </div>
  );
};

export default NodeDetailPanel;
