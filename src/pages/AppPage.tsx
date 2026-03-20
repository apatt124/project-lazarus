import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavigationProvider, useNavigation } from '../contexts/NavigationContext';
import ResponsiveLayout from '../components/ResponsiveLayout';
import ChatView from '../components/views/ChatView';
import GraphView from '../components/views/GraphView';
import DocumentsView from '../components/views/DocumentsView';
import FactsView from '../components/views/FactsView';
import { themes, defaultTheme } from '../lib/themes';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  is_pinned?: boolean;
}

function AppContent() {
  const [currentTheme, setCurrentTheme] = useState(defaultTheme);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const { currentView, toggleSidebar } = useNavigation();

  useEffect(() => {
    // Load theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
    
    // Load conversations
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/conversations`);
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    localStorage.setItem('theme', theme);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('lazarus_auth');
    navigate('/');
  };

  const handleConversationSelect = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  const handleNewChat = () => {
    setCurrentConversationId(undefined);
  };

  const theme = themes[currentTheme];

  return (
    <ResponsiveLayout
      theme={theme}
      currentTheme={currentTheme}
      onThemeChange={handleThemeChange}
      conversations={conversations}
      currentConversationId={currentConversationId}
      onConversationSelect={handleConversationSelect}
      onNewChat={handleNewChat}
      onLogout={handleLogout}
      onConversationUpdate={loadConversations}
    >
      {currentView === 'chat' && (
        <ChatView 
          theme={theme} 
          onMenuClick={toggleSidebar}
          currentConversationId={currentConversationId}
          onConversationChange={handleConversationSelect}
          onNewChat={handleNewChat}
        />
      )}
      {currentView === 'graph' && <GraphView theme={theme} />}
      {currentView === 'documents' && <DocumentsView theme={theme} />}
      {currentView === 'facts' && <FactsView theme={theme} />}
    </ResponsiveLayout>
  );
}

export default function AppPage() {
  return (
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  );
}
