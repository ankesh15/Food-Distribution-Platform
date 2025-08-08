const express = require('express');
const User = require('../models/User');
const Donation = require('../models/Donation');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply admin middleware to all routes
router.use(authenticateToken, requireAdmin);

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
      recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      Donation.countDocuments(),
      Donation.countDocuments({ status: 'available' }),
      Donation.countDocuments({ status: 'completed' }),
      User.countDocuments({ role: 'donor' }),
      User.countDocuments({ role: 'recipient' }),
      Donation.find().sort({ createdAt: -1 }).limit(5).populate('donor', 'profile.firstName profile.lastName'),
      User.find().sort({ createdAt: -1 }).limit(5).select('profile.firstName profile.lastName role createdAt')
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
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, isActive, search } = req.query;

    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    if (search) {
      query.$or = [
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.organization': { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
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

// Update user status
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

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
router.get('/donations', async (req, res) => {
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

    if (status) query.status = status;
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
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('donor', 'profile.firstName profile.lastName profile.organization email')
      .populate('claimedBy.recipient', 'profile.firstName profile.lastName profile.organization email');

    const total = await Donation.countDocuments(query);

    res.json({
      donations,
      totalPages: Math.ceil(total / limit),
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

// Delete donation (admin override)
router.delete('/donations/:id', async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    await donation.remove();

    res.json({ message: 'Donation deleted successfully' });

  } catch (error) {
    console.error('Delete donation error:', error);
    res.status(500).json({ message: 'Failed to delete donation' });
  }
});

// Send reminder emails to inactive users
router.post('/reminders/inactive-users', async (req, res) => {
  try {
    const { daysInactive = 30 } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    const inactiveUsers = await User.find({
      lastLogin: { $lt: cutoffDate },
      isActive: true,
      'preferences.emailNotifications': true
    });

    // TODO: Implement reminder email service
    console.log(`Found ${inactiveUsers.length} inactive users to remind`);

    res.json({
      message: `Reminder emails queued for ${inactiveUsers.length} inactive users`,
      count: inactiveUsers.length
    });

  } catch (error) {
    console.error('Send reminders error:', error);
    res.status(500).json({ message: 'Failed to send reminders' });
  }
});

// Send pickup reminders
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
    }).populate('claimedBy.recipient', 'email profile.firstName profile.lastName');

    // TODO: Implement pickup reminder email service
    console.log(`Found ${donationsNeedingReminders.length} donations needing pickup reminders`);

    res.json({
      message: `Pickup reminders queued for ${donationsNeedingReminders.length} donations`,
      count: donationsNeedingReminders.length
    });

  } catch (error) {
    console.error('Send pickup reminders error:', error);
    res.status(500).json({ message: 'Failed to send pickup reminders' });
  }
});

module.exports = router; 