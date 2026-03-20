import { useState, useEffect } from 'react';
import { Theme } from '../../lib/themes';
import ChatInterface from '../ChatInterface';

interface ChatViewProps {
  theme: Theme;
  onMenuClick: () => void;
  currentConversationId?: string;
  onConversationChange: (conversationId: string) => void;
  onNewChat: () => void;
}

export default function ChatView({ 
  theme, 
  onMenuClick, 
  currentConversationId,
  onConversationChange,
  onNewChat 
}: ChatViewProps) {
  const handleConversationUpdate = (convId: string, title: string) => {
    onConversationChange(convId);
  };

  return (
    <ChatInterface
      theme={theme}
      onMenuClick={onMenuClick}
      onCloseSidebar={() => {}}
      conversationId={currentConversationId}
      onConversationChange={handleConversationUpdate}
      onNewConversation={onNewChat}
      sidebarCollapsed={false}
    />
  );
}
