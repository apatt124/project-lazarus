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
      className="flex h-full overflow-hidden" 
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content Area */}
        <div 
          className="flex-1 overflow-hidden"
          style={{
            paddingBottom: isMobile ? '64px' : '0'
          }}
        >
          {children}
        </div>

        {/* Bottom Navigation - Mobile only */}
        {isMobile && (
          <div 
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{ height: '64px' }}
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
