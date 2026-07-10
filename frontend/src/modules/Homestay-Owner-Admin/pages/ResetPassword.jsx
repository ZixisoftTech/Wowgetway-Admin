import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Password Strength Criteria
  const [strength, setStrength] = useState(0); // 0 to 5
  const [criteria, setCriteria] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false
  });

  useEffect(() => {
    const checks = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };

    setCriteria(checks);

    const score = Object.values(checks).filter(Boolean).length;
    setStrength(score);
  }, [password]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (strength < 5) {
      setError('Please satisfy all password security requirements.');
      return;
    }

    if (!confirmPassword) {
      setError('Please confirm your new password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Success action
    setSuccess('Password updated successfully.');
    setTimeout(() => {
      navigate('/auth/login', { state: { successMessage: 'Password updated successfully.' } });
    }, 2000);
  };

  const strengthLabels = ['Weak', 'Very Weak', 'Medium', 'Good', 'Strong', 'Excellent'];
  const strengthColors = [
    'bg-slate-200', 
    'bg-rose-500', 
    'bg-amber-500', 
    'bg-yellow-500', 
    'bg-emerald-500', 
    'bg-green-600'
  ];

  return (
    <div className="min-h-screen bg-white flex select-none font-sans overflow-hidden">
      {/* Left side Promo Image */}
      <div className="hidden lg:block lg:w-7/12 relative bg-slate-900">
        <img 
          src="/homestay_promo.jpg" 
          alt="Luxury Mountain Homestay Resort" 
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
        
        {/* Promotional Floating Card */}
        <div className="absolute bottom-12 left-12 right-12 max-w-lg bg-white/95 backdrop-blur-md p-6.5 rounded-3xl border-l-4 border-rose-600 shadow-2xl">
          <span className="text-[9px] font-black uppercase tracking-widest text-rose-600">
            Premium Management
          </span>
          <h2 className="text-xl font-black text-slate-800 mt-2 leading-snug">
            Elevate your hosting experience with precision data.
          </h2>
        </div>
      </div>

      {/* Right side form */}
      <div className="w-full lg:w-5/12 flex flex-col justify-between p-8 sm:p-12 md:p-16 bg-white relative">
        <div className="my-auto max-w-md w-full mx-auto space-y-7">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-1.5">
              <img src="/logo.png" alt="WOW Gateways Logo" className="h-9 object-contain" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-slate-800">Create New Password</h1>
              <p className="text-xs font-semibold text-slate-400">
                Setup a strong, secure password to protect your account.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-707 placeholder-slate-400 focus:outline-none focus:border-rose-600 transition-colors shadow-sm"
              />
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-slate-400">Password Strength:</span>
                  <span className={
                    strength <= 2 ? 'text-rose-500' : strength <= 4 ? 'text-amber-500' : 'text-emerald-600'
                  }>
                    {strengthLabels[strength]}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div 
                      key={step} 
                      className={`h-1.5 rounded-full transition-all ${
                        step <= strength ? strengthColors[strength] : 'bg-slate-100'
                      }`}
                    ></div>
                  ))}
                </div>
                {/* Requirements Checklist */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-[9px] font-bold text-slate-400">
                  <div className={criteria.length ? 'text-emerald-600' : 'text-slate-400'}>
                    {criteria.length ? '✓' : '○'} Min. 8 characters
                  </div>
                  <div className={criteria.upper ? 'text-emerald-600' : 'text-slate-400'}>
                    {criteria.upper ? '✓' : '○'} Uppercase letter
                  </div>
                  <div className={criteria.lower ? 'text-emerald-600' : 'text-slate-400'}>
                    {criteria.lower ? '✓' : '○'} Lowercase letter
                  </div>
                  <div className={criteria.number ? 'text-emerald-600' : 'text-slate-400'}>
                    {criteria.number ? '✓' : '○'} Numeric character
                  </div>
                  <div className={criteria.special ? 'text-emerald-600' : 'text-slate-400'}>
                    {criteria.special ? '✓' : '○'} Special character
                  </div>
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-707 placeholder-slate-400 focus:outline-none focus:border-rose-600 transition-colors shadow-sm"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-[11px] font-bold">
                ⚠️ {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-255 text-emerald-600 rounded-xl text-[11px] font-bold">
                ✓ {success}
              </div>
            )}

            {/* Submit & Back Buttons */}
            <div className="space-y-3">
              <button
                type="submit"
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100 uppercase tracking-wider"
              >
                Reset Password
              </button>
              
              <Link
                to="/auth/login"
                className="w-full py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-707 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white no-underline uppercase tracking-wider shadow-sm"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-wrap justify-between items-center text-[10px] font-bold text-slate-400 border-t border-slate-50 pt-6">
          <span>© 2024 Portal Homestays</span>
          <div className="flex gap-4">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-600">Privacy Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-600">Terms of Service</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-600">Help Center</a>
          </div>
        </div>
      </div>
    </div>
  );
}
