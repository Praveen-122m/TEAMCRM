require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { configureCloudinary } = require('./config/cloudinary');
const socketHandler = require('./socket/socketHandler');

// Connect to Database
connectDB();

// Configure Cloudinary
configureCloudinary();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

const path = require('path');

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.IO
socketHandler(io);

// Routes
app.get('/', (req, res) => {
  res.send('Private Team Workspace API is running...');
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/workspaces', require('./routes/workspaceRoutes'));
app.use('/api/channels', require('./routes/channelRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/meetings', require('./routes/meetingRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));

// Error Handler Middleware
// app.use(require('./middleware/errorMiddleware').errorHandler);

const PORT = process.env.PORT || 5005;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
