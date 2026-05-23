import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { StatCard } from '../../components/StatCard';
import { DataTable } from '../../components/DataTable';
import { LeadsChart } from '../../components/charts/LeadsChart';
import { 
  Users, 
  Target, 
  ListTodo, 
  MessageSquare,
  Briefcase
} from 'lucide-react';
import { memberService } from '../../services/memberService';
import { JoinWorkspaceCard } from '../../components/JoinWorkspaceCard';

const MemberDashboard = () => {
  const { user, activeWorkspace } = useAuth();
  const navigate = useNavigate();
  const [assignedClients, setAssignedClients] = useState([]);

  useEffect(() => {
    if (user?._id) {
      fetchAssignedClients();
    }
  }, [user?._id]);

  const fetchAssignedClients = async () => {
    try {
      const res = await memberService.getAssignedClients(user._id);
      setAssignedClients(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const clientColumns = [
    { 
      header: 'Client', 
      accessor: (row) => row.client?.companyName || row.client?.name || 'Unknown',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-crm-primary/20 flex items-center justify-center text-crm-primary font-bold">
            {(row.client?.companyName || row.client?.name || 'U').charAt(0)}
          </div>
          <div>
            <p className="font-medium text-crm-text">{row.client?.companyName || row.client?.name}</p>
            <p className="text-xs text-crm-textMuted flex items-center gap-1">
              <Briefcase size={12} /> {row.client?.industry || 'N/A'}
            </p>
          </div>
        </div>
      )
    },
    { 
      header: 'Your Role', 
      accessor: 'role',
      cell: (row) => <span className="badge-warning">{row.role}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-crm-text tracking-tight mb-1">Your Dashboard</h1>
          <p className="text-crm-textMuted">Welcome back, {user?.name}. Here are your active assignments.</p>
        </div>
      </div>

      <JoinWorkspaceCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-crm-text mb-4">Your Clients</h3>
            <DataTable 
              columns={clientColumns} 
              data={assignedClients} 
              searchable={false}
            />
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-crm-text mb-4">Pending Tasks</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 bg-crm-darker/50 rounded-lg cursor-pointer group">
                <input type="checkbox" className="mt-1 w-4 h-4 rounded border-crm-border text-crm-primary focus:ring-crm-primary focus:ring-offset-crm-darker" />
                <div>
                  <p className="text-sm text-crm-text group-hover:text-crm-primary transition-colors">Review ad copy for Stark Industries</p>
                  <p className="text-xs text-crm-textMuted mt-1">Due today</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 bg-crm-darker/50 rounded-lg cursor-pointer group">
                <input type="checkbox" className="mt-1 w-4 h-4 rounded border-crm-border text-crm-primary focus:ring-crm-primary focus:ring-offset-crm-darker" />
                <div>
                  <p className="text-sm text-crm-text group-hover:text-crm-primary transition-colors">Send weekly report to Wayne Ent</p>
                  <p className="text-xs text-crm-textMuted mt-1">Due tomorrow</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 bg-crm-darker/50 rounded-lg cursor-pointer group">
                <input type="checkbox" className="mt-1 w-4 h-4 rounded border-crm-border text-crm-primary focus:ring-crm-primary focus:ring-offset-crm-darker" />
                <div>
                  <p className="text-sm text-crm-text group-hover:text-crm-primary transition-colors">Setup new pixel tracking</p>
                  <p className="text-xs text-crm-textMuted mt-1">Due in 2 days</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;
