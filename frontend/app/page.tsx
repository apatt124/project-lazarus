'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import { themes, defaultTheme } from '@/lib/themes';

export default function Home() {
  const [currentTheme, setCurrentTheme] = useState(defaultTheme);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<string[]>([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    localStorage.setItem('theme', theme);
  };

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
