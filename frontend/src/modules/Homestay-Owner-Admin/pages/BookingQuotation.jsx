import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft,
  Lock,
  Calendar,
  User,
  DollarSign,
  QrCode,
  Check,
  Copy,
  Smartphone,
  Phone,
  FileText,
  UploadCloud,
  CheckCircle2
} from 'lucide-react';

export default function BookingQuotation() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const [screenshotUploaded, setScreenshotUploaded] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('pphomestay@hbl');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleUploadScreenshot = () => {
    setScreenshotUploaded(true);
    alert('Payment screenshot uploaded successfully! The booking request has been registered and sent to the owner.');
  };

  return (
    <div className="space-y-6 font-sans pb-12 select-none">
      
      {/* Secure Header Banner */}
      <div className="bg-rose-700 text-white text-[9px] font-black uppercase tracking-widest py-2 text-center flex items-center justify-center gap-1.5 rounded-xl shadow-inner">
        <Lock size={10} className="stroke-[3]" />
        <span>Secure Booking Portal</span>
      </div>

      {/* Top Back Nav (Hidden on Quotation PDF print) */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => navigate('/homestay-owner/bookings/requests')}
          className="hover:text-slate-600 bg-transparent border-none cursor-pointer flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400"
        >
          <ArrowLeft size={10} className="stroke-[3]" />
          <span>Back to Requests</span>
        </button>
      </div>

      {/* Quotation Main Layout Card */}
      <div className="max-w-[850px] mx-auto bg-white border border-slate-150 rounded-[28px] overflow-hidden shadow-xl space-y-6 pb-8">
        
        {/* Large Property Banner */}
        <div className="h-64 relative bg-slate-900">
          <img 
            src="https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=1200&h=600&q=80" 
            alt="Panchpokhari Homestay" 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent flex flex-col justify-end p-8 text-white">
            <h1 className="text-xl font-black uppercase tracking-wide leading-none">Panchpokhari Homestay</h1>
            <p className="text-[10px] text-slate-300 font-bold mt-1.5">
              📍 Panchpokhari, Solukhumbu, Nepal
            </p>
          </div>
        </div>

        {/* Quotation Details Summary */}
        <div className="px-8 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <span className="block text-[8px] font-black text-rose-700 uppercase tracking-widest">Booking Reference</span>
            <span className="text-base font-black text-slate-800 tracking-tight block mt-0.5">QTN-2505-000123</span>
            <span className="block text-[8px] text-slate-400 font-bold mt-0.5">Issued on 09 May 2024</span>
          </div>

          <div className="md:text-right">
            <div className="inline-block bg-rose-50 border border-rose-100 px-4 py-2.5 rounded-xl text-left">
              <span className="block text-[8px] font-black text-rose-700 uppercase tracking-wider">Stay Duration</span>
              <span className="block text-xs font-black text-slate-800 font-mono mt-0.5">2 Nights <span className="text-slate-400 font-bold">| May 20 - 22</span></span>
            </div>
          </div>
        </div>

        {/* Accommodation details */}
        <div className="px-8 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Guest Details */}
          <div className="p-5 border border-slate-150 rounded-2xl space-y-3.5 text-xs font-semibold text-slate-500 bg-white">
            <span className="block text-[8px] font-black text-rose-700 uppercase tracking-widest">👤 Guest Details</span>
            
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span>Primary Guest</span>
              <span className="text-slate-800 font-extrabold">Amit Sharma</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span>Phone</span>
              <span className="text-slate-800 font-mono">+91 98765 43210</span>
            </div>
            <div className="flex justify-between">
              <span>Occupancy</span>
              <span className="text-slate-800 font-extrabold text-right">3 People <span className="block text-[9px] text-slate-400 font-bold mt-0.5">(2 Adults, 1 Child)</span></span>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="p-5 border border-slate-150 rounded-2xl space-y-3.5 text-xs font-semibold text-slate-500 bg-white">
            <span className="block text-[8px] font-black text-rose-700 uppercase tracking-widest">💰 Pricing Summary</span>
            
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span>Total Stay Amount</span>
              <span className="font-mono text-slate-800 font-black">₹ 6,720</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2 text-rose-700">
              <span className="font-bold">Advance Required (30%)</span>
              <span className="font-mono font-black">₹ 2,016</span>
            </div>
            <div className="flex justify-between">
              <span>Balance at Check-In</span>
              <span className="font-mono text-slate-800 font-black">₹ 4,704</span>
            </div>
          </div>
        </div>

        {/* Accommodation card */}
        <div className="px-8">
          <div className="p-5 border border-slate-150 rounded-2xl bg-slate-50/30 text-xs font-semibold text-slate-500 space-y-1">
            <span className="block text-[8px] font-black text-rose-700 uppercase tracking-widest">🛏️ Accommodation</span>
            <h4 className="text-slate-800 font-extrabold mt-1">Deluxe Room</h4>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">2 Rooms booked for a comfortable stay.</p>
          </div>
        </div>

        {/* Payment Options (Bank Details / UPI QR Code) */}
        <div className="px-8">
          <div className="p-6 border border-slate-150 rounded-2xl space-y-5 bg-white shadow-sm">
            <span className="block text-[8px] font-black text-rose-700 uppercase tracking-widest">🏦 Payment Options</span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bank Transfer */}
              <div className="space-y-3.5 text-xs font-semibold text-slate-500">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span>Bank Name</span>
                  <span className="text-slate-800 font-extrabold">Himalayan Bank Ltd.</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span>Account Name</span>
                  <span className="text-slate-800 font-extrabold">Panchpokhari Homestay</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span>Account Number</span>
                  <span className="text-slate-800 font-mono">12345678901234</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span>IFSC Code</span>
                  <span className="text-slate-800 font-mono">HMBLNPKA</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>UPI ID</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-800 font-mono">pphomestay@hbl</span>
                    <button 
                      onClick={handleCopyUpi}
                      className="p-1 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                    >
                      {copiedUpi ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* QR Code Scan container matching screenshotexactly */}
              <div className="border border-slate-150 p-4.5 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-2">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider">Scan to pay via UPI</span>
                <div className="w-28 h-28 bg-white border border-slate-150 rounded-xl flex items-center justify-center shadow-inner">
                  <QrCode size={80} className="text-slate-700 stroke-[1.5]" />
                </div>
                <span className="text-[7px] text-slate-400 font-semibold block">Verified Merchant Payment Gateway</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload payment screenshot card */}
        <div className="px-8">
          <div className="p-5 bg-rose-50/20 border border-rose-100 rounded-2xl flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-50 text-rose-700 rounded-xl flex items-center justify-center">
                <UploadCloud size={18} />
              </div>
              <div>
                <span className="block text-xs font-black text-slate-850 uppercase tracking-wider">Confirm your booking</span>
                <span className="block text-[9px] text-slate-400 font-bold mt-0.5">Upload your payment screenshot here for validation.</span>
              </div>
            </div>

            <button
              onClick={handleUploadScreenshot}
              className="px-5 py-3 bg-rose-700 hover:bg-rose-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm flex items-center gap-1.5"
            >
              {screenshotUploaded ? <CheckCircle2 size={13} /> : <UploadCloud size={13} />}
              <span>{screenshotUploaded ? 'Screenshot Uploaded' : 'Upload Screenshot'}</span>
            </button>
          </div>
        </div>

        {/* Disclaimer section */}
        <div className="px-8">
          <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-[9px] font-bold text-slate-400 leading-relaxed">
            ⚠️ Disclaimer: This is a preliminary quotation. The booking status will remain 'Pending' until the deposit is verified. Rooms are subject to availability at the time of payment confirmation.
          </div>
        </div>

        {/* Bottom Property Footer block */}
        <div className="text-center pt-4 border-t border-slate-50 text-[9px] font-black text-slate-400 tracking-wider">
          PANCHPOKHARI HOMESTAY © 2024
        </div>

      </div>

      {/* Share / download Actions */}
      <div className="flex justify-center gap-2.5">
        <button
          onClick={() => alert('Sharing quotation link on WhatsApp...')}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm flex items-center gap-1.5"
        >
          <Smartphone size={13} />
          <span>WhatsApp</span>
        </button>

        <button
          onClick={() => alert('Calling support phone number...')}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm flex items-center gap-1.5"
        >
          <Phone size={13} />
          <span>Call Us</span>
        </button>

        <button
          onClick={() => window.print()}
          className="px-6 py-3 border border-slate-205 hover:bg-slate-50 text-slate-707 font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer bg-white flex items-center gap-1.5"
        >
          <FileText size={13} className="text-slate-400" />
          <span>PDF Copy</span>
        </button>
      </div>

    </div>
  );
}
