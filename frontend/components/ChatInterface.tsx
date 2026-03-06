'use client';

import { useState, useRef, useEffect } from 'react';
import { Theme } from '@/lib/themes';
import DocumentUpload from './DocumentUpload';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ id: string; similarity: number; content: string; tier?: number }>;
  intent?: 'medical' | 'general' | 'research' | 'conversation';
  confidence?: {
    overall: number;
    reasoning: string;
  };
  source_quality?: {
    tier1: number;
    tier2: number;
    tier3: number;
    tier4Plus: number;
  };
}

interface ChatInterfaceProps {
  theme: Theme;
  onMenuClick: () => void;
  onNewChat: (title: string) => void;
}

export default function ChatInterface({ theme, onMenuClick, onNewChat }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleSources = (messageIndex: number) => {
    setExpandedSources((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageIndex)) {
        newSet.delete(messageIndex);
      } else {
        newSet.add(messageIndex);
      }
      return newSet;
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    
    // Save to chat history
    if (messages.length === 0) {
      onNewChat(input.substring(0, 50));
    }
    
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: input,
          conversation_id: conversationId,
          include_memory: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Save conversation ID for future messages
        if (!conversationId) {
          setConversationId(data.conversation_id);
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
          intent: data.intent,
          confidence: data.confidence,
          source_quality: data.source_quality,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { icon: '📄', label: 'Upload document', action: () => setShowUpload(true) },
    { icon: '🔍', label: 'Search records', action: () => setInput('Search my medical records for ') },
    { icon: '📊', label: 'View summary', action: () => setInput('Give me a summary of my medical history') },
    { icon: '💊', label: 'Medications', action: () => setInput('What medications am I currently taking?') },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.colors.border }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-all"
            style={{ color: theme.colors.text }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold" style={{ color: theme.colors.text }}>
            Project Lazarus
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: theme.colors.primary + '20', color: theme.colors.primary }}>
            HIPAA Compliant
          </span>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-12">
            <div className="max-w-2xl w-full space-y-8 animate-slide-in">
              {/* Welcome Message */}
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                  </svg>
                  <span>Hi there</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-normal" style={{ color: theme.colors.text }}>
                  Where should we start?
                </h2>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all hover:scale-[1.02]"
                    style={{
                      backgroundColor: theme.colors.surface,
                      border: `1px solid ${theme.colors.border}`,
                      color: theme.colors.text,
                    }}
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <span className="text-sm font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl px-6 py-4 ${
                    message.role === 'user'
                      ? 'rounded-br-md'
                      : 'rounded-bl-md'
                  }`}
                  style={{
                    backgroundColor: message.role === 'user' ? theme.colors.primary : theme.colors.surface,
                    color: message.role === 'user' ? '#ffffff' : theme.colors.text,
                    border: message.role === 'assistant' ? `1px solid ${theme.colors.border}` : 'none',
                  }}
                >
                  {message.role === 'assistant' ? (
                    <div className="markdown-content">
                      {/* Intent and Confidence Badges */}
                      {(message.intent || message.confidence) && (
                        <div className="flex items-center gap-2 mb-3 pb-3 border-b" style={{ borderColor: theme.colors.border }}>
                          {message.intent && (
                            <span className="text-xs px-2 py-1 rounded-full" style={{ 
                              backgroundColor: theme.colors.background,
                              color: theme.colors.textSecondary 
                            }}>
                              {message.intent === 'medical' && '🏥 Medical'}
                              {message.intent === 'research' && '🔍 Research'}
                              {message.intent === 'general' && '💬 General'}
                              {message.intent === 'conversation' && '💭 Chat'}
                            </span>
                          )}
                          {message.confidence && (
                            <span 
                              className="text-xs px-2 py-1 rounded-full" 
                              style={{ 
                                backgroundColor: message.confidence.overall >= 0.8 
                                  ? theme.colors.primary + '20' 
                                  : message.confidence.overall >= 0.5 
                                    ? theme.colors.background 
                                    : '#ff990020',
                                color: message.confidence.overall >= 0.8 
                                  ? theme.colors.primary 
                                  : message.confidence.overall >= 0.5 
                                    ? theme.colors.textSecondary 
                                    : '#ff9900'
                              }}
                              title={message.confidence.reasoning}
                            >
                              {message.confidence.overall >= 0.8 && '✓ High Confidence'}
                              {message.confidence.overall >= 0.5 && message.confidence.overall < 0.8 && 'ℹ️ Moderate Confidence'}
                              {message.confidence.overall < 0.5 && '⚠️ Low Confidence'}
                            </span>
                          )}
                          {message.source_quality && (
                            <span className="text-xs opacity-60">
                              {message.source_quality.tier1 > 0 && `${message.source_quality.tier1} medical records`}
                              {message.source_quality.tier2 > 0 && ` • ${message.source_quality.tier2} authoritative`}
                              {message.source_quality.tier3 > 0 && ` • ${message.source_quality.tier3} professional`}
                            </span>
                          )}
                        </div>
                      )}
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ node, ...props }) => <h1 {...props} />,
                          h2: ({ node, ...props }) => <h2 {...props} />,
                          h3: ({ node, ...props }) => <h3 {...props} />,
                          p: ({ node, ...props }) => <p {...props} />,
                          ul: ({ node, ...props }) => <ul {...props} />,
                          ol: ({ node, ...props }) => <ol {...props} />,
                          li: ({ node, ...props }) => <li {...props} />,
                          strong: ({ node, ...props }) => <strong style={{ color: theme.colors.primary }} {...props} />,
                          code: ({ node, inline, ...props }: any) => 
                            inline ? (
                              <code className="px-1.5 py-0.5 rounded text-sm" style={{ backgroundColor: theme.colors.background }} {...props} />
                            ) : (
                              <code className="block p-3 rounded-lg text-sm overflow-x-auto" style={{ backgroundColor: theme.colors.background }} {...props} />
                            ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-4 pl-4" style={{ borderColor: theme.colors.primary }} {...props} />
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  )}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.colors.border }}>
                      <button
                        onClick={() => toggleSources(index)}
                        className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                          Sources ({message.sources.length})
                        </p>
                        <svg
                          className={`w-4 h-4 transition-transform ${expandedSources.has(index) ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {expandedSources.has(index) && (
                        <div className="mt-2 space-y-2 animate-slide-in">
                          {message.sources.map((source, idx) => (
                            <div key={idx} className="text-xs opacity-75 p-3 rounded-xl" style={{ backgroundColor: theme.colors.background }}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">
                                  {(source.similarity * 100).toFixed(0)}% match
                                </span>
                              </div>
                              <p className="line-clamp-2">{source.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-slide-in">
                <div className="px-6 py-4 rounded-3xl rounded-bl-md" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.colors.primary }}></div>
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.colors.primary, animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.colors.primary, animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm" style={{ color: theme.colors.textSecondary }}>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end gap-2 p-2 rounded-3xl" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
              <button
                type="button"
                onClick={() => setShowUpload(true)}
                className="p-3 rounded-xl hover:bg-white/10 transition-all flex-shrink-0"
                style={{ color: theme.colors.textSecondary }}
                title="Upload document"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your medical history..."
                className="flex-1 bg-transparent px-2 py-3 focus:outline-none text-base resize-none"
                style={{ color: theme.colors.text, minHeight: '24px', maxHeight: '200px' }}
                disabled={isLoading}
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '24px';
                  target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-3 rounded-xl transition-all flex-shrink-0 disabled:opacity-50"
                style={{ backgroundColor: theme.colors.primary, color: '#ffffff' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-center mt-2" style={{ color: theme.colors.textSecondary }}>
              Project Lazarus can make mistakes. Verify important information.
            </p>
          </form>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <DocumentUpload theme={theme} onClose={() => setShowUpload(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
