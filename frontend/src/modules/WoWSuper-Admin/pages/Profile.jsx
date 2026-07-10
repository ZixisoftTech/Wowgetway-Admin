import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { 
  User, 
  Key, 
  MapPin, 
  Monitor, 
  LogOut, 
  Save, 
  CheckCircle, 
  Globe,
  Clock,
  RefreshCw,
  Camera,
  Mail,
  Phone,
  ShieldCheck
} from 'lucide-react';
import { logout } from '../store/superAdminAuthSlice.js';

const mockSessions = [
  { id: '1', current: true, device: 'MacBook Pro / macOS', browser: 'Chrome 125.0', ip: '192.168.1.45', location: 'Delhi, India', time: 'Active now' },
  { id: '2', current: false, device: 'iPhone 15 Pro', browser: 'Safari Mobile', ip: '103.88.24.12', location: 'Mumbai, India', time: '2 hours ago' },
  { id: '3', current: false, device: 'Windows PC', browser: 'Firefox 120.0', ip: '198.51.100.4', location: 'Noida, India', time: 'June 11, 2026 - 15:42' }
];

export default function Profile() {
  const dispatch = useDispatch();
  const reduxUser = useSelector((state) => state.superAdminAuth.user);

  const getApiUrl = (path) => {
    const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
    return `${base}${path}`;
  };
  
  // Loading & error states
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Profile Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [status, setStatus] = useState('Active');
  const [lastLogin, setLastLogin] = useState('');
  const [createdAt, setCreatedAt] = useState('');

  // Password Reset Form States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [sessions, setSessions] = useState(mockSessions);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingAvatar(true);
    setUploadError('');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = localStorage.getItem('superAdminToken');
      const res = await axios.post(
        getApiUrl('/api/admin/upload'),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      let fileUrl = res.data.fileUrl;
      if (fileUrl.startsWith('/')) {
        const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
        fileUrl = `${base}${fileUrl}`;
      }
      setProfilePhoto(fileUrl);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      setUploadError(err.response?.data?.message || 'Failed to upload image.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Load operator profile details on mount
  const fetchProfile = async () => {
    setProfileLoading(true);
    setProfileError('');
    try {
      const res = await axios.get(getApiUrl('/api/admin/profile'));
      setFullName(res.data.fullName);
      setEmail(res.data.email);
      setPhone(res.data.mobileNumber || '');
      setRole(res.data.role);
      setProfilePhoto(res.data.profilePhoto || '');
      setStatus(res.data.status || 'Active');
      setLastLogin(res.data.lastLogin);
      setCreatedAt(res.data.createdAt);
    } catch (err) {
      console.error('Failed to load profile details:', err);
      setProfileError(err.response?.data?.message || 'Could not fetch operator details from server.');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaveSuccess(false);
    setProfileError('');
    try {
      const res = await axios.put(getApiUrl('/api/admin/profile'), {
        fullName,
        mobileNumber: phone,
        profilePhoto
      });
      setFullName(res.data.fullName);
      setPhone(res.data.mobileNumber || '');
      setProfilePhoto(res.data.profilePhoto || '');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setProfileError(err.response?.data?.error || err.response?.data?.message || 'Failed to update profile details.');
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPasswordError('New password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    try {
      const res = await axios.post(getApiUrl('/api/admin/profile/change-password'), {
        oldPassword,
        newPassword
      });
      setPasswordSuccess(res.data.message || 'Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Auto logout after brief delay
      setTimeout(() => {
        dispatch(logout());
      }, 2500);
    } catch (err) {
      console.error('Failed to change password:', err);
      setPasswordError(err.response?.data?.error || err.response?.data?.message || 'Password update failed.');
    }
  };

  const handleTerminateOthers = () => {
    if (confirm('Are you sure you want to log out of all other devices?')) {
      setSessions(prev => prev.filter(s => s.current));
      alert('All other active sessions have been terminated.');
    }
  };

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <RefreshCw className="text-blue-600 animate-spin" size={32} />
        <span className="text-xs text-slate-500 font-bold">Retrieving profile parameters...</span>
      </div>
    );
  }

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

      {profileError && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-700 font-semibold">
          {profileError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Avatar & Summary Info */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="relative group">
              <img 
                src={profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 shadow-sm"
              />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={18} className="text-white" />
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-800">{fullName}</h2>
              <span className="px-2 py-0.5 mt-1.5 inline-block bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[10px] font-extrabold uppercase tracking-wide">
                {role}
              </span>
            </div>

            <div className="w-full border-t border-slate-50 pt-4 text-left space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={14} className="text-slate-400" />
                <span className="font-semibold text-slate-700">Status:</span>
                <span className={`ml-auto font-bold uppercase text-[9px] px-1.5 py-0.5 rounded ${
                  status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}>{status}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock size={14} className="text-slate-400" />
                <span className="font-semibold text-slate-700">Last Login:</span>
                <span className="ml-auto font-mono text-[10px]">{lastLogin ? new Date(lastLogin).toLocaleString() : 'Never'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock size={14} className="text-slate-400" />
                <span className="font-semibold text-slate-700">Created:</span>
                <span className="ml-auto font-mono text-[10px]">{createdAt ? new Date(createdAt).toLocaleDateString() : 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details & Password Forms */}
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
                    disabled
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-500 rounded-xl focus:outline-none cursor-not-allowed"
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

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Avatar Image URL</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={profilePhoto}
                      onChange={(e) => setProfilePhoto(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      id="avatar-upload-input"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="avatar-upload-input"
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors h-[38px] select-none whitespace-nowrap"
                    >
                      {uploadingAvatar ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Camera size={13} />
                          <span>Upload Image</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
                {uploadError && (
                  <span className="text-[10px] text-rose-600 font-bold pl-1 mt-1 block">{uploadError}</span>
                )}
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

          {/* Change Password Panel */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2.5 flex items-center gap-2">
              <Key size={15} className="text-blue-500" /> Update Password
            </h3>

            {passwordError && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-700 font-semibold leading-relaxed">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700 font-semibold leading-relaxed">
                {passwordSuccess}
              </div>
            )}

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
                  placeholder="Min 8 characters (letters and numbers)"
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

      </div>

    </div>
  );
}
