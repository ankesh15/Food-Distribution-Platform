import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

const mockApi = { get: jest.fn() };
const mockAuth = { user: null, loading: false, api: mockApi, getPublicStats: jest.fn(), getDonations: jest.fn() };
jest.mock('./context/AuthContext', () => ({ useAuth: () => mockAuth, apiError: () => 'Server unavailable', AuthProvider: ({ children }) => children }));
jest.mock('./context/NotificationContext', () => ({ useNotifications: () => ({ unreadCount: 0 }), NotificationProvider: ({ children }) => children }));
jest.mock('./context/TrackingContext', () => ({ useTracking: () => ({ activeDeliveries: [] }), TrackingProvider: ({ children }) => children }));
jest.mock('react-leaflet', () => ({ MapContainer: ({ children }) => <div>{children}</div>, TileLayer: () => null, CircleMarker: ({ children }) => <div>{children}</div>, Popup: ({ children }) => <div>{children}</div> }));
beforeEach(() => {
  window.history.pushState({}, '', '/');
  mockAuth.user = null; mockAuth.loading = false;
  mockAuth.getPublicStats.mockResolvedValue({ totalDonors: 0, totalRecipients: 0, totalDonations: 0, successRate: 0 });
  mockApi.get.mockResolvedValue({ data: { states: {}, monthly: [], quantities: [], donations: [], totalPages: 0 } });
});
test('renders the FoodShare landing page and accessible navigation', async () => {
  render(<App />);
  expect(screen.getByRole('link', { name: 'FoodShare home' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Skip to content' })).toBeInTheDocument();
  await screen.findByText('Good food. A clear path.');
});
test('authenticated public-route visitors reach the real dashboard route', async () => {
  mockAuth.user = { _id: 'operator', role: 'admin', profile: { firstName: 'Admin' } };
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Welcome back, Admin.' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/dashboard');
});
test('recipient cannot enter donor creation page', async () => {
  mockAuth.user = { _id: 'recipient', role: 'recipient', profile: { firstName: 'Recipient' } };
  window.history.pushState({}, '', '/create-donation'); render(<App />);
  expect(await screen.findByRole('heading', { name: 'Welcome back, Recipient.' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/dashboard');
});
test('unknown routes provide a recovery link', () => {
  window.history.pushState({}, '', '/missing-page'); render(<App />);
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Browse available food' })).toHaveAttribute('href', '/donations');
});
