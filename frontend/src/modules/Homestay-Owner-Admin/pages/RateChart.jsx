import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Sliders } from 'lucide-react';

export default function RateChart() {
  const navigate = useNavigate();
  const { propertyId } = useParams();

  // Mock rates matrix structure
  const plans = ['EP', 'CP', 'MAP', 'AP'];
  const seasons = ['Regular Season', 'Peak Season', 'Off Season'];

  const roomsList = [
    { type: 'Deluxe Room', baseB2B: 2500, baseB2C: 3000 },
    { type: 'Super Deluxe', baseB2B: 3500, baseB2C: 4200 }
  ];

  // Helper function to calculate seasonal pricing
  const calculateRate = (base, plan, season, isB2B) => {
    let multiplier = 1.0;
    if (season === 'Peak Season') multiplier = 1.25; // 25% extra
    if (season === 'Off Season') multiplier = 0.85; // 15% discount

    let planAdd = 0;
    if (plan === 'CP') planAdd = isB2B ? 500 : 600;
    if (plan === 'MAP') planAdd = isB2B ? 1200 : 1500;
    if (plan === 'AP') planAdd = isB2B ? 2000 : 2500;

    return Math.round((base * multiplier) + planAdd);
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
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Seasonal Rate Chart</h1>
          <p className="text-[10px] font-semibold text-slate-400">
            View complete B2B & B2C rates matrix across room types, meals plans, and seasons.
          </p>
        </div>

        <button 
          onClick={() => alert('Saving modified rate chart...')}
          className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100 uppercase tracking-wider"
        >
          <Save size={13} />
          <span>Save Rates</span>
        </button>
      </div>

      {/* Seasonal Rate Matrix Cards */}
      {seasons.map((season) => (
        <div key={season} className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                season.includes('Peak') ? 'bg-rose-500' : season.includes('Off') ? 'bg-amber-500' : 'bg-emerald-500'
              }`}></span>
              <span>{season} Rates Matrix</span>
            </h3>
            <span className="text-[9px] font-bold text-slate-400">
              {season.includes('Peak') ? '+25% Surcharge' : season.includes('Off') ? '-15% Discount' : 'Base Rate Plan'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-4">Meal Plan</th>
                  {roomsList.map((room) => (
                    <React.Fragment key={room.type}>
                      <th className="py-2.5 px-4 text-center border-l border-slate-100">{room.type} (B2B)</th>
                      <th className="py-2.5 px-4 text-center text-rose-600 bg-rose-50/20">{room.type} (B2C)</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-707">
                {plans.map((plan) => (
                  <tr key={plan} className="hover:bg-slate-50/20 transition-colors">
                    <td className="py-3 px-4 font-black text-slate-800">{plan}</td>
                    {roomsList.map((room) => {
                      const rateB2B = calculateRate(room.baseB2B, plan, season, true);
                      const rateB2C = calculateRate(room.baseB2C, plan, season, false);
                      return (
                        <React.Fragment key={room.type}>
                          <td className="py-3 px-4 text-center font-mono border-l border-slate-100">
                            <input
                              type="number"
                              defaultValue={rateB2B}
                              className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-center font-bold text-slate-707 focus:outline-none"
                            />
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-rose-600 bg-rose-50/10">
                            <input
                              type="number"
                              defaultValue={rateB2C}
                              className="w-20 px-2 py-1 border border-rose-200 rounded-lg text-center font-bold text-rose-600 bg-rose-50/20 focus:outline-none"
                            />
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
