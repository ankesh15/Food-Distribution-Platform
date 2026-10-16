const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, authenticateRefreshToken } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/emailService');
const { schedule } = require('../services/backgroundJobs');

const router = express.Router();

const { randomUUID } = require('crypto');
const { accessSecret, refreshSecret, tokenHash } = require('../config/security');
const generateTokens = user => ({
  accessToken: jwt.sign({ userId: user._id, version: user.tokenVersion || 0 }, accessSecret, { expiresIn: '15m', jwtid: randomUUID() }),
  refreshToken: jwt.sign({ userId: user._id, version: user.tokenVersion || 0 }, refreshSecret, { expiresIn: '7d', jwtid: randomUUID() })
});

// Register new user
router.post('/register', [
  body('email')
    .isString().isLength({ max: 254 }).isEmail()
    .trim().toLowerCase()
    .withMessage('Please provide a valid email'),
  body('password')
    .isString().isLength({ min: 8, max: 72 }).custom(value => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('Password must be 8 to 72 characters long'),
  body('firstName')
    .isString().trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required'),
  body('lastName')
    .isString().trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required'),
  body('role')
    .isIn(['donor', 'recipient'])
    .withMessage('Role must be either donor or recipient'),
  body('address').optional().isString().trim().isLength({ max: 200 }),
  body('phone')
    .optional({ values: 'falsy' })
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('organization')
    .optional({ values: 'falsy' })
    .isString().trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Organization name is required if provided')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array().map(({ value, ...error }) => error)
      });
    }

    const { email, password, firstName, lastName, role, phone, organization, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      role,
      profile: {
        firstName,
        lastName,
        phone,
        organization,
        address
      }
    });

    // Generate tokens and assign before save — single DB save (BUG-18)
    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = tokenHash(refreshToken);
    await user.save();

    schedule(() => sendWelcomeEmail(user.email, user.profile.firstName));

    res.status(201).json({
      message: 'User registered successfully',
      user: user.getPublicProfile(),
      accessToken,
      refreshToken
    });

  } catch (error) {
    // Handle concurrent registration duplicate key error (BUG-19)
    if (error.code === 11000) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login user
router.post('/login', [
  body('email')
    .isString().isLength({ max: 254 }).isEmail()
    .trim().toLowerCase()
    .withMessage('Please provide a valid email'),
  body('password')
    .isString().isLength({ min: 1, max: 72 })
    .withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array().map(({ value, ...error }) => error)
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Update user with refresh token and last login
    user.refreshToken = tokenHash(refreshToken);
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: 'Login successful',
      user: user.getPublicProfile(),
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Refresh access token
router.post('/refresh', authenticateRefreshToken, async (req, res) => {
  try {
    const { accessToken, refreshToken } = generateTokens(req.user);

    // Update user with new refresh token
    const rotated = await User.findOneAndUpdate(
      { _id: req.user._id, refreshToken: req.user.refreshToken, isActive: true, ...(req.user.tokenVersion ? { tokenVersion: req.user.tokenVersion } : { $or: [{ tokenVersion: 0 }, { tokenVersion: { $exists: false } }] }) },
      { $set: { refreshToken: tokenHash(refreshToken) } }, { new: true }
    );
    if (!rotated) return res.status(401).json({ message: 'Refresh token already used' });

    res.json({
      message: 'Token refreshed successfully',
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Token refresh failed' });
  }
});

// Logout user
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Clear refresh token
    await User.updateOne({ _id: req.user._id }, { $set: { refreshToken: null }, $inc: { tokenVersion: 1 } });
    req.app.get('io')?.in(`user-${req.user._id}`).disconnectSockets(true);

    res.json({ message: 'Logout successful' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: req.user.getPublicProfile()
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

// Verify token (for frontend token validation)
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    res.json({
      valid: true,
      user: req.user.getPublicProfile()
    });

  } catch (error) {
    res.status(401).json({
      valid: false,
      message: 'Invalid token'
    });
  }
});

module.exports = router; 