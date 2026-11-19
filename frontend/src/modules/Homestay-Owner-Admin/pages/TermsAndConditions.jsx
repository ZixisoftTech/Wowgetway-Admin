import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  ScrollText, 
  Save, 
  Building2, 
  FileText, 
  CheckCircle2, 
  RefreshCw, 
  Eye, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Copy,
  ChevronDown
} from 'lucide-react';

const getApiUrl = (endpoint) => {
  const base = import.meta.env.VITE_API_URL || 'https://backend-sand-nine-13.vercel.app';
  return `${base.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
};

const DEFAULT_TERMS_TEMPLATE = `1. Check-in & Check-out:
• Check-in time is from 02:00 PM onwards. Early check-in is subject to room availability.
• Check-out time is strictly 11:00 AM. Late check-out may incur additional hourly charges.

2. Identification Requirements:
• As per local administration rules, all guests must produce a valid government-approved Photo ID (Aadhaar, Passport, Driving License) at the time of check-in. PAN Cards are not accepted as address proof.

3. Property Decor & Conduct:
• Please maintain peace and tranquility in the neighbourhood after 10:00 PM.
• Smoking is strictly prohibited inside the bedrooms. Designated smoking zones are provided in balconies/gardens.
• Consumption of illegal substances or narcotics is strictly banned on property premises.

4. Damages & Breakages:
• Any damage to property linen, fixtures, electronics, or furniture caused during the stay will be charged directly to the guest before departure.

5. Meals & Dining:
• Breakfast is served between 08:00 AM and 10:00 AM.
• Dinner orders must be placed before 06:00 PM to allow fresh sourcing and preparation.

6. Cancellation & Refunds:
• Cancellations requested 7 days prior to check-in receive an 80% refund of advance paid.
• Cancellations within 48 hours of check-in or no-shows are strictly non-refundable.`;

export default function TermsAndConditions() {
  const [propertiesList, setPropertiesList] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [termsText, setTermsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const getAuthToken = () => {
    return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await axios.get(getApiUrl('/api/homestay-owner/properties'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = res.data?.properties || (Array.isArray(res.data) ? res.data : []);
      setPropertiesList(list);

      const savedId = localStorage.getItem('wow_homestay_selected_property');
      const target = list.find(p => p._id === savedId) || list[0];
      if (target) {
        setSelectedPropertyId(target._id);
        setSelectedProperty(target);
        await loadTermsForProperty(target._id);
      }
    } catch (err) {
      console.error('Failed to load properties for terms:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTermsForProperty = async (propId) => {
    try {
      const res = await axios.get(getApiUrl(`/api/homestay-owner/properties/${propId}/terms`));
      if (res.data?.termsAndConditions) {
        setTermsText(res.data.termsAndConditions);
      } else {
        setTermsText(DEFAULT_TERMS_TEMPLATE);
      }
    } catch (err) {
      console.error('Failed to load terms:', err);
      setTermsText(DEFAULT_TERMS_TEMPLATE);
    }
  };

  const handlePropertyChange = async (e) => {
    const id = e.target.value;
    setSelectedPropertyId(id);
    const p = propertiesList.find(item => item._id === id);
    setSelectedProperty(p);
    localStorage.setItem('wow_homestay_selected_property', id);
    await loadTermsForProperty(id);
  };

  const handleSaveTerms = async () => {
    if (!selectedPropertyId) return;
    try {
      setSaving(true);
      const token = getAuthToken();
      await axios.put(
        getApiUrl(`/api/homestay-owner/properties/${selectedPropertyId}/terms`),
        { termsAndConditions: termsText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Swal.fire({
        icon: 'success',
        title: 'Terms & Conditions Saved',
        text: `Terms and conditions for "${selectedProperty?.name}" have been saved and will now appear on all guest booking links and documents.`,
        confirmButtonColor: '#e11d48'
      });
    } catch (err) {
      console.error('Failed to save terms:', err);
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.response?.data?.message || 'Could not save terms and conditions.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/terms/${selectedPropertyId}`;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-500">
        <RefreshCw size={24} className="animate-spin text-rose-600" />
        <span className="text-xs font-bold uppercase tracking-wider">Loading Terms & Conditions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-16 max-w-5xl mx-auto px-2 sm:px-4">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200/90 p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-600">
            <ScrollText size={20} className="stroke-[2.5]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Policy Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none m-0">
            Homestay Terms & Conditions
          </h1>
          <p className="text-xs font-semibold text-slate-400 m-0 mt-1">
            Maintain property-specific stay policies, check-in rules, and cancellation terms separate for each homestay.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border-none transition-all"
          >
            <Eye size={14} />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={handleSaveTerms}
            disabled={saving}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-md shadow-rose-200 transition-all"
          >
            <Save size={14} className="stroke-[3]" />
            <span>{saving ? 'Saving...' : 'Save Terms'}</span>
          </button>
        </div>
      </div>

      {/* Property Selector Bar */}
      <div className="bg-white border border-slate-200/80 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Building2 size={18} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Active Homestay</span>
            <div className="relative mt-0.5">
              <select
                value={selectedPropertyId || ''}
                onChange={handlePropertyChange}
                className="appearance-none pr-8 text-sm font-black text-slate-900 bg-transparent border-none cursor-pointer focus:outline-none"
              >
                {propertiesList.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.city || 'Kurseong'})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyLink}
          className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer p-0"
        >
          <Copy size={13} />
          <span>{copied ? 'Copied Public Terms Link!' : 'Copy Public Terms Link'}</span>
        </button>
      </div>

      {/* Editor Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider m-0">
              Custom Terms for {selectedProperty?.name}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium m-0 mt-0.5">
              These terms will replace generic static text and link directly from confirmation slips, invoices, and quotations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTermsText(DEFAULT_TERMS_TEMPLATE)}
            className="text-[11px] font-bold text-slate-500 hover:text-rose-600 bg-transparent border-none cursor-pointer p-0"
          >
            Reset to Standard Template
          </button>
        </div>

        <textarea
          rows={14}
          value={termsText}
          onChange={(e) => setTermsText(e.target.value)}
          placeholder="Enter detailed Terms and Conditions for this homestay..."
          className="w-full p-4 bg-slate-50/60 border border-slate-200 rounded-2xl text-xs font-mono font-medium text-slate-800 leading-relaxed focus:outline-none focus:bg-white focus:border-rose-500 transition-all resize-y"
        />

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
          <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
            <ShieldCheck size={14} />
            <span>Shown on guest booking confirmation slips & invoices via "Read Homestay Terms & Conditions" link</span>
          </div>
          <span className="font-mono">{termsText.length} characters</span>
        </div>
      </div>

      {/* Guest-Facing Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ScrollText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight m-0">
                    {selectedProperty?.name} — Terms & Conditions
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold">Guest Document View</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border-none cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
              {termsText}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl border-none cursor-pointer shadow-sm"
              >
                Looks Good
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
