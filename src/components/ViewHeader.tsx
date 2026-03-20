import { ReactNode } from 'react';
import { Theme } from '../lib/themes';
import { useNavigation } from '../contexts/NavigationContext';

interface ViewHeaderProps {
  theme: Theme;
  title: string;
  rightContent?: ReactNode;
}

export default function ViewHeader({ theme, title, rightContent }: ViewHeaderProps) {
  const { isMobile, setView, toggleSidebar } = useNavigation();

  // Don't render on mobile (uses bottom nav instead)
  if (isMobile) return null;

  return (
    <header className="flex p-4 border-b" style={{ borderColor: theme.colors.border }}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-white/10 transition-all"
            style={{ color: theme.colors.text }}
            title="Toggle sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setView('chat')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Go to chat"
          >
            <img 
              src="/logo.svg" 
              alt="Project Lazarus" 
              className="w-8 h-8"
            />
            <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: theme.colors.text }}>
              <span>{title}</span>
            </h1>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {rightContent || (
            <>
              <button
                onClick={() => setView('chat')}
                className="p-2 rounded-lg transition-all hover:bg-white/10"
                style={{ color: theme.colors.textSecondary }}
                title="Back to Chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              <button
                onClick={() => setView('graph')}
                className="p-2 rounded-lg transition-all hover:bg-white/10"
                style={{ color: theme.colors.textSecondary }}
                title="View Knowledge Graph"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </button>
              <button
                onClick={() => setView('documents')}
                className="p-2 rounded-lg transition-all hover:bg-white/10"
                style={{ color: theme.colors.textSecondary }}
                title="View Documents"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button
                onClick={() => setView('facts')}
                className="p-2 rounded-lg transition-all hover:bg-white/10"
                style={{ color: theme.colors.textSecondary }}
                title="View Facts"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
