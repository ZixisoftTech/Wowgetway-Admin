import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft,
  Printer,
  Home,
  User,
  Phone,
  Calendar,
  Layers,
  Heart,
  Mail,
  Share2
} from 'lucide-react';

export default function BookingConfirmationSlip() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans pb-12 select-none print:p-0">
      
      {/* Top Header Buttons (Hidden on print) */}
      <div className="flex justify-between items-center print:hidden">
        <button 
          onClick={() => navigate('/homestay-owner/bookings/requests')}
          className="hover:text-slate-600 bg-transparent border-none cursor-pointer flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400"
        >
          <ArrowLeft size={10} className="stroke-[3]" />
          <span>Back to Dashboard</span>
        </button>

        <button 
          onClick={handlePrint}
          className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 shadow-sm"
        >
          <Printer size={12} />
          <span>Print Confirmation</span>
        </button>
      </div>

      {/* Confirmation Slip Card Container */}
      <div className="max-w-[780px] mx-auto bg-white border border-slate-150 p-10 rounded-[24px] shadow-lg space-y-8 print:border-none print:shadow-none print:p-0">
        
        {/* Top Property Info */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-rose-50 text-rose-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Home size={26} />
          </div>
          <div>
            <h2 className="text-sm font-black text-rose-700 uppercase tracking-wider">Bloom Homestay</h2>
            <p className="text-[9px] text-slate-400 font-bold max-w-sm mx-auto leading-relaxed">
              #123, Green Valley, Manali, Himachal Pradesh, India
            </p>
            <div className="flex justify-center items-center gap-4 text-[8px] font-black uppercase text-slate-400 mt-1.5">
              <span>Owner: <strong className="text-slate-800">Keshav</strong></span>
              <span>•</span>
              <span>Phone: <strong className="text-slate-800">+91 98765 43210</strong></span>
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-100"></div>
          <span className="flex-shrink mx-4 text-[10px] font-black text-rose-700 uppercase tracking-widest">CONFIRMATION SLIP</span>
          <div className="flex-grow border-t border-slate-100"></div>
        </div>

        {/* Details Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4.5 text-xs font-semibold text-slate-500">
          
          {/* Guest Name */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <div className="flex items-center gap-2">
              <User size={13} className="text-slate-400" />
              <span>Guest Name:</span>
            </div>
            <span className="text-slate-800 font-extrabold text-right">Priya Mehta</span>
          </div>

          {/* Booking ID */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <div className="flex items-center gap-2">
              <Layers size={13} className="text-slate-400" />
              <span>Booking ID:</span>
            </div>
            <span className="text-rose-700 font-black text-right">#HB4243</span>
          </div>

          {/* Phone */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <div className="flex items-center gap-2">
              <Phone size={13} className="text-slate-400" />
              <span>Phone:</span>
            </div>
            <span className="text-slate-800 font-extrabold text-right">+91 98765 43210</span>
          </div>

          {/* Date */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-slate-400" />
              <span>Date:</span>
            </div>
            <span className="text-slate-800 font-extrabold text-right">20 Apr 2024</span>
          </div>

          {/* Adults */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <span>Total Adults (10+ Years):</span>
            <span className="text-slate-800 font-extrabold">2</span>
          </div>

          {/* Number of Rooms */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <span>Number of Rooms:</span>
            <span className="text-slate-800 font-extrabold">1</span>
          </div>

          {/* Child 5-9 */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <span>Total Child (5-9 Years):</span>
            <span className="text-slate-800 font-extrabold">1</span>
          </div>

          {/* Room Number */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <span>Room Number:</span>
            <span className="text-slate-800 font-extrabold">203 (Super Deluxe)</span>
          </div>

          {/* Child 0-4 */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <span>Total Child (0-4 Years):</span>
            <span className="text-slate-800 font-extrabold">0</span>
          </div>

          {/* Check-In */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <span>Check-In Date:</span>
            <span className="text-slate-800 font-extrabold">20 Apr 2024</span>
          </div>

          {/* Space filler */}
          <div className="hidden md:block"></div>

          {/* Check-Out */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <span>Check-Out Date:</span>
            <span className="text-slate-800 font-extrabold">23 Apr 2024</span>
          </div>

        </div>

        {/* Pricing Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5.5 pt-2">
          {/* Left Pricing details */}
          <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl space-y-3 text-xs font-semibold text-slate-500">
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className="font-mono text-slate-850 font-bold">₹ 5,700</span>
            </div>
            <div className="flex justify-between">
              <span>GST (5%):</span>
              <span className="font-mono text-slate-850 font-bold">₹ 450</span>
            </div>
            <div className="flex justify-between">
              <span>Add-ons:</span>
              <span className="font-mono text-slate-850 font-bold">₹ 0</span>
            </div>
          </div>

          {/* Right Red Summary Box */}
          <div className="bg-rose-700 text-white p-5 rounded-2xl space-y-3 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-rose-100 font-bold">Final Amount:</span>
              <span className="font-mono font-black text-sm">₹ 5,700</span>
            </div>
            <div className="flex justify-between">
              <span className="text-rose-100 font-bold">Advance Paid:</span>
              <span className="font-mono font-black text-sm">₹ 5,000</span>
            </div>
            <div className="border-t border-rose-600/50 pt-2 flex justify-between items-center">
              <span className="text-rose-100 font-black uppercase text-[10px]">Balance Amount:</span>
              <span className="font-mono font-black text-base text-rose-50">₹ 700/-</span>
            </div>
          </div>
        </div>

        {/* Meal & Special Requests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-semibold text-slate-500">
          <div className="p-4 border border-slate-150 rounded-xl space-y-1">
            <span className="block text-[8px] font-black text-rose-700 uppercase tracking-wider">Meal Plan:</span>
            <span className="block text-slate-800 font-extrabold mt-0.5">Breakfast & Dinner</span>
          </div>

          <div className="p-4 border border-slate-150 rounded-xl space-y-1">
            <span className="block text-[8px] font-black text-slate-700 uppercase tracking-wider">Special Requests / Notes:</span>
            <span className="block text-slate-800 font-extrabold mt-0.5">Early check-in requested.</span>
          </div>
        </div>

        {/* Signature Line */}
        <div className="flex justify-end pt-6">
          <div className="text-center space-y-1 border-t border-slate-100 pt-3.5 w-44">
            <span className="font-serif italic text-base text-slate-700 block">Keshav Singh</span>
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Owner Signature</span>
          </div>
        </div>

        {/* Bottom Footer block */}
        <div className="text-center space-y-1 pt-4.5 border-t border-slate-50">
          <p className="text-[10px] text-rose-700 font-black flex items-center justify-center gap-1">
            <span>Thank you for choosing Bloom Homestay. We look forward to serving you!</span>
            <Heart size={10} className="fill-rose-700 stroke-rose-700" />
          </p>
          <span className="block text-[8px] font-bold text-slate-400">
            © 2024 Bloom Homestay. This is a computer-generated confirmation slip.
          </span>
        </div>

      </div>

      {/* Sharing controls at the bottom */}
      <div className="flex justify-center gap-2.5 print:hidden">
        <button
          onClick={() => alert('Sending notification via WhatsApp...')}
          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm flex items-center gap-1.5"
        >
          <Share2 size={13} />
          <span>Send WhatsApp</span>
        </button>

        <button
          onClick={() => alert('Sending confirmation email...')}
          className="px-5 py-3 border border-slate-205 hover:bg-slate-50 text-slate-707 font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer bg-white flex items-center gap-1.5"
        >
          <Mail size={13} className="text-slate-400" />
          <span>Email Confirmation</span>
        </button>
      </div>

    </div>
  );
}
