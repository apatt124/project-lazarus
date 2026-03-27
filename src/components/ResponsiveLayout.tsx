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
    <div className="min-h-screen" style={{ backgroundColor: theme.colors.background }}>

      {/* Sidebar - slides in over content on all screen sizes */}
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

      {/* Page content - full width, padded bottom on mobile for nav bar */}
      <main className={isMobile ? 'pb-16' : ''}>
        {children}
      </main>

      {/* Bottom Navigation - Mobile only, fixed to bottom */}
      {isMobile && (
        <BottomNavigation
          currentView={currentView}
          onNavigate={setView}
          theme={theme}
        />
      )}
    </div>
  );
}
