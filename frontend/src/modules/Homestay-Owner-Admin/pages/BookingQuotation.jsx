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

  const rawPropName = business?.homestayName || property?.name || booking?.propertyDetails?.propertyName || 'Homestay';
  const propertyName = formatHomestayName(rawPropName);
  const propertyAddress = business?.fullAddress || [
    property?.address,
    property?.city,
    property?.state
  ].filter(Boolean).join(', ') || '';
  const propertyContact = business?.contactNumber || property?.ownerMobile || property?.phone || '';
  const propertyEmail = business?.emailId || property?.ownerEmail || '';
  const propertyGstin = business?.gstNumber || property?.gstNumber || '';

  const guestName = booking?.customer?.name || booking?.guestDetails?.fullName || '-';
  const rawPhone = booking?.customer?.mobile || booking?.customer?.phone || booking?.guestDetails?.phone || '';
  const guestPhone = formatPhoneWithCountryCode(rawPhone);
  const guestEmail = booking?.customer?.email || booking?.guestDetails?.email || '';
  const specialRequests = booking?.specialRequests || booking?.remarks || '';

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

  const adults = booking?.guests?.adults || booking?.occupancy?.adults || 1;
  const roomCount = booking?.bookedRooms?.length || 1;
  const roomNumbers = booking?.bookedRooms?.map(r => r.roomNumber).filter(Boolean).join(', ') || '-';
  const roomCategoryName = booking?.bookedRooms?.[0]?.roomCategoryName || 'Standard';
  const roomTypeDisplay = roomNumbers !== '-' ? `Room ${roomNumbers} (${roomCategoryName})` : roomCategoryName;

  // Financials
  const totalAmount = Number(booking?.pricing?.finalAmount || booking?.amount || booking?.pricing?.totalAmount || 0);
  const advancePaid = Number(booking?.pricing?.paidAmount !== undefined ? booking.pricing.paidAmount : (booking?.pricing?.advancePaid || 0));
  const balanceDue = booking?.pricing?.pendingAmount !== undefined ? Number(booking.pricing.pendingAmount) : Math.max(0, totalAmount - advancePaid);
  const tax = Number(booking?.pricing?.tax !== undefined ? booking.pricing.tax : 0);
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
  const bankName = ownerPay.bankName || '';
  const accountHolder = ownerPay.accountHolderName || property?.ownerName || '';
  const fullAccountNumber = ownerPay.accountNumber || '';
  const maskedAccountNumber = fullAccountNumber.length > 4 
    ? `XXXXXXXXXXXX${fullAccountNumber.slice(-4)}` 
    : fullAccountNumber;
  const ifscCode = ownerPay.ifscCode || '';
  const upiId = ownerPay.upiId || '';
  const transactionId = booking?.transactionId || (booking?.bankVerification?.utrNumber) || '-';

  const upiQrDataUrl = useUpiQrCode(upiId, accountHolder || propertyName, balanceDue > 0 ? balanceDue : totalAmount);

  // Signatory & Branding
  const signatoryName = business?.authorizedSignatoryName || property?.ownerName || '';
  const signatoryDesignation = business?.designation || (signatoryName ? 'Authorized Signatory' : '');
  const signatureImage = business?.signatureImage || '';
  const stampImage = business?.stampImage || '';
  const propertyLogo = business?.logo || property?.logo || '';
  const propertyId = property?._id || property?.id || booking?.propertyId?._id || booking?.propertyId;

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
    const rawDigits = guestPhone.replace(/\D/g, '');
    const cleanPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
    const msg = `Namaste ${guestName}! 🙏\n\nHere is your Booking Quotation for *${propertyName}*.\n\n📋 *Quotation Ref:* #${bookingIdDisplay}\n📅 *Valid Till:* ${validTillDate}\n📅 *Stay Period:* ${checkInFormatted} to ${checkOutFormatted}\n🛏️ *Room:* ${roomTypeDisplay}\n💰 *Total Stay Amount:* ₹${totalAmount.toLocaleString()}\n\n🔗 View or download your official quotation:\n${shareableQuotationUrl}`;
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
    <div className="min-h-screen bg-slate-50/60 py-4 px-2 sm:px-4 font-sans text-slate-800 print:bg-white print:p-0">
      
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

      {/* Main Single-Page A4 Canvas */}
      <div 
        ref={quotationRef}
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
          {/* Header Left: WOW Gateways Brand & Property Logo */}
          <div className="flex items-center gap-3">
            {propertyLogo && (
              <img 
                src={getImageUrl(propertyLogo)} 
                alt={propertyName} 
                className="h-10 w-auto max-w-[120px] object-contain rounded"
              />
            )}
            <WowGatewaysLogo size="small" />
          </div>

          {/* Header Right: QUOTATION Meta Box */}
          <div 
            style={{ backgroundColor: '#f4f7fb', border: '1px solid #dbe4ee', borderRadius: '10px' }}
            className="p-2.5 px-3.5 flex items-center justify-between gap-5 w-full sm:w-auto shadow-2xs"
          >
            <div>
              <h1 className="text-xl font-black text-[#0f233a] tracking-tight leading-tight">
                QUOTATION
              </h1>
              <div className="text-base font-black text-[#0f233a] font-mono leading-tight mt-0.5">
                #{bookingIdDisplay}
              </div>
            </div>

            <div style={{ borderLeft: '1px solid #cbd5e1' }} className="pl-3.5 space-y-0.5 text-[10.5px] text-slate-600">
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

        <div style={{ borderBottom: '1px solid #e2e8f0' }} />

        {/* 2-Column Cards: Guest Details & Property & Stay Details */}
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
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span>Guest Name</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{guestName}</strong>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span>Phone Number</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{guestPhone}</strong>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span>Email Address</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900 break-all">{guestEmail || '-'}</strong>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span>No. of Guests</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{adults} People <span className="text-slate-500 font-normal">({adults} Adults)</span></strong>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span>Special Requests</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{specialRequests || '-'}</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Property & Stay Details */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="overflow-hidden shadow-2xs">
            <div 
              style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
              className="px-3 py-1.5 flex items-center gap-1.5"
            >
              <Building2 size={13} className="text-[#0f233a]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f233a]">
                PROPERTY & STAY DETAILS
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
                <span>Room Details</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{roomCount} Room</strong>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span>Check-in</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{checkInFormatted}</strong>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span>Check-out</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{checkOutFormatted}</strong>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span>Total Nights</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{totalNights} {totalNights === 1 ? 'Night' : 'Nights'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Summary Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="overflow-hidden shadow-2xs">
          <div 
            style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
            className="px-3 py-1.5 flex items-center gap-1.5"
          >
            <FileText size={13} className="text-[#0f233a]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f233a]">
              PRICING SUMMARY
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
                </td>
                <td className="py-1.5 px-3 text-center font-medium text-slate-700">{totalNights}</td>
                <td className="py-1.5 px-3 text-right font-medium text-slate-800">
                  {roomRatePerNight > 0 ? roomRatePerNight.toLocaleString() : '-'}
                </td>
                <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                  {roomTariffAmount.toLocaleString()}
                </td>
              </tr>

              {/* Row 2: Extra Bed */}
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td className="py-1.5 px-3 text-center font-bold text-slate-700">2</td>
                <td className="py-1.5 px-3 font-medium text-slate-800">Extra Bed (If Any)</td>
                <td className="py-1.5 px-3 text-center text-slate-500">{extraBed > 0 ? '1' : '0'}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{extraBed.toLocaleString()}</td>
                <td className="py-1.5 px-3 text-right font-bold text-slate-900">{extraBed.toLocaleString()}</td>
              </tr>

              {/* Row 3: Add-ons */}
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td className="py-1.5 px-3 text-center font-bold text-slate-700">3</td>
                <td className="py-1.5 px-3 font-medium text-slate-800">Add-ons (If Any)</td>
                <td className="py-1.5 px-3 text-center text-slate-500">{addOns > 0 ? '1' : '0'}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{addOns.toLocaleString()}</td>
                <td className="py-1.5 px-3 text-right font-bold text-slate-900">{addOns.toLocaleString()}</td>
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
                  {gstBreakdown.label.replace('GST @', 'Taxes & Fees (').replace(' (CGST', ' (').replace(')', ')')}
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

        {/* 3 Stat / KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Card 1: Total Stay Amount */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="p-2 px-3 flex items-center gap-2.5 shadow-2xs bg-white">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#e11d48] flex items-center justify-center shrink-0">
              <CreditCard size={16} />
            </div>
            <div>
              <span className="block text-[9px] text-slate-500 font-medium">Total Stay Amount</span>
              <strong className="block text-base font-black text-slate-900">
                ₹ {totalAmount.toLocaleString()}
              </strong>
            </div>
          </div>

          {/* Card 2: Advance Paid */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="p-2 px-3 flex items-center gap-2.5 shadow-2xs bg-white">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <IndianRupee size={16} />
            </div>
            <div>
              <span className="block text-[9px] text-slate-500 font-medium">Advance Paid</span>
              <strong className="block text-base font-black text-emerald-600">
                ₹ {advancePaid.toLocaleString()}
              </strong>
            </div>
          </div>

          {/* Card 3: Balance Due */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="p-2 px-3 flex items-center gap-2.5 shadow-2xs bg-white">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <FileText size={16} />
            </div>
            <div>
              <span className="block text-[9px] text-slate-500 font-medium">Balance Due at Check-in</span>
              <strong className={`block text-base font-black ${balanceDue > 0 ? 'text-[#e11d48]' : 'text-slate-900'}`}>
                ₹ {balanceDue.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

        {/* Advance Payment Verification Banner */}
        {hasAdvancePaid ? (
          <div 
            style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px' }}
            className="p-2 px-3 flex flex-col sm:flex-row justify-between items-center gap-1.5 shadow-2xs"
          >
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div 
                style={{ backgroundColor: '#16a34a' }}
                className="w-6 h-6 rounded-full text-white flex items-center justify-center shrink-0"
              >
                <Check size={14} className="stroke-[3]" />
              </div>
              <div>
                <strong className="block text-[10.5px] font-bold text-slate-900">
                  Advance Payment Received
                </strong>
                <span className="block text-[9px] text-slate-500 font-mono">
                  UPI Transaction: {transactionId}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <div className="text-right">
                <strong className="block text-xs font-bold text-emerald-700">
                  ₹ {advancePaid.toLocaleString()}
                </strong>
                <span className="block text-[9px] text-slate-500">
                  {issueDate}
                </span>
              </div>
              <span 
                style={{ backgroundColor: '#16a34a' }}
                className="text-white text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-wider shadow-xs"
              >
                VERIFIED
              </span>
            </div>
          </div>
        ) : (
          <div 
            style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px' }}
            className="p-2 px-3 flex justify-between items-center gap-1.5 shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <div 
                style={{ backgroundColor: '#d97706' }}
                className="w-6 h-6 rounded-full text-white flex items-center justify-center shrink-0"
              >
                <AlertCircle size={14} className="stroke-[2.5]" />
              </div>
              <div>
                <strong className="block text-[10.5px] font-bold text-[#b45309]">
                  Advance Payment Required
                </strong>
                <span className="block text-[9px] text-slate-600">
                  Please deposit minimum 50% advance to confirm your booking dates.
                </span>
              </div>
            </div>
            <span 
              style={{ backgroundColor: '#d97706' }}
              className="text-white text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-wider shadow-xs"
            >
              PENDING
            </span>
          </div>
        )}

        {/* Bank & UPI Details for Balance Settlement (Full Width) */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="overflow-hidden shadow-2xs">
          <div 
            style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
            className="px-3 py-1.5 flex items-center gap-1.5"
          >
            <Building2 size={13} className="text-[#0f233a]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f233a]">
              BANK & UPI DETAILS FOR BALANCE SETTLEMENT
            </span>
          </div>
          <div className="p-2.5 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px]">
            <div className="space-y-1 text-slate-600 flex-1 w-full min-w-[190px]">
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span>Bank Name</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900 whitespace-nowrap">{bankName}</strong>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span>Account Name</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900 whitespace-nowrap">{accountHolder}</strong>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span>Account Number</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900 font-mono whitespace-nowrap">{maskedAccountNumber}</strong>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span>IFSC Code</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900 font-mono whitespace-nowrap">{ifscCode}</strong>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span>UPI ID</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900 font-mono whitespace-nowrap">{upiId}</strong>
              </div>
            </div>

            {/* Scannable UPI QR */}
            {upiQrDataUrl && (
              <div className="text-center shrink-0 flex flex-col items-center border border-slate-200 rounded-lg p-1.5 bg-white">
                <span className="text-[8.5px] text-slate-600 font-bold block mb-0.5 whitespace-nowrap">
                  Scan & Pay via UPI
                </span>
                <img 
                  src={upiQrDataUrl} 
                  alt="UPI QR Code" 
                  className="w-16 h-16 object-contain bg-white rounded"
                />
                <span className="font-mono text-[8px] text-slate-500 font-semibold mt-0.5 max-w-[85px] truncate block">
                  {upiId}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Terms & Conditions + Authorized Signatory (2 Columns) */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="overflow-hidden shadow-2xs">
          <div 
            style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
            className="px-3 py-1.5 flex items-center gap-1.5"
          >
            <FileText size={13} className="text-[#0f233a]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f233a]">
              TERMS & CONDITIONS
            </span>
          </div>
          <div className="p-2.5 flex flex-col sm:flex-row justify-between items-end gap-3">
            <div className="space-y-1 text-[9.5px] text-slate-600 max-w-[340px]">
              <p>This quotation is valid until {validTillDate} and subject to availability and homestay policies.</p>
              {propertyId && (
                <a 
                  href={`/terms/${propertyId}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[#e11d48] font-bold underline hover:text-rose-700 inline-block"
                >
                  Read Homestay Terms & Conditions &rarr;
                </a>
              )}
            </div>

            {/* Authorized Signatory & Stamp */}
            <div className="flex items-center gap-3 text-right ml-auto">
              {stampImage && (
                <div className="shrink-0">
                  <img 
                    src={getImageUrl(stampImage)} 
                    alt="Homestay Stamp" 
                    className="w-12 h-12 object-contain opacity-90"
                  />
                </div>
              )}
              <div className="min-w-[130px]">
                <span className="text-[9.5px] font-bold text-slate-800 block">
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
                    <div className="h-5 w-24 border-b border-dashed border-slate-300 ml-auto" />
                  )}
                </div>
                <div style={{ borderTop: '1px solid #cbd5e1' }} className="pt-0.5 inline-block min-w-[130px]">
                  {signatoryName && <strong className="block text-[10px] text-slate-900">{signatoryName}</strong>}
                  {signatoryDesignation && (
                    <span className="text-[8.5px] text-slate-500 font-medium block">
                      {signatoryDesignation}
                    </span>
                  )}
                </div>
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
