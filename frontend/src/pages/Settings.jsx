import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Sliders, 
  CreditCard, 
  ShieldAlert, 
  Mail, 
  Database,
  CheckCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('General');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // General settings state
  const [platformName, setPlatformName] = useState('WOW Gateways');
  const [supportEmail, setSupportEmail] = useState('ops@wowgateways.com');
  const [commissionRate, setCommissionRate] = useState(15);

  // Gateway toggles
  const [razorpayEnabled, setRazorpayEnabled] = useState(true);
  const [stripeEnabled, setStripeEnabled] = useState(false);

  // Security Toggles
  const [mfaRequired, setMfaRequired] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(30);

  const handleSave = (e) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <SettingsIcon size={22} />
            </span>
            System Settings
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Configure platform policies, set transaction rates, manage API key integrations, and toggle security controls.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Settings Tab Sidebar */}
        <div className="w-full lg:w-64 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm space-y-1">
          {[
            { id: 'General', label: 'General Parameters', icon: Sliders },
            { id: 'Gateways', label: 'Payment Gateways', icon: CreditCard },
            { id: 'Security', label: 'Security & Sessions', icon: ShieldAlert },
            { id: 'SMTP', label: 'SMTP Config', icon: Mail },
            { id: 'Backups', label: 'System Backups', icon: Database }
          ].map(tab => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                  isTabActive
                    ? 'bg-blue-50 text-blue-600 border border-blue-100/30'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon size={14} className={isTabActive ? 'text-blue-600' : 'text-slate-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Box */}
        <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            
            {activeTab === 'General' && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2">General Platform Parameters</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Platform Brand Name</label>
                    <input
                      type="text"
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Operations Support Email</label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 w-full md:w-1/2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                    required
                    min="1"
                    max="50"
                  />
                </div>
              </div>
            )}

            {activeTab === 'Gateways' && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2">Payment Gateway Settings</h3>
                
                <div className="space-y-4">
                  {/* Razorpay Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 block">Razorpay PG (Production Node)</span>
                      <span className="text-[10px] text-slate-400">Process domestic bookings transactions via Razorpay UPI & Cards API.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRazorpayEnabled(!razorpayEnabled)}
                      className="text-slate-400 hover:text-slate-655 focus:outline-none cursor-pointer"
                    >
                      {razorpayEnabled ? (
                        <ToggleRight size={36} className="text-blue-500" />
                      ) : (
                        <ToggleLeft size={36} className="text-slate-350" />
                      )}
                    </button>
                  </div>

                  {/* Stripe Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 block">Stripe PG (International Node)</span>
                      <span className="text-[10px] text-slate-400">Process global card bookings and multiple currencies.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStripeEnabled(!stripeEnabled)}
                      className="text-slate-400 hover:text-slate-655 focus:outline-none cursor-pointer"
                    >
                      {stripeEnabled ? (
                        <ToggleRight size={36} className="text-blue-500" />
                      ) : (
                        <ToggleLeft size={36} className="text-slate-350" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Security' && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2">Security Rules</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 block">Require 2FA for Staff Login</span>
                      <span className="text-[10px] text-slate-400">Enforce Multi-Factor Authentication via Google Authenticator or Email OTP.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMfaRequired(!mfaRequired)}
                      className="text-slate-400 hover:text-slate-655 focus:outline-none cursor-pointer"
                    >
                      {mfaRequired ? (
                        <ToggleRight size={36} className="text-blue-500" />
                      ) : (
                        <ToggleLeft size={36} className="text-slate-350" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5 w-full md:w-1/2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Session Inactivity Timeout (minutes)</label>
                    <input
                      type="number"
                      value={sessionTimeout}
                      onChange={(e) => setSessionTimeout(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'SMTP' && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2">SMTP Mail Server Config</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Outgoing SMTP Server</label>
                    <input
                      type="text"
                      defaultValue="smtp.mailgun.org"
                      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">SMTP Port</label>
                    <input
                      type="number"
                      defaultValue="587"
                      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Backups' && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2">Database Backup Policies</h3>
                
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-750 font-semibold space-y-1 leading-normal">
                  <span className="font-bold text-blue-800 block uppercase text-[9px]">ℹ️ Scheduled Tasks Active:</span>
                  Automatic backups are completed daily at 02:00 AM. Backups are stored in encrypted AWS S3 buckets (Production retention: 30 days).
                </div>
                
                <button
                  type="button"
                  onClick={() => alert('Manual database backup task scheduled. Status will log to system logs.')}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
                >
                  Trigger Manual Backup
                </button>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-6">
              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold animate-fade-in">
                    <CheckCircle size={14} /> Settings saved successfully!
                  </span>
                )}
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Save size={13} />
                Save Settings
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
}
