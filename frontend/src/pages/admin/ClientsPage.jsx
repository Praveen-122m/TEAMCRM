import { useState, useEffect } from 'react';
import { DataTable } from '../../components/DataTable';
import { Eye } from 'lucide-react';
import { clientService } from '../../services/clientService';
import { UserProfileModal } from '../../components/modals/UserProfileModal';
import toast from 'react-hot-toast';

const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clickedUserId, setClickedUserId] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await clientService.getClients();
      setClients(res.data);
    } catch {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const openProfile = (id) => {
    if (!id) return;
    setClickedUserId(id);
    setIsProfileOpen(true);
  };

  const columns = [
    {
      header: 'Client',
      accessor: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-crm-primary/20 flex items-center justify-center text-crm-primary font-bold text-lg">
            {(row.companyName || row.name)?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-crm-text">{row.name}</p>
            <p className="text-xs text-crm-textMuted">{row.companyName || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Workspace',
      accessor: 'workspaceName',
      cell: (row) => (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-crm-primary/10 text-crm-primary border border-crm-primary/20">
          {row.workspaceName || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Profile',
      sortable: false,
      cell: (row) => (
        <button
          type="button"
          title="View Profile"
          onClick={() => openProfile(row._id || row.userId)}
          className="p-2 rounded-lg hover:bg-crm-primary/20 text-crm-textMuted hover:text-crm-primary transition-colors"
        >
          <Eye size={18} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-crm-text tracking-tight">Clients</h1>
        <p className="text-crm-textMuted text-sm mt-1">All clients onboarded via Client Workspaces.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-10 w-10 border-t-2 border-crm-primary rounded-full" />
        </div>
      ) : (
        <DataTable columns={columns} data={clients} searchPlaceholder="Search clients by name..." />
      )}

      {isProfileOpen && clickedUserId && (
        <UserProfileModal
          userId={clickedUserId}
          isOpen={isProfileOpen}
          onClose={() => { setIsProfileOpen(false); setClickedUserId(null); }}
        />
      )}
    </div>
  );
};

export default ClientsPage;
