import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

const AuthContext = createContext();

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
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

// Response interceptor for automatic token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Production-safe network error handling
    if (!error.response) {
      error.response = {
        status: 503,
        data: {
          message: 'Network Error: Cannot connect to the server. Please check your internet connection.'
        }
      };
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        api.defaults.headers.Authorization = `Bearer ${data.accessToken}`;
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Donation API Methods ───────────────────────────────────

const getDonations = async (filters = {}) => {
  try {
    const response = await api.get('/donations', { params: filters });
    return response.data;
  } catch (error) {
    return { donations: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

const getDonationById = async (id) => {
  try {
    const response = await api.get(`/donations/${id}`);
    return response.data;
  } catch (error) {
    return null;
  }
};

const createDonation = async (donationData) => {
  try {
    const response = await api.post('/donations', donationData);
    return { success: true, donation: response.data };
  } catch (error) {
    const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Failed to create donation';
    return { success: false, error: message };
  }
};

const updateDonation = async (id, donationData) => {
  try {
    const response = await api.put(`/donations/${id}`, donationData);
    return { success: true, donation: response.data };
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
    return { success: true, donation: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to cancel donation';
    return { success: false, error: message };
  }
};

const claimDonation = async (id) => {
  try {
    const response = await api.post(`/donations/${id}/claim`);
    return { success: true, donation: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to claim donation';
    return { success: false, error: message };
  }
};

const pickupDonation = async (id) => {
  try {
    const response = await api.post(`/donations/${id}/pickup`);
    return { success: true, donation: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to mark donation as picked up';
    return { success: false, error: message };
  }
};

const completeDonation = async (id) => {
  try {
    const response = await api.post(`/donations/${id}/complete`);
    return { success: true, donation: response.data };
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
    return null;
  }
};

const getAdminUsers = async (filters = {}) => {
  try {
    const response = await api.get('/admin/users', { params: filters });
    return response.data;
  } catch (error) {
    return { users: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

const getAdminDonations = async (filters = {}) => {
  try {
    const response = await api.get('/admin/donations', { params: filters });
    return response.data;
  } catch (error) {
    return { donations: [], totalPages: 0, currentPage: 1, total: 0 };
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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });
      
      const { accessToken, refreshToken, user } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
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

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(user);

      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.errors ||
        error.response?.data?.message ||
        'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};