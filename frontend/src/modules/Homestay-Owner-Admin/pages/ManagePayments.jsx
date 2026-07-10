import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Home,
  QrCode,
  Check,
  Plus,
  Minus,
  Info,
  Edit2
} from 'lucide-react';

export default function ManagePayments() {
  const navigate = useNavigate();
  const [advancePercent, setAdvancePercent] = useState(30);
  const [advanceType, setAdvanceType] = useState('percent'); // percent / fixed

  const adjustPercent = (val) => {
    setAdvancePercent(prev => Math.max(0, Math.min(100, prev + val)));
  };

  return (
    <div className="space-y-6 font-sans pb-12 select-none">
      
      {/* Top Breadcrumb */}
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <button 
          onClick={() => navigate(-1)}
          className="hover:text-slate-600 bg-transparent border-none cursor-pointer flex items-center gap-1 p-0 text-[10px] font-black uppercase text-slate-400"
        >
          <ArrowLeft size={10} className="stroke-[3]" />
          <span>Back</span>
        </button>
        <span>/</span>
        <span>Settings</span>
        <span>/</span>
        <span className="text-rose-700 font-extrabold">Manage Payments</span>
      </div>

      {/* Header section */}
      <div className="space-y-1">
        <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Manage Payments</h1>
        <p className="text-[10px] font-bold text-slate-400">Configure your payment collection methods and advance booking settings.</p>
      </div>

      {/* Card 1: Bank Account Details */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <Home size={16} />
            </div>
            <span className="text-xs font-black text-slate-850 uppercase tracking-wider">Bank Account Details</span>
          </div>

          <button 
            onClick={() => alert('Editing bank account...')}
            className="px-3.5 py-1.5 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-lg text-[9px] uppercase tracking-wider cursor-pointer bg-white flex items-center gap-1"
          >
            <Edit2 size={11} className="text-slate-400" />
            <span>Edit</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-450 font-bold leading-none">Verify and update your bank account to receive automated settlements from guests.</p>

        <div className="grid grid-cols-2 gap-5 pt-2.5 text-xs font-semibold text-slate-500">
          <div>
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Account Holder Name</span>
            <span className="text-slate-800 font-extrabold block mt-1">Keshav Homestay</span>
          </div>

          <div>
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Bank Name</span>
            <span className="text-slate-800 font-extrabold block mt-1">HDFC Bank</span>
          </div>

          <div>
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Account Number</span>
            <span className="text-slate-800 font-mono font-extrabold block mt-1">5010 1234 5678 90</span>
          </div>

          <div>
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">IFSC Code</span>
            <span className="text-slate-800 font-mono font-extrabold block mt-1">HDFC0001234</span>
          </div>

          <div className="col-span-2 border-t border-slate-50 pt-3">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Branch</span>
            <span className="text-slate-800 font-extrabold block mt-1">Panchpokhari, Himachal Pradesh</span>
          </div>
        </div>
      </div>

      {/* Card 2: UPI Payment Gateway */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
            <QrCode size={16} />
          </div>
          <span className="text-xs font-black text-slate-850 uppercase tracking-wider">UPI Payment Gateway</span>
        </div>

        <p className="text-[10px] text-slate-450 font-bold leading-none">Enable instant payments by uploading your property's UPI QR code. This will be shown to guests during the checkout process.</p>

        <div className="flex flex-col md:flex-row gap-6 items-center pt-2">
          {/* QR Code preview block */}
          <div className="text-center space-y-2 flex-shrink-0">
            <div className="w-32 h-32 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-center shadow-inner p-2">
              <QrCode size={100} className="text-slate-700 stroke-[1.5]" />
            </div>
            <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase">
              Active Status
            </span>
          </div>

          {/* Configuration controls */}
          <div className="flex-1 space-y-4.5 w-full">
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">UPI ID</span>
              <span className="block text-xs font-mono font-extrabold text-rose-700 mt-1">keshavhomestay@okicici</span>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => alert('Updating QR...')}
                className="flex-1 py-3 bg-rose-700 hover:bg-rose-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm"
              >
                Update QR Code
              </button>
              <button 
                onClick={() => alert('Uploading QR...')}
                className="flex-1 py-3 border border-slate-205 hover:bg-slate-50 text-slate-707 font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer bg-white"
              >
                Upload New
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Advance Booking Settings */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-5">
        <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
          <span className="text-xs font-black text-slate-850 uppercase tracking-wider">Advance Booking Settings</span>
          
          <button 
            onClick={() => alert('Settings updated!')}
            className="px-3.5 py-1.5 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-lg text-[9px] uppercase tracking-wider cursor-pointer bg-white flex items-center gap-1"
          >
            <Edit2 size={11} className="text-slate-400" />
            <span>Edit</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-450 font-bold leading-none">Define the required commitment from guests to secure a booking.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Selector options */}
          <div className="space-y-3">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Advance Type</span>
            
            <div 
              onClick={() => setAdvanceType('percent')}
              className={`p-3.5 border rounded-2xl cursor-pointer flex justify-between items-center transition-all ${
                advanceType === 'percent' ? 'border-rose-700 bg-rose-50/10' : 'border-slate-205 hover:bg-slate-50'
              }`}
            >
              <div>
                <span className="block text-[11px] font-black text-slate-850">Percentage (%)</span>
                <span className="block text-[8px] text-slate-400 font-semibold mt-0.5">Calculate based on total booking value</span>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                advanceType === 'percent' ? 'border-rose-700 text-rose-700' : 'border-slate-300'
              }`}>
                {advanceType === 'percent' && <Check size={10} className="stroke-[3]" />}
              </div>
            </div>

            <div 
              onClick={() => setAdvanceType('fixed')}
              className={`p-3.5 border rounded-2xl cursor-pointer flex justify-between items-center transition-all ${
                advanceType === 'fixed' ? 'border-rose-700 bg-rose-50/10' : 'border-slate-205 hover:bg-slate-50'
              }`}
            >
              <div>
                <span className="block text-[11px] font-black text-slate-850">Fixed Amount (₹)</span>
                <span className="block text-[8px] text-slate-400 font-semibold mt-0.5">Set a standard flat fee for all bookings</span>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                advanceType === 'fixed' ? 'border-rose-700 text-rose-700' : 'border-slate-300'
              }`}>
                {advanceType === 'fixed' && <Check size={10} className="stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Counter config */}
          <div className="space-y-3">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Value Configuration</span>
            
            <div className="flex items-center gap-3">
              <div className="flex border border-slate-205 rounded-xl overflow-hidden bg-white shadow-sm">
                <button 
                  onClick={() => adjustPercent(-5)}
                  className="w-10 h-10 border-none bg-transparent hover:bg-slate-50 text-slate-700 cursor-pointer flex items-center justify-center font-bold"
                >
                  <Minus size={13} />
                </button>
                <div className="w-16 h-10 flex items-center justify-center text-sm font-black text-slate-850 border-x border-slate-100">
                  {advancePercent}%
                </div>
                <button 
                  onClick={() => adjustPercent(5)}
                  className="w-10 h-10 border-none bg-transparent hover:bg-slate-50 text-slate-700 cursor-pointer flex items-center justify-center font-bold"
                >
                  <Plus size={13} />
                </button>
              </div>

              <span className="px-3.5 py-2.5 bg-rose-600 text-white font-black text-[10px] uppercase rounded-xl">
                {advancePercent}% of total
              </span>
            </div>

            {/* Explainer Box */}
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex items-start gap-2.5">
              <Info size={14} className="text-slate-400 mt-0.5" />
              <div className="space-y-1">
                <span className="block text-[8px] font-black text-slate-850 uppercase">How it works?</span>
                <p className="text-[9px] text-slate-400 font-bold leading-normal">
                  When you share a public booking link, guests will be prompted to pay exactly {advancePercent}% of the total cost before the reservation is marked as 'Confirmed' in your dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* bottom warning box */}
      <div className="p-4.5 border border-dashed border-rose-300 rounded-2xl bg-rose-50/10 text-[9px] font-bold text-rose-700 flex items-start gap-2">
        <Info size={14} className="text-rose-600 mt-0.5" />
        <div className="space-y-1">
          <span className="block font-black uppercase tracking-wider">Important Note</span>
          <p className="text-rose-650/80 leading-relaxed font-bold">
            Guests will be required to pay the advance amount as per your set preference to confirm the booking. You can update your bank details and QR code anytime, but changes will only apply to new booking requests.
          </p>
        </div>
      </div>

    </div>
  );
}
