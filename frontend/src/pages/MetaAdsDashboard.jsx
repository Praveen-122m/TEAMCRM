import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { metaService } from '../services/metaService';
import { clientService } from '../services/clientService';
import { StatCard } from '../components/StatCard';
import { SpendChart } from '../components/charts/SpendChart';
import { LeadsChart } from '../components/charts/LeadsChart';
import { 
  DollarSign, 
  MousePointerClick, 
  Link as LinkIcon, 
  Eye, 
  Globe, 
  ShoppingBag, 
  Target, 
  MessageSquare, 
  Instagram, 
  RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';

const MetaAdsDashboard = ({ embedded = false, workspaceId: propWorkspaceId, fixedClientId, clientLabel }) => {
  const { user, activeWorkspace } = useAuth();
  const wsId = propWorkspaceId || activeWorkspace;
  const [isConnected, setIsConnected] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [timelineData, setTimelineData] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');

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

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const loadClientAnalytics = useCallback(async () => {
    if (!selectedClient) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await metaService.getAnalytics(selectedClient);
      const data = res.data;
      
      setAnalytics({
        totalSpend: data.totalSpend || 0,
        totalClicks: data.totalClicks || 0,
        totalLinkClicks: data.totalLinkClicks || 0,
        totalImpressions: data.totalImpressions || 0,
        totalLandingPageViews: data.totalLandingPageViews || 0,
        totalInstagramFollowers: data.totalInstagramFollowers || 0,
        totalPurchases: data.totalPurchases || 0,
        totalLeads: data.totalLeads || 0,
        totalMessagingConversationsStarted: data.totalMessagingConversationsStarted || 0,
      });

      const timeline = data.dailyTimeline || [];
      const formattedTimeline = timeline.map(t => ({
        ...t,
        date: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      }));

      setTimelineData(formattedTimeline);
      setIsConnected(true);
    } catch (err) {
      console.error('Failed to load client analytics:', err);
      setAnalytics({
        totalSpend: 0,
        totalClicks: 0,
        totalLinkClicks: 0,
        totalImpressions: 0,
        totalLandingPageViews: 0,
        totalInstagramFollowers: 0,
        totalPurchases: 0,
        totalLeads: 0,
        totalMessagingConversationsStarted: 0,
      });
      setTimelineData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClient]);

  useEffect(() => {
    loadClientAnalytics();
  }, [loadClientAnalytics]);

  const handleSync = async () => {
    if (!selectedClient) return toast.error('Select a client first');
    const toastId = toast.loading('Syncing latest data from Meta Ads...');
    try {
      await metaService.syncCampaigns(selectedClient, wsId);
      toast.success('Campaigns and insights synced successfully!', { id: toastId });
      loadClientAnalytics();
    } catch (err) {
      console.error('Sync failed:', err);
      toast.error('Sync failed: ' + (err.response?.data?.message || err.message), { id: toastId });
    }
  };

  const selectedClientData = clients.find((c) => c._id === selectedClient);

  if (!embedded && !fixedClientId && (user.role === 'Admin' || user.role === 'Member')) {
    return (
      <div className="space-y-6">
        {!selectedClient && !clientsLoading && clients.length === 0 ? (
          <div className="glass-panel p-12 text-center text-crm-textMuted mt-6">
            No clients found. Add clients from the Client Workspaces page first.
          </div>
        ) : !selectedClient ? (
          <div className="glass-panel p-12 text-center text-crm-textMuted mt-6">
            Select a client to view their Meta Ads performance.
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-10 w-10 border-t-2 border-crm-primary rounded-full" />
          </div>
        ) : (
          <DashboardBody
            clientLabel={selectedClientData?.companyName || selectedClientData?.name}
            analytics={analytics}
            timelineData={timelineData}
            client={selectedClientData}
            onSync={handleSync}
            clients={clients}
            selectedClient={selectedClient}
            onSelectClient={setSelectedClient}
            clientsLoading={clientsLoading}
            embedded={embedded}
            fixedClientId={fixedClientId}
          />
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-10 w-10 border-t-2 border-crm-primary rounded-full" />
      </div>
    );
  }

  return (
    <DashboardBody
      clientLabel={clientLabel}
      analytics={analytics}
      timelineData={timelineData}
      client={selectedClientData}
      onSync={handleSync}
      embedded={embedded}
    />
  );
};

const DashboardBody = ({ 
  clientLabel, 
  analytics, 
  timelineData, 
  client, 
  onSync, 
  embedded, 
  clients, 
  selectedClient, 
  onSelectClient, 
  clientsLoading, 
  fixedClientId 
}) => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-crm-text tracking-tight">
          {clientLabel ? `${clientLabel} — Meta Ads` : 'Meta Ads Analytics'}
        </h1>
        <p className="text-crm-textMuted text-sm mt-1">Real-time performance analytics for selected client integration.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {!embedded && !fixedClientId && clients && clients.length > 0 && (
          <select
            value={selectedClient}
            onChange={(e) => onSelectClient && onSelectClient(e.target.value)}
            className="glass-input cursor-pointer min-w-[200px] text-sm bg-crm-darker/90 font-medium"
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
        <button type="button" onClick={onSync} className="glass-button flex items-center gap-2 py-2.5 text-sm">
          <RefreshCw size={16} /> Sync Live Data
        </button>
      </div>
    </div>

    {client && (
      <div className="glass-panel p-5 border border-crm-primary/20 bg-crm-darker/30">
        <h3 className="text-lg font-bold text-crm-text mb-3">{client.companyName || client.name}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-crm-textMuted text-xs">Contact</p>
            <p className="text-crm-text font-medium">{client.name}</p>
          </div>
          <div>
            <p className="text-crm-textMuted text-xs">Email</p>
            <p className="text-crm-text font-medium truncate">{client.email}</p>
          </div>
          <div>
            <p className="text-crm-textMuted text-xs">Client ID</p>
            <p className="text-crm-text font-mono text-xs truncate">{client._id}</p>
          </div>
          <div>
            <p className="text-crm-textMuted text-xs">Secret Key</p>
            <p className="text-emerald-400 font-mono font-medium">{client.secretCode || '—'}</p>
          </div>
        </div>
      </div>
    )}

    {/* Metric Cards Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <StatCard 
        title="Total Ad Spend" 
        value={`$${(analytics?.totalSpend || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
        icon={DollarSign} 
        color="amber" 
      />
      <StatCard 
        title="Total Clicks" 
        value={(analytics?.totalClicks || 0).toLocaleString()} 
        icon={MousePointerClick} 
        color="primary" 
      />
      <StatCard 
        title="Link Clicks" 
        value={(analytics?.totalLinkClicks || 0).toLocaleString()} 
        icon={LinkIcon} 
        color="violet" 
      />
      <StatCard 
        title="Impressions" 
        value={(analytics?.totalImpressions || 0).toLocaleString()} 
        icon={Eye} 
        color="indigo" 
      />
      <StatCard 
        title="Landing Page Views" 
        value={(analytics?.totalLandingPageViews || 0).toLocaleString()} 
        icon={Globe} 
        color="teal" 
      />
      <StatCard 
        title="Purchases" 
        value={(analytics?.totalPurchases || 0).toLocaleString()} 
        icon={ShoppingBag} 
        color="rose" 
      />
      <StatCard 
        title="Leads" 
        value={(analytics?.totalLeads || 0).toLocaleString()} 
        icon={Target} 
        color="emerald" 
      />
      <StatCard 
        title="Conversations Started" 
        value={(analytics?.totalMessagingConversationsStarted || 0).toLocaleString()} 
        icon={MessageSquare} 
        color="cyan" 
      />
      <StatCard 
        title="Instagram Followers" 
        value={(analytics?.totalInstagramFollowers || 0).toLocaleString()} 
        icon={Instagram} 
        color="pink" 
      />
    </div>

    {/* Charts Section */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SpendChart data={timelineData} />
      <LeadsChart data={timelineData} />
    </div>
  </div>
);

export default MetaAdsDashboard;
