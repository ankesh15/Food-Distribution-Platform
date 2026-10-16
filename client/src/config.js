// CRA's development proxy and the production Express server share the /api contract.
export const API_URL = (process.env.REACT_APP_API_URL || '/api').replace(/\/$/, '');
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || (
  process.env.NODE_ENV === 'development' && !process.env.REACT_APP_API_URL
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : new URL(API_URL, window.location.origin).origin
);
export const assetUrl = path => path?.startsWith('/uploads/') ? `${new URL(API_URL, window.location.origin).origin}${path}` : path;
