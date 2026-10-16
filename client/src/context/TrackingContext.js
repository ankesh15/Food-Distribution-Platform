import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, apiError } from './AuthContext';
import { useNotifications } from './NotificationContext';
const TrackingContext = createContext();
export const useTracking = () => useContext(TrackingContext);
export const TrackingProvider = ({ children }) => {
  const { user, api } = useAuth();
  const { socket } = useNotifications();
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const userId = user?._id;
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await api.get('/users/pickups', { params: { page } });
      if (currentUser.current !== userId) return;
      setActiveDeliveries(data.donations); setTotalPages(data.totalPages); setError('');
    } catch (err) { if (currentUser.current === userId) setError(apiError(err)); }
    finally { if (currentUser.current === userId) setLoading(false); }
  }, [api, userId, page]);
  useEffect(() => { setActiveDeliveries([]); if (userId) refresh(); }, [userId, refresh]);
  useEffect(() => {
    const events = ['donation-claimed', 'donation-picked-up', 'donation-completed', 'donation-cancelled'];
    events.forEach(event => socket?.on(event, refresh));
    const timer = userId ? setInterval(refresh, 60000) : null;
    return () => { events.forEach(event => socket?.off(event, refresh)); if (timer) clearInterval(timer); };
  }, [socket, refresh, userId]);
  return <TrackingContext.Provider value={{ activeDeliveries, error, loading, refresh, page, setPage, totalPages }}>{children}</TrackingContext.Provider>;
};
