const request = require('supertest');
const User = require('../models/User');
const Donation = require('../models/Donation');
const Notification = require('../models/Notification');
const app = require('../index');
const runtime = require('./runtime');
const { io: socketClient } = require('socket.io-client');
let donor, otherDonor, recipient, otherRecipient, admin;
const auth = actor => ({ Authorization: `Bearer ${actor.accessToken}` });
const payload = overrides => ({
  title: 'Community harvest', description: 'Fresh produce packed for collection', foodType: 'produce', quantity: { amount: 4, unit: 'kilograms' },
  preparationDate: new Date(Date.now() - 3600000).toISOString(), expiryDate: new Date(Date.now() + 86400000).toISOString(),
  pickupWindow: { startTime: new Date(Date.now() - 600000).toISOString(), endTime: new Date(Date.now() + 3600000).toISOString() },
  location: { address: { street: '12 Community Lane', city: 'Pune', state: 'MH', zipCode: '411001', country: 'India' }, coordinates: { type: 'Point', coordinates: [73.85, 18.52] } }, ...overrides
});
async function register(name, role) {
  const res = await request(app).post('/api/auth/register').send({ email: `${name}@example.com`, password: 'Strong-password-123', firstName: name, lastName: 'Community', phone: '+919876543210', role }).expect(201);
  return res.body;
}
async function create(overrides, actor = donor) { return (await request(app).post('/api/donations').set(auth(actor)).send(payload(overrides)).expect(201)).body.donation; }
function claim(d, actor = recipient) { return request(app).post(`/api/donations/${d._id}/claim`).set(auth(actor)); }
beforeAll(async () => {
  await runtime.open();
  donor = await register('donor', 'donor'); otherDonor = await register('otherdonor', 'donor');
  recipient = await register('recipient', 'recipient'); otherRecipient = await register('otherrecipient', 'recipient');
  await User.create({ email: 'operator@example.com', password: 'Strong-password-123', role: 'admin', profile: { firstName: 'Platform', lastName: 'Operator' } });
  admin = (await request(app).post('/api/auth/login').send({ email: 'operator@example.com', password: 'Strong-password-123' }).expect(200)).body;
});
afterAll(async () => { await app.shutdown(); await runtime.close(); });

