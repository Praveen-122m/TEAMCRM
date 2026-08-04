import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { metaService } from '../services/metaService';
import { metaHistoryService } from '../services/metaHistoryService';
import { clientService } from '../services/clientService';
import { StatCard } from '../components/StatCard';
import { 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { 
  IndianRupee, 
  MousePointerClick, 
  Link as LinkIcon, 
  Eye, 
  Globe, 
  ShoppingBag, 
  Target, 
  MessageSquare, 
  Instagram, 
  RefreshCw,
  TrendingUp,
  Download,
  Calendar,
  FileSpreadsheet,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DatePicker } from '../components/ui/DatePicker';

const MetaAdsDashboard = ({ embedded = false, workspaceId: propWorkspaceId, fixedClientId, clientLabel }) => {
  const { user, activeWorkspace } = useAuth();
  const wsId = propWorkspaceId || activeWorkspace;

  // General States
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [clientsLoading, setClientsLoading] = useState(true);

  // Live Mode States (Direct API)
  const [liveAnalytics, setLiveAnalytics] = useState(null);
  const [liveLoading, setLiveLoading] = useState(true);

  // Historical Mode States (MySQL)
  const [historicalTotals, setHistoricalTotals] = useState(null);
  const [historicalGrowth, setHistoricalGrowth] = useState(null);
  const [historicalTimeline, setHistoricalTimeline] = useState([]);
  const [historicalCampaigns, setHistoricalCampaigns] = useState([]);
  const [historicalLoading, setHistoricalLoading] = useState(true);



  // Date Filters for Historical Mode
  const [dateRangeOption, setDateRangeOption] = useState('30'); // 'today', 'yesterday', '7', '30', '90', '180', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Table Search and Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Helpers to calculate start/end dates based on presets
  const getDateRange = useCallback((option) => {
    const end = new Date();
    const start = new Date();
    switch (option) {
      case 'today':
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        break;
      case '7':
        start.setDate(start.getDate() - 7);
        break;
      case '30':
        start.setDate(start.getDate() - 30);
        break;
      case '90':
        start.setDate(start.getDate() - 90);
        break;
      case '180':
        start.setDate(start.getDate() - 180);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }
    return {
      startStr: start.toISOString().split('T')[0],
      endStr: end.toISOString().split('T')[0]
    };
  }, []);

  // Fetch list of clients
  const fetchClients = useCallback(async () => {
    if (fixedClientId) {
      setSelectedClient(fixedClientId);
      setClientsLoading(false);
      return;
    }
    if (user.role === 'Client' && user.clientProfileId) {
      setSelectedClient(user.clientProfileId);
      setClientsLoading(false);
      return;
    }
    if (user.role === 'Admin' || user.role === 'Member') {
      setClientsLoading(true);
      try {
        const res = await clientService.getClients(user.role === 'Admin' ? undefined : wsId);
        const list = res.data || [];
        setClients(list);
        if (list.length > 0) {
          setSelectedClient((prev) => prev || list[0]._id);
        }
      } catch (err) {
        console.error('Failed to load clients:', err);
        toast.error('Failed to load clients');
      } finally {
        setClientsLoading(false);
      }
    }
  }, [user.role, user.clientProfileId, wsId, fixedClientId]);

  // Load Live Metrics (Current Day / Latest Synced values directly)
  const loadLiveMetrics = useCallback(async () => {
    if (!selectedClient) {
      setLiveLoading(false);
      return;
    }
    setLiveLoading(true);
    try {
      const res = await metaService.getAnalytics(selectedClient);
      setLiveAnalytics(res.data);
    } catch (err) {
      console.error('Failed to load live metrics:', err);
    } finally {
      setLiveLoading(false);
    }
  }, [selectedClient]);

  // Load Historical Metrics (from MySQL DB)
  const loadHistoricalMetrics = useCallback(async () => {
    if (!selectedClient) {
      setHistoricalLoading(false);
      return;
    }

    let startStr = '';
    let endStr = '';

    if (dateRangeOption === 'custom') {
      if (!customStartDate || !customEndDate) {
        setHistoricalLoading(false);
        return; // wait for both values
      }
      startStr = customStartDate;
      endStr = customEndDate;
    } else {
      const range = getDateRange(dateRangeOption);
      startStr = range.startStr;
      endStr = range.endStr;
    }

    setHistoricalLoading(true);
    try {
      const [totalsRes, chartsRes, campaignsRes] = await Promise.all([
        metaHistoryService.getHistory(selectedClient, startStr, endStr).catch(err => {
          console.error('Error fetching general history:', err);
          return { data: { totals: null, growth: null } };
        }),
        metaHistoryService.getCharts(selectedClient, startStr, endStr).catch(err => {
          console.error('Error fetching general charts:', err);
          return { data: [] };
        }),
        metaHistoryService.getCampaigns(selectedClient, startStr, endStr).catch(err => {
          console.error('Error fetching campaigns:', err);
          return { data: [] };
        })
      ]);

      setHistoricalTotals(totalsRes.data.totals);
      setHistoricalGrowth(totalsRes.data.growth);
      setHistoricalTimeline(chartsRes.data);
      setHistoricalCampaigns(campaignsRes.data);
      setCurrentPage(1); // reset to page 1 on filter change
    } catch (err) {
      console.error('Failed to load historical analytics:', err);
      setHistoricalTotals(null);
      setHistoricalGrowth(null);
      setHistoricalTimeline([]);
      setHistoricalCampaigns([]);
    } finally {
      setHistoricalLoading(false);
    }
  }, [selectedClient, dateRangeOption, customStartDate, customEndDate, getDateRange]);

  // Effect hooks
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    if (selectedClient) {
      loadLiveMetrics();
      loadHistoricalMetrics();
    }
  }, [selectedClient, loadLiveMetrics, loadHistoricalMetrics]);

  // Sync manual trigger handler
  const handleSync = async () => {
    if (!selectedClient) return toast.error('Select a client first');
    const toastId = toast.loading('Syncing latest data from Meta Ads...');
    try {
      await metaService.syncCampaigns(selectedClient, wsId);
      toast.success('Campaigns and insights synced successfully!', { id: toastId });
      loadLiveMetrics();
      loadHistoricalMetrics();
    } catch (err) {
      console.error('Sync failed:', err);
      toast.error('Sync failed: ' + (err.response?.data?.message || err.message), { id: toastId });
    }
  };

  // Report Export Handler
  const handleExport = (format) => {
    if (!selectedClient) return toast.error('Select a client first');
    let startStr = '';
    let endStr = '';

    if (dateRangeOption === 'custom') {
      if (!customStartDate || !customEndDate) return toast.error('Select custom date range first');
      startStr = customStartDate;
      endStr = customEndDate;
    } else {
      const range = getDateRange(dateRangeOption);
      startStr = range.startStr;
      endStr = range.endStr;
    }

    const downloadUrl = metaHistoryService.getExportUrl(selectedClient, startStr, endStr, format);
    window.open(downloadUrl, '_blank');
  };

  // Format currency helper
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  const selectedClientData = clients.find((c) => c._id === selectedClient);
  const displayLabel = clientLabel || selectedClientData?.companyName || selectedClientData?.name || 'Analytics';

  // Table filtering and pagination logic
  const filteredCampaigns = historicalCampaigns.filter(c => 
    c.campaign_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCampaigns = filteredCampaigns.slice(indexOfFirstItem, indexOfLastItem);



  return (
    <div className="space-y-8">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-crm-text tracking-tight flex items-center gap-2">
            {displayLabel} <span className="text-xs bg-crm-primary/20 text-crm-primary font-medium py-1 px-2.5 rounded-full border border-crm-primary/30">Meta Ads Portal</span>
          </h1>
          <p className="text-crm-textMuted text-sm mt-1">Direct Live Parity & Historical Performance Reporting dashboard.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!embedded && !fixedClientId && clients.length > 0 && (
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="glass-input cursor-pointer min-w-[200px] text-sm bg-crm-darker/95 font-semibold text-crm-text border border-crm-primary/10"
              disabled={clientsLoading}
            >
              <option value="" disabled>Select client...</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.companyName || c.name}
                </option>
              ))}
            </select>
          )}

          <button 
            type="button" 
            onClick={handleSync} 
            className="glass-button-secondary flex items-center gap-2 py-2 px-4 text-sm font-semibold text-crm-text hover:text-crm-primary transition-all duration-300"
          >
            <RefreshCw size={16} className={liveLoading ? 'animate-spin' : ''} /> Sync Live Data
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 1. LIVE SECTION (Direct Meta API)                    */}
      {/* ==================================================== */}
      <div className="glass-panel p-6 border border-amber-500/10 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-amber-500/80 bg-amber-500/10 rounded-bl-xl border-l border-b border-amber-500/20">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Live Parity Mode
        </div>

        <div className="mb-4">
          <h2 className="text-xl font-bold text-crm-text flex items-center gap-2">
            Live Performance Metrics
          </h2>
          <p className="text-xs text-crm-textMuted mt-0.5">Most accurate real-time campaign totals fetched directly from Meta Marketing API.</p>
        </div>

        {liveLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-28 bg-crm-darker/40 rounded-xl border border-crm-primary/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Current Spend" 
              value={formatCurrency(liveAnalytics?.totalSpend || 0)} 
              icon={IndianRupee} 
              color="amber" 
            />
            <StatCard 
              title="Current Clicks (Link)" 
              value={(liveAnalytics?.totalLinkClicks || 0).toLocaleString()} 
              icon={MousePointerClick} 
              color="primary" 
            />
            <StatCard 
              title="Current Leads" 
              value={(liveAnalytics?.totalLeads || 0).toLocaleString()} 
              icon={Target} 
              color="emerald" 
            />
            <StatCard 
              title="Current Purchases" 
              value={(liveAnalytics?.totalPurchases || 0).toLocaleString()} 
              icon={ShoppingBag} 
              color="rose" 
            />
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* 2. HISTORICAL SECTION (MySQL)                         */}
      {/* ==================================================== */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-crm-primary/10 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-crm-text">Historical Analysis Mode</h2>
            <p className="text-xs text-crm-textMuted mt-0.5">Fast offline trends, charts, reports, and period comparisons powered by MySQL storage.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Range Presets Selector */}
            <div className="flex items-center gap-2 bg-crm-darker/60 rounded-lg p-0.5 border border-crm-primary/10">
              {['today', 'yesterday', '7', '30', '90', '180', 'custom'].map(option => (
                <button
                  key={option}
                  onClick={() => setDateRangeOption(option)}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-md transition-all duration-200 capitalize ${
                    dateRangeOption === option 
                      ? 'bg-crm-primary/20 text-crm-primary border border-crm-primary/30 shadow-md' 
                      : 'text-crm-textMuted hover:text-crm-text'
                  }`}
                >
                  {option === '7' || option === '30' || option === '90' || option === '180' ? `${option}D` : option}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs */}
            {dateRangeOption === 'custom' && (
              <div className="flex items-center gap-2 bg-crm-darker/40 p-1 rounded-lg border border-crm-primary/10">
                <DatePicker
                  value={customStartDate}
                  onChange={setCustomStartDate}
                  placeholder="Start date"
                  className="max-w-[160px]"
                />
                <span className="text-crm-textMuted text-[10px]">to</span>
                <DatePicker
                  value={customEndDate}
                  onChange={setCustomEndDate}
                  placeholder="End date"
                  className="max-w-[160px]"
                />
              </div>
            )}

            {/* Report Export Buttons */}
            <div className="flex items-center gap-1">
              <button 
                type="button" 
                onClick={() => handleExport('pdf')}
                className="glass-button-secondary p-2 text-crm-textMuted hover:text-rose-400 border border-crm-primary/5 hover:border-rose-500/20"
                title="Download PDF Summary Report"
              >
                <FileText size={16} />
              </button>
              <button 
                type="button" 
                onClick={() => handleExport('csv')}
                className="glass-button-secondary p-2 text-crm-textMuted hover:text-emerald-400 border border-crm-primary/5 hover:border-emerald-500/20"
                title="Download CSV Spreadsheet"
              >
                <FileSpreadsheet size={16} />
              </button>
            </div>
          </div>
        </div>

        {historicalLoading ? (
          <div className="flex justify-center items-center py-40">
            <div className="animate-spin h-10 w-10 border-t-2 border-crm-primary rounded-full" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Historical Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: Ad Spend */}
              <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between border border-crm-primary/10">
                <div>
                  <p className="text-crm-textMuted text-xs font-semibold uppercase tracking-wider">Historical Ad Spend</p>
                  <h3 className="text-2xl font-black text-crm-text mt-1">
                    {formatCurrency(historicalTotals?.spend || 0)}
                  </h3>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <GrowthBadge value={historicalGrowth?.spend} label="vs prev period" />
                  <IndianRupee size={20} className="text-amber-500 opacity-60" />
                </div>
              </div>

              {/* Card 2: Link Clicks */}
              <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between border border-crm-primary/10">
                <div>
                  <p className="text-crm-textMuted text-xs font-semibold uppercase tracking-wider">Link Clicks</p>
                  <h3 className="text-2xl font-black text-crm-text mt-1">
                    {(historicalTotals?.link_clicks || 0).toLocaleString()}
                  </h3>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <GrowthBadge value={historicalGrowth?.link_clicks} label="vs prev period" />
                  <LinkIcon size={20} className="text-crm-primary opacity-60" />
                </div>
              </div>

              {/* Card 3: ROAS */}
              <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between border border-crm-primary/10">
                <div>
                  <p className="text-crm-textMuted text-xs font-semibold uppercase tracking-wider">Aggregate ROAS</p>
                  <h3 className="text-2xl font-black text-crm-text mt-1">
                    {historicalTotals?.roas || 0}x
                  </h3>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-crm-textMuted italic">Purchase Value / Spend</span>
                  <TrendingUp size={20} className="text-primary opacity-60" />
                </div>
              </div>

              {/* Card 4: Leads */}
              <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between border border-crm-primary/10">
                <div>
                  <p className="text-crm-textMuted text-xs font-semibold uppercase tracking-wider">Leads Generated</p>
                  <h3 className="text-2xl font-black text-crm-text mt-1">
                    {(historicalTotals?.leads || 0).toLocaleString()}
                  </h3>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <GrowthBadge value={historicalGrowth?.leads} label="vs prev period" />
                  <Target size={20} className="text-emerald-500 opacity-60" />
                </div>
              </div>

              {/* Card 5: Purchases */}
              <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between border border-crm-primary/10">
                <div>
                  <p className="text-crm-textMuted text-xs font-semibold uppercase tracking-wider">Purchases</p>
                  <h3 className="text-2xl font-black text-crm-text mt-1">
                    {(historicalTotals?.purchases || 0).toLocaleString()}
                  </h3>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <GrowthBadge value={historicalGrowth?.purchases} label="vs prev period" />
                  <ShoppingBag size={20} className="text-rose-500 opacity-60" />
                </div>
              </div>

              {/* Card 6: Impressions */}
              <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between border border-crm-primary/10">
                <div>
                  <p className="text-crm-textMuted text-xs font-semibold uppercase tracking-wider">Impressions</p>
                  <h3 className="text-2xl font-black text-crm-text mt-1">
                    {(historicalTotals?.impressions || 0).toLocaleString()}
                  </h3>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <GrowthBadge value={historicalGrowth?.impressions} label="vs prev period" />
                  <Eye size={20} className="text-crm-primary opacity-60" />
                </div>
              </div>
            </div>

            {/* Charts Row 1: Spend & Leads */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Spend Area Chart */}
              <div className="glass-panel p-6 h-96 border border-crm-primary/5">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-crm-text">Date-Wise Spend Graph</h3>
                  <p className="text-xs text-crm-textMuted">Daily budget utilization timeline</p>
                </div>
                <div className="w-full h-[calc(100%-3.5rem)]">
                  {historicalTimeline.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-crm-textMuted text-sm">No historical data available for this range.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorHistorySpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f8fafc' }} formatter={(v) => [formatCurrency(v), 'Spend']} />
                        <Area type="monotone" dataKey="spend" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHistorySpend)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Daily Leads Bar Chart */}
              <div className="glass-panel p-6 h-96 border border-crm-primary/5">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-crm-text">Date-Wise Leads Graph</h3>
                  <p className="text-xs text-crm-textMuted">Daily lead acquisitions performance</p>
                </div>
                <div className="w-full h-[calc(100%-3.5rem)]">
                  {historicalTimeline.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-crm-textMuted text-sm">No historical data available for this range.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={historicalTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f8fafc' }} />
                        <Bar dataKey="leads" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Charts Row 2: Clicks & Purchases */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Clicks Line Chart */}
              <div className="glass-panel p-6 h-96 border border-crm-primary/5">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-crm-text">Date-Wise Clicks Graph</h3>
                  <p className="text-xs text-crm-textMuted">Daily traffic trends</p>
                </div>
                <div className="w-full h-[calc(100%-3.5rem)]">
                  {historicalTimeline.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-crm-textMuted text-sm">No historical data available for this range.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f8fafc' }} />
                        <Line type="monotone" dataKey="link_clicks" stroke="#8b5cf6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Daily Purchases Line Chart */}
              <div className="glass-panel p-6 h-96 border border-crm-primary/5">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-crm-text">Date-Wise Purchases Graph</h3>
                  <p className="text-xs text-crm-textMuted">Daily sales conversions trends</p>
                </div>
                <div className="w-full h-[calc(100%-3.5rem)]">
                  {historicalTimeline.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-crm-textMuted text-sm">No historical data available for this range.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f8fafc' }} />
                        <Line type="monotone" dataKey="purchases" stroke="#f43f5e" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>



            {/* Campaign History Table */}
            <div className="glass-panel p-6 border border-crm-primary/5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-crm-text">Campaign History Table</h3>
                  <p className="text-xs text-crm-textMuted">Individual daily performance logs inside specified dates.</p>
                </div>

                {/* Table Search Input */}
                <div className="relative max-w-xs w-full">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-textMuted" />
                  <input
                    type="text"
                    placeholder="Search campaign name..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="glass-input pl-9 pr-4 py-2 text-xs w-full bg-crm-darker/40"
                  />
                </div>
              </div>

              {/* Table Wrapper */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-crm-darker/60 uppercase font-semibold text-crm-textMuted border-b border-crm-primary/10">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Campaign Name</th>
                      <th className="py-3 px-4 text-right">Spend</th>
                      <th className="py-3 px-4 text-right">Impressions</th>
                      <th className="py-3 px-4 text-right">Clicks</th>
                      <th className="py-3 px-4 text-right">Leads</th>
                      <th className="py-3 px-4 text-right">Purchases</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-crm-primary/5">
                    {currentCampaigns.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-crm-textMuted">No campaigns found matching search criteria.</td>
                      </tr>
                    ) : (
                      currentCampaigns.map((row, idx) => (
                        <tr key={idx} className="hover:bg-crm-primary/5 transition-all duration-150">
                          <td className="py-3 px-4 font-mono text-crm-textMuted">{row.date}</td>
                          <td className="py-3 px-4 font-medium text-crm-text truncate max-w-[200px]" title={row.campaign_name}>
                            {row.campaign_name}
                          </td>
                          <td className="py-3 px-4 text-right text-crm-text font-semibold">{formatCurrency(row.spend)}</td>
                          <td className="py-3 px-4 text-right text-crm-textMuted">{(row.impressions || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-crm-textMuted">{(row.link_clicks || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-emerald-400">{(row.leads || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-rose-400">{(row.purchases || 0).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-crm-primary/5 text-xs">
                  <p className="text-crm-textMuted">
                    Showing <span className="font-semibold text-crm-text">{indexOfFirstItem + 1}</span> to{' '}
                    <span className="font-semibold text-crm-text">
                      {Math.min(indexOfLastItem, filteredCampaigns.length)}
                    </span>{' '}
                    of <span className="font-semibold text-crm-text">{filteredCampaigns.length}</span> records
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="glass-button-secondary p-2 text-crm-textMuted hover:text-crm-primary disabled:opacity-50 disabled:hover:text-crm-textMuted"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="font-mono text-crm-text text-xs">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="glass-button-secondary p-2 text-crm-textMuted hover:text-crm-primary disabled:opacity-50 disabled:hover:text-crm-textMuted"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>


          </div>
        )}
      </div>
    </div>
  );
};

// --- Growth Badges Helper Component ---
const GrowthBadge = ({ value, label }) => {
  if (value === undefined || value === null) return null;
  const isPositive = value >= 0;
  const absVal = Math.abs(value).toFixed(1);
  return (
    <span 
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
        isPositive 
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      }`}
    >
      {absVal}% <span className="text-[9px] text-crm-textMuted font-normal ml-0.5">{label}</span>
    </span>
  );
};

export default MetaAdsDashboard;
