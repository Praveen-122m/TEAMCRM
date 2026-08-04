import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { notificationService } from '../services/notificationService';
import { 
  Bell, CheckCircle2, Trash2, MessageSquare, ClipboardList, 
  PlusSquare, FolderPlus, Clock, Search, ArrowLeft 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const getRelativeTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

const NotificationCenter = () => {
  const { user, setActiveWorkspace } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationService.getAll();
      setItems(res.data || []);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    try {
      await notificationService.markAllRead();
      toast.success('All marked as read');
    } catch (err) {
      console.error(err);
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;
    setItems([]);
    try {
      await notificationService.clearAll();
      toast.success('All notifications cleared');
    } catch (err) {
      console.error(err);
    }
  };

  const goTo = async (n) => {
    try {
      await notificationService.markRead(n._id);
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    } catch { /* ignore */ }

    const p = n.payload || {};
    if (p.workspaceId) setActiveWorkspace(p.workspaceId.toString());

    if (n.type === 'lead' || p.isLead || n.link?.startsWith?.('lead|')) {
      if (p.workspaceId) setActiveWorkspace(p.workspaceId.toString());
      navigate('/');
      return;
    }
    if (n.type === 'dm' || p.isDirectMessage) {
      const senderId = p.senderId || p.sender?._id || n.sender?._id;
      navigate('/messages', {
        state: { selectedUser: p.sender || n.sender || { _id: senderId, name: n.sender?.name } },
      });
    } else if (n.type?.startsWith('task') || p.taskId || n.content?.toLowerCase().includes('task')) {
      const isAdminRole = ['admin', 'superadmin', 'super_admin'].includes(user?.role?.toLowerCase().replace(/[\s_]+/g, ''));
      navigate(isAdminRole ? '/admin/tasks' : '/my-tasks');
    } else {
      navigate('/channels', {
        state: { workspaceId: p.workspaceId, activeChannelId: p.channelId },
      });
    }
  };

  const filteredItems = items.filter(n => {
    if (search && !n.content?.toLowerCase().includes(search.toLowerCase()) && !n.sender?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const unreadCount = items.filter(n => !n.isRead).length;

  return (
    <div className="flex flex-col h-full bg-crm-bg text-crm-text p-6">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col h-full">
        
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-crm-textMuted hover:text-crm-text mb-4 transition-colors self-start">
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="text-crm-accent" size={24} />
              Notification Center
            </h1>
            <p className="text-sm text-crm-textMuted mt-1">
              You have <span className="font-bold text-crm-text">{unreadCount}</span> unread notifications out of {items.length} total.
            </p>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={markAll} 
              disabled={unreadCount === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-crm-border hover:border-crm-primary/50 text-crm-textMuted hover:text-crm-primary rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={16} />
              <span>Mark all read</span>
            </button>
            <button 
              onClick={clearAll} 
              disabled={items.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-crm-border hover:border-rose-500/50 text-crm-textMuted hover:text-rose-500 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} />
              <span>Clear all</span>
            </button>
          </div>
        </div>

        <div className="bg-crm-card border border-crm-border rounded-2xl shadow-sm flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b border-crm-border/50 bg-crm-darker/30">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-textMuted" size={18} />
              <input 
                type="text"
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-crm-bg border border-crm-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-crm-primary text-crm-text transition-colors placeholder:text-crm-textMuted/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="w-8 h-8 border-2 border-crm-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <div className="w-16 h-16 bg-crm-bg rounded-full flex items-center justify-center mb-3">
                  <Bell size={24} className="text-crm-textMuted/30" />
                </div>
                <p className="text-sm font-bold text-crm-text">No notifications found</p>
                <p className="text-xs text-crm-textMuted mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredItems.map(n => {
                  const isTask = n.type?.startsWith('task') || n.payload?.taskId || n.content?.toLowerCase().includes('task');
                  const isNewTask = n.content?.toLowerCase().includes('new task assigned');
                  const isFile = n.content?.toLowerCase().includes('shared a file') || n.type === 'file';
                  const isZip = isFile && n.content?.toLowerCase().includes('.zip');

                  let Icon = MessageSquare;
                  let iconBg = 'bg-crm-primary/20';
                  let iconColor = 'text-crm-primary';
                  let title = n.sender?.name || 'System';

                  if (isNewTask) {
                    Icon = PlusSquare; iconBg = 'bg-emerald-500/20'; iconColor = 'text-emerald-500'; title = 'New task assigned';
                  } else if (isTask) {
                    Icon = ClipboardList; iconBg = 'bg-crm-accent/20'; iconColor = 'text-crm-accent'; title = 'Task updated';
                  } else if (isZip) {
                    Icon = FolderPlus; iconBg = 'bg-amber-500/20'; iconColor = 'text-amber-500'; title = 'File shared';
                  }

                  return (
                    <button
                      key={n._id}
                      onClick={() => goTo(n)}
                      className={`w-full text-left p-4 rounded-xl border border-transparent hover:bg-crm-darker transition-all flex gap-4 ${
                        !n.isRead ? 'bg-crm-primary/5 hover:bg-crm-primary/10 border-crm-primary/10' : ''
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
                        <Icon size={22} className={iconColor} />
                      </div>
                      
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-bold text-crm-text">{title}</span>
                          <span className="text-[11px] font-medium text-crm-textMuted">{getRelativeTime(n.createdAt)}</span>
                        </div>
                        <p className={`text-sm ${!n.isRead ? 'text-crm-text font-medium' : 'text-crm-textMuted'}`}>
                          {n.content}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 opacity-60">
                          <Clock size={12} />
                          <span className="text-[11px]">{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      {!n.isRead && (
                        <div className="flex items-center justify-center pl-2">
                          <div className="w-2.5 h-2.5 bg-crm-primary rounded-full shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default NotificationCenter;
