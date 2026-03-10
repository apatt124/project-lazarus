import React from 'react';

interface GraphControlsProps {
  filters: {
    showMedical: boolean;
    showGeneral: boolean;
    relationshipTypes: string[];
    minStrength: number;
  };
  onFilterChange: (filters: GraphControlsProps['filters']) => void;
}

const relationshipTypeOptions = [
  { value: 'treats', label: 'Treats' },
  { value: 'causes', label: 'Causes' },
  { value: 'contraindicates', label: 'Contraindicates' },
  { value: 'related_to', label: 'Related To' },
  { value: 'monitors', label: 'Monitors' },
  { value: 'requires', label: 'Requires' },
  { value: 'prescribed_by', label: 'Prescribed By' },
  { value: 'managed_by', label: 'Managed By' },
  { value: 'works_at', label: 'Works At' },
];

const GraphControls: React.FC<GraphControlsProps> = ({ filters, onFilterChange }) => {
  const handleToggle = (key: 'showMedical' | 'showGeneral') => {
    onFilterChange({ ...filters, [key]: !filters[key] });
  };

  const handleRelationshipToggle = (type: string) => {
    const types = filters.relationshipTypes.includes(type)
      ? filters.relationshipTypes.filter(t => t !== type)
      : [...filters.relationshipTypes, type];
    onFilterChange({ ...filters, relationshipTypes: types });
  };

  const handleStrengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, minStrength: Number(e.target.value) });
  };

  return (
    <div className="space-y-4 min-w-[200px]">
      <h3 className="font-semibold text-gray-900">Filters</h3>

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showMedical}
            onChange={() => handleToggle('showMedical')}
            className="rounded"
          />
          <span className="text-sm">Medical</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showGeneral}
            onChange={() => handleToggle('showGeneral')}
            className="rounded"
          />
          <span className="text-sm">General</span>
        </label>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Min Strength: {filters.minStrength.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={filters.minStrength}
          onChange={handleStrengthChange}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Relationship Types
        </label>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {relationshipTypeOptions.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={filters.relationshipTypes.length === 0 || filters.relationshipTypes.includes(value)}
                onChange={() => handleRelationshipToggle(value)}
                className="rounded"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GraphControls;
