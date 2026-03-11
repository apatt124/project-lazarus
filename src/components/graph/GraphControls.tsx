import React, { useState } from 'react';

interface TimelineEvent {
  event_date: string;
  event_type: string;
  description: string;
  fact_id: string;
}

interface SearchResult {
  id: string;
  content: string;
  type: string;
}

interface GraphControlsProps {
  filters: {
    showMedical: boolean;
    showGeneral: boolean;
    relationshipTypes: string[];
    minStrength: number;
  };
  onFilterChange: (filters: GraphControlsProps['filters']) => void;
  currentTime: Date;
  timelineEvents: TimelineEvent[];
  onTimeChange: (date: Date) => void;
  searchQuery: string;
  searchResults: SearchResult[];
  onSearch: (query: string) => void;
  onSearchResultClick: (nodeId: string) => void;
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

const GraphControls: React.FC<GraphControlsProps> = ({ 
  filters, 
  onFilterChange,
  currentTime,
  timelineEvents,
  onTimeChange,
  searchQuery,
  searchResults,
  onSearch,
  onSearchResultClick,
}) => {
  const [showTimeline, setShowTimeline] = useState(false);
  const [showCategoryFilters, setShowCategoryFilters] = useState(true);
  const [showStrengthFilter, setShowStrengthFilter] = useState(true);
  const [showTypeFilters, setShowTypeFilters] = useState(false);
  const [sliderValue, setSliderValue] = useState(100);
  const [showSearchResults, setShowSearchResults] = useState(false);

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

  const now = new Date();
  const earliestEvent = timelineEvents.length > 0
    ? new Date(Math.min(...timelineEvents.map(e => new Date(e.event_date).getTime())))
    : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const timeRange = now.getTime() - earliestEvent.getTime();

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setSliderValue(value);
    const timestamp = earliestEvent.getTime() + (value / 100) * timeRange;
    onTimeChange(new Date(timestamp));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    onSearch(query);
    setShowSearchResults(query.trim().length > 0);
  };

  const handleClearSearch = () => {
    onSearch('');
    setShowSearchResults(false);
  };

  const handleResultClick = (nodeId: string) => {
    onSearchResultClick(nodeId);
  };

  const CollapsibleSection = ({ 
    title, 
    isOpen, 
    onToggle, 
    children 
  }: { 
    title: string; 
    isOpen: boolean; 
    onToggle: () => void; 
    children: React.ReactNode;
  }) => (
    <div className="border-t pt-3 mt-3">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900 mb-2"
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && children}
    </div>
  );

  return (
    <div className="space-y-3 min-w-[200px] max-w-[280px]">
      {/* Search Section */}
      <div className="w-full">
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Search
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search nodes..."
            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {showSearchResults && searchResults.length > 0 && (
          <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md bg-white shadow-sm">
            {searchResults.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result.id)}
                className="w-full text-left px-2 py-1.5 hover:bg-purple-50 border-b border-gray-100 last:border-b-0 transition-colors block overflow-hidden"
              >
                <div className="text-xs font-medium text-gray-900 truncate">
                  {result.content}
                </div>
                <div className="text-xs text-gray-500 capitalize truncate">
                  {result.type.replace(/_/g, ' ')}
                </div>
              </button>
            ))}
          </div>
        )}
        {showSearchResults && searchResults.length === 0 && (
          <div className="mt-2 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-md bg-gray-50">
            No results found
          </div>
        )}
      </div>

      {/* Category Filters */}
      <CollapsibleSection 
        title="Categories" 
        isOpen={showCategoryFilters} 
        onToggle={() => setShowCategoryFilters(!showCategoryFilters)}
      >
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
      </CollapsibleSection>

      {/* Strength Filter */}
      <CollapsibleSection 
        title={`Min Strength: ${filters.minStrength.toFixed(2)}`}
        isOpen={showStrengthFilter} 
        onToggle={() => setShowStrengthFilter(!showStrengthFilter)}
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={filters.minStrength}
          onChange={handleStrengthChange}
          className="w-full"
        />
      </CollapsibleSection>

      {/* Relationship Types */}
      <CollapsibleSection 
        title="Relationship Types" 
        isOpen={showTypeFilters} 
        onToggle={() => setShowTypeFilters(!showTypeFilters)}
      >
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
      </CollapsibleSection>

      {/* Timeline */}
      <CollapsibleSection 
        title="Timeline" 
        isOpen={showTimeline} 
        onToggle={() => setShowTimeline(!showTimeline)}
      >
        <div className="space-y-2">
          <div className="text-xs text-gray-600 text-center">
            {formatDate(currentTime)}
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={handleSliderChange}
            className="w-full timeline-slider"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatDate(earliestEvent)}</span>
            <button
              onClick={() => {
                setSliderValue(100);
                onTimeChange(now);
              }}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Now
            </button>
          </div>
          {timelineEvents.length > 0 && (
            <div className="text-xs text-gray-500 text-center">
              {timelineEvents.length} events
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default GraphControls;
