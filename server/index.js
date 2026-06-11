const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const mongoSanitize = require('express-mongo-sanitize');

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const server = http.createServer(app);

// Parse allowed origins from environment variable (supports comma-separated list)
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ["http://localhost:3000"];

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Rate limiting — relaxed for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100,
  message: { message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Sanitize data against NoSQL injection
app.use(mongoSanitize());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection (Mongoose 7+ does not need deprecated options)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/donations', require('./routes/donations'));
app.use('/api/admin', require('./routes/admin'));

// Public stats endpoint (for home page counters)
app.get('/api/stats/public', async (req, res) => {
  try {
    const User = require('./models/User');
    const Donation = require('./models/Donation');
    const [totalDonors, totalRecipients, totalDonations, completedDonations] = await Promise.all([
      User.countDocuments({ role: 'donor', isActive: true }),
      User.countDocuments({ role: 'recipient', isActive: true }),
      Donation.countDocuments(),
      Donation.countDocuments({ status: 'completed' })
    ]);
    const successRate = totalDonations > 0 ? Math.round((completedDonations / totalDonations) * 100) : 0;
    res.json({ totalDonors, totalRecipients, totalDonations, completedDonations, successRate });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get stats' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV}`);
});

// Export app for testing
module.exports = app;