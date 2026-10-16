import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth, apiError } from './AuthContext';
import { SOCKET_URL } from '../config';
const NotificationContext = createContext();
export const useNotifications = () => useContext(NotificationContext);
const normalized = record => ({ ...record, id: record._id, timestamp: record.createdAt });
export const NotificationProvider = ({ children }) => {
  const { user, api } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const userId = user?._id;
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const addNotification = useCallback((title, message, type = 'info') => {
    setToasts(prev => [...prev.slice(-3), { id: `${Date.now()}-${Math.random()}`, title, message, type }]);
  }, []);
  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(() => setToasts(prev => prev.slice(1)), 5000);
    return () => clearTimeout(timer);
  }, [toasts]);
  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      if (currentUser.current !== userId) return;
      setNotifications(data.notifications.map(normalized));
      setUnreadCount(data.unreadCount);
      setError('');
    } catch (err) { if (currentUser.current === userId) setError(apiError(err)); }
    finally { if (currentUser.current === userId) setLoading(false); }
  }, [api, userId]);
  useEffect(() => {
    setNotifications([]); setUnreadCount(0); setToasts([]); setError('');
    if (!userId) return;
    const connection = io(SOCKET_URL, { autoConnect: false, auth: cb => cb({ token: localStorage.getItem('accessToken') }) });
    connection.on('connect', refresh);
    connection.on('donation-created', data => addNotification('New food available', data.title, 'donation'));
    connection.on('notification', record => {
      if (currentUser.current !== userId) return;
      const item = normalized(record);
      setNotifications(prev => [item, ...prev.filter(n => n.id !== item.id)].slice(0, 100));
      if (!item.read) setUnreadCount(count => count + 1);
      addNotification(item.title, item.message, item.type);
    });
    // Polling reconciles the inbox even if a socket was disconnected or an event was missed.
    const interval = setInterval(refresh, 60000);
    const reconnect = () => { connection.disconnect(); connection.connect(); };
    connection.on('disconnect', reason => { if (reason === 'io server disconnect') setSocket(null); });
    connection.on('connect', () => setSocket(connection));
    window.addEventListener('auth-token-changed', reconnect);
    refresh(); connection.connect();
    return () => { clearInterval(interval); window.removeEventListener('auth-token-changed', reconnect); connection.disconnect(); setSocket(null); };
  }, [userId, refresh, addNotification]);
  const mutate = async (method, path) => {
    try { await api[method](path); await refresh(); }
    catch (err) { if (currentUser.current === userId) setError(apiError(err)); }
  };
  return <NotificationContext.Provider value={{ notifications, unreadCount, toasts, socket, error, loading, refresh, addNotification,
    markAsRead: id => mutate('patch', `/notifications/${id}/read`),
    markAllAsRead: () => mutate('patch', '/notifications/read-all'),
    deleteNotification: id => mutate('delete', `/notifications/${id}`) }}>
    {children}
    <div aria-live="polite" className="fixed bottom-5 right-4 left-4 sm:left-auto z-[9999] flex flex-col gap-2 sm:w-80">
      {toasts.map(toast => <div key={toast.id} className="p-4 rounded-xl shadow-xl border border-emerald-200 bg-white text-slate-900">
        <div className="flex justify-between gap-3"><strong className="text-sm">{toast.title}</strong><button aria-label="Dismiss notification" onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>×</button></div>
        <p className="text-sm text-slate-600 mt-1">{toast.message}</p>
      </div>)}
    </div>
  </NotificationContext.Provider>;
};
