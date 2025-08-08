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

// Update user profile
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
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('organization')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Organization name cannot be empty'),
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

    const { firstName, lastName, phone, organization, address, preferences } = req.body;

    // Update profile fields
    if (firstName) req.user.profile.firstName = firstName;
    if (lastName) req.user.profile.lastName = lastName;
    if (phone) req.user.profile.phone = phone;
    if (organization) req.user.profile.organization = organization;
    if (address) req.user.profile.address = { ...req.user.profile.address, ...address };
    if (preferences) req.user.preferences = { ...req.user.preferences, ...preferences };

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

// Get user's donations (for donors)
router.get('/donations', authenticateToken, async (req, res) => {
  try {
    const Donation = require('../models/Donation');
    const { page = 1, limit = 10, status } = req.query;

    const query = { donor: req.user._id };
    if (status) query.status = status;

    const donations = await Donation.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('claimedBy.recipient', 'profile.firstName profile.lastName profile.organization');

    const total = await Donation.countDocuments(query);

    res.json({
      donations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
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
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('donor', 'profile.firstName profile.lastName profile.organization');

    const total = await Donation.countDocuments(query);

    res.json({
      donations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
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