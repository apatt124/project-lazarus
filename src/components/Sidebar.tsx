import { useState } from 'react';
import { Theme, themes } from '../lib/themes';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  is_pinned?: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  conversations: Conversation[];
  currentConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  onNewChat: () => void;
  onLogout?: () => void;
  onConversationUpdate?: () => void;
}

export default function Sidebar({ 
  isOpen, 
  onClose, 
  theme, 
  currentTheme, 
  onThemeChange, 
  conversations,
  currentConversationId,
  onConversationSelect,
  onNewChat,
  onLogout,
  onConversationUpdate
}: SidebarProps) {
  const [pinnedExpanded, setPinnedExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handlePin = async (conversationId: string, isPinned: boolean) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/conversations/${conversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !isPinned }),
      });
      
      if (response.ok) {
        onConversationUpdate?.();
      }
    } catch (error) {
      console.error('Failed to pin conversation:', error);
    }
    setMenuOpenId(null);
  };

  const handleRename = async (conversationId: string) => {
    if (!editTitle.trim()) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/conversations/${conversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle }),
      });
      
      if (response.ok) {
        onConversationUpdate?.();
      }
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    }
    
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = async (conversationId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        if (currentConversationId === conversationId) {
          onNewChat();
        }
        onConversationUpdate?.();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
    setMenuOpenId(null);
  };

  const startEdit = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
    setMenuOpenId(null);
  };

  const pinnedConversations = conversations.filter(c => c.is_pinned);
  const unpinnedConversations = conversations.filter(c => !c.is_pinned);

  const renderConversation = (conversation: Conversation) => {
    const isEditing = editingId === conversation.id;
    const isMenuOpen = menuOpenId === conversation.id;
    
    return (
      <div key={conversation.id} className="relative group">
        <div
          className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all ${
            currentConversationId === conversation.id 
              ? 'ring-2' 
              : 'hover:bg-white/5'
          }`}
          style={{
            backgroundColor: currentConversationId === conversation.id 
              ? theme.colors.primary + '10' 
              : 'transparent',
            ...(currentConversationId === conversation.id && { 
              '--tw-ring-color': theme.colors.primary 
            } as React.CSSProperties),
          }}
        >
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(conversation.id);
                if (e.key === 'Escape') {
                  setEditingId(null);
                  setEditTitle('');
                }
              }}
              onBlur={() => handleRename(conversation.id)}
              autoFocus
              className="flex-1 bg-transparent border-b outline-none text-sm min-w-0"
              style={{ 
                color: theme.colors.text,
                borderColor: theme.colors.primary
              }}
            />
          ) : (
            <button
              onClick={() => onConversationSelect(conversation.id)}
              className="flex-1 text-left min-w-0 overflow-hidden"
            >
              <p 
                className="text-sm overflow-hidden text-ellipsis whitespace-nowrap" 
                style={{ color: theme.colors.text }}
                title={conversation.title}
              >
                {conversation.title}
              </p>
              <p className="text-xs mt-1 truncate" style={{ color: theme.colors.textSecondary }}>
                {formatDate(conversation.updated_at)}
              </p>
            </button>
          )}
          
          {!isEditing && (
            <div className="relative flex-shrink-0 self-center">
              <button
                onClick={() => setMenuOpenId(isMenuOpen ? null : conversation.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity"
                style={{ color: theme.colors.textSecondary }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              
              {isMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setMenuOpenId(null)}
                  />
                  <div 
                    className="absolute right-0 top-8 z-20 w-48 rounded-lg shadow-lg border overflow-hidden"
                    style={{ 
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border
                    }}
                  >
                    <button
                      onClick={() => handlePin(conversation.id, conversation.is_pinned || false)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5 transition-colors"
                      style={{ color: theme.colors.text }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      {conversation.is_pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      onClick={() => startEdit(conversation)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5 transition-colors"
                      style={{ color: theme.colors.text }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Rename
                    </button>
                    <button
                      onClick={() => handleDelete(conversation.id)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-red-500/10 transition-colors"
                      style={{ color: '#ef4444' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ backgroundColor: theme.colors.surface }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: theme.colors.border }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img 
                src="/logo.svg" 
                alt="Project Lazarus" 
                className="w-6 h-6"
              />
              <h2 className="text-xl font-bold" style={{ color: theme.colors.text }}>
                Project Lazarus
              </h2>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10"
              style={{ color: theme.colors.textSecondary }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:opacity-90"
            style={{
              backgroundColor: theme.colors.primary + '20',
              color: theme.colors.primary,
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-medium">New chat</span>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Pinned Conversations */}
          {pinnedConversations.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setPinnedExpanded(!pinnedExpanded)}
                className="w-full flex items-center justify-between mb-2 hover:opacity-70 transition-opacity"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
                  Pinned ({pinnedConversations.length})
                </h3>
                <svg 
                  className={`w-4 h-4 transition-transform ${pinnedExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ color: theme.colors.textSecondary }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {pinnedExpanded && (
                <div className="space-y-1">
                  {pinnedConversations.map(renderConversation)}
                </div>
              )}
            </div>
          )}

          {/* History Conversations */}
          <div className="mb-4">
            <button
              onClick={() => setHistoryExpanded(!historyExpanded)}
              className="w-full flex items-center justify-between mb-2 hover:opacity-70 transition-opacity"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
                History ({unpinnedConversations.length})
              </h3>
              <svg 
                className={`w-4 h-4 transition-transform ${historyExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ color: theme.colors.textSecondary }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {historyExpanded && (
              <>
                {unpinnedConversations.length === 0 ? (
                  <p className="text-sm py-4" style={{ color: theme.colors.textSecondary }}>
                    No chat history yet
                  </p>
                ) : (
                  <div className="space-y-1">
                    {unpinnedConversations.map(renderConversation)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Theme Selector */}
        <div className="p-4 border-t" style={{ borderColor: theme.colors.border }}>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: theme.colors.textSecondary }}>
            Theme
          </h3>
          <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: '180px' }}>
            {Object.entries(themes).map(([key, t]) => (
              <button
                key={key}
                onClick={() => onThemeChange(key)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  currentTheme === key ? 'ring-2' : 'hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: currentTheme === key ? theme.colors.primary + '20' : 'transparent',
                  ...(currentTheme === key && { '--tw-ring-color': theme.colors.primary } as React.CSSProperties),
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.secondary})`,
                  }}
                />
                <span className="text-sm font-medium flex-1 text-left" style={{ color: theme.colors.text }}>
                  {t.name}
                </span>
                {currentTheme === key && (
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: theme.colors.primary }}>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Logout Button */}
        {onLogout && (
          <div className="p-4 border-t" style={{ borderColor: theme.colors.border }}>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-red-500/10"
              style={{ color: '#ef4444' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
