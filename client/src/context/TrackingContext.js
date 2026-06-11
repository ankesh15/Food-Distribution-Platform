import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';

const TrackingContext = createContext();

export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
};

export const TrackingProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket, addNotification } = useNotifications();
  
  const [activeDeliveries, setActiveDeliveries] = useState([
    {
      id: 'del-101',
      title: 'Bread Distribution Delivery',
      donorName: 'Eco-Bakery NYC',
      recipientName: 'Brooklyn Hope Shelter',
      status: 'in-transit',
      volunteerName: 'Alex Mercer',
      volunteerCoords: [40.7128, -74.0060], // Start New York
      donorCoords: [40.7188, -74.0080],
      recipientCoords: [40.7058, -73.9960],
      eta: '12 mins',
      progress: 45
    },
    {
      id: 'del-102',
      title: 'Fresh Dairy Surplus Pack',
      donorName: 'Metro Food Markets',
      recipientName: 'Harlem Family Center',
      status: 'pending-pickup',
      volunteerName: 'Sarah Jenkins',
      volunteerCoords: [40.8115, -73.9465], // Harlem
      donorCoords: [40.8015, -73.9565],
      recipientCoords: [40.8215, -73.9365],
      eta: 'Waiting pickup',
      progress: 0
    }
  ]);

  const [myLocation, setMyLocation] = useState(null);
  const [isTrackingSelf, setIsTrackingSelf] = useState(false);
  const watchIdRef = useRef(null);

  // Volunteer starts broadcasting location
  const startTrackingSelf = (deliveryId) => {
    if (!navigator.geolocation) {
      alert('Geolocation API not supported in this browser.');
      return;
    }

    setIsTrackingSelf(true);

    // Initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = [latitude, longitude];
        setMyLocation(coords);
        broadcastLocation(deliveryId, coords);
      },
      (error) => {
        console.error('Geolocation initial error:', error);
      },
      { enableHighAccuracy: true }
    );

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = [latitude, longitude];
        setMyLocation(coords);
        broadcastLocation(deliveryId, coords);
      },
      (error) => {
        console.error('Geolocation watch error:', error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const stopTrackingSelf = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTrackingSelf(false);
    setMyLocation(null);
  };

  const broadcastLocation = (deliveryId, coords) => {
    if (socket && socket.connected) {
      socket.emit('broadcast-volunteer-location', {
        deliveryId,
        volunteerId: user?._id,
        volunteerName: `${user?.profile?.firstName} ${user?.profile?.lastName}`,
        coordinates: coords,
      });
    }

    // Fallback/Simulated Update in Local State
    setActiveDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              volunteerCoords: coords,
              progress: Math.min(d.progress + 5, 100),
              eta: `${Math.max(12 - Math.floor(d.progress / 10), 2)} mins`,
            }
          : d
      )
    );
  };

  // Socket listener for volunteer updates
  useEffect(() => {
    if (!socket) return;

    socket.on('volunteer-location-update', (data) => {
      setActiveDeliveries((prev) =>
        prev.map((d) =>
          d.id === data.deliveryId
            ? {
                ...d,
                volunteerCoords: data.coordinates,
                volunteerName: data.volunteerName,
                status: 'in-transit',
              }
            : d
        )
      );
    });

    return () => {
      socket.off('volunteer-location-update');
    };
  }, [socket]);

  // Simulation loop for demonstration/resume quality UI
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveDeliveries((prev) =>
        prev.map((d) => {
          if (d.status === 'in-transit') {
            // Calculate step towards recipientCoords
            const [vLat, vLng] = d.volunteerCoords;
            const [rLat, rLng] = d.recipientCoords;
            
            // Vector path updates
            const stepLat = (rLat - vLat) * 0.05;
            const stepLng = (rLng - vLng) * 0.05;
            const newLat = vLat + stepLat;
            const newLng = vLng + stepLng;
            
            const nextProgress = Math.min(d.progress + 4, 100);
            const nextStatus = nextProgress >= 100 ? 'completed' : 'in-transit';

            if (nextStatus === 'completed' && d.progress < 100) {
              setTimeout(() => {
                addNotification(
                  'Delivery Reached Destination',
                  `Alex Mercer reached ${d.recipientName} for ${d.title}`,
                  'success'
                );
              }, 0);
            }

            return {
              ...d,
              volunteerCoords: [newLat, newLng],
              progress: nextProgress,
              status: nextStatus,
              eta: nextStatus === 'completed' ? 'Arrived' : `${Math.max(12 - Math.floor(nextProgress / 8), 1)} mins`
            };
          }
          return d;
        })
      );
    }, 8000);

    return () => clearInterval(timer);
  }, [addNotification]);

  return (
    <TrackingContext.Provider
      value={{
        activeDeliveries,
        myLocation,
        isTrackingSelf,
        startTrackingSelf,
        stopTrackingSelf,
        setActiveDeliveries
      }}
    >
      {children}
    </TrackingContext.Provider>
  );
};
