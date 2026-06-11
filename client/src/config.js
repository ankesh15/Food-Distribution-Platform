// Centralized API and Socket.IO configuration for Production deployment

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Derived or explicit Socket URL
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || API_URL.replace(/\/api$/, '');
