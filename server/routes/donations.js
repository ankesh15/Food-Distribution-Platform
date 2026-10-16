const express = require('express');
const Donation = require('../models/Donation');
const User = require('../models/User');
const { authenticateToken, optionalAuth, requireDonor, requireRecipient } = require('../middleware/auth');
const { listValidation, escapeRegex, validId, handleError } = require('../middleware/validation');
const { sendDonationNotification, sendClaimNotification } = require('../services/emailService');
const { sendClaimNotificationSMS } = require('../services/smsService');
const { notify, emitLifecycle } = require('../services/notificationService');
const { geocodeAddress } = require('../utils/geocoder');
const upload = require('../middleware/upload');
const { schedule } = require('../services/backgroundJobs');
const router = express.Router();
router.param('id', validId);
const fields = ['title', 'description', 'foodType', 'quantity', 'preparationDate', 'expiryDate', 'pickupWindow', 'location', 'allergens', 'specialInstructions', 'isUrgent', 'tags', 'images'];
const editable = body => Object.fromEntries(fields.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
const owns = (a, b) => String(a?._id || a) === String(b?._id || b);
const donorFields = 'profile.firstName profile.lastName profile.organization';
async function checkDatesAndValidate(donation) {
  await donation.validate();
  if (donation.expiryDate <= new Date() || donation.pickupWindow.endTime <= new Date()) {
    const error = new Error('Expiry and pickup end must be in the future'); error.status = 400; throw error;
  }
  if (donation.tags.length > 10 || donation.tags.some(tag => tag.length > 40) || donation.images.length > 5) {
    const error = new Error('Use at most 10 short tags and 5 images'); error.status = 400; throw error;
  }
  if (donation.images.some(image => !/^\/uploads\/donation-[a-f\d-]+\.(png|jpg|webp|gif)$/.test(image.url || '') && !/^https:\/\/[^\s]+$/i.test(image.url || ''))) {
    const error = new Error('Images must use an uploaded image path or HTTPS URL'); error.status = 400; throw error;
  }
}
function fail(res, error, message) {
  if (error.status === 400) return res.status(400).json({ message: error.message });
  return handleError(res, error, message);
}
const uploadLimiter = require('express-rate-limit')({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Upload limit reached. Try again later.' } });
router.post('/upload', authenticateToken, requireDonor, uploadLimiter, (req, res) => {
  upload.single('image')(req, res, async err => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });
    try { res.json({ message: 'Image uploaded successfully', url: await upload.saveImage(req.file) }); }
    catch (error) { res.status(error.code ? 500 : 400).json({ message: error.code ? 'Unable to store image' : error.message }); }
  });
});
router.get('/', listValidation, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, foodType, search, latitude, longitude, maxDistance = 50, isUrgent, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const query = {};
    const now = new Date();
    if (status === 'available') Object.assign(query, { status, expiryDate: { $gt: now }, 'pickupWindow.endTime': { $gt: now } });
    else if (status === 'expired') query.$or = [{ status: 'expired' }, { status: 'available', $or: [{ expiryDate: { $lte: now } }, { 'pickupWindow.endTime': { $lte: now } }] }];
    else if (status) query.status = status;
    if (foodType) query.foodType = foodType;
    if (isUrgent !== undefined) query.isUrgent = isUrgent === 'true';
    if (search?.trim()) {
      const regex = escapeRegex(search.trim());
      query.$and = [{ $or: ['title', 'description', 'location.address.city'].map(key => ({ [key]: { $regex: regex, $options: 'i' } })) }];
    }
    // $geoWithin supports countDocuments, unlike $near. Radius is miles / Earth radius.
    if (latitude !== undefined) query['location.coordinates'] = { $geoWithin: { $centerSphere: [[Number(longitude), Number(latitude)], Number(maxDistance) / 3958.8] } };
    const [donations, total] = await Promise.all([
      Donation.find(query).select('-claimedBy -notifications').sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1, _id: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit)).populate('donor', donorFields),
      Donation.countDocuments(query)
    ]);
    res.json({ donations, totalPages: Math.ceil(total / limit), currentPage: Number(page), total });
  } catch (error) { fail(res, error, 'Failed to get donations'); }
});
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: 'Donation not found' });
    const participant = req.user && (owns(donation.donor, req.user) || owns(donation.claimedBy?.recipient, req.user) || req.user.role === 'admin');
    await donation.populate('donor', `${donorFields}${participant ? ' profile.phone' : ''}`);
    if (participant) await donation.populate('claimedBy.recipient', `${donorFields} profile.phone`);
    const result = donation.toJSON();
    delete result.notifications;
    if (!participant) delete result.claimedBy;
    res.json({ donation: result });
  } catch (error) { fail(res, error, 'Failed to get donation'); }
});
router.post('/', authenticateToken, requireDonor, async (req, res) => {
  try {
    const donation = new Donation({ ...editable(req.body), donor: req.user._id });
    await checkDatesAndValidate(donation);
    const coords = donation.location.coordinates.coordinates;
    if (coords[0] === 0 && coords[1] === 0 && process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const result = await geocodeAddress(Object.values(donation.location.address.toObject()).join(', '));
        donation.location.coordinates.coordinates = [result.longitude, result.latitude];
      } catch (error) { console.warn('Address could not be geocoded; coordinates remain unknown'); }
    }
    await donation.save();
    // Optional provider calls never hold the committed create response open.
    schedule(async () => {
      const recipients = await User.find({ role: 'recipient', isActive: true, 'preferences.emailNotifications': true }).limit(100);
      if (recipients.length) await sendDonationNotification(recipients, donation);
    });
    req.app.get('io')?.to('role-recipient').emit('donation-created', { donationId: donation._id, title: donation.title });
    res.status(201).json({ message: 'Donation created successfully', donation: await donation.populate('donor', donorFields) });
  } catch (error) { fail(res, error, 'Failed to create donation'); }
});
router.put('/:id', authenticateToken, requireDonor, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: 'Donation not found' });
    if (!owns(donation.donor, req.user)) return res.status(403).json({ message: 'Not authorized to update this donation' });
    if (donation.status !== 'available') return res.status(409).json({ message: 'Only available donations can be edited' });
    const version = donation.updatedAt;
    const previousAddress = JSON.stringify(donation.location.address.toObject());
    const previousCoordinates = JSON.stringify(donation.location.coordinates.coordinates);
    Object.assign(donation, editable(req.body));
    if (previousAddress !== JSON.stringify(donation.location.address.toObject()) && previousCoordinates === JSON.stringify(donation.location.coordinates.coordinates)) donation.location.coordinates.coordinates = [0, 0];
    await checkDatesAndValidate(donation);
    const values = editable(donation.toObject());
    const updated = await Donation.findOneAndUpdate({ _id: donation._id, donor: req.user._id, status: 'available', updatedAt: version }, { $set: values, $inc: { __v: 1 } }, { new: true, runValidators: true });
    if (!updated) return res.status(409).json({ message: 'Donation changed. Refresh before editing.' });
    res.json({ message: 'Donation updated successfully', donation: await updated.populate('donor', donorFields) });
  } catch (error) { fail(res, error, 'Failed to update donation'); }
});
router.post('/:id/claim', authenticateToken, requireRecipient, async (req, res) => {
  try {
    const existing = await Donation.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Donation not found' });
    if (owns(existing.donor, req.user)) return res.status(403).json({ message: 'You cannot claim your own donation' });
    const now = new Date();
    const donation = await Donation.findOneAndUpdate({ _id: req.params.id, status: 'available', donor: { $ne: req.user._id }, expiryDate: { $gt: now }, 'pickupWindow.endTime': { $gt: now } },
      { $set: { status: 'claimed', claimedBy: { recipient: req.user._id, claimedAt: now } }, $inc: { __v: 1 } }, { new: true, runValidators: true });
    if (!donation) return res.status(409).json({ message: 'Donation is no longer available for claiming' });
    await notify(req, [donation.donor, req.user._id], 'Donation claimed', `Pickup reserved for “${donation.title}”. Check the pickup window and arrange collection.`, donation._id);
    schedule(async () => {
      const donor = await User.findById(donation.donor);
      if (donor?.preferences?.emailNotifications) await sendClaimNotification(donor, donation, req.user);
      if (donor?.profile?.phone && donor.preferences?.smsNotifications) await sendClaimNotificationSMS(donor, donation, req.user);
    });
    emitLifecycle(req, 'donation-claimed', donation);
    res.json({ message: 'Donation claimed successfully', donation: await donation.populate('donor', donorFields) });
  } catch (error) { fail(res, error, 'Failed to claim donation'); }
});
// All terminal transitions compare the current state in the database, never a stale document.
for (const [action, from, to, timestamp] of [['pickup', 'claimed', 'picked-up', 'pickupTime'], ['complete', 'picked-up', 'completed', 'completedAt']]) {
  router.post(`/:id/${action}`, authenticateToken, requireRecipient, async (req, res) => {
    try {
      const existing = await Donation.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Donation not found' });
      if (!owns(existing.claimedBy?.recipient, req.user)) return res.status(403).json({ message: 'Only the claimant can update this pickup' });
      const now = new Date();
      const condition = { _id: existing._id, status: from, 'claimedBy.recipient': req.user._id };
      if (action === 'pickup') Object.assign(condition, { expiryDate: { $gt: now }, 'pickupWindow.startTime': { $lte: now }, 'pickupWindow.endTime': { $gte: now } });
      const donation = await Donation.findOneAndUpdate(condition, { $set: { status: to, [`claimedBy.${timestamp}`]: now }, $inc: { __v: 1 } }, { new: true });
      if (!donation) return res.status(409).json({ message: action === 'pickup' ? 'Pickup requires a claimed donation within its pickup window and before expiry' : 'Donation must be picked up before completion' });
      await notify(req, [donation.donor, req.user._id], action === 'pickup' ? 'Food picked up' : 'Donation completed', `“${donation.title}” is now ${to}.`, donation._id);
      emitLifecycle(req, `donation-${to}`, donation);
      res.json({ message: `Donation ${to} successfully`, donation: await donation.populate('donor', donorFields) });
    } catch (error) { fail(res, error, 'Failed to update pickup'); }
  });
}
router.post('/:id/cancel', authenticateToken, requireDonor, async (req, res) => {
  try {
    const existing = await Donation.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Donation not found' });
    if (!owns(existing.donor, req.user)) return res.status(403).json({ message: 'Not authorized to cancel this donation' });
    const donation = await Donation.findOneAndUpdate({ _id: existing._id, donor: req.user._id, status: { $in: ['available', 'claimed'] } }, { $set: { status: 'cancelled' }, $inc: { __v: 1 } }, { new: true });
    if (!donation) return res.status(409).json({ message: 'Only available or claimed donations can be cancelled' });
    await notify(req, [donation.donor, donation.claimedBy?.recipient], 'Donation cancelled', `“${donation.title}” was cancelled by its donor.`, donation._id);
    emitLifecycle(req, 'donation-cancelled', donation);
    res.json({ message: 'Donation cancelled successfully', donation });
  } catch (error) { fail(res, error, 'Failed to cancel donation'); }
});
router.delete('/:id', authenticateToken, requireDonor, async (req, res) => {
  try {
    const existing = await Donation.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Donation not found' });
    if (!owns(existing.donor, req.user)) return res.status(403).json({ message: 'Not authorized to delete this donation' });
    const deleted = await Donation.findOneAndDelete({ _id: existing._id, donor: req.user._id, status: { $in: ['available', 'expired', 'cancelled'] } });
    if (!deleted) return res.status(409).json({ message: 'Cannot delete a claimed, picked-up or completed donation' });
    res.json({ message: 'Donation deleted successfully' });
  } catch (error) { fail(res, error, 'Failed to delete donation'); }
});
module.exports = router;
