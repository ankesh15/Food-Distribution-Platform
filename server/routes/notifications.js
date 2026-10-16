const router = require('express').Router();
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');
const { validId } = require('../middleware/validation');
router.use(authenticateToken);
router.param('id', validId);
router.get('/', async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100),
      Notification.countDocuments({ user: req.user._id, read: false })
    ]);
    res.json({ notifications, unreadCount });
  } catch (error) { next(error); }
});
router.patch('/read-all', async (req, res, next) => {
  try { await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } }); res.json({ success: true }); }
  catch (error) { next(error); }
});
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: { read: true } }, { new: true });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ notification });
  } catch (error) { next(error); }
});
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
    if (!result.deletedCount) return res.status(404).json({ message: 'Notification not found' });
    res.json({ success: true });
  } catch (error) { next(error); }
});
module.exports = router;
