const request = require('supertest');
const mongoose = require('mongoose');
const runtime = require('./runtime');

const app = require('../index');
const User = require('../models/User');
const Donation = require('../models/Donation');

describe('Food Distribution Platform — Comprehensive Integration & Regression Tests', () => {
  const timestamp = Date.now();
  const donorEmail = `donor_${timestamp}@example.com`;
  const recipientEmail1 = `recip1_${timestamp}@example.com`;
  const recipientEmail2 = `recip2_${timestamp}@example.com`;

  let donorToken = '';
  let recipientToken1 = '';
  let recipientToken2 = '';
  let testDonationId = '';

  beforeAll(runtime.open, 120000);
  afterAll(async () => {
    await app.shutdown();
    await runtime.close();
  });

  describe('1. System Health & Public Stats', () => {
    it('GET /api/health returns 200 OK', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'OK');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('GET /api/stats/public returns valid counts', async () => {
      const res = await request(app)
        .get('/api/stats/public')
        .expect(200);

      expect(res.body).toHaveProperty('totalDonors');
      expect(res.body).toHaveProperty('totalRecipients');
      expect(res.body).toHaveProperty('totalDonations');
      expect(res.body).toHaveProperty('successRate');
    });
  });

  describe('2. Authentication & Error Formatting (BUG-03, BUG-18, BUG-19)', () => {
    it('POST /api/auth/register fails with 400 and structured errors on invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: '123',
          role: 'invalid-role'
        })
        .expect(400);

      expect(res.body).toHaveProperty('message', 'Validation failed');
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.length).toBeGreaterThan(0);
      expect(res.body.errors[0]).toHaveProperty('msg');
    });

    it('POST /api/auth/register creates donor user in a single save', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: donorEmail,
          password: 'Password123!',
          firstName: 'Alice',
          lastName: 'Donor',
          role: 'donor',
          organization: 'Community Market',
          phone: '+15551234567'
        })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toHaveProperty('email', donorEmail);
      expect(res.body.user).toHaveProperty('role', 'donor');
      donorToken = res.body.accessToken;
    });

    it('POST /api/auth/register handles duplicate email with 409 Conflict (BUG-19)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: donorEmail,
          password: 'Password123!',
          firstName: 'AliceDuplicate',
          lastName: 'Donor',
          role: 'donor'
        })
        .expect(409);

      expect(res.body.message).toMatch(/already exists/i);
    });

    it('POST /api/auth/register registers two recipient users for concurrency tests', async () => {
      const res1 = await request(app)
        .post('/api/auth/register')
        .send({
          email: recipientEmail1,
          password: 'Password123!',
          firstName: 'Bob',
          lastName: 'Shelter',
          role: 'recipient',
          organization: 'Shelter Alpha',
          phone: '+15559876543'
        })
        .expect(201);

      recipientToken1 = res1.body.accessToken;

      const res2 = await request(app)
        .post('/api/auth/register')
        .send({
          email: recipientEmail2,
          password: 'Password123!',
          firstName: 'Charlie',
          lastName: 'Pantry',
          role: 'recipient',
          organization: 'Pantry Beta',
          phone: '+15558765432'
        })
        .expect(201);

      recipientToken2 = res2.body.accessToken;
    });

    it('POST /api/auth/login logs in verified user and returns tokens', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: donorEmail,
          password: 'Password123!'
        })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe(donorEmail);
    });
  });

  describe('3. Donation Lifecycle, Quantity Validation, & Geocoding (BUG-08, BUG-11)', () => {
    it('POST /api/donations successfully creates donation with fractional quantity (0.5 servings)', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() + 1000 * 60 * 60 * 2);
      const endTime = new Date(now.getTime() + 1000 * 60 * 60 * 24);
      const expiryDate = new Date(now.getTime() + 1000 * 60 * 60 * 48);

      const donationPayload = {
        title: 'Test surplus artisanal sourdough',
        description: 'Freshly baked surplus loaves from morning bake',
        foodType: 'baked',
        quantity: {
          amount: 0.5, // Tests BUG-08: min 0.1 permitted by schema and validator
          unit: 'boxes'
        },
        preparationDate: now.toISOString(),
        expiryDate: expiryDate.toISOString(),
        pickupWindow: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        },
        location: {
          address: {
            street: '350 5th Ave',
            city: 'New York',
            state: 'NY',
            zipCode: '10118'
          }
        },
        isUrgent: false
      };

      const res = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send(donationPayload)
        .expect(201);

      expect(res.body.donation).toHaveProperty('_id');
      expect(res.body.donation.quantity.amount).toBe(0.5);
      // Verify geocoding integration ran (BUG-11)
      expect(res.body.donation.location.coordinates).toBeDefined();
      testDonationId = res.body.donation._id;
    });

    it('GET /api/donations lists donations with pagination', async () => {
      const res = await request(app)
        .get('/api/donations?limit=5')
        .expect(200);

      expect(Array.isArray(res.body.donations)).toBe(true);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('totalPages');
    });

    it('GET /api/donations/:id returns single donation details', async () => {
      const res = await request(app)
        .get(`/api/donations/${testDonationId}`)
        .expect(200);

      expect(res.body.donation._id).toBe(testDonationId);
      expect(res.body.donation.title).toBe('Test surplus artisanal sourdough');
    });
  });

  describe('4. Invalid ObjectId Cast Error Prevention (BUG-06)', () => {
    it('GET /api/donations/:id returns 400 for malformed ObjectId', async () => {
      const res = await request(app)
        .get('/api/donations/not-a-valid-id-123')
        .expect(400);

      expect(res.body.message).toMatch(/invalid.*id/i);
    });

    it('POST /api/donations/:id/claim returns 400 for malformed ObjectId', async () => {
      const res = await request(app)
        .post('/api/donations/invalid-id/claim')
        .set('Authorization', `Bearer ${recipientToken1}`)
        .expect(400);

      expect(res.body.message).toMatch(/invalid.*id/i);
    });
  });

  describe('5. Mass Assignment Vulnerability Prevention (BUG-02)', () => {
    it('PUT /api/donations/:id ignores attempts to overwrite protected fields like status', async () => {
      const res = await request(app)
        .put(`/api/donations/${testDonationId}`)
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          title: 'Updated sourdough title',
          status: 'completed', // Attacker attempt to bypass lifecycle
          donor: new mongoose.Types.ObjectId() // Attacker attempt to reassign ownership
        })
        .expect(200);

      expect(res.body.donation.title).toBe('Updated sourdough title');
      // Status MUST remain available
      expect(res.body.donation.status).toBe('available');

      // Verify in database
      const dbDonation = await Donation.findById(testDonationId);
      expect(dbDonation.status).toBe('available');
    });
  });

  describe('6. Atomic Claim Concurrency & Race Condition Prevention (BUG-01)', () => {
    it('simultaneous claims result in exactly 1 success and 1 clean 409 rejection', async () => {
      // Execute 2 claims concurrently
      const [claimRes1, claimRes2] = await Promise.all([
        request(app)
          .post(`/api/donations/${testDonationId}/claim`)
          .set('Authorization', `Bearer ${recipientToken1}`),
        request(app)
          .post(`/api/donations/${testDonationId}/claim`)
          .set('Authorization', `Bearer ${recipientToken2}`)
      ]);

      const statuses = [claimRes1.status, claimRes2.status].sort();

      // Exactly one must succeed (200) and one must be rejected (409)
      expect(statuses).toEqual([200, 409]);

      // Verify final status in database is 'claimed'
      const updated = await Donation.findById(testDonationId);
      expect(updated.status).toBe('claimed');
      expect(updated.claimedBy.recipient).toBeDefined();
    });
  });

  describe('7. Geospatial Index Query Verification (BUG-04)', () => {
    it('GET /api/users/nearby-recipients executes without 2dsphere index errors', async () => {
      const res = await request(app)
        .get('/api/users/nearby-recipients?latitude=40.7128&longitude=-74.0060&maxDistance=25')
        .set('Authorization', `Bearer ${donorToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('recipients');
      expect(Array.isArray(res.body.recipients)).toBe(true);
    });
  });

  describe('8. User Profile & Image Upload Integration (BUG-09)', () => {
    it('GET /api/users/profile returns authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${donorToken}`)
        .expect(200);

      expect(res.body.user).toHaveProperty('email', donorEmail);
      expect(res.body.user.profile.firstName).toBe('Alice');
    });

    it('POST /api/donations/upload rejects non-image files with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/donations/upload')
        .set('Authorization', `Bearer ${donorToken}`)
        .attach('image', Buffer.from('console.log("malicious")'), 'script.sh')
        .expect(400);

      expect(res.body.message).toMatch(/invalid file type/i);
    });

    it('POST /api/donations/upload accepts valid image files', async () => {
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

      const res = await request(app)
        .post('/api/donations/upload')
        .set('Authorization', `Bearer ${donorToken}`)
        .attach('image', pngBuffer, 'test-image.png')
        .expect(200);

      expect(res.body).toHaveProperty('url');
      expect(res.body.url).toMatch(/^\/uploads\/donation-/);
    });
  });
});