const onlineUsers = new Map(); // userId -> socketId

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('[SOCKET] Connected:', socket.id);

    // Setup user-specific room for DMs and Call Notifications
    socket.on('setup', (userData) => {
      if (userData && userData._id) {
        const userId = userData._id.toString();
        socket.join(userId);
        
        // Join workspace rooms for announcements
        if (userData.workspaces && Array.isArray(userData.workspaces)) {
          userData.workspaces.forEach(wsId => {
            socket.join(wsId.toString());
            if (userData.role?.toLowerCase() === 'admin') {
              socket.join(`admin_${wsId.toString()}`);
            }
          });
        }
        
        // Track online status
        onlineUsers.set(userId, socket.id);
        socket.userId = userId; 
        
        console.log('[SOCKET] User joined private room:', userId);
        socket.broadcast.emit('user_online', userId);
        socket.emit('get_online_users', Array.from(onlineUsers.keys()));
        socket.emit('connected');
      }
    });

    socket.on('join_channel', (channelId) => {
      if (!channelId) return;
      socket.join(channelId.toString());
      console.log('[SOCKET] User joined channel:', channelId);
    });

    socket.on('new_message', (newMessageReceived) => {
      const channelId = newMessageReceived.channelId || newMessageReceived.channel?._id || newMessageReceived.channel;
      const receiverId = newMessageReceived.receiverId || newMessageReceived.receiver?._id || newMessageReceived.receiver;
      const content = newMessageReceived.content || '';

      if (channelId) {
        // Broadcast to channel
        socket.in(channelId.toString()).emit('message_received', newMessageReceived);

        // --- SMART MENTION DETECTION ---
        // Check if anyone is mentioned using @Name pattern (supports multiple words)
        const mentionMatch = content.match(/@([\w\s]+?)(?=\s|$)/g);
        if (mentionMatch) {
          mentionMatch.forEach(mention => {
            const mentionedName = mention.substring(1).trim(); 
            // Broadcast to all clients; frontend will check if mentionedName matches user.name
            io.emit('mention_detected', {
                ...newMessageReceived,
                mentionedName: mentionedName
            });
          });
        }
      } else if (receiverId) {
        // Direct Message
        io.to(receiverId.toString()).emit('message_received', newMessageReceived);
      }
    });

    // Call Signaling
    socket.on('call_request', (data) => {
      if (!data.toId) return;
      io.to(data.toId.toString()).emit('incoming_call', { from: data.from, roomId: data.roomId });
    });

    socket.on('call_accepted', (data) => {
      if (!data.toId) return;
      io.to(data.toId.toString()).emit('call_joined', { roomId: data.roomId });
    });

    socket.on('call_rejected', (data) => {
      if (!data.toId) return;
      io.to(data.toId.toString()).emit('call_busy');
    });

    // Typing Indicators
    socket.on('typing', (room) => {
      if (!room) return;
      socket.in(room.toString()).emit('typing', room);
    });

    socket.on('stop_typing', (room) => {
      if (!room) return;
      socket.in(room.toString()).emit('stop_typing', room);
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit('user_offline', socket.userId);
      }
    });
  });
};

module.exports = socketHandler;
