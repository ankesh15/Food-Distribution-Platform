import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  CheckCircle,
  MapPin,
  Inbox,
  Send,
} from 'lucide-react';

const Requests = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [requests, setRequests] = useState([
    {
      id: 1,
      title: 'Emergency Hot Meals for Family Shelter',
      description: 'Seeking prepared hot meals (rice, beans, protein) for 50 residents. Ready for immediate pickup.',
      recipient: 'Brooklyn Hope Shelter',
      foodType: 'prepared',
      quantity: '50 servings',
      location: 'Brooklyn, NY',
      urgency: 'high',
      status: 'open',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 2,
      title: 'Pantry Staple Food Boxes Needed',
      description: 'Looking for canned goods, dry beans, cereal, and long-life milk boxes for distribution.',
      recipient: 'Harlem Family Center',
      foodType: 'canned',
      quantity: '20 boxes',
      location: 'New York, NY',
      urgency: 'medium',
      status: 'open',
      createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 3,
      title: 'Baby Formula & Infant Food Supplies',
      description: 'Urgently requesting dry formula tins (various brands) and baby jars for community nursery.',
      recipient: 'Queens Nursery Care',
      foodType: 'other',
      quantity: '15 items',
      location: 'Queens, NY',
      urgency: 'high',
      status: 'filled',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ]);

  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    foodType: 'prepared',
    quantity: '',
    location: '',
    urgency: 'medium'
  });

  const handleCreateRequest = (e) => {
    e.preventDefault();
    if (!form.title || !form.quantity) return;

    const newReq = {
      id: Date.now(),
      title: form.title,
      description: form.description,
      recipient: user?.profile?.organization || `${user?.profile?.firstName} ${user?.profile?.lastName}`,
      foodType: form.foodType,
      quantity: form.quantity,
      location: form.location || 'NYC',
      urgency: form.urgency,
      status: 'open',
      createdAt: new Date().toISOString()
    };

    setRequests([newReq, ...requests]);
    setNewRequestOpen(false);
    setForm({
      title: '',
      description: '',
      foodType: 'prepared',
      quantity: '',
      location: '',
      urgency: 'medium'
    });

    addNotification(
      'New Request Created',
      `You published a food request: ${newReq.title}`,
      'request'
    );
  };

  const handleFillRequest = (reqId, title) => {
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'filled' } : r));
    addNotification(
      'Food Request Filled',
      `You committed to supply: ${title}`,
      'success'
    );
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Community Food Requests
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse requests submitted by local NGOs and shelters or publish a new request.
          </p>
        </div>
        {user?.role === 'recipient' && (
          <button
            onClick={() => setNewRequestOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20"
          >
            <Plus size={16} /> Submit Request
          </button>
        )}
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {requests.map((req) => (
          <motion.div
            key={req.id}
            layout
            className={`p-5 bg-white border rounded-2xl shadow-sm flex flex-col justify-between gap-4 transition-all duration-200 ${
              req.status === 'filled' ? 'border-slate-100 opacity-70' : 'border-slate-200'
            }`}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
                  req.urgency === 'high'
                    ? 'bg-red-500/10 text-red-600'
                    : 'bg-amber-500/10 text-amber-600'
                }`}>
                  {req.urgency} Priority
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  req.status === 'filled' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {req.status.toUpperCase()}
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-sm text-slate-900">{req.title}</h4>
                <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                  {req.recipient} • {new Date(req.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {req.description}
              </p>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-3">
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                <div className="flex items-center gap-1">
                  <Inbox size={12} /> {req.quantity}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin size={12} /> {req.location}
                </div>
              </div>

              {user?.role === 'donor' && req.status === 'open' && (
                <button
                  onClick={() => handleFillRequest(req.id, req.title)}
                  className="w-full py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <CheckCircle size={14} /> Commit Supplies
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal Dialog for New Request */}
      <AnimatePresence>
        {newRequestOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-base text-slate-950">Submit Request</h3>
                <button
                  onClick={() => setNewRequestOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Request Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50 Servings for Homeless Center"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Detailed Requirements</label>
                  <textarea
                    placeholder="Specify allergen concerns, packaging formats..."
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg h-20 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Quantity *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 10 kg, 30 plates"
                      value={form.quantity}
                      onChange={e => setForm({ ...form, quantity: e.target.value })}
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Urgency</label>
                    <select
                      value={form.urgency}
                      onChange={e => setForm({ ...form, urgency: e.target.value })}
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Bronx, NY"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <Send size={14} /> Send Request
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Requests;
