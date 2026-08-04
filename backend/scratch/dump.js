const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/teamcrm', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  const db = mongoose.connection.db;
  const messages = await db.collection('messages').find().sort({ createdAt: 1 }).toArray();
  console.log(JSON.stringify(messages.map(m => ({
    content: m.content,
    createdAt: m.createdAt,
    senderId: m.senderId,
    workspaceId: m.workspaceId,
    channelId: m.channelId
  })), null, 2));
  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
