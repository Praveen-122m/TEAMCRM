import { useState, useEffect, useCallback, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { SocketContext } from '../context/SocketContext';
import { leadService, LEAD_STATUSES, LEAD_SOURCES, statusBadgeClass, downloadBlob } from '../services/leadService';
import { clientService } from '../services/clientService';
import { memberService } from '../services/memberService';
import { Modal } from '../components/Modal';
import toast from 'react-hot-toast';
import { useConfirm } from '../context/ConfirmContext';
import { metaService } from '../services/metaService';
import {
  Download,
  Eye,
  Trash2,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Link,
} from 'lucide-react';
import { DatePicker } from '../components/ui/DatePicker';

const LeadCenter = () => {
  const { user, activeWorkspace } = useAuth();
  const { confirm } = useConfirm();
  const { socket } = useContext(SocketContext) || {};
  const role = user?.role;
  const wsId = activeWorkspace || user?.workspaces?.[0];

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [clients, setClients] = useState([]);
  const [members, setMembers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [detailLead, setDetailLead] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editStatus, setEditStatus] = useState('NEW');
  const [editNotes, setEditNotes] = useState('');
  const [assignMemberId, setAssignMemberId] = useState('');

  // Meta connection status
  const [metaStatus, setMetaStatus] = useState(null);
  const [pageIdInput, setPageIdInput] = useState('');
  const [savingPageId, setSavingPageId] = useState(false);
  const [selectedClientForMeta, setSelectedClientForMeta] = useState('');

  const handleSyncLeads = async () => {
    if (!wsId) return;
    const targetClientId = filterClient || selectedClientForMeta || undefined;
    try {
      setSyncing(true);
      const toastId = toast.loading('Syncing real-time leads from Meta Ads...');
      await metaService.syncLeads(targetClientId, wsId);
      toast.success('Meta Leads sync completed successfully!', { id: toastId });
      fetchLeads();
    } catch (err) {
      console.error(err);
      toast.error('Sync failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const checkMetaStatus = useCallback(async (clientId) => {
    if (!clientId || role !== 'Admin') return;
    try {
      const res = await metaService.getMetaStatus(clientId);
      setMetaStatus(res.data);
      setPageIdInput(res.data.pageId || '');
    } catch (err) {
      console.error('Failed to check Meta status:', err);
    }
  }, [role]);

  const handleSavePageId = async () => {
    const clientId = filterClient || selectedClientForMeta;
    if (!clientId) { toast.error('Please select a client first'); return; }
    if (!pageIdInput.trim()) { toast.error('Please enter a valid Facebook Page ID'); return; }
    try {
      setSavingPageId(true);
      await metaService.savePageId(clientId, pageIdInput.trim());
      toast.success('Facebook Page ID saved! You can now sync real leads.');
      checkMetaStatus(clientId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save Page ID');
    } finally {
      setSavingPageId(false);
    }
  };

  const buildParams = useCallback(
    () => ({
      workspaceId: role === 'Admin' ? undefined : wsId,
      search: search || undefined,
      clientId: filterClient || undefined,
      status: filterStatus || undefined,
      source: filterSource || undefined,
      dateFrom: filterDateFrom || undefined,
      dateTo: filterDateTo || undefined,
    }),
    [wsId, search, filterClient, filterStatus, filterSource, filterDateFrom, filterDateTo]
  );

  const fetchLeads = useCallback(async () => {
    if (!wsId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await leadService.getLeads(buildParams());
      setLeads(res.data || []);
      const camps = [...new Set((res.data || []).map((l) => l.campaignName).filter(Boolean))];
      setCampaigns(camps);
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [wsId, buildParams]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (!wsId || role === 'Client') return;
    clientService.getClients(role === 'Admin' ? undefined : wsId).then((r) => {
      const list = r.data || [];
      setClients(list);
      // Auto-select first client for meta status check
      if (list.length > 0 && !selectedClientForMeta) {
        setSelectedClientForMeta(list[0]._id);
        checkMetaStatus(list[0]._id);
      }
    }).catch(() => {});
    if (role === 'Admin') {
      memberService.getMembers(wsId).then((r) => setMembers(r.data || [])).catch(() => {});
    }
  }, [wsId, role]);

  // Check meta status when client filter changes
  useEffect(() => {
    if (filterClient) {
      setSelectedClientForMeta(filterClient);
      checkMetaStatus(filterClient);
    }
  }, [filterClient, checkMetaStatus]);


  useEffect(() => {
    if (!socket) return;
    const onLead = () => {
      fetchLeads();
      toast.success('New lead activity', { icon: '🎯' });
    };
    socket.on('lead_received', onLead);
    socket.on('lead_updated', onLead);
    socket.on('lead_deleted', onLead);
    return () => {
      socket.off('lead_received', onLead);
      socket.off('lead_updated', onLead);
      socket.off('lead_deleted', onLead);
    };
  }, [socket, fetchLeads]);

  const openDetail = async (lead) => {
    try {
      const res = await leadService.getLead(lead._id);
      const d = res.data;
      setDetailLead(d);
      setEditStatus(d.status || 'NEW');
      setEditNotes(d.notes || '');
      setAssignMemberId(d.assignedMemberId || '');
      setModalOpen(true);
    } catch {
      toast.error('Could not load lead');
    }
  };

  const saveDetail = async () => {
    if (!detailLead) return;
    try {
      if (role === 'Admin') {
        await leadService.updateLead(detailLead._id, {
          status: editStatus,
          notes: editNotes,
          assignedMemberId: assignMemberId || null,
        });
      } else {
        await leadService.updateStatus(detailLead._id, { status: editStatus, notes: editNotes });
      }
      toast.success('Lead updated');
      setModalOpen(false);
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleAssign = async (leadId, memberId) => {
    try {
      await leadService.assignLead(leadId, memberId);
      toast.success('Lead assigned');
      fetchLeads();
    } catch {
      toast.error('Assign failed');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete this lead?',
      message: 'This action cannot be undone. All related data will be permanently removed.'
    });
    if (!confirmed) return;
    try {
      await leadService.deleteLead(id);
      toast.success('Lead deleted');
      fetchLeads();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleExport = async (type) => {
    try {
      const params = buildParams();
      let res;
      let filename = 'leads.csv';
      if (type === 'csv') {
        res = await leadService.exportCsv(params);
        filename = 'leads.csv';
      } else if (type === 'excel') {
        res = await leadService.exportExcel(params);
        filename = 'leads.xls';
      } else {
        res = await leadService.exportPdf(params);
        filename = 'leads.pdf';
      }
      downloadBlob(res.data, filename);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  const isAdmin = role === 'Admin';
  const isMember = role === 'Member';
  const isClient = role === 'Client';

  if (!wsId) {
    return (
      <div className="glass-panel p-8 text-center text-crm-textMuted">
        Select or join a workspace to use Lead Center.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-crm-text tracking-tight">Lead Center</h1>
          <p className="text-crm-textMuted text-sm mt-1">
            {isMember ? 'Your assigned leads' : isClient ? 'Your campaign leads' : 'All workspace leads — real-time'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={fetchLeads} className="glass-button-secondary text-sm">
            <RefreshCw size={16} /> Refresh
          </button>
          {(isAdmin || isClient) && (
            <button 
              type="button" 
              onClick={handleSyncLeads} 
              disabled={syncing}
              className="glass-button text-sm flex items-center gap-1.5"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              Sync Meta Leads
            </button>
          )}
          {(isAdmin || isClient) && (
            <>
              <button type="button" onClick={() => handleExport('csv')} className="glass-button-secondary text-sm">
                <Download size={16} /> CSV
              </button>
              {isAdmin && (
                <button type="button" onClick={() => handleExport('excel')} className="glass-button-secondary text-sm">
                  <Download size={16} /> Excel
                </button>
              )}
              <button type="button" onClick={() => handleExport('pdf')} className="glass-button-secondary text-sm">
                <Download size={16} /> PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Meta Connection Status Panel (Admin only) ── */}
      {isAdmin && metaStatus && (
        <div className={`rounded-xl border p-4 ${
          metaStatus.hasLeadsPermission && metaStatus.pageId
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : 'border-amber-500/30 bg-amber-500/10'
        }`}>
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="flex items-start gap-3 flex-1">
              {metaStatus.hasLeadsPermission && metaStatus.pageId ? (
                <CheckCircle size={20} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
              )}
              <div>
                {metaStatus.hasLeadsPermission && metaStatus.pageId ? (
                  <>
                    <p className="text-emerald-300 font-medium text-sm">✅ Meta Lead Ads fully configured</p>
                    <p className="text-emerald-400/70 text-xs mt-0.5">Page ID: <code className="bg-black/30 px-1 py-0.5 rounded">{metaStatus.pageId}</code> · Permissions: {metaStatus.permissions?.join(', ')}</p>
                  </>
                ) : (
                  <>
                    <p className="text-amber-300 font-semibold text-sm">⚠️ Meta Lead Ads needs setup to fetch real leads</p>
                    <div className="text-amber-400/80 text-xs mt-1 space-y-1">
                      {!metaStatus.hasLeadsPermission && (
                        <p>❌ <strong>leads_retrieval</strong> permission missing — current token only has: <code className="bg-black/30 px-1 rounded">{metaStatus.permissions?.join(', ') || 'none'}</code></p>
                      )}
                      {!metaStatus.pageId && (
                        <p>❌ <strong>Facebook Page ID</strong> not set — needed to fetch lead forms</p>
                      )}
                      {!metaStatus.hasLeadsPermission && (
                        <p className="mt-1">→ Reconnect Meta Ads via <strong>Meta Ads Dashboard → Connect Account</strong> to grant <code className="bg-black/30 px-1 rounded">leads_retrieval</code> permission</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Page ID input */}
            {isAdmin && metaStatus.connected && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-amber-400/80">Facebook Page ID</label>
                  <div className="flex gap-2">
                    <input
                      value={pageIdInput}
                      onChange={(e) => setPageIdInput(e.target.value)}
                      placeholder="e.g. 123456789012345"
                      className="glass-input text-xs w-48 py-1.5"
                    />
                    <button
                      onClick={handleSavePageId}
                      disabled={savingPageId || !pageIdInput.trim()}
                      className="glass-button text-xs py-1.5 px-3 whitespace-nowrap disabled:opacity-50"
                    >
                      {savingPageId ? 'Saving...' : 'Save Page ID'}
                    </button>
                  </div>
                  <p className="text-xs text-amber-400/60">
                    <Link size={10} className="inline mr-1" />
                    Find your Page ID at: facebook.com/your-page → About → Page ID
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="glass-panel p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-textMuted" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            className="glass-input w-full pl-9 text-sm"
          />
        </div>
        {isAdmin && (
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="glass-input text-sm">
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.companyName || c.name}
              </option>
            ))}
          </select>
        )}
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="glass-input text-sm">
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="glass-input text-sm">
          <option value="">All sources</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <DatePicker
          value={filterDateFrom}
          onChange={setFilterDateFrom}
          placeholder="From date"
          className="w-full"
        />
        <DatePicker
          value={filterDateTo}
          onChange={setFilterDateTo}
          placeholder="To date"
          className="w-full"
        />
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-10 w-10 border-t-2 border-crm-primary rounded-full" />
          </div>
        ) : leads.length === 0 ? (
          <p className="text-center py-16 text-crm-textMuted">No leads found. Sync Meta Ads or adjust filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-crm-border text-left text-crm-textMuted text-xs uppercase">
                  <th className="p-4">Lead Name</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Email</th>
                  {isAdmin && <th className="p-4">Client</th>}
                  <th className="p-4">Campaign</th>
                  {isAdmin && <th className="p-4">Assigned</th>}
                  <th className="p-4">Source</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((row) => (
                  <tr
                    key={row._id}
                    className="border-b border-crm-border/50 hover:bg-crm-primary/5 cursor-pointer transition-colors"
                    onClick={() => openDetail(row)}
                  >
                    <td className="p-4 font-medium text-crm-text">{row.name || row.leadName}</td>
                    <td className="p-4 text-crm-text">{row.phone || '—'}</td>
                    <td className="p-4 text-crm-text">{row.email || '—'}</td>
                    {isAdmin && <td className="p-4 text-crm-text">{row.clientName}</td>}
                    <td className="p-4 text-crm-text">{row.campaignName}</td>
                    {isAdmin && <td className="p-4 text-crm-text">{row.assignedMemberName}</td>}
                    <td className="p-4 text-crm-text">{row.leadSource || row.source}</td>
                    <td className="p-4 text-crm-text text-xs">
                      {new Date(row.date || row.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${statusBadgeClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => openDetail(row)} className="p-2 hover:text-crm-primary" title="View">
                          <Eye size={16} />
                        </button>
                        {isAdmin && (
                          <button type="button" onClick={() => handleDelete(row._id)} className="p-2 hover:text-rose-400" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Lead details" maxWidth="max-w-2xl">
        {detailLead && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-crm-textMuted text-xs">Full Name</p>
                <p className="text-crm-text font-medium">{detailLead.name}</p>
              </div>
              <div>
                <p className="text-crm-textMuted text-xs">Phone</p>
                <p className="text-crm-text">{detailLead.phone || '—'}</p>
              </div>
              <div>
                <p className="text-crm-textMuted text-xs">Email</p>
                <p className="text-crm-text">{detailLead.email || '—'}</p>
              </div>
              <div>
                <p className="text-crm-textMuted text-xs">Client</p>
                <p className="text-crm-text">{detailLead.clientName}</p>
              </div>
              <div>
                <p className="text-crm-textMuted text-xs">Campaign</p>
                <p className="text-crm-text">{detailLead.campaignName}</p>
              </div>
              <div>
                <p className="text-crm-textMuted text-xs">Source</p>
                <p className="text-crm-text">{detailLead.leadSource || detailLead.source}</p>
              </div>
              <div>
                <p className="text-crm-textMuted text-xs">Created</p>
                <p className="text-crm-text">{new Date(detailLead.date || detailLead.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-crm-textMuted text-xs">Status</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold border ${statusBadgeClass(detailLead.status)}`}>
                  {detailLead.status}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs text-crm-textMuted">Update status</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="glass-input w-full mt-1">
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-crm-textMuted">Notes</label>
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="glass-input w-full mt-1 min-h-[100px]" />
            </div>

            {isAdmin && (
              <div>
                <label className="text-xs text-crm-textMuted">Assign member</label>
                <select value={assignMemberId} onChange={(e) => setAssignMemberId(e.target.value)} className="glass-input w-full mt-1">
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-crm-textMuted">
                Cancel
              </button>
              <button type="button" onClick={saveDetail} className="glass-button">
                Save changes
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LeadCenter;
