require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

const app = express();

// ── Security Middleware ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// ── CORS Configuration ──
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ── Request Logging ──
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ── Body Parsing ──
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// ── Serve Static Uploads ──
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/members', require('./routes/memberRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/leads', require('./routes/leadRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// ── Error Handler ──
app.use(require('./middleware/errorMiddleware'));

module.exports = app;
