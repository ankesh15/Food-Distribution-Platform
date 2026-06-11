const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

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

// Update user profile — accepts both flat and nested structures
router.put('/profile', [
  authenticateToken,
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name cannot be empty'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name cannot be empty'),
  body('phone')
    .optional(),
  body('organization')
    .optional()
    .trim(),
  body('preferences.emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be a boolean'),
  body('preferences.smsNotifications')
    .optional()
    .isBoolean()
    .withMessage('SMS notifications must be a boolean'),
  body('preferences.maxDistance')
    .optional()
    .isFloat({ min: 1, max: 100 })
    .withMessage('Max distance must be between 1 and 100 miles')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, phone, organization, address, preferences, profile } = req.body;

    // Support both flat fields and nested profile object from frontend
    const profileData = profile || {};
    const fn = firstName || profileData.firstName;
    const ln = lastName || profileData.lastName;
    const ph = phone || profileData.phone;
    const org = organization || profileData.organization;
    const addr = address || profileData.address;

    // Update profile fields
    if (fn) req.user.profile.firstName = fn;
    if (ln) req.user.profile.lastName = ln;
    if (ph !== undefined) req.user.profile.phone = ph;
    if (org !== undefined) req.user.profile.organization = org;
    if (addr !== undefined) req.user.profile.address = addr;
    if (preferences) {
      if (preferences.emailNotifications !== undefined) {
        req.user.preferences.emailNotifications = preferences.emailNotifications;
      }
      if (preferences.smsNotifications !== undefined) {
        req.user.preferences.smsNotifications = preferences.smsNotifications;
      }
      if (preferences.maxDistance !== undefined) {
        req.user.preferences.maxDistance = preferences.maxDistance;
      }
    }

    await req.user.save();

    res.json({
      message: 'Profile updated successfully',
      user: req.user.getPublicProfile()
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', [
  authenticateToken,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
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
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

// Get user's donations (for donors)
router.get('/donations', authenticateToken, async (req, res) => {
  try {
    const Donation = require('../models/Donation');
    const { page = 1, limit = 10, status } = req.query;

    const query = { donor: req.user._id };
    if (status) query.status = status;

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
router.get('/claimed-donations', authenticateToken, async (req, res) => {
  try {
    const Donation = require('../models/Donation');
    const { page = 1, limit = 10, status } = req.query;

    const query = { 'claimedBy.recipient': req.user._id };
    if (status) query.status = status;

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
        errors: errors.array()
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
router.get('/nearby-recipients', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 50 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const recipients = await User.find({
      role: 'recipient',
      isActive: true,
      'profile.location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseFloat(maxDistance) * 1609.34 // Convert miles to meters
        }
      }
    }).select('profile.firstName profile.lastName profile.organization profile.location');

    res.json({ recipients });

  } catch (error) {
    console.error('Get nearby recipients error:', error);
    res.status(500).json({ message: 'Failed to get nearby recipients' });
  }
});

module.exports = router;