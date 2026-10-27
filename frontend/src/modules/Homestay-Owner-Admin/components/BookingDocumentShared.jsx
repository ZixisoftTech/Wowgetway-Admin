import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  Phone, 
  Mail, 
  Globe, 
  Heart,
  RefreshCw
} from 'lucide-react';

/**
 * Pixel-perfect WOW GATEWAYS Brand Logo matching reference designs:
 * "W❤️W GATEWAYS" with tracked subtitle "HOMESTAYS | STAYS | EXPERIENCES"
 */
export function WowGatewaysLogo({ size = 'default' }) {
  const isSmall = size === 'small';
  return (
    <div className="flex flex-col select-none">
      <div className="flex items-center leading-none">
        <span 
          style={{ color: '#0f233a', letterSpacing: '-0.3px' }}
          className={`font-black ${isSmall ? 'text-lg sm:text-xl' : 'text-xl sm:text-[24px]'} flex items-center`}
        >
          W
          <span className="relative inline-flex items-center justify-center mx-[1.5px]">
            <Heart className={`${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4 sm:w-[18px] sm:h-[18px]'} text-[#e11d48] fill-[#e11d48] inline`} />
          </span>
          W
        </span>
        <span 
          style={{ color: '#e11d48', letterSpacing: '-0.3px' }}
          className={`font-black ml-1.5 ${isSmall ? 'text-lg sm:text-xl' : 'text-xl sm:text-[24px]'}`}
        >
          GATEWAYS
        </span>
      </div>
      <div 
        style={{ color: '#64748b', letterSpacing: '0.24em' }}
        className={`font-bold ${isSmall ? 'text-[7px]' : 'text-[7.5px]'} uppercase mt-0.5`}
      >
        HOMESTAYS &nbsp;|&nbsp; STAYS &nbsp;|&nbsp; EXPERIENCES
      </div>
    </div>
  );
}

/**
 * Standard corporate footer appearing on all 3 reference documents:
 * Phone: +91 9770097010, Email: support@wowgateways.com, Web: www.wowgateways.com
 */
export function DocumentCorporateFooter() {
  return (
    <div 
      style={{ borderTop: '1px solid #e2e8f0', color: '#475569' }}
      className="pt-2 mt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[9.5px]"
    >
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="font-black text-[#0f233a]">
          WOW <span className="text-[#e11d48]">GATEWAYS</span>
        </span>
        <span className="text-slate-300">•</span>
        <span className="text-slate-500 font-medium">Stay Local • Explore More • Live Better</span>
      </div>
      <div className="flex items-center gap-3.5 text-slate-600 flex-wrap justify-center font-medium whitespace-nowrap">
        <a href="tel:+919770097010" className="flex items-center gap-1 hover:text-slate-900 transition-colors">
          <Phone size={11} className="text-slate-400" />
          <span>+91 9770097010</span>
        </a>
        <a href="mailto:support@wowgateways.com" className="flex items-center gap-1 hover:text-slate-900 transition-colors">
          <Mail size={11} className="text-slate-400" />
          <span>support@wowgateways.com</span>
        </a>
        <a href="https://www.wowgateways.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-slate-900 transition-colors">
          <Globe size={11} className="text-slate-400" />
          <span>www.wowgateways.com</span>
        </a>
      </div>
    </div>
  );
}

/**
 * Action bar with navigation, copy link, WhatsApp share, PDF download, and print actions
 */
