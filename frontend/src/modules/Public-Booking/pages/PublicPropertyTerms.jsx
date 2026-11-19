import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ScrollText, ArrowLeft, ShieldCheck, Building2, Printer } from 'lucide-react';

const getApiUrl = (endpoint) => {
  const base = import.meta.env.VITE_API_URL || 'https://backend-sand-nine-13.vercel.app';
  return `${base.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
};

export default function PublicPropertyTerms() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setLoading(true);
        const res = await axios.get(getApiUrl(`/api/public/properties/${propertyId}/terms`));
        setData(res.data);
      } catch (err) {
        console.error('Failed to load terms:', err);
      } finally {
        setLoading(false);
      }
    };
    if (propertyId) fetchTerms();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 font-sans text-slate-800">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : window.close()}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-transparent border-none cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 hover:bg-rose-100 cursor-pointer"
          >
            <Printer size={13} />
            <span>Print Terms</span>
          </button>
        </div>

        {/* Document Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <ScrollText size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Property Policy Document</span>
              <h1 className="text-xl font-black text-slate-900 m-0">
                {data?.propertyName || 'Homestay'} — Terms & Conditions
              </h1>
            </div>
          </div>

          <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
            {data?.termsAndConditions || 'No specific terms and conditions uploaded for this property yet.'}
          </div>

          <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
              <ShieldCheck size={14} />
              <span>Official Homestay Policy</span>
            </div>
            <span>WOW Gateways Hospitality Network</span>
          </div>
        </div>

      </div>
    </div>
  );
}
