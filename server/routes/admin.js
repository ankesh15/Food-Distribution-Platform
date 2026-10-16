const express = require('express');
const User = require('../models/User');
const Donation = require('../models/Donation');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendPickupReminder } = require('../services/emailService');
const { sendPickupReminderSMS } = require('../services/smsService');

const { listValidation, applyStatus, escapeRegex, validId } = require('../middleware/validation');
const router = express.Router();

// Apply admin middleware to all routes
router.use(authenticateToken, requireAdmin);

router.param('id', validId);

// Get platform statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalDonations,
      activeDonations,
      completedDonations,
      totalDonors,
      totalRecipients,
      recentDonations,
      recentUsers,
      activeUsers
    ] = await Promise.all([
      User.countDocuments(),
      Donation.countDocuments(),
      Donation.countDocuments({ status: 'available', expiryDate: { $gt: new Date() }, 'pickupWindow.endTime': { $gt: new Date() } }),
      Donation.countDocuments({ status: 'completed' }),
      User.countDocuments({ role: 'donor' }),
      User.countDocuments({ role: 'recipient' }),
      Donation.find().sort({ createdAt: -1 }).limit(5).populate('donor', 'profile.firstName profile.lastName'),
      User.find().sort({ createdAt: -1 }).limit(5).select('profile.firstName profile.lastName role createdAt'),
      User.countDocuments({ isActive: true })
    ]);

    // Calculate completion rate
    const completionRate = totalDonations > 0 ? (completedDonations / totalDonations * 100).toFixed(1) : 0;

    // Get monthly stats for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await Donation.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      overview: {
        totalUsers,
        activeUsers,
        totalDonations,
        activeDonations,
        completedDonations,
        totalDonors,
        totalRecipients,
        completionRate: parseFloat(completionRate)
      },
      recentActivity: {
        donations: recentDonations,
        users: recentUsers
      },
      monthlyStats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to get statistics' });
  }
});

// Get all users with pagination and filters
router.get('/users', listValidation, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, isActive, search } = req.query;

    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    if (search) {
      query.$or = [
        { 'profile.firstName': { $regex: escapeRegex(search), $options: 'i' } },
        { 'profile.lastName': { $regex: escapeRegex(search), $options: 'i' } },
        { email: { $regex: escapeRegex(search), $options: 'i' } },
        { 'profile.organization': { $regex: escapeRegex(search), $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to get users' });
  }
});

// Get user details
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's donations
    const donations = await Donation.find({ donor: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get user's claimed donations
    const claimedDonations = await Donation.find({ 'claimedBy.recipient': user._id })
      .sort({ 'claimedBy.claimedAt': -1 })
      .limit(10);

    res.json({
      user,
      donations,
      claimedDonations
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Failed to get user details' });
  }
});

// Update user status (activate/deactivate)
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean' });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.role === 'admin') return res.status(403).json({ message: 'Administrator accounts require operator management' });
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $ne: 'admin' } },
      { $set: { isActive, refreshToken: null }, $inc: { tokenVersion: 1 } },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.app.get('io')?.in(`user-${user._id}`).disconnectSockets(true);
    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Failed to update user status' });
  }
});

// Get all donations with admin filters
router.get('/donations', listValidation, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      foodType, 
      donor, 
      recipient,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    applyStatus(query, status);
    if (foodType) query.foodType = foodType;
    if (donor) query.donor = donor;
    if (recipient) query['claimedBy.recipient'] = recipient;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const donations = await Donation.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('donor', 'profile.firstName profile.lastName profile.organization email')
      .populate('claimedBy.recipient', 'profile.firstName profile.lastName profile.organization email');

    const total = await Donation.countDocuments(query);

    res.json({
      donations,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('Get admin donations error:', error);
    res.status(500).json({ message: 'Failed to get donations' });
  }
});

// Get donation details
router.get('/donations/:id', async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donor', 'profile.firstName profile.lastName profile.organization email phone')
      .populate('claimedBy.recipient', 'profile.firstName profile.lastName profile.organization email phone');

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    res.json({ donation });

  } catch (error) {
    console.error('Get donation details error:', error);
    res.status(500).json({ message: 'Failed to get donation details' });
  }
});

// Delete donation (admin override) — uses findByIdAndDelete (Mongoose 7 compat)
router.delete('/donations/:id', async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    await Donation.findByIdAndDelete(req.params.id);
    await require('../services/notificationService').notify(req, [donation.donor, donation.claimedBy?.recipient], 'Listing removed', `“${donation.title}” was removed by an administrator.`);

    res.json({ message: 'Donation deleted successfully' });

  } catch (error) {
    console.error('Delete donation error:', error);
    res.status(500).json({ message: 'Failed to delete donation' });
  }
});

// Do not report sends for a notification campaign that is not implemented.
router.post('/reminders/inactive-users', (req, res) => res.status(501).json({ message: 'Inactive-user email campaigns are not configured' }));

// Send pickup reminders (BUG-12)
router.post('/reminders/pickup', async (req, res) => {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const donationsNeedingReminders = await Donation.find({
      status: 'claimed',
      'pickupWindow.startTime': {
        $gte: today,
        $lte: tomorrow
      }
    }).populate('claimedBy.recipient', 'email profile preferences');

    let dispatched = 0;
    for (const donation of donationsNeedingReminders) {
      if (donation.claimedBy?.recipient) {
        const recipient = donation.claimedBy.recipient;
        try {
          if (recipient.preferences?.emailNotifications !== false) {
            const sent = await sendPickupReminder(donation, recipient);
            if (sent) dispatched++;
          }
          if (recipient.preferences?.smsNotifications && recipient.profile?.phone) {
            await sendPickupReminderSMS(recipient, donation);
          }
        } catch (err) {
          console.error(`Failed to send reminder for donation ${donation._id}:`, err.message);
        }
      }
    }

    console.log(`Dispatched pickup reminders for ${dispatched} donations`);

    res.json({
      message: `Pickup reminders sent for ${dispatched} donations`,
      count: dispatched
    });

  } catch (error) {
    console.error('Send pickup reminders error:', error);
    res.status(500).json({ message: 'Failed to send pickup reminders' });
  }
});

module.exports = router;