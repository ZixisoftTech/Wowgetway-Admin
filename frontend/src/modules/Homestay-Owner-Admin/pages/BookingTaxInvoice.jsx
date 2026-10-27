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
  AlertCircle
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

export default function BookingTaxInvoice() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const invoiceRef = useRef(null);

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
        console.error('Failed to load booking details for invoice:', err);
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
  const invoiceNo = `INV-${booking?.bookingId?.replace(/[^0-9]/g, '') || requestId?.slice(-5) || '01034'}`;
  const shareableInvoiceUrl = `${window.location.origin}/invoice/${requestId || booking?._id || booking?.bookingId}`;

  const propertyName = business?.homestayName || property?.name || booking?.propertyDetails?.propertyName || 'pandim';
  const propertyAddress = business?.fullAddress || [
    property?.address,
    property?.city,
    property?.state
  ].filter(Boolean).join(', ') || 'Plot 42, Apple Orchard Way, Old Manali, HP - 175131';
  const propertyContact = business?.contactNumber || property?.ownerMobile || property?.phone || '+91 98765 43210';
  const propertyEmail = business?.emailId || property?.ownerEmail || 'official@homestaywow.in';
  const propertyGstin = business?.gstNumber || property?.gstNumber || '02AABCT1332F1Z8';
  const placeOfSupply = `${property?.state || 'Himachal Pradesh'} (02)`;

  const guestName = booking?.customer?.name || booking?.guestDetails?.fullName || 'Aditya Joshi';
  const guestPhone = booking?.customer?.mobile || booking?.customer?.phone || booking?.guestDetails?.phone || '+91 9855667788';
  const guestEmail = booking?.customer?.email || booking?.guestDetails?.email || 'adityajoshi@example.com';
  const guestGstin = booking?.customer?.gstNumber || booking?.guestDetails?.gstNumber || '-';

  const rawIn = booking?.checkInDate || booking?.dates?.checkIn;
  const rawOut = booking?.checkOutDate || booking?.dates?.checkOut;
  const checkInFormatted = formatDocStayDate(rawIn, '02:00 PM');
  const checkOutFormatted = formatDocStayDate(rawOut, '11:00 AM');
  const invoiceDate = formatDocDate(booking?.createdAt || new Date());

  // Calculate nights
  let totalNights = 1;
  if (rawIn && rawOut) {
    const diffTime = Math.abs(new Date(rawOut) - new Date(rawIn));
    const calculatedNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (calculatedNights > 0) totalNights = calculatedNights;
  }
  if (booking?.dates?.nights) totalNights = booking.dates.nights;

  const adults = booking?.guests?.adults || booking?.occupancy?.adults || 2;
  const children = booking?.guests?.children || booking?.occupancy?.children || 0;
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
  const convenienceFee = Number(booking?.pricing?.convenienceFee || 0);

  const subtotal = Number(booking?.pricing?.bookingAmount || Math.max(0, totalAmount - tax - convenienceFee));
  const roomTariffAmount = Math.max(0, subtotal - addOns - extraBed);
  const roomRatePerNight = totalNights > 0 && roomCount > 0 ? Math.round(roomTariffAmount / (totalNights * roomCount)) : roomTariffAmount;

  const gstBreakdown = calculateGstBreakdown(subtotal, tax);
  const isPaid = balanceDue <= 0;

  // Remittance details
  const ownerPay = booking?.ownerPaymentDetails || {};
  const bankName = ownerPay.bankName || 'HDFC Bank';
  const accountHolder = ownerPay.accountHolderName || property?.ownerName || 'priyodeep sarkar';
  const accountNumber = ownerPay.accountNumber || '5010 1234 5678 90';
  const ifscCode = ownerPay.ifscCode || 'HDFC0001234';
  const upiId = ownerPay.upiId || 'keshavhomestay@okicici';

  const upiQrDataUrl = useUpiQrCode(upiId, accountHolder || propertyName, balanceDue > 0 ? balanceDue : totalAmount);

  // Signatory
  const signatoryName = business?.authorizedSignatoryName || property?.ownerName || 'Rajeshwar Sharma';
  const signatoryDesignation = business?.designation || 'Managing Partner & Host';
  const signatureImage = business?.signatureImage || '';

  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `TaxInvoice_${invoiceNo}_${bookingIdDisplay}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  const handleDownloadPdf = async () => {
    const element = invoiceRef.current;
    if (!element) return;
    try {
      setDownloadingPdf(true);
      const filename = `TaxInvoice_${invoiceNo}_${bookingIdDisplay}.pdf`;
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
    const msg = `Namaste ${guestName}! 🙏\n\nHere is your Tax Invoice from *${propertyName}*.\n\n📄 *Invoice No:* ${invoiceNo}\n📋 *Booking Ref:* #${bookingIdDisplay}\n📅 *Stay:* ${checkInFormatted} to ${checkOutFormatted}\n💰 *Total Amount:* ₹${totalAmount.toLocaleString()}\n💳 *Amount Paid:* ₹${advancePaid.toLocaleString()}\n⚖️ *Balance Due:* ₹${balanceDue.toLocaleString()}\n\n🔗 View or download your invoice here:\n${shareableInvoiceUrl}`;
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-500">
        <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider">Loading Tax Invoice...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 py-4 px-2 sm:px-4 font-sans text-slate-800 print:bg-white print:p-0">
      
      {/* Top Action Bar */}
      <DocumentActionBar 
        onBack={() => navigate(-1)}
        shareableUrl={shareableInvoiceUrl}
        onDownloadPdf={handleDownloadPdf}
        downloadingPdf={downloadingPdf}
        onPrint={handlePrint}
        onShareWhatsApp={handleSendWhatsApp}
        documentTitle="Tax Invoice"
      />

      {/* Main Single-Page A4 Canvas */}
      <div 
        ref={invoiceRef}
        style={{ 
          width: '100%', 
          maxWidth: '780px', 
          backgroundColor: '#ffffff', 
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          letterSpacing: 'normal',
          wordSpacing: 'normal'
        }}
        className="mx-auto bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-sm space-y-2.5 print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full"
      >
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-1">
          {/* Header Left: WOW Gateways Brand & Homestay Details */}
          <div className="space-y-1">
            <WowGatewaysLogo size="small" />
            
            <div className="space-y-0.5 pt-0.5 text-[10.5px]">
              <h2 className="text-sm font-bold text-slate-900 leading-tight">{propertyName}</h2>
              <p className="text-[10px] text-slate-600 max-w-sm leading-tight">{propertyAddress}</p>
              <div className="flex flex-wrap items-center gap-x-3 text-[10px] text-slate-600">
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

          {/* Header Right: TAX INVOICE Meta Box */}
          <div 
            style={{ backgroundColor: '#f4f7fb', border: '1px solid #dbe4ee', borderRadius: '10px' }}
            className="p-3 w-full sm:w-[240px] text-xs shrink-0 shadow-2xs"
          >
            <h1 className="text-xl font-black text-[#0f233a] tracking-tight mb-1.5 leading-tight">
              TAX INVOICE
            </h1>
            <div className="space-y-1 text-[10.5px] text-slate-600">
              <div className="flex justify-between">
                <span>Invoice No.</span>
                <span className="text-slate-400 mr-2">:</span>
                <strong className="text-slate-900 font-mono flex-1 text-right">{invoiceNo}</strong>
              </div>
              <div className="flex justify-between">
                <span>Booking Ref.</span>
                <span className="text-slate-400 mr-2">:</span>
                <strong className="text-slate-900 font-mono flex-1 text-right">{bookingIdDisplay}</strong>
              </div>
              <div className="flex justify-between">
                <span>Invoice Date</span>
                <span className="text-slate-400 mr-2">:</span>
                <strong className="text-slate-900 flex-1 text-right">{invoiceDate}</strong>
              </div>
              <div className="flex justify-between">
                <span>Place of Supply</span>
                <span className="text-slate-400 mr-2">:</span>
                <strong className="text-slate-900 flex-1 text-right">{placeOfSupply}</strong>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderBottom: '1px solid #e2e8f0' }} />

        {/* 2-Column Cards: Billed To & Stay Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Card 1: Billed To (Guest) */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="overflow-hidden shadow-2xs">
            <div 
              style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
              className="px-3 py-1.5 flex items-center gap-1.5"
            >
              <User size={13} className="text-[#0f233a]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f233a]">
                BILLED TO (GUEST)
              </span>
            </div>
            <div className="p-2.5 space-y-1 text-[10.5px] text-slate-600">
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span>Guest Name</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{guestName}</strong>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span>Phone Number</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{guestPhone}</strong>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span>Email Address</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900 break-all">{guestEmail}</strong>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span>GSTIN</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{guestGstin}</strong>
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
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span>Homestay Name</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{propertyName}</strong>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span>Room Type</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{roomTypeDisplay}</strong>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span>Check-in</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{checkInFormatted}</strong>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span>Check-out</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{checkOutFormatted}</strong>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span>Total Nights</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">{totalNights} {totalNights === 1 ? 'Night' : 'Nights'}</strong>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span>No. of Guests</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">
                  {adults} {adults === 1 ? 'Adult' : 'Adults'}
                  {children > 0 ? `, ${children} Children` : ''}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse text-[10.5px]">
            <thead>
              <tr style={{ backgroundColor: '#0f233a', color: '#ffffff' }} className="text-[9.5px] font-bold uppercase tracking-wider">
                <th className="py-1.5 px-3 w-8 text-center">#</th>
                <th className="py-1.5 px-3">Description</th>
                <th className="py-1.5 px-3 text-center">HSN/SAC</th>
                <th className="py-1.5 px-3 text-center">Qty / Room</th>
                <th className="py-1.5 px-3 text-right">Rate (₹)</th>
                <th className="py-1.5 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: '#ffffff', color: '#1e293b' }}>
              {/* Row 1: Room Accommodation */}
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td className="py-1.5 px-3 text-center font-bold text-slate-700">1</td>
                <td className="py-1.5 px-3">
                  <div className="font-bold text-slate-900">Room Tariff ({roomCategoryName} Room)</div>
                  <div className="text-[9.5px] text-slate-500">
                    {formatDocDate(rawIn)} – {formatDocDate(rawOut)} ({totalNights} {totalNights === 1 ? 'Night' : 'Nights'})
                  </div>
                </td>
                <td className="py-1.5 px-3 text-center font-mono text-slate-600">9963</td>
                <td className="py-1.5 px-3 text-center font-medium text-slate-700">
                  {roomCount} Room x {totalNights} {totalNights === 1 ? 'Night' : 'Nights'}
                </td>
                <td className="py-1.5 px-3 text-right font-medium text-slate-800">
                  {roomRatePerNight > 0 ? `₹ ${roomRatePerNight.toLocaleString()}` : '-'}
                </td>
                <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                  ₹ {roomTariffAmount.toLocaleString()}
                </td>
              </tr>

              {/* Row 2: Extra Bed */}
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td className="py-1.5 px-3 text-center font-bold text-slate-700">2</td>
                <td className="py-1.5 px-3 font-medium text-slate-800">Extra Bed (If Any)</td>
                <td className="py-1.5 px-3 text-center font-mono text-slate-600">9963</td>
                <td className="py-1.5 px-3 text-center text-slate-500">{extraBed > 0 ? '1' : '-'}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">₹ {extraBed.toLocaleString()}</td>
                <td className="py-1.5 px-3 text-right font-bold text-slate-900">₹ {extraBed.toLocaleString()}</td>
              </tr>

              {/* Row 3: Add-on Services */}
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td className="py-1.5 px-3 text-center font-bold text-slate-700">3</td>
                <td className="py-1.5 px-3">
                  <div className="font-bold text-slate-900">Add-on Services</div>
                  <div className="text-[9.5px] text-slate-500">{addOnsRemark || '-'}</div>
                </td>
                <td className="py-1.5 px-3 text-center font-mono text-slate-600">9963</td>
                <td className="py-1.5 px-3 text-center text-slate-500">{addOns > 0 ? '1' : '-'}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">₹ {addOns.toLocaleString()}</td>
                <td className="py-1.5 px-3 text-right font-bold text-slate-900">₹ {addOns.toLocaleString()}</td>
              </tr>

              {/* Subtotal Row */}
              <tr style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
                <td colSpan={4}></td>
                <td className="py-1 px-3 text-right font-bold text-slate-800">
                  Subtotal
                </td>
                <td className="py-1 px-3 text-right font-bold text-slate-900">
                  ₹ {subtotal.toLocaleString()}
                </td>
              </tr>

              {/* GST Row */}
              <tr style={{ backgroundColor: '#ffffff' }}>
                <td colSpan={4}></td>
                <td className="py-0.5 px-3 text-right text-slate-600 font-medium text-[10px]">
                  {gstBreakdown.label}
                </td>
                <td className="py-0.5 px-3 text-right font-medium text-slate-900 text-[10px]">
                  ₹ {tax.toLocaleString()}
                </td>
              </tr>

              {/* Other Charges Row */}
              <tr style={{ backgroundColor: '#ffffff' }}>
                <td colSpan={4}></td>
                <td className="py-0.5 px-3 text-right text-slate-600 font-medium text-[10px]">
                  Other Charges (If Any)
                </td>
                <td className="py-0.5 px-3 text-right font-medium text-slate-900 text-[10px]">
                  ₹ {convenienceFee.toLocaleString()}
                </td>
              </tr>

              {/* Grand Total Row */}
              <tr style={{ backgroundColor: '#fff1f2', borderTop: '1px solid #fecdd3' }}>
                <td colSpan={3} className="py-2 px-3"></td>
                <td colSpan={2} className="py-2 px-3 text-right font-black text-sm text-[#e11d48]">
                  Grand Total
                </td>
                <td className="py-2 px-3 text-right font-black text-base text-[#e11d48]">
                  ₹ {totalAmount.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Summary & Status Cards (2 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Card: Payment Summary */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="overflow-hidden shadow-2xs">
            <div 
              style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
              className="px-3 py-1.5 flex items-center gap-1.5"
            >
              <Receipt size={13} className="text-[#e11d48]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f233a]">
                PAYMENT SUMMARY
              </span>
            </div>
            <div className="p-2.5 space-y-1 text-[10.5px] text-slate-600">
              <div className="grid grid-cols-[135px_10px_1fr]">
                <span>Total Invoice Amount</span>
                <span className="text-slate-400">:</span>
                <strong className="text-slate-900">₹ {totalAmount.toLocaleString()}</strong>
              </div>
              <div className="grid grid-cols-[135px_10px_1fr]">
                <span>Total Payment Received</span>
                <span className="text-slate-400">:</span>
                <strong className="text-emerald-600 font-bold">₹ {advancePaid.toLocaleString()}</strong>
              </div>
              <div className="grid grid-cols-[135px_10px_1fr]">
                <span>Balance Due</span>
                <span className="text-slate-400">:</span>
                <strong className={balanceDue > 0 ? 'text-[#e11d48] font-bold' : 'text-slate-900 font-bold'}>
                  ₹ {balanceDue.toLocaleString()}
                </strong>
              </div>
            </div>
          </div>

          {/* Card: Paid / Pending Status */}
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

        {/* Payment Remittance (Bank & UPI) and Terms & Conditions + Signature (2 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Left: Payment Details (Bank & UPI) */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="overflow-hidden shadow-2xs">
            <div 
              style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
              className="px-3 py-1.5 flex items-center gap-1.5"
            >
              <Building2 size={13} className="text-[#0f233a]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f233a]">
                PAYMENT DETAILS (BANK & UPI)
              </span>
            </div>
            <div className="p-2.5 flex flex-col sm:flex-row justify-between items-center gap-2.5 text-[10.5px]">
              <div className="space-y-1 text-slate-600 flex-1 w-full">
                <div className="grid grid-cols-[95px_10px_1fr]">
                  <span>Bank Name</span>
                  <span className="text-slate-400">:</span>
                  <strong className="text-slate-900">{bankName}</strong>
                </div>
                <div className="grid grid-cols-[95px_10px_1fr]">
                  <span>Account Name</span>
                  <span className="text-slate-400">:</span>
                  <strong className="text-slate-900">{accountHolder}</strong>
                </div>
                <div className="grid grid-cols-[95px_10px_1fr]">
                  <span>Account Number</span>
                  <span className="text-slate-400">:</span>
                  <strong className="text-slate-900 font-mono">{accountNumber}</strong>
                </div>
                <div className="grid grid-cols-[95px_10px_1fr]">
                  <span>IFSC Code</span>
                  <span className="text-slate-400">:</span>
                  <strong className="text-slate-900 font-mono">{ifscCode}</strong>
                </div>
                <div className="grid grid-cols-[95px_10px_1fr]">
                  <span>UPI ID</span>
                  <span className="text-slate-400">:</span>
                  <strong className="text-slate-900 font-mono text-[10px] break-all">{upiId}</strong>
                </div>
              </div>

              {/* Scannable UPI QR */}
              {upiQrDataUrl && (
                <div className="text-center shrink-0 flex flex-col items-center border border-slate-200 rounded-lg p-1.5 bg-slate-50/50">
                  <span className="text-[9px] text-slate-600 font-bold block mb-0.5">
                    Scan & Pay via UPI
                  </span>
                  <img 
                    src={upiQrDataUrl} 
                    alt="UPI Payment QR Code" 
                    className="w-20 h-20 object-contain bg-white rounded border border-slate-100 p-0.5"
                  />
                  <span className="font-mono text-[8.5px] text-slate-500 font-semibold mt-0.5 max-w-[95px] truncate block">
                    {upiId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Terms & Conditions + Authorized Signatory */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }} className="overflow-hidden shadow-2xs flex flex-col justify-between">
            <div>
              <div 
                style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
                className="px-3 py-1.5 flex items-center gap-1.5"
              >
                <FileText size={13} className="text-[#0f233a]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f233a]">
                  TERMS & CONDITIONS
                </span>
              </div>
              <div className="p-2.5 pb-1">
                <ol className="list-decimal pl-3 space-y-0.5 text-[8.5px] text-slate-600 leading-tight">
                  <li>This is a tax invoice for the services provided.</li>
                  <li>Rates are valid for the mentioned dates and are subject to availability.</li>
                  <li>Any changes in dates, room type, or guest count may affect the total amount.</li>
                  <li>This invoice includes applicable taxes as per current government rules.</li>
                  <li>Check-in and check-out time as per homestay policy.</li>
                  <li>Cancellation and refund will be as per the homestay&apos;s policy.</li>
                  <li>For assistance, contact <strong className="text-slate-800">support@wowgateways.com</strong>.</li>
                </ol>
              </div>
            </div>

            {/* Authorized Signatory */}
            <div className="p-2.5 pt-0 text-right">
              <span className="text-[9.5px] font-bold text-slate-800 block">
                For WOW Gateways
              </span>
              <div className="h-7 flex items-end justify-end my-0.5">
                {signatureImage ? (
                  <img 
                    src={getImageUrl(signatureImage)} 
                    alt="Authorized Signature" 
                    className="h-7 object-contain"
                  />
                ) : (
                  <span className="font-serif italic text-base text-slate-800 pr-2">
                    {signatoryName.split(' ')[0] || 'Rajeshwar'}
                  </span>
                )}
              </div>
              <div style={{ borderTop: '1px solid #cbd5e1' }} className="pt-0.5 inline-block min-w-[130px]">
                <strong className="block text-[10px] text-slate-900">{signatoryName}</strong>
                <span className="text-[8.5px] text-slate-500 font-medium block">
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
