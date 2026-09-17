import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  X, 
  Check, 
  UploadCloud, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  PenTool, 
  Image as ImageIcon, 
  RefreshCw, 
  AlertCircle,
  Eye,
  Trash2,
  Stamp
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export default function HomestayBusinessDetailsModal({ 
  homestayId, 
  homestayName = '', 
  isOpen, 
  onClose, 
  onSuccess 
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Exactly the 10 specified fields
  const [formData, setFormData] = useState({
    logo: '',
    homestayName: homestayName || '',
    fullAddress: '',
    contactNumber: '',
    emailId: '',
    gstNumber: '',
    authorizedSignatoryName: '',
    designation: 'Authorized Signatory',
    stampImage: '',
    signatureImage: ''
  });

  const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'preview'
  const [uploadingField, setUploadingField] = useState(null);

  const logoInputRef = useRef(null);
  const stampInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && homestayId) {
      fetchBusinessDetails();
    }
  }, [isOpen, homestayId]);

  const getAuthToken = () => {
    return localStorage.getItem('superAdminToken') || localStorage.getItem('homestayOwnerToken');
  };

  const fetchBusinessDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      const res = await axios.get(getApiUrl(`/api/dashboard/homestays-list/${homestayId}/business-details`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data && (res.data.businessDetails || res.data.data)) {
        const details = res.data.businessDetails || res.data.data;
        setFormData({
          logo: details.logo || '',
          homestayName: details.homestayName || homestayName || '',
          fullAddress: details.fullAddress || '',
          contactNumber: details.contactNumber || '',
          emailId: details.emailId || '',
          gstNumber: details.gstNumber || '',
          authorizedSignatoryName: details.authorizedSignatoryName || '',
          designation: details.designation || 'Authorized Signatory',
          stampImage: details.stampImage || '',
          signatureImage: details.signatureImage || ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch homestay business details:', err);
      setError('Could not load existing business details. You can enter new details below.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    try {
      setUploadingField(fieldName);
      const token = getAuthToken();

      const uploadData = new FormData();
      uploadData.append('file', file);

      const res = await axios.post(
        getApiUrl(`/api/dashboard/homestays-list/${homestayId}/upload-business-asset`), 
        uploadData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      const uploadedUrl = res.data?.url || res.data?.dataUrl;
      if (uploadedUrl) {
        setFormData(prev => ({
          ...prev,
          [fieldName]: uploadedUrl
        }));
      }
    } catch (err) {
      console.error(`Failed to upload ${fieldName}:`, err);
      // Fallback to FileReader base64 if network upload endpoint fails
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({
          ...prev,
          [fieldName]: reader.result
        }));
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.homestayName.trim()) {
      setError('Homestay Name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);
      const token = getAuthToken();

      const res = await axios.put(
        getApiUrl(`/api/dashboard/homestays-list/${homestayId}/business-details`),
        formData,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      if (res.data?.success) {
        setSuccessMsg('Business details, signature, and stamp saved successfully!');
        if (onSuccess) {
          onSuccess(res.data.businessDetails || formData);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to save homestay business details:', err);
      setError(err.response?.data?.message || 'Failed to save details. Please check inputs and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-150 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-150 my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 text-white flex justify-between items-center border-b border-slate-750">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-600/20 border border-rose-500/30 rounded-2xl text-rose-400">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">
                  Signature & Stamp Details
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                  Official Documents
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure official branding, stamp & signature used on Invoices & Quotations for <strong className="text-white">{formData.homestayName || homestayName || `Homestay #${homestayId}`}</strong>
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-700/50 transition-colors bg-transparent border-none cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 bg-transparent cursor-pointer ${
              activeTab === 'edit'
                ? 'text-rose-700 border-rose-600 bg-white font-extrabold shadow-xs'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            Configure 10 Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 bg-transparent cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'text-rose-700 border-rose-600 bg-white font-extrabold shadow-xs'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            <Eye size={13} />
            <span>Live Document Preview</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[72vh] overflow-y-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw size={24} className="animate-spin text-rose-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Loading homestay configuration...</span>
            </div>
          ) : activeTab === 'preview' ? (
            /* Live Document Preview */
            <div className="space-y-6">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 text-amber-600 shrink-0" />
                <span>
                  Below is a real-time preview of how this Homestay's official header and signature block will appear on generated <strong>Tax Invoices</strong> and <strong>Quotations</strong>.
                </span>
              </div>

              {/* Sample Document Box */}
              <div className="border border-slate-250 rounded-2xl p-6 bg-white shadow-sm space-y-6">
                
                {/* Header Preview */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b border-slate-200">
                  <div className="flex items-start gap-3.5">
                    {formData.logo ? (
                      <img 
                        src={formData.logo} 
                        alt="Homestay Logo" 
                        className="w-16 h-16 object-contain rounded-xl border border-slate-200 p-1 bg-white"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-[9px] text-center p-1">
                        <Building2 size={18} className="mb-0.5" />
                        No Logo
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <h4 className="text-base font-black text-slate-900 uppercase">
                        {formData.homestayName || 'Homestay Name'}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm leading-snug">
                        {formData.fullAddress || 'Full Postal Address not configured'}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px] text-slate-500">
                        {formData.contactNumber && (
                          <span>Phone: <strong className="text-slate-800">{formData.contactNumber}</strong></span>
                        )}
                        {formData.emailId && (
                          <span>Email: <strong className="text-slate-800">{formData.emailId}</strong></span>
                        )}
                      </div>
                      {formData.gstNumber && (
                        <p className="text-[11px] text-slate-600 font-bold">
                          GSTIN: <span className="font-mono text-slate-900">{formData.gstNumber}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-black rounded uppercase text-[10px] border border-rose-200">
                      TAX INVOICE / QUOTATION
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">SAMPLE DOCUMENT</p>
                  </div>
                </div>

                {/* Dummy Itemized Table */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 text-xs text-slate-500 text-center italic">
                  [ Itemized Charges & Stay Details Section ]
                </div>

                {/* Footer Signature & Stamp Preview */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6">
                  <div className="text-[10px] text-slate-400 space-y-0.5 max-w-xs">
                    <p>Thank you for choosing {formData.homestayName || 'our Homestay'}!</p>
                    <p>This document is verified and officially authorized.</p>
                  </div>

                  {/* Signatory & Stamp Stack */}
                  <div className="flex flex-col items-center text-center relative w-56">
                    <div className="relative h-20 w-full flex items-center justify-center">
                      {/* Stamp Image (Positioned slightly overlapping or background) */}
                      {formData.stampImage && (
                        <img 
                          src={formData.stampImage} 
                          alt="Official Stamp" 
                          className="absolute right-2 top-0 h-18 w-18 object-contain opacity-85 pointer-events-none drop-shadow-xs"
                          title="Homestay Official Seal / Stamp"
                        />
                      )}

                      {/* Signature Image */}
                      {formData.signatureImage ? (
                        <img 
                          src={formData.signatureImage} 
                          alt="Authorized Signature" 
                          className="relative z-10 max-h-16 max-w-[160px] object-contain drop-shadow-xs"
                        />
                      ) : (
                        <span className="text-xs italic text-slate-300 font-serif">
                          (Signature image will appear here)
                        </span>
                      )}
                    </div>

                    <div className="w-full border-t border-slate-300 pt-1.5 mt-1">
                      <div className="font-extrabold text-xs text-slate-900 tracking-tight">
                        {formData.authorizedSignatoryName || 'Authorized Signatory Name'}
                      </div>
                      <div className="text-[9px] font-black text-rose-700 uppercase tracking-wider">
                        {formData.designation || 'Authorized Signatory'}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer border-none"
                >
                  Return to Edit Form
                </button>
              </div>
            </div>
          ) : (
            /* 10 Fields Configuration Form */
            <form onSubmit={handleSave} className="space-y-6">
              
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                  <Check size={16} className="shrink-0 text-emerald-600 stroke-[3]" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* SECTION 1: Business Identity & Contact */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-150 pb-2">
                  <Building2 size={16} className="text-rose-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    1. Business & Contact Information
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Field 1: Homestay Logo */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                      1. Homestay Logo
                    </label>
                    <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      {formData.logo ? (
                        <div className="relative group">
                          <img 
                            src={formData.logo} 
                            alt="Logo preview" 
                            className="w-16 h-16 object-contain rounded-xl border border-slate-250 bg-white p-1"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, logo: '' }))}
                            className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 border-none cursor-pointer shadow"
                            title="Remove logo"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400">
                          <ImageIcon size={22} />
                        </div>
                      )}

                      <div className="space-y-1.5 flex-1">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'logo')}
                          className="hidden"
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            disabled={uploadingField === 'logo'}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                          >
                            {uploadingField === 'logo' ? <RefreshCw size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                            <span>Upload Logo Image</span>
                          </button>
                          <span className="text-[10px] text-slate-400">PNG, JPG, or SVG (Transparent recommended)</span>
                        </div>
                        <input
                          type="text"
                          placeholder="Or paste Logo Image URL directly..."
                          value={formData.logo}
                          onChange={(e) => setFormData(p => ({ ...p, logo: e.target.value }))}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Field 2: Homestay Name */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                      2. Homestay Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pinecrest Heritage Villa"
                      value={formData.homestayName}
                      onChange={(e) => setFormData(p => ({ ...p, homestayName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>

                  {/* Field 6: GST Number */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                      6. GST Number (GSTIN)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 29AABCU9603R1Z2"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData(p => ({ ...p, gstNumber: e.target.value.toUpperCase() }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-xs font-mono font-bold text-slate-800 uppercase outline-none"
                    />
                  </div>

                  {/* Field 4: Contact Number */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                      4. Contact Number
                    </label>
                    <div className="relative">
                      <Phone size={13} className="absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. +91 98765 43210"
                        value={formData.contactNumber}
                        onChange={(e) => setFormData(p => ({ ...p, contactNumber: e.target.value }))}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  {/* Field 5: Email ID */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                      5. Email ID
                    </label>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="email"
                        placeholder="e.g. contact@pinecresthomes.in"
                        value={formData.emailId}
                        onChange={(e) => setFormData(p => ({ ...p, emailId: e.target.value }))}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  {/* Field 3: Full Address */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                      3. Full Physical Address
                    </label>
                    <div className="relative">
                      <MapPin size={13} className="absolute left-3.5 top-3 text-slate-400" />
                      <textarea
                        rows={2}
                        placeholder="e.g. House No. 42, Apple Orchard Way, Village Rangri, Manali, Distt. Kullu, HP - 175131"
                        value={formData.fullAddress}
                        onChange={(e) => setFormData(p => ({ ...p, fullAddress: e.target.value }))}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-xs text-slate-800 outline-none resize-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Official Signatory & Seal / Stamp */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-150 pb-2">
                  <PenTool size={16} className="text-rose-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    2. Official Signatory & Stamp / Seal
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Field 7: Authorized Signatory Name */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                      7. Authorized Signatory Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rajeshwar Sharma"
                      value={formData.authorizedSignatoryName}
                      onChange={(e) => setFormData(p => ({ ...p, authorizedSignatoryName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>

                  {/* Field 8: Designation */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                      8. Designation
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Managing Director / Homestay Host / Manager"
                      value={formData.designation}
                      onChange={(e) => setFormData(p => ({ ...p, designation: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>

                  {/* Field 9: Seal / Stamp Image */}
                  <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                        9. Seal / Stamp Image
                      </label>
                      <span className="text-[9px] text-slate-400 font-bold">Round / Rectangular Stamp</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {formData.stampImage ? (
                        <div className="relative group shrink-0">
                          <img 
                            src={formData.stampImage} 
                            alt="Stamp preview" 
                            className="w-18 h-18 object-contain rounded-xl border border-slate-250 bg-white p-1"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, stampImage: '' }))}
                            className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 border-none cursor-pointer shadow"
                            title="Remove stamp"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-18 h-18 rounded-xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                          <Stamp size={20} className="mb-0.5" />
                          <span className="text-[8px] font-bold">NO STAMP</span>
                        </div>
                      )}

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <input
                          ref={stampInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'stampImage')}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => stampInputRef.current?.click()}
                          disabled={uploadingField === 'stampImage'}
                          className="w-full px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                        >
                          {uploadingField === 'stampImage' ? <RefreshCw size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                          <span>Upload Stamp Image</span>
                        </button>
                        <input
                          type="text"
                          placeholder="Or paste Stamp URL..."
                          value={formData.stampImage}
                          onChange={(e) => setFormData(p => ({ ...p, stampImage: e.target.value }))}
                          className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-700 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Field 10: Authorized Signatory Signature Image */}
                  <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                        10. Signature Image
                      </label>
                      <span className="text-[9px] text-slate-400 font-bold">Authorized Signatory</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {formData.signatureImage ? (
                        <div className="relative group shrink-0">
                          <img 
                            src={formData.signatureImage} 
                            alt="Signature preview" 
                            className="w-18 h-18 object-contain rounded-xl border border-slate-250 bg-white p-1"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, signatureImage: '' }))}
                            className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 border-none cursor-pointer shadow"
                            title="Remove signature"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-18 h-18 rounded-xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                          <PenTool size={20} className="mb-0.5" />
                          <span className="text-[8px] font-bold">NO SIGN</span>
                        </div>
                      )}

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <input
                          ref={signatureInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'signatureImage')}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => signatureInputRef.current?.click()}
                          disabled={uploadingField === 'signatureImage'}
                          className="w-full px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                        >
                          {uploadingField === 'signatureImage' ? <RefreshCw size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                          <span>Upload Signature Image</span>
                        </button>
                        <input
                          type="text"
                          placeholder="Or paste Signature URL..."
                          value={formData.signatureImage}
                          onChange={(e) => setFormData(p => ({ ...p, signatureImage: e.target.value }))}
                          className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-700 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors border-none cursor-pointer flex items-center gap-1.5"
                >
                  <Eye size={13} />
                  <span>Preview Layout</span>
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg border-none cursor-pointer flex items-center gap-2"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} className="stroke-[3]" />}
                  <span>{saving ? 'Saving Details...' : 'Save & Update Details'}</span>
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}
