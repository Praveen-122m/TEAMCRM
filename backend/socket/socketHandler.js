const onlineUsers = new Map(); // userId -> socketId

const joinUserWorkspaces = (socket, userData) => {
  if (!userData?.workspaces || !Array.isArray(userData.workspaces)) return;
  userData.workspaces.forEach((wsId) => {
    const id = (wsId?._id || wsId).toString();
    socket.join(id);
    if (userData.role?.toLowerCase() === 'admin') {
      socket.join(`admin_${id}`);
    }
  });
};

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('[SOCKET] Connected:', socket.id);

    socket.on('setup', async (userData) => {
      if (socket.userId) {
        const userId = socket.userId;
        socket.join(userId);
        
        try {
          const User = require('../models/User');
          const user = await User.findByPk(userId);
          if (user) {
            const workspaces = await user.getWorkspaces({ attributes: ['_id'] });
            const secureUserData = { 
              workspaces: workspaces.map(w => w._id), 
              role: user.role 
            };
            joinUserWorkspaces(socket, secureUserData);
          }
        } catch (err) {
          console.error('[SOCKET_SETUP_ERR]', err);
        }

        onlineUsers.set(userId, socket.id);

        console.log('[SOCKET] User joined private room:', userId);
        socket.broadcast.emit('user_online', userId);
        socket.emit('get_online_users', Array.from(onlineUsers.keys()));
        socket.emit('connected');
      }
    });

    socket.on('join_workspace', async (workspaceId) => {
      if (!workspaceId || !socket.userId) return;
      try {
        const Workspace = require('../models/Workspace');
        const workspace = await Workspace.findByPk(workspaceId);
        if (workspace && await workspace.hasMember(socket.userId)) {
          socket.join(workspaceId.toString());
          console.log('[SOCKET] User joined workspace room:', workspaceId);
        }
      } catch (err) {
        console.error('[SOCKET_JOIN_WS_ERR]', err);
      }
    });

    socket.on('join_channel', async (channelId) => {
      if (!channelId || !socket.userId) return;
      try {
        const Channel = require('../models/Channel');
        const channel = await Channel.findByPk(channelId);
        if (channel && await channel.hasMember(socket.userId)) {
          socket.join(channelId.toString());
          console.log('[SOCKET] User joined channel:', channelId);
        }
      } catch (err) {
        console.error('[SOCKET_JOIN_CHANNEL_ERR]', err);
      }
    });

    socket.on('join_channels', async (channelIds) => {
      if (!Array.isArray(channelIds) || !socket.userId) return;
      try {
        const Channel = require('../models/Channel');
        for (const channelId of channelIds) {
          if (!channelId) continue;
          const channel = await Channel.findByPk(channelId);
          if (channel && await channel.hasMember(socket.userId)) {
            socket.join(channelId.toString());
          }
        }
        console.log('[SOCKET] User joined channels:', channelIds.length);
      } catch (err) {
        console.error('[SOCKET_JOIN_CHANNELS_ERR]', err);
      }
    });

    socket.on('leave_channel', (channelId) => {
      if (!channelId) return;
      socket.leave(channelId.toString());
    });

    socket.on('new_message', (newMessageReceived) => {
      const channelId =
        newMessageReceived.channelId ||
        newMessageReceived.channel?._id ||
        newMessageReceived.channel;
      const receiverId =
        newMessageReceived.receiverId ||
        newMessageReceived.receiver?._id ||
        newMessageReceived.receiver;
      const content = newMessageReceived.content || '';

      if (channelId) {
        io.to(channelId.toString()).emit('message_received', newMessageReceived);

        const mentionMatch = content.match(/@([\w\s]+?)(?=\s|$)/g);
        if (mentionMatch) {
          mentionMatch.forEach((mention) => {
            const mentionedName = mention.substring(1).trim();
            io.emit('mention_detected', {
              ...newMessageReceived,
              mentionedName,
            });
          });
        }
      } else if (receiverId) {
        const senderId =
          newMessageReceived.senderId ||
          newMessageReceived.sender?._id ||
          newMessageReceived.sender;
        io.to(receiverId.toString()).emit('message_received', newMessageReceived);
        if (senderId) {
          io.to(senderId.toString()).emit('message_received', newMessageReceived);
        }
      }
    });

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

    socket.on('typing', (room) => {
      if (!room) return;
      const roomId = (room?._id || room).toString();
      socket.to(roomId).emit('typing', roomId);
    });

    socket.on('stop_typing', (room) => {
      if (!room) return;
      const roomId = (room?._id || room).toString();
      socket.to(roomId).emit('stop_typing', roomId);
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
