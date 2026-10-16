const router = require('express').Router();
const FoodRequest = require('../models/FoodRequest');
const { authenticateToken, requireDonor, requireRecipient } = require('../middleware/auth');
const { validId, handleError, validate } = require('../middleware/validation');
const { body, query } = require('express-validator');
const { notify } = require('../services/notificationService');
router.use(authenticateToken);
router.param('id', validId);
router.get('/', query('page').optional().isInt({ min: 1, max: 10000 }), validate, async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const [requests, total] = await Promise.all([FoodRequest.find().sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20).populate('recipient committedBy', 'profile.firstName profile.lastName profile.organization profile.phone'), FoodRequest.countDocuments()]);
    const visible = requests.map(record => {
      const item = record.toObject();
      const participant = req.user.role === 'admin' || String(item.recipient?._id) === String(req.user._id) || String(item.committedBy?._id) === String(req.user._id);
      if (!participant) for (const key of ['recipient', 'committedBy']) if (item[key]?.profile) delete item[key].profile.phone;
      return item;
    });
    res.json({ requests: visible, totalPages: Math.ceil(total / 20), total });
  } catch (error) { next(error); }
});
router.post('/', requireRecipient, async (req, res) => {
  try {
    const fields = ['title', 'description', 'foodType', 'quantity', 'location', 'urgency'];
    const request = await FoodRequest.create({ ...Object.fromEntries(fields.filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]])), recipient: req.user._id });
    res.status(201).json({ request });
  } catch (error) { handleError(res, error, 'Failed to create request'); }
});
router.post('/:id/commit', requireDonor, async (req, res, next) => {
  try {
    const request = await FoodRequest.findOneAndUpdate({ _id: req.params.id, status: 'open', recipient: { $ne: req.user._id } }, { $set: { status: 'committed', committedBy: req.user._id } }, { new: true });
    if (!request) return res.status(409).json({ message: 'Request is no longer open or belongs to you' });
    await notify(req, [request.recipient, req.user._id], 'Supplies committed', `A donor has committed supplies for “${request.title}”. Coordinate collection before confirming receipt.`);
    res.json({ request });
  } catch (error) { next(error); }
});
router.patch('/:id/status', requireRecipient, body('status').isIn(['filled', 'cancelled']), validate, async (req, res, next) => {
  try {
    const request = await FoodRequest.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id, status: { $in: req.body.status === 'filled' ? ['committed'] : ['open', 'committed'] } }, { $set: { status: req.body.status } }, { new: true });
    if (!request) return res.status(409).json({ message: 'Request cannot make this transition or is not yours' });
    await notify(req, [request.recipient, request.committedBy], 'Request updated', `“${request.title}” is now ${request.status}.`);
    res.json({ request });
  } catch (error) { next(error); }
});
module.exports = router;
