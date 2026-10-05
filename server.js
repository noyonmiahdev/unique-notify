/**
 * Unique-Notify
 * WhatsApp Multi-Gateway Notification & Marketing Hub
 * (Meta WhatsApp Cloud API Official + Baileys Multi-Device QR Gateway)
 */

require('dotenv').config();
const fs = require('fs');
const http = require('http');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { initDatabase } = require('./src/config/database');
const qrGateway = require('./src/services/qrGateway');
const broadcastWorker = require('./src/services/broadcastWorker');
const smsQueueEngine = require('./src/services/smsQueueEngine');

// Middlewares
const apiKeyAuth = require('./src/middlewares/apiKeyAuth');
const { apiLimiter } = require('./src/middlewares/rateLimiter');

// Routes
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const userRoutes = require('./src/routes/userRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const apiKeyRoutes = require('./src/routes/apiKeyRoutes');
const otpRoutes = require('./src/routes/api/v1/otpRoutes');
const messageRoutes = require('./src/routes/api/v1/messageRoutes');
const broadcastRoutes = require('./src/routes/api/v1/broadcastRoutes');
const deviceRoutes = require('./src/routes/api/v1/deviceRoutes');
const templateRoutes = require('./src/routes/api/v1/templateRoutes');
const webhookRoutes = require('./src/routes/api/v1/webhookRoutes');
const billingRoutes = require('./src/routes/billingRoutes');
const smsRoutes = require('./src/routes/api/v1/smsRoutes');

const app = express();
const server = http.createServer(app);

// Socket.io for Real-time Dashboard Events (QR Code, Campaign Progress, Statuses, SMS Device Heartbeats)
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

qrGateway.registerSocketEmitter(io);
broadcastWorker.registerSocketEmitter(io);
smsQueueEngine.registerSocketEmitter(io);

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  
  // Immediately send current QR state if available
  const qrInfo = qrGateway.getSessionInfo('primary_qr_session');
  socket.emit('session_status', qrInfo);
  if (qrInfo.qr) {
    socket.emit('session_qr', qrInfo);
  }

  socket.on('disconnect', () => {
    // Client disconnected
  });
});

// App Middlewares
app.use(cors({ origin: '*' }));
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts and assets for dashboard
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('short'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static Assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'storage/uploads')));

// 1. Webhook Route (Meta Cloud API callbacks - Public)
app.use('/api/v1/webhook', webhookRoutes);

// 2. Auth & Admin Management Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', settingsRoutes);
app.use('/api', billingRoutes);
app.use('/api/v1/api-keys', apiKeyRoutes);
app.use('/api/user', userRoutes);

// 3. API v1 Core Message & Automation Endpoints (Protected by Rate Limiter & API Key for integrations)
const flexibleAuth = (req, res, next) => {
  const hasApiKey = req.headers['x-api-key'] || req.query.api_key || req.headers['authorization'];
  if (hasApiKey) {
    return apiKeyAuth(req, res, next);
  }
  // Allow local dashboard calls
  next();
};

app.use('/api/v1', apiLimiter);
app.use('/api/v1/otp', flexibleAuth, otpRoutes);
app.use('/api/v1/messages', flexibleAuth, messageRoutes);
app.use('/api/v1/broadcasts', flexibleAuth, broadcastRoutes);
app.use('/api/v1/devices', flexibleAuth, deviceRoutes);
app.use('/api/v1/templates', flexibleAuth, templateRoutes);
app.use('/api/v1/sms', flexibleAuth, smsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Unique-Notify Hub'
  });
});

// Dedicated Public Documentation Portal
app.use('/docs', (req, res) => {
  const phpPath = path.join(__dirname, 'public', 'docs', 'index.php');
  const htmlPath = path.join(__dirname, 'public', 'docs', 'index.html');
  if (fs.existsSync(phpPath)) return res.sendFile(phpPath);
  res.sendFile(htmlPath);
});

// Dedicated Separate Super Admin Portal
app.use('/admin', (req, res) => {
  const phpPath = path.join(__dirname, 'public', 'admin', 'index.php');
  const htmlPath = path.join(__dirname, 'public', 'admin', 'index.html');
  if (fs.existsSync(phpPath)) return res.sendFile(phpPath);
  res.sendFile(htmlPath);
});

// Dedicated Client User Dashboard & Login routes
app.get(['/login', '/register', '/dashboard', '/app'], (req, res) => {
  const phpPath = path.join(__dirname, 'public', 'index.php');
  const htmlPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(phpPath)) return res.sendFile(phpPath);
  res.sendFile(htmlPath);
});

// Catch-all fallback route to serve Single Page Application
app.use((req, res, next) => {
  // If request is for an API route that was not found, return 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API Route Not Found' });
  }
  const phpPath = path.join(__dirname, 'public', 'index.php');
  res.sendFile(phpPath);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Boot Server
async function startServer() {
  try {
    // 1. Initialize Database
    await initDatabase();

    // 2. Start HTTP & WebSocket Server
    server.listen(PORT, HOST, () => {
      console.log(`=======================================================`);
      console.log(`  [System] Unique-Notify WhatsApp Automation Hub is ONLINE`);
      console.log(`  [Client Portal] http://localhost:${PORT}               `);
      console.log(`  [Admin Portal]  http://localhost:${PORT}/admin         `);
      console.log(`  [Public Docs]   http://localhost:${PORT}/docs          `);
      console.log(`  [API Base]      http://localhost:${PORT}/api/v1/       `);
      console.log(`=======================================================`);
    });

    // 3. Restore QR session in background ONLY if previously authenticated credentials exist
    setTimeout(() => {
      if (qrGateway.hasSavedCredentials('primary_qr_session')) {
        console.log('[QR Gateway] Found saved active credentials. Restoring session...');
        qrGateway.initSession('primary_qr_session').catch(err => {
          console.log('[QR Gateway] Background restore error:', err.message);
        });
      } else {
        console.log('[QR Gateway] Standby mode: No active QR session. Ready to link on user request.');
      }
    }, 1500);

  } catch (err) {
    console.error('[Fatal] Server failed to start:', err);
    process.exit(1);
  }
}

startServer();
