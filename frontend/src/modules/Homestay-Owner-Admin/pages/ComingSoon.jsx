import React from 'react';
import { Compass } from 'lucide-react';

export default function ComingSoon() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 select-none font-sans">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
          <Compass size={40} className="stroke-[1.5]" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-100 font-bold">Homestay Owner Admin</h1>
          <p className="text-sm font-semibold text-slate-400">Coming Soon...</p>
        </div>
        <div className="p-5 bg-slate-800/40 border border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-400 leading-relaxed">
            UI screens will be integrated next. Please stay tuned for updates.
          </p>
        </div>
      </div>
    </div>
  );
}
