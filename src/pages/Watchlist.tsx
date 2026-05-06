import { useState, useEffect, useMemo } from 'react';
import { BackButton } from '@/components/BackButton';
import { GuidanceCard } from '@/components/GuidanceCard';
import { Bookmark, Building, MapPin, Target, Trash2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeatureGate } from '@/components/FeatureGate';
import { UpsellBanner } from '@/components/UpsellBanner';
import { getAreaPhotoUrl } from '@/lib/areaPhotos';

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

// Per-type gradient thumbs — match the mockup's "list-row with gradient thumb" pattern.
const TYPE_THUMB: Record<WatchlistType, { bg: string; ring: string; icon: string }> = {
  projects: {
    bg: 'radial-gradient(80% 80% at 30% 30%, rgba(46,255,192,0.40), transparent 70%), linear-gradient(135deg, #0e1830 0%, #06122a 100%)',
    ring: 'rgba(46,255,192,0.30)',
    icon: '#2effc0',
  },
  areas: {
    bg: 'radial-gradient(80% 80% at 30% 30%, rgba(123,92,255,0.40), transparent 70%), linear-gradient(135deg, #1a0533 0%, #2d1060 100%)',
    ring: 'rgba(123,92,255,0.30)',
    icon: '#c084fc',
  },
  signals: {
    bg: 'radial-gradient(80% 80% at 30% 30%, rgba(245,180,51,0.40), transparent 70%), linear-gradient(135deg, #2a0e08 0%, #4a1f0a 100%)',
    ring: 'rgba(245,180,51,0.30)',
    icon: '#fcd34d',
  },
};

const TYPE_LABEL: Record<WatchlistType, string> = {
  projects: 'projects',
  areas: 'areas',
  signals: 'signals',
};

