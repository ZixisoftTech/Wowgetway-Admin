import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
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
  CheckCircle2,
  RefreshCw,
  Printer,
  Download,
  Share2
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { generatePdfFromElement } from '../../../utils/pdfExporter';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export default function BookingQuotation() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screenshotUploaded, setScreenshotUploaded] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const quotationRef = useRef(null);

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
          } catch (e) {
            res = await axios.get(getApiUrl(`/api/public/booking/${requestId}`));
          }
        } else {
          res = await axios.get(getApiUrl(`/api/public/booking/${requestId}`));
        }

        if (res?.data?.booking || res?.data) {
          setBooking(res.data.booking || res.data);
        }
      } catch (err) {
        console.error('Failed to load booking details for quotation:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [requestId]);

  const handleCopyUpi = () => {
    const targetUpi = booking?.ownerPaymentDetails?.upiId || 'keshavhomestay@okicici';
    navigator.clipboard.writeText(targetUpi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const shareableQuotationUrl = `${window.location.origin}/quotation/${requestId || booking?._id || booking?.bookingId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableQuotationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const propertyName = booking?.propertyId?.name || booking?.propertyDetails?.propertyName || 'Homestay Sanctuary';
  const propertyLocation = [
    booking?.propertyId?.address,
    booking?.propertyId?.city,
    booking?.propertyId?.state
  ].filter(Boolean).join(', ') || booking?.propertyDetails?.location || 'Himachal Pradesh, India';
  const ownerPhone = booking?.propertyId?.phone || booking?.propertyId?.ownerMobile || '+91 98765 43210';
  const ownerName = booking?.propertyId?.ownerName || booking?.propertyDetails?.ownerName || 'Host';

  const guestName = booking?.customer?.name || booking?.guestDetails?.fullName || 'Guest';
  const guestPhone = booking?.customer?.mobile || booking?.customer?.phone || booking?.guestDetails?.phone || '+91 98765 43210';
  const bookingIdDisplay = booking?.bookingId || (requestId?.startsWith('WG') ? requestId : `QTN-${requestId?.slice(-6) || '2505-000123'}`);

  const rawIn = booking?.checkInDate || booking?.dates?.checkIn;
  const rawOut = booking?.checkOutDate || booking?.dates?.checkOut;

  const checkInDate = rawIn 
    ? new Date(rawIn).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Pending';
  const checkOutDate = rawOut 
    ? new Date(rawOut).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Pending';
  const totalNights = (rawIn && rawOut) 
    ? Math.max(1, Math.round((new Date(rawOut) - new Date(rawIn)) / (1000 * 60 * 60 * 24)))
    : (booking?.dates?.totalNights || 2);

  const bookedRooms = booking?.bookedRooms || [];
  const roomAdultsTotal = bookedRooms.reduce((sum, r) => sum + (Number(r.adults) || 2), 0);
  const roomChildTotal = bookedRooms.reduce((sum, r) => sum + (Number(r.child5_9) || 0) + (Number(r.child0_4) || 0), 0);

  const adults = (booking?.guests?.adults !== undefined && Number(booking.guests.adults) > 0)
    ? Number(booking.guests.adults) 
    : (roomAdultsTotal || 2);
  const child5To9 = (booking?.guests?.children !== undefined)
    ? Number(booking.guests.children)
    : roomChildTotal;
  const totalPeople = Math.max(1, adults + child5To9);

  const totalAmount = Number(booking?.pricing?.finalAmount || booking?.amount || booking?.pricing?.totalAmount || 0);
  const paidAdvanceAmount = Number(booking?.advancePayment?.amount || booking?.pricing?.paidAmount || 0);
  const advanceRequired = paidAdvanceAmount > 0 ? paidAdvanceAmount : Math.round(totalAmount * 0.3);
  const balanceAtCheckIn = booking?.pricing?.pendingAmount !== undefined 
    ? Number(booking.pricing.pendingAmount) 
    : Math.max(0, totalAmount - advanceRequired);

  const hasAdvancePaid = paidAdvanceAmount > 0;
  const utrNumber = booking?.advancePayment?.transactionId || booking?.paymentDetails?.transactionId || '';

  const roomCount = booking?.bookedRooms?.length || 1;
  const roomNames = booking?.bookedRooms?.map(r => `Room ${r.roomNumber}`).join(', ') || (booking?.propertyDetails?.roomNumber ? `Room ${booking.propertyDetails.roomNumber}` : 'Deluxe Room');

  const ownerPay = booking?.ownerPaymentDetails || {};
  const bankName = ownerPay.bankName || 'HDFC Bank';
  const accountHolder = ownerPay.accountHolderName || propertyName || 'Homestay Host';
  const accountNumber = ownerPay.accountNumber || '';
  const ifscCode = ownerPay.ifscCode || '';
  const branch = ownerPay.branch || '';
  const upiId = ownerPay.upiId || 'keshavhomestay@okicici';
  const upiQr = ownerPay.upiQrCode || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(propertyName)}&am=${advanceRequired}&cu=INR`)}`;

  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `Quotation_${bookingIdDisplay.replace('#', '')}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  const handleDownloadPdf = async () => {
    const element = quotationRef.current || document.querySelector('.printable-document');
    if (!element) return;

    try {
      setDownloadingPdf(true);
      const cleanQtn = bookingIdDisplay.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Quotation_${cleanQtn}.pdf`;
      await generatePdfFromElement(element, filename);
    } catch (err) {
      console.error('Direct PDF download error:', err);
      alert('Could not download PDF. Please try again or use the print option.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleWhatsAppShare = () => {
    const rawPhone = guestPhone.replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const text = `Namaste ${guestName}! 🙏\n\n` +
      `Here is your Official Booking Quotation for *${propertyName}*.\n\n` +
      `📋 *Quotation Ref:* #${bookingIdDisplay}\n` +
      `📅 *Check-In:* ${checkInDate}\n` +
      `📅 *Check-Out:* ${checkOutDate} (${totalNights} Night${totalNights > 1 ? 's' : ''})\n` +
      `👥 *Guests:* ${adults} Adults${child5To9 > 0 ? `, ${child5To9} Children (5-9y)` : ''}\n` +
      `🛏️ *Room(s):* ${roomNames}\n\n` +
      `💰 *Tariff Breakdown:*\n` +
      `• Total Stay Cost: ₹${totalAmount.toLocaleString()}\n` +
      `• Advance Required to Confirm: ₹${advanceRequired.toLocaleString()}\n` +
      `• Balance at Check-In: ₹${balanceAtCheckIn.toLocaleString()}\n\n` +
      `📲 *Instant UPI Payment:*\n` +
      `• UPI ID: ${upiId}\n` +
      (accountNumber ? `\n🏦 *Bank Transfer:*\n• Bank: ${bankName}\n• A/C: ${accountNumber}\n• IFSC: ${ifscCode}\n• Holder: ${accountHolder}\n` : '') +
      `\n🔗 View Quotation Online: ${shareableQuotationUrl}\n\n` +
      `Please pay the advance to confirm and secure your dates!`;
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-500">
        <RefreshCw size={24} className="animate-spin text-rose-600" />
        <span className="text-xs font-bold uppercase tracking-wider">Loading quotation...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12 select-none">
      
      {/* Secure Header Banner */}
      <div className="bg-rose-700 text-white text-[9px] font-black uppercase tracking-widest py-2 text-center flex items-center justify-center gap-1.5 rounded-xl shadow-inner">
        <Lock size={10} className="stroke-[3]" />
        <span>Secure Booking Portal</span>
      </div>

      {/* Top Back Nav & Print Button (Hidden on Quotation PDF print) */}
      <div className="flex flex-wrap justify-between items-center gap-3 print:hidden">
        <button 
          onClick={() => navigate(-1)}
          className="hover:text-slate-600 bg-transparent border-none cursor-pointer flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400"
        >
          <ArrowLeft size={10} className="stroke-[3]" />
          <span>Back to Availability / Calendar</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 disabled:bg-rose-400 text-white font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 shadow-sm transition-all"
            title="Download Quotation as PDF file"
          >
            {downloadingPdf ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
            <span>{downloadingPdf ? 'Downloading PDF...' : 'Download PDF'}</span>
          </button>

          <button 
            onClick={handleWhatsAppShare}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 shadow-sm transition-all"
            title="Share Quotation with Guest on WhatsApp"
          >
            <Share2 size={13} />
            <span>Share WhatsApp</span>
          </button>

          <button 
            onClick={handleCopyLink}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 transition-all"
            title="Copy Quotation Link to Clipboard"
          >
            {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>

          <button 
            onClick={handlePrint}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 transition-all"
            title="Print Quotation"
          >
            <Printer size={13} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Quotation Main Layout Card */}
      <div ref={quotationRef} className="printable-document max-w-[850px] mx-auto bg-white border border-slate-150 rounded-[28px] overflow-hidden shadow-xl space-y-6 pb-8 print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full">
        
        {/* Large Property Banner (CSS Gradient with text for zero external CORS issues) */}
        <div className="h-44 relative bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 print:hidden flex flex-col justify-end p-8 text-white">
          <h1 className="text-xl font-black uppercase tracking-wide leading-none">{propertyName}</h1>
          <p className="text-[10px] text-slate-300 font-bold mt-1.5">
            📍 {propertyLocation}
          </p>
        </div>

        {/* Clean Print-Only Header */}
        <div className="hidden print:block p-6 border-b border-slate-200">
          <h1 className="text-lg font-black text-rose-700 uppercase tracking-wide">{propertyName}</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">📍 {propertyLocation} • Host: {ownerName} ({ownerPhone})</p>
        </div>

        {/* Quotation Details Summary */}
        <div className="px-8 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <span className="block text-[8px] font-black text-rose-700 uppercase tracking-widest">Booking Reference</span>
            <span className="text-base font-black text-slate-800 tracking-tight block mt-0.5">#{bookingIdDisplay}</span>
            <span className="block text-[8px] text-slate-400 font-bold mt-0.5">
              Issued on {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div className="md:text-right">
            <div className="inline-block bg-rose-50 border border-rose-100 px-4 py-2.5 rounded-xl text-left">
              <span className="block text-[8px] font-black text-rose-700 uppercase tracking-wider">Stay Duration</span>
              <span className="block text-xs font-black text-slate-800 font-mono mt-0.5">
                {totalNights} Night{totalNights > 1 ? 's' : ''} <span className="text-slate-400 font-bold">| {checkInDate} - {checkOutDate}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Accommodation details */}
        <div className="px-8 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Guest Details */}
          <div className="p-5 border border-slate-150 rounded-2xl space-y-3.5 text-xs font-semibold text-slate-500 bg-white shadow-xs">
            <span className="block text-[8px] font-black text-rose-700 uppercase tracking-widest">👤 Guest Details</span>
            
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span>Primary Guest</span>
              <span className="text-slate-800 font-extrabold">{guestName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span>Phone</span>
              <span className="text-slate-800 font-mono">{guestPhone}</span>
            </div>
            <div className="flex justify-between">
              <span>Occupancy</span>
              <span className="text-slate-800 font-extrabold text-right">
                {totalPeople} {totalPeople === 1 ? 'Person' : 'People'} <span className="block text-[9px] text-slate-400 font-bold mt-0.5">({adults} Adults{child5To9 > 0 ? `, ${child5To9} Child (5-9y)` : ''})</span>
              </span>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="p-5 border border-slate-150 rounded-2xl space-y-3.5 text-xs font-semibold text-slate-500 bg-white shadow-xs">
            <span className="block text-[8px] font-black text-rose-700 uppercase tracking-widest">💰 Pricing Summary</span>
            
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span>Total Stay Amount</span>
              <span className="font-mono text-slate-800 font-black">₹ {totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2 text-rose-700">
              <span className="font-bold">{hasAdvancePaid ? 'Advance Paid' : 'Advance Required'}</span>
              <span className="font-mono font-black">₹ {advanceRequired.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Balance Due at Check-In</span>
              <span className="font-mono text-slate-800 font-black">₹ {balanceAtCheckIn.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Accommodation card */}
        <div className="px-8">
          <div className="p-5 border border-slate-150 rounded-2xl bg-slate-50/50 text-xs font-semibold text-slate-500 space-y-1">
            <span className="block text-[8px] font-black text-rose-700 uppercase tracking-widest">🛏️ Accommodation</span>
            <h4 className="text-slate-800 font-extrabold mt-1">{roomNames}</h4>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
              {roomCount} {roomCount === 1 ? 'Room' : 'Rooms'} reserved for a comfortable stay.
            </p>
          </div>
        </div>

        {/* Advance Payment Record (if paid) */}
        {hasAdvancePaid && (
          <div className="px-8">
            <div className="p-5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-emerald-150 pb-2">
                <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">
                  ✅ Advance Payment Details
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase">
                  {booking?.bookingStatus === 'Confirmed' ? 'Verified' : 'Submitted (Pending Verification)'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-semibold text-slate-600">
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase">Advance Amount Paid</span>
                  <span className="text-emerald-700 font-extrabold text-sm block mt-0.5">₹ {paidAdvanceAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase">Transaction Reference (UTR)</span>
                  <span className="text-slate-800 font-mono font-extrabold block mt-0.5">{utrNumber || 'Recorded via UPI'}</span>
                </div>
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase">Remaining Balance Due</span>
                  <span className="text-rose-700 font-extrabold text-sm block mt-0.5">₹ {balanceAtCheckIn.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Host Payment Account Details */}
        <div className="px-8">
          <div className="p-6 border border-slate-150 rounded-2xl space-y-5 bg-white shadow-xs">
            <span className="block text-[8px] font-black text-rose-700 uppercase tracking-widest">
              🏦 {hasAdvancePaid ? 'Bank & UPI Details for Balance Settlement' : 'Payment Options (Bank Details / UPI QR Code)'}
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bank Transfer */}
              <div className="space-y-3.5 text-xs font-semibold text-slate-500">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span>Bank Name</span>
                  <span className="text-slate-800 font-extrabold">{bankName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span>Account Name</span>
                  <span className="text-slate-800 font-extrabold">{accountHolder}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span>Account Number</span>
                  <span className="text-slate-800 font-mono font-bold">{accountNumber}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span>IFSC Code</span>
                  <span className="text-slate-800 font-mono font-bold">{ifscCode}</span>
                </div>
                {branch && (
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span>Branch</span>
                    <span className="text-slate-800 font-bold">{branch}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span>UPI ID</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-800 font-mono font-bold text-rose-700">{upiId}</span>
                    <button 
                      onClick={handleCopyUpi}
                      className="p-1 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                    >
                      {copiedUpi ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* QR Code Scan container */}
              <div className="border border-slate-150 p-4.5 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-2">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider">Scan to pay via UPI</span>
                <div className="w-28 h-28 bg-white border border-slate-150 rounded-xl flex items-center justify-center shadow-inner overflow-hidden p-1.5">
                  {upiQr ? (
                    <img src={upiQr} alt="UPI QR" className="w-full h-full object-contain" />
                  ) : (
                    <QrCode size={80} className="text-slate-700 stroke-[1.5]" />
                  )}
                </div>
                <span className="text-[7px] text-slate-400 font-semibold block font-mono">{upiId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer section */}
        <div className="px-8">
          <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-[9px] font-bold text-slate-400 leading-relaxed">
            ⚠️ Disclaimer: This is an official booking quotation. {hasAdvancePaid ? 'Advance payment has been submitted. Check-in is subject to host verification.' : 'The booking will remain on hold until the deposit is verified.'}
          </div>
        </div>

        {/* Bottom Property Footer block */}
        <div className="text-center pt-4 border-t border-slate-50 text-[9px] font-black text-slate-400 tracking-wider uppercase">
          {propertyName} © {new Date().getFullYear()}
        </div>

      </div>

      {/* Share / download Actions */}
      <div className="flex flex-wrap justify-center gap-2.5 print:hidden">
        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="px-6 py-3 bg-rose-700 hover:bg-rose-800 disabled:bg-rose-400 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm flex items-center gap-1.5 transition-all"
        >
          {downloadingPdf ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
          <span>{downloadingPdf ? 'Downloading Quotation...' : 'Download Quotation (PDF)'}</span>
        </button>

        <button
          onClick={handlePrint}
          className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none flex items-center gap-1.5 transition-all"
        >
          <Printer size={13} />
          <span>Print</span>
        </button>

        <button
          onClick={handleWhatsAppShare}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Smartphone size={13} />
          <span>Share via WhatsApp</span>
        </button>

        <button
          onClick={() => alert(`Calling host ${ownerName} at ${ownerPhone}...`)}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Phone size={13} />
          <span>Call Us</span>
        </button>
      </div>

    </div>
  );
}
