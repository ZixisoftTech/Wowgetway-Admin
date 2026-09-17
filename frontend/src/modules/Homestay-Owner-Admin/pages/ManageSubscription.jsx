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
  Home,
  BedDouble,
  Tag,
  PlusCircle,
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
              <span>Membership & Subscription Plan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0">
              Manage Your Subscription Plan
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1.5 max-w-2xl leading-relaxed">
              Centrally derived homestay listings allowance, room limits per homestay, and extra room add-ons.
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
              Your previous subscription plan has expired. Please select a plan below or contact Super Admin to renew your subscription.
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
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Current Active Plan</span>
                <div className="flex items-center gap-2.5 mt-0.5">
                  <h2 className="text-lg font-black text-slate-900 m-0">
                    {currentSub.planName || 'Standard Plan'}
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
                {currentSub.price > 0 ? `₹${currentSub.price.toLocaleString()}` : (currentSub.offerPrice ? `₹${currentSub.offerPrice.toLocaleString()}` : 'Free')}
                <span className="text-xs font-semibold text-slate-400 ml-1">/ {currentSub.validity || `${currentSub.durationDays || 365} Days`}</span>
              </span>
            </div>
          </div>

          {/* Centrally Derived Plan Resource Limits */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 text-center">
            <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">
                <Home size={13} className="text-blue-500" />
                <span>Max Homestays</span>
              </div>
              <p className="text-sm font-black text-slate-800 m-0">
                {currentSub.maxHomestays || 1} Homestay{Number(currentSub.maxHomestays) > 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">
                <BedDouble size={13} className="text-indigo-500" />
                <span>Rooms / Homestay</span>
              </div>
              <p className="text-sm font-black text-slate-800 m-0">
                {currentSub.maxRoomsPerHomestay || 5} Rooms
              </p>
            </div>

            <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3.5">
              <div className="flex items-center justify-center gap-1.5 text-amber-700 text-[10px] font-black uppercase tracking-wider mb-1">
                <PlusCircle size={13} className="text-amber-600" />
                <span>Extra Room Add-on</span>
              </div>
              <p className="text-sm font-black text-amber-900 m-0">
                ₹{Number(currentSub.extraRoomPrice ?? 500).toLocaleString()} / room
              </p>
            </div>

            <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">
                <Clock size={13} className="text-emerald-500" />
                <span>Validity Remaining</span>
              </div>
              <p className="text-sm font-black text-slate-800 m-0">
                {isExpired ? 'Expired' : `${currentSub.daysRemaining ?? 365} Days Left`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Available Plans Section — Strictly the 8 Fields */}
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 m-0">
            <span>Available Subscription Plans</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-1 m-0">
            Choose from the central plans configured by Super Admin. All resource limits and extra room add-on pricing are derived from your selected plan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan);
            const offer = plan.offerPrice !== undefined ? plan.offerPrice : (plan.price || 0);
            const mrp = plan.mrp !== undefined ? plan.mrp : offer;
            const homestaysLimit = plan.maxHomestays || plan.maxProperties || 1;
            const roomsLimit = plan.maxRoomsPerHomestay || plan.maxRooms || 5;
            const addOnPrice = plan.extraRoomPrice !== undefined ? plan.extraRoomPrice : 500;
            const validityText = plan.validity || `${plan.durationDays || 365} Days`;

            return (
              <div
                key={plan._id}
                className={`bg-white rounded-3xl p-6 sm:p-7 border flex flex-col justify-between transition-all relative ${
                  isCurrent
                    ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-lg'
                    : 'border-slate-150 shadow-xs hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-black text-slate-900 m-0">{plan.name}</h3>
                    {isCurrent && (
                      <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-extrabold rounded-md">
                        Current Plan
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-medium mt-1.5 min-h-[36px] line-clamp-2">
                    {plan.description || 'Standard Homestay Owner subscription tier.'}
                  </p>

                  <div className="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-baseline justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Offer Price</span>
                      <span className="text-2xl font-black text-blue-600 leading-none">
                        ₹{Number(offer).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">/ {validityText}</span>
                    </div>
                    {mrp > offer && (
                      <div className="text-right">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">MRP</span>
                        <span className="text-xs font-bold text-slate-400 line-through">
                          ₹{Number(mrp).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Strictly the 8 Fields Highlighted */}
                  <div className="space-y-2 mb-5 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                      <span className="text-slate-600 font-medium flex items-center gap-1.5">
                        <Home size={13} className="text-blue-500" />
                        Max Homestays
                      </span>
                      <span className="font-black text-slate-800">
                        {homestaysLimit} Homestay{homestaysLimit > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                      <span className="text-slate-600 font-medium flex items-center gap-1.5">
                        <BedDouble size={13} className="text-indigo-500" />
                        Rooms / Homestay
                      </span>
                      <span className="font-black text-slate-800">
                        {roomsLimit} Rooms
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                      <span className="text-slate-600 font-medium flex items-center gap-1.5">
                        <Calendar size={13} className="text-emerald-500" />
                        Duration / Validity
                      </span>
                      <span className="font-black text-slate-800">
                        {validityText}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/60 border border-amber-100">
                      <span className="text-amber-800 font-semibold flex items-center gap-1.5 text-[11px]">
                        <PlusCircle size={13} className="text-amber-600" />
                        Extra Room Add-on
                      </span>
                      <span className="font-black text-amber-900 text-xs">
                        ₹{Number(addOnPrice).toLocaleString()} / room
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenPurchase(plan)}
                  className={`w-full py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer border-none shadow-sm ${
                    isCurrent
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100'
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
                    <span className="block text-[11px] text-slate-500">Duration: {selectedPlanForPurchase.validity || `${selectedPlanForPurchase.durationDays || 365} Days`}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Amount Payable</span>
                    <span className="text-xl font-black text-blue-600">
                      ₹{Number(selectedPlanForPurchase.offerPrice ?? selectedPlanForPurchase.price ?? 0).toLocaleString()}
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
                    className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-sm shadow-blue-100 disabled:opacity-50"
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
