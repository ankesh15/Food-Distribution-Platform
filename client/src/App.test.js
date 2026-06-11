import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element }) => element,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  Navigate: ({ to }) => <div data-testid="navigate" data-to={to}>Redirecting...</div>,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({ id: '123' }),
}));

// Mock react-leaflet and leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  Polyline: () => <div data-testid="polyline" />,
  useMap: () => ({
    setView: jest.fn(),
  }),
}));

jest.mock('leaflet', () => {
  const L = {
    divIcon: jest.fn().mockReturnValue({}),
    Icon: {
      Default: {
        prototype: {}
      }
    }
  };
  return L;
});

const mockUser = { role: 'admin', profile: { firstName: 'Admin', lastName: 'User' } };

// Mock AuthContext with all methods
jest.mock('./context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getPublicStats: jest.fn().mockResolvedValue({
      totalDonors: 10,
      totalRecipients: 5,
      totalDonations: 100,
      successRate: 95,
    }),
    getDonations: jest.fn().mockResolvedValue({ donations: [], totalPages: 1, total: 0 }),
    claimDonation: jest.fn().mockResolvedValue({ success: true }),
    getDonationById: jest.fn().mockResolvedValue(null),
    createDonation: jest.fn().mockResolvedValue({ success: true }),
    updateDonation: jest.fn().mockResolvedValue({ success: true }),
    deleteDonation: jest.fn().mockResolvedValue({ success: true }),
    cancelDonation: jest.fn().mockResolvedValue({ success: true }),
    pickupDonation: jest.fn().mockResolvedValue({ success: true }),
    completeDonation: jest.fn().mockResolvedValue({ success: true }),
    getMyDonations: jest.fn().mockResolvedValue([]),
    getMyClaimedDonations: jest.fn().mockResolvedValue([]),
    getAdminStats: jest.fn().mockResolvedValue(null),
    getAdminUsers: jest.fn().mockResolvedValue({ users: [], totalPages: 1 }),
    getAdminDonations: jest.fn().mockResolvedValue({ donations: [], totalPages: 1 }),
    toggleUserStatus: jest.fn().mockResolvedValue({ success: true }),
    adminDeleteDonation: jest.fn().mockResolvedValue({ success: true }),
    changePassword: jest.fn().mockResolvedValue({ success: true }),
  }),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

// Mock NotificationContext
jest.mock('./context/NotificationContext', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    addNotification: jest.fn(),
    toasts: [],
  }),
  NotificationProvider: ({ children }) => <div>{children}</div>,
}));

// Mock TrackingContext
jest.mock('./context/TrackingContext', () => ({
  useTracking: () => ({
    activeDeliveries: [],
    myLocation: null,
    isTrackingSelf: false,
    startTrackingSelf: jest.fn(),
    stopTrackingSelf: jest.fn(),
  }),
  TrackingProvider: ({ children }) => <div>{children}</div>,
}));

import App from './App';

test('renders FoodShare application and navbar brand', () => {
  render(<App />);
  const brandElements = screen.getAllByText(/FoodShare/i);
  expect(brandElements.length).toBeGreaterThan(0);
});

test('redirects authenticated users from public-only routes to dashboard', () => {
  render(<App />);
  const navigateEls = screen.getAllByTestId('navigate');
  expect(navigateEls.length).toBeGreaterThan(0);
  expect(navigateEls[0]).toHaveAttribute('data-to', '/dashboard');
});
