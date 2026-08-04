import { useState, useEffect } from 'react';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { useNavigate } from 'react-router-dom';
import { Plus, UserSquare2, Mail, Trash2, MessageSquare, UserPlus, Link2, Copy, Check, Users, Edit2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { memberService } from '../../services/memberService';
import { clientService } from '../../services/clientService';
import { workspaceService } from '../../services/workspaceService';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';

const MembersPage = () => {
  const { activeWorkspace, user } = useAuth();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  
  // Data lists
  const [members, setMembers] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [clients, setClients] = useState([]);
  const [assignedClients, setAssignedClients] = useState([]);
  
  // Modals state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  
  // Forms state
  const [memberForm, setMemberForm] = useState({
    name: '', email: '', password: '', designation: '', department: '', role: 'employee', assigned_admin_id: '', workspaceId: ''
  });
  const [editMemberForm, setEditMemberForm] = useState({
    name: '', email: '', designation: '', department: '', role: 'employee', assigned_admin_id: ''
  });
  const [assignRoles, setAssignRoles] = useState({}); // { clientId: role }

  useEffect(() => {
    fetchMembers();
    fetchWorkspaces();
    fetchClients();
  }, [activeWorkspace]);

  const fetchMembers = async () => {
    try {
      const res = await memberService.getMembers(activeWorkspace || undefined);
      setMembers(res.data);
    } catch (error) {
      console.error('Failed to fetch members', error);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await workspaceService.getWorkspaces();
      setWorkspaces(res.data);
    } catch (error) {
      console.error('Failed to fetch workspaces', error);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await clientService.getClients();
      setClients(res.data);
    } catch (error) {
      console.error('Failed to fetch clients', error);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await memberService.createMember(memberForm);
      toast.success('Member created successfully');
      setIsAddMemberOpen(false);
      setMemberForm({ name: '', email: '', password: '', designation: '', department: '', role: 'employee', assigned_admin_id: '', workspaceId: '' });
      fetchMembers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create member');
    }
  };

  const openEditMemberModal = (member) => {
    setEditingMemberId(member._id);
    setEditMemberForm({
      name: member.name || '',
      email: member.email || '',
      designation: member.designation || '',
      department: member.department || '',
      role: member.role || 'employee',
      assigned_admin_id: member.assigned_admin_id || ''
    });
    setIsEditMemberOpen(true);
  };

  const handleEditMember = async (e) => {
    e.preventDefault();
    try {
      await memberService.updateMember(editingMemberId, editMemberForm);
      toast.success('Member updated successfully');
      setIsEditMemberOpen(false);
      fetchMembers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update member');
    }
  };

  // Assignment Modal
  const openAssignModal = async (member) => {
    setSelectedMember(member);
    setIsAssignModalOpen(true);
    try {
      const res = await memberService.getAssignedClients(member._id);
      setAssignedClients(res.data);
      
      // Initialize roles dict
      const initialRoles = {};
      res.data.forEach(a => {
        if (a.client) {
          initialRoles[a.client._id] = a.role;
        }
      });
      setAssignRoles(initialRoles);
    } catch (error) {
      console.error('Failed to load assignments', error);
      toast.error('Failed to load client assignments');
    }
  };

  const handleAssignClient = async (clientId) => {
    if (!selectedMember) return;
    const role = assignRoles[clientId] || 'Account Manager';
    try {
      // selectedMember._id is the Member profile ID (not userId)
      const res2 = await clientService.assignMember(clientId, selectedMember._id, role);
      const data = res2.data;
      const clientDisplay = data.clientName || 'the client';
      const wsDisplay = data.workspaceName || 'their workspace';
      toast.success(`✅ Assigned! Member notified about "${clientDisplay}" (${wsDisplay})`);
      
      // Refresh assignments
      const res = await memberService.getAssignedClients(selectedMember._id);
      setAssignedClients(res.data);
      fetchMembers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign client');
    }
  };

  const handleRemoveAssignment = async (clientId, assignmentId) => {
    try {
      await clientService.removeAssignment(clientId, assignmentId);
      toast.success('Assignment removed');
      
      // Refresh assignments
      const res = await memberService.getAssignedClients(selectedMember._id);
      setAssignedClients(res.data);
      fetchMembers();
    } catch (error) {
      toast.error('Failed to remove assignment');
    }
  };

  const getWorkspaceName = (wsId) => {
    const ws = workspaces.find(w => w._id === wsId);
    return ws ? ws.name : 'Unknown Workspace';
  };

  const memberColumns = [
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
            <p className="font-semibold text-crm-text">{row.name}</p>
            <p className="text-xs text-crm-textMuted flex items-center gap-1">
              <Mail size={12} /> {row.email}
            </p>
          </div>
        </div>
      )
    },
    { 
      header: 'Designation & Department', 
      accessor: 'designation',
      cell: (row) => (
        <div>
          <p className="text-sm font-medium text-crm-text">{row.designation || 'Team Member'} <span className="text-xs px-2 py-0.5 ml-2 rounded-full bg-crm-primary/10 text-crm-primary">{row.role}</span></p>
          <p className="text-xs text-crm-textMuted">{row.department || 'General'}</p>
        </div>
      )
    },
    { 
      header: 'Assigned Clients', 
      accessor: 'assignedClients',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {row.assignedClients || 0} Clients
          </span>
          <button
            type="button"
            onClick={() => openAssignModal(row)}
            className="text-xs font-bold text-crm-primary hover:text-crm-primaryHover transition-colors py-1 px-2 rounded hover:bg-crm-primary/10"
          >
            Assign Client
          </button>
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
    {
      header: 'Assigned To',
      accessor: 'assigned_admin_id',
      cell: (row) => {
        if (!row.assigned_admin_id) return <span className="text-xs text-crm-textMuted italic">Unassigned</span>;
        const admin = members.find(m => m._id === row.assigned_admin_id || m.userId === row.assigned_admin_id);
        return <span className="text-xs font-semibold text-crm-text">{admin ? admin.name : 'Unknown Admin'}</span>;
      }
    },
    {
      header: 'Joined Workspaces',
      accessor: 'workspaces',
      cell: (row) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {row.workspaces && row.workspaces.length > 0 ? (
            row.workspaces.map((ws) => (
              <span
                key={ws._id}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-crm-primary/10 text-crm-primary border border-crm-primary/20 truncate"
                title={ws.name}
              >
                {ws.name}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-crm-textMuted italic">None joined yet</span>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      sortable: false,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Direct message"
            className="p-2 rounded hover:bg-crm-primary/20 text-crm-textMuted hover:text-crm-primary transition-colors"
            onClick={() =>
              navigate('/messages', {
                state: {
                  selectedUser: {
                    _id: row.userId || row._id,
                    name: row.name,
                    email: row.email,
                    profileImage: row.profileImage,
                    role: 'Member',
                  },
                },
              })
            }
          >
            <MessageSquare size={16} />
          </button>
          {(['super_admin', 'SuperAdmin'].includes(user?.role) || row.created_by === user?._id || row.assigned_admin_id === user?._id) && (
            <button
              type="button"
              title="Edit member details"
              className="p-2 rounded hover:bg-crm-primary/20 text-crm-textMuted hover:text-crm-primary transition-colors"
              onClick={() => openEditMemberModal(row)}
            >
              <Edit2 size={16} />
            </button>
          )}
          <button
            type="button"
            className="p-2 rounded hover:bg-rose-500/20 text-crm-textMuted hover:text-rose-400 transition-colors"
            onClick={async () => {
              const confirmed = await confirm({
                title: 'Remove this member?',
                message: 'This action cannot be undone. All related data will be permanently removed.'
              });
              if (confirmed) {
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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-crm-text tracking-tight">Team Management</h1>
          <p className="text-crm-textMuted text-sm mt-1">Manage team members and client assignments.</p>
        </div>
        <div>
          <button 
            onClick={() => setIsAddMemberOpen(true)}
            className="glass-button text-sm"
          >
            <Plus size={16} />
            Add Member
          </button>
        </div>
      </div>

      {/* Members Table */}
      <DataTable 
        columns={memberColumns} 
        data={members.filter(m => m._id !== user?._id && m.userId !== user?._id)} 
        searchPlaceholder="Search members..."
      />

      {/* Modal: Add Team Member */}
      <Modal 
        isOpen={isAddMemberOpen} 
        onClose={() => setIsAddMemberOpen(false)}
        title="Add Team Member"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="block text-sm text-crm-textMuted mb-1">Full Name</label>
            <input type="text" required value={memberForm.name} onChange={e => setMemberForm({...memberForm, name: e.target.value})} className="glass-input w-full" />
          </div>
          <div>
            <label className="block text-sm text-crm-textMuted mb-1">Email</label>
            <input type="email" required value={memberForm.email} onChange={e => setMemberForm({...memberForm, email: e.target.value})} className="glass-input w-full" />
          </div>
          <div>
            <label className="block text-sm text-crm-textMuted mb-1">Password</label>
            <input type="password" required value={memberForm.password} onChange={e => setMemberForm({...memberForm, password: e.target.value})} className="glass-input w-full" />
          </div>
          <div>
            <label className="block text-sm text-crm-textMuted mb-1">Role</label>
            <select value={memberForm.role} onChange={e => setMemberForm({...memberForm, role: e.target.value})} className="glass-input w-full bg-crm-darker">
              {['super_admin', 'SuperAdmin', 'Admin', 'admin'].includes(user?.role) && <option value="employee">Employee</option>}
              {['super_admin', 'SuperAdmin', 'Admin', 'admin'].includes(user?.role) && <option value="intern">Intern</option>}
              {['super_admin', 'SuperAdmin'].includes(user?.role) && <option value="admin">Admin</option>}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-crm-textMuted mb-1">Designation</label>
              <input type="text" placeholder="e.g. Ad Specialist" value={memberForm.designation} onChange={e => setMemberForm({...memberForm, designation: e.target.value})} className="glass-input w-full" />
            </div>
            <div>
              <label className="block text-sm text-crm-textMuted mb-1">Department</label>
              <input type="text" placeholder="e.g. Marketing" value={memberForm.department} onChange={e => setMemberForm({...memberForm, department: e.target.value})} className="glass-input w-full" />
            </div>
          </div>
          {['super_admin', 'SuperAdmin'].includes(user?.role) && ['employee', 'intern'].includes(memberForm.role) && (
            <div>
              <label className="block text-sm text-crm-textMuted mb-1">Assign to Admin (Optional)</label>
              <select value={memberForm.assigned_admin_id} onChange={e => setMemberForm({...memberForm, assigned_admin_id: e.target.value})} className="glass-input w-full bg-crm-darker">
                <option value="">-- No Admin Assigned --</option>
                {members.filter(m => ['admin', 'super_admin', 'superadmin'].includes(m.role?.toLowerCase()) && m._id !== user?._id && m.userId !== user?._id).map(admin => (
                  <option key={admin.userId || admin._id} value={admin.userId || admin._id}>
                    {admin.name} ({admin.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-crm-textMuted mb-1">Assign to Workspace (Optional)</label>
            <select value={memberForm.workspaceId} onChange={e => setMemberForm({...memberForm, workspaceId: e.target.value})} className="glass-input w-full bg-crm-darker">
              <option value="">-- Do not assign to workspace yet --</option>
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id}>
                  {ws.name} ({ws.type === 'office' ? 'Office' : 'Client'})
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsAddMemberOpen(false)} className="px-4 py-2 text-crm-textMuted hover:text-crm-text transition-colors">Cancel</button>
            <button type="submit" className="glass-button">Add Member</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Team Member */}
      <Modal 
        isOpen={isEditMemberOpen} 
        onClose={() => setIsEditMemberOpen(false)}
        title="Edit Team Member"
      >
        <form onSubmit={handleEditMember} className="space-y-4">
          <div>
            <label className="block text-sm text-crm-textMuted mb-1">Full Name</label>
            <input type="text" required value={editMemberForm.name} onChange={e => setEditMemberForm({...editMemberForm, name: e.target.value})} className="glass-input w-full" />
          </div>
          <div>
            <label className="block text-sm text-crm-textMuted mb-1">Email</label>
            <input type="email" required value={editMemberForm.email} onChange={e => setEditMemberForm({...editMemberForm, email: e.target.value})} className="glass-input w-full" />
          </div>
          <div>
            <label className="block text-sm text-crm-textMuted mb-1">Role</label>
            <select value={editMemberForm.role} onChange={e => setEditMemberForm({...editMemberForm, role: e.target.value})} className="glass-input w-full bg-crm-darker">
              {['super_admin', 'SuperAdmin', 'Admin', 'admin'].includes(user?.role) && <option value="employee">Employee</option>}
              {['super_admin', 'SuperAdmin', 'Admin', 'admin'].includes(user?.role) && <option value="intern">Intern</option>}
              {['super_admin', 'SuperAdmin'].includes(user?.role) && <option value="admin">Admin</option>}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-crm-textMuted mb-1">Designation</label>
              <input type="text" placeholder="e.g. Ad Specialist" value={editMemberForm.designation} onChange={e => setEditMemberForm({...editMemberForm, designation: e.target.value})} className="glass-input w-full" />
            </div>
            <div>
              <label className="block text-sm text-crm-textMuted mb-1">Department</label>
              <input type="text" placeholder="e.g. Marketing" value={editMemberForm.department} onChange={e => setEditMemberForm({...editMemberForm, department: e.target.value})} className="glass-input w-full" />
            </div>
          </div>
          {['super_admin', 'SuperAdmin'].includes(user?.role) && ['employee', 'intern'].includes(editMemberForm.role) && (
            <div>
              <label className="block text-sm text-crm-textMuted mb-1">Assign to Admin (Optional)</label>
              <select value={editMemberForm.assigned_admin_id} onChange={e => setEditMemberForm({...editMemberForm, assigned_admin_id: e.target.value})} className="glass-input w-full bg-crm-darker">
                <option value="">-- No Admin Assigned --</option>
                {members.filter(m => ['admin', 'super_admin', 'superadmin'].includes(m.role?.toLowerCase()) && m._id !== user?._id && m.userId !== user?._id).map(admin => (
                  <option key={admin.userId || admin._id} value={admin.userId || admin._id}>
                    {admin.name} ({admin.role})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsEditMemberOpen(false)} className="px-4 py-2 text-crm-textMuted hover:text-crm-text transition-colors">Cancel</button>
            <button type="submit" className="glass-button">Update Member</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Client Assignment Manager */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={selectedMember ? `Client Assignments: ${selectedMember.name}` : 'Client Assignments'}
      >
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
          <p className="text-xs text-crm-textMuted">
            Assign team members to manage workspaces and clients. Clients will only see their own workspace.
          </p>

          {clients.length === 0 ? (
            <p className="text-center py-6 text-sm text-crm-textMuted">No clients registered. Create a client first.</p>
          ) : (
            <div className="space-y-3">
              {clients.map(c => {
                const assignment = assignedClients.find(
                  a => a.client?._id === c._id || a.client?._id === c.userId
                );
                const isAssigned = !!assignment;
                return (
                  <div key={c._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3.5 rounded-xl border border-crm-border bg-crm-darker/40">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-crm-text truncate">{c.companyName || c.name}</h4>
                      <p className="text-xs text-crm-textMuted truncate">{c.name} · {c.email}</p>
                      {/* Workspace badge */}
                      {c.workspaceName && (
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-crm-primary/10 text-crm-primary border border-crm-primary/20">
                          🏢 {c.workspaceName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                      {isAssigned ? (
                        <>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                            {assignment.role}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAssignment(c._id, assignment.assignmentId)}
                            className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors py-1 px-2.5 rounded bg-rose-500/10 border border-rose-500/20"
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                          <input
                            type="text"
                            placeholder="Role (e.g. Lead Analyst)"
                            value={assignRoles[c._id] || ''}
                            onChange={e => setAssignRoles({ ...assignRoles, [c._id]: e.target.value })}
                            className="glass-input text-xs py-1 px-2.5 w-36"
                          />
                          <button
                            type="button"
                            onClick={() => handleAssignClient(c._id)}
                            className="text-xs font-bold text-crm-primary hover:text-crm-primaryHover transition-colors py-1.5 px-3 rounded bg-crm-primary/10 border border-crm-primary/20"
                          >
                            Assign
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MembersPage;
