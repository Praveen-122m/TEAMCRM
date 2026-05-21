import { useState, useEffect } from 'react';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Plus, Edit2, Trash2, Mail, Phone, Briefcase } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { clientService } from '../../services/clientService';
import toast from 'react-hot-toast';

const ClientsPage = () => {
  const { activeWorkspace } = useAuth();
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', companyName: '', industry: '', phone: '', monthlyBudget: 0
  });

  useEffect(() => {
    fetchClients();
  }, [activeWorkspace]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      if (activeWorkspace) {
        const res = await clientService.getClients(activeWorkspace);
        setClients(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await clientService.createClient({ ...formData, workspaceId: activeWorkspace });
      toast.success('Client created successfully');
      setIsModalOpen(false);
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create client');
    }
  };

  const columns = [
    { 
      header: 'Company', 
      accessor: 'companyName',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-crm-primary/20 flex items-center justify-center text-crm-primary font-bold">
            {row.companyName?.charAt(0) || row.name?.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-white">{row.companyName || row.name}</p>
            <p className="text-xs text-crm-textMuted flex items-center gap-1">
              <Briefcase size={12} /> {row.industry || 'N/A'}
            </p>
          </div>
        </div>
      )
    },
    { 
      header: 'Contact', 
      accessor: 'email',
      cell: (row) => (
        <div>
          <p className="text-sm text-crm-text flex items-center gap-2">
            <Mail size={14} className="text-crm-textMuted" /> {row.email}
          </p>
          <p className="text-xs text-crm-textMuted flex items-center gap-2 mt-1">
            <Phone size={14} /> {row.phone || 'N/A'}
          </p>
        </div>
      )
    },
    { 
      header: 'Budget', 
      accessor: 'monthlyBudget',
      cell: (row) => <span className="font-medium text-emerald-400">${row.monthlyBudget?.toLocaleString() || 0}</span>
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
    {
      header: 'Actions',
      sortable: false,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button className="p-2 rounded hover:bg-crm-border text-crm-textMuted hover:text-white transition-colors">
            <Edit2 size={16} />
          </button>
          <button 
            className="p-2 rounded hover:bg-rose-500/20 text-crm-textMuted hover:text-rose-400 transition-colors"
            onClick={async () => {
              if (window.confirm('Archive this client?')) {
                await clientService.deleteClient(row._id);
                fetchClients();
              }
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Clients</h1>
          <p className="text-crm-textMuted text-sm mt-1">Manage your agency clients and their details.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="glass-button"
        >
          <Plus size={18} />
          Add Client
        </button>
      </div>

      <DataTable 
        columns={columns} 
        data={clients} 
        searchPlaceholder="Search clients by name, email..."
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Add New Client"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-crm-textMuted mb-1">Company Name</label>
              <input type="text" required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="glass-input w-full" />
            </div>
            <div>
              <label className="block text-sm text-crm-textMuted mb-1">Contact Name</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="glass-input w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-crm-textMuted mb-1">Email</label>
              <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="glass-input w-full" />
            </div>
            <div>
              <label className="block text-sm text-crm-textMuted mb-1">Phone</label>
              <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="glass-input w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-crm-textMuted mb-1">Password for Client Login</label>
            <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="glass-input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-crm-textMuted mb-1">Industry</label>
              <input type="text" value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} className="glass-input w-full" />
            </div>
            <div>
              <label className="block text-sm text-crm-textMuted mb-1">Monthly Budget ($)</label>
              <input type="number" value={formData.monthlyBudget} onChange={e => setFormData({...formData, monthlyBudget: e.target.value})} className="glass-input w-full" />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-crm-textMuted hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="glass-button">Create Client</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClientsPage;
