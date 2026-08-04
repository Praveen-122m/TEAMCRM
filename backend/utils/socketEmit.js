/** Broadcast a channel message to everyone in the channel room (all tabs/devices). */
const emitChannelMessage = (io, message) => {
  if (!io || !message) return;
  const channelId = message.channelId || message.channel?._id || message.channel;
  if (!channelId) return;
  io.to(channelId.toString()).emit('message_received', message);
};

/** Broadcast a direct message to sender and receiver private rooms. */
const emitDirectMessage = (io, message) => {
  if (!io || !message) return;
  const receiverId = message.receiverId || message.receiver?._id || message.receiver;
  const senderId = message.senderId || message.sender?._id || message.sender;
  if (receiverId) io.to(receiverId.toString()).emit('message_received', message);
  if (senderId) io.to(senderId.toString()).emit('message_received', message);
};

module.exports = { emitChannelMessage, emitDirectMessage };
