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
  Home, 
  BedDouble, 
  Tag, 
  Calendar, 
  PlusCircle, 
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  Table as TableIcon,
  LayoutGrid,
  Info
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
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // 8 Specific Form Fields:
  // 1. Plan Name
  // 2. Description
  // 3. Maximum Number of Homestays
  // 4. Maximum Rooms per Homestay
  // 5. MRP
  // 6. Offer Price
  // 7. Duration / Validity
  // 8. Extra Room Add-on Price
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxHomestays, setMaxHomestays] = useState(1);
  const [maxRoomsPerHomestay, setMaxRoomsPerHomestay] = useState(5);
  const [mrp, setMrp] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [validity, setValidity] = useState('365 Days');
  const [extraRoomPrice, setExtraRoomPrice] = useState(500);
  const [status, setStatus] = useState('Active');

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
    setDescription('');
    setMaxHomestays(1);
    setMaxRoomsPerHomestay(5);
    setMrp('');
    setOfferPrice('');
    setValidity('365 Days');
    setExtraRoomPrice(500);
    setStatus('Active');
    setModalOpen(true);
  };

  const handleOpenEditModal = (plan) => {
    setEditingPlan(plan);
    setName(plan.name || '');
    setDescription(plan.description || '');
    setMaxHomestays(plan.maxHomestays || plan.maxProperties || 1);
    setMaxRoomsPerHomestay(plan.maxRoomsPerHomestay || plan.maxRooms || 5);
    setMrp(plan.mrp !== undefined ? String(plan.mrp) : (plan.price ? String(plan.price) : ''));
    setOfferPrice(plan.offerPrice !== undefined ? String(plan.offerPrice) : (plan.price ? String(plan.price) : ''));
    setValidity(plan.validity || (plan.durationDays ? `${plan.durationDays} Days` : '365 Days'));
    setExtraRoomPrice(plan.extraRoomPrice !== undefined ? plan.extraRoomPrice : 500);
    setStatus(plan.status || 'Active');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!name.trim()) {
      alert('Plan Name is required.');
      return;
    }
    if (mrp === '' || offerPrice === '') {
      alert('Both MRP and Offer Price are required.');
      return;
    }

    // Parse validity to durationDays if possible
    let parsedDays = 365;
    const matchDays = String(validity).match(/(\d+)/);
    if (matchDays && matchDays[1]) {
      parsedDays = parseInt(matchDays[1], 10);
      if (String(validity).toLowerCase().includes('month')) {
        parsedDays = parsedDays * 30;
      } else if (String(validity).toLowerCase().includes('year')) {
        parsedDays = parsedDays * 365;
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      maxHomestays: Math.max(1, Number(maxHomestays) || 1),
      maxRoomsPerHomestay: Math.max(1, Number(maxRoomsPerHomestay) || 1),
      mrp: Math.max(0, Number(mrp) || 0),
      offerPrice: Math.max(0, Number(offerPrice) || 0),
      validity: validity.trim() || '365 Days',
      durationDays: parsedDays,
      extraRoomPrice: Math.max(0, Number(extraRoomPrice) || 0),
      status
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
    if (!window.confirm(`Are you sure you want to delete subscription plan "${plan.name}"?`)) return;
    const token = getAuthToken();
    try {
      await axios.delete(`${API_BASE_URL}/${plan._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPlans();
    } catch (err) {
      console.error('Error deleting plan:', err);
      alert(err.response?.data?.message || 'Failed to delete plan.');
    }
  };

  // Filtered plans
  const filteredPlans = plans.filter(p => {
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
      (p.description || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalCount = plans.length;
  const activeCount = plans.filter(p => p.status === 'Active').length;

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
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure subscription tiers, homestay and room allowances, pricing, and extra room add-on rates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                viewMode === 'cards' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <TableIcon size={15} />
            </button>
          </div>

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active Plans</span>
            <span className="text-lg font-extrabold text-emerald-600 leading-tight">{activeCount}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Home size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Max Homestays</span>
            <span className="text-lg font-extrabold text-slate-800 leading-tight">
              {plans.length > 0 ? Math.max(...plans.map(p => p.maxHomestays || p.maxProperties || 1)) : 1}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Tag size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Offer Price Range</span>
            <span className="text-xs font-extrabold text-slate-800 leading-tight">
              {plans.length > 0 
                ? `₹${Math.min(...plans.map(p => p.offerPrice ?? p.price ?? 0)).toLocaleString()} - ₹${Math.max(...plans.map(p => p.offerPrice ?? p.price ?? 0)).toLocaleString()}`
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
            placeholder="Search plans by name or description..."
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
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => {
            const currentOffer = plan.offerPrice !== undefined ? plan.offerPrice : (plan.price || 0);
            const currentMrp = plan.mrp !== undefined ? plan.mrp : currentOffer;
            const homestaysLimit = plan.maxHomestays || plan.maxProperties || 1;
            const roomsLimit = plan.maxRoomsPerHomestay || plan.maxRooms || 5;
            const addOnPrice = plan.extraRoomPrice !== undefined ? plan.extraRoomPrice : 500;
            const validityText = plan.validity || (plan.durationDays ? `${plan.durationDays} Days` : '365 Days');

            return (
              <div
                key={plan._id}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-400 shadow-xs flex flex-col justify-between relative transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 m-0">{plan.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md uppercase ${
                          plan.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {plan.status}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Calendar size={10} />
                          {validityText}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-2 min-h-[32px] line-clamp-2">
                    {plan.description || 'No description specified.'}
                  </p>

                  {/* Pricing Display */}
                  <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Offer Price</span>
                      <span className="text-2xl font-black text-blue-600 leading-tight">
                        ₹{Number(currentOffer).toLocaleString()}
                      </span>
                    </div>
                    {currentMrp > currentOffer && (
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">MRP</span>
                        <span className="text-sm font-bold text-slate-400 line-through">
                          ₹{Number(currentMrp).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Strictly the 8 Fields Highlighted */}
                  <div className="space-y-2.5 mb-4 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-100">
                      <span className="text-slate-600 font-medium flex items-center gap-1.5">
                        <Home size={14} className="text-blue-500" />
                        Max Homestays
                      </span>
                      <span className="font-extrabold text-slate-800">
                        {homestaysLimit} Homestay{homestaysLimit > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-100">
                      <span className="text-slate-600 font-medium flex items-center gap-1.5">
                        <BedDouble size={14} className="text-indigo-500" />
                        Max Rooms / Homestay
                      </span>
                      <span className="font-extrabold text-slate-800">
                        {roomsLimit} Rooms
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-100">
                      <span className="text-slate-600 font-medium flex items-center gap-1.5">
                        <Calendar size={14} className="text-emerald-500" />
                        Duration / Validity
                      </span>
                      <span className="font-extrabold text-slate-800">
                        {validityText}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/60 border border-amber-100">
                      <span className="text-amber-800 font-semibold flex items-center gap-1.5 text-[11px]">
                        <PlusCircle size={14} className="text-amber-600" />
                        Extra Room Add-on
                      </span>
                      <span className="font-black text-amber-900 text-xs">
                        ₹{Number(addOnPrice).toLocaleString()} / room
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEditModal(plan)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none"
                  >
                    <Edit3 size={13} />
                    <span>Edit Plan</span>
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
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="p-3.5 pl-4">Plan Name & Description</th>
                  <th className="p-3.5">Max Homestays</th>
                  <th className="p-3.5">Max Rooms / Homestay</th>
                  <th className="p-3.5">MRP</th>
                  <th className="p-3.5">Offer Price</th>
                  <th className="p-3.5">Duration / Validity</th>
                  <th className="p-3.5">Extra Room Add-on</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredPlans.map((plan) => {
                  const currentOffer = plan.offerPrice !== undefined ? plan.offerPrice : (plan.price || 0);
                  const currentMrp = plan.mrp !== undefined ? plan.mrp : currentOffer;
                  const homestaysLimit = plan.maxHomestays || plan.maxProperties || 1;
                  const roomsLimit = plan.maxRoomsPerHomestay || plan.maxRooms || 5;
                  const addOnPrice = plan.extraRoomPrice !== undefined ? plan.extraRoomPrice : 500;
                  const validityText = plan.validity || (plan.durationDays ? `${plan.durationDays} Days` : '365 Days');

                  return (
                    <tr key={plan._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="font-extrabold text-slate-900">{plan.name}</div>
                        <div className="text-[11px] text-slate-400 font-normal max-w-xs truncate">
                          {plan.description || '—'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold">
                          {homestaysLimit} Homestay{homestaysLimit > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold">
                          {roomsLimit} Rooms
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="text-slate-400 line-through">
                          ₹{Number(currentMrp).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-black text-emerald-600 text-sm">
                          ₹{Number(currentOffer).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-600">
                          {validityText}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md font-bold text-[11px]">
                          ₹{Number(addOnPrice).toLocaleString()} / room
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="`px-2 py-0.5 text-[9px] font-extrabold rounded-md uppercase ${
                          plan.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`">
                          {plan.status}
                        </span>
                      </td>
                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(plan)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer border-none"
                            title="Edit Plan"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(plan)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer border border-rose-100"
                            title="Delete Plan"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Plan Modal — Strictly the 8 Fields */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <CreditCard size={18} />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 m-0">
                    {editingPlan ? 'Edit Subscription Plan' : 'Add New Subscription Plan'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Enter the 8 core subscription configuration parameters.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 border-none bg-transparent cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              {/* Field 1: Plan Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  1. Plan Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Gold Plan, Premium Homestay, Starter"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Field 2: Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  2. Description
                </label>
                <textarea
                  rows="2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of what this plan includes..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Field 3 & 4: Max Homestays & Max Rooms per Homestay */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    3. Max Homestays *
                  </label>
                  <p className="text-[10px] text-slate-400 mb-1">Homestays owner can create under plan</p>
                  <input
                    type="number"
                    required
                    min="1"
                    value={maxHomestays}
                    onChange={(e) => setMaxHomestays(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    4. Max Rooms per Homestay *
                  </label>
                  <p className="text-[10px] text-slate-400 mb-1">Max rooms per homestay under plan</p>
                  <input
                    type="number"
                    required
                    min="1"
                    value={maxRoomsPerHomestay}
                    onChange={(e) => setMaxRoomsPerHomestay(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Field 5 & 6: MRP & Offer Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    5. MRP (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                    placeholder="e.g. 14999"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    6. Offer Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder="e.g. 9999"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Field 7 & 8: Duration / Validity & Extra Room Add-on Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    7. Duration / Validity *
                  </label>
                  <p className="text-[10px] text-slate-400 mb-1">e.g. "365 Days", "30 Days", "1 Year"</p>
                  <input
                    type="text"
                    required
                    value={validity}
                    onChange={(e) => setValidity(e.target.value)}
                    placeholder="e.g. 365 Days"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    8. Extra Room Add-on Price (₹) *
                  </label>
                  <p className="text-[10px] text-slate-400 mb-1">Charged per additional room over limit</p>
                  <input
                    type="number"
                    required
                    min="0"
                    value={extraRoomPrice}
                    onChange={(e) => setExtraRoomPrice(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div className="flex items-center gap-4 py-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700">Plan Status:</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="planStatus"
                      value="Active"
                      checked={status === 'Active'}
                      onChange={() => setStatus('Active')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="planStatus"
                      value="Inactive"
                      checked={status === 'Inactive'}
                      onChange={() => setStatus('Inactive')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    Inactive
                  </label>
                </div>
              </div>

              {/* Info Note */}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2 text-xs text-blue-800">
                <Info size={15} className="shrink-0 mt-0.5 text-blue-600" />
                <span>
                  When this plan is assigned to a Homestay Owner, all resource limits, pricing, and room add-on rates are centrally derived from this definition.
                </span>
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
