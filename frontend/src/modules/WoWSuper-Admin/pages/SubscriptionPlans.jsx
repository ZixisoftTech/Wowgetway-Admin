import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Crown, 
  Building2, 
  Users, 
  Home, 
  Sparkles, 
  RefreshCw,
  AlertCircle,
  SlidersHorizontal,
  CheckCircle2
} from 'lucide-react';

const API_BASE_URL = (window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app') + '/api/admin/subscription-plans';

const getAuthToken = () => {
  return localStorage.getItem('superAdminToken') || localStorage.getItem('token') || localStorage.getItem('homestayOwnerToken');
};

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [price, setPrice] = useState('');
  const [billingCycle, setBillingCycle] = useState('Monthly');
  const [durationDays, setDurationDays] = useState(30);
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState(['']);
  const [maxProperties, setMaxProperties] = useState(1);
  const [maxRooms, setMaxRooms] = useState(10);
  const [maxStaff, setMaxStaff] = useState(5);
  const [status, setStatus] = useState('Active');
  const [isPopular, setIsPopular] = useState(false);

  const fetchPlans = async () => {
    const token = getAuthToken();
    try {
      setLoading(true);
      const res = await axios.get(API_BASE_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setPlans(res.data.data || []);
      }
    } catch (err) {
      console.error('Error loading subscription plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setTagline('');
    setPrice('');
    setBillingCycle('Monthly');
    setDurationDays(30);
    setDescription('');
    setFeatures([
      'Core Property Management',
      'Public Availability Calendar',
      'Advance UPI Booking Slips',
      'Email & WhatsApp Alerts'
    ]);
    setMaxProperties(1);
    setMaxRooms(10);
    setMaxStaff(5);
    setStatus('Active');
    setIsPopular(false);
    setModalOpen(true);
  };

  const handleOpenEditModal = (plan) => {
    setEditingPlan(plan);
    setName(plan.name || '');
    setTagline(plan.tagline || '');
    setPrice(plan.price !== undefined ? String(plan.price) : '');
    setBillingCycle(plan.billingCycle || 'Monthly');
    setDurationDays(plan.durationDays || 30);
    setDescription(plan.description || '');
    setFeatures(plan.features && plan.features.length > 0 ? plan.features : ['']);
    setMaxProperties(plan.maxProperties || 1);
    setMaxRooms(plan.maxRooms || 10);
    setMaxStaff(plan.maxStaff || 5);
    setStatus(plan.status || 'Active');
    setIsPopular(Boolean(plan.isPopular));
    setModalOpen(true);
  };

  const handleFeatureChange = (index, val) => {
    setFeatures(prev => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleAddFeatureField = () => {
    setFeatures(prev => [...prev, '']);
  };

  const handleRemoveFeatureField = (index) => {
    setFeatures(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!name || price === '') {
      alert('Plan Name and Price are required.');
      return;
    }

    const payload = {
      name,
      tagline,
      price: Number(price),
      billingCycle,
      durationDays: Number(durationDays),
      description,
      features: features.map(f => f.trim()).filter(Boolean),
      maxProperties: Number(maxProperties),
      maxRooms: Number(maxRooms),
      maxStaff: Number(maxStaff),
      status,
      isPopular
    };

    try {
      setSubmitting(true);
      if (editingPlan) {
        await axios.put(`${API_BASE_URL}/${editingPlan._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(API_BASE_URL, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setModalOpen(false);
      fetchPlans();
    } catch (err) {
      console.error('Error saving plan:', err);
      alert(err.response?.data?.message || 'Failed to save plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete subscription plan "${plan.name}"?`)) return;
    const token = getAuthToken();
    try {
      await axios.delete(`${API_BASE_URL}/${plan._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPlans();
    } catch (err) {
      console.error('Error deleting plan:', err);
      alert('Failed to delete plan.');
    }
  };

  // Filtered plans
  const filteredPlans = plans.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || 
      p.tagline?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalCount = plans.length;
  const activeCount = plans.filter(p => p.status === 'Active').length;
  const popularPlan = plans.find(p => p.isPopular);

  return (
    <div className="space-y-6 pb-12 select-none animate-fade-in font-sans">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CreditCard size={20} />
            </span>
            Subscription Plans Management
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Create, update, and manage subscription pricing tiers and resource limits for Homestay Owners.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPlans}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl cursor-pointer bg-white flex items-center justify-center transition-colors shadow-sm"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : 'text-slate-500'} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-blue-100"
          >
            <Plus size={15} className="stroke-[3]" />
            <span>Create New Plan</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CreditCard size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Plans</span>
            <span className="text-lg font-extrabold text-slate-800 leading-tight">{totalCount}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active Tiers</span>
            <span className="text-lg font-extrabold text-emerald-600 leading-tight">{activeCount}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Crown size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Popular Tier</span>
            <span className="text-sm font-extrabold text-slate-800 truncate block max-w-[140px]">
              {popularPlan ? popularPlan.name : 'None'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pricing Range</span>
            <span className="text-sm font-extrabold text-slate-800 block">
              {plans.length > 0 
                ? `₹${Math.min(...plans.map(p => p.price)).toLocaleString()} - ₹${Math.max(...plans.map(p => p.price)).toLocaleString()}`
                : '₹0'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans by name or tagline..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <SlidersHorizontal size={11} />
            Status:
          </span>
          {['All', 'Active', 'Inactive'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                filterStatus === st
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Plan Cards Visual Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filteredPlans.map((plan) => (
          <div
            key={plan._id}
            className={`bg-white rounded-2xl p-5 border shadow-xs flex flex-col justify-between relative transition-all ${
              plan.isPopular ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-150'
            }`}
          >
            {plan.isPopular && (
              <span className="absolute -top-2.5 right-5 bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase shadow-xs">
                Popular
              </span>
            )}

            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-extrabold text-slate-800 m-0">{plan.name}</h3>
                <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md uppercase ${
                  plan.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {plan.status}
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-1 min-h-[32px] line-clamp-2">
                {plan.tagline || plan.description || 'No description provided.'}
              </p>

              <div className="my-4 pb-4 border-b border-slate-100">
                <span className="text-2xl font-black text-slate-900 leading-none">
                  ₹{Number(plan.price).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-semibold ml-1">/ {plan.billingCycle || 'month'}</span>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-3 gap-1.5 mb-4 text-center">
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="block text-[9px] font-semibold text-slate-400 uppercase">Properties</span>
                  <span className="block text-[11px] font-black text-slate-800">
                    {plan.maxProperties >= 999 ? 'Unlimited' : plan.maxProperties}
                  </span>
                </div>
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="block text-[9px] font-semibold text-slate-400 uppercase">Rooms</span>
                  <span className="block text-[11px] font-black text-slate-800">
                    {plan.maxRooms >= 999 ? 'Unlimited' : plan.maxRooms}
                  </span>
                </div>
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="block text-[9px] font-semibold text-slate-400 uppercase">Staff</span>
                  <span className="block text-[11px] font-black text-slate-800">
                    {plan.maxStaff >= 999 ? 'Unlimited' : plan.maxStaff}
                  </span>
                </div>
              </div>

              {/* Feature bullets */}
              <div className="space-y-1.5 mb-5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Features:</span>
                {(plan.features || []).slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <Check size={12} className="text-emerald-600 stroke-[3] shrink-0" />
                    <span className="truncate">{f}</span>
                  </div>
                ))}
                {plan.features?.length > 4 && (
                  <span className="text-[10px] text-blue-600 font-bold block pt-0.5">
                    +{plan.features.length - 4} more features
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleOpenEditModal(plan)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer border-none"
              >
                <Edit3 size={13} />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDelete(plan)}
                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer border border-rose-100"
                title="Delete plan"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Plan Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <CreditCard size={18} />
                </span>
                <h3 className="text-base font-extrabold text-slate-800 m-0">
                  {editingPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 border-none bg-transparent cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Starter Host"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Best for boutique villas"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 1999"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Billing Cycle
                  </label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Max Properties
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxProperties}
                    onChange={(e) => setMaxProperties(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Max Rooms
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxRooms}
                    onChange={(e) => setMaxRooms(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Max Staff
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxStaff}
                    onChange={(e) => setMaxStaff(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Status & Popular Checkbox */}
              <div className="flex items-center gap-6 py-2 border-y border-slate-100">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">Status:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Mark as Most Popular Badge</span>
                </label>
              </div>

              {/* Features Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Plan Features & Inclusions
                  </label>
                  <button
                    type="button"
                    onClick={handleAddFeatureField}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 border-none bg-transparent cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Add Feature</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => handleFeatureChange(idx, e.target.value)}
                        placeholder={`Feature #${idx + 1}`}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                      {features.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFeatureField(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border-none bg-transparent cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border-none shadow-sm shadow-blue-100 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} className="stroke-[3]" />}
                  <span>{editingPlan ? 'Save Changes' : 'Create Plan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
