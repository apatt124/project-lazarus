import React, { useState } from 'react';
import { Theme } from '../../lib/themes';

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

export type LayoutType = 'custom' | 'ai' | 'force-directed' | 'radial' | 'hierarchical-cluster' | 'iterative-refinement' | 'magnetic-cluster';

interface GraphControlsProps {
  filters: {
    showMedical: boolean;
    showGeneral: boolean;
    relationshipTypes: string[];
    noteTypes: string[];
    minStrength: number;
    maxConnectionsPerNode: number;
  };
  onFilterChange: (filters: GraphControlsProps['filters']) => void;
  currentTime: Date;
  timelineEvents: TimelineEvent[];
  onTimeChange: (date: Date) => void;
  searchQuery: string;
  searchResults: SearchResult[];
  onSearch: (query: string) => void;
  onSearchResultClick: (nodeId: string) => void;
  layoutType: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  hasUnsavedChanges: boolean;
  onSaveCustomLayout: () => void;
  onRegenerateAILayout: () => void;
  onRecalculateLayout: () => void;
  isGeneratingAILayout: boolean;
  magneticClusterMode?: 'toggle' | 'navigate';
  onMagneticClusterModeChange?: (mode: 'toggle' | 'navigate') => void;
  theme: Theme;
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

const noteTypeOptions = [
  { value: 'medical_condition', label: 'Medical Conditions', icon: '🏥' },
  { value: 'medication', label: 'Medications', icon: '💊' },
  { value: 'allergy', label: 'Allergies', icon: '⚠️' },
  { value: 'procedure', label: 'Procedures', icon: '🔬' },
  { value: 'test_result', label: 'Test Results', icon: '📊' },
  { value: 'symptom', label: 'Symptoms', icon: '🤒' },
  { value: 'vital_sign', label: 'Vital Signs', icon: '❤️' },
  { value: 'family_history', label: 'Family History', icon: '👨‍👩‍👧‍👦' },
  { value: 'lifestyle', label: 'Lifestyle', icon: '🏃' },
  { value: 'preference', label: 'Preferences', icon: '⚙️' },
  { value: 'provider', label: 'Providers', icon: '👨‍⚕️' },
  { value: 'facility', label: 'Facilities', icon: '🏥' },
  { value: 'insurance', label: 'Insurance', icon: '📋' },
  { value: 'general', label: 'General', icon: '📝' },
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
  layoutType,
  onLayoutChange,
  hasUnsavedChanges,
  onSaveCustomLayout,
  onRegenerateAILayout,
  onRecalculateLayout,
  isGeneratingAILayout,
  magneticClusterMode = 'toggle',
  onMagneticClusterModeChange,
  theme,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showCategoryFilters, setShowCategoryFilters] = useState(true);
  const [showStrengthFilter, setShowStrengthFilter] = useState(true);
  const [showTypeFilters, setShowTypeFilters] = useState(false);
  const [showNoteTypeFilters, setShowNoteTypeFilters] = useState(false);
  const [showLayoutOptions, setShowLayoutOptions] = useState(true);
  const [showLayoutParams, setShowLayoutParams] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchInputFocused, setSearchInputFocused] = useState(false);

  // Layout parameters (stored in localStorage)
  const [layoutParams, setLayoutParams] = useState(() => {
    const saved = localStorage.getItem('graphLayoutParams');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {
      'force-directed': {
        nodeSpacing: 420,
        edgeLength: 300,
        repulsionStrength: 200000,
        attractionStrength: 0.05,
        damping: 0.88,
        iterations: 400,
      },
      'radial': {
        centerRadius: 300,
        ringSpacing: 350,
        nodeSpacing: 280,
      },
      'hierarchical-cluster': {
        clusterSpacing: 500,
        nodeSpacing: 200,
        minClusterSize: 2,
      },
      'iterative-refinement': {
        hubRadius: 400,
        neighborRadius: 300,
        isolatedRadius: 800,
        hubThreshold: 5,
      },
      'magnetic-cluster': {
        conditionSpacing: 600,
        clusterRadius: 250,
      },
    };
  });

  // Save layout params to localStorage when they change
  const updateLayoutParam = (layout: string, param: string, value: number) => {
    const newParams = {
      ...layoutParams,
      [layout]: {
        ...(layoutParams[layout] || {}),
        [param]: value,
      },
    };
    setLayoutParams(newParams);
    localStorage.setItem('graphLayoutParams', JSON.stringify(newParams));
  };

  const handleToggle = (key: 'showMedical' | 'showGeneral') => {
    onFilterChange({ ...filters, [key]: !filters[key] });
  };

  const handleRelationshipToggle = (type: string) => {
    const types = filters.relationshipTypes.includes(type)
      ? filters.relationshipTypes.filter(t => t !== type)
      : [...filters.relationshipTypes, type];
    onFilterChange({ ...filters, relationshipTypes: types });
  };

  const handleNoteTypeToggle = (type: string) => {
    const types = filters.noteTypes.includes(type)
      ? filters.noteTypes.filter(t => t !== type)
      : [...filters.noteTypes, type];
    onFilterChange({ ...filters, noteTypes: types });
  };

  const handleShowAllRelationshipTypes = () => {
    onFilterChange({ ...filters, relationshipTypes: [] });
  };

  const handleShowAllNoteTypes = () => {
    onFilterChange({ ...filters, noteTypes: [] });
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
    const timestamp = earliestEvent.getTime() + (value / 100) * timeRange;
    onTimeChange(new Date(timestamp));
  };

  // Calculate slider value from current time
  const sliderValue = ((currentTime.getTime() - earliestEvent.getTime()) / timeRange) * 100;

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
    setSearchInputFocused(false);
  };

  const handleResultClick = (nodeId: string) => {
    onSearchResultClick(nodeId);
    setSearchInputFocused(false);
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
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between mb-2 hover:opacity-70 transition-opacity"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
          {title}
        </h3>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          style={{ color: theme.colors.textSecondary }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="space-y-2">{children}</div>}
    </div>
  );

  const layoutOptions = [
    { value: 'custom' as LayoutType, label: 'Custom', description: 'Your saved layout' },
    { value: 'magnetic-cluster' as LayoutType, label: 'Magnetic Clusters', description: 'Drag conditions to arrange' },
    { value: 'iterative-refinement' as LayoutType, label: 'Iterative Refinement', description: 'Hub-based progressive layout' },
    { value: 'hierarchical-cluster' as LayoutType, label: 'Hierarchical Clusters', description: 'Groups by connectivity' },
    { value: 'radial' as LayoutType, label: 'Radial', description: 'Hub-and-spoke layout' },
    { value: 'force-directed' as LayoutType, label: 'Force-Directed', description: 'Physics-based layout' },
    { value: 'ai' as LayoutType, label: 'AI-Optimized', description: 'Intelligent arrangement' },
  ];

  return (
    <>
      <style>
        {`
          input[type="range"] {
            accent-color: ${theme.colors.primary};
          }
        `}
      </style>
      
      {/* Overlay */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-[2147483646] lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Toggle Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed left-4 p-3 shadow-2xl transition-all hover:opacity-90"
          style={{ 
            top: '135px',
            backgroundColor: theme.colors.text,
            border: `1px solid rgba(150, 150, 150, 0.2)`,
            borderTopRightRadius: '12px',
            borderBottomRightRadius: '12px',
            zIndex: 40
          }}
          title="Open graph controls"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" style={{ stroke: '#4B5563' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      )}

      {/* Full-height Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-[2147483647] w-72 flex flex-col transition-transform duration-300 ${
          isExpanded ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: theme.colors.surface }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: theme.colors.border }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold" style={{ color: theme.colors.text }}>Graph Controls</h2>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: theme.colors.textSecondary }}
              title="Close panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* Search Section */}
          <div className="w-full mb-4" style={{ overflow: 'visible', flexShrink: 0 }}>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: theme.colors.textSecondary }}>
              Search
            </h3>
            <div className="relative" style={{ overflow: 'visible' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={(e) => {
                  setSearchInputFocused(true);
                  e.currentTarget.style.borderColor = theme.colors.primary;
                }}
                onBlur={(e) => {
                  setTimeout(() => setSearchInputFocused(false), 200);
                  e.currentTarget.style.borderColor = theme.colors.border;
                }}
                placeholder="Search nodes..."
                style={{ 
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border
                }}
                className="w-full px-4 py-3 pr-10 border rounded-xl text-sm focus:outline-none transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={handleClearSearch} 
                  className="absolute transition-colors"
                  style={{ 
                    zIndex: 10,
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: theme.colors.textSecondary
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.text}
                  onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.textSecondary}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
              
            {/* Search results */}
            {showSearchResults && searchResults.length > 0 && (
              <div 
                className="mt-2 border rounded-xl shadow-2xl overflow-hidden"
                style={{ 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  width: searchInputFocused ? 'max-content' : '100%',
                  minWidth: searchInputFocused ? '256px' : '100%',
                  maxWidth: searchInputFocused ? '600px' : '100%',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  transition: 'all 0.2s ease-in-out',
                  position: 'relative',
                  zIndex: 2147483649
                }}
              >
                {searchResults.map((result) => (
                  <button 
                    key={result.id} 
                    onClick={() => handleResultClick(result.id)} 
                    className="w-full text-left px-4 py-3 border-b last:border-b-0 transition-all hover:bg-white/5"
                    style={{ 
                      borderColor: theme.colors.border,
                      minWidth: '100%'
                    }}
                  >
                    <div 
                      className="text-sm font-medium mb-1"
                      style={{ 
                        color: theme.colors.text,
                        whiteSpace: 'nowrap',
                        overflow: searchInputFocused ? 'visible' : 'hidden',
                        textOverflow: searchInputFocused ? 'clip' : 'ellipsis'
                      }}
                    >
                      {result.content}
                    </div>
                    <div 
                      className="text-xs capitalize"
                      style={{ 
                        color: theme.colors.textSecondary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {result.type.replace(/_/g, ' ')}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {showSearchResults && searchResults.length === 0 && (
              <div 
                className="mt-2 px-4 py-3 text-sm border rounded-xl" 
                style={{ 
                  backgroundColor: theme.colors.background, 
                  color: theme.colors.textSecondary,
                  borderColor: theme.colors.border
                }}
              >
                No results found
              </div>
            )}
          </div>

          {/* Filters Section */}
          <div className="space-y-4">
          <CollapsibleSection title="Layout" isOpen={showLayoutOptions} onToggle={() => setShowLayoutOptions(!showLayoutOptions)}>
            {isGeneratingAILayout && (
              <div className="mb-3 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: theme.colors.primary + '20', color: theme.colors.primary }}>
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Claude is analyzing your graph...</span>
                </div>
              </div>
            )}
            
            {layoutOptions.map(({ value, label, description }) => (
              <label 
                key={value} 
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5"
                style={{
                  backgroundColor: layoutType === value ? theme.colors.primary + '20' : 'transparent',
                  opacity: isGeneratingAILayout ? 0.5 : 1,
                  pointerEvents: isGeneratingAILayout ? 'none' : 'auto',
                }}
              >
                <input 
                  type="radio" 
                  name="layout" 
                  value={value} 
                  checked={layoutType === value} 
                  onChange={() => onLayoutChange(value)} 
                  className="mt-1"
                  disabled={isGeneratingAILayout}
                />
                <div className="flex-1">
                  <div 
                    className="text-sm font-medium"
                    style={{ color: theme.colors.text }}
                  >
                    {label}
                  </div>
                  <div className="text-xs" style={{ color: theme.colors.textSecondary }}>{description}</div>
                </div>
              </label>
            ))}
            
            {/* Save as Custom button - only show in AI mode with unsaved changes */}
            {layoutType === 'ai' && hasUnsavedChanges && !isGeneratingAILayout && (
              <button
                onClick={onSaveCustomLayout}
                className="w-full mt-2 px-4 py-2 rounded-xl font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.background,
                }}
              >
                Save as Custom Layout
              </button>
            )}
            
            {/* Regenerate AI Layout button - only show in AI mode */}
            {layoutType === 'ai' && !isGeneratingAILayout && (
              <button
                onClick={onRegenerateAILayout}
                className="w-full mt-2 px-4 py-2 rounded-xl font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Regenerate AI Layout</span>
                </div>
              </button>
            )}
          </CollapsibleSection>

          {/* Layout Parameters - show for algorithmic layouts */}
          {(layoutType === 'force-directed' || layoutType === 'radial' || layoutType === 'hierarchical-cluster' || layoutType === 'iterative-refinement' || layoutType === 'magnetic-cluster') && (
            <CollapsibleSection title="Layout Parameters" isOpen={showLayoutParams} onToggle={() => setShowLayoutParams(!showLayoutParams)}>
              {layoutType === 'force-directed' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Node Spacing: {layoutParams['force-directed'].nodeSpacing}
                    </label>
                    <input
                      type="range"
                      min="200"
                      max="800"
                      step="20"
                      value={layoutParams['force-directed'].nodeSpacing}
                      onChange={(e) => updateLayoutParam('force-directed', 'nodeSpacing', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Edge Length: {layoutParams['force-directed'].edgeLength}
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="600"
                      step="20"
                      value={layoutParams['force-directed'].edgeLength}
                      onChange={(e) => updateLayoutParam('force-directed', 'edgeLength', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Repulsion: {(layoutParams['force-directed'].repulsionStrength / 1000).toFixed(0)}k
                    </label>
                    <input
                      type="range"
                      min="50000"
                      max="500000"
                      step="10000"
                      value={layoutParams['force-directed'].repulsionStrength}
                      onChange={(e) => updateLayoutParam('force-directed', 'repulsionStrength', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Attraction: {layoutParams['force-directed'].attractionStrength.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.01"
                      max="0.2"
                      step="0.01"
                      value={layoutParams['force-directed'].attractionStrength}
                      onChange={(e) => updateLayoutParam('force-directed', 'attractionStrength', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Damping: {layoutParams['force-directed'].damping.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="0.99"
                      step="0.01"
                      value={layoutParams['force-directed'].damping}
                      onChange={(e) => updateLayoutParam('force-directed', 'damping', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {layoutType === 'radial' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Center Radius: {layoutParams['radial'].centerRadius}
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="600"
                      step="50"
                      value={layoutParams['radial'].centerRadius}
                      onChange={(e) => updateLayoutParam('radial', 'centerRadius', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Ring Spacing: {layoutParams['radial'].ringSpacing}
                    </label>
                    <input
                      type="range"
                      min="150"
                      max="600"
                      step="50"
                      value={layoutParams['radial'].ringSpacing}
                      onChange={(e) => updateLayoutParam('radial', 'ringSpacing', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Node Spacing: {layoutParams['radial'].nodeSpacing}
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="500"
                      step="20"
                      value={layoutParams['radial'].nodeSpacing}
                      onChange={(e) => updateLayoutParam('radial', 'nodeSpacing', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {layoutType === 'hierarchical-cluster' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Cluster Spacing: {layoutParams['hierarchical-cluster'].clusterSpacing}
                    </label>
                    <input
                      type="range"
                      min="200"
                      max="1000"
                      step="50"
                      value={layoutParams['hierarchical-cluster'].clusterSpacing}
                      onChange={(e) => updateLayoutParam('hierarchical-cluster', 'clusterSpacing', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Node Spacing: {layoutParams['hierarchical-cluster'].nodeSpacing}
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="400"
                      step="20"
                      value={layoutParams['hierarchical-cluster'].nodeSpacing}
                      onChange={(e) => updateLayoutParam('hierarchical-cluster', 'nodeSpacing', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Min Cluster Size: {layoutParams['hierarchical-cluster'].minClusterSize}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={layoutParams['hierarchical-cluster'].minClusterSize}
                      onChange={(e) => updateLayoutParam('hierarchical-cluster', 'minClusterSize', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {layoutType === 'iterative-refinement' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Hub Radius: {layoutParams['iterative-refinement']?.hubRadius || 400}
                    </label>
                    <input
                      type="range"
                      min="200"
                      max="800"
                      step="50"
                      value={layoutParams['iterative-refinement']?.hubRadius || 400}
                      onChange={(e) => updateLayoutParam('iterative-refinement', 'hubRadius', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Neighbor Radius: {layoutParams['iterative-refinement']?.neighborRadius || 300}
                    </label>
                    <input
                      type="range"
                      min="150"
                      max="600"
                      step="50"
                      value={layoutParams['iterative-refinement']?.neighborRadius || 300}
                      onChange={(e) => updateLayoutParam('iterative-refinement', 'neighborRadius', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Isolated Radius: {layoutParams['iterative-refinement']?.isolatedRadius || 800}
                    </label>
                    <input
                      type="range"
                      min="400"
                      max="1200"
                      step="50"
                      value={layoutParams['iterative-refinement']?.isolatedRadius || 800}
                      onChange={(e) => updateLayoutParam('iterative-refinement', 'isolatedRadius', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Hub Threshold: {layoutParams['iterative-refinement']?.hubThreshold || 5} connections
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="20"
                      step="1"
                      value={layoutParams['iterative-refinement']?.hubThreshold || 5}
                      onChange={(e) => updateLayoutParam('iterative-refinement', 'hubThreshold', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {layoutType === 'magnetic-cluster' && (
                <div className="space-y-3">
                  {/* Mode Toggle */}
                  <div>
                    <label className="text-xs block mb-2 font-medium" style={{ color: theme.colors.text }}>
                      Interaction Mode
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onMagneticClusterModeChange?.('toggle')}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          magneticClusterMode === 'toggle' ? 'ring-2' : 'opacity-60 hover:opacity-80'
                        }`}
                        style={{
                          backgroundColor: magneticClusterMode === 'toggle' ? theme.colors.primary : theme.colors.surface,
                          color: magneticClusterMode === 'toggle' ? theme.colors.background : theme.colors.text,
                          ...(magneticClusterMode === 'toggle' && { boxShadow: `0 0 0 2px ${theme.colors.primary}` }),
                        }}
                      >
                        🔄 Toggle Mode
                      </button>
                      <button
                        onClick={() => onMagneticClusterModeChange?.('navigate')}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          magneticClusterMode === 'navigate' ? 'ring-2' : 'opacity-60 hover:opacity-80'
                        }`}
                        style={{
                          backgroundColor: magneticClusterMode === 'navigate' ? theme.colors.primary : theme.colors.surface,
                          color: magneticClusterMode === 'navigate' ? theme.colors.background : theme.colors.text,
                          ...(magneticClusterMode === 'navigate' && { boxShadow: `0 0 0 2px ${theme.colors.primary}` }),
                        }}
                      >
                        🧭 Navigate Mode
                      </button>
                    </div>
                    <p className="text-xs mt-1 opacity-60" style={{ color: theme.colors.textSecondary }}>
                      {magneticClusterMode === 'toggle' 
                        ? 'Click anchors to expand/collapse clusters' 
                        : 'Click any node to view details and navigate'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Condition Spacing: {layoutParams['magnetic-cluster']?.conditionSpacing || 600}
                    </label>
                    <input
                      type="range"
                      min="300"
                      max="1000"
                      step="50"
                      value={layoutParams['magnetic-cluster']?.conditionSpacing || 600}
                      onChange={(e) => updateLayoutParam('magnetic-cluster', 'conditionSpacing', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: theme.colors.textSecondary }}>
                      Cluster Radius: {layoutParams['magnetic-cluster']?.clusterRadius || 250}
                    </label>
                    <input
                      type="range"
                      min="150"
                      max="500"
                      step="25"
                      value={layoutParams['magnetic-cluster']?.clusterRadius || 250}
                      onChange={(e) => updateLayoutParam('magnetic-cluster', 'clusterRadius', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="mt-3 p-3 rounded-lg text-xs" style={{ backgroundColor: theme.colors.primary + '10', color: theme.colors.text }}>
                    <p className="font-medium mb-1">💡 How to use:</p>
                    <ul className="list-disc list-inside space-y-1 opacity-80">
                      <li>Toggle Mode: Click anchors to expand/collapse</li>
                      <li>Navigate Mode: Click any node for details</li>
                      <li>Drag anchors to move entire clusters</li>
                    </ul>
                  </div>
                </div>
              )}

              <button
                onClick={onRecalculateLayout}
                className="w-full mt-3 px-4 py-2 rounded-xl font-medium transition-all hover:opacity-90"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.background,
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Recalculate Layout</span>
                </div>
              </button>
            </CollapsibleSection>
          )}

          <CollapsibleSection title="Categories" isOpen={showCategoryFilters} onToggle={() => setShowCategoryFilters(!showCategoryFilters)}>
            <label 
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5"
              style={{ 
                backgroundColor: filters.showMedical ? theme.colors.primary + '10' : 'transparent'
              }}
            >
              <input type="checkbox" checked={filters.showMedical} onChange={() => handleToggle('showMedical')} className="rounded" />
              <span className="text-sm font-medium" style={{ color: theme.colors.text }}>Medical</span>
            </label>
            <label 
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5"
              style={{ 
                backgroundColor: filters.showGeneral ? theme.colors.primary + '10' : 'transparent'
              }}
            >
              <input type="checkbox" checked={filters.showGeneral} onChange={() => handleToggle('showGeneral')} className="rounded" />
              <span className="text-sm font-medium" style={{ color: theme.colors.text }}>General</span>
            </label>
          </CollapsibleSection>

          <CollapsibleSection title={`Min Strength: ${filters.minStrength.toFixed(2)}`} isOpen={showStrengthFilter} onToggle={() => setShowStrengthFilter(!showStrengthFilter)}>
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

          <CollapsibleSection title={`Max Connections: ${filters.maxConnectionsPerNode === 0 ? 'Unlimited' : filters.maxConnectionsPerNode}`} isOpen={showStrengthFilter} onToggle={() => setShowStrengthFilter(!showStrengthFilter)}>
            <input 
              type="range" 
              min="0" 
              max="200" 
              step="10" 
              value={filters.maxConnectionsPerNode} 
              onChange={(e) => onFilterChange({ ...filters, maxConnectionsPerNode: Number(e.target.value) })}
              className="w-full"
            />
            <div className="text-xs text-center mt-2" style={{ color: theme.colors.textSecondary }}>
              {filters.maxConnectionsPerNode === 0 ? 'No limit' : `${filters.maxConnectionsPerNode} per node`}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Relationship Types" isOpen={showTypeFilters} onToggle={() => setShowTypeFilters(!showTypeFilters)}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs" style={{ color: theme.colors.textSecondary }}>
                {filters.relationshipTypes.length === 0 ? 'All types shown' : `${filters.relationshipTypes.length} selected`}
              </span>
              {filters.relationshipTypes.length > 0 && (
                <button
                  onClick={handleShowAllRelationshipTypes}
                  className="text-xs px-2 py-1 rounded transition-all hover:opacity-80"
                  style={{ 
                    backgroundColor: theme.colors.primary + '20',
                    color: theme.colors.primary
                  }}
                >
                  Show All
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {relationshipTypeOptions.map(({ value, label }) => (
                <label 
                  key={value} 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-xs transition-all hover:bg-white/5"
                  style={{ 
                    color: theme.colors.text,
                    backgroundColor: (filters.relationshipTypes.length === 0 || filters.relationshipTypes.includes(value)) ? theme.colors.primary + '10' : 'transparent'
                  }}
                >
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

          <CollapsibleSection title="Note Types" isOpen={showNoteTypeFilters} onToggle={() => setShowNoteTypeFilters(!showNoteTypeFilters)}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs" style={{ color: theme.colors.textSecondary }}>
                {filters.noteTypes.length === 0 ? 'All types shown' : `${filters.noteTypes.length} selected`}
              </span>
              {filters.noteTypes.length > 0 && (
                <button
                  onClick={handleShowAllNoteTypes}
                  className="text-xs px-2 py-1 rounded transition-all hover:opacity-80"
                  style={{ 
                    backgroundColor: theme.colors.primary + '20',
                    color: theme.colors.primary
                  }}
                >
                  Show All
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {noteTypeOptions.map(({ value, label, icon }) => (
                <label 
                  key={value} 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-xs transition-all hover:bg-white/5"
                  style={{ 
                    color: theme.colors.text,
                    backgroundColor: (filters.noteTypes.length === 0 || filters.noteTypes.includes(value)) ? theme.colors.primary + '10' : 'transparent'
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={filters.noteTypes.length === 0 || filters.noteTypes.includes(value)} 
                    onChange={() => handleNoteTypeToggle(value)} 
                    className="rounded" 
                  />
                  <span className="text-base">{icon}</span>
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Timeline" isOpen={showTimeline} onToggle={() => setShowTimeline(!showTimeline)}>
            <div className="space-y-2">
              <div className="text-xs text-center" style={{ color: theme.colors.text }}>{formatDate(currentTime)}</div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={sliderValue} 
                onChange={handleSliderChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs" style={{ color: theme.colors.textSecondary }}>
                <span>{formatDate(earliestEvent)}</span>
                <button 
                  onClick={() => onTimeChange(now)} 
                  className="px-3 py-1 rounded-lg font-medium transition-all hover:opacity-80"
                  style={{ 
                    backgroundColor: theme.colors.primary + '20',
                    color: theme.colors.primary
                  }}
                >
                  Now
                </button>
              </div>
              {timelineEvents.length > 0 && <div className="text-xs text-center" style={{ color: theme.colors.textSecondary }}>{timelineEvents.length} events</div>}
            </div>
          </CollapsibleSection>
          </div>
        </div>
      </div>
    </>
  );
};

export default GraphControls;
