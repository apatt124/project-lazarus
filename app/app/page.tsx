'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import { themes, defaultTheme } from '@/lib/themes';

export default function AppPage() {
  const [currentTheme, setCurrentTheme] = useState(defaultTheme);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const auth = sessionStorage.getItem('lazarus_auth');
    if (auth !== 'true') {
      router.push('/');
      return;
    }
    setIsAuthenticated(true);

    // Load theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, [router]);

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    localStorage.setItem('theme', theme);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('lazarus_auth');
    router.push('/');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  const theme = themes[currentTheme];

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: theme.colors.background }}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
        chatHistory={chatHistory}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <ChatInterface
          theme={theme}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onNewChat={(title) => setChatHistory([title, ...chatHistory])}
        />
      </div>
    </div>
  );
}
