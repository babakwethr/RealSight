import { useNavigate } from 'react-router-dom';
import { BackButton } from '@/components/BackButton';
import { Calendar, Building, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUpdates } from '@/hooks/useInvestorData';

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return formatDate(dateString);
};

export default function Updates() {
  const { data: updates, isLoading } = useUpdates();
  const navigate = useNavigate();

  const handleSummarize = (update: { title: string; summary: string; project: { name: string } }) => {
    const message = `Summarize this update and explain what it means for my investment: "${update.title}" - ${update.summary} (Project: ${update.project?.name})`;
    navigate('/concierge', { state: { initialMessage: message } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <BackButton />
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Latest Updates</h1>
        <p className="text-muted-foreground mt-1">News and updates from your investments</p>
      </div>

      {/* Updates Feed */}
      <div className="space-y-4">
        {updates?.map((update, index) => (
          <div
            key={update.id}
            className="glass-panel p-6 animate-slide-up hover:border-primary/30 transition-all duration-300"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                <Building className="h-6 w-6 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20 mb-2">
                      {update.project?.name}
                    </span>
                    <h3 className="text-lg font-semibold text-foreground">
                      {update.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                    <Calendar className="h-4 w-4" />
                    {getRelativeTime(update.created_at)}
                  </div>
                </div>
                
                <p className="text-muted-foreground leading-relaxed">
                  {update.summary}
                </p>

                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSummarize(update)}
                    className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Summarize with AI
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(!updates || updates.length === 0) && (
        <div className="glass-panel p-12 text-center">
          <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">No updates yet</h3>
          <p className="text-sm text-muted-foreground">
            Project updates will appear here once available.
          </p>
        </div>
      )}
    </div>
  );
}
