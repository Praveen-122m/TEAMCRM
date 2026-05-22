import { useState, useEffect, useContext, useCallback } from 'react';
import { Bell, MessageSquare, AtSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../context/SocketContext';
import { useAuth } from '../hooks/useAuth';
import { notificationService } from '../services/notificationService';

const NotificationBell = () => {
  const { socket } = useContext(SocketContext) || {};
  const { setActiveWorkspace } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

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
    };
    socket.on('notification_received', onNew);
    return () => socket.off('notification_received', onNew);
  }, [socket]);

  const unread = items.filter((n) => !n.isRead).length;

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
      navigate('/leads');
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
    await notificationService.markAllRead();
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 text-crm-textMuted hover:text-white transition-colors"
        title="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 mt-2 w-80 max-h-[420px] overflow-hidden rounded-xl bg-crm-card border border-crm-border shadow-xl z-50 flex flex-col">
            <div className="px-4 py-3 border-b border-crm-border flex justify-between items-center">
              <span className="text-sm font-bold text-white">Notifications</span>
              {unread > 0 && (
                <button type="button" onClick={markAll} className="text-[10px] text-crm-primary font-semibold hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="overflow-y-auto custom-scrollbar flex-1">
              {loading ? (
                <p className="p-4 text-xs text-crm-textMuted text-center">Loading...</p>
              ) : items.length === 0 ? (
                <p className="p-6 text-xs text-crm-textMuted text-center">No notifications yet</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n._id}
                    type="button"
                    onClick={() => goTo(n)}
                    className={`w-full text-left px-4 py-3 border-b border-crm-border/50 hover:bg-crm-primary/10 transition-colors ${
                      !n.isRead ? 'bg-crm-primary/5' : ''
                    }`}
                  >
                    <div className="flex gap-2">
                      <div className="shrink-0 mt-0.5">
                        {n.type === 'mention' ? (
                          <AtSign size={14} className="text-amber-400" />
                        ) : (
                          <MessageSquare size={14} className="text-crm-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{n.sender?.name || 'System'}</p>
                        <p className="text-[11px] text-crm-textMuted line-clamp-2 mt-0.5">{n.content}</p>
                        <p className="text-[10px] text-crm-textMuted mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