describe('Authentication, sessions and administrative permissions', () => {
  test('self-registration cannot create an administrator', async () => {
    await request(app).post('/api/auth/register').send({ email: 'attacker@example.com', password: 'Strong-password-123', firstName: 'A', lastName: 'B', role: 'admin' }).expect(400);
  });
  test('validation never reflects a supplied password', async () => {
    const response = await request(app).post('/api/auth/register').send({ password: 'secret' }).expect(400);
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });
  test('password hashes and refresh credentials are never in the public user', async () => {
    expect(donor.user.password).toBeUndefined(); expect(donor.user.refreshToken).toBeUndefined();
    const stored = await User.findById(donor.user._id);
    expect(stored.password).toMatch(/^\$2[aby]\$/); expect(stored.refreshToken).not.toBe(donor.refreshToken); expect(stored.refreshToken).toHaveLength(64);
  });
  test('invalid credentials and malformed bearer tokens are rejected', async () => {
    await request(app).post('/api/auth/login').send({ email: 'donor@example.com', password: 'wrong-password' }).expect(401);
    await request(app).get('/api/users/profile').set('Authorization', 'Bearer invalid').expect(401);
  });
  test('refresh rotates immediately and rejects replay, including simultaneous requests', async () => {
    const actor = await register('refresh', 'donor');
    const results = await Promise.all([1, 2].map(() => request(app).post('/api/auth/refresh').send({ refreshToken: actor.refreshToken })));
    expect(results.map(r => r.status).sort()).toEqual([200, 401]);
    const fresh = results.find(r => r.status === 200).body;
    expect(fresh.refreshToken).not.toBe(actor.refreshToken);
    await request(app).post('/api/auth/refresh').send({ refreshToken: actor.refreshToken }).expect(401);
  });
  test('logout revokes both access and refresh tokens', async () => {
    const actor = await register('logout', 'donor');
    await request(app).post('/api/auth/logout').set(auth(actor)).expect(200);
    await request(app).get('/api/users/profile').set(auth(actor)).expect(401);
    await request(app).post('/api/auth/refresh').send({ refreshToken: actor.refreshToken }).expect(401);
  });
  test('password changes invalidate prior sessions and require the new password', async () => {
    const actor = await register('password', 'donor');
    await request(app).put('/api/users/password').set(auth(actor)).send({ currentPassword: 'incorrect', newPassword: 'New-password-123' }).expect(400);
    await request(app).put('/api/users/password').set(auth(actor)).send({ currentPassword: 'Strong-password-123', newPassword: 'New-password-123' }).expect(200);
    await request(app).get('/api/users/profile').set(auth(actor)).expect(401);
    await request(app).post('/api/auth/refresh').send({ refreshToken: actor.refreshToken }).expect(401);
    await request(app).post('/api/auth/login').send({ email: 'password@example.com', password: 'New-password-123' }).expect(200);
  });
  test('nested profile validation, clearing optional fields and role whitelist work', async () => {
    await request(app).put('/api/users/profile').set(auth(donor)).send({ profile: { firstName: '' } }).expect(400);
    const res = await request(app).put('/api/users/profile').set(auth(donor)).send({ role: 'admin', isActive: false, profile: { phone: '', organization: '' } }).expect(200);
    expect(res.body.user.role).toBe('donor'); expect(res.body.user.isActive).toBe(true); expect(res.body.user.profile.phone).toBe('');
  });
  test.each(['donor', 'recipient'])('%s cannot access admin resources', async role => {
    const actor = role === 'donor' ? donor : recipient;
    await request(app).get('/api/admin/users').set(auth(actor)).expect(403);
    await request(app).get('/api/admin/stats').set(auth(actor)).expect(403);
  });
  test('administrator accounts cannot be deactivated through the application', async () => {
    await request(app).patch(`/api/admin/users/${admin.user._id}/status`).set(auth(admin)).send({ isActive: false }).expect(403);
  });
  test('deactivation and reactivation do not resurrect earlier sessions', async () => {
    const actor = await register('deactivate', 'recipient');
    for (const isActive of [false, true]) await request(app).patch(`/api/admin/users/${actor.user._id}/status`).set(auth(admin)).send({ isActive }).expect(200);
    await request(app).get('/api/users/profile').set(auth(actor)).expect(401);
    await request(app).post('/api/auth/refresh').send({ refreshToken: actor.refreshToken }).expect(401);
  });
});
describe('Donation lifecycle, validation and real MongoDB contention', () => {
  test('unauthenticated and wrong-role creation is blocked', async () => {
    await request(app).post('/api/donations').send(payload()).expect(401);
    await request(app).post('/api/donations').set(auth(recipient)).send(payload()).expect(403);
  });
  test('creation cannot assign a claimant, status, owner or notification flags', async () => {
    const d = await create({ status: 'completed', donor: recipient.user._id, claimedBy: { recipient: recipient.user._id }, notifications: { emailSent: true } });
    expect(d.status).toBe('available'); expect(d.donor._id).toBe(donor.user._id); expect(d.claimedBy?.recipient).toBeUndefined(); expect(d.notifications.emailSent).toBe(false);
  });
  test.each([
    { quantity: { amount: -1, unit: 'items' } }, { quantity: { amount: 1, unit: 'invalid' } },
    { expiryDate: 'invalid' }, { expiryDate: new Date(Date.now() - 86400000).toISOString() },
    { pickupWindow: { startTime: new Date(Date.now() + 3600000), endTime: new Date() } },
    { location: { address: { street: 'A', city: 'B', state: 'C', zipCode: '123' }, coordinates: { type: 'Point', coordinates: [181, 91] } } },
    { images: [{ url: 'javascript:alert(1)' }] }
  ])('rejects invalid donation data %#', async overrides => {
    await request(app).post('/api/donations').set(auth(donor)).send(payload(overrides)).expect(400);
  });
  test('nonowner edits and deletes are rejected', async () => {
    const d = await create();
    await request(app).put(`/api/donations/${d._id}`).set(auth(otherDonor)).send({ title: 'Stolen' }).expect(403);
    await request(app).delete(`/api/donations/${d._id}`).set(auth(otherDonor)).expect(403);
  });
  test('concurrent claims have exactly one winner', async () => {
    const d = await create();
    const responses = await Promise.all([claim(d), claim(d, otherRecipient)]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    const stored = await Donation.findById(d._id); expect(stored.status).toBe('claimed');
    const notifications = await Notification.find({ donationId: d._id }); expect(notifications).toHaveLength(2);
  });
  test('claim racing an edit cannot revert a claim or transfer ownership', async () => {
    const d = await create();
    const [claimed, edited] = await Promise.all([claim(d), request(app).put(`/api/donations/${d._id}`).set(auth(donor)).send({ title: 'New title', status: 'available', claimedBy: {} })]);
    expect(claimed.status).toBe(200); expect([200, 409]).toContain(edited.status);
    expect((await Donation.findById(d._id)).status).toBe('claimed');
  });
  test('pickup and cancellation racing have exactly one valid successor', async () => {
    const d = await create(); await claim(d).expect(200);
    const results = await Promise.all([request(app).post(`/api/donations/${d._id}/pickup`).set(auth(recipient)), request(app).post(`/api/donations/${d._id}/cancel`).set(auth(donor))]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    expect(['picked-up', 'cancelled']).toContain((await Donation.findById(d._id)).status);
  });
  test('claimant-only pickup, completion and terminal cancellation rules hold', async () => {
    const d = await create(); await claim(d).expect(200);
    await request(app).post(`/api/donations/${d._id}/pickup`).set(auth(otherRecipient)).expect(403);
    await request(app).post(`/api/donations/${d._id}/complete`).set(auth(recipient)).expect(409);
    await request(app).post(`/api/donations/${d._id}/pickup`).set(auth(recipient)).expect(200);
    await request(app).post(`/api/donations/${d._id}/pickup`).set(auth(recipient)).expect(409);
    await request(app).post(`/api/donations/${d._id}/cancel`).set(auth(donor)).expect(409);
    await request(app).post(`/api/donations/${d._id}/complete`).set(auth(recipient)).expect(200);
    await request(app).delete(`/api/donations/${d._id}`).set(auth(donor)).expect(409);
  });
  test('advance claims are allowed but early pickup is blocked', async () => {
    const d = await create({ pickupWindow: { startTime: new Date(Date.now() + 600000), endTime: new Date(Date.now() + 3600000) } });
    await claim(d).expect(200); await request(app).post(`/api/donations/${d._id}/pickup`).set(auth(recipient)).expect(409);
  });
  test('expired records are excluded from available discovery and claims', async () => {
    const d = await create(); await Donation.updateOne({ _id: d._id }, { $set: { expiryDate: new Date(Date.now() - 1000) } });
    await claim(d).expect(409);
    const result = await request(app).get('/api/donations?status=available&limit=100').expect(200);
    expect(result.body.donations.map(item => item._id)).not.toContain(d._id);
  });
  test('public details redact claimant and phone while participants receive contact details', async () => {
    const d = await create({}, otherDonor); await claim(d).expect(200);
    await request(app).get(`/api/donations/${d._id}`).set('Authorization', 'Bearer expired').expect(401);
    const guest = (await request(app).get(`/api/donations/${d._id}`).expect(200)).body.donation;
    expect(guest.claimedBy).toBeUndefined(); expect(guest.donor.profile.phone).toBeUndefined();
    const owner = (await request(app).get(`/api/donations/${d._id}`).set(auth(recipient)).expect(200)).body.donation;
    expect(owner.donor.profile.phone).toBe('+919876543210');
  });
  test.each(['limit=0', 'limit=1000', 'page=-1', 'page=abc', 'sortBy=password', 'latitude=91&longitude=1', 'latitude=0', 'limit=1&limit=2'])('rejects invalid query %s', async query => {
    await request(app).get(`/api/donations?${query}`).expect(400);
  });
  test('geospatial discovery and literal regex search return valid counts', async () => {
    await request(app).get('/api/donations?latitude=18.52&longitude=73.85&maxDistance=20').expect(200);
    const result = await request(app).get('/api/donations?search=%28a%2B%29%2B%24').expect(200);
    expect(result.body.total).toBe(0);
  });
  test('file extension and MIME spoofing cannot publish active content', async () => {
    await request(app).post('/api/donations/upload').set(auth(donor)).attach('image', Buffer.from('<html>unsafe</html>'), { filename: 'malicious.html', contentType: 'image/png' }).expect(400);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    const result = await request(app).post('/api/donations/upload').set(auth(donor)).attach('image', png, { filename: 'image.html', contentType: 'image/png' }).expect(200);
    expect(result.body.url).toMatch(/\.png$/);
  });
  test('summary totals cover more than one page and quantities retain units', async () => {
    const response = await request(app).get('/api/users/summary').set(auth(donor)).expect(200);
    const stored = await Donation.countDocuments({ donor: donor.user._id });
    expect(Object.values(response.body.states).reduce((sum, n) => sum + n, 0)).toBe(stored);
    expect(response.body.quantities).toEqual(expect.arrayContaining([expect.objectContaining({ _id: 'kilograms', amount: 4 })]));
  });
});
describe('Requests, notifications and real-time isolation', () => {
  test('community requests persist and enforce commitment and receipt ownership', async () => {
    const created = await request(app).post('/api/requests').set(auth(recipient)).send({ title: 'Community lunch', quantity: '20 servings', location: 'Pune' }).expect(201);
    const id = created.body.request._id;
    const results = await Promise.all([donor, otherDonor].map(actor => request(app).post(`/api/requests/${id}/commit`).set(auth(actor))));
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    await request(app).patch(`/api/requests/${id}/status`).set(auth(otherRecipient)).send({ status: 'filled' }).expect(409);
    await request(app).patch(`/api/requests/${id}/status`).set(auth(recipient)).send({ status: 'filled' }).expect(200);
    const list = await request(app).get('/api/requests').set(auth(donor)).expect(200);
    expect(list.body.requests.find(r => r._id === id).status).toBe('filled');
  });
  test('notification read and deletion are scoped to the authenticated owner', async () => {
    const d = await create(); await claim(d).expect(200);
    const inbox = await request(app).get('/api/notifications').set(auth(donor)).expect(200);
    const item = inbox.body.notifications.find(n => n.donationId === d._id);
    await request(app).patch(`/api/notifications/${item._id}/read`).set(auth(otherDonor)).expect(404);
    await request(app).delete(`/api/notifications/${item._id}`).set(auth(otherDonor)).expect(404);
    await request(app).patch(`/api/notifications/${item._id}/read`).set(auth(donor)).expect(200);
    expect((await Notification.findById(item._id)).read).toBe(true);
  });
  test('socket connections require authentication and only receive assigned rooms', async () => {
    await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${app.server.address().port}`;
    const guest = socketClient(url, { reconnection: false });
    try { await new Promise((resolve, reject) => { guest.on('connect_error', resolve); guest.on('connect', () => reject(new Error('Guest socket connected'))); }); } finally { guest.disconnect(); }
    const socket = socketClient(url, { auth: { token: recipient.accessToken }, reconnection: false });
    try {
      await new Promise((resolve, reject) => { socket.on('connect', resolve); socket.on('connect_error', reject); });
      const serverSocket = app.get('io').sockets.sockets.get(socket.id);
      expect(serverSocket.rooms.has(`user-${recipient.user._id}`)).toBe(true);
      expect(serverSocket.rooms.has(`user-${donor.user._id}`)).toBe(false);
      socket.emit('join-room', `user-${donor.user._id}`);
      await new Promise(resolve => setTimeout(resolve, 25));
      expect(serverSocket.rooms.has(`user-${donor.user._id}`)).toBe(false);
    } finally { socket.disconnect(); }
  });
});

test('dedicated authentication limiter rejects repeated failed logins', async () => {
  let result;
  for (let i = 0; i < 31; i++) result = await request(app).post('/api/auth/login').send({ email: 'missing@example.com', password: 'incorrect' });
  expect(result.status).toBe(429);
});
