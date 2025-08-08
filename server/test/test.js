const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import the app
const app = require('../index');

describe('Food Distribution Platform API Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    if (process.env.NODE_ENV !== 'test') {
      console.log('Skipping tests in non-test environment');
      return;
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    if (process.env.NODE_ENV === 'test') {
      await mongoose.connection.close();
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('Authentication', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'donor',
        organization: 'Test Restaurant'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should login a user', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });
  });

  describe('Donations', () => {
    let authToken;
    let donationId;

    beforeAll(async () => {
      // Login to get auth token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      authToken = loginResponse.body.accessToken;
    });

    it('should create a new donation', async () => {
      const donationData = {
        title: 'Fresh Vegetables',
        description: 'Assorted fresh vegetables from our garden',
        foodType: 'produce',
        quantity: {
          amount: 20,
          unit: 'pounds'
        },
        preparationDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        pickupWindow: {
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        },
        location: {
          address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001'
          },
          coordinates: {
            coordinates: [-74.0060, 40.7128]
          }
        }
      };

      const response = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(donationData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Donation created successfully');
      expect(response.body).toHaveProperty('donation');
      expect(response.body.donation).toHaveProperty('title', 'Fresh Vegetables');
      
      donationId = response.body.donation._id;
    });

    it('should get all donations', async () => {
      const response = await request(app)
        .get('/api/donations')
        .expect(200);

      expect(response.body).toHaveProperty('donations');
      expect(response.body).toHaveProperty('totalPages');
      expect(response.body).toHaveProperty('currentPage');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.donations)).toBe(true);
    });

    it('should get a specific donation', async () => {
      const response = await request(app)
        .get(`/api/donations/${donationId}`)
        .expect(200);

      expect(response.body).toHaveProperty('donation');
      expect(response.body.donation).toHaveProperty('_id', donationId);
    });
  });

  describe('User Profile', () => {
    let authToken;

    beforeAll(async () => {
      // Login to get auth token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      authToken = loginResponse.body.accessToken;
    });

    it('should get user profile', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).toHaveProperty('profile');
    });

    it('should update user profile', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567890'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Profile updated successfully');
      expect(response.body.user.profile.firstName).toBe('Jane');
      expect(response.body.user.profile.lastName).toBe('Smith');
    });
  });
});

// Simple test runner
if (require.main === module) {
  console.log('Running API tests...');
  
  // This would normally use a proper test runner like Jest
  // For now, just export the tests
  module.exports = {
    runTests: () => {
      console.log('Tests completed');
    }
  };
} 