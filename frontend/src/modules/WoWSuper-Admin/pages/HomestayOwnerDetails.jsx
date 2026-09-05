import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Edit2, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building, 
  MapPin, 
  FileText, 
  CreditCard, 
  Phone, 
  Mail, 
  ShieldCheck,
  Plus,
  Eye,
  ExternalLink,
  X,
  Copy,
  Check
} from 'lucide-react';

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? (import.meta.env.VITE_API_URL || 'http://localhost:5005') 
    : 'https://backend-sand-nine-13.vercel.app';
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function HomestayOwnerDetails({ ownerId, onBack, onEdit, ownerDetails, loading }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showEncryptedCopy, setShowEncryptedCopy] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="flex justify-center gap-1.5 items-center">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-75" />
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-150" />
        </div>
        <span className="text-xs font-bold text-slate-400 mt-2 block">Loading profile details...</span>
      </div>
    );
  }

  if (!ownerDetails) {
    return (
      <div className="py-24 text-center">
        <span className="text-xs font-bold text-rose-500">Homestay owner details not found.</span>
        <button 
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const creationDate = ownerDetails.createdAt 
    ? new Date(ownerDetails.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
    : '12-06-2026';

  return (
    <div className="space-y-6">
      {/* Header Back Button & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl bg-white border border-slate-200 transition-colors shadow-sm cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
            Owner Profile Details
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Complete onboarding coordinates, verified KYC status, and linked properties.
          </p>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-6 -mt-6 opacity-40 group-hover:scale-110 transition-transform duration-500" />
        <div className="relative z-10 flex-shrink-0">
          {ownerDetails.profilePhoto ? (
            <img
              src={ownerDetails.profilePhoto}
              alt={`${ownerDetails.firstName} ${ownerDetails.lastName}`}
              className="w-20 h-20 rounded-2xl object-cover border border-slate-150 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 shadow-sm">
              <User size={32} />
            </div>
          )}
        </div>

        <div className="text-center sm:text-left space-y-1 z-10 flex-1">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <h3 className="text-lg font-black text-slate-850">
              {ownerDetails.firstName} {ownerDetails.lastName}
            </h3>
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
              ownerDetails.status === 'Active' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                : ownerDetails.status === 'Pending Verification'
                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                : 'bg-rose-50 text-rose-700 border border-rose-100'
            }`}>
              {ownerDetails.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-semibold">Homestay Owner</p>
          <div className="text-[10px] font-bold text-slate-450 uppercase mt-2 block tracking-wider">
            Owner ID: <span className="text-slate-800">{ownerDetails._id}</span>
          </div>
        </div>

        <div className="flex sm:flex-col gap-2 z-10">
          <button 
            onClick={() => onEdit(ownerDetails)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 rounded-xl text-[10px] font-bold text-white hover:bg-blue-700 transition-all cursor-pointer shadow-md shadow-blue-100"
          >
            <Edit2 size={11} />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* KYC Badges Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Aadhaar Badge */}
        <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
          ownerDetails.aadharVerified 
            ? 'bg-emerald-50/45 border-emerald-100/60' 
            : 'bg-amber-50/45 border-amber-100/60'
        }`}>
          <div className={`p-2.5 rounded-xl ${
            ownerDetails.aadharVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
          }`}>
            {ownerDetails.aadharVerified ? <CheckCircle size={18} /> : <Clock size={18} />}
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Aadhaar KYC</span>
            <span className={`text-xs font-bold ${
              ownerDetails.aadharVerified ? 'text-emerald-750' : 'text-amber-750'
            }`}>
              {ownerDetails.aadharVerified ? 'Verified & Validated' : 'Verification Pending'}
            </span>
          </div>
        </div>

        {/* PAN Badge */}
        <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
          ownerDetails.panVerified 
            ? 'bg-emerald-50/45 border-emerald-100/60' 
            : 'bg-amber-50/45 border-amber-100/60'
        }`}>
          <div className={`p-2.5 rounded-xl ${
            ownerDetails.panVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
          }`}>
            {ownerDetails.panVerified ? <CheckCircle size={18} /> : <Clock size={18} />}
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">PAN KYC</span>
            <span className={`text-xs font-bold ${
              ownerDetails.panVerified ? 'text-emerald-750' : 'text-amber-750'
            }`}>
              {ownerDetails.panVerified ? 'Verified & Validated' : 'Verification Pending'}
            </span>
          </div>
        </div>

        {/* Bank Badge */}
        <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
          ownerDetails.bankVerified 
            ? 'bg-emerald-50/45 border-emerald-100/60' 
            : 'bg-amber-50/45 border-amber-100/60'
        }`}>
          <div className={`p-2.5 rounded-xl ${
            ownerDetails.bankVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
          }`}>
            {ownerDetails.bankVerified ? <CheckCircle size={18} /> : <Clock size={18} />}
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Bank Details</span>
            <span className={`text-xs font-bold ${
              ownerDetails.bankVerified ? 'text-emerald-750' : 'text-amber-750'
            }`}>
              {ownerDetails.bankVerified ? 'Active & Linked' : 'Awaiting Link'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        
        {/* Box 1: Personal & Contact Information */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4.5">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-2">
            <User size={13} className="text-indigo-500" />
            <span>Personal & Contact details</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">First Name</span>
              <span className="text-xs font-bold text-slate-750 block">{ownerDetails.firstName}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Last Name</span>
              <span className="text-xs font-bold text-slate-750 block">{ownerDetails.lastName}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Father's Name</span>
              <span className="text-xs font-bold text-slate-750 block">{ownerDetails.fatherName}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Registered Date</span>
              <span className="text-xs font-bold text-slate-750 block">{creationDate}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-50/50 pt-3">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Phone size={10} /> Mobile
              </span>
              <span className="text-xs font-bold text-slate-750 block">{ownerDetails.mobile}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Phone size={10} /> WhatsApp
              </span>
              <span className="text-xs font-bold text-slate-750 block">{ownerDetails.whatsApp || ownerDetails.mobile}</span>
            </div>
          </div>

          <div className="space-y-0.5 border-t border-slate-50/50 pt-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Mail size={10} /> Email Address
            </span>
            <span className="text-xs font-bold text-slate-750 block">{ownerDetails.email}</span>
          </div>

          <div className="space-y-2 border-t border-slate-50/50 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Partner Password
                </span>
                <span className="text-xs font-bold text-slate-750 block font-mono">
                  {showPassword ? (ownerDetails.passwordCopy || 'Owner@123') : '••••••••••••••••'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 tracking-wider bg-blue-50/50 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100/40 cursor-pointer"
                >
                  {showPassword ? 'Hide' : 'View'}
                </button>
                {showPassword && (
                  <button
                    type="button"
                    onClick={() => handleCopy(ownerDetails.passwordCopy || 'Owner@123', 'pass')}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg border border-slate-200 cursor-pointer"
                    title="Copy password"
                  >
                    {copiedField === 'pass' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            </div>

            {/* Encrypted Password Copy / Ciphertext */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                  Encrypted Password Copy (AES-256 / Hash)
                </span>
                <button
                  type="button"
                  onClick={() => setShowEncryptedCopy(!showEncryptedCopy)}
                  className="text-[8px] font-bold text-indigo-600 hover:underline uppercase cursor-pointer"
                >
                  {showEncryptedCopy ? 'Hide Cipher' : 'Show Cipher'}
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-slate-600 truncate break-all select-all flex-1">
                  {showEncryptedCopy 
                    ? (ownerDetails.encryptedPasswordCopy || ownerDetails.password || 'N/A') 
                    : '••••••••••••••••••••••••••••••••••••••••••••••••'}
                </span>
                {showEncryptedCopy && (ownerDetails.encryptedPasswordCopy || ownerDetails.password) && (
                  <button
                    type="button"
                    onClick={() => handleCopy(ownerDetails.encryptedPasswordCopy || ownerDetails.password, 'cipher')}
                    className="p-1 text-slate-400 hover:text-slate-600 flex-shrink-0 cursor-pointer"
                    title="Copy ciphertext"
                  >
                    {copiedField === 'cipher' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Box 2: Bank Coordinates */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4.5">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-2">
            <CreditCard size={13} className="text-indigo-500" />
            <span>Bank Coordinates</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Bank Name</span>
              <span className="text-xs font-bold text-slate-750 block">{ownerDetails.bankName || 'N/A'}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Account Number</span>
              <span className="text-xs font-bold text-slate-750 block">
                {ownerDetails.accountNumber ? `•••• •••• ${ownerDetails.accountNumber.slice(-4)}` : 'N/A'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-50/50 pt-3">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">IFSC Code</span>
              <span className="text-xs font-bold text-slate-750 block font-mono uppercase">{ownerDetails.ifscCode || 'N/A'}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">UPI ID</span>
              <span className="text-xs font-bold text-slate-750 block font-mono">{ownerDetails.upiId || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Box 3: KYC Details & Documents */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4.5 lg:col-span-2">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-2">
            <FileText size={13} className="text-indigo-500" />
            <span>KYC Numbers & Verification Documents</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Aadhaar Number</span>
              <span className="text-xs font-bold text-slate-750 block">{ownerDetails.aadharNo || 'N/A'}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">PAN Number</span>
              <span className="text-xs font-bold text-slate-750 block font-mono uppercase">{ownerDetails.panNo || 'N/A'}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Voter ID</span>
              <span className="text-xs font-bold text-slate-750 block font-mono uppercase">{ownerDetails.voterId || 'N/A'}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Trade License</span>
              <span className="text-xs font-bold text-slate-750 block font-mono uppercase">{ownerDetails.tradeLicense || 'N/A'}</span>
            </div>
          </div>

          <div className="border-t border-slate-50/50 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                KYC Verification Document Previews
              </span>
              <span className="text-[9px] font-bold text-slate-400">
                Click any document thumbnail to enlarge
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Aadhaar Card Front', url: ownerDetails.aadharFront },
                { title: 'Aadhaar Card Back', url: ownerDetails.aadharBack },
                { title: 'PAN Card Doc', url: ownerDetails.panFront },
                { title: 'Trade License Doc', url: ownerDetails.tradeLicenseDoc }
              ].map(({ title, url }) => {
                const fullUrl = getImageUrl(url);
                return (
                  <div key={title} className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block truncate" title={title}>
                          {title}
                        </span>
                        {fullUrl ? (
                          <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Uploaded
                          </span>
                        ) : (
                          <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">
                            Missing
                          </span>
                        )}
                      </div>

                      {fullUrl ? (
                        <div 
                          onClick={() => setPreviewDoc({ title, url: fullUrl })}
                          className="relative group w-full h-32 rounded-lg overflow-hidden border border-slate-200 bg-white mb-2 shadow-inner cursor-pointer"
                        >
                          <img
                            src={fullUrl}
                            alt={title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="hidden w-full h-full bg-slate-100 flex-col items-center justify-center text-slate-500">
                            <FileText size={24} className="text-blue-500 mb-1" />
                            <span className="text-[10px] font-bold">Document Attached</span>
                          </div>
                          <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white">
                            <Eye size={16} />
                            <span className="text-[10px] font-bold">Preview</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-32 rounded-lg border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-slate-400 mb-2">
                          <FileText size={22} className="mb-1 text-slate-300" />
                          <span className="text-[9px] text-slate-400 font-medium">Not Uploaded</span>
                        </div>
                      )}
                    </div>

                    {fullUrl ? (
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ title, url: fullUrl })}
                          className="flex-1 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye size={11} />
                          <span>View</span>
                        </button>
                        <a
                          href={fullUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[10px] transition-all flex items-center justify-center cursor-pointer"
                          title="Open in new tab"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Box 4: Addresses Coordinates */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-5 lg:col-span-2">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-2">
            <MapPin size={13} className="text-indigo-500" />
            <span>Address coordinates</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 bg-slate-50/50 p-4.5 rounded-xl border border-slate-100">
              <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block">Temporary Address</span>
              {ownerDetails.tempAddress ? (
                <div className="text-xs font-bold text-slate-700 leading-relaxed">
                  <p className="text-slate-800">{ownerDetails.tempAddress.line1}</p>
                  {ownerDetails.tempAddress.line2 && <p>{ownerDetails.tempAddress.line2}</p>}
                  {ownerDetails.tempAddress.landmark && <p className="text-slate-400 font-medium">Landmark: {ownerDetails.tempAddress.landmark}</p>}
                  <p className="mt-1.5 text-[11px] bg-slate-100/70 border border-slate-200/50 px-2 py-1.5 rounded-lg inline-block text-slate-600">
                    {ownerDetails.tempAddress.city}, {ownerDetails.tempAddress.state} - {ownerDetails.tempAddress.pinCode}
                  </p>
                </div>
              ) : (
                <span className="text-xs font-medium text-slate-400">Address not provided</span>
              )}
            </div>

            <div className="space-y-2 bg-slate-50/50 p-4.5 rounded-xl border border-slate-100">
              <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block">Permanent Address</span>
              {ownerDetails.permAddress ? (
                <div className="text-xs font-bold text-slate-700 leading-relaxed">
                  <p className="text-slate-800">{ownerDetails.permAddress.line1}</p>
                  {ownerDetails.permAddress.line2 && <p>{ownerDetails.permAddress.line2}</p>}
                  {ownerDetails.permAddress.landmark && <p className="text-slate-400 font-medium">Landmark: {ownerDetails.permAddress.landmark}</p>}
                  <p className="mt-1.5 text-[11px] bg-slate-100/70 border border-slate-200/50 px-2 py-1.5 rounded-lg inline-block text-slate-600">
                    {ownerDetails.permAddress.city}, {ownerDetails.permAddress.state} - {ownerDetails.permAddress.pinCode}
                  </p>
                </div>
              ) : (
                <span className="text-xs font-medium text-slate-400">Address not provided</span>
              )}
            </div>
          </div>
        </div>

        {/* Box 5: Linked Homestay Properties Table */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest text-indigo-650 flex items-center gap-2">
              <Building size={13} className="text-indigo-500" />
              <span>Linked homestay properties ({ownerDetails.properties?.length || 0})</span>
            </h3>
          </div>

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
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                {!ownerDetails.properties || ownerDetails.properties.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-400 font-medium">
                      No linked homestay properties for this owner.
                    </td>
                  </tr>
                ) : (
                  ownerDetails.properties.map((prop, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-slate-850 flex items-center gap-2">
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

      </div>

      {/* Document Lightbox Modal */}
      {previewDoc && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{previewDoc.title}</h4>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink size={12} />
                  <span>Open Original</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-slate-900/5 min-h-[300px]">
              <img
                src={previewDoc.url}
                alt={previewDoc.title}
                className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
