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
  CreditCard,
  IndianRupee,
  Check
} from 'lucide-react';
import { generatePdfFromElement } from '../../../utils/pdfExporter';
import { 
  WowGatewaysLogo, 
  DocumentCorporateFooter, 
  DocumentActionBar, 
  useUpiQrCode, 
  formatDocDate, 
  formatDocStayDate, 
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

export default function BookingQuotation() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const quotationRef = useRef(null);

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
        console.error('Failed to load booking details for quotation:', err);
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
  const shareableQuotationUrl = `${window.location.origin}/quotation/${requestId || booking?._id || booking?.bookingId}`;

  const propertyName = business?.homestayName || property?.name || booking?.propertyDetails?.propertyName || 'Floala Inn';
  const propertyAddress = business?.fullAddress || [
    property?.address,
    property?.city,
    property?.state
  ].filter(Boolean).join(', ') || 'Plot 42, Apple Orchard Way, Old Manali, HP - 175131, India';
  const propertyContact = business?.contactNumber || property?.ownerMobile || property?.phone || '+91 9876543210';
  const propertyEmail = business?.emailId || property?.ownerEmail || 'official@homestaywow.in';
  const propertyGstin = business?.gstNumber || property?.gstNumber || '02AABCT1332F1Z8';

  const guestName = booking?.customer?.name || booking?.guestDetails?.fullName || 'Aditya Joshi';
  const guestPhone = booking?.customer?.mobile || booking?.customer?.phone || booking?.guestDetails?.phone || '+91 9855667788';
  const guestEmail = booking?.customer?.email || booking?.guestDetails?.email || 'adityajoshi@example.com';
  const specialRequests = booking?.specialRequests || booking?.remarks || '-';

  const rawIn = booking?.checkInDate || booking?.dates?.checkIn;
  const rawOut = booking?.checkOutDate || booking?.dates?.checkOut;
  const checkInFormatted = formatDocStayDate(rawIn, '02:00 PM');
  const checkOutFormatted = formatDocStayDate(rawOut, '11:00 AM');
  const issueDate = formatDocDate(booking?.createdAt || new Date());
  
  // Valid till: check-in date or 7 days from creation
  const validTillDate = rawIn ? formatDocDate(rawIn) : formatDocDate(new Date(Date.now() + 7 * 86400000));

  // Calculate nights
  let totalNights = 1;
  if (rawIn && rawOut) {
    const diffTime = Math.abs(new Date(rawOut) - new Date(rawIn));
    const calculatedNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (calculatedNights > 0) totalNights = calculatedNights;
  }
  if (booking?.dates?.nights) totalNights = booking.dates.nights;

  const adults = booking?.guests?.adults || booking?.occupancy?.adults || 2;
  const roomCount = booking?.bookedRooms?.length || 1;
  const roomNumbers = booking?.bookedRooms?.map(r => r.roomNumber).filter(Boolean).join(', ') || '103';
  const roomCategoryName = booking?.bookedRooms?.[0]?.roomCategoryName || 'Standard';
  const roomTypeDisplay = `Room ${roomNumbers} (${roomCategoryName})`;

  // Financials
  const totalAmount = Number(booking?.pricing?.finalAmount || booking?.amount || booking?.pricing?.totalAmount || 12960);
  const advancePaid = Number(booking?.pricing?.paidAmount !== undefined ? booking.pricing.paidAmount : (booking?.pricing?.advancePaid || 12960));
  const balanceDue = booking?.pricing?.pendingAmount !== undefined ? Number(booking.pricing.pendingAmount) : Math.max(0, totalAmount - advancePaid);
  const tax = Number(booking?.pricing?.tax !== undefined ? booking.pricing.tax : 960);
  const addOns = Number(booking?.pricing?.addOns || 0);
  const addOnsRemark = booking?.pricing?.addOnsRemark || '';
  const extraBed = Number(booking?.pricing?.extraBed || 0);

  const subtotal = Number(booking?.pricing?.bookingAmount || Math.max(0, totalAmount - tax));
  const roomTariffAmount = Math.max(0, subtotal - addOns - extraBed);
  const roomRatePerNight = totalNights > 0 && roomCount > 0 ? Math.round(roomTariffAmount / (totalNights * roomCount)) : roomTariffAmount;

  const gstBreakdown = calculateGstBreakdown(subtotal, tax);
  const hasAdvancePaid = advancePaid > 0;

  // Remittance details
  const ownerPay = booking?.ownerPaymentDetails || {};
  const bankName = ownerPay.bankName || 'HDFC Bank';
  const accountHolder = ownerPay.accountHolderName || property?.ownerName || 'priyodeeparkar';
  const fullAccountNumber = ownerPay.accountNumber || '5010 1234 5678 90';
  const maskedAccountNumber = fullAccountNumber.length > 4 
    ? `XXXXXXXXXXXX${fullAccountNumber.slice(-4)}` 
    : fullAccountNumber;
  const ifscCode = ownerPay.ifscCode || 'HDFC0001234';
  const upiId = ownerPay.upiId || 'keshavhomestay@okicici';
  const transactionId = booking?.transactionId || (booking?.bankVerification?.utrNumber) || 'UPI-401051-20';

  const upiQrDataUrl = useUpiQrCode(upiId, accountHolder || propertyName, balanceDue > 0 ? balanceDue : totalAmount);

  // Signatory
  const signatoryName = business?.authorizedSignatoryName || property?.ownerName || 'Rajeshwar Sharma';
  const signatoryDesignation = business?.designation || 'Managing Partner & Host';
  const signatureImage = business?.signatureImage || '';

  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `Quotation_${bookingIdDisplay}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  const handleDownloadPdf = async () => {
    const element = quotationRef.current;
    if (!element) return;
    try {
      setDownloadingPdf(true);
      const filename = `Quotation_${bookingIdDisplay}.pdf`;
      await generatePdfFromElement(element, filename);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Could not generate PDF. Please use the Print option.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSendWhatsApp = () => {
    const rawPhone = guestPhone.replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const msg = `Namaste ${guestName}! 🙏\n\nHere is your Booking Quotation for *${propertyName}*.\n\n📋 *Quotation Ref:* ${bookingIdDisplay}\n📅 *Valid Till:* ${validTillDate}\n📅 *Stay Period:* ${checkInFormatted} to ${checkOutFormatted}\n🛏️ *Room:* ${roomTypeDisplay}\n💰 *Total Stay Amount:* ₹${totalAmount.toLocaleString()}\n\n🔗 View or download your official quotation:\n${shareableQuotationUrl}`;
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-500">
        <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider">Loading Quotation...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 py-6 px-3 sm:px-6 font-sans text-slate-800 print:bg-white print:p-0">
      
      {/* Top Action Bar */}
      <DocumentActionBar 
        onBack={() => navigate(-1)}
        shareableUrl={shareableQuotationUrl}
        onDownloadPdf={handleDownloadPdf}
        downloadingPdf={downloadingPdf}
        onPrint={handlePrint}
        onShareWhatsApp={handleSendWhatsApp}
        documentTitle="Quotation"
      />

      {/* Main A4 Document Canvas */}
      <div 
        ref={quotationRef}
        style={{ width: '100%', maxWidth: '794px', backgroundColor: '#ffffff' }}
        className="mx-auto bg-white border border-slate-200 p-8 sm:p-10 rounded-2xl shadow-md space-y-5 print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full"
      >
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-2">
          {/* Header Left: WOW Gateways Brand */}
          <div className="space-y-1">
            <WowGatewaysLogo />
          </div>

          {/* Header Right: QUOTATION Meta Box */}
          <div 
            style={{ backgroundColor: '#f4f7fb', border: '1px solid #dbe4ee' }}
            className="rounded-xl p-3.5 sm:px-4 flex items-center justify-between gap-6 w-full sm:w-auto shadow-2xs"
          >
            <div>
              <h1 className="text-2xl font-black text-[#0f233a] tracking-tight leading-tight">
                QUOTATION
              </h1>
              <div className="text-lg font-black text-[#0f233a] font-mono leading-tight mt-0.5">
                #{bookingIdDisplay}
              </div>
            </div>

            <div className="border-l border-slate-300 pl-4 space-y-1 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Issue Date</span>
                <strong className="text-slate-900">{issueDate}</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Valid Till</span>
                <strong className="text-slate-900">{validTillDate}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200" />

        {/* 2-Column Cards: Guest Details & Property & Stay Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Guest Details */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div 
              style={{ backgroundColor: '#f1f5f9' }}
              className="px-3.5 py-2 border-b border-slate-200 flex items-center gap-2"
            >
              <User size={14} className="text-[#0f233a]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#0f233a]">
                GUEST DETAILS
              </span>
            </div>
            <div className="p-3.5 space-y-1.5 text-xs text-slate-600">
              <div className="grid grid-cols-[110px_12px_1fr]">
                <span>Guest Name</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{guestName}</strong>
              </div>
              <div className="grid grid-cols-[110px_12px_1fr]">
                <span>Phone Number</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{guestPhone}</strong>
              </div>
              <div className="grid grid-cols-[110px_12px_1fr]">
                <span>Email Address</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900 break-all">{guestEmail}</strong>
              </div>
              <div className="grid grid-cols-[110px_12px_1fr]">
                <span>No. of Guests</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{adults} People <span className="text-slate-500 font-normal">({adults} Adults)</span></strong>
              </div>
              <div className="grid grid-cols-[110px_12px_1fr]">
                <span>Special Requests</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{specialRequests}</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Property & Stay Details */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div 
              style={{ backgroundColor: '#f1f5f9' }}
              className="px-3.5 py-2 border-b border-slate-200 flex items-center gap-2"
            >
              <Building2 size={14} className="text-[#0f233a]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#0f233a]">
                PROPERTY & STAY DETAILS
              </span>
            </div>
            <div className="p-3.5 space-y-1.5 text-xs text-slate-600">
              <div className="grid grid-cols-[110px_12px_1fr]">
                <span>Homestay Name</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{propertyName}</strong>
              </div>
              <div className="grid grid-cols-[110px_12px_1fr]">
                <span>Room Type</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{roomTypeDisplay}</strong>
              </div>
              <div className="grid grid-cols-[110px_12px_1fr]">
                <span>Room Details</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{roomCount} Room</strong>
              </div>
              <div className="grid grid-cols-[110px_12px_1fr]">
                <span>Check-in</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{checkInFormatted}</strong>
              </div>
              <div className="grid grid-cols-[110px_12px_1fr]">
                <span>Check-out</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{checkOutFormatted}</strong>
              </div>
              <div className="grid grid-cols-[110px_12px_1fr]">
                <span>Total Nights</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{totalNights} {totalNights === 1 ? 'Night' : 'Nights'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Summary Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div 
            style={{ backgroundColor: '#f1f5f9' }}
            className="px-3.5 py-2 border-b border-slate-200 flex items-center gap-2"
          >
            <FileText size={14} className="text-[#0f233a]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#0f233a]">
              PRICING SUMMARY
            </span>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr style={{ backgroundColor: '#0f233a', color: '#ffffff' }} className="text-[11px] font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-center">Nights / Qty</th>
                <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {/* Row 1: Room Tariff */}
              <tr>
                <td className="py-3 px-3 text-center font-bold text-slate-700">1</td>
                <td className="py-3 px-3">
                  <div className="font-bold text-slate-900">Room Tariff ({roomCategoryName} Room)</div>
                </td>
                <td className="py-3 px-3 text-center font-medium text-slate-700">{totalNights}</td>
                <td className="py-3 px-3 text-right font-medium text-slate-800">
                  {roomRatePerNight > 0 ? roomRatePerNight.toLocaleString() : '-'}
                </td>
                <td className="py-3 px-3 text-right font-bold text-slate-900">
                  {roomTariffAmount.toLocaleString()}
                </td>
              </tr>

              {/* Row 2: Extra Bed */}
              <tr>
                <td className="py-2.5 px-3 text-center font-bold text-slate-700">2</td>
                <td className="py-2.5 px-3 font-medium text-slate-800">Extra Bed (If Any)</td>
                <td className="py-2.5 px-3 text-center text-slate-500">{extraBed > 0 ? '1' : '0'}</td>
                <td className="py-2.5 px-3 text-right text-slate-700">{extraBed.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-900">{extraBed.toLocaleString()}</td>
              </tr>

              {/* Row 3: Add-ons */}
              <tr>
                <td className="py-2.5 px-3 text-center font-bold text-slate-700">3</td>
                <td className="py-2.5 px-3 font-medium text-slate-800">Add-ons (If Any)</td>
                <td className="py-2.5 px-3 text-center text-slate-500">{addOns > 0 ? '1' : '0'}</td>
                <td className="py-2.5 px-3 text-right text-slate-700">{addOns.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-900">{addOns.toLocaleString()}</td>
              </tr>

              {/* Subtotal Row */}
              <tr className="bg-slate-50/50">
                <td colSpan={3} className="border-t border-slate-200"></td>
                <td className="py-2 px-3 text-right font-bold text-slate-800 border-t border-slate-200">
                  Subtotal
                </td>
                <td className="py-2 px-3 text-right font-bold text-slate-900 border-t border-slate-200">
                  {subtotal.toLocaleString()}
                </td>
              </tr>

              {/* GST Row */}
              <tr className="bg-slate-50/50">
                <td colSpan={3}></td>
                <td className="py-1.5 px-3 text-right text-slate-600 font-medium">
                  {gstBreakdown.label.replace('GST @', 'Taxes & Fees (').replace(' (CGST', ' (').replace(')', ')')}
                </td>
                <td className="py-1.5 px-3 text-right font-medium text-slate-900">
                  {tax.toLocaleString()}
                </td>
              </tr>

              {/* Total Stay Amount Row */}
              <tr style={{ backgroundColor: '#fff1f2' }}>
                <td colSpan={2} className="py-3 px-3"></td>
                <td colSpan={2} className="py-3 px-3 text-right font-black text-lg text-[#e11d48]">
                  Total Stay Amount
                </td>
                <td className="py-3 px-3 text-right font-black text-xl text-[#e11d48]">
                  ₹ {totalAmount.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3 Stat / KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Total Stay Amount */}
          <div className="border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs bg-white">
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-[#e11d48] flex items-center justify-center shrink-0">
              <CreditCard size={18} />
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-medium">Total Stay Amount</span>
              <strong className="block text-lg font-black text-slate-900">
                ₹ {totalAmount.toLocaleString()}
              </strong>
            </div>
          </div>

          {/* Card 2: Advance Paid */}
          <div className="border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs bg-white">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <IndianRupee size={18} />
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-medium">Advance Paid</span>
              <strong className="block text-lg font-black text-emerald-600">
                ₹ {advancePaid.toLocaleString()}
              </strong>
            </div>
          </div>

          {/* Card 3: Balance Due */}
          <div className="border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs bg-white">
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-medium">Balance Due at Check-in</span>
              <strong className={`block text-lg font-black ${balanceDue > 0 ? 'text-[#e11d48]' : 'text-slate-900'}`}>
                ₹ {balanceDue.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

        {/* Advance Payment Verification Banner */}
        {hasAdvancePaid ? (
          <div 
            style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}
            className="border rounded-xl p-3 px-4 flex flex-col sm:flex-row justify-between items-center gap-2 shadow-2xs"
          >
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div 
                style={{ backgroundColor: '#16a34a' }}
                className="w-7 h-7 rounded-full text-white flex items-center justify-center shrink-0"
              >
                <Check size={16} className="stroke-[3]" />
              </div>
              <div>
                <strong className="block text-xs font-bold text-slate-900">
                  Advance Payment Received
                </strong>
                <span className="block text-[10px] text-slate-500 font-mono">
                  UPI Transaction: {transactionId}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <div className="text-right">
                <strong className="block text-sm font-bold text-emerald-700">
                  ₹ {advancePaid.toLocaleString()}
                </strong>
                <span className="block text-[10px] text-slate-500">
                  {issueDate}
                </span>
              </div>
              <span 
                style={{ backgroundColor: '#16a34a' }}
                className="text-white text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider shadow-xs"
              >
                VERIFIED
              </span>
            </div>
          </div>
        ) : (
          <div 
            style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}
            className="border rounded-xl p-3 px-4 flex justify-between items-center gap-2 shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div 
                style={{ backgroundColor: '#d97706' }}
                className="w-7 h-7 rounded-full text-white flex items-center justify-center shrink-0"
              >
                <AlertCircle size={16} className="stroke-[2.5]" />
              </div>
              <div>
                <strong className="block text-xs font-bold text-[#b45309]">
                  Advance Payment Required
                </strong>
                <span className="block text-[10px] text-slate-600">
                  Please deposit minimum 50% advance to confirm your booking dates.
                </span>
              </div>
            </div>
            <span 
              style={{ backgroundColor: '#d97706' }}
              className="text-white text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider shadow-xs"
            >
              PENDING
            </span>
          </div>
        )}

        {/* Bank & UPI Details for Balance Settlement (Full Width) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div 
            style={{ backgroundColor: '#f1f5f9' }}
            className="px-3.5 py-2 border-b border-slate-200 flex items-center gap-2"
          >
            <Building2 size={14} className="text-[#0f233a]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#0f233a]">
              BANK & UPI DETAILS FOR BALANCE SETTLEMENT
            </span>
          </div>
          <div className="p-3.5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <div className="space-y-1.5 text-slate-600 flex-1 w-full">
              <div className="grid grid-cols-[120px_12px_1fr]">
                <span>Bank Name</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{bankName}</strong>
              </div>
              <div className="grid grid-cols-[120px_12px_1fr]">
                <span>Account Name</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{accountHolder}</strong>
              </div>
              <div className="grid grid-cols-[120px_12px_1fr]">
                <span>Account Number</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900 font-mono">{maskedAccountNumber}</strong>
              </div>
              <div className="grid grid-cols-[120px_12px_1fr]">
                <span>IFSC Code</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900 font-mono">{ifscCode}</strong>
              </div>
              <div className="grid grid-cols-[120px_12px_1fr]">
                <span>UPI ID</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900 font-mono text-[11px] break-all">{upiId}</strong>
              </div>
            </div>

            {/* Scannable UPI QR */}
            {upiQrDataUrl && (
              <div className="text-center shrink-0 flex flex-col items-center border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                <span className="text-[10px] text-slate-600 font-bold block mb-1">
                  Scan & Pay via UPI
                </span>
                <img 
                  src={upiQrDataUrl} 
                  alt="UPI QR Code" 
                  className="w-24 h-24 object-contain bg-white rounded border border-slate-100 p-1"
                />
                <span className="font-mono text-[9px] text-slate-500 font-semibold mt-1 max-w-[110px] truncate block">
                  {upiId}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Terms & Conditions + Authorized Signatory (2 Columns) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div 
            style={{ backgroundColor: '#f1f5f9' }}
            className="px-3.5 py-2 border-b border-slate-200 flex items-center gap-2"
          >
            <FileText size={14} className="text-[#0f233a]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#0f233a]">
              TERMS & CONDITIONS
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-6 items-end">
            <ol className="list-decimal pl-3.5 space-y-1 text-[9.5px] text-slate-600 leading-snug">
              <li>This is a quotation and not a confirmed booking.</li>
              <li>Rates are valid for the mentioned dates and are subject to availability.</li>
              <li>Any changes in dates, room type, or guest count may affect the total amount.</li>
              <li>This quotation includes applicable taxes as per current government rules.</li>
              <li>Check-in and check-out time as per homestay policy.</li>
              <li>Cancellation and refund will be as per the homestay&apos;s policy.</li>
              <li>For any assistance, please contact us at <strong className="text-slate-800">support@wowgateways.com</strong>.</li>
            </ol>

            {/* Authorized Signatory */}
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-800 block">
                For WOW Gateways
              </span>
              <div className="h-10 flex items-end justify-end my-1">
                {signatureImage ? (
                  <img 
                    src={getImageUrl(signatureImage)} 
                    alt="Authorized Signature" 
                    className="h-9 object-contain"
                  />
                ) : (
                  <span className="font-serif italic text-lg text-slate-800 pr-2">
                    {signatoryName.split(' ')[0] || 'Rajeshwar'}
                  </span>
                )}
              </div>
              <div className="border-t border-slate-300 pt-1 inline-block min-w-[150px]">
                <strong className="block text-xs text-slate-900">{signatoryName}</strong>
                <span className="text-[10px] text-slate-500 font-medium block">
                  {signatoryDesignation}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Corporate Footer */}
        <DocumentCorporateFooter />

      </div>

    </div>
  );
}