function WatchlistContent() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [activeTab, setActiveTab] = useState<WatchlistType>('projects');
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [query, setQuery] = useState('');

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

  const filteredItems = useMemo(() => {
    const byType = items.filter(i => i.type === activeTab);
    if (!query.trim()) return byType;
    const q = query.trim().toLowerCase();
    return byType.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q)
    );
  }, [items, activeTab, query]);

  const renderEmptyState = (type: string) => (
    <div className="glass-panel p-8 text-center">
      <img
        src="/images/empty/watchlist-empty.webp"
        alt=""
        loading="lazy"
        decoding="async"
        aria-hidden="true"
        className="w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-3 select-none"
      />
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

  const totalCount = items.length;

  return (
    <div className="space-y-5 animate-fade-in">
      <BackButton />

      {/* Slim top row — title + count + Add */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Bookmark className="h-5 w-5 text-primary shrink-0" />
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Watchlist</h1>
          {totalCount > 0 && (
            <span className="text-[11px] font-bold text-muted-foreground/80 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
              {totalCount} {totalCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground rounded-full gap-1.5 h-9 sm:h-9 px-4 shrink-0"
          onClick={() => setAddOpen(!addOpen)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {/* Hero copy — replaces the wordier old description */}
      <div className="px-1">
        <h2 className="text-[18px] sm:text-xl font-black text-foreground tracking-tight leading-tight mb-1">
          {activeTab === 'areas' ? "Areas you're watching." :
           activeTab === 'projects' ? "Projects you're tracking." :
           "Signals you're monitoring."}
        </h2>
        <p className="text-[12.5px] sm:text-sm text-muted-foreground leading-relaxed">
          We surface fresh data on each item the next time you visit. Save anything worth tracking.
        </p>
      </div>

      {/* Search — sized for thumbs */}
      {totalCount > 0 && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Find a saved item..."
            className="glass-input h-12 pl-11 rounded-xl text-[14px]"
          />
        </div>
      )}

      <GuidanceCard
        storageKey="watchlist-v1"
        tone="info"
        title="Save anything worth tracking"
        description="Add projects, areas, or market signals you want to keep an eye on. We surface fresh data on each item the next time you visit."
        bullets={[
          'Add a project (e.g. "Creek Rise Tower 1") — we\'ll track its price + sales velocity.',
          'Add an area (e.g. "JVC") — get notified when DLD prices or yields shift.',
          'Add a signal (e.g. "Price drops in Damac Lagoons") — we monitor and alert.',
        ]}
      />

      {/* Add Item Form */}
      {addOpen && (
        <div className="glass-panel p-4 sm:p-5 animate-slide-down">
          <h3 className="font-bold text-foreground text-sm mb-3">Add to Watchlist · {TYPE_LABEL[activeTab]}</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Name</label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={activeTab === 'projects' ? 'Project name' : activeTab === 'areas' ? 'Area name' : 'Signal description'}
                className="glass-input h-12 sm:h-10"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Note (optional)</label>
              <Input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Why you're watching this..."
                className="glass-input h-12 sm:h-10"
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
        <TabsList className="bg-muted/30 grid grid-cols-3 w-full sm:w-auto sm:inline-flex p-1 rounded-[10px] sm:rounded-md">
          <TabsTrigger value="projects" className="gap-1.5 text-[11.5px] sm:text-xs h-9 sm:h-8 rounded-[7px] sm:rounded-sm">
            <Building className="h-3 w-3" />
            Projects <span className="opacity-60">({items.filter(i => i.type === 'projects').length})</span>
          </TabsTrigger>
          <TabsTrigger value="areas" className="gap-1.5 text-[11.5px] sm:text-xs h-9 sm:h-8 rounded-[7px] sm:rounded-sm">
            <MapPin className="h-3 w-3" />
            Areas <span className="opacity-60">({items.filter(i => i.type === 'areas').length})</span>
          </TabsTrigger>
          <TabsTrigger value="signals" className="gap-1.5 text-[11.5px] sm:text-xs h-9 sm:h-8 rounded-[7px] sm:rounded-sm">
            <Target className="h-3 w-3" />
            Signals <span className="opacity-60">({items.filter(i => i.type === 'signals').length})</span>
          </TabsTrigger>
        </TabsList>

        {(['projects', 'areas', 'signals'] as const).map(type => {
          const thumb = TYPE_THUMB[type];
          const TypeIcon = type === 'projects' ? Building : type === 'areas' ? MapPin : Target;
          return (
            <TabsContent key={type} value={type} className="mt-4">
              {filteredItems.length === 0 ? (
                query.trim() ? (
                  <div className="glass-panel p-8 text-center">
                    <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm mb-1">No matches for &ldquo;{query}&rdquo;</p>
                    <p className="text-muted-foreground/60 text-xs">Try a different search or clear the filter.</p>
                  </div>
                ) : (
                  renderEmptyState(type)
                )
              ) : (
                <div className="space-y-2">
                  {filteredItems.map(item => {
                    // Swap the gradient thumb for a real district photo when
                    // the item is an area we have a shot of. Falls back to
                    // the gradient + icon for projects, signals, and areas
                    // without imagery.
                    const photo = item.type === 'areas' ? getAreaPhotoUrl(item.name) : null;
                    return (
                    <div
                      key={item.id}
                      className="group rounded-2xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.14] transition-all p-3 sm:p-3.5 flex items-center gap-3 sm:gap-3.5"
                    >
                      {/* Photo thumb if we have one, else gradient + type icon */}
                      {photo ? (
                        <img
                          src={photo}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-14 h-14 sm:w-12 sm:h-12 rounded-xl shrink-0 object-cover ring-1 ring-white/10"
                        />
                      ) : (
                        <div
                          className="w-14 h-14 sm:w-12 sm:h-12 rounded-xl shrink-0 flex items-center justify-center border"
                          style={{ background: thumb.bg, borderColor: thumb.ring }}
                        >
                          <TypeIcon className="h-5 w-5" style={{ color: thumb.icon }} />
                        </div>
                      )}
                      {/* Body */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-[14px] leading-tight truncate">{item.name}</h3>
                        {item.description && (
                          <p className="text-[12px] text-muted-foreground truncate mt-0.5">{item.description}</p>
                        )}
                        <p className="text-[10.5px] text-muted-foreground/60 mt-0.5">
                          Saved {new Date(item.savedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {/* Always-visible 44 px tap target on mobile, hover-reveal on desktop */}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${item.name}`}
                        className="h-11 w-11 sm:h-9 sm:w-9 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          );
        })}
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
