import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import toast from 'react-hot-toast';

export const SocketContext = createContext();

const getSocketUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://teamcrmbackend.onrender.com';
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
};

const normalizeWorkspaces = (workspaces = []) =>
  workspaces.map((w) => (typeof w === 'object' && w?._id ? w._id : w).toString());

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user, activeWorkspace, refreshUser, setActiveWorkspace } = useContext(AuthContext);

  const playNotificationSound = useCallback(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    audio.play().catch(() => {});
  }, []);

  const setupSocketUser = useCallback(
    (sock) => {
      if (!user?._id) return;
      sock.emit('setup', {
        _id: user._id,
        name: user.name,
        role: user.role,
        workspaces: normalizeWorkspaces(user.workspaces || []),
      });
      if (activeWorkspace) {
        sock.emit('join_workspace', activeWorkspace);
      }
    },
    [user, activeWorkspace]
  );

  useEffect(() => {
    if (!user?._id) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const token = sessionStorage.getItem('token');
    const newSocket = io(getSocketUrl(), {
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      withCredentials: true,
      auth: {
        token: token,
      },
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setupSocketUser(newSocket);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connected', () => {
      console.log('[SOCKET] Setup complete');
    });

    newSocket.on('get_online_users', (users) => {
      setOnlineUsers(users || []);
    });

    newSocket.on('user_online', (userId) => {
      setOnlineUsers((prev) => {
        if (prev.includes(userId)) return prev;
        return [...prev, userId];
      });
    });

    newSocket.on('user_offline', (userId) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    newSocket.on('message_received', (msg) => {
      const myId = user._id.toString();
      const senderId = (msg.sender?._id || msg.sender || msg.senderId || '').toString();

      if (!msg.isDirectMessage && senderId && senderId !== myId) {
        const channelId = (msg.channelId || msg.channel?._id || msg.channel || 'channel').toString();
        setUnreadCounts((prev) => {
          const current = prev[channelId] || { count: 0, name: '', lastMessage: '', type: 'channel' };
          return {
            ...prev,
            [channelId]: {
              count: current.count + 1,
              name: 'Channel message',
              profileImage: msg.sender?.profileImage || '',
              lastMessage: msg.content,
              type: 'channel',
              channelId,
            },
          };
        });
        playNotificationSound();
      }

      if (msg.isDirectMessage && senderId && senderId !== myId) {
        setUnreadCounts((prev) => {
          const current = prev[senderId] || { count: 0, name: '', profileImage: '', lastMessage: '', type: 'dm' };
          return {
            ...prev,
            [senderId]: {
              count: current.count + 1,
              name: msg.sender?.name || 'Teammate',
              profileImage: msg.sender?.profileImage || '',
              lastMessage: msg.content,
              type: 'dm',
            },
          };
        });
        playNotificationSound();
      }
    });

    newSocket.on('mention_detected', (data) => {
      const myId = user._id.toString();
      const senderId = (data.sender?._id || data.sender || '').toString();
      const myName = user.name?.toLowerCase().trim();
      const mentioned = data.mentionedName?.toLowerCase().trim();

      if (mentioned === myName && senderId !== myId) {
        const channelId = (data.channelId || data.channel?._id || data.channel || '').toString();
        setUnreadCounts((prev) => {
          const current = prev[channelId] || { count: 0, name: '', profileImage: '', lastMessage: '', type: 'mention' };
          return {
            ...prev,
            [channelId]: {
              count: current.count + 1,
              name: 'Mention in Channel',
              profileImage: data.sender?.profileImage || '',
              lastMessage: `${data.sender?.name}: ${data.content}`,
              type: 'mention',
              channelId,
            },
          };
        });
        playNotificationSound();
      }
    });

    newSocket.on('announcement_received', (data) => {
      const myId = user._id.toString();
      const senderId = (data.sender?._id || data.sender || '').toString();

      if (senderId !== myId) {
        setUnreadCounts((prev) => {
          const current = prev.announcements || { count: 0, name: '', profileImage: '', lastMessage: '', type: 'announcement' };
          return {
            ...prev,
            announcements: {
              count: current.count + 1,
              name: 'Workspace Announcement',
              profileImage: data.sender?.profileImage || '',
              lastMessage: data.title,
              type: 'announcement',
            },
          };
        });
        playNotificationSound();
      }
    });

    newSocket.on('workspace_removed', async (data) => {
      const removedWorkspaceId = data.workspaceId?.toString();
      const removedWorkspaceName = data.workspaceName;
      
      toast.error(`You have been removed from workspace: ${removedWorkspaceName || 'Workspace'}`);
      
      // Refresh the workspaces list in AuthContext
      const refreshRes = await refreshUser();
      
      // If the removed workspace was active, reset activeWorkspace
      if (activeWorkspace?.toString() === removedWorkspaceId) {
        if (refreshRes.success && refreshRes.data?.workspaces?.length > 0) {
          const firstWs = refreshRes.data.workspaces[0].toString();
          setActiveWorkspace(firstWs);
        } else {
          setActiveWorkspace(null);
          window.location.href = '/';
        }
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.removeAllListeners();
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers([]);
    };
  }, [user?._id, user?.name, user?.role, JSON.stringify(user?.workspaces), activeWorkspace, setupSocketUser, playNotificationSound]);

  useEffect(() => {
    if (socket?.connected && activeWorkspace) {
      socket.emit('join_workspace', activeWorkspace);
    }
  }, [socket, activeWorkspace]);

  const clearUnread = useCallback((id) => {
    setUnreadCounts((prev) => {
      if (!prev[id] || prev[id].count === 0) return prev;
      const newState = { ...prev };
      newState[id] = { ...newState[id], count: 0 };
      return newState;
    });
  }, []);

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + (b.count || 0), 0);

  return (
    <SocketContext.Provider value={{ socket, isConnected, unreadCounts, clearUnread, totalUnread, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
