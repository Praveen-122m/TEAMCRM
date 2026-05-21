import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({}); // { id: { count, name, profileImage, lastMessage, type } }
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && user._id) {
      const newSocket = io(import.meta.env.VITE_API_URL || "http://localhost:5005", {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      });
      
      newSocket.on('connect', () => {
        console.log('[SOCKET] Connected to server');
        setIsConnected(true);
        newSocket.emit('setup', user);
      });

      newSocket.on('connected', () => {
        console.log('[SOCKET] Setup complete');
      });

      // Handle DMs and general messages
      newSocket.on('message_received', (msg) => {
        const myId = user._id.toString();
        const senderId = (msg.sender?._id || msg.sender).toString();

        if (msg.isDirectMessage && senderId !== myId) {
          setUnreadCounts(prev => {
            const current = prev[senderId] || { count: 0, name: '', profileImage: '', lastMessage: '', type: 'dm' };
            return {
              ...prev,
              [senderId]: {
                count: current.count + 1,
                name: msg.sender?.name || 'Teammate',
                profileImage: msg.sender?.profileImage || '',
                lastMessage: msg.content,
                type: 'dm'
              }
            };
          });
          playNotificationSound();
        }
      });

      // Handle Global Mentions
      newSocket.on('mention_detected', (data) => {
        const myId = user._id.toString();
        const senderId = (data.sender?._id || data.sender).toString();

        // Check if I am the one mentioned (Case-insensitive match)
        const myName = user.name?.toLowerCase().trim();
        const mentioned = data.mentionedName?.toLowerCase().trim();

        if (mentioned === myName && senderId !== myId) {
          const channelId = (data.channelId || data.channel?._id || data.channel).toString();
          setUnreadCounts(prev => {
            const current = prev[channelId] || { count: 0, name: '', profileImage: '', lastMessage: '', type: 'mention' };
            return {
              ...prev,
              [channelId]: {
                count: current.count + 1,
                name: `Mention in Channel`,
                profileImage: data.sender?.profileImage || '',
                lastMessage: `${data.sender?.name}: ${data.content}`,
                type: 'mention',
                channelId: channelId
              }
            };
          });
          playNotificationSound();
        }
      });

      // Handle Workspace Announcements
      newSocket.on('announcement_received', (data) => {
        const myId = user._id.toString();
        const senderId = (data.sender?._id || data.sender).toString();

        if (senderId !== myId) {
          setUnreadCounts(prev => {
            const current = prev['announcements'] || { count: 0, name: '', profileImage: '', lastMessage: '', type: 'announcement' };
            return {
              ...prev,
              ['announcements']: {
                count: current.count + 1,
                name: `Workspace Announcement`,
                profileImage: data.sender?.profileImage || '',
                lastMessage: data.title,
                type: 'announcement'
              }
            };
          });
          playNotificationSound();
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.off('connect');
        newSocket.off('message_received');
        newSocket.off('mention_detected');
        newSocket.off('announcement_received');
        newSocket.disconnect();
      };
    }
  }, [user?._id, user?.name]);

  const playNotificationSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    audio.play().catch(() => {});
  };

  const clearUnread = (id) => {
    setUnreadCounts(prev => {
      const newState = { ...prev };
      if (newState[id]) {
        newState[id] = { ...newState[id], count: 0 };
      }
      return newState;
    });
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b.count, 0);

  return (
    <SocketContext.Provider value={{ socket, isConnected, unreadCounts, clearUnread, totalUnread }}>
      {children}
    </SocketContext.Provider>
  );
};
