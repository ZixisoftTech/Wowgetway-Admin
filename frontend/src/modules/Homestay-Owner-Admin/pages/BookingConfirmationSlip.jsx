import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Building2,
  User,
  Phone,
  Mail,
  Receipt,
  FileText,
  CheckCircle2,
  AlertCircle,
  UtensilsCrossed,
  Check,
  CreditCard
} from 'lucide-react';
import { generatePdfFromElement } from '../../../utils/pdfExporter';
import { 
  WowGatewaysLogo, 
  DocumentCorporateFooter, 
  DocumentActionBar, 
  formatDocDate, 
  formatDocStayDate, 
  formatPhoneWithCountryCode,
  formatHomestayName,
  calculateGstBreakdown 
} from '../components/BookingDocumentShared';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${base}${cleanPath}`;
};

export default function BookingConfirmationSlip() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const receiptRef = useRef(null);

  const getAuthToken = () => {
    return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('token') || localStorage.getItem('superAdminToken');
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

  // Dynamic values
  const property = booking?.propertyId || {};
  const business = property?.businessDetails || booking?.businessDetails || {};

  const bookingIdDisplay = booking?.bookingId || (requestId?.startsWith('WG') ? requestId : `WG-BK-${requestId?.slice(-5) || '01034'}`);
  const shareableSlipUrl = `${window.location.origin}/confirmation-slip/${requestId || booking?._id || booking?.bookingId}`;

  const rawPropName = business?.homestayName || property?.name || booking?.propertyDetails?.propertyName || 'Pandim Homestay';
  const propertyName = formatHomestayName(rawPropName);
  const propertyAddress = business?.fullAddress || [
    property?.address,
    property?.city,
    property?.state
  ].filter(Boolean).join(', ') || 'Plot 42, Apple Orchard Way, Old Manali, HP - 175131';
  const propertyContact = business?.contactNumber || property?.ownerMobile || property?.phone || '+91 98765 43210';
  const propertyEmail = business?.emailId || property?.ownerEmail || 'official@homestaywow.in';
  const propertyGstin = business?.gstNumber || property?.gstNumber || '02AABCT1332F1Z8';

  const guestName = booking?.customer?.name || booking?.guestDetails?.fullName || 'Aditya Joshi';
  const rawPhone = booking?.customer?.mobile || booking?.customer?.phone || booking?.guestDetails?.phone || '9855667788';
  const guestPhone = formatPhoneWithCountryCode(rawPhone);
  const guestEmail = booking?.customer?.email || booking?.guestDetails?.email || 'adityajoshi@example.com';

  const rawIn = booking?.checkInDate || booking?.dates?.checkIn;
  const rawOut = booking?.checkOutDate || booking?.dates?.checkOut;
  const checkInFormatted = formatDocStayDate(rawIn, '02:00 PM');
  const checkOutFormatted = formatDocStayDate(rawOut, '11:00 AM');
  const bookingDate = formatDocDate(booking?.createdAt || new Date());

  // Calculate nights
  let totalNights = 1;
  if (rawIn && rawOut) {
    const diffTime = Math.abs(new Date(rawOut) - new Date(rawIn));
    const calculatedNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (calculatedNights > 0) totalNights = calculatedNights;
  }
  if (booking?.dates?.nights) totalNights = booking.dates.nights;

  const adults = booking?.guests?.adults || booking?.occupancy?.adults || 2;
  const children5To9 = booking?.occupancy?.children5To9 || 0;
  const children0To4 = booking?.occupancy?.children0To4 || 0;

  const roomCount = booking?.bookedRooms?.length || 1;
  const roomNumbers = booking?.bookedRooms?.map(r => r.roomNumber).filter(Boolean).join(', ') || '103';
  const roomCategoryName = booking?.bookedRooms?.[0]?.roomCategoryName || 'Deluxe';
  const roomTypeDisplay = `Room ${roomNumbers} (${roomCategoryName})`;

  // Financials
  const totalAmount = Number(booking?.pricing?.finalAmount || booking?.amount || booking?.pricing?.totalAmount || 12960);
  const advancePaid = Number(booking?.pricing?.paidAmount !== undefined ? booking.pricing.paidAmount : (booking?.pricing?.advancePaid || 12960));
  const balanceDue = booking?.pricing?.pendingAmount !== undefined ? Number(booking.pricing.pendingAmount) : Math.max(0, totalAmount - advancePaid);
  const tax = Number(booking?.pricing?.tax !== undefined ? booking.pricing.tax : 1260);
  const addOns = Number(booking?.pricing?.addOns || (booking?.pricing?.tax !== undefined ? 0 : 1200));
  const addOnsRemark = booking?.pricing?.addOnsRemark || (addOns > 0 ? 'Bonfire & Guided Orchard Trek' : '');
  const extraBed = Number(booking?.pricing?.extraBed || 0);

  const subtotal = Number(booking?.pricing?.bookingAmount || Math.max(0, totalAmount - tax));
  const roomTariffAmount = Math.max(0, subtotal - addOns - extraBed);
  const roomRatePerNight = totalNights > 0 && roomCount > 0 ? Math.round(roomTariffAmount / (totalNights * roomCount)) : roomTariffAmount;

  const gstBreakdown = calculateGstBreakdown(subtotal, tax);
  const isPaid = balanceDue <= 0;

  // Meal Plan & Notes
  const mealPlanDisplay = booking?.mealPlan || booking?.bookedRooms?.[0]?.mealPlan || 'CP';
  const specialRequestsDisplay = booking?.specialRequests || booking?.remarks || addOnsRemark || 'Bonfire & Guided Orchard Trek';

  // Payment method & txn
  const paymentMode = booking?.paymentMethod || booking?.paymentMode || 'UPI';
  const transactionId = booking?.transactionId || (booking?.bankVerification?.utrNumber) || 'UPI-401051-20';

  // Signatory
  const signatoryName = business?.authorizedSignatoryName || property?.ownerName || 'Rajeshwar Sharma';
  const signatoryDesignation = business?.designation || 'Managing Partner & Host';
  const signatureImage = business?.signatureImage || '';

  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `ConfirmationSlip_${bookingIdDisplay}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  const handleDownloadPdf = async () => {
    const element = receiptRef.current;
    if (!element) return;
    try {
      setDownloadingPdf(true);
      const filename = `ConfirmationSlip_${bookingIdDisplay}.pdf`;
      await generatePdfFromElement(element, filename);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Could not generate PDF. Please use the Print option.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSendWhatsApp = () => {
    const rawDigits = guestPhone.replace(/\D/g, '');
    const cleanPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
    const msg = `Namaste ${guestName}! 🙏\n\nYour stay at *${propertyName}* is confirmed!\n\n📋 *Booking Reference:* #${bookingIdDisplay}\n📅 *Stay:* ${checkInFormatted} to ${checkOutFormatted}\n🛏️ *Room:* ${roomTypeDisplay}\n💰 *Total Amount:* ₹${totalAmount.toLocaleString()}\n💳 *Amount Paid:* ₹${advancePaid.toLocaleString()}\n\n🔗 View your complete Confirmation Slip online:\n${shareableSlipUrl}\n\nWe look forward to hosting you!`;
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-500">
        <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider">Loading Confirmation Slip...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 py-4 px-2 sm:px-4 font-sans text-slate-800 print:bg-white print:p-0">
      
      {/* Top Action Bar */}
      <DocumentActionBar 
        onBack={() => navigate(-1)}
        shareableUrl={shareableSlipUrl}
        onDownloadPdf={handleDownloadPdf}
        downloadingPdf={downloadingPdf}
        onPrint={handlePrint}
        onShareWhatsApp={handleSendWhatsApp}
        documentTitle="Confirmation Slip"
      />

      {/* Main Single-Page A4 Canvas */}
      <div 
        ref={receiptRef}
        style={{ 
          width: '100%', 
          maxWidth: '780px', 
          backgroundColor: '#ffffff', 
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          letterSpacing: 'normal',
          wordSpacing: 'normal'
        }}
        className="printable-document mx-auto bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-sm space-y-2.5 print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full"
      >
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-1">
          {/* Header Left: Brand Logo */}
          <div className="space-y-0.5">
            <WowGatewaysLogo size="small" />
          </div>

          {/* Header Right: Homestay Contact Details */}
          <div className="sm:text-right space-y-0.5 text-[10.5px]">
            <h2 className="text-sm font-bold text-slate-900 leading-tight">{propertyName}</h2>
            <p className="text-[10px] text-slate-600 max-w-sm sm:ml-auto leading-tight">{propertyAddress}</p>
            <div className="flex flex-wrap sm:justify-end items-center gap-x-3 text-[10px] text-slate-600">
              <span className="flex items-center gap-1">
                <Phone size={10} className="text-slate-400" />
                <span>{propertyContact}</span>
              </span>
              <span className="flex items-center gap-1">
                <Mail size={10} className="text-slate-400" />
                <span>{propertyEmail}</span>
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-800">
              GSTIN: <span className="font-mono text-slate-900">{propertyGstin}</span>
            </p>
          </div>
        </div>

        <div style={{ borderBottom: '1px solid #e2e8f0' }} />

        {/* Confirmation Banner */}
        <div 
          style={{ backgroundColor: '#fff5f5', border: '1px solid #fecdd3' }}
          className="rounded-lg p-2.5 px-3.5 flex flex-col sm:flex-row justify-between items-center gap-2 shadow-2xs"
        >
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div 
              style={{ backgroundColor: '#e11d48' }}
              className="w-9 h-9 rounded-full text-white flex items-center justify-center shrink-0 shadow-xs"
            >
              <Check size={20} className="stroke-[3]" />
            </div>
            <div>
              <h1 className="text-lg font-black text-[#0f233a] tracking-tight leading-tight">
                CONFIRMATION SLIP
              </h1>
              <p className="text-[10.5px] text-slate-500 mt-0.5 leading-none">
                Your booking is confirmed. We look forward to hosting you!
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-rose-200/60 pt-1 sm:pt-0">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              BOOKING REFERENCE
            </div>
            <div className="text-base font-black text-[#e11d48] font-mono leading-tight">
              #{bookingIdDisplay}
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              BOOKING DATE
            </div>
            <div className="text-[10.5px] font-bold text-slate-800">
              {bookingDate}
            </div>
          </div>
        </div>

        {/* 2-Column Cards: Guest Details & Stay Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Card 1: Guest Details */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="overflow-hidden shadow-2xs">
            <div 
              style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
              className="px-3 py-1.5 flex items-center gap-1.5"
            >
              <User size={13} className="text-[#0f233a]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f233a]">
                GUEST DETAILS
              </span>
            </div>
            <div className="p-2.5 space-y-1 text-[10.5px] text-slate-600">
              <div className="grid grid-cols-[135px_10px_1fr]">
                <span>Guest Name</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{guestName}</strong>
              </div>
              <div className="grid grid-cols-[135px_10px_1fr]">
                <span>Phone Number</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{guestPhone}</strong>
              </div>
              <div className="grid grid-cols-[135px_10px_1fr]">
                <span>Email Address</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900 break-all">{guestEmail}</strong>
              </div>
              <div className="grid grid-cols-[135px_10px_1fr]">
                <span>No. of Adults</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{adults} People <span className="text-slate-500 font-normal">(10+ Years)</span></strong>
              </div>
              <div className="grid grid-cols-[135px_10px_1fr]">
                <span>No. of Children (5–9 Years)</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{children5To9}</strong>
              </div>
              <div className="grid grid-cols-[135px_10px_1fr]">
                <span>No. of Children (0–4 Years)</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{children0To4}</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Stay Details */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="overflow-hidden shadow-2xs">
            <div 
              style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
              className="px-3 py-1.5 flex items-center gap-1.5"
            >
              <Building2 size={13} className="text-[#0f233a]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f233a]">
                STAY DETAILS
              </span>
            </div>
            <div className="p-2.5 space-y-1 text-[10.5px] text-slate-600">
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span>Homestay Name</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{propertyName}</strong>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span>Room Type</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{roomTypeDisplay}</strong>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span>Room Number</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">Room {roomNumbers}</strong>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span>Check-in Date</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{checkInFormatted}</strong>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span>Check-out Date</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{checkOutFormatted}</strong>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span>Total Nights</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{totalNights} {totalNights === 1 ? 'Night' : 'Nights'}</strong>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span>Total Rooms</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{roomCount} {roomCount === 1 ? 'Room' : 'Rooms'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Summary Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="overflow-hidden shadow-2xs">
          <div 
            style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
            className="px-3 py-1.5 flex items-center gap-1.5"
          >
            <FileText size={13} className="text-[#0f233a]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f233a]">
              BOOKING COST SUMMARY
            </span>
          </div>
          <table className="w-full text-left border-collapse text-[10.5px]">
            <thead>
              <tr style={{ backgroundColor: '#0f233a', color: '#ffffff' }} className="text-[9.5px] font-bold uppercase tracking-wider">
                <th className="py-1.5 px-3 w-8 text-center">#</th>
                <th className="py-1.5 px-3">Description</th>
                <th className="py-1.5 px-3 text-center">Nights / Qty</th>
                <th className="py-1.5 px-3 text-right">Rate (₹)</th>
                <th className="py-1.5 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: '#ffffff', color: '#1e293b' }}>
              {/* Row 1: Room Tariff */}
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td className="py-1.5 px-3 text-center font-bold text-slate-700">1</td>
                <td className="py-1.5 px-3">
                  <div className="font-bold text-slate-900">Room Tariff ({roomCategoryName} Room)</div>
                  <div className="text-[9.5px] text-slate-500">
                    {formatDocDate(rawIn)} – {formatDocDate(rawOut)} ({totalNights} {totalNights === 1 ? 'Night' : 'Nights'})
                  </div>
                </td>
                <td className="py-1.5 px-3 text-center font-medium text-slate-700">{totalNights}</td>
                <td className="py-1.5 px-3 text-right font-medium text-slate-800">
                  {roomRatePerNight > 0 ? roomRatePerNight.toLocaleString() : '-'}
                </td>
                <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                  {roomTariffAmount.toLocaleString()}
                </td>
              </tr>

              {/* Row 2: Add-on Services */}
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td className="py-1.5 px-3 text-center font-bold text-slate-700">2</td>
                <td className="py-1.5 px-3">
                  <div className="font-bold text-slate-900">Add-on Services</div>
                  <div className="text-[9.5px] text-slate-500">{addOnsRemark || '-'}</div>
                </td>
                <td className="py-1.5 px-3 text-center text-slate-700">{addOns > 0 ? '1' : '-'}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{addOns > 0 ? addOns.toLocaleString() : '-'}</td>
                <td className="py-1.5 px-3 text-right font-bold text-slate-900">{addOns > 0 ? addOns.toLocaleString() : '0'}</td>
              </tr>

              {/* Subtotal Row */}
              <tr style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
                <td colSpan={3}></td>
                <td className="py-1 px-3 text-right font-bold text-slate-800">
                  Subtotal
                </td>
                <td className="py-1 px-3 text-right font-bold text-slate-900">
                  {subtotal.toLocaleString()}
                </td>
              </tr>

              {/* GST Row */}
              <tr style={{ backgroundColor: '#ffffff' }}>
                <td colSpan={3}></td>
                <td className="py-0.5 px-3 text-right text-slate-600 font-medium text-[10px]">
                  {gstBreakdown.label}
                </td>
                <td className="py-0.5 px-3 text-right font-medium text-slate-900 text-[10px]">
                  {tax.toLocaleString()}
                </td>
              </tr>

              {/* Total Stay Amount Row */}
              <tr style={{ backgroundColor: '#fff1f2', borderTop: '1px solid #fecdd3' }}>
                <td colSpan={2} className="py-2 px-3"></td>
                <td colSpan={2} className="py-2 px-3 text-right font-black text-sm text-[#e11d48]">
                  Total Stay Amount
                </td>
                <td className="py-2 px-3 text-right font-black text-base text-[#e11d48]">
                  ₹ {totalAmount.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Details & Paid Status (2 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Card: Payment Details */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="overflow-hidden shadow-2xs">
            <div 
              style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
              className="px-3 py-1.5 flex items-center gap-1.5"
            >
              <CreditCard size={13} className="text-[#e11d48]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f233a]">
                PAYMENT DETAILS
              </span>
            </div>
            <div className="p-2.5 space-y-1 text-[10.5px] text-slate-600">
              <div className="grid grid-cols-[110px_10px_1fr]">
                <span>Advance Paid</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900 font-bold">₹ {advancePaid.toLocaleString()}</strong>
              </div>
              <div className="grid grid-cols-[110px_10px_1fr]">
                <span>Payment Date</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{bookingDate}</strong>
              </div>
              <div className="grid grid-cols-[110px_10px_1fr]">
                <span>Payment Mode</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{paymentMode}</strong>
              </div>
              <div className="grid grid-cols-[110px_10px_1fr]">
                <span>Transaction ID</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900 font-mono text-[10px]">{transactionId}</strong>
              </div>
              <div className="grid grid-cols-[110px_10px_1fr]">
                <span>Balance Due</span>
                <span className="text-slate-400">:</span>
                <strong className={balanceDue > 0 ? 'text-[#e11d48] font-bold' : 'text-slate-900 font-bold'}>
                  ₹ {balanceDue.toLocaleString()}
                </strong>
              </div>
            </div>
          </div>

          {/* Card: Paid in full status */}
          <div 
            style={{ 
              backgroundColor: isPaid ? '#f0fdf4' : '#fffbeb', 
              borderColor: isPaid ? '#bbf7d0' : '#fde68a',
              borderRadius: '10px'
            }}
            className="border p-3 flex items-center gap-3 shadow-2xs"
          >
            {isPaid ? (
              <>
                <div 
                  style={{ backgroundColor: '#16a34a' }}
                  className="w-9 h-9 rounded-full text-white flex items-center justify-center shrink-0 shadow-xs"
                >
                  <CheckCircle2 size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#15803d] tracking-tight leading-tight">
                    PAID IN FULL
                  </h3>
                  <p className="text-[10.5px] text-slate-600 mt-0.5 leading-tight">
                    Thank you for your payment!
                  </p>
                </div>
              </>
            ) : (
              <>
                <div 
                  style={{ backgroundColor: '#d97706' }}
                  className="w-9 h-9 rounded-full text-white flex items-center justify-center shrink-0 shadow-xs"
                >
                  <AlertCircle size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#b45309] tracking-tight leading-tight">
                    PAYMENT PENDING
                  </h3>
                  <p className="text-[10.5px] text-slate-600 mt-0.5 leading-tight">
                    Balance of <strong className="text-slate-900">₹ {balanceDue.toLocaleString()}</strong> payable at check-in.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Meal Plan & Special Requests / Notes (2 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Card 1: Meal Plan */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="overflow-hidden shadow-2xs">
            <div 
              style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
              className="px-3 py-1.5 flex items-center gap-1.5"
            >
              <UtensilsCrossed size={13} className="text-[#e11d48]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f233a]">
                MEAL PLAN
              </span>
            </div>
            <div className="p-2.5 space-y-0.5">
              <strong className="block text-sm font-black text-slate-900">{mealPlanDisplay}</strong>
              <p className="text-[9.5px] text-slate-500">(As per homestay policy)</p>
            </div>
          </div>

          {/* Card 2: Special Requests / Notes */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="overflow-hidden shadow-2xs">
            <div 
              style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
              className="px-3 py-1.5 flex items-center gap-1.5"
            >
              <FileText size={13} className="text-[#0f233a]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f233a]">
                SPECIAL REQUESTS / NOTES
              </span>
            </div>
            <div className="p-2.5">
              <p className="text-[10.5px] text-slate-700 leading-snug">
                {specialRequestsDisplay}
              </p>
            </div>
          </div>
        </div>

        {/* Signatory Area */}
        <div className="pt-1 flex justify-end">
          <div className="text-right min-w-[170px]">
            <span className="text-[10px] font-bold text-slate-800 block">
              For {propertyName}
            </span>
            <div className="h-6 flex items-end justify-end my-0.5">
              {signatureImage ? (
                <img 
                  src={getImageUrl(signatureImage)} 
                  alt="Authorized Signature" 
                  className="h-6 object-contain"
                />
              ) : (
                <span className="font-serif italic text-base text-slate-800 pr-2">
                  {signatoryName.split(' ')[0] || 'Rajeshwar'}
                </span>
              )}
            </div>
            <div style={{ borderTop: '1px solid #cbd5e1' }} className="pt-0.5 inline-block min-w-[140px]">
              <strong className="block text-[10.5px] text-slate-900">{signatoryName}</strong>
              <span className="text-[9px] text-slate-500 font-medium block">
                {signatoryDesignation}
              </span>
            </div>
          </div>
        </div>

        {/* Corporate Footer */}
        <DocumentCorporateFooter />

      </div>

    </div>
  );
}
