import React, { useContext, useEffect, useState, useRef } from 'react';
import { MessageSquare, AtSign, X } from 'lucide-react';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const NotificationPopup = () => {
  const { socket } = useContext(SocketContext);
  const { user, setActiveWorkspace } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location.pathname);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!socket) return;

    const showPopup = (data) => {
      const senderId = data.senderId || data.sender?._id;
      if (senderId?.toString() === user?._id?.toString()) return;

      const payload = data.payload || {};
      const currentPath = locationRef.current;
      const isDm = data.isDirectMessage || payload.isDirectMessage || data.type === 'dm';

      if (isDm && (currentPath === '/messages' || currentPath === '/dms')) return;

      if (!isDm && currentPath === '/channels') {
        const activeWs = localStorage.getItem('activeWorkspace');
        if (payload.workspaceId && activeWs === payload.workspaceId.toString()) return;
      }

      setNotification({ ...data, payload, isDirectMessage: isDm });
      setOpen(true);
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
      audio.play().catch(() => {});
    };

    socket.on('message_received', showPopup);
    socket.on('notification_received', showPopup);
    socket.on('announcement_received', (ann) => {
      const senderId = ann.senderId || ann.sender?._id;
      if (senderId?.toString() === user?._id?.toString()) return;
      setNotification({ ...ann, isAnnouncement: true });
      setOpen(true);
    });

    return () => {
      socket.off('message_received', showPopup);
      socket.off('notification_received', showPopup);
      socket.off('announcement_received');
    };
  }, [socket, user?._id]);

  const handleClose = () => setOpen(false);

  const handleClick = () => {
    const p = notification?.payload || {};
    if (p.workspaceId) setActiveWorkspace(p.workspaceId.toString());

    if (p.isLead || notification?.type === 'lead') {
      navigate('/leads');
    } else if (notification?.isAnnouncement) {
      navigate('/channels');
    } else if (notification?.isDirectMessage || p.isDirectMessage) {
      navigate('/messages', {
        state: { selectedUser: p.sender || notification.sender },
      });
    } else {
      navigate('/channels', {
        state: {
          workspaceId: p.workspaceId,
          activeChannelId: p.channelId || notification.channelId,
        },
      });
    }
    setOpen(false);
  };

  if (!open || !notification) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] max-w-sm animate-in slide-in-from-right">
      <button
        type="button"
        onClick={handleClick}
        className="w-full glass-panel border border-crm-primary/30 p-4 flex items-start gap-3 text-left hover:border-crm-primary/60 transition-colors shadow-glow"
      >
        <div className="w-10 h-10 rounded-xl bg-crm-primary/20 flex items-center justify-center shrink-0">
          {notification.type === 'mention' ? (
            <AtSign size={18} className="text-amber-400" />
          ) : (
            <MessageSquare size={18} className="text-crm-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{notification.sender?.name || 'New activity'}</p>
          <p className="text-[10px] text-crm-textMuted uppercase mt-0.5">
            {notification.isAnnouncement
              ? 'Announcement'
              : notification.isDirectMessage
                ? 'Direct message'
                : notification.type === 'mention'
                  ? 'Mention'
                  : 'Channel message'}
          </p>
          <p className="text-xs text-crm-text mt-1 line-clamp-2">
            {notification.isAnnouncement ? notification.title : notification.content}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="text-crm-textMuted hover:text-white p-1"
        >
          <X size={16} />
        </button>
      </button>
    </div>
  );
};

export default NotificationPopup;
