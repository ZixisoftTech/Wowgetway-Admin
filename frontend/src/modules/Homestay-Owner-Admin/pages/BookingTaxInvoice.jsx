import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft,
  Printer,
  Download,
  Building2,
  User,
  Phone,
  Calendar,
  Layers,
  Heart,
  Mail,
  Share2,
  RefreshCw,
  CheckCircle,
  Receipt,
  Copy,
  Check
} from 'lucide-react';
import { generatePdfFromElement } from '../../../utils/pdfExporter';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
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
        console.error('Failed to load booking details for invoice:', err);
        setError('Could not find or load booking record.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [requestId]);

  const bookingIdDisplay = booking?.bookingId || (requestId?.startsWith('WG') ? requestId : `#${requestId?.slice(-6) || 'BOOKING'}`);
  const invoiceNo = `INV-${booking?.bookingId?.replace(/[^0-9]/g, '') || requestId?.slice(-6) || '01001'}`;

  const shareableInvoiceUrl = `${window.location.origin}/invoice/${requestId || booking?._id || booking?.bookingId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableInvoiceUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `Invoice_${invoiceNo}_${bookingIdDisplay.replace('#', '')}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  const handleDownloadPdf = async () => {
    const element = invoiceRef.current || document.querySelector('.printable-document');
    if (!element) {
      alert('Could not find invoice document to download.');
      return;
    }

    try {
      setDownloadingPdf(true);
      const cleanInv = invoiceNo.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Invoice_${cleanInv}_${bookingIdDisplay.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
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
  const propertyGstin = booking?.propertyId?.gstNumber || '02AABCT1332F1Z8';
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
  const invoiceDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  const adults = booking?.guests?.adults || booking?.occupancy?.adults || 1;
  const child5To9 = booking?.guests?.children || booking?.occupancy?.children5To9 || 0;
  const roomCount = booking?.bookedRooms?.length || 1;
  const roomNumbers = booking?.bookedRooms?.map(r => r.roomNumber).join(', ') || booking?.propertyDetails?.roomNumber || 'Room 1';

  const totalAmount = Number(booking?.pricing?.finalAmount || booking?.amount || booking?.pricing?.totalAmount || 0);
  const advancePaid = Number(booking?.pricing?.paidAmount || booking?.pricing?.advancePaid || 0);
  const balanceAmount = booking?.pricing?.pendingAmount !== undefined ? Number(booking.pricing.pendingAmount) : Math.max(0, totalAmount - advancePaid);
  const tax = Number(booking?.pricing?.tax || 0);
  const addOns = Number(booking?.pricing?.addOns || 0);
  const addOnsRemark = booking?.pricing?.addOnsRemark || '';
  const baseTariff = Number(booking?.pricing?.bookingAmount || booking?.pricing?.baseRate || booking?.pricing?.baseTariff || Math.max(0, totalAmount - tax - addOns));

  const isPaid = balanceAmount <= 0;

  const ownerPay = booking?.ownerPaymentDetails || {};
  const bankName = ownerPay.bankName || 'HDFC Bank';
  const accountHolder = ownerPay.accountHolderName || propertyName || 'Homestay Host';
  const accountNumber = ownerPay.accountNumber || '5010 1234 5678 90';
  const ifscCode = ownerPay.ifscCode || 'HDFC0001234';
  const branch = ownerPay.branch || '';
  const upiId = ownerPay.upiId || 'keshavhomestay@okicici';

  // WhatsApp share handler
  const handleSendWhatsApp = () => {
    const rawPhone = guestPhone.replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const msg = 
`Namaste ${guestName}! 🙏

Here is your Tax Invoice for your stay at *${propertyName}*.

📄 *Invoice No:* ${invoiceNo}
📋 *Booking Ref:* #${bookingIdDisplay}
📅 *Invoice Date:* ${invoiceDate}
📅 *Stay Period:* ${checkInDate} to ${checkOutDate}
🛏️ *Room(s):* ${roomNumbers}

💰 *Billing Summary:*
• Room Tariff: ₹${baseTariff.toLocaleString()}
${addOns > 0 ? `• Add-ons (${addOnsRemark || 'Services'}): ₹${addOns.toLocaleString()}\n` : ''}• GST / Taxes: ₹${tax.toLocaleString()}
• *Total Bill:* ₹${totalAmount.toLocaleString()}
• *Payments Received:* ₹${advancePaid.toLocaleString()}
• *Balance Due:* ₹${balanceAmount.toLocaleString()}

🔗 View your complete invoice online: ${shareableInvoiceUrl}

Thank you for choosing ${propertyName}!`;

    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-500">
        <RefreshCw size={24} className="animate-spin text-rose-600" />
        <span className="text-xs font-bold uppercase tracking-wider">Loading invoice...</span>
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
            title="Copy shareable invoice link"
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
            title="Download Tax Invoice as PDF file"
          >
            {downloadingPdf ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
            <span>{downloadingPdf ? 'Downloading Invoice...' : 'Download Invoice (PDF)'}</span>
          </button>

          <button 
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 transition-all"
            title="Print Tax Invoice"
          >
            <Printer size={13} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Invoice Card Container */}
      <div ref={invoiceRef} className="printable-document max-w-[850px] mx-auto bg-white border border-slate-200 p-8 sm:p-10 rounded-[24px] shadow-lg space-y-6 print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full">
        
        {/* Top Header: Property Details and Invoice Meta */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-black text-xs rounded-lg uppercase tracking-wider border border-rose-100">
                TAX INVOICE
              </span>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                isPaid ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {isPaid ? 'Paid in Full' : `Pending ₹${balanceAmount.toLocaleString()}`}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{propertyName}</h1>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">{propertyAddress}</p>
            <p className="text-[11px] text-slate-400 font-bold">GSTIN: <span className="text-slate-800 font-mono">{propertyGstin}</span></p>
          </div>

          <div className="sm:text-right space-y-1 text-xs">
            <div className="font-mono font-black text-slate-900 text-base">{invoiceNo}</div>
            <div className="text-slate-500 font-medium">Date: <strong className="text-slate-800">{invoiceDate}</strong></div>
            <div className="text-slate-500 font-medium">Booking Ref: <strong className="text-rose-700">#{bookingIdDisplay}</strong></div>
            <div className="text-slate-500 font-medium">Host: <strong className="text-slate-800">{ownerName}</strong> ({ownerPhone})</div>
          </div>
        </div>

        {/* Bill To & Stay Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-4.5 rounded-2xl border border-slate-150 text-xs">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Billed To:</span>
            <div className="font-black text-slate-900 text-sm">{guestName}</div>
            <div className="text-slate-600 font-medium flex items-center gap-1.5">
              <Phone size={11} className="text-slate-400" />
              <span>{guestPhone}</span>
            </div>
            {guestEmail && (
              <div className="text-slate-600 font-medium flex items-center gap-1.5">
                <Mail size={11} className="text-slate-400" />
                <span>{guestEmail}</span>
              </div>
            )}
          </div>

          <div className="space-y-1 sm:text-right">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Stay Details:</span>
            <div className="font-bold text-slate-800">{checkInDate} → {checkOutDate}</div>
            <div className="text-slate-600 font-medium">Room Allocation: <strong className="text-rose-700">Room {roomNumbers}</strong></div>
            <div className="text-slate-500 text-[11px] font-medium">
              Guests: {adults} Adult(s){child5To9 > 0 ? `, ${child5To9} Child(ren)` : ''}
            </div>
          </div>
        </div>

        {/* Itemized Charges Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Qty / Room</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              <tr>
                <td className="py-3.5 px-4">
                  <span className="font-bold text-slate-900 block">Homestay Room Accommodation</span>
                  <span className="text-[10px] text-slate-400">{checkInDate} to {checkOutDate}</span>
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-slate-800">Room {roomNumbers}</td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                  ₹ {baseTariff.toLocaleString()}
                </td>
              </tr>

              {addOns > 0 && (
                <tr>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block">Add-on Services</span>
                    <span className="text-[10px] text-slate-500">{addOnsRemark || 'Extra Amenities / Food'}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-400">-</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                    ₹ {addOns.toLocaleString()}
                  </td>
                </tr>
              )}

              <tr>
                <td className="py-3.5 px-4">
                  <span className="font-bold text-slate-900 block">GST / Hospitality Taxes</span>
                  <span className="text-[10px] text-slate-400">Applicable state hospitality taxes</span>
                </td>
                <td className="py-3.5 px-4 text-center text-slate-400">-</td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                  ₹ {tax.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals & Balance Summary */}
        <div className="flex justify-end pt-2">
          <div className="w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 font-semibold">
              <span>Grand Total:</span>
              <span className="font-mono font-black text-slate-900 text-sm">₹ {totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Total Payments Received:</span>
              <span className="font-mono">₹ {advancePaid.toLocaleString()}</span>
            </div>
            <div className={`flex justify-between p-3 rounded-xl font-black ${
              balanceAmount > 0 ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800'
            }`}>
              <span>Balance Due:</span>
              <span className="font-mono text-base">₹ {balanceAmount.toLocaleString()}/-</span>
            </div>
          </div>
        </div>

        {/* Payment Remittance / Bank & UPI Details */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
            <span className="text-[9px] font-black text-rose-700 uppercase tracking-wider">🏦 Remittance & Payment Details</span>
            {upiId && <span className="text-[10px] font-mono text-slate-600 font-bold">UPI: <strong className="text-rose-700">{upiId}</strong></span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-slate-600">
            <div>
              <span className="block text-[8px] font-black text-slate-400 uppercase">Bank Name</span>
              <span className="font-bold text-slate-800">{bankName}</span>
            </div>
            <div>
              <span className="block text-[8px] font-black text-slate-400 uppercase">Account Holder</span>
              <span className="font-bold text-slate-800">{accountHolder}</span>
            </div>
            <div>
              <span className="block text-[8px] font-black text-slate-400 uppercase">Account Number</span>
              <span className="font-mono font-bold text-slate-800">{accountNumber}</span>
            </div>
            <div>
              <span className="block text-[8px] font-black text-slate-400 uppercase">IFSC Code</span>
              <span className="font-mono font-bold text-slate-800">{ifscCode}</span>
            </div>
          </div>
          {branch && (
            <div className="text-[9px] text-slate-400 font-medium pt-1">
              Branch: <span className="text-slate-700 font-bold">{branch}</span>
            </div>
          )}
        </div>

        {/* Signature & Legal Footer */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-[10px] text-slate-400 font-medium space-y-0.5 text-center sm:text-left">
            <p>Thank you for staying at {propertyName}!</p>
            <p>This is a computer-generated tax invoice and requires no physical stamp.</p>
          </div>

          <div className="text-center space-y-1 w-44">
            <span className="font-serif italic text-base text-slate-700 block">{ownerName}</span>
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider border-t border-slate-200 pt-1">
              Authorized Signatory
            </span>
          </div>
        </div>

      </div>

      {/* Share / Action Buttons at bottom */}
      <div className="flex flex-wrap justify-center gap-2.5 print:hidden">
        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="px-6 py-3 bg-rose-700 hover:bg-rose-800 disabled:bg-rose-400 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm flex items-center gap-1.5 transition-all"
        >
          {downloadingPdf ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
          <span>{downloadingPdf ? 'Downloading Invoice...' : 'Download Invoice (PDF)'}</span>
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
          <span>Share via WhatsApp</span>
        </button>
      </div>

    </div>
  );
}
