const express = require('express');
const { body, validationResult } = require('express-validator');
const Donation = require('../models/Donation');
const User = require('../models/User');
const { authenticateToken, requireDonor, requireRecipient } = require('../middleware/auth');
const { sendDonationNotification, sendClaimNotification } = require('../services/emailService');

const router = express.Router();

// Get all donations (with filters)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      foodType, 
      latitude, 
      longitude, 
      maxDistance = 50,
      isUrgent,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filter by status
    if (status) query.status = status;
    if (foodType) query.foodType = foodType;
    if (isUrgent !== undefined) query.isUrgent = isUrgent === 'true';

    // Geospatial query if coordinates provided
    if (latitude && longitude) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseFloat(maxDistance) * 1609.34 // Convert miles to meters
        }
      };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const donations = await Donation.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('donor', 'profile.firstName profile.lastName profile.organization')
      .populate('claimedBy.recipient', 'profile.firstName profile.lastName profile.organization');

    const total = await Donation.countDocuments(query);

    res.json({
      donations,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({ message: 'Failed to get donations' });
  }
});

// Get single donation
router.get('/:id', async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donor', 'profile.firstName profile.lastName profile.organization profile.phone')
      .populate('claimedBy.recipient', 'profile.firstName profile.lastName profile.organization profile.phone');

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    res.json({ donation });

  } catch (error) {
    console.error('Get donation error:', error);
    res.status(500).json({ message: 'Failed to get donation' });
  }
});

// Create new donation
router.post('/', [
  requireDonor,
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('foodType')
    .isIn(['fresh', 'canned', 'frozen', 'baked', 'dairy', 'produce', 'meat', 'pantry', 'other'])
    .withMessage('Invalid food type'),
  body('quantity.amount')
    .isFloat({ min: 0.1 })
    .withMessage('Quantity amount must be greater than 0'),
  body('quantity.unit')
    .isIn(['pounds', 'kilograms', 'servings', 'items', 'boxes', 'containers'])
    .withMessage('Invalid quantity unit'),
  body('preparationDate')
    .isISO8601()
    .withMessage('Invalid preparation date'),
  body('expiryDate')
    .isISO8601()
    .withMessage('Invalid expiry date'),
  body('pickupWindow.startTime')
    .isISO8601()
    .withMessage('Invalid pickup start time'),
  body('pickupWindow.endTime')
    .isISO8601()
    .withMessage('Invalid pickup end time'),
  body('location.address.street')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Street address is required'),
  body('location.address.city')
    .trim()
    .isLength({ min: 1 })
    .withMessage('City is required'),
  body('location.address.state')
    .trim()
    .isLength({ min: 1 })
    .withMessage('State is required'),
  body('location.address.zipCode')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Zip code is required'),
  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array with 2 elements'),
  body('location.coordinates.*')
    .isFloat()
    .withMessage('Coordinates must be numbers')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const donation = new Donation({
      ...req.body,
      donor: req.user._id
    });

    await donation.save();

    // Send notifications to nearby recipients
    try {
      const nearbyRecipients = await User.find({
        role: 'recipient',
        isActive: true,
        'preferences.emailNotifications': true,
        'profile.location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: donation.location.coordinates.coordinates
            },
            $maxDistance: 50 * 1609.34 // 50 miles in meters
          }
        }
      }).limit(50); // Limit to prevent spam

      if (nearbyRecipients.length > 0) {
        await sendDonationNotification(nearbyRecipients, donation);
      }
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
    }

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.emit('new-donation', {
        donation: await donation.populate('donor', 'profile.firstName profile.lastName profile.organization')
      });
    }

    res.status(201).json({
      message: 'Donation created successfully',
      donation: await donation.populate('donor', 'profile.firstName profile.lastName profile.organization')
    });

  } catch (error) {
    console.error('Create donation error:', error);
    res.status(500).json({ message: 'Failed to create donation' });
  }
});

// Update donation
router.put('/:id', [
  requireDonor,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Check if user owns the donation
    if (donation.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this donation' });
    }

    // Don't allow updates if already claimed
    if (donation.status === 'claimed' || donation.status === 'picked-up' || donation.status === 'completed') {
      return res.status(400).json({ message: 'Cannot update claimed donation' });
    }

    Object.assign(donation, req.body);
    await donation.save();

    res.json({
      message: 'Donation updated successfully',
      donation: await donation.populate('donor', 'profile.firstName profile.lastName profile.organization')
    });

  } catch (error) {
    console.error('Update donation error:', error);
    res.status(500).json({ message: 'Failed to update donation' });
  }
});

// Claim donation
router.post('/:id/claim', requireRecipient, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (donation.status !== 'available') {
      return res.status(400).json({ message: 'Donation is not available for claiming' });
    }

    // Check if pickup window is still active
    const now = new Date();
    if (now < donation.pickupWindow.startTime || now > donation.pickupWindow.endTime) {
      return res.status(400).json({ message: 'Pickup window is not active' });
    }

    donation.status = 'claimed';
    donation.claimedBy = {
      recipient: req.user._id,
      claimedAt: now
    };

    await donation.save();

    // Send notification to donor
    try {
      const donor = await User.findById(donation.donor);
      if (donor && donor.preferences.emailNotifications) {
        await sendClaimNotification(donor, donation, req.user);
      }
    } catch (notificationError) {
      console.error('Claim notification error:', notificationError);
    }

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.emit('donation-claimed', {
        donationId: donation._id,
        recipient: req.user.getPublicProfile()
      });
    }

    res.json({
      message: 'Donation claimed successfully',
      donation: await donation.populate('donor', 'profile.firstName profile.lastName profile.organization')
    });

  } catch (error) {
    console.error('Claim donation error:', error);
    res.status(500).json({ message: 'Failed to claim donation' });
  }
});

// Mark donation as picked up
router.post('/:id/pickup', requireRecipient, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (donation.status !== 'claimed') {
      return res.status(400).json({ message: 'Donation must be claimed before pickup' });
    }

    if (donation.claimedBy.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to pickup this donation' });
    }

    donation.status = 'picked-up';
    donation.claimedBy.pickupTime = new Date();

    await donation.save();

    res.json({
      message: 'Donation marked as picked up',
      donation: await donation.populate('donor', 'profile.firstName profile.lastName profile.organization')
    });

  } catch (error) {
    console.error('Pickup donation error:', error);
    res.status(500).json({ message: 'Failed to mark donation as picked up' });
  }
});

// Mark donation as completed
router.post('/:id/complete', requireRecipient, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (donation.status !== 'picked-up') {
      return res.status(400).json({ message: 'Donation must be picked up before completion' });
    }

    if (donation.claimedBy.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to complete this donation' });
    }

    donation.status = 'completed';
    donation.claimedBy.completedAt = new Date();

    await donation.save();

    res.json({
      message: 'Donation marked as completed',
      donation: await donation.populate('donor', 'profile.firstName profile.lastName profile.organization')
    });

  } catch (error) {
    console.error('Complete donation error:', error);
    res.status(500).json({ message: 'Failed to mark donation as completed' });
  }
});

// Delete donation
router.delete('/:id', requireDonor, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Check if user owns the donation
    if (donation.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this donation' });
    }

    // Don't allow deletion if already claimed
    if (donation.status === 'claimed' || donation.status === 'picked-up' || donation.status === 'completed') {
      return res.status(400).json({ message: 'Cannot delete claimed donation' });
    }

    await donation.remove();

    res.json({ message: 'Donation deleted successfully' });

  } catch (error) {
    console.error('Delete donation error:', error);
    res.status(500).json({ message: 'Failed to delete donation' });
  }
});

module.exports = router; 