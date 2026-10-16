const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, requireDonor } = require('../middleware/auth');

const { listValidation, applyStatus, validate, handleError } = require('../middleware/validation');
const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: req.user.getPublicProfile()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

// Normalize the two existing client contracts before applying the same validation.
router.put('/profile', authenticateToken, (req, res, next) => {
  const profile = req.body.profile;
  if (profile !== undefined && (!profile || typeof profile !== 'object' || Array.isArray(profile))) return res.status(400).json({ message: 'Invalid profile' });
  for (const key of ['firstName', 'lastName', 'phone', 'organization', 'address']) {
    if (req.body[key] === undefined && profile?.[key] !== undefined) req.body[key] = profile[key];
  }
  next();
}, [
  ...['firstName', 'lastName'].map(key => body(key).optional().isString().trim().isLength({ min: 1, max: 100 })),
  ...['organization', 'address'].map(key => body(key).optional().isString().trim().isLength({ max: 200 })),
  body('phone').optional().isString().matches(/^(|[+]?[1-9][\d]{0,15})$/),
  body('preferences').optional().isObject(),
  body('preferences.emailNotifications').optional().isBoolean({ strict: true }),
  body('preferences.smsNotifications').optional().isBoolean({ strict: true }),
  body('preferences.maxDistance').optional().isFloat({ min: 1, max: 100 }), validate
], async (req, res) => {
  try {
    for (const key of ['firstName', 'lastName', 'phone', 'organization', 'address']) if (req.body[key] !== undefined) req.user.profile[key] = req.body[key];
    for (const key of ['emailNotifications', 'smsNotifications', 'maxDistance']) if (req.body.preferences?.[key] !== undefined) req.user.preferences[key] = req.body.preferences[key];
    await req.user.save();
    res.json({ message: 'Profile updated successfully', user: req.user.getPublicProfile() });
  } catch (error) { handleError(res, error, 'Failed to update profile'); }
});

// Change password
router.put('/password', [
  authenticateToken,
  body('currentPassword')
    .isString().isLength({ min: 1, max: 72 })
    .withMessage('Current password is required'),
  body('newPassword')
    .isString().isLength({ min: 8, max: 72 }).custom(value => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('New password must be 8 to 72 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array().map(({ value, ...error }) => error)
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Need to re-fetch user WITH password field
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.refreshToken = null;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    req.app.get('io')?.in(`user-${user._id}`).disconnectSockets(true);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

// Get user's donations (for donors)
router.get('/donations', authenticateToken, listValidation, async (req, res) => {
  try {
    const Donation = require('../models/Donation');
    const { page = 1, limit = 10, status } = req.query;

    const query = { donor: req.user._id };
    applyStatus(query, status);

    const donations = await Donation.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('claimedBy.recipient', 'profile.firstName profile.lastName profile.organization');

    const total = await Donation.countDocuments(query);

    res.json({
      donations,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('Get user donations error:', error);
    res.status(500).json({ message: 'Failed to get donations' });
  }
});

// Get user's claimed donations (for recipients)
router.get('/claimed-donations', authenticateToken, listValidation, async (req, res) => {
  try {
    const Donation = require('../models/Donation');
    const { page = 1, limit = 10, status } = req.query;

    const query = { 'claimedBy.recipient': req.user._id };
    applyStatus(query, status);

    const donations = await Donation.find(query)
      .sort({ 'claimedBy.claimedAt': -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('donor', 'profile.firstName profile.lastName profile.organization');

    const total = await Donation.countDocuments(query);

    res.json({
      donations,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('Get claimed donations error:', error);
    res.status(500).json({ message: 'Failed to get claimed donations' });
  }
});

// Counts and trends cover all matching records, independently of the list page size.
router.get('/summary', authenticateToken, async (req, res, next) => {
  try {
    const Donation = require('../models/Donation');
    const match = req.user.role === 'recipient' ? { 'claimedBy.recipient': req.user._id } : req.user.role === 'admin' ? {} : { donor: req.user._id };
    const now = new Date();
    const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const [states, monthly, quantities] = await Promise.all([
      Donation.aggregate([{ $match: match }, { $group: { _id: { $cond: [{ $and: [{ $eq: ['$status', 'available'] }, { $or: [{ $lte: ['$expiryDate', now] }, { $lte: ['$pickupWindow.endTime', now] }] }] }, 'expired', '$status'] }, count: { $sum: 1 } } }]),
      Donation.aggregate([{ $match: { ...match, createdAt: { $gte: sixMonthsAgo } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } }, { $sort: { _id: 1 } }]),
      Donation.aggregate([{ $match: { ...match, status: 'completed' } }, { $group: { _id: '$quantity.unit', amount: { $sum: '$quantity.amount' } } }])
    ]);
    res.json({ states: Object.fromEntries(states.map(row => [row._id, row.count])), monthly, quantities, scope: req.user.role === 'admin' ? 'platform' : 'your account' });
  } catch (error) { next(error); }
});
router.get('/pickups', authenticateToken, listValidation, async (req, res, next) => {
  try {
    const Donation = require('../models/Donation');
    const { page = 1, limit = 20 } = req.query;
    const scope = req.user.role === 'admin' ? {} : { $or: [{ donor: req.user._id }, { 'claimedBy.recipient': req.user._id }] };
    const query = { ...scope, status: { $in: ['claimed', 'picked-up'] } };
    const [donations, total] = await Promise.all([
      Donation.find(query).sort({ 'pickupWindow.startTime': 1 }).skip((page - 1) * limit).limit(Number(limit)).populate('donor claimedBy.recipient', 'profile.firstName profile.lastName profile.organization'),
      Donation.countDocuments(query)
    ]);
    res.json({ donations, total, totalPages: Math.ceil(total / limit), currentPage: Number(page) });
  } catch (error) { next(error); }
});

// Update user location
router.put('/location', [
  authenticateToken,
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array().map(({ value, ...error }) => error)
      });
    }

    const { latitude, longitude } = req.body;

    req.user.profile.location.coordinates = [longitude, latitude];
    await req.user.save();

    res.json({
      message: 'Location updated successfully',
      location: req.user.profile.location
    });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Failed to update location' });
  }
});

// Get nearby recipients (for donors)
router.get('/nearby-recipients', authenticateToken, requireDonor, listValidation, async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 50 } = req.query;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const recipients = await User.find({
      role: 'recipient',
      isActive: true,
      'profile.location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseFloat(maxDistance) * 1609.34 // Convert miles to meters
        }
      }
    }).select('profile.firstName profile.lastName profile.organization profile.location').limit(100);

    res.json({ recipients });

  } catch (error) {
    console.error('Get nearby recipients error:', error);
    res.status(500).json({ message: 'Failed to get nearby recipients' });
  }
});

module.exports = router;