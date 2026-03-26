import { ReactNode } from 'react';
import { Theme } from '../lib/themes';
import { useNavigation } from '../contexts/NavigationContext';
import BottomNavigation from './BottomNavigation';
import Sidebar from './Sidebar';

interface ResponsiveLayoutProps {
  theme: Theme;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  conversations: any[];
  currentConversationId?: string;
  onConversationSelect: (id: string) => void;
  onNewChat: () => void;
  onLogout: () => void;
  onConversationUpdate: () => void;
  children: ReactNode;
}

export default function ResponsiveLayout({
  theme,
  currentTheme,
  onThemeChange,
  conversations,
  currentConversationId,
  onConversationSelect,
  onNewChat,
  onLogout,
  onConversationUpdate,
  children,
}: ResponsiveLayoutProps) {
  const { currentView, setView, isMobile, sidebarOpen, toggleSidebar, setSidebarOpen } = useNavigation();

  return (
    <div 
      className="flex h-screen overflow-hidden" 
      style={{ 
        backgroundColor: theme.colors.background,
      }}
    >
      {/* Sidebar - Desktop only or mobile when open */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={toggleSidebar}
        theme={theme}
        currentTheme={currentTheme}
        onThemeChange={onThemeChange}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onConversationSelect={onConversationSelect}
        onNewChat={onNewChat}
        onLogout={onLogout}
        onConversationUpdate={onConversationUpdate}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ position: 'relative' }}>
        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>

        {/* Bottom Navigation - Mobile only */}
        {isMobile && (
          <div 
            className="flex-shrink-0"
            style={{ 
              height: '64px',
              borderTop: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.background
            }}
          >
            <BottomNavigation
              currentView={currentView}
              onNavigate={setView}
              theme={theme}
            />
          </div>
        )}
      </div>
    </div>
  );
}
