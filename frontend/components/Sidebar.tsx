'use client';

import { Theme, themes } from '@/lib/themes';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  chatHistory: string[];
  onLogout?: () => void;
}

export default function Sidebar({ isOpen, onClose, theme, currentTheme, onThemeChange, chatHistory, onLogout }: SidebarProps) {
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
            <h2 className="text-xl font-bold" style={{ color: theme.colors.text }}>
              Project Lazarus
            </h2>
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
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
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
          <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: theme.colors.textSecondary }}>
              Recent Chats
            </h3>
            {chatHistory.length === 0 ? (
              <p className="text-sm py-4" style={{ color: theme.colors.textSecondary }}>
                No chat history yet
              </p>
            ) : (
              <div className="space-y-1">
                {chatHistory.map((chat, index) => (
                  <button
                    key={index}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-all"
                    style={{ color: theme.colors.text }}
                  >
                    <p className="text-sm truncate">{chat}</p>
                  </button>
                ))}
              </div>
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
