import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const defaultData = [
  { date: 'Mon', leads: 24 },
  { date: 'Tue', leads: 18 },
  { date: 'Wed', leads: 35 },
  { date: 'Thu', leads: 28 },
  { date: 'Fri', leads: 42 },
  { date: 'Sat', leads: 56 },
  { date: 'Sun', leads: 38 },
];

export const LeadsChart = ({ data = defaultData }) => {
  return (
    <div className="glass-panel p-6 h-96">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white">Lead Generation</h3>
        <p className="text-sm text-crm-textMuted">Volume over time</p>
      </div>
      
      <div className="w-full h-[calc(100%-4rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              dx={-10}
            />
            <Tooltip
              cursor={{ fill: '#334155', opacity: 0.2 }}
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                color: '#f8fafc'
              }}
              itemStyle={{ color: '#10b981' }}
            />
            <Bar 
              dataKey="leads" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]} 
              barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
