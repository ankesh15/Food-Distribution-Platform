import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTracking } from '../context/TrackingContext';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  MapPin,
  Clock,
  Plus,
  ArrowRight,
  Heart,
  Truck,
  Activity,
  Award,
  PlusCircle,
  FolderOpen,
  Settings
} from 'lucide-react';

const createCustomIcon = (color) => {
  return L.divIcon({
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background-color: white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        border: 2.5px solid ${color};
      ">
        <div style="
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: ${color};
        "></div>
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

const icons = {
  donor: createCustomIcon('#10b981'),
  request: createCustomIcon('#f59e0b'),
  volunteer: createCustomIcon('#3b82f6'),
};

const Dashboard = () => {
  const { user, getMyDonations, getMyClaimedDonations, getDonations } = useAuth();
  const { activeDeliveries } = useTracking();
  const [myDonations, setMyDonations] = useState([]);
  const [recentDonations, setRecentDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDonations: 0,
    activeDonations: 0,
    completedDonations: 0,
    totalClaims: 0,
  });
  const navigate = useNavigate();

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      let userDonations;
      if (user?.role === 'recipient') {
        userDonations = await getMyClaimedDonations();
      } else {
        userDonations = await getMyDonations();
      }
      const donationsList = Array.isArray(userDonations) ? userDonations : [];
      setMyDonations(donationsList);

      const recent = await getDonations({ limit: 5, status: 'available' });
      setRecentDonations(recent?.donations || []);

      // Calculate Stats
      setStats({
        totalDonations: donationsList.length,
        activeDonations: donationsList.filter(d => d.status === 'available').length,
        completedDonations: donationsList.filter(d => d.status === 'completed').length,
        totalClaims: donationsList.filter(d => d.status === 'claimed' || d.status === 'picked-up').length,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, getMyDonations, getMyClaimedDonations, getDonations]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 w-full bg-slate-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white relative overflow-hidden shadow-xl"
      >
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.profile?.firstName || 'User'}!
            </h2>
            <p className="text-slate-400 text-xs md:text-sm mt-1.5 max-w-xl">
              {user?.role === 'donor'
                ? 'Manage surplus food listings. Track pick-ups, approve claims, and review impact metrics.'
                : 'Request food packages or coordinate live logistics for shelter distributions.'}
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            {(user?.role === 'donor' || user?.role === 'admin') && (
              <button
                onClick={() => navigate('/create-donation')}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-emerald-500/20"
              >
                <Plus size={16} /> Create Donation
              </button>
            )}
            <button
              onClick={() => navigate('/donations')}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl border border-slate-700 transition-all"
            >
              Browse Catalog
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            title: user?.role === 'donor' ? 'Total Donations' : 'Claimed Packages',
            value: stats.totalDonations,
            icon: <FolderOpen className="text-emerald-500" size={20} />,
            bg: 'bg-emerald-500/10',
            desc: 'Total logged distributions',
          },
          {
            title: 'Active Listings',
            value: stats.activeDonations,
            icon: <Activity className="text-blue-500" size={20} />,
            bg: 'bg-blue-500/10',
            desc: 'Available now on feed',
          },
          {
            title: 'Completed Deliveries',
            value: stats.completedDonations,
            icon: <Award className="text-emerald-500" size={20} />,
            bg: 'bg-emerald-500/10',
            desc: 'Successfully dropped off',
          },
          {
            title: 'Pending Claims',
            value: stats.totalClaims,
            icon: <Clock className="text-amber-500" size={20} />,
            bg: 'bg-amber-500/10',
            desc: 'Awaiting scheduling',
          },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -4 }}
            className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col gap-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">{stat.title}</span>
              <div className={`p-2.5 rounded-lg ${stat.bg}`}>{stat.icon}</div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {stat.value}
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                {stat.desc}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Map Widget & My Records */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map Widget Card */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <MapPin size={16} className="text-emerald-500" />
                  Nearby Operations Widget
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Interactive real-time map showing active donor hubs and couriers.
                </p>
              </div>
              <Link
                to="/map"
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
              >
                Track Live <ArrowRight size={14} />
              </Link>
            </div>
            
            <div className="h-64 relative z-10">
              <MapContainer
                center={[40.7128, -74.0060]}
                zoom={12}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Simulated markers */}
                <Marker position={[40.7188, -74.0080]} icon={icons.donor}>
                  <Popup><span className="text-xs font-bold">Eco-Bakery NYC</span></Popup>
                </Marker>
                <Marker position={[40.7058, -73.9960]} icon={icons.request}>
                  <Popup><span className="text-xs font-bold">Brooklyn Hope Shelter</span></Popup>
                </Marker>
                {activeDeliveries.slice(0, 1).map(d => (
                  <Marker key={d.id} position={d.volunteerCoords} icon={icons.volunteer}>
                    <Popup><span className="text-xs font-bold">Courier: {d.volunteerName}</span></Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          {/* My Records Card */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-slate-900">
                {user?.role === 'donor' ? 'My Surplus Listings' : 'My Claim History'}
              </h3>
              <Link
                to="/donations"
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold"
              >
                View Catalog
              </Link>
            </div>

            {myDonations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No active records. Publish food or claim listed items.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myDonations.slice(0, 4).map((donation) => (
                  <div
                    key={donation._id}
                    onClick={() => navigate(`/donations/${donation._id}`)}
                    className="py-3.5 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-slate-950">{donation.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{donation.foodType}</span>
                        <span>•</span>
                        <span>{donation.quantity?.amount} {donation.quantity?.unit}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      donation.status === 'available'
                        ? 'bg-emerald-50 text-emerald-600'
                        : donation.status === 'completed'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {donation.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Timeline Feed & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <PlusCircle size={16} className="text-emerald-500" />
              Quick Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/create-donation"
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50/10 hover:text-emerald-600 transition-all flex flex-col items-center gap-1.5"
              >
                <Plus size={16} /> Donate Food
              </Link>
              <Link
                to="/map"
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50/10 hover:text-emerald-600 transition-all flex flex-col items-center gap-1.5"
              >
                <Truck size={16} /> Courier Live
              </Link>
              <Link
                to="/profile"
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50/10 hover:text-emerald-600 transition-all flex flex-col items-center gap-1.5"
              >
                <Settings size={16} /> My Settings
              </Link>
              <Link
                to="/analytics"
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50/10 hover:text-emerald-600 transition-all flex flex-col items-center gap-1.5"
              >
                <TrendingUp size={16} /> Analytics
              </Link>
            </div>
          </div>

          {/* System Timeline Feed Card */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Heart size={16} className="text-emerald-500" />
              Live Impact matches
            </h3>
            
            <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-3 before:w-0.5 before:bg-slate-100">
              {recentDonations.slice(0, 3).map((item) => (
                <div key={item._id} className="flex gap-3 relative pl-6">
                  <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                  <div className="flex-1 space-y-0.5">
                    <h5 className="font-bold text-xs text-slate-900">{item.title}</h5>
                    <p className="text-[10px] text-slate-500">
                      {item.quantity?.amount} {item.quantity?.unit} listed by donor in {item.location?.address?.city}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;