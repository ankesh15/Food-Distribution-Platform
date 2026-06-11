const express = require('express');
const { body, validationResult } = require('express-validator');
const Donation = require('../models/Donation');
const User = require('../models/User');
const { authenticateToken, requireDonor, requireRecipient } = require('../middleware/auth');
const { sendDonationNotification, sendClaimNotification } = require('../services/emailService');

const router = express.Router();

// Get all donations (with filters + search)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      foodType, 
      search,
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

    // Text search by title/description
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { 'location.address.city': { $regex: search.trim(), $options: 'i' } }
      ];
    }

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
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('donor', 'profile.firstName profile.lastName profile.organization')
      .populate('claimedBy.recipient', 'profile.firstName profile.lastName profile.organization');

    const total = await Donation.countDocuments(query);

    res.json({
      donations,
      totalPages: Math.ceil(total / parseInt(limit)),
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

// Create new donation — authenticateToken MUST come before requireDonor
router.post('/', [
  authenticateToken,
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
    .withMessage('Zip code is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Build donation data — coordinates are optional (fallback to [0,0])
    const donationData = { ...req.body, donor: req.user._id };

    // Ensure location.coordinates structure exists
    if (!donationData.location) donationData.location = {};
    if (!donationData.location.coordinates || !donationData.location.coordinates.coordinates) {
      donationData.location.coordinates = {
        type: 'Point',
        coordinates: [0, 0] // Fallback — no geocoding API key configured
      };
    }

    const donation = new Donation(donationData);
    await donation.save();

    // Send notifications to nearby recipients (best-effort)
    try {
      const nearbyRecipients = await User.find({
        role: 'recipient',
        isActive: true,
        'preferences.emailNotifications': true
      }).limit(50);

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
  authenticateToken,
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

// Claim donation — allow advance claims (before pickup window starts)
router.post('/:id/claim', authenticateToken, requireRecipient, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (donation.status !== 'available') {
      return res.status(400).json({ message: 'Donation is not available for claiming' });
    }

    // Check if donation has expired
    if (donation.expiryDate <= new Date()) {
      return res.status(400).json({ message: 'This donation has expired' });
    }

    // Check if pickup window has already ended
    if (donation.pickupWindow.endTime <= new Date()) {
      return res.status(400).json({ message: 'Pickup window has ended' });
    }

    donation.status = 'claimed';
    donation.claimedBy = {
      recipient: req.user._id,
      claimedAt: new Date()
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
router.post('/:id/pickup', authenticateToken, requireRecipient, async (req, res) => {
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
router.post('/:id/complete', authenticateToken, requireRecipient, async (req, res) => {
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

// Cancel donation
router.post('/:id/cancel', authenticateToken, requireDonor, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (donation.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this donation' });
    }

    if (donation.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed donation' });
    }

    donation.status = 'cancelled';
    await donation.save();

    res.json({ message: 'Donation cancelled successfully', donation });
  } catch (error) {
    console.error('Cancel donation error:', error);
    res.status(500).json({ message: 'Failed to cancel donation' });
  }
});

// Delete donation — uses findByIdAndDelete (Mongoose 7 compat)
router.delete('/:id', authenticateToken, requireDonor, async (req, res) => {
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

    await Donation.findByIdAndDelete(req.params.id);

    res.json({ message: 'Donation deleted successfully' });

  } catch (error) {
    console.error('Delete donation error:', error);
    res.status(500).json({ message: 'Failed to delete donation' });
  }
});

module.exports = router;