export function DocumentActionBar({
  onBack,
  shareableUrl,
  onDownloadPdf,
  downloadingPdf,
  onPrint,
  onShareWhatsApp,
  documentTitle = 'Document'
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (shareableUrl) {
      navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-wrap justify-between items-center gap-2.5 print:hidden max-w-[780px] mx-auto w-full mb-3">
      <button 
        type="button"
        onClick={onBack}
        className="hover:text-slate-700 bg-transparent border-none cursor-pointer flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-500 transition-colors"
      >
        <ArrowLeft size={13} className="stroke-[3]" />
        <span>Back to Booking Details</span>
      </button>

      <div className="flex items-center gap-2 flex-wrap">
        <button 
          type="button"
          onClick={handleCopy}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer border border-slate-200 flex items-center gap-1.5 transition-all shadow-xs"
          title="Copy shareable link"
        >
          {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy Link'}</span>
        </button>

        {onShareWhatsApp && (
          <button 
            type="button"
            onClick={onShareWhatsApp}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 shadow-xs transition-all"
            title="Share via WhatsApp"
          >
            <Share2 size={13} />
            <span>WhatsApp</span>
          </button>
        )}

        <button 
          type="button"
          onClick={onDownloadPdf}
          disabled={downloadingPdf}
          className="px-3.5 py-1.5 bg-[#e11d48] hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 shadow-xs transition-all"
          title={`Download ${documentTitle} as PDF`}
        >
          {downloadingPdf ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
          <span>{downloadingPdf ? 'Downloading...' : `Download ${documentTitle} (PDF)`}</span>
        </button>

        <button 
          type="button"
          onClick={onPrint}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer border border-slate-200 flex items-center gap-1.5 transition-all shadow-xs"
          title={`Print ${documentTitle}`}
        >
          <Printer size={13} />
          <span>Print</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Hook to generate an instant base64 QR Code from UPI payment parameters
 */
export function useUpiQrCode(upiId, payeeName, amount) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (!upiId) {
      setQrDataUrl('');
      return;
    }

    const cleanUpi = upiId.trim();
    const cleanPayee = encodeURIComponent((payeeName || 'Homestay Sanctuary').trim());
    const cleanAmount = Number(amount || 0);

    const upiString = cleanAmount > 0 
      ? `upi://pay?pa=${cleanUpi}&pn=${cleanPayee}&am=${cleanAmount.toFixed(2)}&cu=INR`
      : `upi://pay?pa=${cleanUpi}&pn=${cleanPayee}&cu=INR`;

    QRCode.toDataURL(upiString, {
      width: 140,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    }).then(url => {
      setQrDataUrl(url);
    }).catch(err => {
      console.warn('Failed to generate pure QR code:', err);
      setQrDataUrl('');
    });
  }, [upiId, payeeName, amount]);

  return qrDataUrl;
}

/**
 * Format date helpers
 */
export function formatDocDate(rawDate) {
  if (!rawDate) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return String(rawDate);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDocStayDate(rawDate, defaultTime = '') {
  if (!rawDate) return 'Pending';
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return String(rawDate);
  const formatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return defaultTime ? `${formatted} (${defaultTime})` : formatted;
}

/**
 * Format telephone with +91 if needed
 */
export function formatPhoneWithCountryCode(rawPhone) {
  if (!rawPhone) return '+91 9855667788';
  const clean = String(rawPhone).trim();
  if (clean.startsWith('+')) return clean;
  if (clean.length === 10) return `+91 ${clean}`;
  return clean;
}

/**
 * Format homestay name with Title Case
 */
export function formatHomestayName(name) {
  if (!name) return 'Pandim Homestay';
  const trimmed = name.trim();
  if (trimmed.toLowerCase() === 'pandim') return 'Pandim Homestay';
  return trimmed.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Calculate dynamic GST breakdown
 */
export function calculateGstBreakdown(subtotal, tax) {
  const numSubtotal = Number(subtotal) || 0;
  const numTax = Number(tax) || 0;

  if (numSubtotal <= 0 || numTax <= 0) {
    return {
      gstPercent: 0,
      cgstPercent: '0',
      sgstPercent: '0',
      label: 'GST @ 0% (CGST 0% + SGST 0%)'
    };
  }

  const rawPercent = (numTax / numSubtotal) * 100;
  const roundedPercent = Math.round(rawPercent);
  const halfPercent = (roundedPercent / 2).toFixed(roundedPercent % 2 === 0 ? 0 : 1);

  return {
    gstPercent: roundedPercent,
    cgstPercent: halfPercent,
    sgstPercent: halfPercent,
    label: `GST @ ${roundedPercent}% (CGST ${halfPercent}% + SGST ${halfPercent}%)`
  };
}
