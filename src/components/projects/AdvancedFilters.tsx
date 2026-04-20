import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { SlidersHorizontal, X } from 'lucide-react';
import { ProjectFilters, INITIAL_FILTERS, PAYMENT_PLAN_PRESETS } from '@/lib/reelly';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface AdvancedFiltersProps {
  filters: ProjectFilters;
  onChange: (newFilters: ProjectFilters) => void;
}

export function AdvancedFilters({ filters, onChange }: AdvancedFiltersProps) {
  const { t } = useTranslation();
  const [localFilters, setLocalFilters] = useState<ProjectFilters>(filters);

  const applyFilters = () => {
    onChange(localFilters);
  };

  const resetFilters = () => {
    setLocalFilters(INITIAL_FILTERS);
    onChange(INITIAL_FILTERS);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 border-glass-border glass-panel hover:bg-white/5">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Advanced Filters</span>
          <span className="sm:hidden">Filters</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md bg-background/95 backdrop-blur-xl border-l border-glass-border p-0 flex flex-col pt-[env(safe-area-inset-top)]">
        <SheetHeader className="p-6 border-b border-glass-border flex-none">
          <SheetTitle className="text-xl font-light text-foreground text-left">Advanced Filters</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Construction Status */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Construction Status</h4>
            <div className="flex flex-wrap gap-2">
              {['Under Construction', 'Ready', 'Pre-Launch'].map(status => (
                <button
                  key={status}
                  onClick={() => setLocalFilters(f => ({ ...f, constructionStatus: f.constructionStatus === status ? null : status }))}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-medium border transition-all duration-200",
                    localFilters.constructionStatus === status
                      ? "bg-primary text-background border-primary"
                      : "bg-transparent text-foreground/70 border-glass-border hover:border-primary/50"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Sale Status */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Sale Status</h4>
            <div className="flex flex-wrap gap-2">
              {['Available', 'Sold Out', 'Coming Soon'].map(status => (
                <button
                  key={status}
                  onClick={() => setLocalFilters(f => ({ ...f, saleStatus: f.saleStatus === status ? null : status }))}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-medium border transition-all duration-200",
                    localFilters.saleStatus === status
                      ? "bg-primary text-background border-primary"
                      : "bg-transparent text-foreground/70 border-glass-border hover:border-primary/50"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Maximum Price (AED)</h4>
              <span className="text-xs text-primary">
                {localFilters.maxPrice ? `${(localFilters.maxPrice / 1000000).toFixed(1)}M+` : 'Any'}
              </span>
            </div>
            <Slider
              defaultValue={[localFilters.maxPrice || 10000000]}
              max={20000000}
              step={500000}
              onValueChange={(val) => setLocalFilters(f => ({ ...f, maxPrice: val[0] }))}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-foreground/50">
              <span>0</span>
              <span>20M+</span>
            </div>
          </div>

          {/* Payment Plan Presets */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Payment Plan</h4>
            <div className="grid grid-cols-3 gap-2">
              {['All', ...PAYMENT_PLAN_PRESETS].map(plan => (
                <button
                  key={plan}
                  onClick={() => setLocalFilters(f => ({ ...f, paymentPlan: plan === 'All' ? null : plan }))}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 text-center",
                    (localFilters.paymentPlan === plan || (plan === 'All' && !localFilters.paymentPlan))
                      ? "bg-primary/10 text-primary border-primary/50"
                      : "bg-transparent text-foreground/70 border-glass-border hover:border-primary/30"
                  )}
                >
                  {plan}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-foreground/40 mt-1">
              Select preferred Pre-handover/Handover split
            </p>
          </div>

        </div>

        <SheetFooter className="p-6 border-t border-glass-border bg-background/50 flex flex-row gap-3 sm:justify-between items-center safe-area-bottom pb-[max(env(safe-area-inset-bottom),1.5rem)]">
          <Button 
            variant="ghost" 
            onClick={resetFilters}
            className="flex-1 text-foreground/60 hover:text-foreground"
          >
            Reset
          </Button>
          <SheetClose asChild>
            <Button 
              onClick={applyFilters}
              className="flex-1 bg-primary hover:bg-accent-green-dark text-black font-medium"
            >
              Apply Filters
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
