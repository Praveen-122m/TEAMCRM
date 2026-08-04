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
            user.isOnline = true;
            await user.save();
            const workspaces = await user.getWorkspaces({ attributes: ['_id'] });
            const secureUserData = { 
              workspaces: workspaces.map(w => w._id), 
              role: user.role 
            };
            joinUserWorkspaces(socket, secureUserData);
          } else {
            const SaaSClient = require('../models/SaaSClient');
            const saasClient = await SaaSClient.findByPk(userId);
            if (saasClient) {
              const secureUserData = {
                workspaces: saasClient.workspace_id ? [saasClient.workspace_id] : [],
                role: 'Client'
              };
              joinUserWorkspaces(socket, secureUserData);
            }
          }
        } catch (err) {
          console.error('[SOCKET_SETUP_ERR]', err);
        }

        // Handle multiple sockets (tabs) per user
        if (!onlineUsers.has(userId)) {
          onlineUsers.set(userId, new Set([socket.id]));
        } else {
          onlineUsers.get(userId).add(socket.id);
        }

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
        
        let isWorkspaceMember = false;
        if (workspace) {
          const SaaSClient = require('../models/SaaSClient');
          const saasClient = await SaaSClient.findOne({
            where: { id: socket.userId, workspace_id: workspace._id }
          });
          if (saasClient) {
            isWorkspaceMember = true;
          } else {
            isWorkspaceMember = await workspace.hasMember(socket.userId);
          }
        }

        if (isWorkspaceMember) {
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
        if (channel) {
          let isAllowed = false;
          if (!channel.isPrivate) {
            const Workspace = require('../models/Workspace');
            const workspace = await Workspace.findByPk(channel.workspaceId);
            if (workspace) {
              const SaaSClient = require('../models/SaaSClient');
              const saasClient = await SaaSClient.findOne({
                where: { id: socket.userId, workspace_id: workspace._id }
              });
              if (saasClient) {
                isAllowed = true;
              } else {
                isAllowed = await workspace.hasMember(socket.userId);
              }
            }
          } else {
            isAllowed = await channel.hasMember(socket.userId);
          }
          if (isAllowed) {
            socket.join(channelId.toString());
            console.log('[SOCKET] User joined channel:', channelId);
          }
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
          if (channel) {
            let isAllowed = false;
            if (!channel.isPrivate) {
              const Workspace = require('../models/Workspace');
              const workspace = await Workspace.findByPk(channel.workspaceId);
              if (workspace) {
                const SaaSClient = require('../models/SaaSClient');
                const saasClient = await SaaSClient.findOne({
                  where: { id: socket.userId, workspace_id: workspace._id }
                });
                if (saasClient) {
                  isAllowed = true;
                } else {
                  isAllowed = await workspace.hasMember(socket.userId);
                }
              }
            } else {
              isAllowed = await channel.hasMember(socket.userId);
            }
            if (isAllowed) {
              socket.join(channelId.toString());
            }
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
          const User = require('../models/User');
          const SaaSClient = require('../models/SaaSClient');
          mentionMatch.forEach(async (mention) => {
            try {
              const mentionedName = mention.substring(1).trim();
              let user = await User.findOne({ where: { name: mentionedName } });
              let targetUserId = user?._id || user?.id;

              if (!user) {
                const saasClient = await SaaSClient.findOne({ where: { client_name: mentionedName } });
                targetUserId = saasClient?.id;
              }

              if (targetUserId) {
                io.to(targetUserId.toString()).emit('mention_detected', {
                  ...newMessageReceived,
                  mentionedName,
                });
                console.log(`[SOCKET] Mention routed privately to user: ${targetUserId}`);
              }
            } catch (err) {
              console.error('[SOCKET_MENTION_ERR]', err);
            }
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

    socket.on('disconnect', async () => {
      if (socket.userId) {
        const userId = socket.userId;
        const userSockets = onlineUsers.get(userId);
        
        if (userSockets) {
          userSockets.delete(socket.id);
          
          if (userSockets.size === 0) {
            onlineUsers.delete(userId);
            io.emit('user_offline', userId);
            try {
              const User = require('../models/User');
              const user = await User.findByPk(userId);
              if (user) {
                user.isOnline = false;
                await user.save();
              }
            } catch (err) {
              console.error('[SOCKET_DISCONNECT_ERR]', err);
            }
          }
        }
      }
    });
  });
};

module.exports = socketHandler;
