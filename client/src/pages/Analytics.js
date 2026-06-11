import React from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  Globe,
  Leaf,
  Users,
} from 'lucide-react';

const Analytics = () => {
  const stats = [
    { label: 'CO2 Emission Saved', value: '4,280 kg', change: '+12.4%', trend: 'up', icon: <Leaf className="text-emerald-500" /> },
    { label: 'Methane Mitigated', value: '310 kg', change: '+8.2%', trend: 'up', icon: <Globe className="text-blue-500" /> },
    { label: 'Meals Distributed', value: '18,500', change: '+24.1%', trend: 'up', icon: <Users className="text-emerald-500" /> },
    { label: 'Food Waste Avoided', value: '8.4 tons', change: '+15.7%', trend: 'up', icon: <Award className="text-amber-500" /> }
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Impact Analytics
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Monitor carbon offset, landfill reduction index, and community food support stats.
        </p>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -4 }}
            className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col gap-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">{stat.label}</span>
              <div className="p-2.5 rounded-lg bg-slate-55 bg-slate-50 border border-slate-100">{stat.icon}</div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {stat.value}
              </h3>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-1">
                {stat.change} vs last month
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Interactive visual graphics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Environmental Index Card */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900">Landfill Diversion Rate</h3>
          
          <div className="h-48 flex items-end justify-between gap-2 pt-6">
            {[30, 45, 60, 50, 75, 90, 85].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-lg transition-all duration-500"
                  style={{ height: `${val * 1.5}px` }}
                ></div>
                <span className="text-[10px] font-bold text-slate-400">W{i + 1}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
            Landfill waste diversion represents organic products salvaged from supermarkets that would otherwise contribute to landfill greenhouse decay.
          </p>
        </div>

        {/* Community distribution breakdown */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900">Weekly Meal distribution Index</h3>
          
          <div className="h-48 flex items-end justify-between gap-2 pt-6">
            {[40, 55, 30, 70, 80, 65, 95].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-blue-500 hover:bg-blue-600 rounded-t-lg transition-all duration-500"
                  style={{ height: `${val * 1.5}px` }}
                ></div>
                <span className="text-[10px] font-bold text-slate-400">W{i + 1}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
            Assesses distribution frequencies synced through our recipient centers. Weekly peaks align with donor surplus catalog updates.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
