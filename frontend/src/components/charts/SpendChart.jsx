import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const defaultData = [
  { date: 'Mon', spend: 400 },
  { date: 'Tue', spend: 300 },
  { date: 'Wed', spend: 550 },
  { date: 'Thu', spend: 450 },
  { date: 'Fri', spend: 700 },
  { date: 'Sat', spend: 850 },
  { date: 'Sun', spend: 600 },
];

export const SpendChart = ({ data = defaultData }) => {
  return (
    <div className="glass-panel p-6 h-96">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white">Ad Spend Overview</h3>
        <p className="text-sm text-crm-textMuted">Last 7 days performance</p>
      </div>
      
      <div className="w-full h-[calc(100%-4rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
              dx={-10}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                color: '#f8fafc'
              }}
              itemStyle={{ color: '#8b5cf6' }}
              formatter={(value) => [formatCurrency(value), 'Spend']}
            />
            <Area
              type="monotone"
              dataKey="spend"
              stroke="#6366f1"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorSpend)"
              activeDot={{ r: 6, strokeWidth: 0, fill: '#8b5cf6' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
