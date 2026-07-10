import React, { useState } from 'react';
import { 
  Globe, 
  Plus, 
  ExternalLink, 
  Activity, 
  RefreshCw, 
  Settings, 
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

const initialApps = [
  { id: '1', name: 'Goa Gateways Portal', url: 'https://goa.wowgateways.com', status: 'Online', lastSync: '2 mins ago', bookingsToday: 12, responseTime: '124ms' },
  { id: '2', name: 'Manali Resort Suite', url: 'https://manali.wowgateways.com', status: 'Online', lastSync: '5 mins ago', bookingsToday: 8, responseTime: '185ms' },
  { id: '3', name: 'Munnar Tea Estates Site', url: 'https://munnar.wowgateways.com', status: 'Online', lastSync: '10 mins ago', bookingsToday: 4, responseTime: '142ms' },
  { id: '4', name: 'Rishikesh Retreats Portal', url: 'https://rishikesh.wowgateways.com', status: 'Maintenance', lastSync: '1 hour ago', bookingsToday: 0, responseTime: '—' },
  { id: '5', name: 'B2B Partner Agent Site', url: 'https://agent.wowgateways.com', status: 'Offline', lastSync: '3 hours ago', bookingsToday: 0, responseTime: '—' }
];

export default function WebApps() {
  const [apps, setApps] = useState(initialApps);
  const [search, setSearch] = useState('');

  const handleToggleStatus = (id) => {
    setApps(prev => prev.map(app => {
      if (app.id === id) {
        const nextStatus = app.status === 'Online' ? 'Maintenance' : app.status === 'Maintenance' ? 'Offline' : 'Online';
        return { ...app, status: nextStatus };
      }
      return app;
    }));
  };

  const handleDeploySync = (id) => {
    alert(`Deploy sync triggered for app ID ${id}. Clearing CDN cache nodes...`);
  };

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(search.toLowerCase()) || app.url.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8 select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-violet-50 text-violet-600 rounded-xl">
              <Globe size={22} />
            </span>
            Homestay / Hotel Web Apps
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Monitor, deploy, and manage client-facing booking subdomains and partner agency portals.
          </p>
        </div>
        <button
          onClick={() => alert('New client domain integration form opened.')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Plus size={14} />
          Register Subdomain
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center max-w-md">
        <Search size={14} className="text-slate-400 mr-3.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search registered subdomain or portal name..."
          className="w-full text-xs font-semibold placeholder-slate-400 bg-transparent focus:outline-none"
        />
      </div>

      {/* Portals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredApps.map(app => (
          <div key={app.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-3">
              {/* Card top */}
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-extrabold text-slate-800 tracking-tight">{app.name}</h3>
                  <a 
                    href={app.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-600 font-mono font-bold hover:underline inline-flex items-center gap-1"
                  >
                    {app.url}
                    <ExternalLink size={10} />
                  </a>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border flex items-center gap-1 ${
                  app.status === 'Online'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : app.status === 'Maintenance'
                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                    : 'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  <span className={`w-1 h-1 rounded-full ${
                    app.status === 'Online' ? 'bg-emerald-500 animate-pulse' : app.status === 'Maintenance' ? 'bg-amber-500' : 'bg-rose-500'
                  }`} />
                  {app.status}
                </span>
              </div>

              {/* Status parameters */}
              <div className="grid grid-cols-2 gap-3 pt-1 text-[11px] font-semibold text-slate-500">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 space-y-0.5">
                  <span className="text-[9px] text-slate-450 uppercase block font-bold">Latency</span>
                  <span className="text-slate-800 font-bold font-mono block">{app.responseTime}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 space-y-0.5">
                  <span className="text-[9px] text-slate-450 uppercase block font-bold">Bookings Today</span>
                  <span className="text-slate-800 font-bold font-mono block">{app.bookingsToday}</span>
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-3">
              <span className="text-[10px] text-slate-400 font-medium">Sync: {app.lastSync}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDeploySync(app.id)}
                  title="Deploy assets sync"
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-200/60 rounded-xl transition-all cursor-pointer"
                >
                  <RefreshCw size={12} />
                </button>
                <button
                  onClick={() => handleToggleStatus(app.id)}
                  title="Change online policy"
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-200/60 rounded-xl transition-all cursor-pointer"
                >
                  <Settings size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
