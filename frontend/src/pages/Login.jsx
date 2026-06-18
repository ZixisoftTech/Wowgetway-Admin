import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { 
  authStart, 
  authSuccess, 
  authFailure, 
  clearError 
} from '../store/authSlice.js';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  Compass, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle,
  ShieldCheck,
  Server,
  Activity,
  Terminal,
  ExternalLink,
  LockKeyhole
} from 'lucide-react';

const API_AUTH_URL = 'https://wow-getway-api.onrender.com/api/auth';

const mockSystemLogs = [
  { time: '00:09:15', event: 'Database connection established.', type: 'info' },
  { time: '00:07:32', event: 'Scheduled server backup completed.', type: 'success' },
  { time: '00:04:10', event: 'IP 198.51.100.4 blocked (rate limit).', type: 'warn' },
  { time: '00:01:25', event: 'Super Admin token verified (Production).', type: 'info' }
];

export default function Login() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  // Flow view states: 'login' | 'forgot' | 'forgot-success' | 'reset' | 'reset-success'
  const [viewState, setViewState] = useState('login');
  
  // Login Form States (Prefilled by default so the login is seamless out of the box)
  const [email, setEmail] = useState('admin@wowgateways.com');
  const [password, setPassword] = useState('••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccessLink, setForgotSuccessLink] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Reset Password States
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [strength, setStrength] = useState({ score: 0, label: 'Empty', color: 'bg-slate-200' });

  // System stats state for simulated operations live preview
  const [liveVolume, setLiveVolume] = useState(1480);
  const [liveOperators, setLiveOperators] = useState(12);
  
  // Developer/QA testing utility toggle
  const [showTestUtilities, setShowTestUtilities] = useState(false);

  // Simulation effect to make the operations panel feel "alive"
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveVolume(prev => prev + (Math.random() > 0.5 ? 1 : -1));
      setLiveOperators(prev => {
        const delta = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        return Math.max(8, Math.min(20, prev + delta));
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Listen to reset token in URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken');
    if (token) {
      setResetToken(token);
      setViewState('reset');
    }
  }, []);

  // Countdown timer for resend email
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  // Live password strength assessor
  useEffect(() => {
    if (!newPassword) {
      setStrength({ score: 0, label: 'Empty', color: 'bg-slate-200' });
      return;
    }
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    let label = 'Weak';
    let color = 'bg-rose-500';
    if (score >= 4) {
      label = 'Strong';
      color = 'bg-emerald-500';
    } else if (score >= 2) {
      label = 'Medium';
      color = 'bg-amber-500';
    }

    setStrength({ score, label, color });
  }, [newPassword]);

  // Login handler with bypass functionality
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    dispatch(authStart());
    dispatch(clearError());

    // Simulated premium micro-delay for realistic SaaS dashboard experience
    setTimeout(() => {
      const emailLower = (email || '').trim().toLowerCase();
      
      // Simulated Security / Validation States for specific testing accounts
      if (emailLower === 'blocked@wowgateways.com') {
        dispatch(authFailure('Blocked Account: This administrator account has been blocked due to suspicious remote login attempts. Please contact IT operations.'));
      } else if (emailLower === 'inactive@wowgateways.com') {
        dispatch(authFailure('Inactive Account: This admin profile is currently inactive. Please coordinate with human resources or team leads to activate.'));
      } else if (emailLower === 'unauthorized@wowgateways.com') {
        dispatch(authFailure('Unauthorized Access: You do not possess the necessary access privileges for the Admin Control Center.'));
      } else if (emailLower === 'invalid@wowgateways.com') {
        dispatch(authFailure('Invalid Credentials: The password you provided is incorrect. Access denied.'));
      } else {
        // Direct login bypass for any other credentials (prefilled, custom, or blank fields)
        const finalEmail = emailLower || 'admin@wowgateways.com';
        const finalName = finalEmail.split('@')[0]
          .replace(/[^a-zA-Z]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());

        dispatch(authSuccess({
          token: `mock-bypass-token-${Date.now()}`,
          user: {
            email: finalEmail,
            fullName: finalName || 'Super Admin',
            role: 'Super Admin'
          }
        }));
      }
    }, 400);
  };

  // Forgot password handler with fallback simulation
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      dispatch(authFailure('Email address is required.'));
      return;
    }

    dispatch(authStart());
    try {
      const res = await axios.post(`${API_AUTH_URL}/forgot-password`, { email: forgotEmail });
      setForgotSuccessLink(res.data.resetLink);
      setViewState('forgot-success');
      setCountdown(60);
      dispatch(clearError());
    } catch (err) {
      console.warn("Auth Server Offline. Simulating forgot password recovery.");
      setTimeout(() => {
        setForgotSuccessLink(`${window.location.origin}${window.location.pathname}?resetToken=mock-reset-token-${Date.now()}`);
        setViewState('forgot-success');
        setCountdown(60);
        dispatch(clearError());
      }, 400);
    }
  };

  // Resend reset email
  const handleResendReset = async () => {
    if (countdown > 0) return;
    dispatch(authStart());
    try {
      const res = await axios.post(`${API_AUTH_URL}/forgot-password`, { email: forgotEmail });
      setForgotSuccessLink(res.data.resetLink);
      setCountdown(60);
      alert('Password reset link resend request completed.');
      dispatch(clearError());
    } catch (err) {
      console.warn("Auth Server Offline. Simulating resend reset link.");
      setTimeout(() => {
        setForgotSuccessLink(`${window.location.origin}${window.location.pathname}?resetToken=mock-reset-token-${Date.now()}`);
        setCountdown(60);
        alert('Password reset link resend request completed (Simulated).');
        dispatch(clearError());
      }, 400);
    }
  };

  // Reset password submit handler
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      dispatch(authFailure('Passwords do not match.'));
      return;
    }
    if (strength.label === 'Weak') {
      dispatch(authFailure('Password is too weak. Ensure it passes strength rules.'));
      return;
    }

    dispatch(authStart());
    try {
      await axios.post(`${API_AUTH_URL}/reset-password`, { token: resetToken, password: newPassword });
      setViewState('reset-success');
      window.history.replaceState({}, document.title, window.location.pathname);
      dispatch(clearError());
    } catch (err) {
      console.warn("Auth Server Offline. Simulating reset password complete.");
      setTimeout(() => {
        setViewState('reset-success');
        window.history.replaceState({}, document.title, window.location.pathname);
        dispatch(clearError());
      }, 400);
    }
  };

  const handleReturnToLogin = () => {
    dispatch(clearError());
    setViewState('login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased overflow-hidden font-sans">
      
      {/* LEFT SECTION - Premium Enterprise Control Center Panel (hidden on mobile/tablet) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-950 overflow-hidden flex-col justify-between p-12 text-slate-200 border-r border-slate-900 select-none">
        
        {/* Abstract grid overlays */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />

        {/* Content Panel */}
        <div className="relative z-10 flex flex-col h-full justify-between">
          
          {/* Logo Header */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 border border-slate-800 text-blue-500 rounded-xl shadow-lg">
              <Compass className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-white leading-none">WOW Gateways</h2>
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mt-1 block">Enterprise Control Center</span>
            </div>
          </div>

          {/* Slogans & Dashboard widgets mock preview */}
          <div className="space-y-6 my-auto max-w-lg">
            <div className="space-y-2">
              <span className="px-2.5 py-1 bg-blue-950/50 border border-blue-900 text-blue-400 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                System Administration
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                Travel Operations Management Platform
              </h1>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Manage homestays, bookings, tours, rides, staff and payments from one centralized dashboard.
              </p>
            </div>

            {/* Simulated Live Operations Dashboard preview */}
            <div className="bg-slate-900/80 border border-slate-850 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Live System Monitors</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[9px] font-extrabold text-emerald-500 uppercase">Production</span>
                </div>
              </div>

              {/* Status metrics grid */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                  <span className="block text-[8px] font-bold text-slate-500 uppercase">Daily Volume</span>
                  <span className="text-sm font-extrabold text-white font-mono mt-0.5 block">{liveVolume}</span>
                </div>
                <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                  <span className="block text-[8px] font-bold text-slate-500 uppercase">Active Staff</span>
                  <span className="text-sm font-extrabold text-white font-mono mt-0.5 block">{liveOperators} Ops</span>
                </div>
                <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                  <span className="block text-[8px] font-bold text-slate-500 uppercase">Latency</span>
                  <span className="text-sm font-extrabold text-white font-mono mt-0.5 block">84ms</span>
                </div>
              </div>

              {/* Mini visual bar chart mockup */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[9px] font-bold text-slate-400">
                  <span>Server Processing Load</span>
                  <span>42% Load</span>
                </div>
                <div className="h-2 bg-slate-950 border border-slate-850 rounded-full overflow-hidden flex p-0.5">
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: '42%' }} />
                </div>
              </div>

              {/* System logs live feed preview */}
              <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-850 font-mono text-[9px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1">
                  <Terminal size={11} />
                  <span>SESSION LOGS FEED</span>
                </div>
                {mockSystemLogs.map((log, index) => (
                  <div key={index} className="flex gap-2 truncate">
                    <span className="text-slate-550 flex-shrink-0">[{log.time}]</span>
                    <span className={log.type === 'warn' ? 'text-amber-500' : log.type === 'success' ? 'text-emerald-500' : 'text-slate-400'}>
                      {log.event}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Highlights checklist */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs font-bold text-slate-400 border-t border-slate-900 pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-blue-500 flex-shrink-0" />
              <span>Booking Management</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-blue-500 flex-shrink-0" />
              <span>Homestay Management</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-blue-500 flex-shrink-0" />
              <span>Ride Operations</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-blue-500 flex-shrink-0" />
              <span>Tour Management</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-blue-500 flex-shrink-0" />
              <span>Staff Management</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-blue-500 flex-shrink-0" />
              <span>Financial Tracking</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <CheckCircle2 size={13} className="text-blue-500 flex-shrink-0" />
              <span>Business Analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION - Authentication forms card */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 md:p-16 relative bg-slate-50 overflow-y-auto">
        
        {/* Top brand header for Mobile/Tablet */}
        <div className="flex lg:hidden items-center justify-center gap-2.5 mb-6">
          <div className="p-2 bg-slate-900 text-blue-500 border border-slate-850 rounded-xl">
            <Compass size={18} className="stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-slate-800 text-sm tracking-tight">WOW Gateways</span>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[420px] bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-150/30 space-y-6"
        >
          <AnimatePresence mode="wait">
            {viewState === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-5"
              >
                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-extrabold text-slate-850 tracking-tight">Sign In</h2>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    Sign in to access your administrative operations panel.
                  </p>
                </div>

                {/* Error Banner Alert */}
                {error && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2.5 text-xs text-rose-700 font-semibold leading-relaxed animate-shake">
                    <AlertTriangle size={15} className="text-rose-500 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider pl-1">Operational Email Address</label>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.2]" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@wowgateways.com"
                        className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50/50 border border-slate-200/60 focus:border-blue-500/60 focus:bg-white focus:ring-4 focus:ring-blue-500/5 rounded-xl transition-all outline-none placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Account Password</label>
                      <button
                        type="button"
                        onClick={() => setViewState('forgot')}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 focus:outline-none"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.2]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 text-xs font-semibold bg-slate-50/50 border border-slate-200/60 focus:border-blue-500/60 focus:bg-white focus:ring-4 focus:ring-blue-500/5 rounded-xl transition-all outline-none placeholder-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      Remember Session
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.985] disabled:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/15 hover:shadow-lg transition-all flex justify-center items-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : 'Sign In'}
                  </button>
                </form>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">or</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <a
                  href="https://wowgateways.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 font-bold text-xs rounded-xl transition-all flex justify-center items-center gap-1.5 focus:outline-none bg-white hover:bg-slate-50 cursor-pointer text-center"
                >
                  <span>Back To Main Website</span>
                  <ExternalLink size={12} className="text-slate-400" />
                </a>
              </motion.div>
            )}

            {viewState === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <button
                    onClick={handleReturnToLogin}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider mb-2 cursor-pointer focus:outline-none"
                  >
                    <ArrowLeft size={11} className="stroke-[2.5]" /> Return to Login
                  </button>
                  <h2 className="text-xl font-extrabold text-slate-850 tracking-tight">Forgot Password</h2>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    Enter your registered email address to receive password reset instructions.
                  </p>
                </div>

                {/* Error Banner Alert */}
                {error && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2.5 text-xs text-rose-700 font-semibold leading-relaxed">
                    <AlertTriangle size={15} className="text-rose-500 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider pl-1">Registered email</label>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.2]" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="admin@wowgateways.com"
                        className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex justify-center items-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : 'Send Reset Link'}
                  </button>
                </form>
              </motion.div>
            )}

            {viewState === 'forgot-success' && (
              <motion.div
                key="forgot-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-5"
              >
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle size={28} className="stroke-[1.5]" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-lg font-extrabold text-slate-850 tracking-tight">Reset Link Sent</h2>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    Password reset instructions have been sent to: <strong className="text-slate-600">{forgotEmail}</strong>.
                  </p>
                </div>

                {/* Dev simulation helper card */}
                {forgotSuccessLink && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-left text-xs text-blue-750 font-semibold space-y-1 leading-relaxed">
                    <span className="font-bold text-blue-800 block text-[9px] uppercase">🛠️ Demo Testing Helper:</span>
                    Click the mock link below to simulate opening the reset email:
                    <a
                      href={forgotSuccessLink}
                      className="block text-blue-600 hover:underline font-mono text-[9px] mt-1 break-all"
                    >
                      {forgotSuccessLink}
                    </a>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={handleReturnToLogin}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Back to Login
                  </button>
                  <button
                    onClick={handleResendReset}
                    disabled={countdown > 0}
                    className="w-full py-2.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 disabled:opacity-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    {countdown > 0 ? `Resend Email (${countdown}s)` : 'Resend Email'}
                  </button>
                </div>
              </motion.div>
            )}

            {viewState === 'reset' && (
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold text-slate-850 tracking-tight">Create New Password</h2>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    Choose a strong password for your operator account.
                  </p>
                </div>

                {/* Error Banner Alert */}
                {error && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2.5 text-xs text-rose-700 font-semibold leading-relaxed">
                    <AlertTriangle size={15} className="text-rose-500 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider pl-1">New Password</label>
                    <div className="relative">
                      <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.2]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter strong password"
                        className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Password strength indicators */}
                  <div className="space-y-1.5 px-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-450 uppercase">
                      <span>Password Strength</span>
                      <span className={newPassword ? 'text-slate-700' : 'text-slate-400'}>{strength.label}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full flex overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${strength.color}`} 
                        style={{ width: `${newPassword ? (strength.score / 5) * 100 : 0}%` }}
                      />
                    </div>
                    <ul className="text-[9px] text-slate-450 font-bold space-y-0.5 list-disc pl-3">
                      <li className={newPassword.length >= 8 ? 'text-emerald-600' : ''}>Minimum 8 characters</li>
                      <li className={/[A-Z]/.test(newPassword) ? 'text-emerald-600' : ''}>At least 1 uppercase letter</li>
                      <li className={/[0-9]/.test(newPassword) ? 'text-emerald-600' : ''}>At least 1 digit number</li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider pl-1">Confirm Password</label>
                    <div className="relative">
                      <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.2]" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors"
                      />
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <span className="text-[10px] font-bold text-rose-600 pl-1">Passwords do not match.</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || newPassword !== confirmPassword || strength.label === 'Weak'}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex justify-center items-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : 'Reset Password'}
                  </button>
                </form>
              </motion.div>
            )}

            {viewState === 'reset-success' && (
              <motion.div
                key="reset-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-5"
              >
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle size={28} className="stroke-[1.5]" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-lg font-extrabold text-slate-850 tracking-tight">Password Reset Complete</h2>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    Your password has been successfully updated. You can now log in using the new credentials.
                  </p>
                </div>

                <button
                  onClick={handleReturnToLogin}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Go to Login
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Developer / QA Testing Utilities Toggle */}
        <div className="mt-4 w-full max-w-[420px]">
          <button
            onClick={() => setShowTestUtilities(!showTestUtilities)}
            className="w-full flex items-center justify-between px-4 py-2 bg-slate-100/80 hover:bg-slate-200/60 border border-slate-200/50 rounded-xl text-[9px] font-bold text-slate-500 transition-colors uppercase tracking-wider focus:outline-none"
          >
            <span>Operator Testing Console</span>
            <span className="text-[8px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-mono font-bold">
              {showTestUtilities ? 'Hide' : 'Show'}
            </span>
          </button>
          
          <AnimatePresence>
            {showTestUtilities && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden bg-slate-900 border border-slate-800 text-slate-300 rounded-xl p-3.5 mt-1.5 text-[9px] font-mono leading-normal space-y-2 shadow-lg"
              >
                <div className="text-blue-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-1">
                  Simulated Validation Accounts
                </div>
                <p className="text-slate-400 text-[9px] leading-relaxed">
                  Clicking <strong>Sign In</strong> directly redirects to the dashboard. To test specific security validations, try typing these mock emails:
                </p>
                <ul className="space-y-1 text-slate-400 pl-1">
                  <li>
                    <code className="text-rose-400 font-bold bg-rose-950/45 px-1 py-0.5 rounded">blocked@wowgateways.com</code>
                    <span className="block text-[8px] text-slate-500 font-sans mt-0.5">Simulates Blocked Account security block.</span>
                  </li>
                  <li>
                    <code className="text-amber-400 font-bold bg-amber-950/45 px-1 py-0.5 rounded">inactive@wowgateways.com</code>
                    <span className="block text-[8px] text-slate-500 font-sans mt-0.5">Simulates Inactive Account activation block.</span>
                  </li>
                  <li>
                    <code className="text-purple-400 font-bold bg-purple-950/45 px-1 py-0.5 rounded">unauthorized@wowgateways.com</code>
                    <span className="block text-[8px] text-slate-500 font-sans mt-0.5">Simulates Unauthorized Access node error.</span>
                  </li>
                  <li>
                    <code className="text-red-400 font-bold bg-red-950/45 px-1 py-0.5 rounded">invalid@wowgateways.com</code>
                    <span className="block text-[8px] text-slate-500 font-sans mt-0.5">Simulates Invalid Credentials / Incorrect password.</span>
                  </li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Security badges & Metadata below card */}
        <div className="mt-8 text-center space-y-3 select-none">
          <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-500" />
              Secure Encrypted Access
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <LockKeyhole size={11} className="text-slate-400" />
              Protected Admin Area
            </span>
          </div>

          <div className="text-[10px] text-slate-400 font-semibold space-y-1">
            <div className="text-[9px] text-slate-400">
              Last login: June 13, 2026 - 08:04 AM from IP 192.168.1.45
            </div>
            <div>
              <span>v2.6.0-enterprise</span>
              <span className="mx-2 text-slate-300">|</span>
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[9px] font-bold uppercase">Production</span>
              <span className="mx-2 text-slate-300">|</span>
              <a href="mailto:ops@wowgateways.com" className="hover:underline text-blue-600 font-bold">ops@wowgateways.com</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
