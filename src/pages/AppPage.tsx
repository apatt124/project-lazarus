import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatInterface from '../components/ChatInterface';
import { themes, defaultTheme } from '../lib/themes';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  is_pinned?: boolean;
}

export default function AppPage() {
  const [currentTheme, setCurrentTheme] = useState(defaultTheme);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Closed by default
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

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
    // Don't close sidebar on desktop, only on mobile
  };

  const handleNewConversation = () => {
    setCurrentConversationId(undefined);
  };

  const handleConversationChange = (conversationId: string, title: string) => {
    setCurrentConversationId(conversationId);
    // Reload conversations to update the list
    loadConversations();
  };

  const theme = themes[currentTheme];

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: theme.colors.background }}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarOpen(!sidebarOpen)}
        theme={theme}
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onConversationSelect={handleConversationSelect}
        onNewChat={handleNewConversation}
        onLogout={handleLogout}
        onConversationUpdate={loadConversations}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <ChatInterface
          theme={theme}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          conversationId={currentConversationId}
          onConversationChange={handleConversationChange}
          onNewConversation={handleNewConversation}
        />
      </div>
    </div>
  );
}
