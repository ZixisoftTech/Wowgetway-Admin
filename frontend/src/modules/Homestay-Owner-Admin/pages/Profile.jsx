import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Building, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Edit2, 
  Lock, 
  Eye, 
  EyeOff, 
  FileText,
  Save,
  X
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  return `${base}${path}`;
};

const API_PROFILE_URL = getApiUrl('/api/homestay-owner');

export default function Profile() {
  const queryClient = useQueryClient();
  const token = localStorage.getItem('homestayOwnerToken');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdStrength, setPwdStrength] = useState({ score: 0, label: 'Empty', color: 'bg-slate-200' });

  const headers = { Authorization: `Bearer ${token}` };

  // 1. Fetch Profile Data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['ownerProfile'],
    queryFn: async () => {
      const res = await axios.get(`${API_PROFILE_URL}/profile`, { headers });
      return res.data;
    },
    enabled: !!token
  });

  // Track Password Strength
  useEffect(() => {
    if (!newPassword) {
      setPwdStrength({ score: 0, label: 'Empty', color: 'bg-slate-200' });
      return;
    }
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[^\w\s]/.test(newPassword)) score++;

    let label = 'Weak';
    let color = 'bg-rose-500';
    if (score >= 5) {
      label = 'Excellent';
      color = 'bg-emerald-600';
    } else if (score >= 4) {
      label = 'Strong';
      color = 'bg-emerald-500';
    } else if (score >= 3) {
      label = 'Medium';
      color = 'bg-amber-500';
    } else if (score >= 2) {
      label = 'Very Weak';
      color = 'bg-rose-455';
    }

    setPwdStrength({ score, label, color });
  }, [newPassword]);

  // Populate edit form on edit start
  const handleStartEdit = () => {
    if (!profile) return;
    setEditForm({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      fatherName: profile.fatherName || '',
      mobile: profile.mobile || '',
      whatsApp: profile.whatsApp || '',
      profilePhoto: profile.profilePhoto || '',
      bankName: profile.bankName || '',
      accountNumber: profile.accountNumber || '',
      ifscCode: profile.ifscCode || '',
      upiId: profile.upiId || '',
      tempAddress: {
        line1: profile.tempAddress?.line1 || '',
        line2: profile.tempAddress?.line2 || '',
        landmark: profile.tempAddress?.landmark || '',
        city: profile.tempAddress?.city || '',
        state: profile.tempAddress?.state || '',
        pinCode: profile.tempAddress?.pinCode || ''
      },
      permAddress: {
        line1: profile.permAddress?.line1 || '',
        line2: profile.permAddress?.line2 || '',
        landmark: profile.permAddress?.landmark || '',
        city: profile.permAddress?.city || '',
        state: profile.permAddress?.state || '',
        pinCode: profile.permAddress?.pinCode || ''
      }
    });
    setIsEditModalOpen(true);
  };

  // 2. Profile Update Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData) => {
      const res = await axios.put(`${API_PROFILE_URL}/profile`, updatedData, { headers });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ownerProfile']);
      setIsEditModalOpen(false);
      Swal.fire({
        title: 'Success',
        text: 'Profile updated successfully.',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      });
    },
    onError: (err) => {
      Swal.fire({
        title: 'Update Failed',
        text: err.response?.data?.message || 'Could not update profile details.',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
    }
  });

  // 3. Password Update Mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (pwdData) => {
      const res = await axios.put(`${API_PROFILE_URL}/change-password`, pwdData, { headers });
      return res.data;
    },
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Swal.fire({
        title: 'Password Updated',
        text: 'Password changed successfully.',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      });
    },
    onError: (err) => {
      Swal.fire({
        title: 'Change Password Failed',
        text: err.response?.data?.message || 'Incorrect current password or weak password.',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
    }
  });

  const handleProfileSaveSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(editForm);
  };

  const handlePasswordSaveSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      Swal.fire({ title: 'Error', text: 'Passwords do not match.', icon: 'error' });
      return;
    }
    if (pwdStrength.label === 'Weak') {
      Swal.fire({ title: 'Error', text: 'Password must satisfy security strength guidelines.', icon: 'error' });
      return;
    }
    updatePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="flex justify-center gap-1.5 items-center">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-75" />
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-150" />
        </div>
        <span className="text-xs font-bold text-slate-400 mt-2 block">Loading profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-24 text-center">
        <span className="text-xs font-bold text-rose-500">Failed to load profile. Please log in again.</span>
      </div>
    );
  }

  const creationDate = profile.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
    : '12-06-2026';

  return (
    <div className="space-y-6 sm:space-y-8 select-none max-w-6xl mx-auto p-4 sm:p-6">
      
      {/* Header bar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight flex items-center gap-2">
            <User className="text-rose-500 w-6 h-6" />
            <span>My Profile</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Manage your account parameters, KYC status, and linked bank credentials.
          </p>
        </div>
        
        <button
          onClick={handleStartEdit}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-100 transition-all cursor-pointer border-none"
        >
          <Edit2 size={13} />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Profile summary header */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-6 -mt-6 opacity-40 group-hover:scale-110 transition-transform duration-500" />
        <div className="relative z-10 flex-shrink-0">
          {profile.profilePhoto ? (
            <img
              src={profile.profilePhoto}
              alt={`${profile.firstName} ${profile.lastName}`}
              className="w-20 h-20 rounded-2xl object-cover border border-slate-150 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm">
              <User size={32} />
            </div>
          )}
        </div>

        <div className="text-center sm:text-left space-y-1 z-10 flex-1">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <h3 className="text-lg font-black text-slate-850">
              {profile.firstName} {profile.lastName}
            </h3>
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
              profile.status === 'Active' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                : 'bg-amber-50 text-amber-700 border border-amber-100'
            }`}>
              {profile.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-semibold">Registered Homestay Partner</p>
          <div className="text-[10px] font-bold text-slate-450 uppercase mt-2 block tracking-wider">
            Owner ID: <span className="text-slate-800">{profile._id}</span>
          </div>
        </div>
      </div>

      {/* Badges list */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
          profile.aadharVerified ? 'bg-emerald-50/45 border-emerald-100/60' : 'bg-amber-50/45 border-amber-100/60'
        }`}>
          <div className={`p-2.5 rounded-xl ${profile.aadharVerified ? 'bg-emerald-100 text-emerald-650' : 'bg-amber-100 text-amber-655'}`}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Aadhaar Verification</span>
            <span className="text-xs font-bold text-slate-750 block">
              {profile.aadharVerified ? 'Verified' : 'Pending Verification'}
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
          profile.panVerified ? 'bg-emerald-50/45 border-emerald-100/60' : 'bg-amber-50/45 border-amber-100/60'
        }`}>
          <div className={`p-2.5 rounded-xl ${profile.panVerified ? 'bg-emerald-100 text-emerald-655' : 'bg-amber-100 text-amber-655'}`}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">PAN Verification</span>
            <span className="text-xs font-bold text-slate-755 block">
              {profile.panVerified ? 'Verified' : 'Pending Verification'}
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
          profile.bankVerified ? 'bg-emerald-50/45 border-emerald-100/60' : 'bg-amber-50/45 border-amber-100/60'
        }`}>
          <div className={`p-2.5 rounded-xl ${profile.bankVerified ? 'bg-emerald-100 text-emerald-655' : 'bg-amber-100 text-amber-655'}`}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Bank Coordinates</span>
            <span className="text-xs font-bold text-slate-755 block">
              {profile.bankVerified ? 'Active & Verified' : 'Awaiting Check'}
            </span>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        
        {/* Personal & Contacts */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-2">
            <User size={13} className="text-indigo-500" />
            <span>Personal & Contacts</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">First Name</span>
              <span className="text-xs font-bold text-slate-750">{profile.firstName}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Last Name</span>
              <span className="text-xs font-bold text-slate-750">{profile.lastName}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Father Name</span>
              <span className="text-xs font-bold text-slate-750">{profile.fatherName || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Registration Date</span>
              <span className="text-xs font-bold text-slate-750">{creationDate}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-3">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Phone size={10} /> Mobile
              </span>
              <span className="text-xs font-bold text-slate-750">{profile.mobile}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Phone size={10} /> WhatsApp
              </span>
              <span className="text-xs font-bold text-slate-755">{profile.whatsApp || profile.mobile}</span>
            </div>
          </div>

          <div className="border-t border-slate-50 pt-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Mail size={10} /> Email Address
            </span>
            <span className="text-xs font-bold text-slate-755 block font-mono">{profile.email}</span>
          </div>
        </div>

        {/* Bank details card */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-2">
            <CreditCard size={13} className="text-indigo-500" />
            <span>Bank details</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Bank Name</span>
              <span className="text-xs font-bold text-slate-755 block">{profile.bankName || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Account Number</span>
              <span className="text-xs font-bold text-slate-755 block font-mono">
                {profile.accountNumber ? `•••• •••• ${profile.accountNumber.slice(-4)}` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">IFSC Code</span>
              <span className="text-xs font-bold text-slate-755 block font-mono uppercase">{profile.ifscCode || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">UPI ID</span>
              <span className="text-xs font-bold text-slate-755 block font-mono">{profile.upiId || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Addresses Box */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-2">
            <MapPin size={13} className="text-indigo-500" />
            <span>Registered Addresses</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold uppercase tracking-wider block text-slate-450 mb-1">Temporary Address</span>
              {profile.tempAddress ? (
                <div className="text-xs font-bold text-slate-700 leading-relaxed">
                  <p>{profile.tempAddress.line1}</p>
                  {profile.tempAddress.line2 && <p>{profile.tempAddress.line2}</p>}
                  {profile.tempAddress.landmark && <p className="text-slate-400 font-semibold">Landmark: {profile.tempAddress.landmark}</p>}
                  <p className="mt-1 text-slate-500 font-mono text-[10px]">
                    {profile.tempAddress.city}, {profile.tempAddress.state} - {profile.tempAddress.pinCode}
                  </p>
                </div>
              ) : (
                <span className="text-xs text-slate-400">Not Provided</span>
              )}
            </div>

            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold uppercase tracking-wider block text-slate-455 mb-1">Permanent Address</span>
              {profile.permAddress ? (
                <div className="text-xs font-bold text-slate-700 leading-relaxed">
                  <p>{profile.permAddress.line1}</p>
                  {profile.permAddress.line2 && <p>{profile.permAddress.line2}</p>}
                  {profile.permAddress.landmark && <p className="text-slate-400 font-semibold">Landmark: {profile.permAddress.landmark}</p>}
                  <p className="mt-1 text-slate-500 font-mono text-[10px]">
                    {profile.permAddress.city}, {profile.permAddress.state} - {profile.permAddress.pinCode}
                  </p>
                </div>
              ) : (
                <span className="text-xs text-slate-400">Not Provided</span>
              )}
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-2">
            <Lock size={13} className="text-indigo-500" />
            <span>Change Account Password</span>
          </h3>

          <form onSubmit={handlePasswordSaveSubmit} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-150 text-xs font-bold rounded-xl focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
                  >
                    {showCurrent ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-150 text-xs font-bold rounded-xl focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
                  >
                    {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            </div>

            {newPassword && (
              <div className="space-y-1.5 max-w-sm">
                <div className="flex justify-between text-[9px] font-bold uppercase text-slate-400">
                  <span>Password Strength</span>
                  <span>{pwdStrength.label}</span>
                </div>
                <div className="h-1 bg-slate-100 rounded-full flex overflow-hidden">
                  <div className={`h-full ${pwdStrength.color}`} style={{ width: `${(pwdStrength.score / 5) * 100}%` }} />
                </div>
                <ul className="text-[8px] text-slate-450 font-bold space-y-0.5 list-disc pl-3">
                  <li className={newPassword.length >= 8 ? 'text-emerald-600' : ''}>Min 8 characters</li>
                  <li className={/[A-Z]/.test(newPassword) ? 'text-emerald-600' : ''}>At least 1 uppercase</li>
                  <li className={/[a-z]/.test(newPassword) ? 'text-emerald-600' : ''}>At least 1 lowercase</li>
                  <li className={/\d/.test(newPassword) ? 'text-emerald-600' : ''}>At least 1 digit</li>
                  <li className={/[^\w\s]/.test(newPassword) ? 'text-emerald-600' : ''}>At least 1 special character</li>
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-1.5 max-w-sm">
              <label className="text-[9px] font-bold text-slate-455 uppercase pl-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-150 text-xs font-bold rounded-xl focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
                >
                  {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <span className="text-[9px] font-bold text-rose-500 pl-1">Passwords do not match.</span>
              )}
            </div>

            <button
              type="submit"
              disabled={updatePasswordMutation.isPending || newPassword !== confirmPassword || pwdStrength.label === 'Weak'}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none disabled:opacity-50"
            >
              Update Password
            </button>
          </form>
        </div>

        {/* Linked properties */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-2">
            <Building size={13} className="text-indigo-500" />
            <span>Linked properties ({profile.properties?.length || 0})</span>
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Property Name</th>
                  <th className="py-3 px-5">Location</th>
                  <th className="py-3 px-5 text-center">Status</th>
                  <th className="py-3 px-5 text-right">Bookings Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-707">
                {!profile.properties || profile.properties.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-400 font-medium">
                      No linked homestay properties.
                    </td>
                  </tr>
                ) : (
                  profile.properties.map((prop, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-slate-800 flex items-center gap-2">
                        <Building size={13} className="text-slate-400" />
                        <span>{prop.propertyName}</span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 font-medium">{prop.location}</td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-wide ${
                          prop.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {prop.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-slate-800">{prop.bookings || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity tracking */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-2">
            <Clock size={13} className="text-indigo-500" />
            <span>Account Login Activity Logs</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Last Login Date</span>
              <span className="font-bold text-slate-700">{profile.lastLoginDate || 'N/A'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Last Login Time</span>
              <span className="font-bold text-slate-700">{profile.lastLoginTime || 'N/A'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Last Login IP</span>
              <span className="font-bold text-slate-700 font-mono">{profile.lastLoginIp || 'N/A'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Edit Profile Modal Dialog Box */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-100 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 relative space-y-6"
            >
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-xl border-none cursor-pointer"
              >
                <X size={16} />
              </button>

              <div>
                <h3 className="text-base font-black text-slate-850">Edit Profile Coordinates</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Update personal details, address, and bank coordinates.</p>
              </div>

              <form onSubmit={handleProfileSaveSubmit} className="space-y-6">
                
                {/* Section 1: Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase pl-1">First Name</label>
                      <input
                        type="text"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                        required
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase pl-1">Last Name</label>
                      <input
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        required
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-[10px] font-bold text-slate-450 uppercase pl-1">Father's Name</label>
                      <input
                        type="text"
                        value={editForm.fatherName}
                        onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">Mobile Number</label>
                      <input
                        type="text"
                        value={editForm.mobile}
                        onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                        required
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">WhatsApp Number</label>
                      <input
                        type="text"
                        value={editForm.whatsApp}
                        onChange={(e) => setEditForm({ ...editForm, whatsApp: e.target.value })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">Profile Photo (URL)</label>
                      <input
                        type="text"
                        value={editForm.profilePhoto}
                        onChange={(e) => setEditForm({ ...editForm, profilePhoto: e.target.value })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Bank Info */}
                <div className="space-y-4 border-t border-slate-50 pt-5">
                  <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Bank Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">Bank Name</label>
                      <input
                        type="text"
                        value={editForm.bankName}
                        onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">Account Number</label>
                      <input
                        type="text"
                        value={editForm.accountNumber}
                        onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">IFSC Code</label>
                      <input
                        type="text"
                        value={editForm.ifscCode}
                        onChange={(e) => setEditForm({ ...editForm, ifscCode: e.target.value })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none font-mono uppercase"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">UPI ID</label>
                      <input
                        type="text"
                        value={editForm.upiId}
                        onChange={(e) => setEditForm({ ...editForm, upiId: e.target.value })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Addresses */}
                <div className="space-y-4 border-t border-slate-50 pt-5">
                  <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Temporary Address</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">Address Line 1</label>
                      <input
                        type="text"
                        value={editForm.tempAddress?.line1}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          tempAddress: { ...editForm.tempAddress, line1: e.target.value }
                        })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">Address Line 2</label>
                      <input
                        type="text"
                        value={editForm.tempAddress?.line2}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          tempAddress: { ...editForm.tempAddress, line2: e.target.value }
                        })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">City</label>
                      <input
                        type="text"
                        value={editForm.tempAddress?.city}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          tempAddress: { ...editForm.tempAddress, city: e.target.value }
                        })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">State</label>
                      <input
                        type="text"
                        value={editForm.tempAddress?.state}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          tempAddress: { ...editForm.tempAddress, state: e.target.value }
                        })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">Landmark</label>
                      <input
                        type="text"
                        value={editForm.tempAddress?.landmark}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          tempAddress: { ...editForm.tempAddress, landmark: e.target.value }
                        })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">PIN Code</label>
                      <input
                        type="text"
                        value={editForm.tempAddress?.pinCode}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          tempAddress: { ...editForm.tempAddress, pinCode: e.target.value }
                        })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Permanent Address */}
                <div className="space-y-4 border-t border-slate-50 pt-5">
                  <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Permanent Address</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">Address Line 1</label>
                      <input
                        type="text"
                        value={editForm.permAddress?.line1}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          permAddress: { ...editForm.permAddress, line1: e.target.value }
                        })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">Address Line 2</label>
                      <input
                        type="text"
                        value={editForm.permAddress?.line2}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          permAddress: { ...editForm.permAddress, line2: e.target.value }
                        })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">City</label>
                      <input
                        type="text"
                        value={editForm.permAddress?.city}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          permAddress: { ...editForm.permAddress, city: e.target.value }
                        })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">State</label>
                      <input
                        type="text"
                        value={editForm.permAddress?.state}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          permAddress: { ...editForm.permAddress, state: e.target.value }
                        })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">Landmark</label>
                      <input
                        type="text"
                        value={editForm.permAddress?.landmark}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          permAddress: { ...editForm.permAddress, landmark: e.target.value }
                        })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-455 uppercase pl-1">PIN Code</label>
                      <input
                        type="text"
                        value={editForm.permAddress?.pinCode}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          permAddress: { ...editForm.permAddress, pinCode: e.target.value }
                        })}
                        className="p-2.5 bg-slate-55 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer border-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center gap-1 px-4.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none shadow-md shadow-rose-100"
                  >
                    <Save size={13} />
                    <span>Save Coordinates</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
