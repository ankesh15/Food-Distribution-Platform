import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

const AuthContext = createContext();

// Create axios instance with base URL
export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Share one refresh across concurrent requests and retry each request only once.
let refreshPromise;
const clearSession = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.dispatchEvent(new Event('auth-expired'));
};
const saveTokens = data => {
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  window.dispatchEvent(new Event('auth-token-changed'));
};
api.interceptors.response.use(response => response, async error => {
  const request = error.config;
  const isAuthAttempt = /\/auth\/(login|register|refresh)$/.test(request?.url || '');
  if (error.response?.status !== 401 || !request || request._retry || isAuthAttempt) return Promise.reject(error);
  request._retry = true;
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) { clearSession(); return Promise.reject(error); }
  if (!refreshPromise) {
    refreshPromise = axios.post(`${API_URL}/auth/refresh`, { refreshToken }, { timeout: 15000 })
      .then(({ data }) => {
        if (localStorage.getItem('refreshToken') !== refreshToken) throw new Error('Session changed');
        saveTokens(data);
        return data.accessToken;
      }).catch(refreshError => {
        if (localStorage.getItem('refreshToken') === refreshToken && refreshError.response?.status === 401) clearSession();
        throw refreshError;
      }).finally(() => { refreshPromise = null; });
  }
  const token = await refreshPromise;
  request.headers.Authorization = `Bearer ${token}`;
  return api(request);
});
export const apiError = error => error.response?.data?.errors?.[0]?.msg || error.response?.data?.message || 'Unable to reach the server. Please try again.';

// ─── Donation API Methods ───────────────────────────────────

const getDonations = async (filters = {}) => {
  try {
    const response = await api.get('/donations', { params: filters });
    return response.data;
  } catch (error) {
    return { donations: [], totalPages: 0, currentPage: 1, total: 0, error: apiError(error) };
  }
};

const getDonationById = async (id) => {
  try {
    const response = await api.get(`/donations/${id}`);
    return response.data;
  } catch (error) {
    return { error: apiError(error) };
  }
};

const createDonation = async (donationData) => {
  try {
    const response = await api.post('/donations', donationData);
    return { success: true, donation: response.data.donation };
  } catch (error) {
    const message = apiError(error);
    return { success: false, error: message };
  }
};

const updateDonation = async (id, donationData) => {
  try {
    const response = await api.put(`/donations/${id}`, donationData);
    return { success: true, donation: response.data.donation };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to update donation';
    return { success: false, error: message };
  }
};

const deleteDonation = async (id) => {
  try {
    await api.delete(`/donations/${id}`);
    return { success: true };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to delete donation';
    return { success: false, error: message };
  }
};

const cancelDonation = async (id) => {
  try {
    const response = await api.post(`/donations/${id}/cancel`);
    return { success: true, donation: response.data.donation };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to cancel donation';
    return { success: false, error: message };
  }
};

const claimDonation = async (id) => {
  try {
    const response = await api.post(`/donations/${id}/claim`);
    return { success: true, donation: response.data.donation };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to claim donation';
    return { success: false, error: message };
  }
};

const pickupDonation = async (id) => {
  try {
    const response = await api.post(`/donations/${id}/pickup`);
    return { success: true, donation: response.data.donation };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to mark donation as picked up';
    return { success: false, error: message };
  }
};

const completeDonation = async (id) => {
  try {
    const response = await api.post(`/donations/${id}/complete`);
    return { success: true, donation: response.data.donation };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to complete donation';
    return { success: false, error: message };
  }
};

const getMyDonations = async (filters = {}) => {
  try {
    const response = await api.get('/users/donations', { params: filters });
    return response.data.donations || [];
  } catch (error) {
    return [];
  }
};

const getMyClaimedDonations = async (filters = {}) => {
  try {
    const response = await api.get('/users/claimed-donations', { params: filters });
    return response.data.donations || [];
  } catch (error) {
    return [];
  }
};

// ─── Admin API Methods ──────────────────────────────────────

const getAdminStats = async () => {
  try {
    const response = await api.get('/admin/stats');
    return response.data;
  } catch (error) {
    throw error;
  }
};

const getAdminUsers = async (filters = {}) => {
  try {
    const response = await api.get('/admin/users', { params: filters });
    return response.data;
  } catch (error) {
    throw error;
  }
};

const getAdminDonations = async (filters = {}) => {
  try {
    const response = await api.get('/admin/donations', { params: filters });
    return response.data;
  } catch (error) {
    throw error;
  }
};

const toggleUserStatus = async (userId, isActive) => {
  try {
    const response = await api.patch(`/admin/users/${userId}/status`, { isActive });
    return { success: true, user: response.data.user };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || 'Failed to update user status' };
  }
};

const adminDeleteDonation = async (id) => {
  try {
    await api.delete(`/admin/donations/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || 'Failed to delete donation' };
  }
};

const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await api.put('/users/password', { currentPassword, newPassword });
    return { success: true, message: response.data.message };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to change password';
    return { success: false, error: message };
  }
};

const getPublicStats = async () => {
  try {
    const response = await api.get('/stats/public');
    return response.data;
  } catch (error) {
    return null;
  }
};

// ─── Auth Provider ──────────────────────────────────────────

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth-expired', onExpired);
    return () => window.removeEventListener('auth-expired', onExpired);
  }, []);

  // Check if user is logged in on app start
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyToken = async () => {
    try {
      const response = await api.post('/auth/verify');
      setUser(response.data.user);
    } catch (error) {
      if (error.response?.status === 401) clearSession();
      setError(apiError(error));
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });
      
      const { accessToken, refreshToken, user } = response.data;
      
      saveTokens({ accessToken, refreshToken });
      setUser(user);
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await api.post('/auth/register', userData);

      const { accessToken, refreshToken, user } = response.data;

      saveTokens({ accessToken, refreshToken });
      setUser(user);

      return { success: true };
    } catch (error) {
      const firstError = error.response?.data?.errors?.[0];
      const message =
        (firstError && (firstError.msg || firstError.message)) ||
        (typeof error.response?.data?.errors === 'string' ? error.response.data.errors : null) ||
        error.response?.data?.message ||
        'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async (localOnly = false) => {
    try {
      if (!localOnly) await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearSession();
      setUser(null);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const response = await api.put('/users/profile', profileData);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    clearError,
    api,
    // Donation methods
    getDonations,
    getDonationById,
    createDonation,
    updateDonation,
    deleteDonation,
    cancelDonation,
    claimDonation,
    pickupDonation,
    completeDonation,
    getMyDonations,
    getMyClaimedDonations,
    // Admin methods
    getAdminStats,
    getAdminUsers,
    getAdminDonations,
    toggleUserStatus,
    adminDeleteDonation,
    // Account methods
    changePassword,
    getPublicStats,
    uploadImage: async (file) => {
      try {
        const formData = new FormData();
        formData.append('image', file);
        const response = await api.post('/donations/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return { success: true, url: response.data.url };
      } catch (error) {
        const msg = error.response?.data?.message || 'Failed to upload image';
        return { success: false, error: msg };
      }
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};