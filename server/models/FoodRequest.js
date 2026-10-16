const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  foodType: { type: String, enum: ['prepared', 'fresh', 'canned', 'frozen', 'baked', 'dairy', 'produce', 'meat', 'pantry', 'other'], default: 'other' },
  quantity: { type: String, required: true, trim: true, maxlength: 80 },
  location: { type: String, required: true, trim: true, maxlength: 200 },
  urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['open', 'committed', 'filled', 'cancelled'], default: 'open' },
  committedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
schema.index({ status: 1, createdAt: -1 });
schema.index({ recipient: 1, createdAt: -1 });
module.exports = mongoose.model('FoodRequest', schema);
