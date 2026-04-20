import { useState, useEffect } from 'react';
import { BackButton } from '@/components/BackButton';
import { Bookmark, X, Building, MapPin, Target, Trash2, Plus, Search, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { FeatureGate } from '@/components/FeatureGate';
import { UpsellBanner } from '@/components/UpsellBanner';

type WatchlistType = 'projects' | 'areas' | 'signals';

interface WatchlistItem {
  id: string;
  type: WatchlistType;
  name: string;
  description?: string;
  savedAt: string;
  meta?: Record<string, string>;
}

// localStorage-based watchlist (no DB table required)
const STORAGE_KEY = 'realsight-watchlist';

function getWatchlist(): WatchlistItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveWatchlist(items: WatchlistItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function WatchlistContent() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [activeTab, setActiveTab] = useState<WatchlistType>('projects');
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    setItems(getWatchlist());
  }, []);

  const addItem = () => {
    if (!newName.trim()) return;
    const newItem: WatchlistItem = {
      id: `wl-${Date.now()}`,
      type: activeTab,
      name: newName.trim(),
      description: newDesc.trim() || undefined,
      savedAt: new Date().toISOString(),
    };
    const updated = [...items, newItem];
    setItems(updated);
    saveWatchlist(updated);
    setNewName('');
    setNewDesc('');
    setAddOpen(false);
  };

  const removeItem = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveWatchlist(updated);
  };

  const filteredItems = items.filter(i => i.type === activeTab);

  const renderEmptyState = (type: string) => (
    <div className="glass-panel p-8 text-center">
      <Bookmark className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-muted-foreground text-sm mb-1">No saved {type} yet</p>
      <p className="text-muted-foreground/60 text-xs mb-4">
        Save {type} from other pages, or add them manually here
      </p>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full gap-1.5"
        onClick={() => setAddOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        Add {type === 'projects' ? 'Project' : type === 'areas' ? 'Area' : 'Signal'}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <BackButton />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bookmark className="h-6 w-6 text-primary" />
            Watchlist
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Saved projects, areas, and signals for quick access
          </p>
        </div>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground rounded-full gap-1.5"
          onClick={() => setAddOpen(!addOpen)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Item
        </Button>
      </div>

      {/* Add Item Form */}
      {addOpen && (
        <div className="glass-panel p-5 animate-slide-down">
          <h3 className="font-semibold text-foreground text-sm mb-3">Add to Watchlist</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Name</label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={activeTab === 'projects' ? 'Project name' : activeTab === 'areas' ? 'Area name' : 'Signal description'}
                className="glass-input"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Note (optional)</label>
              <Input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Why you're watching this..."
                className="glass-input"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-primary text-primary-foreground rounded-full" onClick={addItem}>
              Save
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as WatchlistType)} className="w-full">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="projects" className="gap-1.5 text-xs">
            <Building className="h-3 w-3" />
            Projects ({items.filter(i => i.type === 'projects').length})
          </TabsTrigger>
          <TabsTrigger value="areas" className="gap-1.5 text-xs">
            <MapPin className="h-3 w-3" />
            Areas ({items.filter(i => i.type === 'areas').length})
          </TabsTrigger>
          <TabsTrigger value="signals" className="gap-1.5 text-xs">
            <Target className="h-3 w-3" />
            Signals ({items.filter(i => i.type === 'signals').length})
          </TabsTrigger>
        </TabsList>

        {['projects', 'areas', 'signals'].map(type => (
          <TabsContent key={type} value={type} className="mt-4">
            {filteredItems.length === 0 ? (
              renderEmptyState(type)
            ) : (
              <div className="space-y-2">
                {filteredItems.map(item => (
                  <div key={item.id} className="glass-card p-4 flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {type === 'projects' ? <Building className="h-5 w-5 text-primary" /> :
                       type === 'areas' ? <MapPin className="h-5 w-5 text-primary" /> :
                       <Target className="h-5 w-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm">{item.name}</h3>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60">
                        Saved {new Date(item.savedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default function Watchlist() {
  return (
    <>
      <FeatureGate feature="watchlist" blur>
        <WatchlistContent />
      </FeatureGate>
      <UpsellBanner feature="opportunity-signals" className="mt-6" />
    </>
  );
}
