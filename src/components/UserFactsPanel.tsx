import { useState, useEffect } from 'react';
import { Theme } from '../lib/themes';
import KnowledgeGraph from './KnowledgeGraph';

interface UserFact {
  id: string;
  fact_type: string;
  content: string;
  confidence: number;
  fact_date?: string;
  created_at: string;
}

interface UserFactsPanelProps {
  theme: Theme;
  onClose: () => void;
}

type ViewMode = 'facts' | 'memories' | 'graph';

interface Memory {
  id: string;
  content: string;
  memory_type: string;
  category: string;
  relevance_score: number;
  is_active: boolean;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
}

export default function UserFactsPanel({ theme, onClose }: UserFactsPanelProps) {
  const [facts, setFacts] = useState<UserFact[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  
  // Memory filters and search
  const [memorySearch, setMemorySearch] = useState('');
  const [memoryTypeFilter, setMemoryTypeFilter] = useState<string>('all');
  const [memoryCategoryFilter, setMemoryCategoryFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'usage' | 'date'>('relevance');
  const [isDragging, setIsDragging] = useState(false);
  
  // Collapsible sections
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    // Load both on mount so counts are accurate
    loadFacts();
    loadMemories();
  }, []);

  const loadFacts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/memory/facts`);
      const data = await response.json();
      
      if (data.success) {
        setFacts(data.facts);
      }
    } catch (error) {
      console.error('Failed to load facts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMemories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/memory/memories`);
      const data = await response.json();
      
      if (data.success) {
        setMemories(data.memories);
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteFact = async (factId: string) => {
    if (!confirm('Are you sure you want to delete this fact?')) return;
    
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/memory/facts/${factId}`, {
        method: 'DELETE',
      });
      setFacts(facts.filter(f => f.id !== factId));
    } catch (error) {
      console.error('Failed to delete fact:', error);
    }
  };

  const updateFactConfidence = async (factId: string, confidence: number) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/memory/facts/${factId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confidence }),
      });
    } catch (error) {
      console.error('Failed to update fact:', error);
    }
  };

  const handleFactConfidenceChange = (factId: string, confidence: number) => {
    // Update locally immediately for smooth UI
    setFacts(facts.map(f => f.id === factId ? { ...f, confidence } : f));
  };

  const handleFactConfidenceCommit = (factId: string, confidence: number) => {
    // Save to server when slider is released
    updateFactConfidence(factId, confidence);
  };

  const deleteMemory = async (memoryId: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;
    
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/memory/memories/${memoryId}`, {
        method: 'DELETE',
      });
      setMemories(memories.filter(m => m.id !== memoryId));
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  const updateMemory = async (memoryId: string, updates: { relevance_score?: number; is_active?: boolean }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/memory/memories/${memoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      
      if (!data.success) {
        console.error('Failed to update memory');
      }
    } catch (error) {
      console.error('Failed to update memory:', error);
    }
  };

  const handleMemoryRelevanceChange = (memoryId: string, relevance_score: number) => {
    // Update locally immediately for smooth UI
    setIsDragging(true);
    setMemories(memories.map(m => m.id === memoryId ? { ...m, relevance_score } : m));
  };

  const handleMemoryRelevanceCommit = (memoryId: string, relevance_score: number) => {
    // Save to server when slider is released
    setIsDragging(false);
    updateMemory(memoryId, { relevance_score });
  };

  const toggleMemoryActive = (memoryId: string, is_active: boolean) => {
    // Update locally and save immediately for toggle
    setMemories(memories.map(m => m.id === memoryId ? { ...m, is_active } : m));
    updateMemory(memoryId, { is_active });
  };

  // Filter and sort memories - disable sorting while dragging to prevent reordering
  const filteredMemories = [...memories]
    .filter(m => {
      if (memorySearch && !m.content.toLowerCase().includes(memorySearch.toLowerCase())) {
        return false;
      }
      if (memoryTypeFilter !== 'all' && m.memory_type !== memoryTypeFilter) {
        return false;
      }
      if (memoryCategoryFilter !== 'all' && m.category !== memoryCategoryFilter) {
        return false;
      }
      if (!showInactive && !m.is_active) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Don't sort while dragging to prevent cards from jumping around
      if (isDragging) return 0;
      
      if (sortBy === 'relevance') {
        return b.relevance_score - a.relevance_score;
      } else if (sortBy === 'usage') {
        return b.usage_count - a.usage_count;
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const memoryTypes = Array.from(new Set(memories.map(m => m.memory_type)));
  const memoryCategories = Array.from(new Set(memories.map(m => m.category)));

  const getMemoryIcon = (type: string) => {
    const icons: Record<string, string> = {
      instruction: '📝',
      preference: '⭐',
      learning: '🧠',
      correction: '✏️',
    };
    return icons[type] || '💭';
  };

  const factsByType = facts.reduce((acc, fact) => {
    if (!acc[fact.fact_type]) {
      acc[fact.fact_type] = [];
    }
    acc[fact.fact_type].push(fact);
    return acc;
  }, {} as Record<string, UserFact[]>);

  const formatFactType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getFactIcon = (type: string) => {
    const icons: Record<string, string> = {
      medical_condition: '🏥',
      allergy: '⚠️',
      medication: '💊',
      procedure: '🔬',
      family_history: '👨‍👩‍👧‍👦',
      lifestyle: '🏃',
      preference: '⭐',
    };
    return icons[type] || '📋';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return theme.colors.primary;
    if (confidence >= 0.7) return '#10b981';
    return '#f59e0b';
  };

  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 0.9) return theme.colors.primary;
    if (relevance >= 0.7) return '#10b981';
    return '#f59e0b';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-4 flex-shrink-0" style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
        <button
          onClick={() => setViewMode('graph')}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${
            viewMode === 'graph' ? '' : 'opacity-50 hover:opacity-75'
          }`}
          style={{
            color: viewMode === 'graph' ? theme.colors.primary : theme.colors.textSecondary,
          }}
        >
          <div className="flex items-center gap-2">
            <span>🕸️ Knowledge Graph</span>
          </div>
          {viewMode === 'graph' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: theme.colors.primary }} />
          )}
        </button>

        <button
          onClick={() => setViewMode('facts')}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${
            viewMode === 'facts' ? '' : 'opacity-50 hover:opacity-75'
          }`}
          style={{
            color: viewMode === 'facts' ? theme.colors.primary : theme.colors.textSecondary,
          }}
        >
          <div className="flex items-center gap-2">
            <span>📋 Medical Facts</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ 
              backgroundColor: theme.colors.background,
              color: theme.colors.textSecondary 
            }}>
              {facts.length}
            </span>
          </div>
          {viewMode === 'facts' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: theme.colors.primary }} />
          )}
        </button>
        
        <button
          onClick={() => setViewMode('memories')}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${
            viewMode === 'memories' ? '' : 'opacity-50 hover:opacity-75'
          }`}
          style={{
            color: viewMode === 'memories' ? theme.colors.primary : theme.colors.textSecondary,
          }}
        >
          <div className="flex items-center gap-2">
            <span>🧠 Memories</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ 
              backgroundColor: theme.colors.background,
              color: theme.colors.textSecondary 
            }}>
              {memories.length}
            </span>
          </div>
          {viewMode === 'memories' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: theme.colors.primary }} />
          )}
        </button>
      </div>

      {/* Memory Filters - Fixed (only for memories view) */}
      {viewMode === 'memories' && !loading && memories.length > 0 && (
        <div className="px-6 pt-4 pb-3 border-b flex-shrink-0" style={{ borderColor: theme.colors.border }}>
          <div className="max-w-5xl mx-auto space-y-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search memories..."
                value={memorySearch}
                onChange={(e) => setMemorySearch(e.target.value)}
                className="w-full px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                }}
              />
              <svg className="absolute right-3 top-2.5 w-5 h-5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={memoryTypeFilter}
                onChange={(e) => setMemoryTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs focus:outline-none"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <option value="all">All Types</option>
                {memoryTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              
              <select
                value={memoryCategoryFilter}
                onChange={(e) => setMemoryCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs focus:outline-none"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <option value="all">All Categories</option>
                {memoryCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'relevance' | 'usage' | 'date')}
                className="px-3 py-1.5 rounded-lg text-xs focus:outline-none"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <option value="relevance">Sort by Relevance</option>
                <option value="usage">Sort by Usage</option>
                <option value="date">Sort by Date</option>
              </select>
              
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: showInactive ? theme.colors.primary + '20' : theme.colors.background,
                  color: showInactive ? theme.colors.primary : theme.colors.textSecondary,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                {showInactive ? '👁️ Showing Inactive' : '👁️ Active Only'}
              </button>
              
              <div className="text-xs opacity-60 ml-auto">
                Showing {filteredMemories.length} of {memories.length} memories
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'graph' ? (
          <KnowledgeGraph userId="user-1" />
        ) : (
          <div className="max-w-5xl mx-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: theme.colors.primary }}></div>
                  <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: theme.colors.primary, animationDelay: '0.1s' }}></div>
                  <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: theme.colors.primary, animationDelay: '0.2s' }}></div>
                </div>
              </div>
            ) : viewMode === 'facts' ? (
              facts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🤔</div>
                  <p className="text-lg mb-2" style={{ color: theme.colors.text }}>
                    No facts extracted yet
                  </p>
                  <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                    Have a conversation about your medical history to build your profile
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(factsByType).map(([type, typeFacts]) => (
                    <div key={type}>
                      <button
                        onClick={() => toggleSection(type)}
                        className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity mb-3 p-3 rounded-lg"
                        style={{ backgroundColor: theme.colors.surface }}
                      >
                        <h3 className="flex items-center gap-2 text-lg font-semibold" style={{ color: theme.colors.text }}>
                          <span className="text-2xl">{getFactIcon(type)}</span>
                          {formatFactType(type)}
                          <span className="text-sm font-normal opacity-60">({typeFacts.length})</span>
                        </h3>
                        <svg
                          className={`w-5 h-5 transition-transform ${collapsedSections.has(type) ? '' : 'rotate-180'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {!collapsedSections.has(type) && (
                        <div className="space-y-2 pl-2">
                          {typeFacts.map((fact) => (
                            <div
                              key={fact.id}
                              className="p-4 rounded-xl group"
                              style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="text-sm mb-3" style={{ color: theme.colors.text }}>
                                    {fact.content}
                                  </p>
                                  
                                  {/* Confidence Slider */}
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs opacity-60 flex-shrink-0 w-20">Confidence:</span>
                                    <div className="flex-1 relative">
                                      <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={fact.confidence}
                                        onInput={(e) => handleFactConfidenceChange(fact.id, parseFloat((e.target as HTMLInputElement).value))}
                                        onMouseUp={(e) => handleFactConfidenceCommit(fact.id, parseFloat((e.target as HTMLInputElement).value))}
                                        onTouchEnd={(e) => handleFactConfidenceCommit(fact.id, parseFloat((e.target as HTMLInputElement).value))}
                                        className="w-full"
                                        style={{
                                          background: `linear-gradient(to right, ${getConfidenceColor(fact.confidence)} 0%, ${getConfidenceColor(fact.confidence)} ${fact.confidence * 100}%, ${theme.colors.border} ${fact.confidence * 100}%, ${theme.colors.border} 100%)`,
                                          color: getConfidenceColor(fact.confidence),
                                        }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium flex-shrink-0 w-12 text-right" style={{ color: getConfidenceColor(fact.confidence) }}>
                                      {(fact.confidence * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  
                                  {fact.fact_date && (
                                    <p className="text-xs mt-2 opacity-60">
                                      📅 {new Date(fact.fact_date).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                
                                {/* Delete Button */}
                                <button
                                  onClick={() => deleteFact(fact.id)}
                                  className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/20 transition-all flex-shrink-0"
                                  style={{ color: '#ef4444' }}
                                  title="Delete fact"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Memories View
              filteredMemories.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-lg mb-2" style={{ color: theme.colors.text }}>
                    {memories.length === 0 ? 'No memories stored yet' : 'No memories found'}
                  </p>
                  <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                    {memorySearch || memoryTypeFilter !== 'all' || memoryCategoryFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Memories are learnings extracted from conversations'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMemories.map((memory) => (
                    <div
                      key={memory.id}
                      className="p-4 rounded-xl group transition-opacity"
                      style={{ 
                        backgroundColor: theme.colors.surface,
                        opacity: memory.is_active ? 1 : 0.5,
                        border: `1px solid ${theme.colors.border}`,
                      }}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg">{getMemoryIcon(memory.memory_type)}</span>
                          <span className="text-xs px-2 py-1 rounded-full" style={{ 
                            backgroundColor: theme.colors.primary + '20',
                            color: theme.colors.primary 
                          }}>
                            {memory.memory_type}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full" style={{ 
                            backgroundColor: theme.colors.background,
                            color: theme.colors.textSecondary 
                          }}>
                            {memory.category}
                          </span>
                          {memory.usage_count > 0 && (
                            <span className="text-xs opacity-60">
                              🔄 {memory.usage_count}x
                            </span>
                          )}
                        </div>
                        
                        {/* Controls */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => toggleMemoryActive(memory.id, !memory.is_active)}
                            className="p-2 rounded-lg hover:bg-white/10 transition-all"
                            style={{ color: memory.is_active ? theme.colors.primary : theme.colors.textSecondary }}
                            title={memory.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={memory.is_active ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"} />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteMemory(memory.id)}
                            className="p-2 rounded-lg hover:bg-red-500/20 transition-all"
                            style={{ color: '#ef4444' }}
                            title="Delete memory"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <p className="text-sm mb-3" style={{ color: theme.colors.text }}>
                        {memory.content}
                      </p>
                      
                      {/* Relevance Slider */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs opacity-60 flex-shrink-0 w-20">Relevance:</span>
                        <div className="flex-1 relative">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={memory.relevance_score}
                            onInput={(e) => handleMemoryRelevanceChange(memory.id, parseFloat((e.target as HTMLInputElement).value))}
                            onMouseUp={(e) => handleMemoryRelevanceCommit(memory.id, parseFloat((e.target as HTMLInputElement).value))}
                            onTouchEnd={(e) => handleMemoryRelevanceCommit(memory.id, parseFloat((e.target as HTMLInputElement).value))}
                            className="w-full"
                            style={{
                              background: `linear-gradient(to right, ${getRelevanceColor(memory.relevance_score)} 0%, ${getRelevanceColor(memory.relevance_score)} ${memory.relevance_score * 100}%, ${theme.colors.border} ${memory.relevance_score * 100}%, ${theme.colors.border} 100%)`,
                              color: getRelevanceColor(memory.relevance_score),
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium flex-shrink-0 w-12 text-right" style={{ color: getRelevanceColor(memory.relevance_score) }}>
                          {(memory.relevance_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      {viewMode !== 'graph' && (
        <div className="p-4 border-t flex-shrink-0" style={{ borderColor: theme.colors.border }}>
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 text-xs" style={{ color: theme.colors.textSecondary }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {viewMode === 'facts' 
                  ? 'Adjust confidence sliders to control how much weight each fact has. Facts below 50% are excluded from AI context.'
                  : 'Adjust relevance to control memory importance. Toggle visibility or delete memories you don\'t want used.'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
