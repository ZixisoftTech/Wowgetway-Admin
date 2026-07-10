import React, { useState } from 'react';
import { 
  BarChart4, 
  TrendingUp, 
  Map, 
  Users, 
  Download, 
  Calendar, 
  DollarSign, 
  ChevronRight,
  TrendingDown,
  Star,
  Activity
} from 'lucide-react';

const reportsData = {
  monthlyCommissions: [
    { month: 'Jan', amount: 84000, bookings: 140 },
    { month: 'Feb', amount: 96000, bookings: 160 },
    { month: 'Mar', amount: 128000, bookings: 210 },
    { month: 'Apr', amount: 144000, bookings: 240 },
    { month: 'May', amount: 198000, bookings: 310 },
    { month: 'Jun', amount: 245000, bookings: 380 }
  ],
  occupancyByRegion: [
    { region: 'Goa Coast', occupancy: '84%', growth: '+6.2%' },
    { region: 'Manali Valleys', occupancy: '78%', growth: '+4.5%' },
    { region: 'Munnar Hills', occupancy: '72%', growth: '+2.1%' },
    { region: 'Coorg Estates', occupancy: '68%', growth: '-1.5%' },
    { region: 'Rishikesh Retreats', occupancy: '61%', growth: '+8.0%' }
  ],
  customerRatings: [
    { category: 'Homestay Cleanliness', rating: 4.8, reviews: 1420 },
    { category: 'Rider Promptness', rating: 4.7, reviews: 980 },
    { category: 'Host Communication', rating: 4.9, reviews: 1420 },
    { category: 'Tour Guide Quality', rating: 4.6, reviews: 450 }
  ]
};

export default function Reports() {
  const [reportMonth, setReportMonth] = useState('June 2026');

  return (
    <div className="space-y-6 sm:space-y-8 select-none animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <BarChart4 size={22} />
            </span>
            Reports & Analytics
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Analyze occupancy rates, commissions margins, guest reviews, and operational service metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={reportMonth} 
            onChange={(e) => setReportMonth(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-350 cursor-pointer"
          >
            <option>June 2026</option>
            <option>May 2026</option>
            <option>April 2026</option>
          </select>
          <button
            onClick={() => alert('PDF report package download started.')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Download size={13} />
            Download PDF
          </button>
        </div>
      </div>

      {/* Analytics widgets row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Commission Growth Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Commission Reserves</h3>
            <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
              <TrendingUp size={11} className="stroke-[2.5]" />
              +14.2%
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-2xl font-extrabold text-slate-800 font-mono">₹ 2,45,000</span>
            <p className="text-[10px] text-slate-400 font-medium">Accumulated commissions for current cycle ({reportMonth})</p>
          </div>
          {/* Mini Spline bar chart mockup with pure HTML/CSS */}
          <div className="h-24 flex items-end gap-2 pt-2">
            {reportsData.monthlyCommissions.map((d, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                <div 
                  className="w-full bg-blue-500 hover:bg-blue-600 rounded-t-md transition-all relative"
                  style={{ height: `${(d.amount / 245000) * 80}%` }}
                >
                  {/* Tooltip */}
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    ₹ {(d.amount / 1000).toFixed(0)}k
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-400">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Occupancy by region Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Occupancy by Region</h3>
            <Map size={16} className="text-slate-400" />
          </div>
          
          <div className="space-y-3.5 pt-1">
            {reportsData.occupancyByRegion.map((reg, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700 font-bold">{reg.region}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-800 font-bold">{reg.occupancy}</span>
                    <span className={reg.growth.startsWith('+') ? 'text-emerald-500 font-bold text-[10px]' : 'text-rose-500 font-bold text-[10px]'}>
                      {reg.growth}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  <div 
                    className={`h-full rounded-full ${index % 2 === 0 ? 'bg-blue-500' : 'bg-purple-500'}`}
                    style={{ width: reg.occupancy }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer satisfaction Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quality Score Audits</h3>
            <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
              <Star size={13} className="text-amber-500 fill-amber-500" />
              4.75 Avg
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {reportsData.customerRatings.map((rat, index) => (
              <div key={index} className="flex items-center justify-between border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-750 block">{rat.category}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{rat.reviews} verified reviews</span>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-xl text-xs font-extrabold font-mono border border-amber-100">
                  <Star size={11} className="fill-amber-500 stroke-none" />
                  {rat.rating.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Logs Analysis Table */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="text-blue-500" size={16} />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gateway Operations Health Audit</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Showing last 24h metrics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Average Latency</span>
            <span className="text-lg font-extrabold text-slate-800 block font-mono">84.2 ms</span>
            <span className="text-[9px] font-bold text-emerald-500">✓ Within SLA limit</span>
          </div>
          <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Payout Dispatch Time</span>
            <span className="text-lg font-extrabold text-slate-800 block font-mono">4.2 hours</span>
            <span className="text-[9px] font-bold text-emerald-500">✓ Fast settlement</span>
          </div>
          <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Refund Processing</span>
            <span className="text-lg font-extrabold text-slate-800 block font-mono">1.8 hours</span>
            <span className="text-[9px] font-bold text-emerald-500">✓ Immediate credit</span>
          </div>
          <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Database Queries</span>
            <span className="text-lg font-extrabold text-slate-800 block font-mono">99.98% OK</span>
            <span className="text-[9px] font-bold text-emerald-500">✓ Low error index</span>
          </div>
        </div>
      </div>
    </div>
  );
}
