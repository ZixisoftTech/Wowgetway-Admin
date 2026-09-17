import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Building2, 
  UploadCloud, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  PenTool, 
  Stamp, 
  Image as ImageIcon, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Eye, 
  Trash2, 
  ArrowLeft,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Receipt
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export default function SignaturesStamps() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'preview'
  const [uploadingField, setUploadingField] = useState(null);

  // Exactly the 10 required fields
  const [formData, setFormData] = useState({
    logo: '',
    homestayName: '',
    fullAddress: '',
    contactNumber: '',
    emailId: '',
    gstNumber: '',
    authorizedSignatoryName: '',
    designation: 'Authorized Signatory',
    stampImage: '',
    signatureImage: ''
  });

  const logoInputRef = useRef(null);
  const stampInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  const getAuthToken = () => {
    return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
  };

  // 1. Fetch Owner's Properties
  useEffect(() => {
    const fetchOwnerProperties = async () => {
      try {
        setLoadingProperties(true);
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }

        const res = await axios.get(getApiUrl('/api/homestay-owner/properties'), {
          headers: { Authorization: `Bearer ${token}` }
        });

        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setProperties(list);

        const paramPropId = searchParams.get('propertyId');
        if (paramPropId && list.some(p => (p._id || p.id) === paramPropId)) {
          setSelectedPropertyId(paramPropId);
        } else if (list.length > 0) {
          setSelectedPropertyId(list[0]._id || list[0].id);
        }
      } catch (err) {
        console.error('Failed to load properties for signatures:', err);
        setError('Could not retrieve your homestays. Please refresh.');
      } finally {
        setLoadingProperties(false);
      }
    };

    fetchOwnerProperties();
  }, []);

  // 2. Fetch Business Details whenever selected property changes
  useEffect(() => {
    if (!selectedPropertyId) return;

    const fetchDetails = async () => {
      try {
        setLoadingDetails(true);
        setError(null);
        setSuccessMsg(null);
        const token = getAuthToken();

        const res = await axios.get(
          getApiUrl(`/api/dashboard/homestays-list/${selectedPropertyId}/business-details`),
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );

        const selectedProp = properties.find(p => (p._id || p.id) === selectedPropertyId);

        if (res.data?.success && res.data?.businessDetails) {
          const b = res.data.businessDetails;
          setFormData({
            logo: b.logo || '',
            homestayName: b.homestayName || selectedProp?.name || '',
            fullAddress: b.fullAddress || selectedProp?.address || '',
            contactNumber: b.contactNumber || selectedProp?.ownerMobile || '',
            emailId: b.emailId || selectedProp?.ownerEmail || '',
            gstNumber: b.gstNumber || selectedProp?.gstNumber || '',
            authorizedSignatoryName: b.authorizedSignatoryName || selectedProp?.ownerName || '',
            designation: b.designation || 'Authorized Signatory',
            stampImage: b.stampImage || '',
            signatureImage: b.signatureImage || ''
          });
        }
      } catch (err) {
        console.error('Failed to fetch business details:', err);
        setError('Failed to load saved signature and stamp configuration.');
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedPropertyId]);

  // Handle Property Change
  const handlePropertyChange = (newId) => {
    setSelectedPropertyId(newId);
    setSearchParams({ propertyId: newId });
  };

  // Image upload handler with fallback
  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        getApiUrl(`/api/dashboard/homestays-list/${selectedPropertyId}/upload-business-asset`),
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
      console.warn(`Asset upload failed, fallback to base64:`, err);
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

  // Save changes
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.homestayName.trim()) {
      setError('Homestay Name is required for official documents.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);
      const token = getAuthToken();

      const res = await axios.put(
        getApiUrl(`/api/dashboard/homestays-list/${selectedPropertyId}/business-details`),
        formData,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success) {
        setSuccessMsg('Official branding, signature, and stamp saved! These details will appear automatically on your Tax Invoices and Quotations.');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error('Failed to save business details:', err);
      setError(err.response?.data?.message || 'Could not save signature and stamp details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedProperty = properties.find(p => (p._id || p.id) === selectedPropertyId);

  if (loadingProperties) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-500">
        <RefreshCw size={26} className="animate-spin text-rose-600" />
        <span className="text-xs font-bold uppercase tracking-wider">Loading your homestays...</span>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-150 rounded-3xl text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
          <Building2 size={28} />
        </div>
        <h2 className="text-xl font-black text-slate-800">No Homestays Found</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Please add and publish a Homestay first before configuring official signatures, stamps, and business branding.
        </p>
        <button
          onClick={() => navigate('/homestay-owner/inventory/add-property')}
          className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border-none shadow transition-all"
        >
          Add Your First Homestay
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-16 select-none">
      
      {/* Top Header Card */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-700">
              <Stamp size={18} />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Signatures, Stamps & Logo
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
              Official Documents
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            Configure your homestay's official logo, GST details, authorized signatory, and seal/stamp. 
            The system will automatically apply these details to generated <strong>Tax Invoices</strong> and <strong>Quotations</strong>.
          </p>
        </div>

        {/* Multi-Homestay Selector Switcher */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <div className="text-left sm:text-right">
            <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Selected Homestay</span>
            <span className="font-extrabold text-xs text-slate-800">
              {selectedProperty?.name || 'My Homestay'}
            </span>
          </div>

          {properties.length > 1 ? (
            <div className="relative w-full sm:w-56">
              <select
                value={selectedPropertyId || ''}
                onChange={(e) => handlePropertyChange(e.target.value)}
                className="w-full appearance-none px-3.5 py-2 bg-white border border-slate-250 rounded-xl text-xs font-bold text-slate-800 pr-8 cursor-pointer outline-none focus:border-rose-500 shadow-2xs"
              >
                {properties.map(p => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.name} ({p.city || 'Active'})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          ) : (
            <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 font-mono">
              #{selectedPropertyId?.slice(-6) || 'PROPERTY'}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`px-5 py-2.5 text-xs font-black rounded-t-2xl transition-all border-b-2 bg-transparent cursor-pointer flex items-center gap-2 ${
            activeTab === 'edit'
              ? 'text-rose-700 border-rose-600 bg-white font-extrabold shadow-xs'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          <FileText size={14} />
          <span>Configure 10 Document Fields</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`px-5 py-2.5 text-xs font-black rounded-t-2xl transition-all border-b-2 bg-transparent cursor-pointer flex items-center gap-2 ${
            activeTab === 'preview'
              ? 'text-rose-700 border-rose-600 bg-white font-extrabold shadow-xs'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          <Eye size={14} />
          <span>Live Document Preview</span>
        </button>
      </div>

      {/* Loading state for property details */}
      {loadingDetails ? (
        <div className="p-20 bg-white rounded-3xl border border-slate-150 flex flex-col items-center justify-center gap-3 text-slate-400 shadow-sm">
          <RefreshCw size={24} className="animate-spin text-rose-600" />
          <span className="text-xs font-bold uppercase tracking-wider">Loading homestay configuration...</span>
        </div>
      ) : activeTab === 'preview' ? (
        /* LIVE DOCUMENT PREVIEW TAB */
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
            <AlertCircle size={16} className="mt-0.5 text-amber-600 shrink-0" />
            <div>
              <strong className="block font-bold">Real-Time Invoice & Quotation Preview</strong>
              <span>
                Below is how this homestay's official header, contact info, digital signature, and official seal appear on generated documents.
              </span>
            </div>
          </div>

          {/* Sample Document Box */}
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
            
            {/* Header Preview */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
              <div className="flex items-start gap-3.5">
                {formData.logo ? (
                  <img 
                    src={formData.logo} 
                    alt="Homestay Logo" 
                    className="w-16 h-16 object-contain rounded-xl border border-slate-200 p-1 bg-white shrink-0 shadow-xs"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-[9px] text-center p-1 shrink-0">
                    <Building2 size={18} className="mb-0.5" />
                    No Logo
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 font-black text-[10px] rounded uppercase tracking-wider border border-rose-100">
                      TAX INVOICE
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-black text-[9px] rounded uppercase border border-emerald-200">
                      PAID IN FULL
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    {formData.homestayName || selectedProperty?.name || 'Homestay Sanctuary'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm leading-snug">
                    {formData.fullAddress || selectedProperty?.address || 'Full Postal Address not configured'}
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

              <div className="sm:text-right text-xs shrink-0">
                <div className="font-mono font-black text-slate-900 text-sm">INV-010025</div>
                <div className="text-slate-500 font-medium">Date: <strong className="text-slate-800">{new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
                <div className="text-slate-500 font-medium">Ref: <strong className="text-rose-700">#SAMPLE</strong></div>
              </div>
            </div>

            {/* Itemized Placeholder */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-150 text-xs text-slate-500 text-center italic space-y-1">
              <Receipt size={20} className="mx-auto text-slate-400 mb-1" />
              <p className="font-bold text-slate-700">[ Booking Accommodation & Itemized Charges Section ]</p>
              <p className="text-[10px] text-slate-400">Total tariff, taxes, guest details, and bank transfer information</p>
            </div>

            {/* Footer Signature & Stamp Preview */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6">
              <div className="text-[10px] text-slate-400 space-y-0.5 max-w-xs text-center sm:text-left">
                <p>Thank you for choosing {formData.homestayName || selectedProperty?.name}!</p>
                <p>This is an officially authorized tax invoice generated by {formData.homestayName || selectedProperty?.name}.</p>
              </div>

              {/* Signatory & Stamp Box */}
              <div className="flex flex-col items-center text-center relative w-56">
                <div className="relative h-20 w-full flex items-center justify-center">
                  {/* Seal / Stamp Image */}
                  {formData.stampImage && (
                    <img 
                      src={formData.stampImage} 
                      alt="Official Stamp" 
                      className="absolute right-0 top-0 h-20 w-20 object-contain opacity-85 pointer-events-none drop-shadow-xs"
                      title="Homestay Official Seal / Stamp"
                    />
                  )}

                  {/* Signature Image */}
                  {formData.signatureImage ? (
                    <img 
                      src={formData.signatureImage} 
                      alt="Authorized Signature" 
                      className="relative z-10 max-h-16 max-w-[170px] object-contain drop-shadow-xs"
                    />
                  ) : (
                    <span className="font-serif italic text-base text-slate-700 block">
                      {formData.authorizedSignatoryName || selectedProperty?.ownerName || 'Authorized Signatory'}
                    </span>
                  )}
                </div>

                <div className="w-full border-t border-slate-300 pt-1 mt-1 text-center">
                  <span className="block font-black text-xs text-slate-900 tracking-tight">
                    {formData.authorizedSignatoryName || selectedProperty?.ownerName || 'Authorized Signatory'}
                  </span>
                  <span className="block text-[8px] font-black text-rose-700 uppercase tracking-wider">
                    {formData.designation || 'Authorized Signatory'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer border-none shadow transition-all"
            >
              Return to Configure Form
            </button>
          </div>
        </div>
      ) : (
        /* CONFIGURE 10 DETAILS FORM */
        <form onSubmit={handleSave} className="space-y-6">
          
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2.5">
              <Check size={18} className="shrink-0 text-emerald-600 stroke-[3]" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* SECTION 1: Business Identity & Contact */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <Building2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                  1. Business & Contact Information
                </h3>
                <p className="text-[11px] text-slate-400">Official business identity displayed on invoices & quotation headers</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Field 1: Homestay Logo */}
              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  1. Homestay Logo
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50/70 border border-slate-200 rounded-2xl">
                  {formData.logo ? (
                    <div className="relative group shrink-0">
                      <img 
                        src={formData.logo} 
                        alt="Homestay Logo Preview" 
                        className="w-20 h-20 object-contain rounded-2xl border border-slate-250 bg-white p-1.5 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, logo: '' }))}
                        className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 border-none cursor-pointer shadow"
                        title="Remove Logo"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon size={24} className="mb-0.5" />
                      <span className="text-[8px] font-bold">NO LOGO</span>
                    </div>
                  )}

                  <div className="space-y-2 flex-1 w-full">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'logo')}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingField === 'logo'}
                        className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
                      >
                        {uploadingField === 'logo' ? <RefreshCw size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                        <span>Upload Logo File</span>
                      </button>
                      <span className="text-[10px] text-slate-400 font-medium">PNG or JPG (Square / transparent recommended, max 5MB)</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Or paste Logo Image URL..."
                      value={formData.logo}
                      onChange={(e) => setFormData(p => ({ ...p, logo: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Field 2: Homestay Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  2. Homestay Trade / Legal Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pinecrest Heritage Villa"
                  value={formData.homestayName}
                  onChange={(e) => setFormData(p => ({ ...p, homestayName: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-xs font-bold text-slate-900 outline-none shadow-2xs"
                />
              </div>

              {/* Field 6: GST Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  6. GST Number (GSTIN)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 02AABCT1332F1Z8"
                  value={formData.gstNumber}
                  onChange={(e) => setFormData(p => ({ ...p, gstNumber: e.target.value.toUpperCase() }))}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase outline-none shadow-2xs"
                />
              </div>

              {/* Field 4: Contact Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  4. Official Contact Number
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData(p => ({ ...p, contactNumber: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-xs font-bold text-slate-900 outline-none shadow-2xs"
                  />
                </div>
              </div>

              {/* Field 5: Email ID */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  5. Official Email ID
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    placeholder="e.g. bookings@pinecrestvilla.com"
                    value={formData.emailId}
                    onChange={(e) => setFormData(p => ({ ...p, emailId: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-xs font-bold text-slate-900 outline-none shadow-2xs"
                  />
                </div>
              </div>

              {/* Field 3: Full Physical Address */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  3. Full Physical Address
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-3 text-slate-400" />
                  <textarea
                    rows={2}
                    placeholder="e.g. Plot 42, Apple Orchard Way, Village Rangri, Old Manali, Distt. Kullu, Himachal Pradesh - 175131"
                    value={formData.fullAddress}
                    onChange={(e) => setFormData(p => ({ ...p, fullAddress: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-xs font-medium text-slate-900 outline-none resize-none shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Official Signatory & Seal / Stamp */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <PenTool size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                  2. Authorized Signatory & Official Stamp / Seal
                </h3>
                <p className="text-[11px] text-slate-400">Legal signatory authorization shown on the footer of all invoices & receipts</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Field 7: Authorized Signatory Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  7. Authorized Signatory Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajeshwar Sharma"
                  value={formData.authorizedSignatoryName}
                  onChange={(e) => setFormData(p => ({ ...p, authorizedSignatoryName: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-xs font-bold text-slate-900 outline-none shadow-2xs"
                />
              </div>

              {/* Field 8: Designation */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  8. Designation / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Managing Partner / Owner & Host"
                  value={formData.designation}
                  onChange={(e) => setFormData(p => ({ ...p, designation: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-xs font-bold text-slate-900 outline-none shadow-2xs"
                />
              </div>

              {/* Field 9: Seal / Stamp Image */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                    9. Seal / Stamp Image
                  </label>
                  <span className="text-[9px] text-slate-400 font-bold">Rubber Stamp / Seal</span>
                </div>

                <div className="flex items-center gap-3.5">
                  {formData.stampImage ? (
                    <div className="relative group shrink-0">
                      <img 
                        src={formData.stampImage} 
                        alt="Stamp preview" 
                        className="w-20 h-20 object-contain rounded-2xl border border-slate-250 bg-white p-1.5 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, stampImage: '' }))}
                        className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 border-none cursor-pointer shadow"
                        title="Remove stamp"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                      <Stamp size={24} className="mb-0.5" />
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
                      className="w-full px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      {uploadingField === 'stampImage' ? <RefreshCw size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                      <span>Upload Stamp Image</span>
                    </button>
                    <input
                      type="text"
                      placeholder="Or paste Stamp URL..."
                      value={formData.stampImage}
                      onChange={(e) => setFormData(p => ({ ...p, stampImage: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Field 10: Authorized Signatory Signature Image */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                    10. Signature Image
                  </label>
                  <span className="text-[9px] text-slate-400 font-bold">Authorized Signatory</span>
                </div>

                <div className="flex items-center gap-3.5">
                  {formData.signatureImage ? (
                    <div className="relative group shrink-0">
                      <img 
                        src={formData.signatureImage} 
                        alt="Signature preview" 
                        className="w-20 h-20 object-contain rounded-2xl border border-slate-250 bg-white p-1.5 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, signatureImage: '' }))}
                        className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 border-none cursor-pointer shadow"
                        title="Remove signature"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                      <PenTool size={24} className="mb-0.5" />
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
                      className="w-full px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      {uploadingField === 'signatureImage' ? <RefreshCw size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                      <span>Upload Signature Image</span>
                    </button>
                    <input
                      type="text"
                      placeholder="Or paste Signature URL..."
                      value={formData.signatureImage}
                      onChange={(e) => setFormData(p => ({ ...p, signatureImage: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Action Button Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white border border-slate-150 rounded-2xl shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer border-none flex items-center justify-center gap-1.5 transition-all"
            >
              <Eye size={14} />
              <span>Preview On Invoices & Quotations</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg border-none cursor-pointer flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} className="stroke-[3]" />}
              <span>{saving ? 'Saving Details...' : 'Save & Update Details'}</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
