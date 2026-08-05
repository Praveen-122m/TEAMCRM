require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

const app = express();

// ── Security Middleware ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
app.use(cookieParser());

// ── CORS Configuration ──
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server) or any frontend origin
    callback(null, origin || true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true
}));

// ── Request Logging ──
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// ── Body Parsing ──
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(require('./middleware/sanitizationMiddleware'));

// ── Serve Static Uploads (Secured & Isolated) ──
const { verifyToken } = require('./middleware/authMiddleware');
const fs = require('fs');
app.get(['/uploads/:filename', '/api/uploads/:filename'], verifyToken, async (req, res) => {
  try {
    const File = require('./models/File');
    const Message = require('./models/Message');
    const filename = req.params.filename;

    let fileRecord = await File.findOne({ where: { name: filename } });
    let workspaceId = fileRecord?.workspaceId;

    if (!workspaceId) {
      const messageRecord = await Message.findOne({
        where: {
          fileUrl: { [require('sequelize').Op.like]: `%${filename}` }
        }
      });
      workspaceId = messageRecord?.workspaceId;
    }

    if (workspaceId) {
      const userWorkspaces = (req.user.workspaces || []).map(id => id.toString());
      if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin' && !userWorkspaces.includes(workspaceId.toString())) {
        return res.status(403).json({ message: 'Access denied: You do not belong to this workspace.' });
      }
    }

    const filePath = path.join(__dirname, 'uploads', filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    console.error('[SECURE_SERVE_FILE_ERR]', error);
    res.status(500).json({ message: 'Internal server error serving file' });
  }
});

// ── Rate Limiting ──
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/', apiLimiter);

// ── API Routes ──
app.get('/', (req, res) => {
  res.json({ message: 'CRM + Meta Ads Agency SaaS API is running...', version: '2.0.0' });
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
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/meta-ads', require('./routes/metaAdsRoutes'));
app.use('/api/meta', require('./routes/metaHistoryRoutes'));
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/members', require('./routes/memberRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/leads', require('./routes/leadRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));


// ── Error Handler ──
app.use(require('./middleware/errorMiddleware'));

module.exports = app;
