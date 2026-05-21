import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { StatCard } from '../components/StatCard';
import { SpendChart } from '../components/charts/SpendChart';
import { LeadsChart } from '../components/charts/LeadsChart';
import { CampaignPerformance } from '../components/charts/CampaignPerformance';
import { 
  Target, 
  TrendingUp, 
  DollarSign, 
  MousePointerClick
} from 'lucide-react';
import { metaService } from '../services/metaService';

const ClientDashboard = () => {
  const { user, activeWorkspace } = useAuth();
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (user?._id) {
      // clientService or metaService call to get client ID linked to this user
      // Assuming analytics data is fetched here
      setAnalytics({
        totalSpend: 4250,
        totalConversions: 185,
        totalClicks: 2100,
        ctr: 2.4,
        roas: 3.2
      });
    }
  }, [user?._id]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Performance Overview</h1>
          <p className="text-crm-textMuted">Welcome, {user?.name}. Here is your ad campaign performance.</p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          title="Total Ad Spend" 
          value={`$${(analytics?.totalSpend || 0).toLocaleString()}`} 
          icon={DollarSign} 
          trend="up" 
          trendValue="12%"
          color="amber"
        />
        <StatCard 
          title="Conversions/Leads" 
          value={analytics?.totalConversions || 0} 
          icon={Target} 
          trend="up" 
          trendValue="24%"
          color="emerald"
        />
        <StatCard 
          title="Clicks" 
          value={(analytics?.totalClicks || 0).toLocaleString()} 
          icon={MousePointerClick} 
          trend="up" 
          trendValue="8%"
          color="primary"
        />
        <StatCard 
          title="ROAS" 
          value={`${analytics?.roas || 0}x`} 
          icon={TrendingUp} 
          color="violet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendChart />
        <LeadsChart />
      </div>
      
      <div className="grid grid-cols-1 gap-6 mt-6">
        <CampaignPerformance />
      </div>
    </div>
  );
};

export default ClientDashboard;
