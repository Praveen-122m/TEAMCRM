import { useState, useEffect, useContext, useCallback } from 'react';
import { 
  Bell, MessageSquare, AtSign, CheckCircle2, 
  ClipboardList, PlusSquare, Paperclip, FolderPlus, 
  Clock, ArrowRight, Layers, Trash2, Settings 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../context/SocketContext';
import { useAuth } from '../hooks/useAuth';
import { notificationService } from '../services/notificationService';
import { useNotificationSound } from '../hooks/useNotificationSound';

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

const NotificationBell = () => {
  const { socket } = useContext(SocketContext) || {};
  const { user, setActiveWorkspace } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { playSound } = useNotificationSound();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationService.getAll();
      setItems(res.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onNew = (n) => {
      setItems((prev) => {
        if (prev.some((x) => x._id === n._id)) return prev;
        return [n, ...prev].slice(0, 50);
      });
      playSound();
    };
    socket.on('notification_received', onNew);
    return () => socket.off('notification_received', onNew);
  }, [socket, playSound]);

  const unread = items.filter((n) => !n.isRead).length;

  useEffect(() => {
    // Update Document Title Badge
    if (unread > 0) {
      document.title = `(${unread}) TeamCRM`;
    } else {
      document.title = 'TeamCRM';
    }

    // Update PWA OS Badge if supported
    if ('setAppBadge' in navigator) {
      if (unread > 0) {
        navigator.setAppBadge(unread).catch((error) => {
          console.warn('App badge update failed', error);
        });
      } else {
        navigator.clearAppBadge().catch((error) => {
          console.warn('App badge clear failed', error);
        });
      }
    }
  }, [unread]);

  const handleOpen = () => {
    setOpen((o) => !o);
    if (!open) load();
  };

  const goTo = async (n) => {
    try {
      await notificationService.markRead(n._id);
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    } catch {
      /* ignore */
    }

    const p = n.payload || {};
    if (p.workspaceId) {
      setActiveWorkspace(p.workspaceId.toString());
    }

    if (n.type === 'lead' || p.isLead || n.link?.startsWith?.('lead|')) {
      if (p.workspaceId) setActiveWorkspace(p.workspaceId.toString());
      navigate('/');
      setOpen(false);
      return;
    }
    if (n.type === 'dm' || p.isDirectMessage) {
      const senderId = p.senderId || p.sender?._id || n.sender?._id;
      navigate('/messages', {
        state: {
          selectedUser: p.sender || n.sender || { _id: senderId, name: n.sender?.name },
        },
      });
    } else if (n.type?.startsWith('task_') || p.taskId || n.content?.toLowerCase().includes('task')) {
      const isAdminRole = ['admin', 'superadmin', 'super_admin'].includes(
        user?.role ? user?.role.toLowerCase().replace(/[\s_]+/g, '') : ''
      ) || (user?.name && user.name.toLowerCase().replace(/[\s_]+/g, '').includes('superadmin'));
      
      const targetPath = isAdminRole ? '/admin/tasks' : '/my-tasks';
      navigate(targetPath);
    } else {
      navigate('/channels', {
        state: {
          workspaceId: p.workspaceId,
          activeChannelId: p.channelId,
        },
      });
    }
    setOpen(false);
  };

  const markAll = async () => {
    // Optimistic UI update for instant feedback
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    try {
      await notificationService.markAllRead();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const clearAll = async () => {
    // Optimistic UI update
    setItems([]);
    try {
      await notificationService.clearAll();
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const tasksCount = items.filter(n => n.type?.startsWith('task') || n.payload?.taskId || n.content?.toLowerCase().includes('task')).length;
  const filesCount = items.filter(n => n.content?.toLowerCase().includes('shared a file') || n.type === 'file').length;
  const mentionsCount = items.filter(n => n.type === 'mention' || n.content?.toLowerCase().includes('mentioned')).length;

  const filteredItems = items.filter(n => {
    if (activeTab === 'tasks') return n.type?.startsWith('task') || n.payload?.taskId || n.content?.toLowerCase().includes('task');
    if (activeTab === 'files') return n.content?.toLowerCase().includes('shared a file') || n.type === 'file';
    if (activeTab === 'mentions') return n.type === 'mention' || n.content?.toLowerCase().includes('mentioned');
    return true;
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 text-crm-textMuted hover:text-crm-text transition-colors"
        title="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-crm-accent text-crm-primary-text text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 mt-2 w-[380px] sm:w-[420px] rounded-2xl bg-crm-card border border-crm-border shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
            
            {/* Header */}
            <div className="px-5 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bell size={20} className="text-crm-accent" />
                  <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-crm-accent rounded-full animate-pulse shadow-[0_0_6px_rgba(124,58,237,0.8)]" />
                </div>
                <span className="text-lg font-bold text-crm-text">Notifications</span>
              </div>
              {unread > 0 && (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={markAll} className="text-xs text-crm-primary flex items-center gap-1.5 font-semibold hover:text-crm-primaryHover transition-colors" title="Mark all as read">
                    <CheckCircle2 size={16} />
                  </button>
                  <button type="button" onClick={() => { setOpen(false); navigate('/settings/notifications'); }} className="text-xs text-crm-textMuted flex items-center gap-1.5 font-semibold hover:text-crm-text transition-colors" title="Notification Settings">
                    <Settings size={16} />
                  </button>
                </div>
              )}
              {unread === 0 && (
                <button type="button" onClick={() => { setOpen(false); navigate('/settings/notifications'); }} className="text-xs text-crm-textMuted flex items-center gap-1.5 font-semibold hover:text-crm-text transition-colors" title="Notification Settings">
                  <Settings size={16} />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="px-4 pb-3 flex gap-2 overflow-x-auto custom-scrollbar border-b border-crm-border/50">
              <button onClick={() => setActiveTab('all')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'all' ? 'bg-crm-primary text-crm-primary-text shadow-md' : 'bg-crm-darker text-crm-textMuted hover:text-crm-text hover:bg-crm-border/30'}`}>
                <span>All</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] leading-none ${activeTab === 'all' ? 'bg-black/20' : 'bg-crm-border/50'}`}>{items.length}</span>
              </button>
              <button onClick={() => setActiveTab('tasks')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'tasks' ? 'bg-crm-primary text-crm-primary-text shadow-md' : 'bg-crm-darker text-crm-textMuted hover:text-crm-text hover:bg-crm-border/30'}`}>
                <ClipboardList size={14} />
                <span>Tasks</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] leading-none ${activeTab === 'tasks' ? 'bg-black/20' : 'bg-crm-border/50'}`}>{tasksCount}</span>
              </button>
              <button onClick={() => setActiveTab('files')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'files' ? 'bg-crm-primary text-crm-primary-text shadow-md' : 'bg-crm-darker text-crm-textMuted hover:text-crm-text hover:bg-crm-border/30'}`}>
                <Paperclip size={14} />
                <span>Files</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] leading-none ${activeTab === 'files' ? 'bg-black/20' : 'bg-crm-border/50'}`}>{filesCount}</span>
              </button>
              <button onClick={() => setActiveTab('mentions')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'mentions' ? 'bg-crm-primary text-crm-primary-text shadow-md' : 'bg-crm-darker text-crm-textMuted hover:text-crm-text hover:bg-crm-border/30'}`}>
                <AtSign size={14} />
                <span>Mentions</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] leading-none ${activeTab === 'mentions' ? 'bg-black/20' : 'bg-crm-border/50'}`}>{mentionsCount}</span>
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto custom-scrollbar max-h-[380px]">
              {loading ? (
                <div className="p-8 flex justify-center items-center">
                  <div className="w-6 h-6 border-2 border-crm-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-crm-darker rounded-full flex items-center justify-center mb-3">
                    <Bell size={24} className="text-crm-textMuted/50" />
                  </div>
                  <p className="text-sm font-bold text-crm-text">All caught up!</p>
                  <p className="text-xs text-crm-textMuted mt-1">No notifications in this category</p>
                </div>
              ) : (
                filteredItems.map((n) => {
                  const isTask = n.type?.startsWith('task') || n.payload?.taskId || n.content?.toLowerCase().includes('task');
                  const isNewTask = n.content?.toLowerCase().includes('new task assigned');
                  const isFile = n.content?.toLowerCase().includes('shared a file') || n.type === 'file';
                  const isZip = isFile && n.content?.toLowerCase().includes('.zip');
                  const isMention = n.type === 'mention' || n.content?.toLowerCase().includes('mentioned');

                  let Icon = MessageSquare;
                  let iconBg = 'bg-crm-primary/20';
                  let iconColor = 'text-crm-primary';
                  let dotColor = 'bg-crm-primary';
                  let title = n.sender?.name || 'System';

                  if (isNewTask) {
                    Icon = PlusSquare;
                    iconBg = 'bg-emerald-500/20';
                    iconColor = 'text-emerald-500';
                    dotColor = 'bg-emerald-500';
                    title = 'New task assigned';
                  } else if (isTask) {
                    Icon = ClipboardList;
                    iconBg = 'bg-crm-accent/20';
                    iconColor = 'text-crm-accent';
                    dotColor = 'bg-crm-accent';
                    title = 'Task updated';
                  } else if (isZip) {
                    Icon = FolderPlus;
                    iconBg = 'bg-amber-500/20';
                    iconColor = 'text-amber-500';
                    dotColor = 'bg-amber-500';
                    title = 'File shared';
                  } else if (isFile) {
                    Icon = Paperclip;
                    iconBg = 'bg-blue-500/20';
                    iconColor = 'text-blue-500';
                    dotColor = 'bg-blue-500';
                    title = 'File shared';
                  } else if (isMention) {
                    Icon = AtSign;
                    iconBg = 'bg-rose-500/20';
                    iconColor = 'text-rose-500';
                    dotColor = 'bg-rose-500';
                    title = 'Mentioned you';
                  }

                  return (
                    <button
                      key={n._id}
                      type="button"
                      onClick={() => goTo(n)}
                      className={`w-full text-left px-5 py-4 border-b border-crm-border/50 hover:bg-crm-darker/60 transition-all flex gap-3 relative group ${
                        !n.isRead ? 'bg-crm-darker/30' : ''
                      }`}
                    >
                      {/* Unread Left Dot */}
                      <div className="absolute left-1.5 top-0 bottom-0 flex items-center">
                        <div className={`w-1.5 h-1.5 rounded-full transition-opacity duration-300 ${!n.isRead ? 'bg-crm-accent shadow-[0_0_6px_rgba(124,58,237,0.6)]' : 'opacity-0'}`} />
                      </div>

                      {/* Icon Box */}
                      <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center shrink-0 ml-1.5 shadow-sm`}>
                        <Icon size={20} className={iconColor} />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-bold text-crm-text truncate pr-2">{title}</span>
                          <span className="text-[11px] font-medium text-crm-textMuted shrink-0">
                            {getRelativeTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-crm-textMuted line-clamp-1 pr-6">{n.content}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Clock size={12} className="text-crm-textMuted/70" />
                          <span className="text-[10px] font-medium text-crm-textMuted/80">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Right Indicator Dot */}
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        <div className={`w-1.5 h-1.5 rounded-full ${dotColor} opacity-70 group-hover:opacity-100 transition-opacity`} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-crm-border/50 bg-crm-card/50 backdrop-blur-md flex flex-col gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(false); navigate('/notifications'); }}
                className="w-full py-2 flex justify-center items-center gap-1.5 text-xs font-semibold text-crm-text hover:text-crm-primary transition-colors bg-crm-darker/50 hover:bg-crm-primary/10 rounded-xl"
              >
                <span>View Notification Center</span>
                <ArrowRight size={14} />
              </button>
              
              <div className="flex gap-2">
                <button 
                  type="button"
                  disabled={unread === 0}
                  onClick={(e) => { e.stopPropagation(); markAll(); }} 
                  className={`flex-1 py-3 rounded-xl border flex justify-center items-center gap-1.5 text-xs font-semibold group shadow-sm transition-all ${
                    unread > 0 
                      ? 'border-crm-border hover:bg-crm-primary/10 hover:border-crm-primary/40 text-crm-textMuted hover:text-crm-primary cursor-pointer' 
                      : 'border-transparent bg-crm-darker/50 text-crm-textMuted/40 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 size={14} className={unread > 0 ? "group-hover:text-crm-primary" : "opacity-50"} />
                  <span>{unread > 0 ? "Mark all read" : "Caught up"}</span>
                </button>

                <button 
                  type="button"
                  disabled={items.length === 0}
                  onClick={(e) => { e.stopPropagation(); clearAll(); }} 
                  className={`flex-1 py-3 rounded-xl border flex justify-center items-center gap-1.5 text-xs font-semibold group shadow-sm transition-all ${
                    items.length > 0 
                      ? 'border-crm-border hover:bg-rose-500/10 hover:border-rose-500/40 text-crm-textMuted hover:text-rose-500 cursor-pointer' 
                      : 'border-transparent bg-crm-darker/50 text-crm-textMuted/40 cursor-not-allowed'
                  }`}
                >
                  <Trash2 size={14} className={items.length > 0 ? "group-hover:text-rose-500" : "opacity-50"} />
                  <span>Clear all</span>
                </button>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
