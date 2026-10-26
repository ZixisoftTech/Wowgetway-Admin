import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, 
  Crown, 
  Home, 
  BedDouble, 
  Calendar, 
  PlusCircle, 
  Check, 
  AlertTriangle, 
  Trash2, 
  RefreshCw, 
  Tag, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  Info,
  Plus
} from 'lucide-react';
import Swal from 'sweetalert2';

const API_BASE = (window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app');

const getAuthToken = () => {
  return localStorage.getItem('superAdminToken') || localStorage.getItem('token');
};

export default function ManageOwnerSubscriptionModal({
  isOpen,
  onClose,
  ownerId,
  ownerName,
  onSuccess
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ownerData, setOwnerData] = useState(null);
  const [plans, setPlans] = useState([]);
  
  // Assign form state
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationDays, setDurationDays] = useState(365);
  const [assignExtraRooms, setAssignExtraRooms] = useState(0);

  // Active plan room addon state
  const [activeAddonRooms, setActiveAddonRooms] = useState(1);
  const [addingRooms, setAddingRooms] = useState(false);

  useEffect(() => {
    if (isOpen && ownerId) {
      loadData();
    }
  }, [isOpen, ownerId]);

  const loadData = async () => {
    setLoading(true);
    const token = getAuthToken();
    try {
      const [ownerRes, plansRes] = await Promise.all([
        axios.get(`${API_BASE}/api/admin/homestay-owners/${ownerId}/subscription`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/api/admin/subscription-plans`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (ownerRes.data?.success) {
        setOwnerData(ownerRes.data.owner);
      }

      if (plansRes.data?.success) {
        const activePlans = (plansRes.data.data || []).filter(p => p.status === 'Active');
        setPlans(activePlans);
        if (activePlans.length > 0 && !selectedPlanId) {
          setSelectedPlanId(activePlans[0]._id);
          setDurationDays(activePlans[0].durationDays || 365);
        }
      }
    } catch (err) {
      console.error('Error loading subscription details:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to load subscription details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (planId) => {
    setSelectedPlanId(planId);
    const plan = plans.find(p => p._id === planId);
    if (plan) {
      setDurationDays(plan.durationDays || 365);
    }
  };

  const handleAssignPlan = async (e) => {
    e.preventDefault();
    if (!selectedPlanId) {
      Swal.fire('Warning', 'Please select a subscription plan.', 'warning');
      return;
    }

    const selectedPlan = plans.find(p => p._id === selectedPlanId);
    const actionName = ownerData?.subscription?.status === 'Active' ? 'Change' : 'Assign';
    const extraRoomCost = assignExtraRooms * Number(selectedPlan?.extraRoomPrice ?? 500);
    const totalAmount = Number(selectedPlan?.offerPrice ?? selectedPlan?.price ?? 0) + extraRoomCost;

    const confirm = await Swal.fire({
      title: `${actionName} Subscription Plan?`,
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.5;">
          <p>Assign <strong>"${selectedPlan?.name}"</strong> to <strong>${ownerData?.name || ownerName}</strong>?</p>
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li>Homestays Limit: <strong>${selectedPlan?.maxHomestays || 1}</strong></li>
            <li>Rooms per Homestay: <strong>${(selectedPlan?.maxRoomsPerHomestay || 5) + assignExtraRooms}</strong> (Base: ${selectedPlan?.maxRoomsPerHomestay || 5}${assignExtraRooms > 0 ? `, Extra: +${assignExtraRooms}` : ''})</li>
            <li>Plan Cost: <strong>₹${Number(selectedPlan?.offerPrice ?? selectedPlan?.price ?? 0).toLocaleString()}</strong></li>
            ${assignExtraRooms > 0 ? `<li>Extra Rooms (${assignExtraRooms} x ₹${selectedPlan?.extraRoomPrice ?? 500}): <strong>+₹${extraRoomCost.toLocaleString()}</strong></li>` : ''}
            <li>Total Amount: <strong>₹${totalAmount.toLocaleString()}</strong></li>
          </ul>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionName} Plan`,
      confirmButtonColor: '#2563eb'
    });

    if (!confirm.isConfirmed) return;

    setSaving(true);
    const token = getAuthToken();
    try {
      const res = await axios.post(
        `${API_BASE}/api/admin/homestay-owners/${ownerId}/subscription/assign`,
        {
          planId: selectedPlanId,
          startDate,
          durationDays: Number(durationDays),
          extraRooms: Number(assignExtraRooms)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        Swal.fire('Success', res.data.message || 'Subscription plan assigned successfully!', 'success');
        setAssignExtraRooms(0);
        if (onSuccess) onSuccess();
        loadData();
      }
    } catch (err) {
      console.error('Error assigning plan:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to assign plan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRoomsToActivePlan = async () => {
    if (activeAddonRooms <= 0) return;
    const unitPrice = ownerData?.subscription?.extraRoomPrice !== undefined ? Number(ownerData.subscription.extraRoomPrice) : 500;
    const totalAddonCost = activeAddonRooms * unitPrice;

    const confirm = await Swal.fire({
      title: `Add ${activeAddonRooms} Extra Room(s)?`,
      text: `This will increase room capacity by ${activeAddonRooms} room(s) (Cost: ₹${totalAddonCost.toLocaleString()} at ₹${unitPrice}/room) for ${ownerData?.name || ownerName}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Yes, Add Rooms`,
      confirmButtonColor: '#2563eb'
    });

    if (!confirm.isConfirmed) return;

    setAddingRooms(true);
    const token = getAuthToken();
    try {
      const res = await axios.post(
        `${API_BASE}/api/admin/homestay-owners/${ownerId}/subscription/add-rooms`,
        { additionalRooms: activeAddonRooms },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        Swal.fire('Success', res.data.message || `Successfully added ${activeAddonRooms} room(s)!`, 'success');
        setActiveAddonRooms(1);
        if (onSuccess) onSuccess();
        loadData();
      }
    } catch (err) {
      console.error('Error adding extra rooms:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to add extra rooms.', 'error');
    } finally {
      setAddingRooms(false);
    }
  };

  const handleRemovePlan = async () => {
    const confirm = await Swal.fire({
      title: 'Remove Subscription Plan?',
      text: `Are you sure you want to remove the assigned subscription plan from ${ownerData?.name || ownerName}? The owner will not have active limits until a new plan is assigned.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Remove Plan',
      confirmButtonColor: '#dc2626'
    });

    if (!confirm.isConfirmed) return;

    setSaving(true);
    const token = getAuthToken();
    try {
      const res = await axios.delete(
        `${API_BASE}/api/admin/homestay-owners/${ownerId}/subscription`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        Swal.fire('Removed', res.data.message || 'Subscription plan removed.', 'success');
        if (onSuccess) onSuccess();
        loadData();
      }
    } catch (err) {
      console.error('Error removing plan:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to remove plan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentSub = ownerData?.subscription;
  const hasActivePlan = currentSub && currentSub.status === 'Active';
  const selectedPlanObj = plans.find(p => p._id === selectedPlanId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Crown size={22} />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 m-0">
                Manage Owner Subscription Plan
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {ownerData ? `${ownerData.name} • ${ownerData.mobile}` : ownerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 border-none bg-transparent cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw size={24} className="animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Loading subscription information...</span>
          </div>
        ) : (
          <div className="space-y-6 pt-5">
            
            {/* 1. CURRENT ASSIGNED PLAN CARD */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Currently Assigned Plan
                </span>
                {hasActivePlan && (
                  <button
                    onClick={handleRemovePlan}
                    disabled={saving}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 border-none bg-transparent cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                    <span>Remove Plan</span>
                  </button>
                )}
              </div>

              {hasActivePlan ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/60 to-indigo-50/60 border border-blue-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-blue-100">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-blue-900">
                        {currentSub.planName || 'Active Plan'}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md uppercase">
                        Active
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <Clock size={13} className="text-blue-600" />
                      <span>
                        Expires: {currentSub.expiresAt ? new Date(currentSub.expiresAt).toLocaleDateString('en-GB') : 'N/A'}
                      </span>
                      {currentSub.daysRemaining !== undefined && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-black">
                          {currentSub.daysRemaining} Days Left
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Centrally Derived Plan Limits */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 text-center">
                    <div className="p-2 bg-white/80 rounded-xl border border-blue-100">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Homestays Allowed</span>
                      <span className="block text-xs font-black text-slate-800 mt-0.5">
                        {ownerData.activeHomestaysCount || 0} / {currentSub.maxHomestays || 1}
                      </span>
                    </div>

                    <div className="p-2 bg-white/80 rounded-xl border border-blue-100">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Rooms / Homestay</span>
                      <span className="block text-xs font-black text-slate-800 mt-0.5">
                        {currentSub.maxRoomsPerHomestay || 5} Rooms
                      </span>
                      {Number(currentSub.extraRooms) > 0 && (
                        <span className="text-[9px] text-amber-700 font-extrabold block">
                          (+{currentSub.extraRooms} extra)
                        </span>
                      )}
                    </div>

                    <div className="p-2 bg-white/80 rounded-xl border border-blue-100">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Extra Room Add-on</span>
                      <span className="block text-xs font-black text-amber-700 mt-0.5">
                        ₹{Number(currentSub.extraRoomPrice ?? 500).toLocaleString()} / room
                      </span>
                    </div>

                    <div className="p-2 bg-white/80 rounded-xl border border-blue-100">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Assigned By</span>
                      <span className="block text-[11px] font-extrabold text-slate-700 mt-0.5 truncate">
                        {currentSub.assignedBy || 'Admin'}
                      </span>
                    </div>
                  </div>

                  {/* Add Extra Rooms directly to Active Plan */}
                  <div className="mt-3.5 pt-3.5 border-t border-blue-100/80 bg-white/70 p-3 rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <PlusCircle size={13} className="text-amber-600" />
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                          + Add-on Rooms to Active Subscription
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        Rate: <strong>₹{Number(currentSub.extraRoomPrice ?? 500).toLocaleString()} / room</strong> • Instantly increases allowed room capacity
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setActiveAddonRooms(prev => Math.max(1, prev - 1))}
                          disabled={activeAddonRooms <= 1 || addingRooms}
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-black text-xs disabled:opacity-30 cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={activeAddonRooms}
                          onChange={(e) => setActiveAddonRooms(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-10 text-center text-xs font-black text-slate-800 focus:outline-none border-x border-slate-200 py-1"
                        />
                        <button
                          type="button"
                          onClick={() => setActiveAddonRooms(prev => prev + 1)}
                          disabled={addingRooms}
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-black text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddRoomsToActivePlan}
                        disabled={addingRooms}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-all"
                      >
                        {addingRooms ? <RefreshCw size={11} className="animate-spin" /> : <Plus size={12} />}
                        <span>Add {activeAddonRooms} Room(s) (₹{(activeAddonRooms * Number(currentSub.extraRoomPrice ?? 500)).toLocaleString()})</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-xs block">No Active Subscription Plan Assigned</span>
                    <span className="text-[11px] text-amber-700 block mt-0.5">
                      This homestay owner does not have an active subscription. Select and assign a plan below to grant homestay & room creation limits.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. ASSIGN / CHANGE PLAN FORM */}
            <div className="p-4.5 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={16} className="text-blue-600" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 m-0">
                  {hasActivePlan ? 'Change Subscription Plan' : 'Assign Subscription Plan'}
                </h4>
              </div>

              <form onSubmit={handleAssignPlan} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select Subscription Plan *
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => handlePlanSelect(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
                  >
                    {plans.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} — ₹{(p.offerPrice ?? p.price ?? 0).toLocaleString()} ({p.validity || `${p.durationDays} Days`}) • {p.maxHomestays || 1} Homestays, {p.maxRoomsPerHomestay || 5} Rooms/Homestay
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Plan Details Preview */}
                {selectedPlanObj && (
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="font-extrabold text-xs text-slate-900">{selectedPlanObj.name}</span>
                        <span className="text-[11px] text-slate-500 block">{selectedPlanObj.description || 'Centrally defined limits'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-blue-600">
                          ₹{Number(selectedPlanObj.offerPrice ?? selectedPlanObj.price ?? 0).toLocaleString()}
                        </span>
                        {selectedPlanObj.mrp > (selectedPlanObj.offerPrice ?? selectedPlanObj.price) && (
                          <span className="text-[10px] text-slate-400 line-through block">
                            ₹{Number(selectedPlanObj.mrp).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-[10px]">
                      <div className="bg-slate-50 p-1.5 rounded-lg">
                        <span className="text-slate-400 block font-semibold">Max Homestays</span>
                        <span className="font-extrabold text-slate-800">{selectedPlanObj.maxHomestays || 1}</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg">
                        <span className="text-slate-400 block font-semibold">Rooms / Homestay</span>
                        <span className="font-extrabold text-slate-800">
                          {(selectedPlanObj.maxRoomsPerHomestay || 5) + assignExtraRooms}
                        </span>
                        {assignExtraRooms > 0 && (
                          <span className="text-[9px] text-amber-700 font-extrabold block">
                            (+{assignExtraRooms} extra)
                          </span>
                        )}
                      </div>
                      <div className="bg-amber-50 p-1.5 rounded-lg text-amber-800 font-bold">
                        <span className="text-amber-600 block font-semibold">Extra Room Add-on</span>
                        <span>₹{Number(selectedPlanObj.extraRoomPrice ?? 500).toLocaleString()}/room</span>
                      </div>
                    </div>

                    {/* + Add Extra Room Option */}
                    <div className="pt-2.5 mt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <PlusCircle size={13} className="text-amber-600" />
                          <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider">
                            + Add Extra Room
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-700 block mt-0.5">
                          Charge: <strong>₹{Number(selectedPlanObj.extraRoomPrice ?? 500).toLocaleString()} / room</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-white border border-amber-200 rounded-xl overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setAssignExtraRooms(prev => Math.max(0, prev - 1))}
                            disabled={assignExtraRooms <= 0}
                            className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-black text-xs disabled:opacity-30 cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={assignExtraRooms}
                            onChange={(e) => setAssignExtraRooms(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-10 text-center text-xs font-black text-slate-800 focus:outline-none border-x border-amber-100 py-1"
                          />
                          <button
                            type="button"
                            onClick={() => setAssignExtraRooms(prev => prev + 1)}
                            className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-black text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {assignExtraRooms > 0 && (
                          <div className="text-right pl-1">
                            <span className="text-[11px] font-black text-amber-900 block leading-none">
                              +₹{(assignExtraRooms * Number(selectedPlanObj.extraRoomPrice ?? 500)).toLocaleString()}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                              ({(selectedPlanObj.maxRoomsPerHomestay || 5) + assignExtraRooms} total rooms)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total Summary Breakdown */}
                    {assignExtraRooms > 0 && (
                      <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-extrabold text-blue-900 block">
                            Total Allowed: {(selectedPlanObj.maxRoomsPerHomestay || 5) + assignExtraRooms} Rooms / Homestay
                          </span>
                          <span className="text-[10px] text-blue-600 block">
                            (Base: {selectedPlanObj.maxRoomsPerHomestay || 5} + Extra: {assignExtraRooms})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Amount</span>
                          <span className="font-black text-blue-700 text-sm">
                            ₹{(Number(selectedPlanObj.offerPrice ?? selectedPlanObj.price ?? 0) + (assignExtraRooms * Number(selectedPlanObj.extraRoomPrice ?? 500))).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Validity Period (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-sm shadow-blue-100 disabled:opacity-50 transition-all"
                >
                  {saving ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Check size={14} className="stroke-[3]" />
                  )}
                  <span>{hasActivePlan ? 'Update to this Subscription Plan' : 'Assign Subscription Plan'}</span>
                </button>
              </form>
            </div>

            {/* 3. OWNER'S HOMESTAYS & ROOM CONSUMPTION */}
            {ownerData?.properties && ownerData.properties.length > 0 && (
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                  Properties & Room Add-ons
                </span>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <th className="p-2.5 pl-3">Property</th>
                        <th className="p-2.5 text-center">Configured Rooms</th>
                        <th className="p-2.5 text-center">Extra Rooms Purchased</th>
                        <th className="p-2.5 text-right pr-3">Total Allowed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {ownerData.properties.map(p => {
                        const included = currentSub?.maxRoomsPerHomestay || 5;
                        const extra = p.extraRoomsPurchased || 0;
                        const totalAllowed = included + extra;
                        const isOver = p.currentRooms > totalAllowed;

                        return (
                          <tr key={p._id} className="hover:bg-slate-50/50">
                            <td className="p-2.5 pl-3 font-bold text-slate-800">
                              {p.name}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-md font-bold ${isOver ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                                {p.currentRooms}
                              </span>
                            </td>
                            <td className="p-2.5 text-center text-amber-700 font-bold">
                              +{extra}
                            </td>
                            <td className="p-2.5 text-right pr-3 font-extrabold text-blue-600">
                              {totalAllowed} Rooms
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. SUBSCRIPTION HISTORY */}
            {currentSub?.history && currentSub.history.length > 0 && (
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                  Subscription & Add-on History
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {currentSub.history.slice().reverse().map((h, i) => (
                    <div key={i} className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{h.planName}</span>
                        <span className="text-[10px] text-slate-400 block">
                          {h.purchasedAt || h.removedAt ? new Date(h.purchasedAt || h.removedAt).toLocaleDateString('en-GB') : 'Past'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-700">₹{Number(h.price || 0).toLocaleString()}</span>
                        <span className="text-[9px] text-slate-400 block">{h.paymentMethod || 'Manual'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-5 mt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs cursor-pointer bg-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
