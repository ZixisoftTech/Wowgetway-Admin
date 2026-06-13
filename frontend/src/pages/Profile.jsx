import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  User, 
  Key, 
  MapPin, 
  Monitor, 
  LogOut, 
  Save, 
  CheckCircle, 
  Globe,
  Clock
} from 'lucide-react';

const mockSessions = [
  { id: '1', current: true, device: 'MacBook Pro / macOS', browser: 'Chrome 125.0', ip: '192.168.1.45', location: 'Delhi, India', time: 'Active now' },
  { id: '2', current: false, device: 'iPhone 15 Pro', browser: 'Safari Mobile', ip: '103.88.24.12', location: 'Mumbai, India', time: '2 hours ago' },
  { id: '3', current: false, device: 'Windows PC', browser: 'Firefox 120.0', ip: '198.51.100.4', location: 'Noida, India', time: 'June 11, 2026 - 15:42' }
];

export default function Profile() {
  const user = useSelector((state) => state.auth.user);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sessions, setSessions] = useState(mockSessions);

  // Profile Form States
  const [fullName, setFullName] = useState(user?.fullName || 'Rahul Sharma');
  const [email, setEmail] = useState(user?.email || 'admin@wowgateways.com');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [role, setRole] = useState(user?.role || 'Super Admin');

  // Password Reset Form States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleProfileSave = (e) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handlePasswordSave = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    alert('Password updated successfully (Simulated).');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleTerminateOthers = () => {
    if (confirm('Are you sure you want to log out of all other devices?')) {
      setSessions(prev => prev.filter(s => s.current));
      alert('All other active sessions have been terminated.');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <User size={22} />
            </span>
            Operator Profile Settings
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Manage your credentials, reset passwords, audit active login sessions, and control account settings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Profile Details Form */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2.5 flex items-center gap-2">
              <User size={15} className="text-blue-500" /> Personal Account details
            </h3>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Security Role</label>
                  <input
                    type="text"
                    value={role}
                    disabled
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-500 rounded-xl focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Operational Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <div>
                  {saveSuccess && (
                    <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold animate-fade-in">
                      <CheckCircle size={14} /> Profile details saved!
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Save size={13} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Sessions Logs list */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Globe size={15} className="text-blue-500" /> Active Session Logs
              </h3>
              <button
                onClick={handleTerminateOthers}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider focus:outline-none cursor-pointer"
              >
                Terminate Other Sessions
              </button>
            </div>

            <div className="space-y-4">
              {sessions.map(s => (
                <div key={s.id} className="flex justify-between items-start border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg border ${
                      s.current ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}>
                      <Monitor size={15} />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        {s.device}
                        {s.current && (
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100/40 rounded text-[9px] font-extrabold uppercase">
                            Current Session
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {s.browser} • {s.ip}
                      </span>
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                      <MapPin size={10} /> {s.location}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium block font-mono">{s.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Change Password Panel */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2.5 flex items-center gap-2">
            <Key size={15} className="text-blue-500" /> Update Password
          </h3>

          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50/50 border border-slate-200/60 focus:border-blue-500/60 focus:bg-white rounded-xl focus:outline-none transition-all"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50/50 border border-slate-200/60 focus:border-blue-500/60 focus:bg-white rounded-xl focus:outline-none transition-all"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50/50 border border-slate-200/60 focus:border-blue-500/60 focus:bg-white rounded-xl focus:outline-none transition-all"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Update Password
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
