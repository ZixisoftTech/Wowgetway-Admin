import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
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
  Share2,
  RefreshCw,
  CheckCircle,
  Tag,
  Download,
  Copy,
  Check
} from 'lucide-react';
import { generatePdfFromElement } from '../../../utils/pdfExporter';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export default function BookingConfirmationSlip() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const getAuthToken = () => {
    return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
  };

  useEffect(() => {
    const fetchBooking = async () => {
      if (!requestId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = getAuthToken();
        let res;
        if (token) {
          try {
            res = await axios.get(getApiUrl(`/api/homestay-owner/bookings/${requestId}`), {
              headers: { Authorization: `Bearer ${token}` }
            });
          } catch (authErr) {
            res = await axios.get(getApiUrl(`/api/public/booking/${requestId}`));
          }
        } else {
          res = await axios.get(getApiUrl(`/api/public/booking/${requestId}`));
        }

        if (res?.data?.booking) {
          setBooking(res.data.booking);
        } else if (res?.data) {
          setBooking(res.data);
        }
      } catch (err) {
        console.error('Failed to load booking details for confirmation slip:', err);
        setError('Could not find or load booking record.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [requestId]);

  const bookingIdDisplay = booking?.bookingId || (requestId?.startsWith('WG') ? requestId : `#${requestId?.slice(-6) || 'BOOKING'}`);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const receiptRef = useRef(null);

  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `Receipt_Confirmation_${bookingIdDisplay.replace('#', '')}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  const handleDownloadPdf = async () => {
    const element = receiptRef.current || document.getElementById('confirmation-receipt-slip');
    if (!element) return;

    try {
      setDownloadingPdf(true);
      const cleanBookingId = bookingIdDisplay.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Receipt_Confirmation_${cleanBookingId}.pdf`;
      await generatePdfFromElement(element, filename);
    } catch (err) {
      console.error('Direct PDF download error:', err);
      alert('Could not download PDF. Please try again or use the print option.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Dynamic values with robust fallbacks
  const propertyName = booking?.propertyId?.name || booking?.propertyDetails?.propertyName || 'Homestay Sanctuary';
  const propertyAddress = [
    booking?.propertyId?.address,
    booking?.propertyId?.city,
    booking?.propertyId?.state
  ].filter(Boolean).join(', ') || booking?.propertyDetails?.location || 'Himachal Pradesh, India';
  const ownerName = booking?.propertyId?.ownerName || booking?.propertyDetails?.ownerName || 'Homestay Host';
  const ownerPhone = booking?.propertyId?.phone || booking?.propertyId?.ownerMobile || '+91 98765 43210';

  const guestName = booking?.customer?.name || booking?.guestDetails?.fullName || 'Guest';
  const guestPhone = booking?.customer?.mobile || booking?.customer?.phone || booking?.guestDetails?.phone || '+91 98765 43210';
  const guestEmail = booking?.customer?.email || booking?.guestDetails?.email || '';

  const rawIn = booking?.checkInDate || booking?.dates?.checkIn;
  const rawOut = booking?.checkOutDate || booking?.dates?.checkOut;

  const checkInDate = rawIn 
    ? new Date(rawIn).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Pending';
  const checkOutDate = rawOut 
    ? new Date(rawOut).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Pending';
  const bookingDate = booking?.createdAt || booking?.bookingDate
    ? new Date(booking.createdAt || booking.bookingDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  const bookedRooms = booking?.bookedRooms || [];
  const roomAdultsTotal = bookedRooms.reduce((sum, r) => sum + (Number(r.adults) || 2), 0);
  const roomChildTotal = bookedRooms.reduce((sum, r) => sum + (Number(r.child5_9) || 0) + (Number(r.child0_4) || 0), 0);

  const adults = (booking?.guests?.adults && booking.guests.adults > 0)
    ? booking.guests.adults 
    : (roomAdultsTotal || 2);
  const child5To9 = (booking?.guests?.children !== undefined && booking.guests.children > 0)
    ? booking.guests.children
    : roomChildTotal;
  const childUnder5 = booking?.occupancy?.childrenUnder5 || 0;
  const roomCount = bookedRooms.length || 1;
  const roomNumbers = bookedRooms.map(r => r.roomNumber).join(', ') || booking?.propertyDetails?.roomNumber || 'Room 1';

  const totalAmount = Number(booking?.pricing?.finalAmount || booking?.amount || booking?.pricing?.totalAmount || 0);
  const advancePaid = Number(booking?.pricing?.paidAmount || booking?.pricing?.advancePaid || 0);
  const balanceAmount = booking?.pricing?.pendingAmount !== undefined ? Number(booking.pricing.pendingAmount) : Math.max(0, totalAmount - advancePaid);
  const tax = Number(booking?.pricing?.tax || 0);
  const addOns = Number(booking?.pricing?.addOns || 0);
  const addOnsRemark = booking?.pricing?.addOnsRemark || '';
  const baseTariff = Number(booking?.pricing?.bookingAmount || booking?.pricing?.baseRate || booking?.pricing?.baseTariff || Math.max(0, totalAmount - tax - addOns));

  const mealPlan = booking?.bookedRooms?.[0]?.mealPlan || booking?.mealPlan || 'EP (Room Only)';
  const specialRequests = booking?.specialRequests || 'Standard check-in procedure requested.';

  const shareableSlipUrl = `${window.location.origin}/confirmation-slip/${requestId || booking?._id || booking?.bookingId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableSlipUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // WhatsApp share handler
  const handleSendWhatsApp = () => {
    const rawPhone = guestPhone.replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const msg = 
`Namaste ${guestName}! 🙏

Your booking at *${propertyName}* is confirmed!

📋 *Booking Ref:* #${bookingIdDisplay}
📅 *Check-In:* ${checkInDate}
📅 *Check-Out:* ${checkOutDate}
🛏️ *Room(s):* ${roomNumbers}
👥 *Guests:* ${adults} Adult(s)${child5To9 > 0 ? `, ${child5To9} Child(ren)` : ''}

💰 *Pricing Summary:*
• Total Stay: ₹${totalAmount.toLocaleString()}
• Advance Paid: ₹${advancePaid.toLocaleString()}
• Balance Due at Check-In: ₹${balanceAmount.toLocaleString()}${addOns > 0 ? `\n• Add-ons (₹${addOns}): ${addOnsRemark || 'Included'}` : ''}

📍 *Address:* ${propertyAddress}
📞 *Host Contact:* ${ownerPhone} (${ownerName})

🔗 *View Confirmation Receipt Online:* ${shareableSlipUrl}

We look forward to hosting you!`;

    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Email share handler
  const handleSendEmail = () => {
    const subject = `Booking Confirmation - ${propertyName} (#${bookingIdDisplay})`;
    const body = 
`Dear ${guestName},

Thank you for choosing ${propertyName}! Your booking is confirmed.

Booking Reference: #${bookingIdDisplay}
Check-In: ${checkInDate}
Check-Out: ${checkOutDate}
Room(s): ${roomNumbers}
Total Amount: Rs. ${totalAmount.toLocaleString()}
Advance Paid: Rs. ${advancePaid.toLocaleString()}
Balance Pending: Rs. ${balanceAmount.toLocaleString()}

Homestay Address: ${propertyAddress}
Host Contact: ${ownerPhone} (${ownerName})

View Receipt Online: ${shareableSlipUrl}

Warm regards,
${propertyName} Team`;

    window.location.href = `mailto:${guestEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-500">
        <RefreshCw size={24} className="animate-spin text-rose-600" />
        <span className="text-xs font-bold uppercase tracking-wider">Loading confirmation slip...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12 select-none print:p-0">
      
      {/* Top Header Buttons (Hidden on print) */}
      <div className="flex flex-wrap justify-between items-center gap-3 print:hidden">
        <button 
          onClick={() => navigate(-1)}
          className="hover:text-slate-600 bg-transparent border-none cursor-pointer flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400"
        >
          <ArrowLeft size={10} className="stroke-[3]" />
          <span>Back to Availability / Calendar</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={handleCopyLink}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 transition-all"
            title="Copy shareable receipt link"
          >
            {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <button 
            onClick={handleSendWhatsApp}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 shadow-sm transition-all"
            title="Share via WhatsApp"
          >
            <Share2 size={13} />
            <span>Share WhatsApp</span>
          </button>

          <button 
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 disabled:bg-rose-400 text-white font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 shadow-sm transition-all"
            title="Download Receipt as PDF file"
          >
            {downloadingPdf ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
            <span>{downloadingPdf ? 'Downloading Receipt...' : 'Download Receipt (PDF)'}</span>
          </button>

          <button 
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 transition-all"
            title="Print Receipt"
          >
            <Printer size={13} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Confirmation Slip Card Container */}
      <div ref={receiptRef} id="confirmation-receipt-slip" className="printable-document max-w-[780px] mx-auto bg-white border border-slate-150 p-8 sm:p-10 rounded-[24px] shadow-lg space-y-8 print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full">
        
        {/* Top Property Info */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-rose-50 text-rose-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Home size={26} />
          </div>
          <div>
            <h2 className="text-sm font-black text-rose-700 uppercase tracking-wider">{propertyName}</h2>
            <p className="text-[9px] text-slate-400 font-bold max-w-sm mx-auto leading-relaxed">
              {propertyAddress}
            </p>
            <div className="flex justify-center items-center gap-4 text-[8px] font-black uppercase text-slate-400 mt-1.5">
              <span>Owner: <strong className="text-slate-800">{ownerName}</strong></span>
              <span>•</span>
              <span>Phone: <strong className="text-slate-800">{ownerPhone}</strong></span>
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-100"></div>
          <span className="flex-shrink mx-4 text-[10px] font-black text-rose-700 uppercase tracking-widest">
            CONFIRMATION SLIP
          </span>
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
            <span className="text-slate-800 font-extrabold text-right">{guestName}</span>
          </div>

          {/* Booking ID */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <div className="flex items-center gap-2">
              <Layers size={13} className="text-slate-400" />
              <span>Booking ID:</span>
            </div>
            <span className="text-rose-700 font-black text-right">#{bookingIdDisplay}</span>
          </div>

          {/* Phone */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <div className="flex items-center gap-2">
              <Phone size={13} className="text-slate-400" />
              <span>Phone:</span>
            </div>
            <span className="text-slate-800 font-extrabold text-right">{guestPhone}</span>
          </div>

          {/* Booking Date */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-slate-400" />
              <span>Booking Date:</span>
            </div>
            <span className="text-slate-800 font-extrabold text-right">{bookingDate}</span>
          </div>

          {/* Adults */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <span>Total Adults (10+ Years):</span>
            <span className="text-slate-800 font-extrabold">{adults}</span>
          </div>

          {/* Number of Rooms */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <span>Number of Rooms:</span>
            <span className="text-slate-800 font-extrabold">{roomCount}</span>
          </div>

          {/* Child 5-9 */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <span>Total Child (5-9 Years):</span>
            <span className="text-slate-800 font-extrabold">{child5To9}</span>
          </div>

          {/* Room Number */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <span>Room Number:</span>
            <span className="text-slate-800 font-extrabold">Room {roomNumbers}</span>
          </div>

          {/* Child 0-4 */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <span>Total Child (0-4 Years):</span>
            <span className="text-slate-800 font-extrabold">{childUnder5}</span>
          </div>

          {/* Check-In */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <span>Check-In Date:</span>
            <span className="text-slate-800 font-extrabold">{checkInDate}</span>
          </div>

          {/* Space filler */}
          <div className="hidden md:block"></div>

          {/* Check-Out */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <span>Check-Out Date:</span>
            <span className="text-slate-800 font-extrabold">{checkOutDate}</span>
          </div>

        </div>

        {/* Pricing Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5.5 pt-2">
          {/* Left Pricing details */}
          <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl space-y-3 text-xs font-semibold text-slate-500">
            <div className="flex justify-between">
              <span>Room Tariff:</span>
              <span className="font-mono text-slate-800 font-bold">₹ {baseTariff.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>GST / Taxes:</span>
              <span className="font-mono text-slate-800 font-bold">₹ {tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                <span>Add-ons:</span>
                {addOnsRemark && <span className="text-[10px] text-slate-400 font-bold">({addOnsRemark})</span>}
              </span>
              <span className="font-mono text-slate-800 font-bold">₹ {addOns.toLocaleString()}</span>
            </div>
          </div>

          {/* Right Red Summary Box */}
          <div className="bg-rose-700 text-white p-5 rounded-2xl space-y-3 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-rose-100 font-bold">Total Amount:</span>
              <span className="font-mono font-black text-sm">₹ {totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-rose-100 font-bold">Advance Paid:</span>
              <span className="font-mono font-black text-sm">₹ {advancePaid.toLocaleString()}</span>
            </div>
            <div className="border-t border-rose-600/50 pt-2 flex justify-between items-center">
              <span className="text-rose-100 font-black uppercase text-[10px]">Balance Due:</span>
              <span className="font-mono font-black text-base text-rose-50">₹ {balanceAmount.toLocaleString()}/-</span>
            </div>
          </div>
        </div>

        {/* Meal & Special Requests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-semibold text-slate-500">
          <div className="p-4 border border-slate-150 rounded-xl space-y-1">
            <span className="block text-[8px] font-black text-rose-700 uppercase tracking-wider">Meal Plan:</span>
            <span className="block text-slate-800 font-extrabold mt-0.5">{mealPlan}</span>
          </div>

          <div className="p-4 border border-slate-150 rounded-xl space-y-1">
            <span className="block text-[8px] font-black text-slate-700 uppercase tracking-wider">Special Requests / Notes:</span>
            <span className="block text-slate-800 font-extrabold mt-0.5">{specialRequests}</span>
          </div>
        </div>

        {/* Signature Line */}
        <div className="flex justify-end pt-6">
          <div className="text-center space-y-1 border-t border-slate-100 pt-3.5 w-44">
            <span className="font-serif italic text-base text-slate-700 block">{ownerName}</span>
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Authorized Signature</span>
          </div>
        </div>

        {/* Bottom Footer block */}
        <div className="text-center space-y-1 pt-4.5 border-t border-slate-50">
          <p className="text-[10px] text-rose-700 font-black flex items-center justify-center gap-1">
            <span>Thank you for choosing {propertyName}. We look forward to welcoming you!</span>
            <Heart size={10} className="fill-rose-700 stroke-rose-700" />
          </p>
          <span className="block text-[8px] font-bold text-slate-400">
            © {new Date().getFullYear()} {propertyName}. This is a computer-generated confirmation slip.
          </span>
        </div>

      </div>

      {/* Sharing controls at the bottom */}
      <div className="flex flex-wrap justify-center gap-2.5 print:hidden">
        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="px-6 py-3 bg-rose-700 hover:bg-rose-800 disabled:bg-rose-400 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm flex items-center gap-1.5 transition-all"
        >
          {downloadingPdf ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
          <span>{downloadingPdf ? 'Downloading Receipt...' : 'Download Receipt (PDF)'}</span>
        </button>

        <button
          onClick={handlePrint}
          className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none flex items-center gap-1.5 transition-all"
        >
          <Printer size={13} />
          <span>Print</span>
        </button>

        <button
          onClick={handleSendWhatsApp}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Share2 size={13} />
          <span>Send via WhatsApp</span>
        </button>

        <button
          onClick={handleSendEmail}
          className="px-6 py-3 border border-slate-205 hover:bg-slate-50 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer bg-white flex items-center gap-1.5 transition-all"
        >
          <Mail size={13} className="text-slate-400" />
          <span>Email Confirmation</span>
        </button>
      </div>

    </div>
  );
}
