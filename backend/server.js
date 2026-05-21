require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectDB } = require('./config/db');
const socketHandler = require('./socket/socketHandler');

// ── Connect to Database ──
connectDB();

// ── Create HTTP Server ──
const server = http.createServer(app);

// ── Socket.IO Setup ──
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
});

// ── Initialize Socket Handler ──
socketHandler(io);
app.set('socketio', io);

// ── Start Server ──
const PORT = process.env.PORT || 5005;

server.listen(PORT, () => {
  console.log(`\n🚀 CRM Agency SaaS Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🔌 Socket.IO: ws://localhost:${PORT}`);
  console.log(`📂 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
