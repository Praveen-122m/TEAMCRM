import { useState, useEffect, useCallback } from 'react';
import { DataTable } from '../components/DataTable';
import { useAuth } from '../hooks/useAuth';
import { clientService } from '../services/clientService';
import { metaHistoryService } from '../services/metaHistoryService';
import { Megaphone, Calendar } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';
import toast from 'react-hot-toast';

const MetaAdsCampaigns = () => {
  const { user, activeWorkspace } = useAuth();
  
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // '7' | '30' | '90'

  // Fetch client list if admin/member
  useEffect(() => {
    const loadClients = async () => {
      if (user.role === 'Client') {
        setSelectedClient(user.clientProfileId);
        return;
      }
      try {
        const res = await clientService.getClients(activeWorkspace);
        setClients(res.data || []);
        if (res.data?.length > 0) {
          setSelectedClient(res.data[0]._id);
        }
      } catch (err) {
        console.error('Failed to load clients', err);
        toast.error('Failed to load clients list');
      }
    };
    loadClients();
  }, [user, activeWorkspace]);

  // Load campaigns when client or range changes
  const loadCampaigns = useCallback(async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    
    // Calculate dates
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(dateRange));
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    try {
      const res = await metaHistoryService.getCampaigns(selectedClient, startStr, endStr);
      const rawData = res.data || [];
      
      // Aggregate historical campaign snapshots by campaign_name
      const aggregated = {};
      rawData.forEach(row => {
        const name = row.campaign_name || 'Unnamed Campaign';
        if (!aggregated[name]) {
          aggregated[name] = {
            _id: name,
            name: name,
            status: row.spend > 0 ? 'active' : 'paused',
            objective: row.leads > 0 ? 'Lead Generation' : row.purchases > 0 ? 'Conversions' : 'Traffic',
            spend: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0
          };
        }
        
        aggregated[name].spend += parseFloat(row.spend || 0);
        aggregated[name].impressions += parseInt(row.impressions || 0);
        aggregated[name].clicks += parseInt(row.clicks || 0);
        aggregated[name].conversions += parseInt(row.leads || 0) + parseInt(row.purchases || 0);
      });

      // Calculate aggregated metrics
      const campaignsList = Object.values(aggregated).map(c => {
        c.ctr = c.impressions > 0 ? parseFloat(((c.clicks / c.impressions) * 100).toFixed(2)) : 0;
        c.budget = c.spend > 0 ? parseFloat((c.spend / parseInt(dateRange)).toFixed(2)) : 0;
        return c;
      });

      setCampaigns(campaignsList);
    } catch (err) {
      console.error('Failed to load campaigns data', err);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [selectedClient, dateRange]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const columns = [
    { 
      header: 'Campaign Name', 
      accessor: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-crm-primary/20 flex items-center justify-center text-crm-primary">
            <Megaphone size={16} />
          </div>
          <div>
            <p className="font-semibold text-crm-text">{row.name}</p>
            <p className="text-[10px] text-crm-textMuted uppercase tracking-wider">{row.objective}</p>
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
    { header: 'Daily Budget (Est.)', accessor: 'budget', cell: (row) => formatCurrency(row.budget) },
    { header: 'Total Spend', accessor: 'spend', cell: (row) => formatCurrency(row.spend) },
    { header: 'Impressions', accessor: 'impressions', cell: (row) => formatNumber(row.impressions) },
    { header: 'CTR', accessor: 'ctr', cell: (row) => `${row.ctr}%` },
    { header: 'Conversions', accessor: 'conversions', cell: (row) => <span className="font-bold text-emerald-400">{row.conversions}</span> }
  ];

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-crm-text tracking-tight">Campaign Manager</h1>
          <p className="text-crm-textMuted text-sm mt-1">Real-time Meta Ads campaign analytics and performance history.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 self-stretch sm:self-auto">
          {/* Client Selector (Admins/Members only) */}
          {user.role !== 'Client' && clients.length > 0 && (
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="glass-input text-xs py-1.5"
            >
              {clients.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.companyName})
                </option>
              ))}
            </select>
          )}

          {/* Date Range Preset */}
          <div className="flex items-center gap-1.5 bg-crm-darker/50 border border-crm-border rounded-xl px-2.5 py-1">
            <Calendar size={14} className="text-crm-textMuted" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent border-none text-xs text-crm-text focus:outline-none cursor-pointer"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-10 w-10 border-t-2 border-crm-primary rounded-full" />
        </div>
      ) : (
        <DataTable 
          columns={columns} 
          data={campaigns} 
          searchPlaceholder="Search campaigns..."
        />
      )}
    </div>
  );
};

export default MetaAdsCampaigns;
