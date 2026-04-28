import { useState } from 'react';
import { BackButton } from '@/components/BackButton';
import { GuidanceCard } from '@/components/GuidanceCard';
import { DollarSign, TrendingUp, Percent, Building, FileText, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHoldings, usePortfolioSummary, useProjects, useInvestorId, useDLDAreas, useDLDDevelopers } from '@/hooks/useInvestorData';
import { PortfolioValueChart } from '@/components/charts/PortfolioValueChart';
import { AllocationChart } from '@/components/charts/AllocationChart';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { HoldingInsightsDrawer } from '@/components/portfolio/HoldingInsightsDrawer';
import { Holding } from '@/hooks/useInvestorData';
import { HeroMetricCard } from '@/components/HeroMetricCard';
import { AIVerdict } from '@/components/AIVerdict';

// Per LAUNCH_PLAN.md §17 — dual-price (AED + USD) everywhere. The pegged
// rate makes a static helper safe and keeps non-UAE investors anchored.
import { formatDualPrice } from '@/lib/currency';
const formatCurrency = (value: number) => formatDualPrice(value);

export default function Portfolio() {
  const queryClient = useQueryClient();
  const { data: holdings, isLoading: holdingsLoading } = useHoldings();
  const { summary, isLoading: summaryLoading } = usePortfolioSummary();
  const { data: projects } = useProjects();
  const { data: investorId } = useInvestorId();

  const { data: areas } = useDLDAreas();
  const { data: developers } = useDLDDevelopers();

  const [showAddProperty, setShowAddProperty] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [saving, setSaving] = useState(false);
  const [propertyForm, setPropertyForm] = useState({
    project_id: '',
    unit_ref: '',
    invested_amount: '',
    area_id: '',
    developer_id: '',
    property_type: '',
  });

  const isLoading = holdingsLoading || summaryLoading;

  const kpis = summary ? [
    {
      label: 'Total Invested',
      value: formatCurrency(summary.totalInvested),
      icon: DollarSign
    },
    {
      label: 'Current Value',
      value: formatCurrency(summary.currentValue),
      icon: TrendingUp
    },
    {
      label: 'Profit/Loss',
      value: `${summary.profitLoss >= 0 ? '+' : '-'}${formatCurrency(Math.abs(summary.profitLoss))}`,
      icon: DollarSign,
      positive: true
    },
    {
      label: 'ROI',
      value: `${summary.roi.toFixed(1)}%`,
      icon: Percent,
      positive: true
    },
  ] : [];

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
      pending: 'bg-primary/15 text-primary border-primary/25',
      sold: 'bg-primary/15 text-primary border-primary/25',
    };
    return styles[status as keyof typeof styles] || styles.active;
  };

  const calculateGain = (invested: number, current: number) => {
    const gain = ((current - invested) / invested) * 100;
    return `${gain >= 0 ? '+' : ''}${gain.toFixed(0)}%`;
  };

  const resetForm = () => {
    setPropertyForm({ project_id: '', unit_ref: '', invested_amount: '', area_id: '', developer_id: '', property_type: '' });
  };

  const handleAddProperty = async () => {
    if (!propertyForm.project_id || !propertyForm.unit_ref || !propertyForm.invested_amount || !propertyForm.area_id || !propertyForm.developer_id || !propertyForm.property_type) {
      toast.error('All fields are required');
      return;
    }

    if (!investorId) {
      toast.error('Unable to identify investor');
      return;
    }

    const amount = parseFloat(propertyForm.invested_amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invested amount must be a valid positive number');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('holdings').insert({
        investor_id: investorId,
        project_id: propertyForm.project_id,
        unit_ref: propertyForm.unit_ref,
        invested_amount: amount,
        current_value: amount,
        status: 'pending',
        area_id: propertyForm.area_id,
        developer_id: propertyForm.developer_id,
        property_type: propertyForm.property_type,
      });

      if (error) throw error;

      toast.success('Property submitted for approval');
      setShowAddProperty(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
    } catch (error) {
      console.error('Error adding property:', error);
      toast.error('Failed to add property');
    } finally {
      setSaving(false);
    }
  };

  const handleRowClick = (holding: Holding) => {
    setSelectedHolding(holding);
    setShowInsights(true);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Portfolio</h1>
          <p className="text-muted-foreground mt-1">Your investment overview and holdings</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setShowAddProperty(true)}
            className="border-primary/30 hover:bg-primary/10 w-full sm:w-auto text-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
          <Button
            onClick={() => {
              import('@/utils/exportPortfolio').then(mod => {
                if (mod.exportPortfolioCSV && holdings) {
                  mod.exportPortfolioCSV(holdings);
                  toast.success('Portfolio statement exported');
                } else {
                  // Fallback: generate simple CSV
                  if (!holdings || holdings.length === 0) {
                    toast.info('No holdings to export');
                    return;
                  }
                  const rows = [['Project', 'Unit', 'Invested', 'Current Value', 'Status'].join(',')];
                  holdings.forEach(h => {
                    rows.push([h.project?.name || '', h.unit_ref, h.invested_amount, h.current_value, h.status].join(','));
                  });
                  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `portfolio-statement-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Portfolio statement exported');
                }
              }).catch(() => {
                toast.error('Export not available');
              });
            }}
            className="bg-primary hover:bg-accent-green-dark text-primary-foreground w-full sm:w-auto"
          >
            <FileText className="h-4 w-4 mr-2" />
            Export Statement
          </Button>
        </div>
      </div>

      <GuidanceCard
        storageKey="portfolio-v1"
        tone="info"
        title="Your investment portfolio — at a glance"
        description="Every property you own (or are tracking) lives here. We pull the latest DLD market value for each unit so you see how your wealth is growing in real time."
        bullets={[
          'Add a property — log a unit you bought (or are about to buy) so we can track its value.',
          'See ROI live — current value vs invested capital, updated against DLD comparables.',
          'Export Statement — download a CSV of your holdings for your accountant or family office.',
          'Compare Holdings — side-by-side ROI between properties (left sidebar).',
        ]}
      />

      {/* ── Portfolio Hero + AI Verdict — purple gradient ── */}
      {summary && (() => {
        const roi = summary.roi;
        const tone: 'positive' | 'caution' | 'negative' | 'neutral' =
          roi >= 12 ? 'positive' : roi >= 5 ? 'neutral' : roi >= 0 ? 'caution' : 'negative';
        const direction: 'up' | 'down' | 'flat' =
          roi > 1 ? 'up' : roi < -1 ? 'down' : 'flat';
        const verdictLabel = roi >= 12 ? 'Outperforming' : roi >= 5 ? 'On track' : roi >= 0 ? 'Flat' : 'Under target';
        const progress = Math.max(0, Math.min(100, (roi / 20) * 100));
        const count = holdings?.length ?? 0;
        return (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3">
              <HeroMetricCard
                variant="purple"
                badge={`${count} HOLDING${count === 1 ? '' : 'S'} · PORTFOLIO`}
                label="Portfolio ROI"
                metric={`${roi >= 0 ? '+' : ''}${roi.toFixed(1)}`}
                metricSuffix="%"
                verdict={verdictLabel}
                verdictDirection={direction}
                progress={progress}
                decoration="rings"
              >
                {formatCurrency(summary.currentValue)} current value ·{' '}
                {summary.profitLoss >= 0 ? '+' : '-'}
                {formatCurrency(Math.abs(summary.profitLoss))} P/L
              </HeroMetricCard>
            </div>
            <div className="lg:col-span-2">
              <AIVerdict
                tone={tone}
                headline={
                  tone === 'positive' ? 'Portfolio is compounding well'
                  : tone === 'neutral'  ? 'Balanced, steady growth'
                  : tone === 'caution'  ? 'Returns are lagging'
                  : 'Drawdown detected'
                }
                factors={[
                  `${count} active holding${count === 1 ? '' : 's'} tracked`,
                  `${formatCurrency(summary.totalInvested)} invested vs ${formatCurrency(summary.currentValue)} current`,
                  `Net P/L ${summary.profitLoss >= 0 ? '+' : '-'}${formatCurrency(Math.abs(summary.profitLoss))}`,
                ]}
              >
                Your portfolio is currently <span className="font-semibold text-foreground">{verdictLabel.toLowerCase()}</span> with an ROI of <span className="font-semibold text-foreground">{roi.toFixed(1)}%</span>.{' '}
                {roi >= 12
                  ? 'Consider locking in gains on your best performers or rebalancing toward new high-momentum areas.'
                  : roi >= 5
                  ? 'Performance is solid — watch area momentum signals for re-allocation opportunities.'
                  : roi >= 0
                  ? 'Returns are flat. Review underperforming holdings and consider swaps into higher-yield areas.'
                  : 'One or more holdings are dragging the portfolio down. Open the insights drawer on each to diagnose.'}
              </AIVerdict>
            </div>
          </div>
        );
      })()}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
                <p className={`text-2xl font-bold ${kpi.positive ? 'text-emerald-400' : 'text-foreground'}`}>
                  {kpi.value}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl border ${kpi.positive ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-primary/10 border-primary/20'}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.positive ? 'text-emerald-400' : 'text-primary'}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="glass-panel p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Portfolio Performance</h2>
          <PortfolioValueChart />
        </div>

        {/* Allocation Chart */}
        <div className="glass-panel p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Allocation by Project</h2>
          {summary?.allocation && summary.allocation.length > 0 ? (
            <AllocationChart data={summary.allocation} />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No holdings data available
            </div>
          )}
        </div>
      </div>

      {/* Holdings — mobile card list + desktop table */}
      <div className="glass-panel p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">Holdings</h2>

        {/* ── Mobile: card list (shown below sm) ── */}
        <div className="sm:hidden space-y-3">
          {(!holdings || holdings.length === 0) ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No holdings found. Add a property to get started.</p>
          ) : holdings.map(holding => {
            const gain = calculateGain(Number(holding.invested_amount), Number(holding.current_value));
            const isPositive = Number(holding.current_value) >= Number(holding.invested_amount);
            return (
              <div
                key={holding.id}
                onClick={() => handleRowClick(holding)}
                className="rounded-xl border border-border/30 bg-white/[0.03] p-4 cursor-pointer active:bg-white/[0.06]"
              >
                {/* Top: project + status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20 shrink-0">
                      <Building className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-snug">
                        {holding.project?.name || 'Unknown Project'}
                      </p>
                      {holding.unit_ref && (
                        <p className="text-[11px] text-muted-foreground">{holding.unit_ref}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full border shrink-0 ${getStatusBadge(holding.status)}`}>
                    {holding.status.charAt(0).toUpperCase() + holding.status.slice(1)}
                  </span>
                </div>

                {/* Bottom: financials */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Invested</p>
                    <p className="text-xs font-semibold text-foreground">{formatCurrency(Number(holding.invested_amount))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Value</p>
                    <p className="text-xs font-semibold text-foreground">{formatCurrency(Number(holding.current_value))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Gain</p>
                    <p className={`text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>{gain}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Desktop: standard table (hidden below sm) ── */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Project</TableHead>
                <TableHead className="text-muted-foreground">Unit Ref</TableHead>
                <TableHead className="text-muted-foreground text-right">Invested</TableHead>
                <TableHead className="text-muted-foreground text-right">Current Value</TableHead>
                <TableHead className="text-muted-foreground text-right">Gain</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings?.map((holding) => (
                <TableRow
                  key={holding.id}
                  className="border-border/30 hover:bg-muted/10 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(holding)}
                >
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                        <Building className="h-4 w-4 text-primary" />
                      </div>
                      {holding.project?.name || 'Unknown Project'}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{holding.unit_ref}</TableCell>
                  <TableCell className="text-right text-foreground">
                    {formatCurrency(Number(holding.invested_amount))}
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    {formatCurrency(Number(holding.current_value))}
                  </TableCell>
                  <TableCell className={`text-right ${Number(holding.current_value) >= Number(holding.invested_amount) ? 'text-emerald-400' : 'text-red-400'}`}>
                    {calculateGain(Number(holding.invested_amount), Number(holding.current_value))}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusBadge(holding.status)}`}>
                      {holding.status.charAt(0).toUpperCase() + holding.status.slice(1)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {(!holdings || holdings.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No holdings found. Add a property to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Property Dialog */}
      <Dialog open={showAddProperty} onOpenChange={(open) => { setShowAddProperty(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Property</DialogTitle>
            <DialogDescription>
              Submit a new property holding for admin approval. Status will be set to "pending" until approved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={propertyForm.project_id} onValueChange={(v) => setPropertyForm(p => ({ ...p, project_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit Reference *</Label>
              <Input
                value={propertyForm.unit_ref}
                onChange={(e) => setPropertyForm(p => ({ ...p, unit_ref: e.target.value }))}
                placeholder="e.g., Unit A-101"
              />
            </div>

            <div className="space-y-2">
              <Label>Area *</Label>
              <Select value={propertyForm.area_id} onValueChange={(v) => setPropertyForm(p => ({ ...p, area_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select DLD location area" />
                </SelectTrigger>
                <SelectContent>
                  {areas?.map((area) => (
                    <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Developer *</Label>
              <Select value={propertyForm.developer_id} onValueChange={(v) => setPropertyForm(p => ({ ...p, developer_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select primary developer" />
                </SelectTrigger>
                <SelectContent>
                  {developers?.map((dev) => (
                    <SelectItem key={dev.id} value={dev.id}>{dev.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Property Type *</Label>
              <Select value={propertyForm.property_type} onValueChange={(v) => setPropertyForm(p => ({ ...p, property_type: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Apartment">Apartment</SelectItem>
                  <SelectItem value="Villa">Villa</SelectItem>
                  <SelectItem value="Townhouse">Townhouse</SelectItem>
                  <SelectItem value="Penthouse">Penthouse</SelectItem>
                  <SelectItem value="Plot">Plot</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Invested Amount (USD) *</Label>
              <Input
                type="number"
                value={propertyForm.invested_amount}
                onChange={(e) => setPropertyForm(p => ({ ...p, invested_amount: e.target.value }))}
                placeholder="e.g., 1000000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProperty(false)}>Cancel</Button>
            <Button onClick={handleAddProperty} disabled={saving} className="bg-primary hover:bg-accent-green-dark text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Holding Insights Drawer */}
      <HoldingInsightsDrawer
        holding={selectedHolding}
        open={showInsights}
        onOpenChange={setShowInsights}
      />

      {/* Upsell: Deal Analyzer + Market Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Analyse before you buy</p>
            <p className="text-xs text-muted-foreground mt-0.5">Paste any listing — get AI verdict, yield scenarios and a PDF report.</p>
          </div>
          <a href="/deal-analyzer" className="shrink-0 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap">
            Deal Analyzer
          </a>
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Track your areas</p>
            <p className="text-xs text-muted-foreground mt-0.5">Monitor YoY growth, yield, and live DLD transaction volume.</p>
          </div>
          <a href="/market-intelligence" className="shrink-0 px-4 py-2 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-xl hover:bg-blue-500/30 transition-colors border border-blue-500/30 whitespace-nowrap">
            Market Intel
          </a>
        </div>
      </div>
    </div>
  );
}
