import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { 
  Crown, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  AlertCircle, 
  CreditCard, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw,
  Building2,
  Users,
  Home,
  X,
  QrCode
} from 'lucide-react';
import { authSuccess } from '../store/homestayOwnerAuthSlice.js';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getAuthToken = () => {
  return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
};

export default function ManageSubscription() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.homestayOwnerAuth.user);

  const [currentSub, setCurrentSub] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanForPurchase, setSelectedPlanForPurchase] = useState(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState('');

  const fetchData = async () => {
    const token = getAuthToken();
    try {
      setLoading(true);
      const [plansRes, currentRes] = await Promise.all([
        axios.get(getApiUrl('/api/homestay-owner/subscription-plans')),
        token ? axios.get(getApiUrl('/api/homestay-owner/subscription/current'), {
          headers: { Authorization: `Bearer ${token}` }
        }) : Promise.resolve({ data: { success: false } })
      ]);

      if (plansRes.data?.success) {
        setPlans(plansRes.data.data || []);
      }
      if (currentRes.data?.success) {
        setCurrentSub(currentRes.data.subscription || null);
      }
    } catch (err) {
      console.error('Error fetching subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenPurchase = (plan) => {
    setSelectedPlanForPurchase(plan);
    setTransactionId(`UPI-${Date.now().toString().slice(-6)}`);
    setPaymentSuccessMsg('');
    setPurchaseModalOpen(true);
  };

  const handleConfirmPurchase = async (e) => {
    e.preventDefault();
    if (!selectedPlanForPurchase) return;

    const token = getAuthToken();
    try {
      setPurchaseSubmitting(true);
      const res = await axios.post(
        getApiUrl('/api/homestay-owner/subscription/purchase'),
        {
          planId: selectedPlanForPurchase._id,
          paymentMethod: 'UPI',
          transactionId
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (res.data?.success) {
        setPaymentSuccessMsg(`Success! Your subscription to "${selectedPlanForPurchase.name}" is now active.`);
        setCurrentSub(res.data.subscription);
        
        // Update user state in Redux & localStorage
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            subscription: res.data.subscription
          };
          dispatch(authSuccess({ user: updatedUser, token }));
        }

        setTimeout(() => {
          setPurchaseModalOpen(false);
          setPaymentSuccessMsg('');
        }, 2000);
      }
    } catch (err) {
      console.error('Error completing purchase:', err);
      alert(err.response?.data?.message || 'Failed to activate plan. Please try again.');
    } finally {
      setPurchaseSubmitting(false);
    }
  };

  const isCurrentPlan = (plan) => {
    if (!currentSub) return false;
    return currentSub.planId === plan._id || currentSub.planName === plan.name;
  };

  const isExpired = currentSub?.isExpired || currentSub?.status === 'Expired';

  return (
    <div className="space-y-7 pb-16 select-none animate-fade-in font-sans">
      {/* Header Banner Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2">
              <Crown size={14} className="stroke-[2.5]" />
              <span>Membership & Access Tier</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0">
              Manage Your Subscription Plan
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1.5 max-w-2xl leading-relaxed">
              Unlock unlimited homestay listings, public booking calendars, automated financial invoicing, and advanced staff access roles.
            </p>
          </div>

          <button
            onClick={fetchData}
            className="p-3 bg-white/10 hover:bg-white/15 text-white rounded-2xl cursor-pointer border border-white/10 flex items-center justify-center transition-colors self-start md:self-center shrink-0"
            title="Refresh Status"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Subscription Alert Warning if Expired */}
      {isExpired && (
        <div className="p-5 bg-rose-50 border-2 border-rose-300 rounded-3xl flex items-start gap-4">
          <div className="p-2 bg-rose-600 text-white rounded-2xl shrink-0 mt-0.5">
            <AlertCircle size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-rose-900 m-0">Subscription Expired</h4>
            <p className="text-xs text-rose-700 font-medium mt-1 m-0 leading-relaxed">
              Your previous subscription plan or free trial has expired. Please select a plan below and renew your subscription to access all property management, booking requests, and calendar features.
            </p>
          </div>
        </div>
      )}

      {/* Current Active Plan Overview Card */}
      {currentSub && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#D80032] flex items-center justify-center shrink-0 shadow-xs">
                <Crown size={24} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Current Active Tier</span>
                <div className="flex items-center gap-2.5 mt-0.5">
                  <h2 className="text-lg font-black text-slate-900 m-0">
                    {currentSub.planName || 'Free Trial Plan'}
                  </h2>
                  <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                    currentSub.status === 'Active' && !isExpired
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {isExpired ? 'Expired' : currentSub.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Plan Cost</span>
              <span className="text-2xl font-black text-slate-900 block leading-tight">
                {currentSub.price > 0 ? `₹${currentSub.price.toLocaleString()}` : 'Free'}
                <span className="text-xs font-semibold text-slate-400 ml-1">/ {currentSub.billingCycle || 'month'}</span>
              </span>
            </div>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
            <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">
                <Calendar size={13} />
                <span>Activated On</span>
              </div>
              <p className="text-xs font-black text-slate-800 m-0">
                {currentSub.startDate ? new Date(currentSub.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}
              </p>
            </div>

            <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">
                <Clock size={13} />
                <span>Valid Until</span>
              </div>
              <p className="text-xs font-black text-slate-800 m-0">
                {currentSub.expiresAt ? new Date(currentSub.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
              </p>
            </div>

            <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">
                <Sparkles size={13} />
                <span>Days Remaining</span>
              </div>
              <p className="text-xs font-black text-rose-600 m-0">
                {isExpired ? '0 Days (Expired)' : `${currentSub.daysRemaining ?? 30} Days Left`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Available Plans Section */}
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 m-0">
            <span>Available Subscription Tiers</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-1 m-0">
            Choose the best plan tailored to the scale of your homestays and villas. Instant online activation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan);
            return (
              <div
                key={plan._id}
                className={`bg-white rounded-3xl p-6 sm:p-7 border flex flex-col justify-between transition-all relative ${
                  plan.isPopular
                    ? 'border-[#D80032] ring-2 ring-rose-600/10 shadow-lg'
                    : 'border-slate-150 shadow-xs hover:border-slate-300'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D80032] text-white px-3.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase shadow-xs">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-black text-slate-900 m-0">{plan.name}</h3>
                    {isCurrent && (
                      <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-extrabold rounded-md">
                        Current
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-medium mt-1.5 min-h-[36px] line-clamp-2">
                    {plan.tagline || plan.description}
                  </p>

                  <div className="my-5 pb-5 border-b border-slate-100">
                    <span className="text-3xl font-black text-slate-900 leading-none">
                      ₹{Number(plan.price).toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 ml-1.5">
                      / {plan.billingCycle || 'month'}
                    </span>
                  </div>

                  {/* Limit Highlights */}
                  <div className="grid grid-cols-3 gap-2 mb-5 text-center">
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <Home size={13} className="text-slate-500 mx-auto mb-1" />
                      <span className="block text-[10px] font-black text-slate-800">
                        {plan.maxProperties >= 999 ? 'Unlimited' : `${plan.maxProperties} Prop`}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <Building2 size={13} className="text-slate-500 mx-auto mb-1" />
                      <span className="block text-[10px] font-black text-slate-800">
                        {plan.maxRooms >= 999 ? 'Unlimited' : `${plan.maxRooms} Rooms`}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <Users size={13} className="text-slate-500 mx-auto mb-1" />
                      <span className="block text-[10px] font-black text-slate-800">
                        {plan.maxStaff >= 999 ? 'Unlimited' : `${plan.maxStaff} Staff`}
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5 mb-6">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Plan Inclusions:
                    </span>
                    {(plan.features || []).map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium leading-tight">
                        <Check size={14} className="text-emerald-600 stroke-[3] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenPurchase(plan)}
                  className={`w-full py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer border-none shadow-sm ${
                    plan.isPopular
                      ? 'bg-[#D80032] hover:bg-rose-700 text-white shadow-rose-100'
                      : isCurrent
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <span>{isCurrent ? (isExpired ? 'Renew This Plan' : 'Extend / Renew') : 'Choose This Plan'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Purchase / Payment Modal */}
      {purchaseModalOpen && selectedPlanForPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative animate-fade-in">
            <button
              onClick={() => setPurchaseModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border-none bg-transparent cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-[#D80032] flex items-center justify-center shrink-0">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 m-0">Confirm Plan Subscription</h3>
                <p className="text-xs text-slate-400 font-medium m-0 mt-0.5">
                  Instant activation via UPI or Net Banking
                </p>
              </div>
            </div>

            {paymentSuccessMsg ? (
              <div className="py-8 text-center">
                <CheckCircle2 size={44} className="text-emerald-500 mx-auto mb-3 animate-bounce" />
                <h4 className="text-base font-black text-slate-900 m-0">{paymentSuccessMsg}</h4>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Your management panel features have been unlocked.
                </p>
              </div>
            ) : (
              <form onSubmit={handleConfirmPurchase} className="space-y-4">
                {/* Order Summary Box */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Selected Tier</span>
                    <span className="text-sm font-black text-slate-900">{selectedPlanForPurchase.name}</span>
                    <span className="block text-[11px] text-slate-500">Duration: {selectedPlanForPurchase.durationDays || 30} Days</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Amount Payable</span>
                    <span className="text-xl font-black text-[#D80032]">
                      ₹{Number(selectedPlanForPurchase.price).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Simulated Payment QR / UPI details */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <QrCode size={15} className="text-rose-600" />
                      Scan & Pay via any UPI App
                    </span>
                    <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      GPay / PhonePe / Paytm
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Official WOW Gateways VPA</span>
                    <span className="text-xs font-black text-slate-800 tracking-wider">wowgateways.pay@icici</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                      UTR / Transaction Reference ID
                    </label>
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. UPI-928472918"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPurchaseModalOpen(false)}
                    className="w-1/3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={purchaseSubmitting}
                    className="w-2/3 py-2.5 bg-[#D80032] hover:bg-rose-700 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-sm shadow-rose-100 disabled:opacity-50"
                  >
                    {purchaseSubmitting ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} className="stroke-[3]" />
                    )}
                    <span>{purchaseSubmitting ? 'Activating...' : 'Confirm & Activate'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
