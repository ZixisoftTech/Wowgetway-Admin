import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft,
  Home,
  QrCode,
  Check,
  Plus,
  Minus,
  Info,
  Edit2,
  Save,
  X,
  RefreshCw,
  CheckCircle2,
  Upload,
  Trash2,
  Building,
  Layers,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getAuthToken = () => {
  return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
};

export default function ManagePayments() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Property / Branch selection state
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedPropertyName, setSelectedPropertyName] = useState('');

  // Payment details state
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: ''
  });

  const [upiDetails, setUpiDetails] = useState({
    upiId: 'keshavhomestay@okicici',
    upiQrCode: ''
  });

  const [advancePercent, setAdvancePercent] = useState(30);
  const [advanceType, setAdvanceType] = useState('percent'); // percent / fixed
  const [advanceAmount, setAdvanceAmount] = useState(0);

  // Modals
  const [showBankModal, setShowBankModal] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [bankForm, setBankForm] = useState({ ...bankDetails });
  const [upiForm, setUpiForm] = useState({ ...upiDetails });
  const [compressingQr, setCompressingQr] = useState(false);

  useEffect(() => {
    fetchPaymentSettings();
  }, []);

  const fetchPaymentSettings = async (propId = '') => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const url = propId 
        ? `/api/homestay-owner/settings/payments?propertyId=${propId}`
        : '/api/homestay-owner/settings/payments';

      const res = await axios.get(getApiUrl(url), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        const d = res.data;
        const ps = d.paymentSettings || d;

        if (d.properties && Array.isArray(d.properties)) {
          setProperties(d.properties);
        }

        const activePropId = d.selectedPropertyId || propId || d.properties?.[0]?._id || '';
        setSelectedPropertyId(activePropId);

        const activePropName = d.selectedPropertyName || d.properties?.find(p => String(p._id) === String(activePropId))?.name || 'Homestay Sanctuary';
        setSelectedPropertyName(activePropName);

        setBankDetails({
          accountHolderName: ps.accountHolderName || activePropName || 'Homestay Owner',
          bankName: ps.bankName || 'HDFC Bank',
          accountNumber: ps.accountNumber || '',
          ifscCode: ps.ifscCode || '',
          branch: ps.branch || ''
        });

        setUpiDetails({
          upiId: ps.upiId || 'keshavhomestay@okicici',
          upiQrCode: ps.upiQrCode || ''
        });

        setAdvancePercent(ps.advancePercent !== undefined ? ps.advancePercent : 30);
        setAdvanceType(ps.advanceType || 'percent');
        setAdvanceAmount(ps.advanceAmount || 0);
      }
    } catch (err) {
      console.error('Failed to load payment settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyChange = (e) => {
    const newId = e.target.value;
    setSelectedPropertyId(newId);
    fetchPaymentSettings(newId);
  };

  const saveSettingsToBackend = async (dataToUpdate = {}) => {
    try {
      setSaving(true);
      const token = getAuthToken();
      const payload = {
        propertyId: selectedPropertyId,
        ...bankDetails,
        ...upiDetails,
        advancePercent,
        advanceType,
        advanceAmount,
        ...dataToUpdate
      };

      const res = await axios.put(getApiUrl('/api/homestay-owner/settings/payments'), payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        const ps = res.data.paymentSettings;
        setBankDetails({
          accountHolderName: ps.accountHolderName,
          bankName: ps.bankName,
          accountNumber: ps.accountNumber,
          ifscCode: ps.ifscCode,
          branch: ps.branch
        });
        setUpiDetails({
          upiId: ps.upiId,
          upiQrCode: ps.upiQrCode
        });
        setAdvancePercent(ps.advancePercent);
        setAdvanceType(ps.advanceType);
        setAdvanceAmount(ps.advanceAmount || 0);

        setSuccessMsg(`Payment settings for ${selectedPropertyName || 'Homestay'} saved & synced across Quotations, Receipts, and Public Booking Links!`);
        setTimeout(() => setSuccessMsg(''), 5000);
        return true;
      }
      return false;
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save payment details.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Image compression helper for custom QR upload
  const handleQrImageUpload = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    setCompressingQr(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const maxDim = 600;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setUpiDetails(prev => ({ ...prev, upiQrCode: compressedDataUrl }));
          setUpiForm(prev => ({ ...prev, upiQrCode: compressedDataUrl }));

          // Directly persist the new QR code for this homestay
          await saveSettingsToBackend({ upiQrCode: compressedDataUrl });
        } catch (e) {
          console.error('QR compression failed:', e);
          alert('Could not process QR image. Please try another file.');
        } finally {
          setCompressingQr(false);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomQr = async () => {
    if (window.confirm('Reset to dynamic UPI QR code?')) {
      setUpiDetails(prev => ({ ...prev, upiQrCode: '' }));
      setUpiForm(prev => ({ ...prev, upiQrCode: '' }));
      await saveSettingsToBackend({ upiQrCode: '' });
    }
  };

  const handleOpenBankModal = () => {
    setBankForm({ ...bankDetails });
    setShowBankModal(true);
  };

  const handleSaveBankModal = async (e) => {
    e.preventDefault();
    const ok = await saveSettingsToBackend(bankForm);
    if (ok) {
      setShowBankModal(false);
    }
  };

  const handleOpenUpiModal = () => {
    setUpiForm({ ...upiDetails });
    setShowUpiModal(true);
  };

  const handleSaveUpiModal = async (e) => {
    e.preventDefault();
    const ok = await saveSettingsToBackend(upiForm);
    if (ok) {
      setShowUpiModal(false);
    }
  };

  const handleSaveAdvanceSettings = async () => {
    await saveSettingsToBackend({ advancePercent, advanceType, advanceAmount });
  };

  // Dynamic QR Code link when no custom uploaded QR image
  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    `upi://pay?pa=${upiDetails.upiId || 'keshavhomestay@okicici'}&pn=${encodeURIComponent(selectedPropertyName || 'Homestay')}&cu=INR`
  )}`;

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-500">
        <RefreshCw size={24} className="animate-spin text-rose-600" />
        <span className="text-xs font-bold uppercase tracking-wider">Loading payment settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12 select-none max-w-5xl mx-auto px-2 sm:px-4">
      
      {/* Top Breadcrumb & Branch Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <button 
            onClick={() => navigate(-1)}
            className="hover:text-slate-600 bg-transparent border-none cursor-pointer flex items-center gap-1 p-0 text-[10px] font-black uppercase text-slate-400"
          >
            <ArrowLeft size={10} className="stroke-[3]" />
            <span>Back</span>
          </button>
          <span>/</span>
          <span>Settings</span>
          <span>/</span>
          <span className="text-rose-700 font-extrabold">Manage Payments</span>
        </div>

        {/* Homestay / Branch Selector */}
        {properties.length > 0 && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
            <span className="text-[9px] font-black uppercase text-slate-400">Branch:</span>
            <select
              value={selectedPropertyId}
              onChange={handlePropertyChange}
              className="bg-transparent text-xs font-black text-slate-800 border-none outline-none cursor-pointer pr-2"
            >
              {properties.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} {p.city ? `(${p.city})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Manage Payments</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wide">
              {selectedPropertyName || 'Homestay Sanctuary'}
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-500">
            Configure custom QR codes, UPI ID, bank account, and advance booking rules separate for each homestay. Updates apply immediately to Quotations, Receipts, and Public Booking links.
          </p>
        </div>

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-sm animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Card 1: Bank Account Details */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <Home size={16} />
            </div>
            <div>
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">Bank Account Details</span>
              <span className="text-[10px] text-slate-400 font-semibold block">Configured for {selectedPropertyName}</span>
            </div>
          </div>

          <button 
            onClick={handleOpenBankModal}
            className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center gap-1.5 shadow-2xs"
          >
            <Edit2 size={12} className="text-slate-400" />
            <span>Edit Bank Details</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          These bank details are displayed directly on guest quotation sheets, booking receipts, and payment instructions for direct bank transfers.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Account Holder Name</span>
            <span className="text-slate-900 font-black block mt-1">{bankDetails.accountHolderName || 'Not Configured'}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Bank Name</span>
            <span className="text-slate-900 font-black block mt-1">{bankDetails.bankName || 'Not Configured'}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Account Number</span>
            <span className="text-slate-900 font-mono font-black block mt-1">{bankDetails.accountNumber || 'Not Configured'}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">IFSC Code</span>
            <span className="text-slate-900 font-mono font-black block mt-1">{bankDetails.ifscCode || 'Not Configured'}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 sm:col-span-2">
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Branch & Location</span>
            <span className="text-slate-900 font-black block mt-1">{bankDetails.branch || 'Not Configured'}</span>
          </div>
        </div>
      </div>

      {/* Card 2: UPI Payment Gateway & Custom QR Code */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <QrCode size={16} />
            </div>
            <div>
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">UPI Payment Gateway & QR Code</span>
              <span className="text-[10px] text-slate-400 font-semibold block">Unique QR Code & UPI ID for {selectedPropertyName}</span>
            </div>
          </div>

          <button 
            onClick={handleOpenUpiModal}
            className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-707 font-bold rounded-lg text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center gap-1.5 shadow-2xs"
          >
            <Edit2 size={12} className="text-slate-400" />
            <span>Edit UPI Gateway</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          Upload your homestay's official Standee QR code (Google Pay, PhonePe, Paytm, or Bank QR) or use the dynamic QR generated from your UPI ID. This QR code will appear prominently on your quotations and public booking links.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 items-center pt-2">
          {/* QR Code preview block with Change option */}
          <div className="flex flex-col items-center gap-2.5 flex-shrink-0">
            <div className="relative group w-36 h-36 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center justify-center shadow-inner p-2 overflow-hidden">
              <img 
                src={upiDetails.upiQrCode || dynamicQrUrl} 
                alt="Homestay UPI QR" 
                className="w-full h-full object-contain rounded-xl"
              />
              
              {compressingQr && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                  <RefreshCw size={20} className="animate-spin text-rose-600" />
                </div>
              )}

              {/* Hover Overlay Button */}
              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer border-none flex items-center gap-1 shadow-sm"
                >
                  <Upload size={10} />
                  <span>Change QR</span>
                </button>
                {upiDetails.upiQrCode && (
                  <button
                    type="button"
                    onClick={handleRemoveCustomQr}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[8px] font-bold uppercase tracking-wider cursor-pointer border-none flex items-center gap-1 shadow-sm"
                  >
                    <Trash2 size={9} />
                    <span>Reset QR</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[9px] font-black uppercase">
                {upiDetails.upiQrCode ? 'Custom QR Active' : 'Auto Dynamic QR Active'}
              </span>
            </div>

            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={(e) => handleQrImageUpload(e.target.files?.[0])}
              accept="image/*"
              className="hidden" 
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] text-rose-700 font-bold hover:underline cursor-pointer bg-transparent border-none flex items-center gap-1"
            >
              <Upload size={11} />
              <span>{upiDetails.upiQrCode ? 'Replace QR Code Image' : 'Upload Custom QR Image'}</span>
            </button>
          </div>

          {/* Configuration controls */}
          <div className="flex-1 space-y-4 w-full">
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">UPI ID / VPA</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-black text-slate-900">{upiDetails.upiId || 'Not Configured'}</span>
                <span className="text-[9px] font-bold text-slate-400">BHIM / GPay / PhonePe / Paytm</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button 
                onClick={handleOpenUpiModal}
                className="flex-1 min-w-[180px] py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Edit2 size={12} />
                <span>Configure UPI ID & QR Code</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none transition-all flex items-center justify-center gap-1.5"
              >
                <Upload size={12} />
                <span>Upload QR Image</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Advance Booking Settings */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm space-y-5">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">Advance Booking Commitment</span>
            <span className="text-[10px] text-slate-400 font-semibold block">Define advance required from guests before dates are confirmed</span>
          </div>
          
          <button 
            onClick={handleSaveAdvanceSettings}
            disabled={saving}
            className="px-4 py-2 bg-rose-700 hover:bg-rose-800 disabled:bg-rose-400 text-white font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 shadow-sm transition-all"
          >
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
            <span>Save Settings</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Percentage option */}
          <div 
            onClick={() => setAdvanceType('percent')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              advanceType === 'percent' 
                ? 'border-rose-600 bg-rose-50/20' 
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black text-slate-900 uppercase">Percentage Based (%)</span>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                advanceType === 'percent' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300'
              }`}>
                {advanceType === 'percent' && <Check size={10} className="stroke-[3]" />}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mb-3">Calculate advance as a percentage of the total stay amount.</p>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-slate-200 rounded-xl bg-white p-1">
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAdvancePercent(prev => Math.max(0, prev - 5)); }}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 border-none cursor-pointer"
                >
                  <Minus size={13} />
                </button>
                <input 
                  type="number"
                  value={advancePercent}
                  onChange={(e) => setAdvancePercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-14 text-center font-black text-sm text-slate-900 border-none outline-none"
                />
                <span className="text-xs font-black text-slate-400 pr-2">%</span>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAdvancePercent(prev => Math.min(100, prev + 5)); }}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 border-none cursor-pointer"
                >
                  <Plus size={13} />
                </button>
              </div>
              <span className="text-xs font-black text-rose-700">{advancePercent}% of Total Booking</span>
            </div>
          </div>

          {/* Fixed Fee option */}
          <div 
            onClick={() => setAdvanceType('fixed')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              advanceType === 'fixed' 
                ? 'border-rose-600 bg-rose-50/20' 
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black text-slate-900 uppercase">Fixed Flat Fee (₹)</span>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                advanceType === 'fixed' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300'
              }`}>
                {advanceType === 'fixed' && <Check size={10} className="stroke-[3]" />}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mb-3">Require a fixed token deposit regardless of total booking cost.</p>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-400">₹</span>
              <input 
                type="number"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(Math.max(0, Number(e.target.value)))}
                className="w-28 px-3 py-1.5 border border-slate-200 rounded-xl font-black text-sm text-slate-900 focus:border-rose-500 outline-none"
                placeholder="e.g. 2000"
              />
              <span className="text-xs font-bold text-slate-400">Flat Fee</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Bank Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Edit Bank Details</h4>
                <p className="text-[10px] text-slate-400 font-bold">{selectedPropertyName}</p>
              </div>
              <button 
                onClick={() => setShowBankModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveBankModal} className="space-y-3.5">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Account Holder Name</label>
                <input
                  type="text"
                  required
                  value={bankForm.accountHolderName}
                  onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                  placeholder="e.g. Keshav Homestay"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                  placeholder="e.g. HDFC Bank"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Account Number</label>
                <input
                  type="text"
                  required
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-rose-500"
                  placeholder="e.g. 5010 1234 5678 90"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">IFSC Code</label>
                <input
                  type="text"
                  required
                  value={bankForm.ifscCode}
                  onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-rose-500 uppercase"
                  placeholder="e.g. HDFC0001234"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Branch</label>
                <input
                  type="text"
                  value={bankForm.branch}
                  onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                  placeholder="e.g. Panchpokhari, Himachal Pradesh"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 shadow-sm"
                >
                  {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                  <span>Save Bank Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit UPI & QR Modal */}
      {showUpiModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Configure UPI ID & QR Code</h4>
                <p className="text-[10px] text-slate-400 font-bold">{selectedPropertyName}</p>
              </div>
              <button 
                onClick={() => setShowUpiModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveUpiModal} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">UPI ID / VPA</label>
                <input
                  type="text"
                  required
                  value={upiForm.upiId}
                  onChange={(e) => setUpiForm({ ...upiForm, upiId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-rose-500"
                  placeholder="e.g. keshavhomestay@okicici"
                />
              </div>

              {/* QR Code Upload / Preview in modal */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">QR Code</label>
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="w-20 h-20 bg-white border border-slate-200 rounded-xl p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img 
                      src={upiForm.upiQrCode || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${upiForm.upiId}&pn=${encodeURIComponent(selectedPropertyName || 'Homestay')}&cu=INR`)}`}
                      alt="QR Preview" 
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer border-none flex items-center gap-1 shadow-2xs"
                    >
                      <Upload size={11} />
                      <span>{upiForm.upiQrCode ? 'Replace Image' : 'Upload Standee QR'}</span>
                    </button>
                    {upiForm.upiQrCode && (
                      <button
                        type="button"
                        onClick={() => setUpiForm({ ...upiForm, upiQrCode: '' })}
                        className="text-[9px] text-rose-700 font-bold hover:underline cursor-pointer bg-transparent border-none block"
                      >
                        Reset to Auto-Generated QR
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUpiModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 shadow-sm"
                >
                  {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                  <span>Save UPI Gateway</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
