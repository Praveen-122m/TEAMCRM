const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Setup user-specific room for DMs
    socket.on('setup', (userData) => {
      if (userData && userData._id) {
        socket.join(userData._id.toString());
        console.log('User joined private room:', userData._id);
        socket.emit('connected');
      }
    });

    // Join channel room
    socket.on('join_channel', (channelId) => {
      socket.join(channelId.toString());
      console.log('User joined channel room:', channelId);
    });

    // Leave channel room
    socket.on('leave_channel', (channelId) => {
      socket.leave(channelId.toString());
      console.log('User left channel room:', channelId);
    });

    // Global message handler (Handles both Channels and DMs)
    socket.on('new_message', (newMessageReceived) => {
      const channel = newMessageReceived.channel?.toString();
      const receiverId = (newMessageReceived.receiver?._id || newMessageReceived.receiver)?.toString();
      const senderId = (newMessageReceived.sender?._id || newMessageReceived.sender)?.toString();

      if (channel) {
        socket.in(channel).emit('message_received', newMessageReceived);
        console.log(`[REALTIME] Channel Message in ${channel}`);
      } else if (receiverId) {
        // WhatsApp Style: Send to both Sender's rooms and Receiver's rooms
        // This ensures all open windows for BOTH users update instantly
        io.to(receiverId).to(senderId).emit('message_received', newMessageReceived);
        console.log(`[REALTIME] DM from ${senderId} to ${receiverId}`);
      }
    });

    // Typing Indicators
    socket.on('typing', (data) => {
      const room = data.room || data;
      socket.in(room.toString()).emit('typing', data);
    });
    socket.on('stop_typing', (data) => {
      const room = data.room || data;
      socket.in(room.toString()).emit('stop_typing', data);
    });

    // --- CALL SIGNALING ---
    socket.on('call_request', (data) => {
      // data: { from: senderObj, toId: receiverId, roomId: string }
      io.to(data.toId).emit('incoming_call', {
        from: data.from,
        roomId: data.roomId
      });
      console.log(`[CALL] Request from ${data.from.name} to ${data.toId}`);
    });

    socket.on('call_accepted', (data) => {
      // data: { toId: callerId, roomId: string }
      io.to(data.toId).emit('call_joined', { roomId: data.roomId });
      console.log(`[CALL] Accepted by ${socket.id} for room ${data.roomId}`);
    });

    socket.on('call_rejected', (data) => {
      // data: { toId: callerId }
      io.to(data.toId).emit('call_busy');
      console.log(`[CALL] Rejected by ${socket.id}`);
    });

    // Deletion Handler
    socket.on('delete_message', (data) => {
      if (data.channelId) {
        socket.in(data.channelId.toString()).emit('message_deleted', data);
      } else if (data.receiverId) {
        io.to(data.receiverId.toString()).to(data.senderId.toString()).emit('message_deleted', data);
      }
    });

    socket.on('new_room_created', (data) => {
      socket.broadcast.emit('room_created', data);
      console.log(`[REALTIME] New Room Created: ${data.name}`);
    });
  });
};

module.exports = socketHandler;
