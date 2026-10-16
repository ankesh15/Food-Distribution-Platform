const path = require('path');
if (process.env.NODE_ENV !== 'test') require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const mongoSanitize = require('express-mongo-sanitize');
const { resolveUser } = require('./middleware/auth');
const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map(url => url.trim()).filter(Boolean);
if (process.env.NODE_ENV === 'production' && (!process.env.CLIENT_URL || allowedOrigins.some(url => !url.startsWith('https://')))) throw new Error('CLIENT_URL must list explicit HTTPS production origins');
if (process.env.TRUST_PROXY_HOPS) {
  const hops = Number(process.env.TRUST_PROXY_HOPS);
  if (!Number.isInteger(hops) || hops < 1 || hops > 5) throw new Error('TRUST_PROXY_HOPS must be an integer from 1 to 5');
  app.set('trust proxy', hops);
}
const io = socketIo(server, { cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true }, maxHttpBufferSize: 16384 });
io.use(async (socket, next) => {
  try {
    socket.user = await resolveUser(socket.handshake.auth?.token);
    if (!socket.user) return next(new Error('Authentication required'));
    next();
  } catch (error) { next(new Error('Authentication required')); }
});
io.on('connection', socket => {
  socket.join(`user-${socket.user._id}`);
  socket.join(`role-${socket.user.role}`);
  // Expiring sockets must reconnect with a fresh access token.
  const decoded = require('jsonwebtoken').decode(socket.handshake.auth.token);
  const timer = setTimeout(() => socket.disconnect(true), Math.max(0, decoded.exp * 1000 - Date.now()));
  socket.on('disconnect', () => clearTimeout(timer));
});
app.set('io', io);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    connectSrc: ["'self'", ...allowedOrigins], objectSrc: ["'none'"], frameAncestors: ["'none'"]
  }
} }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: true, message: { message: 'Too many authentication attempts. Try again in 15 minutes.' } });
app.use(['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/users/password'], authLimiter);
app.use('/api/', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: process.env.NODE_ENV === 'production' ? 600 : 2000, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many requests. Please try again later.' } }));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(mongoSanitize());
app.use('/uploads', helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }), express.static((process.env.UPLOAD_DIR || path.join(__dirname, 'uploads')), { dotfiles: 'deny', maxAge: '1d', index: false, setHeaders(res) { res.setHeader('Content-Security-Policy', "default-src 'none'"); } }));
app.use('/uploads', (req, res) => res.status(404).json({ message: 'Image not found' }));
app.get('/api/health', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'OK' : 'degraded', database: ready ? 'connected' : 'unavailable', timestamp: new Date().toISOString() });
});
app.get('/api/live', (req, res) => res.json({ status: 'OK' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/donations', require('./routes/donations'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/requests', require('./routes/requests'));
app.get('/api/stats/public', async (req, res, next) => {
  try {
    const User = require('./models/User');
    const Donation = require('./models/Donation');
    const [totalDonors, totalRecipients, totalDonations, completedDonations] = await Promise.all([
      User.countDocuments({ role: 'donor', isActive: true }), User.countDocuments({ role: 'recipient', isActive: true }), Donation.countDocuments(), Donation.countDocuments({ status: 'completed' })
    ]);
    res.json({ totalDonors, totalRecipients, totalDonations, completedDonations, successRate: totalDonations ? Math.round(completedDonations / totalDonations * 100) : 0 });
  } catch (error) { next(error); }
});
app.use('/api', (req, res) => res.status(404).json({ message: 'Route not found' }));
if (process.env.NODE_ENV === 'production') {
  const build = path.join(__dirname, '..', 'client', 'build');
  app.use(express.static(build, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => res.sendFile(path.join(build, 'index.html'), { headers: { 'Cache-Control': 'no-cache' } }, error => error && next(error)));
}
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.name === 'CastError' || err.name === 'ValidationError') return res.status(400).json({ message: 'Invalid input' });
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error('Request failed:', err.name);
  res.status(status).json({ message: status === 500 ? 'Something went wrong. Please try again.' : (status === 413 ? 'Request is too large' : 'Invalid request') });
});
async function start() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  server.listen(process.env.PORT || 5000, () => console.log('FoodShare server started'));
}
async function shutdown() {
  await new Promise(resolve => io.close(resolve));
  await require('./services/backgroundJobs').drain();
  await mongoose.disconnect();
}
if (require.main === module) {
  start().catch(error => { console.error('Startup failed:', error.name); process.exitCode = 1; });
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    const timer = setTimeout(() => process.exit(1), 10000); timer.unref();
    shutdown().then(() => process.exit(0));
  });
}
module.exports = app;
module.exports.server = server;
module.exports.start = start;
module.exports.shutdown = shutdown;
