import React from 'react';
import { useTracking } from '../context/TrackingContext';
import { useNotifications } from '../context/NotificationContext';
import {
  Truck,
  UserCheck,
  Shield,
} from 'lucide-react';

const Volunteers = () => {
  const { activeDeliveries } = useTracking();
  const { addNotification } = useNotifications();

  const volunteers = [
    {
      id: 1,
      name: 'Alex Mercer',
      deliveriesCount: 24,
      status: 'on-duty',
      vehicle: 'Electric Bicycle',
      rating: '4.9/5'
    },
    {
      id: 2,
      name: 'Sarah Jenkins',
      deliveriesCount: 42,
      status: 'on-duty',
      vehicle: 'Sedan (EV)',
      rating: '4.8/5'
    },
    {
      id: 3,
      name: 'Marcus Brody',
      deliveriesCount: 12,
      status: 'idle',
      vehicle: 'Cargo Van',
      rating: '5.0/5'
    }
  ];

  const handleRegisterAsCourier = () => {
    addNotification(
      'Courier Registration Complete',
      'You are now registered as an active FoodShare Courier. You can claim active transits.',
      'success'
    );
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Logistics & Volunteers
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Vetted couriers, active distribution routes, and GPS dispatching state.
          </p>
        </div>
        <button
          onClick={handleRegisterAsCourier}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20"
        >
          <UserCheck size={16} /> Register as Courier
        </button>
      </div>

      {/* Grid containing Active Deliveries and Couriers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Deliveries Monitor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Truck className="text-emerald-500" size={18} />
              Active Dispatch Board
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeDeliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="p-4 rounded-xl border border-slate-200 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-xs text-slate-900">{delivery.title}</h4>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {delivery.eta}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      <div><span className="font-semibold text-slate-700">Donor:</span> {delivery.donorName}</div>
                      <div><span className="font-semibold text-slate-700">Recipient:</span> {delivery.recipientName}</div>
                      <div><span className="font-semibold text-slate-700">Courier:</span> {delivery.volunteerName}</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold mb-1">
                      <span>Transit Progress</span>
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

        {/* Right Column: Vetted Couriers list */}
        <div className="space-y-4">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Shield className="text-emerald-500" size={18} />
              Vetted Couriers
            </h3>

            <div className="divide-y divide-slate-100">
              {volunteers.map((vol) => (
                <div key={vol.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-xs text-slate-900">{vol.name}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {vol.vehicle} • {vol.deliveriesCount} trips
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      ★ {vol.rating}
                    </span>
                    <span className={`text-[9px] font-bold ${
                      vol.status === 'on-duty' ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      ● {vol.status.toUpperCase()}
                    </span>
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

export default Volunteers;
