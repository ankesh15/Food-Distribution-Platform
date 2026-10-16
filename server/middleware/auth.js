const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { accessSecret, refreshSecret, matchesRefresh } = require('../config/security');

async function resolveUser(token) {
  const decoded = jwt.verify(token, accessSecret, { algorithms: ['HS256'] });
  if (!/^[a-f\d]{24}$/i.test(decoded.userId || '')) return null;
  const user = await User.findById(decoded.userId).select('-password -refreshToken');
  if (!user || !user.isActive || (decoded.version || 0) !== (user.tokenVersion || 0)) return null;
  return user;
}
const authenticateToken = async (req, res, next) => {
  try {
    const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || '');
    if (!match) return res.status(401).json({ message: 'Access token required' });
    req.user = await resolveUser(match[1]);
    if (!req.user) return res.status(401).json({ message: 'Session is no longer valid. Please sign in again.' });
    next();
  } catch (error) {
    if (['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'].includes(error.name)) return res.status(401).json({ message: 'Invalid or expired token' });
    next(error);
  }
};
const requireRole = roles => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Insufficient permissions' });
  next();
};
const authenticateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (typeof refreshToken !== 'string') return res.status(401).json({ message: 'Refresh token required' });
    const decoded = jwt.verify(refreshToken, refreshSecret, { algorithms: ['HS256'] });
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive || !matchesRefresh(user.refreshToken, refreshToken) || (decoded.version || 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    req.user = user;
    next();
  } catch (error) {
    if (['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError', 'CastError'].includes(error.name)) return res.status(401).json({ message: 'Invalid refresh token' });
    next(error);
  }
};
// A supplied expired token must trigger the client's refresh flow, rather than silently returning a guest view.
const optionalAuth = (req, res, next) => req.headers.authorization ? authenticateToken(req, res, next) : next();
module.exports = { resolveUser, authenticateToken, authenticateRefreshToken, optionalAuth, requireRole,
  requireAdmin: requireRole(['admin']), requireDonor: requireRole(['donor', 'admin']), requireRecipient: requireRole(['recipient', 'admin']) };
