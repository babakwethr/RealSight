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
        <Button
          variant="outline"
          className="gap-2 h-12 sm:h-10 rounded-xl bg-white/[0.06] sm:glass-panel border border-transparent sm:border-glass-border hover:bg-white/[0.10] hover:border-primary/40 text-[13px] font-semibold w-full sm:w-auto"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Advanced Filters</span>
          <span className="sm:hidden">Filters</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md bg-background/95 backdrop-blur-xl border-l border-glass-border p-0 flex flex-col pt-[env(safe-area-inset-top)]">
        <SheetHeader className="px-5 py-5 sm:p-6 border-b border-white/[0.06] flex-none">
          <SheetTitle className="text-[20px] sm:text-xl font-black text-foreground text-left tracking-tight">
            Advanced Filters
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:p-6 space-y-7 sm:space-y-8 custom-scrollbar">

          {/* Construction Status */}
          <div className="space-y-3">
            <h4 className="text-[13px] font-bold text-foreground tracking-tight">Construction Status</h4>
            <div className="flex flex-wrap gap-2">
              {['Under Construction', 'Ready', 'Pre-Launch'].map(status => {
                const active = localFilters.constructionStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => setLocalFilters(f => ({ ...f, constructionStatus: f.constructionStatus === status ? null : status }))}
                    className={cn(
                      "h-9 px-3.5 rounded-[10px] text-[12px] font-semibold border transition-all duration-150 whitespace-nowrap",
                      active
                        ? "bg-primary/15 text-primary border-primary/50"
                        : "bg-white/[0.04] text-foreground/75 border-transparent hover:bg-white/[0.07]"
                    )}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sale Status */}
          <div className="space-y-3">
            <h4 className="text-[13px] font-bold text-foreground tracking-tight">Sale Status</h4>
            <div className="flex flex-wrap gap-2">
              {['Available', 'Sold Out', 'Coming Soon'].map(status => {
                const active = localFilters.saleStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => setLocalFilters(f => ({ ...f, saleStatus: f.saleStatus === status ? null : status }))}
                    className={cn(
                      "h-9 px-3.5 rounded-[10px] text-[12px] font-semibold border transition-all duration-150 whitespace-nowrap",
                      active
                        ? "bg-primary/15 text-primary border-primary/50"
                        : "bg-white/[0.04] text-foreground/75 border-transparent hover:bg-white/[0.07]"
                    )}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-bold text-foreground tracking-tight">Maximum Price (AED)</h4>
              <span className="text-[12px] font-bold text-primary tabular-nums">
                {localFilters.maxPrice ? `${(localFilters.maxPrice / 1000000).toFixed(1)}M+` : 'Any'}
              </span>
            </div>
            <Slider
              defaultValue={[localFilters.maxPrice || 10000000]}
              max={20000000}
              step={500000}
              onValueChange={(val) => setLocalFilters(f => ({ ...f, maxPrice: val[0] }))}
              className="py-3"
            />
            <div className="flex justify-between text-[11px] font-medium text-foreground/50 tabular-nums">
              <span>0</span>
              <span>20M+</span>
            </div>
          </div>

          {/* Payment Plan Presets */}
          <div className="space-y-3">
            <h4 className="text-[13px] font-bold text-foreground tracking-tight">Payment Plan</h4>
            <div className="grid grid-cols-3 gap-2">
              {['All', ...PAYMENT_PLAN_PRESETS].map(plan => {
                const active = localFilters.paymentPlan === plan || (plan === 'All' && !localFilters.paymentPlan);
                return (
                  <button
                    key={plan}
                    onClick={() => setLocalFilters(f => ({ ...f, paymentPlan: plan === 'All' ? null : plan }))}
                    className={cn(
                      "h-10 rounded-[10px] text-[12.5px] font-semibold border transition-all duration-150 text-center",
                      active
                        ? "bg-primary/15 text-primary border-primary/50"
                        : "bg-white/[0.04] text-foreground/75 border-transparent hover:bg-white/[0.07]"
                    )}
                  >
                    {plan}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-foreground/45 mt-1.5">
              Select preferred Pre-handover/Handover split
            </p>
          </div>

        </div>

        <SheetFooter className="px-5 py-4 sm:p-6 border-t border-white/[0.06] bg-background/50 flex flex-row gap-3 sm:justify-between items-center safe-area-bottom pb-[max(env(safe-area-inset-bottom),1rem)]">
          <Button
            variant="ghost"
            onClick={resetFilters}
            className="flex-1 h-12 sm:h-10 rounded-xl text-[13px] font-bold text-foreground/65 hover:text-foreground hover:bg-white/[0.04]"
          >
            Reset
          </Button>
          <SheetClose asChild>
            <Button
              onClick={applyFilters}
              className="flex-1 h-12 sm:h-10 rounded-xl text-[13px] font-bold border-0 shadow-[0_8px_24px_-6px_rgba(24,214,164,0.55)]"
              style={{
                background: 'linear-gradient(135deg, #2effc0 0%, #18d6a4 50%, #0fa37c 100%)',
                color: '#04130b',
              }}
            >
              Apply Filters
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
