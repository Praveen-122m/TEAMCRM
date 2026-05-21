import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { metaService } from '../services/metaService';
import { clientService } from '../services/clientService';
import { StatCard } from '../components/StatCard';
import { SpendChart } from '../components/charts/SpendChart';
import { LeadsChart } from '../components/charts/LeadsChart';
import { DollarSign, Target, MousePointerClick, Zap, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const MetaAdsDashboard = ({ embedded = false, workspaceId: propWorkspaceId, fixedClientId, clientLabel }) => {
  const { user, activeWorkspace } = useAuth();
  const wsId = propWorkspaceId || activeWorkspace;
  const [isConnected, setIsConnected] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dynamic chart data state
  const [spendData, setSpendData] = useState([]);
  const [leadsData, setLeadsData] = useState([]);
  
  // Client selection for Admins
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');

  useEffect(() => {
    const fetchClients = async () => {
      if (fixedClientId) {
        setSelectedClient(fixedClientId);
        return;
      }
      if (user.role === 'Client' && user.clientProfileId) {
        setSelectedClient(user.clientProfileId);
        return;
      }
      if ((user.role === 'Admin' || user.role === 'Member') && wsId) {
        try {
          const res = await clientService.getClients(wsId);
          setClients(res.data || []);
          if (res.data?.length > 0) {
            setSelectedClient(res.data[0]._id);
          }
        } catch (error) {
          console.error('Failed to fetch clients');
        }
      }
    };
    fetchClients();
  }, [user.role, user.clientProfileId, wsId, fixedClientId]);

  // In a real app we'd fetch this from the backend based on selectedClient
  useEffect(() => {
    // Check URL params for success/error from Meta OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'connected') {
      setIsConnected(true);
      toast.success('Successfully connected to Meta Ads');
    }
    
    // For demo purposes, assuming it's connected and has data
    setIsConnected(true);
    
    // Simulate dynamic data when client changes
    const multiplier = selectedClient ? (selectedClient.charCodeAt(0) % 5 + 1) : 2;
    
    setAnalytics({
      totalSpend: selectedClient ? Math.floor(Math.random() * 10000) + 1000 : 8450,
      totalConversions: selectedClient ? Math.floor(Math.random() * 500) + 50 : 420,
      totalClicks: selectedClient ? Math.floor(Math.random() * 6000) + 1000 : 5200,
      ctr: selectedClient ? (Math.random() * 5 + 1).toFixed(1) : 3.2,
      roas: selectedClient ? (Math.random() * 4 + 2).toFixed(1) : 4.5
    });
    
    // Generate randomized chart data for the selected client
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    setSpendData(days.map(date => ({
      date,
      spend: Math.floor(Math.random() * 500 * multiplier) + 200
    })));
    
    setLeadsData(days.map(date => ({
      date,
      leads: Math.floor(Math.random() * 40 * multiplier) + 10
    })));

    setLoading(false);
  }, [selectedClient]);

  const handleConnect = () => {
    // Pass the selected client to connect THEIR specific Meta Ads
    const targetClientId = selectedClient || 'demo-client-id';
    window.location.href = metaService.getAuthUrl(targetClientId, wsId);
  };

  const handleSync = async () => {
    toast.success('Syncing data from Meta Ads...');
    // Real call: await metaService.syncCampaigns(...)
  };

  if (loading) return <div>Loading...</div>;

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="glass-panel p-12 max-w-lg text-center">
          <div className="w-20 h-20 mx-auto bg-blue-600/20 rounded-full flex items-center justify-center mb-6 shadow-glow">
            <svg viewBox="0 0 36 36" className="w-10 h-10 fill-blue-500" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 35.8C6.5 34.3 0 26.9 0 18 0 8.1 8.1 0 18 0s18 8.1 18 18c0 8.9-6.5 16.3-15 17.8l-1.5-13.6h-4.5v-5.6h4.5v-3.7c0-4.7 2.8-7.2 7-7.2 2 0 4.1.4 4.1.4v4.5h-2.3c-2.3 0-3 1.4-3 2.9v3.1h5.2l-.8 5.6h-4.4L15 35.8z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Connect to Meta Ads</h2>
          <p className="text-crm-textMuted mb-8">
            Link your Meta Ads account to sync campaigns, track performance, and generate leads automatically.
          </p>
          <button onClick={handleConnect} className="glass-button w-full h-12 text-lg">
            Connect Meta Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-4 mb-1">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {clientLabel ? `${clientLabel} — Meta Ads` : 'Meta Ads Analytics'}
            </h1>
            {user.role === 'Admin' && !embedded && !fixedClientId && (
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="glass-input h-10 py-1 pl-3 pr-8 text-sm max-w-[200px]"
              >
                <option value="" disabled>Select Client</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id} className="bg-crm-dark text-white">
                    {client.companyName || client.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="text-crm-textMuted">Overview of your connected ad accounts.</p>
        </div>
        <button onClick={handleSync} className="glass-button-secondary">
          <RefreshCw size={16} /> Sync Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="Total Ad Spend" value={`$${(analytics?.totalSpend || 0).toLocaleString()}`} icon={DollarSign} trend="up" trendValue="15%" color="amber" />
        <StatCard title="Conversions" value={(analytics?.totalConversions || 0).toLocaleString()} icon={Target} trend="up" trendValue="8%" color="emerald" />
        <StatCard title="Link Clicks" value={(analytics?.totalClicks || 0).toLocaleString()} icon={MousePointerClick} trend="up" trendValue="12%" color="primary" />
        <StatCard title="ROAS" value={`${analytics?.roas || 0}x`} icon={Zap} trend="up" trendValue="4%" color="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendChart data={spendData.length > 0 ? spendData : undefined} />
        <LeadsChart data={leadsData.length > 0 ? leadsData : undefined} />
      </div>
    </div>
  );
};

export default MetaAdsDashboard;
