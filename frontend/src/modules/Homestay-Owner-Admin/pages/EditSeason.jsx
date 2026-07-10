import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Calendar } from 'lucide-react';

export default function EditSeason() {
  const navigate = useNavigate();
  const { propertyId } = useParams();

  // Mock season dates
  const [seasons, setSeasons] = useState({
    peak: {
      name: 'Peak Season',
      start: '2025-10-01',
      end: '2025-11-30',
      multiplier: '1.25'
    },
    off: {
      name: 'Off Season',
      start: '2025-06-01',
      end: '2025-08-31',
      multiplier: '0.85'
    },
    regular: {
      name: 'Regular Season',
      start: '2025-12-01',
      end: '2025-05-31',
      multiplier: '1.00'
    }
  });

  const [success, setSuccess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess('Season dates saved successfully!');
    setTimeout(() => {
      navigate(`/homestay-owner/inventory/property/${propertyId}`);
    }, 1500);
  };

  return (
    <div className="space-y-6 select-none font-sans pb-12">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 p-6 rounded-3xl shadow-sm gap-4">
        <div className="space-y-1">
          <button 
            onClick={() => navigate(`/homestay-owner/inventory/property/${propertyId}`)}
            className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-transparent border-none cursor-pointer hover:text-slate-600 mb-1 p-0"
          >
            <ArrowLeft size={12} className="stroke-[2.5]" />
            <span>Back to Property Details</span>
          </button>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Edit Season Dates</h1>
          <p className="text-[10px] font-semibold text-slate-400">
            Define start and end dates for pricing seasons to automatically adjust rates.
          </p>
        </div>
      </div>

      {/* Date Configuration Form */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Peak Season */}
          <div className="space-y-3.5 border-b border-slate-50 pb-5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>Peak Season Dates</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Start Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={seasons.peak.start}
                    onChange={(e) => setSeasons({
                      ...seasons,
                      peak: { ...seasons.peak, start: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold text-slate-707"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={seasons.peak.end}
                  onChange={(e) => setSeasons({
                    ...seasons,
                    peak: { ...seasons.peak, end: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold text-slate-707"
                />
              </div>
            </div>
          </div>

          {/* Off Season */}
          <div className="space-y-3.5 border-b border-slate-50 pb-5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Off Season Dates</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={seasons.off.start}
                  onChange={(e) => setSeasons({
                    ...seasons,
                    off: { ...seasons.off, start: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold text-slate-707"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={seasons.off.end}
                  onChange={(e) => setSeasons({
                    ...seasons,
                    off: { ...seasons.off, end: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold text-slate-707"
                />
              </div>
            </div>
          </div>

          {/* Regular Season */}
          <div className="space-y-3.5 pb-2">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Regular Season Dates</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={seasons.regular.start}
                  onChange={(e) => setSeasons({
                    ...seasons,
                    regular: { ...seasons.regular, start: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold text-slate-707"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={seasons.regular.end}
                  onChange={(e) => setSeasons({
                    ...seasons,
                    regular: { ...seasons.regular, end: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold text-slate-707"
                />
              </div>
            </div>
          </div>

          {/* Messages */}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-255 text-emerald-600 rounded-xl text-[11px] font-bold">
              ✓ {success}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => navigate(`/homestay-owner/inventory/property/${propertyId}`)}
              className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-707 font-bold rounded-2xl text-xs transition-colors cursor-pointer bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100 uppercase tracking-wider"
            >
              <Save size={13} />
              <span>Save Dates</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
