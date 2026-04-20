import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AllocationData {
  name: string;
  value: number;
  invested: number;
}

interface AllocationChartProps {
  data: AllocationData[];
}

// Modern green and emerald palette
const COLORS = [
  '#22C55E',   // Primary Green
  '#10B981',   // Emerald
  '#059669',   // Darker Emerald
  '#34D399',   // Lighter Emerald
];

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  return `$${(value / 1000).toFixed(0)}K`;
};

export function AllocationChart({ data }: AllocationChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={COLORS[index % COLORS.length]}
              stroke="rgba(20, 20, 22, 1)"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(20, 20, 22, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          }}
          labelStyle={{ color: 'rgba(255,255,255,0.9)' }}
          formatter={(value: number) => [formatCurrency(value), 'Value']}
        />
        <Legend 
          verticalAlign="bottom"
          formatter={(value, entry) => {
            const percent = ((entry.payload?.value || 0) / total * 100).toFixed(1);
            return (
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px' }}>
                {value} ({percent}%)
              </span>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
