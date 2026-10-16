const Notification = require('../models/Notification');
async function notify(req, users, title, message, donationId) {
  const ids = [...new Set(users.filter(Boolean).map(String))];
  try {
    const records = await Notification.insertMany(ids.map(user => ({ user, title, message, donationId })));
    records.forEach(record => req.app.get('io')?.to(`user-${record.user}`).emit('notification', record));
  } catch (error) {
    console.error('Notification persistence failed:', error.name);
  }
}
function emitLifecycle(req, event, donation) {
  const io = req.app.get('io');
  if (!io) return;
  const rooms = [`user-${donation.donor?._id || donation.donor}`];
  if (donation.claimedBy?.recipient) rooms.push(`user-${donation.claimedBy.recipient._id || donation.claimedBy.recipient}`);
  io.to(rooms).emit(event, { donationId: donation._id });
}
module.exports = { notify, emitLifecycle };
