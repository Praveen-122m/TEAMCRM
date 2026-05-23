import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const defaultData = [
  { name: 'Cmp 1', spend: 590, conversions: 24 },
  { name: 'Cmp 2', spend: 868, conversions: 38 },
  { name: 'Cmp 3', spend: 1397, conversions: 62 },
  { name: 'Cmp 4', spend: 1480, conversions: 58 },
  { name: 'Cmp 5', spend: 1520, conversions: 75 },
];

export const CampaignPerformance = ({ data = defaultData }) => {
  return (
    <div className="glass-panel p-6 h-96">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-crm-text">Campaign Performance</h3>
        <p className="text-sm text-crm-textMuted">Spend vs Conversions by Campaign</p>
      </div>
      
      <div className="w-full h-[calc(100%-4rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis 
              yAxisId="left"
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                color: '#f8fafc'
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar yAxisId="left" dataKey="spend" name="Spend" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
            <Line yAxisId="right" type="monotone" dataKey="conversions" name="Conversions" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
