import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  ChevronLeft, 
  RefreshCw, 
  AlertTriangle, 
  KeyRound, 
  UserCheck 
} from 'lucide-react';
import { 
  authStart, 
  authSuccess, 
  authFailure, 
  clearError 
} from '../store/homestayOwnerAuthSlice.js';

const API_AUTH_URL = (window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app') + '/api/homestay-owner/auth';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error } = useSelector((state) => state.homestayOwnerAuth);

  // Determine active view state based on URL path
  const [viewState, setViewState] = useState('login'); // 'login' | 'forgot' | 'verify-otp' | 'reset'

  // Login Form States (defaulting to seed data)
  const [email, setEmail] = useState('amit.sharma@example.com');
  const [password, setPassword] = useState('Owner@123');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Reset Password States
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [strength, setStrength] = useState({ score: 0, label: 'Empty', color: 'bg-slate-200' });

  // Developer Testing Console Toggle
  const [showTestConsole, setShowTestConsole] = useState(false);

  // Dynamic ViewState mapping on path change
  useEffect(() => {
    const path = location.pathname;
    dispatch(clearError());

    if (path === '/homestay-owner/forgot-password') {
      setViewState('forgot');
    } else if (path === '/homestay-owner/verify-otp') {
      setViewState('verify-otp');
    } else if (path === '/homestay-owner/reset-password') {
      setViewState('reset');
    } else {
      setViewState('login');
    }
  }, [location.pathname, dispatch]);

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Track Password Strength
  useEffect(() => {
    if (!newPassword) {
      setStrength({ score: 0, label: 'Empty', color: 'bg-slate-200' });
      return;
    }
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[^\w\s]/.test(newPassword)) score++;

    let label = 'Weak';
    let color = 'bg-rose-500';
    if (score >= 5) {
      label = 'Excellent';
      color = 'bg-emerald-600';
    } else if (score >= 4) {
      label = 'Strong';
      color = 'bg-emerald-500';
    } else if (score >= 3) {
      label = 'Medium';
      color = 'bg-amber-500';
    } else if (score >= 2) {
      label = 'Very Weak';
      color = 'bg-rose-455';
    }

    setStrength({ score, label, color });
  }, [newPassword]);

  // 1. Submit Handlers
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      dispatch(authFailure('Email address and password are required.'));
      return;
    }

    dispatch(authStart());
    try {
      const res = await axios.post(`${API_AUTH_URL}/login`, { email, password });
      dispatch(authSuccess(res.data));
      navigate('/homestay-owner/dashboard');
    } catch (err) {
      console.error('[OwnerLogin] Error:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'Invalid email or password.';
      dispatch(authFailure(errMsg));
      Swal.fire({
        title: 'Login Failed',
        text: errMsg,
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      dispatch(authFailure('Please enter your registered email address.'));
      return;
    }

    dispatch(authStart());
    try {
      await axios.post(`${API_AUTH_URL}/forgot-password`, { email: forgotEmail });
      dispatch(clearError());
      setCountdown(60);
      Swal.fire({
        title: 'OTP Sent',
        text: 'Verification code sent to your registered email address.',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      }).then(() => {
        navigate('/homestay-owner/verify-otp');
      });
    } catch (err) {
      console.error('[OwnerLogin] Forgot Error:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'Email address not registered.';
      dispatch(authFailure(errMsg));
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      dispatch(authFailure('Verification OTP must be exactly 6 digits.'));
      return;
    }

    dispatch(authStart());
    try {
      const res = await axios.post(`${API_AUTH_URL}/verify-otp`, { email: forgotEmail, otp: otp.trim() });
      setResetToken(res.data.resetToken);
      dispatch(clearError());
      Swal.fire({
        title: 'OTP Verified',
        text: 'OTP verified successfully.',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      }).then(() => {
        navigate('/homestay-owner/reset-password');
      });
    } catch (err) {
      console.error('[OwnerLogin] Verify OTP Error:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'Invalid or expired OTP.';
      dispatch(authFailure(errMsg));
    }
  };

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
      await axios.post(`${API_AUTH_URL}/reset-password`, { token: resetToken, newPassword });
      dispatch(clearError());
      Swal.fire({
        title: 'Password Reset',
        text: 'Password updated successfully.',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      }).then(() => {
        navigate('/homestay-owner/login');
      });
    } catch (err) {
      console.error('[OwnerLogin] Reset Password Error:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'Could not reset password.';
      dispatch(authFailure(errMsg));
    }
  };

  const triggerResendOtp = async () => {
    if (countdown > 0) return;
    dispatch(authStart());
    try {
      await axios.post(`${API_AUTH_URL}/forgot-password`, { email: forgotEmail });
      dispatch(clearError());
      setCountdown(60);
      Swal.fire({
        title: 'OTP Sent',
        text: 'A new 6-digit OTP code has been sent to your email.',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      });
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to dispatch new OTP code.';
      dispatch(authFailure(errMsg));
    }
  };

  const layoutVariants = {
    hidden: { opacity: 0, scale: 0.97 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex select-none font-sans overflow-hidden">
      {/* 1. Left side Promo Graphics Banner */}
      <div className="hidden lg:block lg:w-7/12 relative bg-slate-950">
        <img 
          src="/homestay_promo.jpg" 
          alt="Luxury Resort Promos" 
          className="absolute inset-0 w-full h-full object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/30 to-transparent" />
        
        <div className="absolute bottom-12 left-12 right-12 max-w-lg bg-white/95 backdrop-blur-md p-7 rounded-3xl border-l-4 border-rose-600 shadow-2xl space-y-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-rose-600 block">
            Wow Gateways Platform
          </span>
          <h2 className="text-lg font-black text-slate-800 tracking-tight leading-snug">
            Partner Portal Dashboard for Homestay Owners.
          </h2>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Manage your daily operations, room inventories, guest lists, and payout ledgers with maximum security.
          </p>
        </div>
      </div>

      {/* 2. Right side Unified Forms Container */}
      <div className="w-full lg:w-5/12 flex flex-col justify-between p-8 sm:p-12 md:p-16 bg-white relative overflow-y-auto">
        
        <div className="my-auto max-w-md w-full mx-auto space-y-6 sm:space-y-8">
          {/* Logo Brand Header */}
          <div className="space-y-2.5">
            <img src="/logo.png" alt="WOW Gateways Logo" className="h-9 object-contain block" />
            <div className="h-0.5 w-10 bg-rose-500 rounded-full" />
          </div>

          <AnimatePresence mode="wait">
            {/* View State: LOGIN */}
            {viewState === 'login' && (
              <motion.div key="login" variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
                <div className="space-y-1">
                  <h1 className="text-2xl font-black tracking-tight text-slate-850">Partner Login</h1>
                  <p className="text-xs font-semibold text-slate-400">Enter your credentials to manage your properties.</p>
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2.5 text-xs text-rose-700 font-semibold">
                    <AlertTriangle size={15} className="text-rose-500 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider pl-1">Email Address</label>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.2]" />
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="amit.sharma@example.com"
                        className="w-full pl-10 pr-4 py-3 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors shadow-sm text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center pl-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Password</label>
                      <button
                        type="button"
                        onClick={() => navigate('/homestay-owner/forgot-password')}
                        className="text-[10px] font-black text-rose-600 uppercase tracking-wider hover:underline bg-transparent border-none cursor-pointer"
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
                        className="w-full pl-10 pr-10 py-3 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors shadow-sm text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-none"
                      >
                        {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider border-none disabled:opacity-50"
                  >
                    {loading ? <RefreshCw size={13} className="animate-spin" /> : 'Log In'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* View State: FORGOT PASSWORD */}
            {viewState === 'forgot' && (
              <motion.div key="forgot" variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
                <button
                  onClick={() => navigate('/homestay-owner/login')}
                  className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                >
                  <ChevronLeft size={12} />
                  <span>Return to Login</span>
                </button>

                <div className="space-y-1">
                  <h1 className="text-2xl font-black tracking-tight text-slate-850">Forgot Password</h1>
                  <p className="text-xs font-semibold text-slate-400">
                    We'll email you a 6-digit verification code to reset your password.
                  </p>
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2.5 text-xs text-rose-700 font-semibold">
                    <AlertTriangle size={15} className="text-rose-500 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleForgotSubmit} className="space-y-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider pl-1">Email Address</label>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.2]" />
                      <input
                        type="text"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="owner@homestay.com"
                        className="w-full pl-10 pr-4 py-3 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors shadow-sm text-slate-700"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider border-none disabled:opacity-50"
                  >
                    {loading ? <RefreshCw size={13} className="animate-spin" /> : 'Send OTP code'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* View State: VERIFY OTP */}
            {viewState === 'verify-otp' && (
              <motion.div key="verify-otp" variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
                <button
                  onClick={() => navigate('/homestay-owner/forgot-password')}
                  className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                >
                  <ChevronLeft size={12} />
                  <span>Back to Email</span>
                </button>

                <div className="space-y-1">
                  <h1 className="text-2xl font-black tracking-tight text-slate-850">Verify OTP</h1>
                  <p className="text-xs font-semibold text-slate-400">
                    Enter the 6-digit OTP code sent to <strong className="text-slate-700">{forgotEmail}</strong>.
                  </p>
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2.5 text-xs text-rose-700 font-semibold">
                    <AlertTriangle size={15} className="text-rose-500 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyOtpSubmit} className="space-y-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider pl-1">One-Time Password (OTP)</label>
                    <div className="relative">
                      <KeyRound size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.2]" />
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="••••••"
                        maxLength={6}
                        className="w-full pl-10 pr-4 py-3 text-xs font-extrabold text-center tracking-[8px] bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors shadow-sm text-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider border-none disabled:opacity-50"
                  >
                    {loading ? <RefreshCw size={13} className="animate-spin" /> : 'Verify Code'}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      disabled={countdown > 0}
                      onClick={triggerResendOtp}
                      className="text-[10px] font-black uppercase tracking-wider text-rose-600 hover:text-rose-700 disabled:text-slate-400 disabled:opacity-60 bg-transparent border-none cursor-pointer"
                    >
                      {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP Code'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* View State: RESET PASSWORD */}
            {viewState === 'reset' && (
              <motion.div key="reset" variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
                <div className="space-y-1">
                  <h1 className="text-2xl font-black tracking-tight text-slate-850">Create New Password</h1>
                  <p className="text-xs font-semibold text-slate-400">Choose a strong, unique password for your account.</p>
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2.5 text-xs text-rose-700 font-semibold">
                    <AlertTriangle size={15} className="text-rose-500 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleResetSubmit} className="space-y-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider pl-1">New Password</label>
                    <div className="relative">
                      <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.2]" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter strong password"
                        className="w-full pl-10 pr-10 py-3 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors shadow-sm text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-none"
                      >
                        {showNewPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
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
                      <li className={/[^\w\s]/.test(newPassword) ? 'text-emerald-600' : ''}>At least 1 special character</li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider pl-1">Confirm Password</label>
                    <div className="relative">
                      <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.2]" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-10 py-3 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors shadow-sm text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-none"
                      >
                        {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <span className="text-[10px] font-bold text-rose-600 pl-1">Passwords do not match.</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || newPassword !== confirmPassword || strength.label === 'Weak'}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider border-none disabled:opacity-50"
                  >
                    {loading ? <RefreshCw size={13} className="animate-spin" /> : 'Reset Password'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Operator Testing Helper console */}
          <div className="border border-slate-100 rounded-2xl p-4.5 bg-slate-50/50 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Operator Testing Console</span>
              <button
                onClick={() => setShowTestConsole(!showTestConsole)}
                className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 tracking-wider bg-blue-50 px-2 py-1 rounded-md cursor-pointer border-none"
              >
                {showTestConsole ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showTestConsole && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-[10px] font-semibold text-slate-500 space-y-1.5 border-t border-slate-100 pt-3 leading-relaxed">
                <p>Use the default registered Active owner credentials below for instant verification:</p>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1 font-mono text-[9px] text-slate-700">
                  <p><strong>Email:</strong> amit.sharma@example.com</p>
                  <p><strong>Password:</strong> Owner@123</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Global Footer info bar */}
        <div className="mt-8 flex flex-wrap justify-between items-center text-[9px] font-bold text-slate-400 border-t border-slate-50 pt-5">
          <span>v2.6.0-enterprise</span>
          <span>Wow Gateways Partner Network</span>
        </div>
      </div>
    </div>
  );
}
