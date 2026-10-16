import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Donations from './Donations';
import DonationDetail from './DonationDetail';
import Login from './Login';
import Register from './Register';
const mockAuth = { user: null, getDonations: jest.fn(), getDonationById: jest.fn(), claimDonation: jest.fn(), login: jest.fn(), clearError: jest.fn(), error: null };
jest.mock('../context/AuthContext', () => ({ useAuth: () => mockAuth }));
const renderRoute = (element, path = '/', route = '/') => render(<MemoryRouter initialEntries={[path]}><Routes><Route path={route} element={element} /></Routes></MemoryRouter>);
const donation = { _id: 'food', title: 'Community vegetables', status: 'available', foodType: 'produce', description: 'Freshly packed vegetables', quantity: { amount: 2, unit: 'kilograms' }, preparationDate: new Date().toISOString(), expiryDate: new Date(Date.now() + 86400000).toISOString(), pickupWindow: { startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString() }, location: { address: { street: '12 Lane', city: 'Pune' } }, donor: { _id: 'donor', profile: { firstName: 'Donor' } } };
beforeEach(() => { jest.clearAllMocks(); mockAuth.user = null; mockAuth.getDonations.mockResolvedValue({ donations: [], total: 0, totalPages: 0 }); mockAuth.getDonationById.mockResolvedValue({ donation }); });
test('discovery displays server failures instead of silently showing no food', async () => {
  mockAuth.getDonations.mockResolvedValue({ donations: [], error: 'Database unavailable' });
  renderRoute(<Donations />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
});
test('discovery applies the available filter and server-backed pagination', async () => {
  renderRoute(<Donations />);
  await waitFor(() => expect(mockAuth.getDonations).toHaveBeenCalledWith(expect.objectContaining({ status: 'available', page: 1, limit: 9 })));
});
test('guest donation details link to login before claiming', async () => {
  renderRoute(<DonationDetail />, '/donations/food', '/donations/:id');
  expect(await screen.findByRole('button', { name: 'Login to Claim' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Claim Listing' })).not.toBeInTheDocument();
});
test('recipient sees an actionable claim and its server rejection', async () => {
  mockAuth.user = { _id: 'recipient', role: 'recipient' }; mockAuth.claimDonation.mockResolvedValue({ success: false, error: 'Donation already claimed' });
  renderRoute(<DonationDetail />, '/donations/food', '/donations/:id');
  fireEvent.click(await screen.findByRole('button', { name: 'Claim Listing' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Donation already claimed');
});
test('donor has edit and cancellation actions for an owned listing', async () => {
  mockAuth.user = { _id: 'donor', role: 'donor' };
  renderRoute(<DonationDetail />, '/donations/food', '/donations/:id');
  expect(await screen.findByRole('button', { name: 'Edit donation' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancel donation' })).toBeInTheDocument();
});
test('login submits entered credentials', async () => {
  mockAuth.login.mockResolvedValue({ success: false }); renderRoute(<Login />);
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'person@example.com' } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'secret-password' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in|log in|login/i }));
  await waitFor(() => expect(mockAuth.login).toHaveBeenCalledWith('person@example.com', 'secret-password'));
});

test('registration explains mismatched passwords inline without submitting', async () => {
  mockAuth.register = jest.fn(); renderRoute(<Register />);
  fireEvent.change(screen.getByLabelText(/^first name/i), { target: { value: 'Asha' } });
  fireEvent.change(screen.getByLabelText(/^last name/i), { target: { value: 'Patel' } });
  fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'person@example.com' } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'Strong-password-123' } });
  fireEvent.change(screen.getByLabelText(/^confirm password/i), { target: { value: 'different-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match');
  expect(mockAuth.register).not.toHaveBeenCalled();
});
