import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useHoldings } from '@/hooks/useInvestorData';
import { useMemo } from 'react';

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `AED ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `AED ${(value / 1000).toFixed(0)}K`;
  }
  return `AED ${value}`;
};

function buildPortfolioTimeline(holdings: any[]): { month: string; value: number }[] {
  if (!holdings || holdings.length === 0) return [];

  // Sort holdings by creation date
  const sorted = [...holdings].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const firstDate = new Date(sorted[0].created_at);
  const now = new Date();

  // Build monthly data points from first holding to now
  const dataPoints: { month: string; value: number }[] = [];
  const cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);

  while (cursor <= now) {
    const cursorTime = cursor.getTime();

    // Sum up invested amounts for all holdings created before or during this month
    let investedByMonth = 0;
    let currentValueByMonth = 0;

    for (const h of sorted) {
      const holdingDate = new Date(h.created_at);
      if (holdingDate.getTime() <= cursorTime + 30 * 24 * 60 * 60 * 1000) {
        // This holding existed by this month
        const invested = Number(h.invested_amount);
        const current = Number(h.current_value);
        const holdingAge = (cursorTime - holdingDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

        // Linear interpolation from invested to current value over time
        const totalAge = (now.getTime() - holdingDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (totalAge > 0) {
          const progress = Math.min(1, holdingAge / totalAge);
          currentValueByMonth += invested + (current - invested) * progress;
        } else {
          currentValueByMonth += invested;
        }
      }
    }

    const label = cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    dataPoints.push({ month: label, value: Math.round(currentValueByMonth) });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return dataPoints;
}

export function PortfolioValueChart() {
  const { data: holdings } = useHoldings();

  const portfolioHistory = useMemo(
    () => buildPortfolioTimeline(holdings || []),
    [holdings]
  );

  if (portfolioHistory.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
        No holdings data available for chart
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={portfolioHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22C55E" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="month"
          stroke="rgba(255,255,255,0.4)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="rgba(255,255,255,0.4)"
          fontSize={12}
          tickFormatter={formatCurrency}
          tickLine={false}
          axisLine={false}
          width={70}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(20, 20, 22, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          }}
          labelStyle={{ color: 'rgba(255,255,255,0.9)' }}
          formatter={(value: number) => [`AED ${value.toLocaleString()}`, 'Portfolio Value']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#22C55E"
          strokeWidth={2}
          fill="url(#primaryGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Mini sparkline for home dashboard
export function PortfolioSparkline() {
  const { data: holdings } = useHoldings();

  const sparkData = useMemo(() => {
    const timeline = buildPortfolioTimeline(holdings || []);
    return timeline.slice(-7).map(d => ({ value: d.value }));
  }, [holdings]);

  if (sparkData.length === 0) {
    return <div className="h-[40px]" />;
  }

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={sparkData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke="#22C55E"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
