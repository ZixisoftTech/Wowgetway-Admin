import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  IndianRupee, 
  Users, 
  CheckCircle2, 
  Clock, 
  Wallet, 
  Search, 
  Plus, 
  Download, 
  Eye, 
  Edit2, 
  Trash2, 
  Mail, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  X
} from 'lucide-react';
import ProcessSalary from './ProcessSalary.jsx';
import SalaryDetails from './SalaryDetails.jsx';

const API_SALARIES_URL = (window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app') + '/api/dashboard/salaries';
const API_EMPLOYEES_URL = (window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app') + '/api/dashboard/employees-list';

export default function SalaryManagement() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'process' | 'details'
  const [selectedSalaryId, setSelectedSalaryId] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('June');
  const [yearFilter, setYearFilter] = useState('2026');
  const [statusFilter, setStatusFilter] = useState('All');

  // 1. Fetch Salaries List
  const { data: salariesList = [], isLoading: listLoading } = useQuery({
    queryKey: ['salariesList', searchQuery, monthFilter, yearFilter, statusFilter],
    queryFn: async () => {
      const response = await axios.get(API_SALARIES_URL, {
        params: {
          search: searchQuery,
          month: monthFilter,
          year: yearFilter,
          status: statusFilter
        }
      });
      return response.data;
    }
  });

  // 2. Fetch Salary Stats for KPI cards
  const { data: stats = { totalEmployees: 0, processedThisMonth: 0, pendingSalaries: 0, totalSalaryAmount: 0 }, isLoading: statsLoading } = useQuery({
    queryKey: ['salaryStats', monthFilter, yearFilter],
    queryFn: async () => {
      const response = await axios.get(`${API_SALARIES_URL}/stats`, {
        params: {
          month: monthFilter,
          year: yearFilter
        }
      });
      return response.data;
    }
  });

  // 3. Fetch Employees list (needed for search/selection in Process Salary form)
  const { data: employeesList = [] } = useQuery({
    queryKey: ['employeesList'],
    queryFn: async () => {
      const response = await axios.get(API_EMPLOYEES_URL);
      return response.data;
    }
  });

  // 4. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await axios.delete(`${API_SALARIES_URL}/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['salariesList']);
      queryClient.invalidateQueries(['salaryStats']);
      alert('Salary payroll record deleted successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to delete salary record');
    }
  });

  const handleDeleteRecord = (id, name) => {
    if (window.confirm(`Are you sure you want to delete the processed salary for ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  // 5. Email Slip Action
  const handleSendSlipEmail = (sal) => {
    alert(`Salary slip for ${sal.month} ${sal.year} has been emailed successfully to ${sal.employee.email}`);
  };

  // 6. CSV Exporter
  const handleExportCSV = () => {
    if (salariesList.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = ['Employee ID', 'Employee Name', 'Role', 'Department', 'Salary Month', 'Gross Salary', 'Total Deductions', 'Net Salary', 'Payment Mode', 'Transaction ID', 'Payment Date', 'Status'];
    const rows = salariesList.map(sal => [
      sal.employeeId,
      `${sal.employee.firstName} ${sal.employee.lastName}`,
      sal.employee.role,
      sal.employee.department || 'Operations',
      `${sal.month} ${sal.year}`,
      sal.grossSalary,
      sal.totalDeductions,
      sal.netSalary,
      sal.paymentMode,
      sal.transactionId || 'N/A',
      sal.paymentDate ? new Date(sal.paymentDate).toLocaleDateString('en-GB') : 'N/A',
      sal.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Wow_Gateways_Payroll_Export_${monthFilter}_${yearFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const layoutVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }
  };

  return (
    <div className="space-y-6">
      
      {/* -------------------- VIEW SWITCHER BRANCHING -------------------- */}

      {viewMode === 'process' && (
        <ProcessSalary
          onCancel={() => { setViewMode('list'); setSelectedSalaryId(null); }}
          selectedSalaryId={selectedSalaryId}
          employeesList={employeesList}
        />
      )}

      {viewMode === 'details' && (
        <SalaryDetails
          onCancel={() => { setViewMode('list'); setSelectedSalaryId(null); }}
          selectedSalaryId={selectedSalaryId}
        />
      )}

      {viewMode === 'list' && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
          
          {/* Header Title Title description */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">
                Salary Management
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1.5">
                Manage employee salary processing, payments, and payroll records.
              </p>
            </div>
            
            <button
              onClick={() => setViewMode('process')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all cursor-pointer flex items-center gap-1.5 self-start md:self-center"
            >
              <Plus size={15} />
              Process Salary
            </button>
          </div>

          {/* -------------------- 1. TOP KPI DASHBOARD SECTION -------------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
            
            {/* Card 1: Total Employees */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block leading-none">
                  Total Active Employees
                </span>
                <span className="text-2xl font-black text-slate-800 block leading-tight">
                  {statsLoading ? '...' : stats.totalEmployees}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                  HR verified coordinates
                </span>
              </div>
              <div className="p-3 bg-sky-50 text-sky-550 rounded-xl">
                <Users size={20} className="stroke-[2.5]" />
              </div>
            </div>

            {/* Card 2: Processed Salaries */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block leading-none">
                  Salary Processed ({monthFilter})
                </span>
                <span className="text-2xl font-black text-slate-800 block leading-tight">
                  {statsLoading ? '...' : stats.processedThisMonth}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 block mt-0.5">
                  <TrendingUp size={10} />
                  Processed successfully
                </span>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-555 rounded-xl">
                <CheckCircle2 size={20} className="stroke-[2.5]" />
              </div>
            </div>

            {/* Card 3: Pending Salaries */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block leading-none">
                  Pending Salary Accounts
                </span>
                <span className="text-2xl font-black text-slate-800 block leading-tight">
                  {statsLoading ? '...' : stats.pendingSalaries}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                  Awaiting bank transfers
                </span>
              </div>
              <div className="p-3 bg-amber-50 text-amber-550 rounded-xl">
                <Clock size={20} className="stroke-[2.5]" />
              </div>
            </div>

            {/* Card 4: Total Wage payroll */}
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block leading-none">
                  Total Monthly Payroll
                </span>
                <span className="text-2xl font-black text-slate-800 block leading-tight flex items-center">
                  <IndianRupee size={20} className="stroke-[3] text-indigo-500 mr-0.5" />
                  {statsLoading ? '...' : stats.totalSalaryAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                  Net wages payable
                </span>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-550 rounded-xl">
                <Wallet size={20} className="stroke-[2.5]" />
              </div>
            </div>

          </div>

          {/* -------------------- 2. FILTERS CONTAINER -------------------- */}
          <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4.5">
            
            {/* Search Input bar */}
            <div className="relative max-w-md w-full">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee name, role, or ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all"
              />
            </div>

            {/* Select options dropdown filters */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              
              <SlidersHorizontal size={14} className="text-slate-400 hidden sm:block mr-1" />
              
              {/* Month */}
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-655 rounded-xl focus:outline-none focus:ring-2 shadow-sm cursor-pointer"
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {/* Year */}
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-655 rounded-xl focus:outline-none focus:ring-2 shadow-sm cursor-pointer"
              >
                {['2024', '2025', '2026', '2027'].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              {/* Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-655 rounded-xl focus:outline-none focus:ring-2 shadow-sm cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Partially Paid">Partial</option>
                <option value="Hold">Hold</option>
              </select>

              {/* Export Button */}
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 border border-slate-200 text-slate-655 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Download size={14} />
                Export CSV
              </button>

            </div>

          </div>

          {/* -------------------- 3. DATA LIST TABLE -------------------- */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6">Emp ID</th>
                    <th className="py-4 px-6">Salary Month</th>
                    <th className="py-4 px-6">Gross Pay</th>
                    <th className="py-4 px-6">Deductions</th>
                    <th className="py-4 px-6">Net Take-Home</th>
                    <th className="py-4 px-6 text-center">Payment Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-55 text-xs font-semibold text-slate-700">
                  {listLoading ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400 font-medium">
                        Loading salaries registers...
                      </td>
                    </tr>
                  ) : salariesList.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-450 font-medium">
                        No processed salary records found for this selection.
                      </td>
                    </tr>
                  ) : (
                    salariesList.map(sal => {
                      const empName = `${sal.employee.firstName} ${sal.employee.lastName}`;
                      
                      // Status style mapper
                      let badgeClass = 'bg-slate-55 text-slate-600 border-slate-200';
                      if (sal.status === 'Paid') badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                      if (sal.status === 'Pending') badgeClass = 'bg-amber-50 text-amber-800 border-amber-100';
                      if (sal.status === 'Partially Paid') badgeClass = 'bg-blue-50 text-blue-800 border-blue-100';
                      if (sal.status === 'Hold') badgeClass = 'bg-rose-50 text-rose-800 border-rose-100';

                      return (
                        <tr key={sal._id} className="hover:bg-slate-50/40 transition-colors">
                          
                          {/* Employee detail */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <img
                                src={sal.employee.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                                alt={empName}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-100 flex-shrink-0"
                              />
                              <div>
                                <span className="font-bold text-slate-800 block">{empName}</span>
                                <span className="text-[10px] text-slate-400 font-semibold block uppercase mt-0.5">{sal.employee.role}</span>
                              </div>
                            </div>
                          </td>

                          {/* ID */}
                          <td className="py-4 px-6 text-slate-500 font-medium">#{sal.employeeId}</td>

                          {/* Month */}
                          <td className="py-4 px-6 text-slate-600 font-bold">{sal.month} {sal.year}</td>

                          {/* Gross */}
                          <td className="py-4 px-6 text-slate-655 font-bold">
                            INR {(sal.grossSalary || 0).toLocaleString('en-IN')}
                          </td>

                          {/* Deductions */}
                          <td className="py-4 px-6 text-rose-500 font-bold">
                            - INR {(sal.totalDeductions || 0).toLocaleString('en-IN')}
                          </td>

                          {/* Net */}
                          <td className="py-4 px-6 text-emerald-600 font-extrabold bg-emerald-50/20">
                            INR {(sal.netSalary || 0).toLocaleString('en-IN')}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-6 text-center">
                            <span className={`border px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${badgeClass}`}>
                              {sal.status}
                            </span>
                          </td>

                          {/* Actions popover buttons */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => { setSelectedSalaryId(sal._id); setViewMode('details'); }}
                                title="View Statement & History"
                                className="p-1.5 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-all"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                onClick={() => { setSelectedSalaryId(sal._id); setViewMode('process'); }}
                                title="Edit Processed Salary"
                                className="p-1.5 text-slate-400 hover:text-blue-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-all"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleSendSlipEmail(sal)}
                                title="Email Salary Slip"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-all"
                              >
                                <Mail size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(sal._id, empName)}
                                title="Delete Payroll Record"
                                className="p-1.5 text-slate-400 hover:text-rose-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-all"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination/Summary details footer */}
            <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Showing {salariesList.length} processed wages records</span>
            </div>

          </div>

        </motion.div>
      )}

    </div>
  );
}
