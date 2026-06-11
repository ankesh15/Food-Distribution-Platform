import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { SOCKET_URL } from '../config';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-init-1',
      title: 'Welcome to FoodShare!',
      message: 'Explore the live food feed or publish food surplus to help your community.',
      type: 'info',
      read: false,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'notif-init-2',
      title: 'Urgent: Fresh Veggies Available',
      message: 'Eco-Bakery NYC listed fresh organic produce near your area.',
      type: 'donation',
      read: false,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    }
  ]);
  const [toasts, setToasts] = useState([]);
  const [socket, setSocket] = useState(null);

  const addToast = React.useCallback((title, message, type = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const addNotification = React.useCallback((title, message, type = 'info') => {
    const newNotif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title,
      message,
      type,
      read: false,
      timestamp: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
    addToast(title, message, type);
  }, [addToast]);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
      }
      return;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('⚡ Connected to websocket');
      newSocket.emit('join-room', user.role);
      newSocket.emit('join-room', `user-${user._id}`);
    });

    // Handle real-time socket events
    newSocket.on('donation-created', (data) => {
      addNotification(
        'New Donation Listed',
        `${data.donorName || 'A donor'} listed: ${data.title}`,
        'donation'
      );
    });

    newSocket.on('request-created', (data) => {
      addNotification(
        'New Food Request',
        `${data.recipientName || 'A shelter'} requested: ${data.title}`,
        'request'
      );
    });

    newSocket.on('volunteer-assigned', (data) => {
      addNotification(
        'Delivery Courier Vetted',
        `Volunteer assigned to pick up: ${data.title}`,
        'volunteer'
      );
    });

    newSocket.on('delivery-completed', (data) => {
      addNotification(
        'Delivery Completed!',
        `Food listing "${data.title}" successfully reached its shelter destination.`,
        'success'
      );
    });

    newSocket.on('announcement', (data) => {
      addNotification(
        'System Announcement',
        data.message,
        'info'
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        addNotification,
        toasts,
        socket,
      }}
    >
      {children}
      {/* Toast Alert Portal Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 100 }}
              className={`p-4 rounded-xl shadow-xl border flex flex-col gap-1 backdrop-blur-md bg-white/95 ${
                toast.type === 'donation'
                  ? 'border-emerald-200 text-emerald-950'
                  : toast.type === 'request'
                  ? 'border-amber-200 text-amber-950'
                  : toast.type === 'success'
                  ? 'border-blue-200 text-blue-950'
                  : 'border-slate-200 text-slate-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs uppercase tracking-wider">
                  {toast.type === 'donation'
                    ? '✨ Donation'
                    : toast.type === 'request'
                    ? '📦 Request'
                    : toast.type === 'success'
                    ? '✅ Success'
                    : '🔔 Notification'}
                </span>
                <button
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
              <h4 className="font-bold text-sm">{toast.title}</h4>
              <p className="text-xs text-slate-600">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};
