import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { StatCard } from '../components/StatCard';
import { DataTable } from '../components/DataTable';
import { SpendChart } from '../components/charts/SpendChart';
import { CampaignPerformance } from '../components/charts/CampaignPerformance';
import { 
  Users, 
  Target, 
  TrendingUp, 
  DollarSign, 
  UserSquare2,
  AlertCircle
} from 'lucide-react';
import { clientService } from '../services/clientService';
import { metaService } from '../services/metaService';

const Dashboard = () => {
  const { user, activeWorkspace } = useAuth();
  const [clients, setClients] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (activeWorkspace) {
      // In a real app we'd fetch actual data. For demo, we simulate
      fetchDashboardData();
    }
  }, [activeWorkspace]);

  const fetchDashboardData = async () => {
    try {
      // const clientsRes = await clientService.getClients(activeWorkspace);
      // setClients(clientsRes.data);
      
      // Mock data for display
      setClients([
        { _id: 1, companyName: 'Acme Corp', status: 'active', monthlyBudget: 5000 },
        { _id: 2, companyName: 'Stark Industries', status: 'active', monthlyBudget: 15000 },
        { _id: 3, companyName: 'Wayne Ent', status: 'inactive', monthlyBudget: 8000 },
      ]);
      
      setAnalytics({
        totalSpend: 12540,
        totalConversions: 845,
        totalLeads: 320,
        activeCampaigns: 12
      });
    } catch (error) {
      console.error(error);
    }
  };

  const clientColumns = [
    { header: 'Client', accessor: 'companyName' },
    { 
      header: 'Status', 
      accessor: 'status',
      cell: (row) => (
        <span className={row.status === 'active' ? 'badge-active' : 'badge-inactive'}>
          {row.status}
        </span>
      )
    },
    { 
      header: 'Budget', 
      accessor: 'monthlyBudget',
      cell: (row) => `$${row.monthlyBudget.toLocaleString()}`
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Admin Dashboard</h1>
          <p className="text-crm-textMuted">Welcome back, {user?.name}. Here's what's happening today.</p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          title="Total Clients" 
          value={clients.length || '3'} 
          icon={Users} 
          trend="up" 
          trendValue="12%"
          color="primary"
        />
        <StatCard 
          title="Active Campaigns" 
          value={analytics?.activeCampaigns || '12'} 
          icon={Target} 
          trend="up" 
          trendValue="4%"
          color="emerald"
        />
        <StatCard 
          title="Total Leads" 
          value={analytics?.totalLeads || '320'} 
          icon={TrendingUp} 
          trend="up" 
          trendValue="18%"
          color="violet"
        />
        <StatCard 
          title="Total Ad Spend" 
          value={`$${(analytics?.totalSpend || 12540).toLocaleString()}`} 
          icon={DollarSign} 
          trend="down" 
          trendValue="2%"
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendChart />
        <CampaignPerformance />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Recent Clients</h3>
            <button className="text-crm-primary hover:text-white text-sm font-medium transition-colors">
              View All
            </button>
          </div>
          <DataTable 
            columns={clientColumns} 
            data={clients} 
            searchable={false}
          />
        </div>
        
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-rose-500" />
              Meta Alerts
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                <p className="text-sm text-rose-400 font-medium">Acme Corp Ad Account</p>
                <p className="text-xs text-crm-textMuted mt-1">Payment method expiring in 3 days</p>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-400 font-medium">Stark Ind Campaign</p>
                <p className="text-xs text-crm-textMuted mt-1">Budget exhausted for the day</p>
              </div>
            </div>
          </div>
          
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-white mb-4">Team Activity</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-crm-primary/20 flex items-center justify-center text-crm-primary shrink-0">
                  <UserSquare2 size={16} />
                </div>
                <div>
                  <p className="text-sm text-white"><span className="font-medium">Sarah M.</span> paused a campaign</p>
                  <p className="text-xs text-crm-textMuted">10 mins ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                  <UserSquare2 size={16} />
                </div>
                <div>
                  <p className="text-sm text-white"><span className="font-medium">Mike R.</span> uploaded a report</p>
                  <p className="text-xs text-crm-textMuted">1 hour ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
