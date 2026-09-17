import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  IndianRupee,
  Copy,
  Check,
  Edit2,
  Trash2,
  AlertCircle,
  Building2,
  Users,
  Sparkles,
  RefreshCw,
  X,
  Save,
  CheckSquare,
  Square
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getAuthToken = () => {
  return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
};

export default function Coupons() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState({
    totalCoupons: 0,
    activeCoupons: 0,
    totalRedemptions: 0,
    totalDiscountGiven: 0
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [copiedCode, setCopiedCode] = useState('');
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

  // Coupon Form State
  const initialFormState = {
    code: '',
    title: '',
    description: '',
    applicableHomestays: [],
    targetAudience: 'both', // 'both' | 'customer' | 'agent'
    discountType: 'percentage', // 'percentage' | 'fixed'
    discountValue: '',
    maxDiscountAmount: '',
    minCartAmount: '',
    maxCartAmount: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalUsageLimit: 50,
    perUserLimit: 1,
    status: 'Active'
  };

  const [formData, setFormData] = useState(initialFormState);

  // Fetch Coupons
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await axios.get(getApiUrl('/api/homestay-owner/coupons'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.success) {
        setCoupons(res.data.data || []);
        setProperties(res.data.properties || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching coupons:', err);
      setActionMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to load coupons. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // Quick Copy Code to clipboard
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  // Generate random code helper
  const handleGenerateRandomCode = () => {
    const prefixes = ['WOW', 'SAVE', 'DEAL', 'STAY', 'FEST', 'SUPER'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setFormData((prev) => ({
      ...prev,
      code: `${prefix}${num}`
    }));
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCouponId(null);
    setFormData({
      ...initialFormState,
      applicableHomestays: properties.length > 0 ? [String(properties[0]._id)] : [],
      code: `WOW${Math.floor(10 + Math.random() * 90)}`
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (coupon) => {
    setEditingCouponId(coupon._id);
    setFormData({
      code: coupon.code,
      title: coupon.title,
      description: coupon.description || '',
      applicableHomestays: coupon.applicableHomestays?.length ? coupon.applicableHomestays : [],
      targetAudience: coupon.targetAudience || 'both',
      discountType: coupon.discountType || 'percentage',
      discountValue: coupon.discountValue || '',
      maxDiscountAmount: coupon.maxDiscountAmount || '',
      minCartAmount: coupon.minCartAmount || '',
      maxCartAmount: coupon.maxCartAmount || '',
      startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split('T')[0] : '',
      endDate: coupon.endDate ? new Date(coupon.endDate).toISOString().split('T')[0] : '',
      totalUsageLimit: coupon.totalUsageLimit !== undefined ? coupon.totalUsageLimit : 0,
      perUserLimit: coupon.perUserLimit || 1,
      status: coupon.status || 'Active'
    });
    setIsModalOpen(true);
  };

  // Toggle Homestay Selection in Form
  const handleToggleHomestay = (propId) => {
    setFormData((prev) => {
      let current = [...(prev.applicableHomestays || [])];
      if (propId === 'all') {
        if (current.includes('all')) {
          return { ...prev, applicableHomestays: properties.length > 0 ? [String(properties[0]._id)] : [] };
        } else {
          return { ...prev, applicableHomestays: ['all'] };
        }
      }
      if (current.includes('all')) {
        current = [];
      }
      if (current.includes(propId)) {
        current = current.filter((id) => id !== propId);
      } else {
        current.push(propId);
      }
      return { ...prev, applicableHomestays: current };
    });
  };

  // Handle Form Submit (Create / Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.title || !formData.discountValue || !formData.endDate) {
      setActionMsg({ type: 'error', text: 'Please fill in all mandatory fields.' });
      return;
    }
    if (!formData.applicableHomestays || formData.applicableHomestays.length === 0) {
      setActionMsg({ type: 'error', text: 'Please select at least one applicable homestay for this coupon.' });
      return;
    }

    try {
      setSaving(true);
      const token = getAuthToken();
      const payload = {
        ...formData,
        code: formData.code.trim().toUpperCase(),
        discountValue: Number(formData.discountValue),
        maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : null,
        minCartAmount: formData.minCartAmount ? Number(formData.minCartAmount) : 0,
        maxCartAmount: formData.maxCartAmount ? Number(formData.maxCartAmount) : null,
        totalUsageLimit: Number(formData.totalUsageLimit) || 0,
        perUserLimit: Number(formData.perUserLimit) || 1
      };

      if (editingCouponId) {
        const res = await axios.put(
          getApiUrl(`/api/homestay-owner/coupons/${editingCouponId}`),
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.success) {
          setActionMsg({ type: 'success', text: 'Coupon updated successfully!' });
          setIsModalOpen(false);
          fetchCoupons();
        }
      } else {
        const res = await axios.post(
          getApiUrl('/api/homestay-owner/coupons'),
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.success) {
          setActionMsg({ type: 'success', text: `Coupon ${payload.code} created successfully!` });
          setIsModalOpen(false);
          fetchCoupons();
        }
      }
    } catch (err) {
      console.error('Error saving coupon:', err);
      setActionMsg({
        type: 'error',
        text: err.response?.data?.message || 'Error saving coupon.'
      });
    } finally {
      setSaving(false);
      setTimeout(() => setActionMsg({ type: '', text: '' }), 4000);
    }
  };

  // Toggle Active/Inactive Status
  const handleToggleStatus = async (coupon) => {
    try {
      const token = getAuthToken();
      const res = await axios.patch(
        getApiUrl(`/api/homestay-owner/coupons/${coupon._id}/status`),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setCoupons((prev) =>
          prev.map((c) => (c._id === coupon._id ? { ...c, status: res.data.data.status } : c))
        );
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      alert(err.response?.data?.message || 'Failed to toggle status.');
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (id, code) => {
    if (!window.confirm(`Are you sure you want to permanently delete coupon "${code}"?`)) {
      return;
    }
    try {
      const token = getAuthToken();
      const res = await axios.delete(getApiUrl(`/api/homestay-owner/coupons/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setCoupons((prev) => prev.filter((c) => c._id !== id));
        setActionMsg({ type: 'success', text: `Coupon ${code} deleted successfully.` });
        setTimeout(() => setActionMsg({ type: '', text: '' }), 3000);
      }
    } catch (err) {
      console.error('Error deleting coupon:', err);
      alert(err.response?.data?.message || 'Failed to delete coupon.');
    }
  };

  // Filtered coupons list
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = c.code?.toLowerCase().includes(q);
        const matchesTitle = c.title?.toLowerCase().includes(q);
        if (!matchesCode && !matchesTitle) return false;
      }

      if (statusFilter !== 'all') {
        const isExpired = new Date(c.endDate) < new Date();
        if (statusFilter === 'Expired' && !isExpired) return false;
        if (statusFilter === 'Active' && (c.status !== 'Active' || isExpired)) return false;
        if (statusFilter === 'Inactive' && c.status !== 'Inactive') return false;
      }

      if (audienceFilter !== 'all' && c.targetAudience !== audienceFilter) {
        return false;
      }

      if (propertyFilter !== 'all') {
        const isAll = c.applicableHomestays?.includes('all');
        const matchesSpecific = c.applicableHomestays?.some((h) => String(h) === String(propertyFilter));
        if (!isAll && !matchesSpecific) return false;
      }

      return true;
    });
  }, [coupons, searchQuery, statusFilter, audienceFilter, propertyFilter]);

  // Helper to get property names for a coupon
  const getHomestayNames = (applicableList) => {
    if (!applicableList || applicableList.length === 0 || applicableList.includes('all')) {
      return 'All Homestays';
    }
    const matched = properties
      .filter((p) => applicableList.includes(String(p._id)))
      .map((p) => p.name);
    return matched.length ? matched.join(', ') : `${applicableList.length} Selected`;
  };

  return (
    <div className="space-y-6 font-sans pb-12 select-none">
      {/* Top Breadcrumb */}
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <span>Dashboard</span>
        <span>/</span>
        <span>Marketing</span>
        <span>/</span>
        <span className="text-rose-700 font-extrabold">Offers / Coupon</span>
      </div>

      {/* Top Banner / Toast Notification */}
      {actionMsg.text && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm transition-all animate-in fade-in ${
            actionMsg.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMsg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{actionMsg.text}</span>
          </div>
          <button
            onClick={() => setActionMsg({ type: '', text: '' })}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Header Card (Uniform across all pages) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-100 p-5 sm:p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Offers / Coupon</h1>
          <p className="text-xs font-bold text-slate-400 mt-1">
            Create tailored discount codes for Direct Guests (B2C), Travel Agents (B2B), or both across specific or all homestays.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={fetchCoupons}
            className="p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl cursor-pointer bg-white flex items-center justify-center transition-colors shadow-sm"
            title="Refresh Coupons"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : 'text-slate-500'} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex-1 sm:flex-none px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100 uppercase tracking-wider"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>Create New Coupon</span>
          </button>
        </div>
      </div>

      {/* Summary Metric Cards (Exact uniform styling to Dashboard & Bookings) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Coupons */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
            <Tag size={20} />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">TOTAL COUPONS</span>
            <span className="text-2xl font-black text-slate-800 font-mono tracking-tight">{stats.totalCoupons}</span>
          </div>
        </div>

        {/* Active Offers */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">ACTIVE OFFERS</span>
            <span className="text-2xl font-black text-emerald-600 font-mono tracking-tight">{stats.activeCoupons}</span>
          </div>
        </div>

        {/* Total Redemptions */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">TOTAL REDEMPTIONS</span>
            <span className="text-2xl font-black text-slate-800 font-mono tracking-tight">{stats.totalRedemptions} Uses</span>
          </div>
        </div>

        {/* Total Discount Given */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <IndianRupee size={20} />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">DISCOUNT GIVEN</span>
            <span className="text-2xl font-black text-slate-800 font-mono tracking-tight">₹{stats.totalDiscountGiven.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Filters Section (Uniform typography & inputs) */}
      <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3.5 top-3 text-slate-400 stroke-[2.5]" />
          <input
            type="text"
            placeholder="Search by coupon code or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 transition-all"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

          {/* Audience filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Audience:</span>
            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 cursor-pointer"
            >
              <option value="all">All (B2C & B2B)</option>
              <option value="both">Both (B2B & B2C)</option>
              <option value="customer">Direct Guests Only (B2C)</option>
              <option value="agent">Travel Agents Only (B2B)</option>
            </select>
          </div>

          {/* Property filter */}
          {properties.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Homestay:</span>
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 cursor-pointer max-w-[200px]"
              >
                <option value="all">All Homestay Properties</option>
                {properties.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Coupons List / Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw size={24} className="animate-spin text-rose-600" />
          <span className="text-xs font-bold uppercase tracking-wider">Loading discount coupons...</span>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Tag size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-800 tracking-tight">No Discount Coupons Found</h3>
            <p className="text-xs font-bold text-slate-400 max-w-md mx-auto">
              {coupons.length === 0
                ? 'Create your first promotional discount code to boost bookings for direct guests or travel agents.'
                : 'No coupons match your active filters. Try adjusting your search query or filters.'}
            </p>
          </div>
          {coupons.length === 0 && (
            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100 uppercase tracking-wider mx-auto"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>Create First Coupon</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCoupons.map((coupon) => {
            const isExpired = new Date(coupon.endDate) < new Date();
            const daysLeft = Math.ceil((new Date(coupon.endDate) - new Date()) / (1000 * 60 * 60 * 24));
            const usagePercent =
              coupon.totalUsageLimit > 0
                ? Math.min(100, Math.round(((coupon.usedCount || 0) / coupon.totalUsageLimit) * 100))
                : null;

            return (
              <div
                key={coupon._id}
                className={`bg-white rounded-3xl border transition-all duration-200 flex flex-col overflow-hidden relative group hover:shadow-md ${
                  coupon.status !== 'Active' || isExpired
                    ? 'border-slate-200 opacity-80'
                    : 'border-slate-200/90 hover:border-rose-300'
                }`}
              >
                {/* Perforated ticket top header */}
                <div className="p-5 pb-4 bg-gradient-to-r from-slate-50 to-rose-50/40 border-b border-dashed border-slate-200 relative">
                  {/* Notch cutouts */}
                  <div className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-[#f8fafc] rounded-full border-r border-slate-200"></div>
                  <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-[#f8fafc] rounded-full border-l border-slate-200"></div>

                  <div className="flex items-center justify-between gap-2 mb-3">
                    {/* Audience Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        coupon.targetAudience === 'both'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : coupon.targetAudience === 'agent'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {coupon.targetAudience === 'both'
                        ? 'B2B + B2C (Both)'
                        : coupon.targetAudience === 'agent'
                        ? 'B2B Agents Only'
                        : 'B2C Direct Only'}
                    </span>

                    {/* Status badge */}
                    <div className="flex items-center gap-1.5">
                      {isExpired ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider">
                          Expired
                        </span>
                      ) : coupon.status === 'Active' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Code & Discount Title */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-slate-800 tracking-wider bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs select-all">
                          {coupon.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(coupon.code)}
                          className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 cursor-pointer transition-all"
                          title="Copy Code"
                        >
                          {copiedCode === coupon.code ? (
                            <Check size={13} className="text-emerald-600" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                      <h4 className="text-xs font-black text-slate-800 mt-2 line-clamp-1">
                        {coupon.title}
                      </h4>
                    </div>

                    {/* Discount Value Display */}
                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-rose-600 block font-mono">
                        {coupon.discountType === 'percentage'
                          ? `${coupon.discountValue}% OFF`
                          : `₹${Number(coupon.discountValue).toLocaleString()} OFF`}
                      </span>
                      {coupon.discountType === 'percentage' && coupon.maxDiscountAmount ? (
                        <span className="text-[10px] font-bold text-slate-400 block">
                          Up to ₹{Number(coupon.maxDiscountAmount).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 block">Flat Discount</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ticket Body: Rules & Conditions */}
                <div className="p-5 space-y-3.5 flex-1 text-xs">
                  {coupon.description && (
                    <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2">
                      {coupon.description}
                    </p>
                  )}

                  {/* Applicability & Cart Limits */}
                  <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        <Building2 size={12} className="text-slate-400" />
                        Homestays:
                      </span>
                      <span className="font-bold text-slate-800 truncate max-w-[170px]" title={getHomestayNames(coupon.applicableHomestays)}>
                        {getHomestayNames(coupon.applicableHomestays)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        <IndianRupee size={12} className="text-slate-400" />
                        Cart Value:
                      </span>
                      <span className="font-bold text-slate-800">
                        {coupon.minCartAmount > 0 ? `Min ₹${coupon.minCartAmount.toLocaleString()}` : 'No Min'}
                        {coupon.maxCartAmount ? ` • Max ₹${coupon.maxCartAmount.toLocaleString()}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        <Clock size={12} className="text-slate-400" />
                        Validity:
                      </span>
                      <span className="font-bold text-slate-800">
                        {new Date(coupon.endDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                        {!isExpired && daysLeft > 0 && (
                          <span className="text-[10px] text-emerald-600 font-extrabold ml-1">
                            ({daysLeft}d left)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Usage limits bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <span>Redemptions: {coupon.usedCount || 0} Used</span>
                      <span>{coupon.totalUsageLimit > 0 ? `Limit: ${coupon.totalUsageLimit}` : 'Unlimited'}</span>
                    </div>
                    {coupon.totalUsageLimit > 0 ? (
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full transition-all"
                          style={{ width: `${usagePercent}%` }}
                        ></div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 font-medium">
                        Max {coupon.perUserLimit || 1} use per customer/agent.
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(coupon)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all border ${
                        coupon.status === 'Active'
                          ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {coupon.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(coupon)}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer transition-all"
                      title="Edit Coupon"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCoupon(coupon._id, coupon.code)}
                      className="p-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition-all"
                      title="Delete Coupon"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT COUPON MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl border border-slate-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Tag size={16} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 tracking-tight">
                    {editingCouponId ? 'Edit Discount Coupon' : 'Create New Discount Coupon'}
                  </h2>
                  <p className="text-xs font-bold text-slate-400">
                    Set up audience, applicable homestays, cart value limits, and discount rules.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-all border-none"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Form & Live Preview Body */}
            <div className="overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form Fields (7 cols) */}
              <form onSubmit={handleSubmitForm} id="coupon-form" className="lg:col-span-7 space-y-4">
                {/* 1. Coupon Code & Title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Coupon Code *
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateRandomCode}
                        className="text-[10px] text-rose-600 font-black hover:underline cursor-pointer flex items-center gap-1 border-none bg-transparent"
                      >
                        <Sparkles size={11} /> Auto-Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SUMMER20"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })
                      }
                      className="w-full font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Offer Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Summer Gateway Discount"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Terms & Details (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Valid on 2+ nights bookings during weekdays. Non-refundable."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white resize-none"
                  />
                </div>

                {/* 2. Target Audience (B2B vs B2C vs Both) */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                    Target Booking Audience *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'both', label: 'Both (B2B & B2C)', sub: 'Guests & Agents' },
                      { id: 'customer', label: 'Direct Guests', sub: 'B2C Direct Only' },
                      { id: 'agent', label: 'Travel Agents', sub: 'B2B Partners Only' }
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setFormData({ ...formData, targetAudience: item.id })}
                        className={`p-2.5 rounded-2xl text-left border cursor-pointer transition-all ${
                          formData.targetAudience === item.id
                            ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="block text-[11px] font-black">{item.label}</span>
                        <span className="block text-[9px] text-slate-400 font-bold">{item.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Homestays Selection ("Select all or any one or two") */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Applicable Homestays *
                    </label>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {formData.applicableHomestays.includes('all')
                        ? 'All Homestays Selected'
                        : formData.applicableHomestays.length === 0
                        ? <span className="text-rose-600 font-bold">None Selected (Required)</span>
                        : `${formData.applicableHomestays.length} Homestay(s) Selected`}
                    </span>
                  </div>

                  <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 max-h-36 overflow-y-auto">
                    {/* Select All Option */}
                    <button
                      type="button"
                      onClick={() => handleToggleHomestay('all')}
                      className={`w-full p-2 rounded-xl flex items-center justify-between text-xs font-bold cursor-pointer transition-all border ${
                        formData.applicableHomestays.includes('all')
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {formData.applicableHomestays.includes('all') ? (
                          <CheckSquare size={14} className="text-emerald-600" />
                        ) : (
                          <Square size={14} className="text-slate-400" />
                        )}
                        <span>Apply to All My Homestays (Global)</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 font-extrabold">
                        {properties.length} Properties
                      </span>
                    </button>

                    {/* Individual Property checkboxes */}
                    {properties.map((p) => {
                      const isSelected =
                        !formData.applicableHomestays.includes('all') &&
                        formData.applicableHomestays.includes(String(p._id));
                      return (
                        <button
                          type="button"
                          key={p._id}
                          onClick={() => handleToggleHomestay(String(p._id))}
                          className={`w-full p-2 rounded-xl flex items-center justify-between text-xs font-bold cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-rose-50 text-rose-900 border-rose-300'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isSelected ? (
                              <CheckSquare size={14} className="text-rose-600 shrink-0" />
                            ) : (
                              <Square size={14} className="text-slate-400 shrink-0" />
                            )}
                            <span className="truncate">{p.name}</span>
                          </div>
                          {p.city && (
                            <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                              {p.city}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Discount Type & Value */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Discount Type
                    </label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Flat (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      {formData.discountType === 'percentage' ? 'Discount % *' : 'Discount Amount (₹) *'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={formData.discountType === 'percentage' ? '100' : '500000'}
                      required
                      placeholder={formData.discountType === 'percentage' ? 'e.g. 15' : 'e.g. 500'}
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>

                  {formData.discountType === 'percentage' && (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Max Discount Cap (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 2000 (Optional)"
                        value={formData.maxDiscountAmount}
                        onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* 5. Cart Amount Limits (Min / Max) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Min Booking Cart Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 3000 (0 for no minimum)"
                      value={formData.minCartAmount}
                      onChange={(e) => setFormData({ ...formData, minCartAmount: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Max Booking Cart Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Optional upper ceiling"
                      value={formData.maxCartAmount}
                      onChange={(e) => setFormData({ ...formData, maxCartAmount: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* 6. Validity Dates (Effective Range) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Effective Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Expiry Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600"
                    />
                  </div>
                </div>

                {/* 7. Usage Limits (Total limit & Single User limit) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Total Coupons Available
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 50 (0 for unlimited)"
                      value={formData.totalUsageLimit}
                      onChange={(e) => setFormData({ ...formData, totalUsageLimit: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600"
                    />
                    <span className="text-[10px] text-slate-400">Total redemptions permitted across all users</span>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Per-User Usage Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 1"
                      value={formData.perUserLimit}
                      onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600"
                    />
                    <span className="text-[10px] text-slate-400">Times a single customer/agent can use this code</span>
                  </div>
                </div>
              </form>

              {/* Right Column: Live Voucher Preview Card (5 cols) */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-slate-50 p-5 rounded-3xl border border-slate-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Live Voucher Preview
                    </span>
                    <span className="text-[10px] text-rose-600 font-extrabold">Public View</span>
                  </div>

                  {/* Voucher Mockup */}
                  <div className="bg-white rounded-3xl border-2 border-rose-500/80 shadow-sm p-4 relative overflow-hidden space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          formData.targetAudience === 'both'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : formData.targetAudience === 'agent'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {formData.targetAudience === 'both'
                          ? 'B2B + B2C (Both)'
                          : formData.targetAudience === 'agent'
                          ? 'Travel Agents Only'
                          : 'Direct Guests Only'}
                      </span>
                      <span className="text-[10px] font-black text-rose-600">
                        {formData.discountType === 'percentage'
                          ? `${formData.discountValue || 0}% OFF`
                          : `₹${formData.discountValue || 0} FLAT`}
                      </span>
                    </div>

                    <div>
                      <div className="font-mono text-base font-black text-slate-800 tracking-wider bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 inline-block">
                        {formData.code || 'COUPONCODE'}
                      </div>
                      <h4 className="text-xs font-black text-slate-800 mt-1.5">
                        {formData.title || 'Special Promotional Offer'}
                      </h4>
                      {formData.description && (
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                          {formData.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-dashed border-slate-200 space-y-1 text-[10px]">
                      <div className="flex justify-between text-slate-600">
                        <span className="text-slate-400">Homestay:</span>
                        <span className="font-bold truncate max-w-[140px]">
                          {getHomestayNames(formData.applicableHomestays)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span className="text-slate-400">Min Cart:</span>
                        <span className="font-bold">
                          {formData.minCartAmount ? `₹${Number(formData.minCartAmount).toLocaleString()}` : 'None'}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span className="text-slate-400">Valid Until:</span>
                        <span className="font-bold text-slate-800">
                          {formData.endDate ? new Date(formData.endDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      {formData.discountType === 'percentage' && formData.maxDiscountAmount && (
                        <div className="flex justify-between text-rose-600 font-bold">
                          <span>Max Discount:</span>
                          <span>₹{Number(formData.maxDiscountAmount).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-1 bg-white p-3 rounded-2xl border border-slate-200">
                    <p className="font-bold text-slate-700">Rules & Enforcement:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                      <li>Automatically verified at checkout before price calculation.</li>
                      <li>Single user can use this maximum {formData.perUserLimit} time(s).</li>
                      {Number(formData.totalUsageLimit) > 0 ? (
                        <li>Limited to first {formData.totalUsageLimit} bookings only.</li>
                      ) : (
                        <li>Unlimited redemptions until expiration date.</li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="space-y-2 pt-3">
                  <button
                    type="submit"
                    form="coupon-form"
                    disabled={saving}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100 uppercase tracking-wider"
                  >
                    {saving ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Saving Coupon...</span>
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        <span>{editingCouponId ? 'Update Coupon' : 'Publish Coupon'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs cursor-pointer border-none uppercase tracking-wider transition-colors text-center"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
