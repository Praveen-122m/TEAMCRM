import { useState, useEffect } from 'react';
import { DataTable } from '../components/DataTable';
import { useAuth } from '../hooks/useAuth';
import { Megaphone, PauseCircle, PlayCircle } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';

const MetaAdsCampaigns = () => {
  const { activeWorkspace } = useAuth();
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    // Mock Data
    setCampaigns([
      { _id: '1', name: 'Summer Sale Retargeting', status: 'active', objective: 'Conversions', budget: 150, spend: 1240, impressions: 45000, clicks: 1200, ctr: 2.6, conversions: 84 },
      { _id: '2', name: 'Brand Awareness Q3', status: 'paused', objective: 'Brand Awareness', budget: 50, spend: 400, impressions: 85000, clicks: 450, ctr: 0.5, conversions: 0 },
      { _id: '3', name: 'Lead Gen - B2B Software', status: 'active', objective: 'Lead Generation', budget: 200, spend: 890, impressions: 12000, clicks: 340, ctr: 2.8, conversions: 45 },
    ]);
  }, [activeWorkspace]);

  const columns = [
    { 
      header: 'Campaign Name', 
      accessor: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Megaphone size={16} />
          </div>
          <div>
            <p className="font-medium text-white">{row.name}</p>
            <p className="text-xs text-crm-textMuted uppercase tracking-wider">{row.objective}</p>
          </div>
        </div>
      )
    },
    { 
      header: 'Status', 
      accessor: 'status',
      cell: (row) => (
        <span className={row.status === 'active' ? 'badge-active' : 'badge-inactive'}>
          {row.status}
        </span>
      )
    },
    { header: 'Daily Budget', accessor: 'budget', cell: (row) => formatCurrency(row.budget) },
    { header: 'Spend', accessor: 'spend', cell: (row) => formatCurrency(row.spend) },
    { header: 'Impressions', accessor: 'impressions', cell: (row) => formatNumber(row.impressions) },
    { header: 'CTR', accessor: 'ctr', cell: (row) => `${row.ctr}%` },
    { header: 'Results', accessor: 'conversions', cell: (row) => <span className="font-bold text-emerald-400">{row.conversions}</span> },
    {
      header: 'Actions',
      sortable: false,
      cell: (row) => (
        <button className={`p-2 rounded-lg transition-colors ${row.status === 'active' ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}>
          {row.status === 'active' ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Campaign Manager</h1>
        <p className="text-crm-textMuted text-sm mt-1">Manage and track your Meta Ad campaigns.</p>
      </div>

      <DataTable 
        columns={columns} 
        data={campaigns} 
        searchPlaceholder="Search campaigns..."
      />
    </div>
  );
};

export default MetaAdsCampaigns;
