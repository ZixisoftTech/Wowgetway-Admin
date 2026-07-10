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
  Plus
} from 'lucide-react';

export default function HomestayOwnerDetails({ ownerId, onBack, onEdit, ownerDetails, loading }) {
  const [showPassword, setShowPassword] = useState(false);

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

          <div className="space-y-0.5 border-t border-slate-50/50 pt-3 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Partner Password (Encrypted Copy)
              </span>
              <span className="text-xs font-bold text-slate-750 block font-mono">
                {showPassword ? (ownerDetails.passwordCopy || 'Owner@123') : '••••••••••••••••'}
              </span>
            </div>
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 tracking-wider bg-blue-50/50 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100/40 cursor-pointer"
            >
              {showPassword ? 'Hide' : 'View'}
            </button>
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
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-3">Document Slots Uploaded</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Aadhaar File */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-bold">
                  <FileText size={16} className="text-blue-500" />
                  <span className="truncate">Aadhaar Card Front / Back</span>
                </div>
                {ownerDetails.aadharFront ? (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold">Uploaded</span>
                ) : (
                  <span className="text-[10px] bg-slate-100 text-slate-450 px-2 py-0.5 rounded-md font-bold">Missing</span>
                )}
              </div>

              {/* PAN File */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-bold">
                  <FileText size={16} className="text-blue-500" />
                  <span className="truncate">PAN Card Doc</span>
                </div>
                {ownerDetails.panFront ? (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold">Uploaded</span>
                ) : (
                  <span className="text-[10px] bg-slate-100 text-slate-450 px-2 py-0.5 rounded-md font-bold">Missing</span>
                )}
              </div>

              {/* Trade License Doc */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-bold">
                  <FileText size={16} className="text-blue-500" />
                  <span className="truncate">Trade License Certificate</span>
                </div>
                {ownerDetails.tradeLicenseDoc ? (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold">Uploaded</span>
                ) : (
                  <span className="text-[10px] bg-slate-100 text-slate-450 px-2 py-0.5 rounded-md font-bold">Missing</span>
                )}
              </div>
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
    </div>
  );
}
