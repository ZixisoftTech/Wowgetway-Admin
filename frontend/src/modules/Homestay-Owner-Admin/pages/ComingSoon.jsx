import React from 'react';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ComingSoon({ title = 'Module' }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-slate-800 p-6 select-none font-sans">
      <div className="max-w-md w-full text-center space-y-5 bg-white border border-slate-100 p-8 rounded-3xl shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-[#D80032] border border-rose-100 flex items-center justify-center mx-auto shadow-xs">
          <Sparkles size={28} className="stroke-[2]" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-black tracking-tight text-slate-900">{title}</h1>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-[#D80032]">
            Coming Soon
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          This section is currently being configured and will be available in the next update.
        </p>
        <button
          onClick={() => navigate('/homestay-owner/dashboard')}
          className="px-5 py-2.5 bg-[#D80032] hover:bg-[#b00028] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 mx-auto cursor-pointer border-none shadow-sm transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Dashboard</span>
        </button>
      </div>
    </div>
  );
}
