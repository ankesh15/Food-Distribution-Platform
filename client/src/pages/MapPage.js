import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTracking } from '../context/TrackingContext';
import { useAuth } from '../context/AuthContext';
import {
  Truck,
  Layers,
  Compass,
  TrendingUp,
} from 'lucide-react';

// Reset leaflet default icon bug
delete L.Icon.Default.prototype._getIconUrl;

const createCustomIcon = (color) => {
  return L.divIcon({
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background-color: white;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        border: 3px solid ${color};
      ">
        <div style="
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background-color: ${color};
        "></div>
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
};

const icons = {
  donor: createCustomIcon('#10b981'), // Emerald
  request: createCustomIcon('#f59e0b'), // Amber
  volunteer: createCustomIcon('#3b82f6'), // Blue
  center: createCustomIcon('#64748b'), // Slate
};

// Component to dynamically pan and zoom map
const ChangeMapView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 13);
    }
  }, [center, zoom, map]);
  return null;
};

const MapPage = () => {
  const { user } = useAuth();
  const { activeDeliveries, myLocation, isTrackingSelf, startTrackingSelf, stopTrackingSelf } = useTracking();
  
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]);
  const [mapZoom, setMapZoom] = useState(13);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  
  const [filters, setFilters] = useState({
    donors: true,
    requests: true,
    volunteers: true,
    centers: true,
  });

  // Center on user location if available
  useEffect(() => {
    if (myLocation) {
      setMapCenter(myLocation);
    }
  }, [myLocation]);

  const handleSelectDelivery = (delivery) => {
    setSelectedDelivery(delivery);
    setMapCenter(delivery.volunteerCoords);
    setMapZoom(14);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-6">
      {/* Left panel: Active deliveries and controls */}
      <div className="w-full lg:w-96 flex flex-col gap-4 overflow-y-auto">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col gap-4">
          <div>
            <h3 className="font-extrabold text-lg tracking-tight text-slate-900 flex items-center gap-2">
              <Compass className="text-emerald-500" size={20} />
              Delivery Tracker
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live logistics monitor for food distributions.
            </p>
          </div>

          {/* Location Access Banner for Volunteers */}
          {user?.role === 'admin' || user?.role === 'donor' || true ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Broadcaster State</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isTrackingSelf ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-200 text-slate-600'
                }`}>
                  {isTrackingSelf ? 'Broadcasting' : 'Inactive'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Volunteers can share their device GPS live tracking coordinates during deliveries.
              </p>
              <button
                onClick={() => {
                  if (isTrackingSelf) {
                    stopTrackingSelf();
                  } else {
                    startTrackingSelf('del-101');
                  }
                }}
                className={`w-full py-2 rounded-lg text-xs font-semibold shadow-sm transition-all ${
                  isTrackingSelf
                    ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                {isTrackingSelf ? 'Stop Broadcast' : 'Start Live GPS Broadcast'}
              </button>
            </div>
          ) : null}

          {/* Visibility filters */}
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Layers size={14} /> Layers Filter
            </span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {Object.keys(filters).map((key) => (
                <button
                  key={key}
                  onClick={() => setFilters((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className={`py-1.5 px-2.5 rounded-lg border text-left text-xs font-semibold capitalize flex items-center gap-1.5 transition-colors ${
                    filters[key]
                      ? 'border-emerald-200 bg-emerald-50/40 text-emerald-700'
                      : 'border-slate-200 text-slate-500 bg-transparent'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    key === 'donors'
                      ? 'bg-emerald-500'
                      : key === 'requests'
                      ? 'bg-amber-500'
                      : key === 'volunteers'
                      ? 'bg-blue-500'
                      : 'bg-slate-400'
                  }`}></span>
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Deliveries list */}
        <div className="flex-1 p-5 bg-white border border-slate-200 rounded-2xl flex flex-col gap-4 overflow-y-auto">
          <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Truck size={16} className="text-emerald-500" />
            Active Transits
          </h4>

          <div className="flex flex-col gap-3">
            {activeDeliveries.map((delivery) => (
              <div
                key={delivery.id}
                onClick={() => handleSelectDelivery(delivery)}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                  selectedDelivery?.id === delivery.id
                    ? 'border-emerald-500 bg-emerald-50/10 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-slate-900">{delivery.title}</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md font-bold">
                    {delivery.eta}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="font-bold text-slate-600">From:</span> {delivery.donorName}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="font-bold text-slate-600">To:</span> {delivery.recipientName}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="font-bold text-slate-600">Courier:</span> {delivery.volunteerName}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold mb-1">
                    <span>Progress</span>
                    <span>{delivery.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${delivery.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel: Leaflet Map */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm relative min-h-[400px]">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ChangeMapView center={mapCenter} zoom={mapZoom} />

          {/* Donor Markers */}
          {filters.donors && (
            <>
              <Marker position={[40.7188, -74.0080]} icon={icons.donor}>
                <Popup>
                  <div className="p-2 text-left">
                    <h4 className="font-extrabold text-xs text-slate-900">Eco-Bakery NYC</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Donor Hub - Fresh sourdoughs & bread rolls ready</p>
                  </div>
                </Popup>
              </Marker>
              <Marker position={[40.8015, -73.9565]} icon={icons.donor}>
                <Popup>
                  <div className="p-2 text-left">
                    <h4 className="font-extrabold text-xs text-slate-900">Metro Food Markets</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Donor Hub - Fresh organic milk & eggs surplus</p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* Requests Markers */}
          {filters.requests && (
            <>
              <Marker position={[40.7058, -73.9960]} icon={icons.request}>
                <Popup>
                  <div className="p-2 text-left">
                    <h4 className="font-extrabold text-xs text-slate-900">Brooklyn Hope Shelter</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Shelter Point - Requires 20+ hot meals daily</p>
                  </div>
                </Popup>
              </Marker>
              <Marker position={[40.8215, -73.9365]} icon={icons.request}>
                <Popup>
                  <div className="p-2 text-left">
                    <h4 className="font-extrabold text-xs text-slate-900">Harlem Family Center</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Shelter Point - Family food boxes distribution</p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* Volunteers Live Tracking Markers */}
          {filters.volunteers &&
            activeDeliveries
              .filter((d) => d.status === 'in-transit')
              .map((delivery) => (
                <Marker
                  key={delivery.id}
                  position={delivery.volunteerCoords}
                  icon={icons.volunteer}
                >
                  <Popup>
                    <div className="p-2 text-left">
                      <h4 className="font-extrabold text-xs text-slate-900">
                        Courier: {delivery.volunteerName}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Assigned: {delivery.title}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-bold mt-1">
                        ETA: {delivery.eta}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

          {/* Distribution Center Marker */}
          {filters.centers && (
            <Marker position={[40.7589, -73.9851]} icon={icons.center}>
              <Popup>
                <div className="p-2 text-left">
                  <h4 className="font-extrabold text-xs text-slate-900">Manhattan Depot Center</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Central Warehouse - Logistics storage point</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Current User Marker */}
          {myLocation && (
            <Marker position={myLocation} icon={icons.volunteer}>
              <Popup>
                <div className="p-1 text-xs font-bold text-center">My GPS Location</div>
              </Popup>
            </Marker>
          )}

          {/* Route polyline for selected delivery */}
          {selectedDelivery && (
            <Polyline
              positions={[
                selectedDelivery.donorCoords,
                selectedDelivery.volunteerCoords,
                selectedDelivery.recipientCoords,
              ]}
              color="#3b82f6"
              weight={4}
              opacity={0.8}
              dashArray="5, 10"
            />
          )}
        </MapContainer>

        {/* Float indicator */}
        <div className="absolute bottom-4 left-4 z-[1000] p-3 rounded-xl bg-white/90 border border-slate-200 shadow-md backdrop-blur-sm text-left flex flex-col gap-1 max-w-[200px]">
          <span className="font-extrabold text-[10px] text-slate-900 flex items-center gap-1.5">
            <TrendingUp size={12} className="text-emerald-500" /> Active Transits
          </span>
          <span className="text-[9px] text-slate-500 leading-normal">
            Select a card from the left listing to draw Dash-lines tracking routes.
          </span>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
