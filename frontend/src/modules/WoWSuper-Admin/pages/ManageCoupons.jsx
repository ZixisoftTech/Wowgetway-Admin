import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  TicketPercent, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Calendar, 
  DollarSign, 
  Percent, 
  AlertCircle 
} from 'lucide-react';

const API_BASE_URL = (window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app') + '/api/dashboard/coupons';

export default function ManageCoupons() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  
  // Form State
  const [code, setCode] = useState('');
  const [type, setType] = useState('percentage');
  const [value, setValue] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiry, setExpiry] = useState('');
  const [status, setStatus] = useState('Active');

  // React Query Fetch
  const { data, isLoading, error } = useQuery({
    queryKey: ['couponsList', { page: currentPage, limit: itemsPerPage, search, status: filterStatus }],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey;
      const res = await axios.get(API_BASE_URL, { params });
      return res.data;
    },
    keepPreviousData: true
  });

  const coupons = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newCoupon) => {
      return axios.post(API_BASE_URL, newCoupon);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['couponsList']);
      setModalOpen(false);
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to create coupon.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updatedCoupon }) => {
      return axios.put(`${API_BASE_URL}/${id}`, updatedCoupon);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['couponsList']);
      setModalOpen(false);
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to update coupon.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return axios.delete(`${API_BASE_URL}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['couponsList']);
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to delete coupon.');
    }
  });

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setCode('');
    setType('percentage');
    setValue('');
    setMinOrder('');
    setMaxUses('');
    setExpiry('');
    setStatus('Active');
    setModalOpen(true);
  };

  const handleOpenEdit = (coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setType(coupon.type);
    setValue(coupon.value);
    setMinOrder(coupon.minOrder);
    setMaxUses(coupon.maxUses);
    
    // Parse ISO date string to YYYY-MM-DD for the date input
    const formattedExpiry = coupon.expiry 
      ? new Date(coupon.expiry).toISOString().split('T')[0]
      : '';
    setExpiry(formattedExpiry);
    
    setStatus(coupon.status);
    setModalOpen(true);
  };

  const handleToggleStatus = (coupon) => {
    const nextStatus = coupon.status === 'Active' ? 'Inactive' : 'Active';
    updateMutation.mutate({
      id: coupon._id,
      updatedCoupon: { ...coupon, status: nextStatus }
    });
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to permanently delete this coupon?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code || !value || !expiry) {
      alert('Please fill out all required fields.');
      return;
    }

    const payload = {
      code: code.toUpperCase(),
      type,
      value: parseFloat(value),
      minOrder: parseFloat(minOrder || 0),
      maxUses: parseInt(maxUses || 100),
      expiry,
      status
    };

    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon._id, updatedCoupon: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1); // Reset page on query change
  };

  const handleStatusFilterChange = (st) => {
    setFilterStatus(st);
    setCurrentPage(1); // Reset page on filter change
  };

  return (
    <div className="space-y-6 sm:space-y-8 select-none animate-fade-in">
      {/* Header and Page title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-pink-50 text-pink-600 rounded-xl">
              <TicketPercent size={22} />
            </span>
            Manage Coupons
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Create, monitor, edit and toggle active promotional discount vouchers for booking platforms.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus size={14} />
          Create Coupon
        </button>
      </div>

      {/* Filter Toggles & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search coupon code..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-slate-350 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 pl-1">
            <SlidersHorizontal size={12} />
            Status:
          </span>
          {['All', 'Active', 'Inactive', 'Expired'].map(st => (
            <button
              key={st}
              onClick={() => handleStatusFilterChange(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                filterStatus === st
                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                  : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 font-medium">
              Loading coupon datasets...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-rose-500 font-medium">
              Failed to sync coupons from server.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                  <th className="py-4 px-6">Coupon Code</th>
                  <th className="py-4 px-6">Discount Value</th>
                  <th className="py-4 px-6">Min Order</th>
                  <th className="py-4 px-6">Redeemed</th>
                  <th className="py-4 px-6">Expires</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-650">
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                      <div className="flex flex-col items-center gap-3">
                        <TicketPercent size={36} className="text-slate-200" />
                        <span>No matching promotional coupons found.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  coupons.map((coupon) => (
                    <tr key={coupon._id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 tracking-wider">
                          {coupon.code}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="flex items-center gap-1 font-bold text-slate-800">
                          {coupon.type === 'percentage' ? (
                            <>
                              {coupon.value}
                              <Percent size={13} className="text-slate-400" />
                            </>
                          ) : (
                            <>
                              ₹ {coupon.value.toLocaleString()}
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-600">
                        ₹ {coupon.minOrder.toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1 w-24">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400">
                            <span>{coupon.usedCount} used</span>
                            <span>{coupon.maxUses} max</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                (coupon.usedCount / coupon.maxUses) >= 0.9 
                                  ? 'bg-amber-500' 
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, (coupon.usedCount / coupon.maxUses) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-500 flex items-center gap-1.5 mt-2">
                        <Calendar size={13} className="text-slate-400" />
                        {coupon.expiry ? new Date(coupon.expiry).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                          coupon.status === 'Active' 
                            ? 'bg-emerald-50/50 border-emerald-100 text-emerald-600' 
                            : coupon.status === 'Expired'
                            ? 'bg-rose-50/50 border-rose-100 text-rose-600'
                            : 'bg-slate-50 border-slate-150 text-slate-400'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${
                            coupon.status === 'Active' 
                              ? 'bg-emerald-500' 
                              : coupon.status === 'Expired'
                              ? 'bg-rose-500'
                              : 'bg-slate-300'
                          }`} />
                          {coupon.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(coupon)}
                            disabled={coupon.status === 'Expired'}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                              coupon.status === 'Active'
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-100'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100'
                            }`}
                            title={coupon.status === 'Active' ? 'Deactivate Coupon' : 'Activate Coupon'}
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(coupon)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(coupon._id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {!isLoading && !error && pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 bg-slate-50 border-t border-slate-100">
            <span className="text-[11px] text-slate-450 font-semibold tracking-wide">
              Showing {Math.min(pagination.total, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(pagination.total, currentPage * itemsPerPage)} of {pagination.total} records
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Previous
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                      : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              <button
                disabled={currentPage === pagination.totalPages || pagination.totalPages === 0}
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Creation/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-800">
                  {editingCoupon ? 'Edit Promotional Coupon' : 'Create Promotional Coupon'}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-655 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Coupon Code *</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. FLASH25"
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-440 uppercase tracking-wider pl-1">Coupon Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-440 uppercase tracking-wider pl-1">Value *</label>
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                      required
                      min="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-440 uppercase tracking-wider pl-1">Min Order Requirement</label>
                    <input
                      type="number"
                      value={minOrder}
                      onChange={(e) => setMinOrder(e.target.value)}
                      placeholder="₹ Min Order"
                      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-440 uppercase tracking-wider pl-1">Max Redemptions</label>
                    <input
                      type="number"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-440 uppercase tracking-wider pl-1">Expiry Date *</label>
                    <input
                      type="date"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-440 uppercase tracking-wider pl-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Expired">Expired</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    {editingCoupon ? 'Save Changes' : 'Create Coupon'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
