import { useState, useEffect, useRef } from 'react';
import { BackButton } from '@/components/BackButton';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Send,
  Paperclip,
  Plus,
  Trash2,
  Download,
  Bot,
  User,
  Loader2,
  MessageSquare,
  PieChart,
  CreditCard,
  FolderOpen,
  Columns,
  Bell,
  Search,
  TrendingUp,
  Building2,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatThreads, useChatMessages } from '@/hooks/useInvestorData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Concierge() {
  const location = useLocation();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isPro, plan } = useSubscription();
  const { data: threads, isLoading: threadsLoading } = useChatThreads();
  const activeThreadId = threads?.[0]?.id || null;
  const { data: dbMessages, isLoading: messagesLoading } = useChatMessages(activeThreadId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialMessageProcessed = useRef(false);

  // Contextual quick chips based on auth state and plan — per DESIGN.md
  const quickChips = user
    ? isPro
      // Portfolio Pro+: portfolio-focused chips
      ? [
          { label: 'My portfolio performance', icon: PieChart },
          { label: 'Upcoming payments', icon: CreditCard },
          { label: 'Analyse an area', icon: TrendingUp },
          { label: 'Compare two projects', icon: Columns },
          { label: 'Best areas for yield', icon: Zap },
        ]
      // Explorer logged-in: market + lite portfolio chips
      : [
          { label: 'Best areas to invest in Dubai', icon: TrendingUp },
          { label: 'What is the Market Score?', icon: Zap },
          { label: 'New launches in JVC', icon: Building2 },
          { label: 'My portfolio', icon: PieChart },
          { label: 'Upgrade to Investor Pro', icon: Zap },
        ]
    // Not logged in: purely market-intelligence focused
    : [
        { label: 'Best areas to invest in Dubai?', icon: TrendingUp },
        { label: 'What is the Market Score?', icon: Zap },
        { label: 'Current Dubai market outlook', icon: Building2 },
        { label: 'Search an area', icon: Search },
        { label: 'How do I get started?', icon: Bot },
      ];

  // Load messages from database
  useEffect(() => {
    if (dbMessages && dbMessages.length > 0) {
      setMessages(dbMessages.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at),
      })));
    } else if (!messagesLoading && !threadsLoading) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: t('concierge.welcome'),
        timestamp: new Date(),
      }]);
    }
  }, [dbMessages, messagesLoading, threadsLoading, t]);

  // Handle initial message from navigation
  useEffect(() => {
    const initialMessage = location.state?.initialMessage;
    if (initialMessage && !initialMessageProcessed.current && !messagesLoading) {
      initialMessageProcessed.current = true;
      setTimeout(() => {
        handleSendMessage(initialMessage);
      }, 500);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, messagesLoading]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (content: string) => {
    // Input validation
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return;
    }
    
    // Length limit to prevent abuse (5000 characters max)
    const MAX_MESSAGE_LENGTH = 5000;
    if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
      return;
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Save user message to database
    if (activeThreadId) {
      await supabase.from('chat_messages').insert({
        thread_id: activeThreadId,
        role: 'user',
        content: trimmedContent,
      });
    }

    try {
      // Build conversation history for AI
      const conversationHistory = [
        ...messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: trimmedContent },
      ];

      // Call the AI edge function
      const { data, error } = await supabase.functions.invoke('chat-concierge', {
        body: { messages: conversationHistory },
      });

      if (error) {
        console.error('AI function error:', error);
        throw new Error(error.message || 'Failed to get AI response');
      }

      // Handle streaming response
      let assistantContent = '';
      
      if (data && typeof data === 'object' && 'choices' in data) {
        // Non-streaming response
        assistantContent = data.choices?.[0]?.message?.content || 'I apologize, but I encountered an issue processing your request.';
      } else if (typeof data === 'string') {
        // Parse SSE stream
        const lines = data.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const jsonStr = line.slice(6);
              if (jsonStr.trim()) {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  assistantContent += delta;
                }
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }

      if (!assistantContent) {
        assistantContent = 'I apologize, but I encountered an issue processing your request. Please try again.';
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);

      // Save assistant message to database
      if (activeThreadId) {
        await supabase.from('chat_messages').insert({
          thread_id: activeThreadId,
          role: 'assistant',
          content: assistantContent,
        });
        queryClient.invalidateQueries({ queryKey: ['chat_messages', activeThreadId] });
      }

    } catch (error) {
      console.error('Error calling AI:', error);
      setIsTyping(false);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an issue processing your request. Please try again in a moment.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleSendMessage(input.trim());
    }
  };

  const handleQuickChip = (label: string) => {
    handleSendMessage(`Tell me about my ${label.toLowerCase()}`);
  };

  if (threadsLoading || messagesLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.20))] flex animate-fade-in">
      <BackButton />
      {/* Left Threads Panel */}
      <aside className="w-64 border-r border-border/50 flex flex-col bg-background/30 backdrop-blur-sm hidden lg:flex">
        {/* New Chat Button */}
        <div className="p-4">
          <Button
            className="w-full justify-start gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40"
            variant="outline"
            onClick={() => {
              setMessages([{
                id: Date.now().toString(),
                role: 'assistant',
                content: t('concierge.welcome'),
                timestamp: new Date(),
              }]);
              setInput('');
            }}
          >
            <Plus className="h-4 w-4" />
            {t('concierge.newChat')}
          </Button>
        </div>

        {/* Threads List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1">
            {threads?.map((thread, index) => (
              <button
                key={thread.id}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${
                  index === 0 
                    ? 'bg-primary/10 text-foreground border-l-2 border-primary' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{thread.title || 'New conversation'}</span>
              </button>
            ))}
            {(!threads || threads.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-4">{t('concierge.noConversations')}</p>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Chat Header */}
        <header className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-background" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{t('concierge.title')}</h2>
              <p className="text-xs text-emerald-400">{t('concierge.online')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                setMessages([{
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: t('concierge.welcome'),
                  timestamp: new Date(),
                }]);
                toast.success('Conversation cleared');
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                const text = messages.map(m => `[${m.role}] ${m.content}`).join('\n\n');
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'concierge-chat.txt';
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Chat exported');
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
          <div className="space-y-6 max-w-3xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'message-user rounded-tr-md'
                      : 'message-assistant rounded-tl-md'
                  }`}
                >
                  <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <p className="text-xs mt-2 text-muted-foreground">
                    {message.timestamp.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center border border-primary/25">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="message-assistant rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Bottom Input Area */}
        <div className="px-6 py-4 border-t border-border/30">
          {/* Quick Chips */}
          <div className="flex gap-2 mb-3 justify-center flex-wrap">
            {quickChips.map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleQuickChip(chip.label)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium 
                           glass-button rounded-full text-muted-foreground hover:text-primary transition-all"
              >
                <chip.icon className="h-3.5 w-3.5" />
                {chip.label}
              </button>
            ))}
          </div>

          {/* Helper Text */}
          <p className="text-xs text-muted-foreground text-center mb-3">
            {t('concierge.helperText')}
          </p>

          {/* Input Composer */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="glass-panel flex items-center gap-2 p-2 rounded-2xl">
              <button
                type="button"
                className="p-2.5 text-muted-foreground hover:text-primary transition-colors rounded-xl hover:bg-primary/10"
                onClick={() => toast.info('Attach files from your Documents page')}
              >
                <Paperclip className="h-5 w-5" />
              </button>
              
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('concierge.placeholder')}
                className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground text-sm py-2"
              />
              
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isTyping}
                className="bg-primary hover:bg-accent-green-dark text-primary-foreground rounded-xl h-10 w-10 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
