require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectDB } = require('./config/db');
const socketHandler = require('./socket/socketHandler');
const jwt = require('jsonwebtoken');

// ── Connect to Database & Schedule Sync ──
connectDB().then(() => {
  try {
    const { initCronJobs } = require('./services/cronService');
    initCronJobs();
  } catch (err) {
    console.error('Failed to initialize scheduling service:', err.message);
  }
});

// ── Create HTTP Server ──
const server = http.createServer(app);

// ── Socket.IO Setup ──
const io = new Server(server, {
  path: '/api/socket.io',
  cors: {
    origin: (origin, callback) => callback(null, origin || true),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
});

// ── Socket.IO Authentication Middleware ──
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id; // Attach decoded user ID securely
    socket.role = decoded.role;
    socket.workspaceId = decoded.workspaceId;
    next();
  } catch (err) {
    console.error('[SOCKET_AUTH_ERR]', err.message);
    next(new Error('Authentication error: Invalid token'));
  }
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
