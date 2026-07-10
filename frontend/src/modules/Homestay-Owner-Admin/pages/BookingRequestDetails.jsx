import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft,
  Info,
  Calendar,
  User,
  DollarSign,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  FileText,
  MessageSquare,
  Clock,
  Printer
} from 'lucide-react';

export default function BookingRequestDetails() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  // Mock details matching details layout exactly
  const [request, setRequest] = useState({
    id: requestId || 'BR-2505-00024',
    qtnId: 'GTV-2505-00123',
    source: 'WoW Gateways (Admin)',
    sourceType: 'admin',
    guestName: 'Amit Sharma',
    phone: '+91 98765 43210',
    email: 'amit@gmail.com',
    checkIn: '20 May 2024 (Mon)',
    checkOut: '22 May 2024 (Wed)',
    roomDetails: 'Deluxe Room x 1',
    roomDesc: '2 Rooms\n2 Adults, 1 Child',
    totalAmount: '₹ 6,720',
    advance: '₹ 2,016',
    advancePercentage: '30%',
    remaining: '₹ 4,704',
    remainingPercentage: '70%',
    status: 'Partially Paid',
    requestedOn: '09 May 2024, 10:30 AM',
    requestedBy: 'Admin / WoW Gateways',
    paymentScreenshot: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=600&h=450&q=80',
    screenshotName: 'payment_screenshot_09052024.jpg'
  });

  const handleConfirmSettle = () => {
    alert('Booking confirmed and settled successfully!');
    navigate(`/homestay-owner/bookings/confirmation-slip/${request.id}`);
  };

  const handleCancelRequest = () => {
    if (confirm('Are you sure you want to cancel this booking request?')) {
      alert('Booking request cancelled.');
      navigate('/homestay-owner/bookings/requests');
    }
  };

  return (
    <div className="space-y-6 font-sans pb-12 select-none">
      
      {/* Top Breadcrumb */}
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <button 
          onClick={() => navigate('/homestay-owner/bookings/requests')}
          className="hover:text-slate-600 bg-transparent border-none cursor-pointer flex items-center gap-1 p-0 text-[10px] font-black uppercase text-slate-400"
        >
          <ArrowLeft size={10} className="stroke-[3]" />
          <span>Back to Booking Requests</span>
        </button>
      </div>

      {/* Header section */}
      <div className="space-y-1">
        <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Booking Request Details</h1>
        <p className="text-[10px] font-bold text-slate-400">View complete details of this booking request</p>
      </div>

      {/* Orange Alert banner */}
      <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-2xl text-[10px] font-bold flex items-start gap-3">
        <Info size={16} className="text-amber-600 mt-0.5" />
        <div className="space-y-1">
          <span className="block font-black uppercase tracking-wider">This booking request is from WoW Gateways (Admin)</span>
          <p className="text-amber-700/80 font-bold leading-relaxed">
            This is a pending booking. Please review and confirm to settle the booking.
          </p>
        </div>
      </div>

      {/* Grid container layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Left Column (Info sheets) */}
        <div className="space-y-6">
          
          {/* Booking Information */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5">
              <FileText size={16} className="text-rose-700" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Booking Information</span>
              <span className="ml-auto px-2.5 py-1 bg-amber-50 text-amber-500 text-[8px] font-black uppercase rounded-lg">
                Pending
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Booking ID</span>
                <span className="text-slate-800 font-extrabold block mt-1">{request.id}</span>
                <span className="text-[8px] text-slate-400 font-mono mt-0.5">ID: {request.qtnId}</span>
              </div>
              
              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Source</span>
                <span className="text-rose-700 font-black block mt-1">{request.source}</span>
              </div>

              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Booking Requested On</span>
                <span className="text-slate-800 font-extrabold block mt-1">{request.requestedOn}</span>
              </div>

              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Requested By</span>
                <span className="text-slate-800 font-extrabold block mt-1">{request.requestedBy}</span>
              </div>
            </div>
          </div>

          {/* Guest Details */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5">
              <User size={16} className="text-rose-700" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Guest Details</span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-slate-500">
              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Guest Name</span>
                <span className="text-slate-800 font-extrabold block mt-1">{request.guestName}</span>
              </div>

              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Guest Mobile Number</span>
                <span className="text-slate-800 font-extrabold block mt-1">{request.phone}</span>
              </div>

              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Guest Email</span>
                <span className="text-slate-800 font-extrabold block mt-1">{request.email}</span>
              </div>
            </div>
          </div>

          {/* Stay Details */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5">
              <Calendar size={16} className="text-rose-700" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Stay Details</span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-slate-500 pb-3 border-b border-slate-50">
              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Check-In Date</span>
                <span className="text-slate-800 font-extrabold block mt-1">{request.checkIn}</span>
              </div>

              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Check-Out Date</span>
                <span className="text-slate-800 font-extrabold block mt-1">{request.checkOut}</span>
              </div>

              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Stay Duration</span>
                <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-[8px] font-black uppercase rounded mt-1.5 inline-block">
                  2 Nights
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Room Details</span>
              <p className="text-xs font-black text-slate-800">{request.roomDetails}</p>
              <pre className="text-[10px] text-slate-400 font-semibold mt-1 font-sans leading-relaxed">{request.roomDesc}</pre>
            </div>
          </div>

        </div>

        {/* Right Column (Payment Sheet) */}
        <div className="space-y-6">
          
          {/* Payment Summary */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5">
              <DollarSign size={16} className="text-rose-700" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Payment Summary</span>
            </div>

            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                <span className="block text-[7px] font-black text-slate-400 uppercase">Total Amount</span>
                <span className="text-xs font-black text-slate-800 block mt-1 font-mono">{request.totalAmount}</span>
              </div>

              <div className="p-3 bg-emerald-50/20 border border-emerald-150 rounded-xl">
                <span className="block text-[7px] font-black text-slate-400 uppercase">Advance Paid</span>
                <span className="text-xs font-black text-emerald-600 block mt-1 font-mono">{request.advance}</span>
                <span className="text-[7px] text-emerald-500 font-bold">({request.advancePercentage})</span>
              </div>

              <div className="p-3 bg-rose-50/20 border border-rose-150 rounded-xl">
                <span className="block text-[7px] font-black text-slate-400 uppercase">Remaining Amount</span>
                <span className="text-xs font-black text-rose-700 block mt-1 font-mono">{request.remaining}</span>
                <span className="text-[7px] text-rose-500 font-bold">({request.remainingPercentage})</span>
              </div>

              <div className="p-3 bg-amber-50/20 border border-amber-150 rounded-xl flex flex-col justify-center items-center">
                <span className="block text-[7px] font-black text-slate-400 uppercase">Payment Status</span>
                <span className="text-[9px] font-black text-amber-500 block mt-1">{request.status}</span>
                <span className="text-[7px] text-amber-400 font-bold">Pending Settlement</span>
              </div>
            </div>
          </div>

          {/* Payment Proof (Advance Paid) screenshot card */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5">
              <ImageIcon size={16} className="text-rose-700" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Payment Proof (Advance Paid)</span>
            </div>

            <div className="border border-slate-150 rounded-2xl overflow-hidden bg-slate-50 p-2.5">
              <div className="h-64 rounded-xl overflow-hidden shadow-inner bg-white border border-slate-100">
                <img src={request.paymentScreenshot} alt="Payment Receipt Screenshot" className="w-full h-full object-contain" />
              </div>
              
              <div className="flex justify-between items-center mt-2.5 px-1.5">
                <span className="text-[9px] font-bold text-slate-400 font-mono">{request.screenshotName}</span>
                <a 
                  href={request.paymentScreenshot} 
                  download 
                  className="text-[9px] font-black text-rose-700 uppercase tracking-wider hover:underline"
                >
                  Download Proof
                </a>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Action panel at the bottom matching style exactly */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Left generate PDF/Quotations buttons */}
        <div className="flex gap-2.5 w-full md:w-auto">
          <button
            onClick={() => navigate(`/homestay-owner/bookings/quotation/${request.id}`)}
            className="flex-1 md:flex-none px-4.5 py-3 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center justify-center gap-1.5"
          >
            <FileText size={13} className="text-slate-400" />
            <span>Generate Quotation</span>
          </button>

          <button
            onClick={() => navigate(`/homestay-owner/bookings/confirmation-slip/${request.id}`)}
            className="flex-1 md:flex-none px-4.5 py-3 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center justify-center gap-1.5"
          >
            <Printer size={13} className="text-slate-400" />
            <span>Generate Confirmation Slip</span>
          </button>
        </div>

        {/* Right Cancel/Confirm buttons */}
        <div className="flex gap-2.5 w-full md:w-auto">
          <button
            onClick={handleCancelRequest}
            className="flex-1 md:flex-none px-5 py-3 border border-rose-600 hover:bg-rose-50/10 text-rose-700 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center justify-center gap-1.5"
          >
            <XCircle size={13} />
            <span>Cancel Request</span>
          </button>

          <button
            onClick={handleConfirmSettle}
            className="flex-1 md:flex-none px-5 py-3 bg-rose-700 hover:bg-rose-850 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center justify-center gap-1.5 shadow-sm"
          >
            <CheckCircle2 size={13} />
            <span>Confirm & Settle Booking</span>
          </button>
        </div>
      </div>

    </div>
  );
}
