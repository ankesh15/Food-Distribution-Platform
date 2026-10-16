const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, maxlength: 120 },
  message: { type: String, required: true, maxlength: 500 },
  type: { type: String, default: 'info' },
  donationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation' },
  read: { type: Boolean, default: false }
}, { timestamps: true });
schema.index({ user: 1, createdAt: -1 });
schema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
module.exports = mongoose.model('Notification', schema);
