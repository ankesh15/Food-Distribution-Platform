const { query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const statuses = ['available', 'claimed', 'picked-up', 'completed', 'expired', 'cancelled'];
const foodTypes = ['fresh', 'canned', 'frozen', 'baked', 'dairy', 'produce', 'meat', 'pantry', 'other'];
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array().map(({ value, ...error }) => error) });
  next();
};
const listValidation = [
  (req, res, next) => Object.values(req.query).some(value => typeof value !== 'string') ? res.status(400).json({ message: 'Query parameters must be single values' }) : next(),
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().isString().isLength({ max: 100 }),
  query('status').optional().isIn(statuses), query('foodType').optional().isIn(foodTypes),
  query('sortBy').optional().isIn(['createdAt', 'expiryDate', 'pickupWindow.startTime', 'title', 'isUrgent']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('role').optional().isIn(['donor', 'recipient', 'admin']),
  ...['isUrgent', 'isActive'].map(key => query(key).optional().isIn(['true', 'false'])),
  ...['dateFrom', 'dateTo'].map(key => query(key).optional().isISO8601()),
  ...['donor', 'recipient'].map(key => query(key).optional().isMongoId()),
  query('latitude').optional().isFloat({ min: -90, max: 90 }),
  query('longitude').optional().isFloat({ min: -180, max: 180 }),
  query('maxDistance').optional().isFloat({ min: 0.1, max: 100 }),
  query().custom(value => (value.latitude === undefined) === (value.longitude === undefined)).withMessage('Provide both latitude and longitude'),
  validate
];
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const validId = (req, res, next, id) => /^[a-f\d]{24}$/i.test(id) && mongoose.isValidObjectId(id)
  ? next() : res.status(400).json({ message: 'Invalid ID format' });
const handleError = (res, error, fallback) => {
  if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: 'Invalid input', errors: Object.values(error.errors || {}).map(e => ({ msg: e.message, path: e.path })) });
  if (error.name === 'VersionError') return res.status(409).json({ message: 'This record changed. Refresh and try again.' });
  console.error(fallback, error.name);
  return res.status(500).json({ message: fallback });
};
const applyStatus = (query, status) => {
  const now = new Date();
  if (status === 'available') Object.assign(query, { status, expiryDate: { $gt: now }, 'pickupWindow.endTime': { $gt: now } });
  else if (status === 'expired') query.$and = [{ $or: [{ status: 'expired' }, { status: 'available', $or: [{ expiryDate: { $lte: now } }, { 'pickupWindow.endTime': { $lte: now } }] }] }];
  else if (status) query.status = status;
};
module.exports = { applyStatus, validate, listValidation, escapeRegex, validId, handleError, statuses, foodTypes };
