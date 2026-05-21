import { useState, useEffect } from 'react';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Plus, UserSquare2, Mail, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { memberService } from '../../services/memberService';
import toast from 'react-hot-toast';

const MembersPage = () => {
  const { activeWorkspace } = useAuth();
  const [members, setMembers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', designation: '', department: ''
  });

  useEffect(() => {
    fetchMembers();
  }, [activeWorkspace]);

  const fetchMembers = async () => {
    try {
      if (activeWorkspace) {
        const res = await memberService.getMembers(activeWorkspace);
        setMembers(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch members');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await memberService.createMember({ ...formData, workspaceId: activeWorkspace });
      toast.success('Member created successfully');
      setIsModalOpen(false);
      fetchMembers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create member');
    }
  };

  const columns = [
    { 
      header: 'Member', 
      accessor: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-crm-primary/20 flex items-center justify-center text-crm-primary font-bold relative">
            {row.name?.charAt(0)}
            {row.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-crm-card rounded-full"></span>}
          </div>
          <div>
            <p className="font-medium text-white">{row.name}</p>
            <p className="text-xs text-crm-textMuted flex items-center gap-1">
              <Mail size={12} /> {row.email}
            </p>
          </div>
        </div>
      )
    },
    { 
      header: 'Role', 
      accessor: 'designation',
      cell: (row) => (
        <div>
          <p className="text-sm text-crm-text">{row.designation || 'Team Member'}</p>
          <p className="text-xs text-crm-textMuted">{row.department || 'General'}</p>
        </div>
      )
    },
    { 
      header: 'Assigned Clients', 
      accessor: 'assignedClients',
      cell: (row) => <span className="badge-warning">{row.assignedClients || 0} Clients</span>
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
          <button 
            className="p-2 rounded hover:bg-rose-500/20 text-crm-textMuted hover:text-rose-400 transition-colors"
            onClick={async () => {
              if (window.confirm('Remove this member?')) {
                await memberService.deleteMember(row._id);
                fetchMembers();
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Team Members</h1>
          <p className="text-crm-textMuted text-sm mt-1">Manage agency team members and assignments.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="glass-button"
        >
          <Plus size={18} />
          Add Member
        </button>
      </div>

      <DataTable 
        columns={columns} 
        data={members} 
        searchPlaceholder="Search members..."
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Add Team Member"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-crm-textMuted mb-1">Full Name</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="glass-input w-full" />
          </div>
          <div>
            <label className="block text-sm text-crm-textMuted mb-1">Email</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="glass-input w-full" />
          </div>
          <div>
            <label className="block text-sm text-crm-textMuted mb-1">Password</label>
            <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="glass-input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-crm-textMuted mb-1">Designation</label>
              <input type="text" placeholder="e.g. Ad Specialist" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} className="glass-input w-full" />
            </div>
            <div>
              <label className="block text-sm text-crm-textMuted mb-1">Department</label>
              <input type="text" placeholder="e.g. Marketing" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="glass-input w-full" />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-crm-textMuted hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="glass-button">Add Member</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MembersPage;
