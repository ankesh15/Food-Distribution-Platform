const { randomBytes, createHash, timingSafeEqual } = require('crypto');

function secret(name) {
  const value = process.env[name];
  if (process.env.NODE_ENV === 'production' && (!value || value.length < 32 || /your_|change|example|dev_jwt/i.test(value))) {
    throw new Error(`${name} must be a strong secret of at least 32 characters`);
  }
  return value || randomBytes(48).toString('hex');
}
const accessSecret = secret('JWT_SECRET');
const refreshSecret = secret('JWT_REFRESH_SECRET');
if (process.env.NODE_ENV === 'production' && accessSecret === refreshSecret) {
  throw new Error('JWT secrets must be independent');
}
const tokenHash = token => createHash('sha256').update(token).digest('hex');
const matchesRefresh = (stored, token) => {
  if (!stored || typeof token !== 'string') return false;
  const candidate = stored.length === 64 ? tokenHash(token) : token; // Migrate legacy sessions on refresh.
  const a = Buffer.from(stored);
  const b = Buffer.from(candidate);
  return a.length === b.length && timingSafeEqual(a, b);
};
module.exports = { accessSecret, refreshSecret, tokenHash, matchesRefresh };
