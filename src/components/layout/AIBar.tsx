import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Paperclip, PieChart, CreditCard, FolderOpen, Columns, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { brand } from '@/config/brand';

const quickActions = [
  { label: 'Portfolio', icon: PieChart, path: '/portfolio' },
  { label: 'Payments', icon: CreditCard, path: '/payments' },
  { label: 'Documents', icon: FolderOpen, path: '/documents' },
  { label: 'Compare', icon: Columns, path: '/compare' },
  { label: 'Updates', icon: Bell, path: '/updates' },
];

export function AIBar() {
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      navigate('/concierge', { state: { initialMessage: message } });
      setMessage('');
    }
  };

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-64 right-0 p-4 pointer-events-none z-50">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        {/* Quick Action Chips */}
        <div className="flex gap-2 mb-3 justify-center flex-wrap">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.path)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium 
                         glass-button rounded-full text-muted-foreground hover:text-primary transition-all duration-200"
            >
              <action.icon className="h-3.5 w-3.5" />
              {action.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="glass-panel flex items-center gap-2 p-2.5 rounded-2xl">
            <button
              type="button"
              className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/10"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Ask ${brand.display.portalTitle} AI anything...`}
              className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground text-sm py-1"
            />

            <Button
              type="submit"
              size="icon"
              disabled={!message.trim()}
              className="bg-primary hover:bg-accent-green-dark text-primary-foreground rounded-xl h-9 w-9 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
