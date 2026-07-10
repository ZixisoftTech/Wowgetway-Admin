import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, Save, IndianRupee, AlertCircle, Search, CheckCircle2 } from 'lucide-react';

const API_SALARIES_URL = (window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app') + '/api/dashboard/salaries';

export default function ProcessSalary({ onCancel, selectedSalaryId, employeesList }) {
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  // Form State
  const [form, setForm] = useState({
    employeeId: '',
    month: 'June',
    year: '2026',
    monthlySalary: 0,
    basicSalary: 0,
    hra: 0,
    da: 0,
    specialAllowance: 0,
    otherAllowance: 0,
    // Deductions
    pfDeduction: 0,
    esiDeduction: 0,
    taxDeduction: 0,
    advanceDeduction: 0,
    penaltyDeduction: 0,
    otherDeduction: 0,
    totalDeductions: 0,
    grossSalary: 0,
    netSalary: 0,
    // Payment details
    paymentMode: 'Bank Transfer',
    transactionId: '',
    referenceNumber: '',
    paymentDate: '',
    paymentTime: '',
    remarks: '',
    status: 'Pending'
  });

  // 1. Fetch existing salary details if in edit mode
  useEffect(() => {
    if (selectedSalaryId) {
      setIsEditMode(true);
      axios.get(`${API_SALARIES_URL}/${selectedSalaryId}`)
        .then(res => {
          const data = res.data;
          setSelectedEmp(data.employee);
          setForm({
            ...data,
            paymentDate: data.paymentDate ? data.paymentDate.split('T')[0] : '',
            employeeId: data.employeeId
          });
        })
        .catch(err => console.error('Error fetching salary record details:', err));
    }
  }, [selectedSalaryId]);

  // 2. Auto calculation formulas
  useEffect(() => {
    const basic = Number(form.basicSalary) || 0;
    const hra = Number(form.hra) || 0;
    const da = Number(form.da) || 0;
    const special = Number(form.specialAllowance) || 0;
    const other = Number(form.otherAllowance) || 0;
    const gross = basic + hra + da + special + other;

    const pf = Number(form.pfDeduction) || 0;
    const esi = Number(form.esiDeduction) || 0;
    const tax = Number(form.taxDeduction) || 0;
    const adv = Number(form.advanceDeduction) || 0;
    const penalty = Number(form.penaltyDeduction) || 0;
    const otherDed = Number(form.otherDeduction) || 0;
    const totalDed = pf + esi + tax + adv + penalty + otherDed;

    const net = Math.max(0, gross - totalDed);

    setForm(prev => ({
      ...prev,
      grossSalary: gross,
      totalDeductions: totalDed,
      netSalary: net
    }));
  }, [
    form.basicSalary,
    form.hra,
    form.da,
    form.specialAllowance,
    form.otherAllowance,
    form.pfDeduction,
    form.esiDeduction,
    form.taxDeduction,
    form.advanceDeduction,
    form.penaltyDeduction,
    form.otherDeduction
  ]);

  // Set today's date if status transitions to 'Paid'
  useEffect(() => {
    if (form.status === 'Paid' && !form.paymentDate) {
      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setForm(prev => ({
        ...prev,
        paymentDate: today,
        paymentTime: time
      }));
    }
  }, [form.status]);

  // 3. Employee Search Filter
  const filteredEmployees = employeesList.filter(emp => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const idStr = emp._id.toLowerCase();
    const roleStr = emp.role.toLowerCase();
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || idStr.includes(term) || roleStr.includes(term);
  });

  const handleSelectEmployee = (emp) => {
    setSelectedEmp(emp);
    setSearchTerm(`${emp.firstName} ${emp.lastName}`);
    setShowDropdown(false);
    
    // Auto populate details from Employee profile with rich default dummy values for fast verification
    setForm(prev => ({
      ...prev,
      employeeId: emp._id,
      monthlySalary: emp.monthlySalary || 0,
      basicSalary: emp.basicSalary || Math.round((emp.monthlySalary || 0) * 0.5), // Default Basic 50%
      hra: emp.hra || Math.round((emp.monthlySalary || 0) * 0.2), // Default HRA 20%
      da: emp.da || Math.round((emp.monthlySalary || 0) * 0.1), // Default DA 10%
      specialAllowance: emp.specialAllowance || 2500,
      otherAllowance: emp.otherAllowance || 1500,
      pfDeduction: emp.pfContribution || Math.round((emp.monthlySalary || 0) * 0.06),
      esiDeduction: emp.esiContribution || Math.round((emp.monthlySalary || 0) * 0.02),
      taxDeduction: 1800,
      advanceDeduction: 500,
      penaltyDeduction: 200,
      otherDeduction: 100,
      paymentMode: 'Bank Transfer',
      transactionId: 'TXN-' + Math.floor(10000000 + Math.random() * 90000000),
      referenceNumber: 'REF-' + Math.floor(10000000 + Math.random() * 90000000),
      paymentDate: new Date().toISOString().split('T')[0],
      paymentTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      remarks: 'Automated monthly batch transfer',
      status: 'Paid'
    }));
  };

  // 4. Submit Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (isEditMode) {
        const response = await axios.put(`${API_SALARIES_URL}/${selectedSalaryId}`, payload);
        return response.data;
      } else {
        const response = await axios.post(API_SALARIES_URL, payload);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['salariesList']);
      queryClient.invalidateQueries(['salaryStats']);
      onCancel();
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to save salary details');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.employeeId) {
      alert('Please select an employee first');
      return;
    }
    saveMutation.mutate(form);
  };

  const layoutVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }
  };

  return (
    <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
      
      {/* Header section */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl bg-white border border-slate-200 transition-all shadow-sm cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
            {isEditMode ? 'Edit Processed Salary' : 'Process New Payroll'}
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Process monthly wages, adjust allowances and deductions, and record payments.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-24">
        
        {/* Row Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            
            {/* SECTION 1: EMPLOYEE SELECTION */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-rose-500">
                1. Employee Information
              </h3>
              
              {!isEditMode ? (
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Search and Select Staff Member *
                  </label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Type employee name, ID, or designation..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all"
                    />
                  </div>

                  {showDropdown && (searchTerm || showDropdown) && (
                    <div className="absolute z-30 w-full mt-1.5 bg-white border border-slate-150 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                      {filteredEmployees.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400 font-medium">
                          No matching active employees found
                        </div>
                      ) : (
                        filteredEmployees.map(emp => (
                          <div
                            key={emp._id}
                            onClick={() => handleSelectEmployee(emp)}
                            className="flex items-center gap-3 p-2.5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-b-0"
                          >
                            <img
                              src={emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                              alt={emp.firstName}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-100"
                            />
                            <div className="text-left">
                              <h4 className="text-xs font-bold text-slate-800">
                                {emp.firstName} {emp.lastName}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                                #{emp._id} | {emp.role}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Display Auto-filled Selected Employee Summary */}
              {selectedEmp && (
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex items-center justify-between flex-wrap gap-4 animate-fade-in">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={selectedEmp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                      alt={selectedEmp.firstName}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-150 shadow-sm flex-shrink-0"
                    />
                    <div>
                      <h4 className="font-bold text-slate-855 text-sm leading-tight">
                        {selectedEmp.firstName} {selectedEmp.lastName}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mt-0.5">
                        Role: <span className="text-slate-655 font-extrabold">{selectedEmp.role}</span> | Dept: <span className="text-slate-655 font-extrabold">{selectedEmp.department || 'Operations'}</span>
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 block mt-0.5">
                        Emp ID: #{selectedEmp._id}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-150 py-2 px-4 rounded-xl text-right shadow-sm flex-shrink-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                      Approved Monthly CTC
                    </span>
                    <span className="text-sm font-black text-rose-500 block mt-1 flex items-center justify-end">
                      <IndianRupee size={13} className="stroke-[2.5]" />
                      {(form.monthlySalary || selectedEmp.monthlySalary || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: SALARY DETAILS */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-rose-500">
                2. Salary Breakdown (Earnings)
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Salary Month *
                  </label>
                  <select
                    value={form.month}
                    onChange={(e) => setForm(prev => ({ ...prev, month: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Salary Year *
                  </label>
                  <select
                    value={form.year}
                    onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    {['2024', '2025', '2026', '2027'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Basic Salary *
                  </label>
                  <input
                    type="number"
                    required
                    value={form.basicSalary || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, basicSalary: Number(e.target.value) }))}
                    placeholder="Enter basic salary"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    House Rent Allowance (HRA)
                  </label>
                  <input
                    type="number"
                    value={form.hra || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, hra: Number(e.target.value) }))}
                    placeholder="HRA"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Dearness Allowance (DA)
                  </label>
                  <input
                    type="number"
                    value={form.da || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, da: Number(e.target.value) }))}
                    placeholder="DA"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Special Allowance
                  </label>
                  <input
                    type="number"
                    value={form.specialAllowance || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, specialAllowance: Number(e.target.value) }))}
                    placeholder="Special allowances"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Other Allowances
                  </label>
                  <input
                    type="number"
                    value={form.otherAllowance || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, otherAllowance: Number(e.target.value) }))}
                    placeholder="Other allowances"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: DEDUCTIONS */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-rose-500">
                3. Payroll Deductions
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    PF Deduction
                  </label>
                  <input
                    type="number"
                    value={form.pfDeduction || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, pfDeduction: Number(e.target.value) }))}
                    placeholder="Provident Fund"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    ESI Deduction
                  </label>
                  <input
                    type="number"
                    value={form.esiDeduction || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, esiDeduction: Number(e.target.value) }))}
                    placeholder="State Insurance"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Professional Tax Deduction
                  </label>
                  <input
                    type="number"
                    value={form.taxDeduction || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, taxDeduction: Number(e.target.value) }))}
                    placeholder="Tax/TDS"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Salary Advance Deduction
                  </label>
                  <input
                    type="number"
                    value={form.advanceDeduction || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, advanceDeduction: Number(e.target.value) }))}
                    placeholder="Advances recovered"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Penalty / LOP Deduction
                  </label>
                  <input
                    type="number"
                    value={form.penaltyDeduction || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, penaltyDeduction: Number(e.target.value) }))}
                    placeholder="Loss of pay / penalties"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Other Deductions
                  </label>
                  <input
                    type="number"
                    value={form.otherDeduction || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, otherDeduction: Number(e.target.value) }))}
                    placeholder="Other misc deductions"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 5: PAYMENT INFORMATION */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-rose-500">
                5. Payment Transaction Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Payment Mode
                  </label>
                  <select
                    value={form.paymentMode}
                    onChange={(e) => setForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    {['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Other'].map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    value={form.transactionId}
                    onChange={(e) => setForm(prev => ({ ...prev, transactionId: e.target.value }))}
                    placeholder="e.g. TXN982749324"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Reference / Cheque Number
                  </label>
                  <input
                    type="text"
                    value={form.referenceNumber}
                    onChange={(e) => setForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    placeholder="e.g. Bank Ref Code"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={form.paymentDate}
                    onChange={(e) => setForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Payment Time
                  </label>
                  <input
                    type="text"
                    value={form.paymentTime}
                    onChange={(e) => setForm(prev => ({ ...prev, paymentTime: e.target.value }))}
                    placeholder="e.g. 11:30 AM"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1 sm:col-span-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Transaction Remarks
                  </label>
                  <input
                    type="text"
                    value={form.remarks}
                    onChange={(e) => setForm(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Payment remarks (e.g. Bank transfer initiated successfully)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column - SUMMARY AND STATUS */}
          <div className="space-y-6">
            
            {/* SECTION 4: PAYROLL SUMMARY */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 lg:sticky lg:top-6">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-rose-500">
                4. Net Salary Calculation
              </h3>
              
              <div className="space-y-3.5 pt-1">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>Gross Salary:</span>
                  <span className="text-slate-800 flex items-center">
                    <IndianRupee size={12} className="mr-0.5 text-slate-500" />
                    {form.grossSalary.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>Total Deductions:</span>
                  <span className="text-rose-500 flex items-center">
                    - <IndianRupee size={12} className="ml-0.5 mr-0.5 text-rose-400" />
                    {form.totalDeductions.toLocaleString('en-IN')}
                  </span>
                </div>
                
                <div className="border-t border-dashed border-slate-150 pt-3.5 flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                    Net Payable Salary:
                  </span>
                  <span className="text-lg font-black text-emerald-600 flex items-center bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100 shadow-sm animate-pulse">
                    <IndianRupee size={15} className="stroke-[2.5]" />
                    {form.netSalary.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-2 border-t border-slate-50 pt-4 mt-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  6. Salary Payment Status *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'Paid', label: 'Paid', activeClass: 'border-emerald-500 bg-emerald-50/20 text-emerald-800' },
                    { key: 'Pending', label: 'Pending', activeClass: 'border-amber-500 bg-amber-50/20 text-amber-800' },
                    { key: 'Partially Paid', label: 'Partial', activeClass: 'border-blue-500 bg-blue-50/20 text-blue-800' },
                    { key: 'Hold', label: 'Hold', activeClass: 'border-rose-500 bg-rose-50/20 text-rose-800' }
                  ].map(item => {
                    const isActive = form.status === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, status: item.key }))}
                        className={`px-3 py-2 border rounded-xl text-[11px] font-bold text-center tracking-wide transition-all shadow-sm cursor-pointer ${
                          isActive 
                            ? item.activeClass
                            : 'border-slate-200 text-slate-500 bg-slate-50/30 hover:bg-slate-50 hover:text-slate-750'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Safe Note Info */}
              <div className="bg-blue-50/30 border border-blue-100 p-3 rounded-xl flex gap-2 text-blue-755 mt-4">
                <AlertCircle size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[9px] font-semibold leading-relaxed">
                  Calculations are automatically locked based on Basic + allowances and deduction components. Verify transaction details before submitting.
                </p>
              </div>

            </div>

          </div>

        </div>

        {/* Sticky Actions Bar */}
        <div className="fixed bottom-0 right-0 left-0 lg:left-64 bg-white/85 backdrop-blur-md border-t border-slate-100 py-4 px-6 flex justify-end gap-3 z-10 shadow-lg">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border border-slate-200 text-slate-655 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Save size={14} />
            {saveMutation.isPending ? 'Saving...' : 'Save Payroll Record'}
          </button>
        </div>

      </form>

    </motion.div>
  );
}
