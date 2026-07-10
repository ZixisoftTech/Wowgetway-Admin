import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit2, 
  Trash2, 
  User, 
  ArrowLeft, 
  Upload, 
  FileText, 
  Download, 
  ExternalLink,
  Check,
  Building
} from 'lucide-react';

const API_BASE_URL = (window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app') + '/api/dashboard/employees-list';

// Fetch staff helper supporting server-side query params
const fetchStaffList = async ({ queryKey }) => {
  const [_, { page, limit, search, sortBy, sortOrder, status, role }] = queryKey;
  const response = await axios.get(API_BASE_URL, {
    params: { page, limit, search, sortBy, sortOrder, status, role }
  });
  return response.data;
};

// Fetch single staff details helper
const fetchStaffDetails = async (id) => {
  const response = await axios.get(`${API_BASE_URL}/${id}`);
  return response.data;
};

export default function StaffManagement() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'add' | 'edit' | 'details'
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination & Server-side Table States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // 1. React Query fetch queries
  const { data: staffData = { data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } }, isLoading: listLoading, isError } = useQuery({
    queryKey: ['staffList', { page: currentPage, limit: itemsPerPage, search: searchQuery, sortBy, sortOrder, status: statusFilter, role: roleFilter }],
    queryFn: fetchStaffList
  });

  const staffList = staffData.data || [];
  const pagination = staffData.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const { data: staffDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['staffDetails', selectedId],
    queryFn: () => fetchStaffDetails(selectedId),
    enabled: !!selectedId && (viewMode === 'details' || viewMode === 'edit')
  });

  // 2. React Query mutations
  const createMutation = useMutation({
    mutationFn: async (newEmp) => {
      const response = await axios.post(API_BASE_URL, newEmp);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staffList']);
      setViewMode('list');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updatedData }) => {
      const response = await axios.put(`${API_BASE_URL}/${id}`, updatedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staffList']);
      queryClient.invalidateQueries(['staffDetails', selectedId]);
      setViewMode('list');
      setSelectedId(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await axios.delete(`${API_BASE_URL}/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staffList']);
    }
  });

  // Initial form state
  const initialFormState = {
    firstName: '',
    lastName: '',
    fatherName: '',
    aadharNo: '',
    panNo: '',
    role: '',
    mobile: '',
    email: '',
    status: 'Active',
    avatar: '',
    monthlySalary: '',
    basicSalary: '',
    hra: '',
    da: '',
    specialAllowance: '',
    otherAllowance: '',
    pfContribution: '',
    esiContribution: '',
    tempAddress: { line1: '', line2: '', landmark: '', state: '', city: '', pinCode: '' },
    permAddress: { line1: '', line2: '', landmark: '', state: '', city: '', pinCode: '' },
    bank: { bankName: '', accountNumber: '', ifscCode: '', upiId: '' },
    documents: { aadharFront: '', aadharBack: '', panFront: '', panBack: '', drivingLicense: '', voterId: '', profilePhoto: '' }
  };

  const [formData, setFormData] = useState(initialFormState);
  const [sameAsTemp, setSameAsTemp] = useState(false);

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSameAddressToggle = (e) => {
    const isChecked = e.target.checked;
    setSameAsTemp(isChecked);
    if (isChecked) {
      setFormData(prev => ({
        ...prev,
        permAddress: { ...prev.tempAddress }
      }));
    }
  };

  const handleEditClick = (emp) => {
    setSelectedId(emp._id);
    setFormData({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      fatherName: emp.fatherName || '',
      aadharNo: emp.aadharNo || '',
      panNo: emp.panNo || '',
      role: emp.role || '',
      mobile: emp.mobile || '',
      email: emp.email || '',
      status: emp.status || 'Active',
      avatar: emp.avatar || '',
      monthlySalary: emp.monthlySalary || '',
      basicSalary: emp.basicSalary || '',
      hra: emp.hra || '',
      da: emp.da || '',
      specialAllowance: emp.specialAllowance || '',
      otherAllowance: emp.otherAllowance || '',
      pfContribution: emp.pfContribution || '',
      esiContribution: emp.esiContribution || '',
      tempAddress: emp.tempAddress || { line1: '', line2: '', landmark: '', state: '', city: '', pinCode: '' },
      permAddress: emp.permAddress || { line1: '', line2: '', landmark: '', state: '', city: '', pinCode: '' },
      bank: emp.bank || { bankName: '', accountNumber: '', ifscCode: '', upiId: '' },
      documents: emp.documents || { aadharFront: '', aadharBack: '', panFront: '', panBack: '', drivingLicense: '', voterId: '', profilePhoto: '' }
    });
    setSameAsTemp(false);
    setViewMode('edit');
  };

  const handleAddClick = () => {
    setFormData(initialFormState);
    setSameAsTemp(false);
    setSelectedId(null);
    setViewMode('add');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Auto-calculate basic salaries / allowances if not set
    const dataToSend = {
      ...formData,
      monthlySalary: Number(formData.monthlySalary) || 0,
      basicSalary: Number(formData.basicSalary) || Number(formData.monthlySalary) * 0.6 || 0,
      hra: Number(formData.hra) || Number(formData.monthlySalary) * 0.2 || 0,
      da: Number(formData.da) || Number(formData.monthlySalary) * 0.1 || 0,
      pfContribution: Number(formData.pfContribution) || 3600,
      permAddress: sameAsTemp ? { ...formData.tempAddress } : { ...formData.permAddress }
    };

    if (viewMode === 'add') {
      createMutation.mutate(dataToSend);
    } else {
      updateMutation.mutate({ id: selectedId, updatedData: dataToSend });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredStaff = staffList;

  // Fade up container presets
  const layoutVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. LIST VIEW */}
      {viewMode === 'list' && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
                Staff Management
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Manage employees and staff records.
              </p>
            </div>
            
            <button
              onClick={handleAddClick}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all cursor-pointer"
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span>Add Employee</span>
            </button>
          </div>

          {/* Search Filter Box */}
          <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
            <div className="relative max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search by name, email, or mobile..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Responsive Data Table */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Employee Name</th>
                    <th className="py-4 px-6">Mobile Number</th>
                    <th className="py-4 px-6">Email</th>
                    <th className="py-4 px-6">Job Title</th>
                    <th className="py-4 px-6">Joining Date</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6">Created By</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                  {listLoading ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        <div className="flex justify-center gap-1.5 items-center">
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-75" />
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-150" />
                        </div>
                      </td>
                    </tr>
                  ) : filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-450">
                        No employees found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((emp) => {
                      const joiningDate = emp.createdAt 
                        ? new Date(emp.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
                        : '30-03-2024';

                      return (
                        <tr key={emp._id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <img
                                src={emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                                alt={`${emp.firstName} ${emp.lastName}`}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-100 flex-shrink-0"
                              />
                              <span className="font-bold text-slate-800">
                                {emp.firstName} {emp.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-600">{emp.mobile}</td>
                          <td className="py-4 px-6 text-slate-500 font-medium">{emp.email}</td>
                          <td className="py-4 px-6">
                            <span className="bg-slate-100 text-slate-650 px-2 py-1 rounded-md text-[10px] font-bold">
                              {emp.role}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-medium">{joiningDate}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide ${
                              emp.status === 'Active' 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-rose-50 text-rose-700'
                            }`}>
                              {emp.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-medium">{emp.createdBy || 'Rahul Sharma'}</td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2.5">
                              <button
                                onClick={() => { setSelectedId(emp._id); setViewMode('details'); }}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="View details"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => handleEditClick(emp)}
                                className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit employee"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(emp._id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete employee"
                              >
                                <Trash2 size={15} />
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
            <div className="bg-white border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, pagination.total)} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} employees
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
          </div>
        </motion.div>
      )}

      {/* 2. FORM VIEW (ADD / EDIT) */}
      {(viewMode === 'add' || viewMode === 'edit') && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('list')}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-150 rounded-xl bg-white border border-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
                {viewMode === 'add' ? 'Create New Employee' : 'Edit Employee Details'}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Provide onboarding, documents, addresses, and payroll profiles.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 pb-20">
            {/* Split layout in grid cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              
              {/* Card A: Personal Details */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-600">
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => handleInputChange(null, 'firstName', e.target.value)}
                      placeholder="Enter first name"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => handleInputChange(null, 'lastName', e.target.value)}
                      placeholder="Enter last name"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Father Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.fatherName}
                      onChange={(e) => handleInputChange(null, 'fatherName', e.target.value)}
                      placeholder="Enter father name"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Job Title / Role *</label>
                    <input
                      type="text"
                      required
                      value={formData.role}
                      onChange={(e) => handleInputChange(null, 'role', e.target.value)}
                      placeholder="e.g. Manager"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={formData.mobile}
                      onChange={(e) => handleInputChange(null, 'mobile', e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange(null, 'email', e.target.value)}
                      placeholder="Enter email address"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Aadhar Card No *</label>
                    <input
                      type="text"
                      required
                      value={formData.aadharNo}
                      onChange={(e) => handleInputChange(null, 'aadharNo', e.target.value)}
                      placeholder="12-digit Aadhar"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">PAN Card No *</label>
                    <input
                      type="text"
                      required
                      value={formData.panNo}
                      onChange={(e) => handleInputChange(null, 'panNo', e.target.value)}
                      placeholder="Enter PAN (10 chars)"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>

              {/* Card B: Salary Information */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-600">
                  Salary Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Monthly Salary (CTC) *</label>
                    <input
                      type="number"
                      required
                      value={formData.monthlySalary}
                      onChange={(e) => handleInputChange(null, 'monthlySalary', e.target.value)}
                      placeholder="Enter Monthly CTC (₹)"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Basic Salary</label>
                    <input
                      type="number"
                      value={formData.basicSalary}
                      onChange={(e) => handleInputChange(null, 'basicSalary', e.target.value)}
                      placeholder="Auto calculates if empty"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">HRA (House Rent Allowance)</label>
                    <input
                      type="number"
                      value={formData.hra}
                      onChange={(e) => handleInputChange(null, 'hra', e.target.value)}
                      placeholder="Enter HRA (₹)"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">DA (Dearness Allowance)</label>
                    <input
                      type="number"
                      value={formData.da}
                      onChange={(e) => handleInputChange(null, 'da', e.target.value)}
                      placeholder="Enter DA (₹)"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Special Allowance</label>
                    <input
                      type="number"
                      value={formData.specialAllowance}
                      onChange={(e) => handleInputChange(null, 'specialAllowance', e.target.value)}
                      placeholder="Enter special allowance"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Other Allowance</label>
                    <input
                      type="number"
                      value={formData.otherAllowance}
                      onChange={(e) => handleInputChange(null, 'otherAllowance', e.target.value)}
                      placeholder="Enter other allowance"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Deductions Sub-Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Deductions (Monthly)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">PF Contribution</label>
                      <input
                        type="number"
                        value={formData.pfContribution}
                        onChange={(e) => handleInputChange(null, 'pfContribution', e.target.value)}
                        placeholder="₹3,600"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">ESI Contribution</label>
                      <input
                        type="number"
                        value={formData.esiContribution}
                        onChange={(e) => handleInputChange(null, 'esiContribution', e.target.value)}
                        placeholder="₹1,500"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card C: Temporary Address */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-600">
                  Temporary Address
                </h3>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Address Line 1</label>
                  <input
                    type="text"
                    value={formData.tempAddress.line1}
                    onChange={(e) => handleInputChange('tempAddress', 'line1', e.target.value)}
                    placeholder="Enter street, apartment no."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Address Line 2</label>
                  <input
                    type="text"
                    value={formData.tempAddress.line2}
                    onChange={(e) => handleInputChange('tempAddress', 'line2', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Landmark</label>
                    <input
                      type="text"
                      value={formData.tempAddress.landmark}
                      onChange={(e) => handleInputChange('tempAddress', 'landmark', e.target.value)}
                      placeholder="e.g. Near Station"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">State</label>
                    <input
                      type="text"
                      value={formData.tempAddress.state}
                      onChange={(e) => handleInputChange('tempAddress', 'state', e.target.value)}
                      placeholder="e.g. Maharashtra"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">City</label>
                    <input
                      type="text"
                      value={formData.tempAddress.city}
                      onChange={(e) => handleInputChange('tempAddress', 'city', e.target.value)}
                      placeholder="e.g. Mumbai"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pin Code</label>
                    <input
                      type="text"
                      value={formData.tempAddress.pinCode}
                      onChange={(e) => handleInputChange('tempAddress', 'pinCode', e.target.value)}
                      placeholder="6-digit PIN"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Card D: Permanent Address */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest text-indigo-600">
                    Permanent Address
                  </h3>
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={sameAsTemp} 
                      onChange={handleSameAddressToggle} 
                      className="rounded text-blue-600 focus:ring-0" 
                    />
                    <span>Same as Temporary</span>
                  </label>
                </div>

                {!sameAsTemp ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Address Line 1</label>
                      <input
                        type="text"
                        value={formData.permAddress.line1}
                        onChange={(e) => handleInputChange('permAddress', 'line1', e.target.value)}
                        placeholder="Enter street, apartment no."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Address Line 2</label>
                      <input
                        type="text"
                        value={formData.permAddress.line2}
                        onChange={(e) => handleInputChange('permAddress', 'line2', e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Landmark</label>
                        <input
                          type="text"
                          value={formData.permAddress.landmark}
                          onChange={(e) => handleInputChange('permAddress', 'landmark', e.target.value)}
                          placeholder="e.g. Near Station"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">State</label>
                        <input
                          type="text"
                          value={formData.permAddress.state}
                          onChange={(e) => handleInputChange('permAddress', 'state', e.target.value)}
                          placeholder="e.g. Maharashtra"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">City</label>
                        <input
                          type="text"
                          value={formData.permAddress.city}
                          onChange={(e) => handleInputChange('permAddress', 'city', e.target.value)}
                          placeholder="e.g. Mumbai"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pin Code</label>
                        <input
                          type="text"
                          value={formData.permAddress.pinCode}
                          onChange={(e) => handleInputChange('permAddress', 'pinCode', e.target.value)}
                          placeholder="6-digit PIN"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs font-semibold italic border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    Same address as temporary coordinates loaded.
                  </div>
                )}
              </div>

              {/* Card E: Bank Details */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-600">
                  Bank Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bank Name</label>
                    <input
                      type="text"
                      value={formData.bank.bankName}
                      onChange={(e) => handleInputChange('bank', 'bankName', e.target.value)}
                      placeholder="e.g. HDFC Bank"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Account Number</label>
                    <input
                      type="text"
                      value={formData.bank.accountNumber}
                      onChange={(e) => handleInputChange('bank', 'accountNumber', e.target.value)}
                      placeholder="Enter account number"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">IFSC Code</label>
                    <input
                      type="text"
                      value={formData.bank.ifscCode}
                      onChange={(e) => handleInputChange('bank', 'ifscCode', e.target.value)}
                      placeholder="e.g. HDFC0001234"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">UPI ID</label>
                    <input
                      type="text"
                      value={formData.bank.upiId}
                      onChange={(e) => handleInputChange('bank', 'upiId', e.target.value)}
                      placeholder="e.g. name@upi"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Card F: Document Uploads Section */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-600">
                  Document Uploads
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['Aadhar Front', 'Aadhar Back', 'PAN Front', 'PAN Back', 'Driving License', 'Voter ID', 'Profile Photo'].map((docName) => {
                    const keyMap = {
                      'Aadhar Front': 'aadharFront',
                      'Aadhar Back': 'aadharBack',
                      'PAN Front': 'panFront',
                      'PAN Back': 'panBack',
                      'Driving License': 'drivingLicense',
                      'Voter ID': 'voterId',
                      'Profile Photo': 'profilePhoto'
                    };
                    const docKey = keyMap[docName];
                    const hasFile = !!formData.documents[docKey];

                    return (
                      <div 
                        key={docName} 
                        onClick={() => handleInputChange('documents', docKey, `${docKey}_uploaded.jpg`)}
                        className={`border border-dashed p-3 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50/50 transition-all ${
                          hasFile ? 'border-blue-400 bg-blue-50/10' : 'border-slate-200'
                        }`}
                      >
                        <Upload size={14} className={hasFile ? 'text-blue-500' : 'text-slate-400'} />
                        <span className="text-[9px] font-bold text-slate-600 mt-1.5 block">
                          {docName}
                        </span>
                        <span className="text-[7px] text-slate-400 mt-0.5 uppercase tracking-wider block">
                          {hasFile ? 'Uploaded ✓' : 'Click to Upload'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Sticky Action Footer Bar */}
            <div className="fixed bottom-0 right-0 left-0 lg:left-64 bg-white/85 backdrop-blur-md border-t border-slate-100 py-4 px-6 flex justify-end gap-3 z-10 shadow-lg">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all cursor-pointer"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Employee'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* 3. DETAILS VIEW */}
      {viewMode === 'details' && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setViewMode('list'); setSelectedId(null); }}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-150 rounded-xl bg-white border border-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
                Employee Profile Details
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Onboarding profiles and bank records.
              </p>
            </div>
          </div>

          {detailsLoading ? (
            <div className="py-24 text-center">
              <span className="text-xs font-bold text-slate-400">Loading profile details...</span>
            </div>
          ) : !staffDetails ? (
            <div className="py-24 text-center">
              <span className="text-xs font-bold text-slate-400 text-rose-500">Employee profile details not found.</span>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Profile Main Header Card */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-6 -mt-6 opacity-40 group-hover:scale-110 transition-transform duration-500" />
                <img
                  src={staffDetails.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={staffDetails.firstName}
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-150 shadow-sm relative z-10 flex-shrink-0"
                />
                <div className="text-center sm:text-left space-y-1 z-10 flex-1">
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <h3 className="text-lg font-black text-slate-850">
                      {staffDetails.firstName} {staffDetails.lastName}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                      staffDetails.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {staffDetails.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold">{staffDetails.role}</p>
                  <div className="text-[10px] font-bold text-slate-450 uppercase mt-2 block tracking-wider">
                    Employee ID: <span className="text-slate-800">{staffDetails._id}</span>
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2 z-10">
                  <button 
                    onClick={() => handleEditClick(staffDetails)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-650 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
                  >
                    <Edit2 size={11} />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>

              {/* Data Segment Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                
                {/* 1. Personal & Contact Information */}
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4.5">
                  <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-600">
                    Personal & Contact details
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">First Name</span>
                      <span className="text-xs font-bold text-slate-750 block">{staffDetails.firstName}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Last Name</span>
                      <span className="text-xs font-bold text-slate-750 block">{staffDetails.lastName}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Father Name</span>
                      <span className="text-xs font-bold text-slate-750 block">{staffDetails.fatherName}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Job Title</span>
                      <span className="text-xs font-bold text-slate-750 block">{staffDetails.role}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-50/50 pt-3">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Mobile Number</span>
                      <span className="text-xs font-bold text-slate-750 block">{staffDetails.mobile}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                      <span className="text-xs font-bold text-slate-750 block">{staffDetails.email}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-50/50 pt-3">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Aadhar Card No</span>
                      <span className="text-xs font-bold text-slate-750 block">{staffDetails.aadharNo}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">PAN Card No</span>
                      <span className="text-xs font-bold text-slate-750 block">{staffDetails.panNo}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Salary Information Card */}
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4.5">
                  <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-600">
                    Salary Details
                  </h3>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#ecfbf3] p-3.5 rounded-xl border border-emerald-100/40">
                      <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wider block">Monthly CTC</span>
                      <span className="text-lg font-black text-slate-800 mt-1 block">
                        ₹{(staffDetails.monthlySalary || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Basic Salary</span>
                      <span className="text-sm font-bold text-slate-850 mt-1.5 block">
                        ₹{(staffDetails.basicSalary || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">HRA</span>
                      <span className="text-sm font-bold text-slate-850 mt-1.5 block">
                        ₹{(staffDetails.hra || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 border-t border-slate-50/50 pt-3 text-[10px] font-bold text-slate-500">
                    <div>
                      <span className="text-[8px] text-slate-400 block uppercase">DA</span>
                      <span className="text-slate-850">₹{(staffDetails.da || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 block uppercase">Special</span>
                      <span className="text-slate-850">₹{(staffDetails.specialAllowance || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 block uppercase">Others</span>
                      <span className="text-slate-850">₹{(staffDetails.otherAllowance || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 block uppercase text-rose-500">PF Deduction</span>
                      <span className="text-rose-600 font-bold">-₹{(staffDetails.pfContribution || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Temporary & Permanent Addresses */}
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                    
                    {/* Temp address info */}
                    <div className="space-y-3 pr-2">
                      <h4 className="text-[10px] font-black text-indigo-650 uppercase tracking-widest">Temporary Address</h4>
                      <div className="space-y-1 text-xs font-semibold text-slate-700">
                        <p className="font-bold text-slate-800">{staffDetails.tempAddress?.line1 || 'N/A'}</p>
                        {staffDetails.tempAddress?.line2 && <p>{staffDetails.tempAddress.line2}</p>}
                        {staffDetails.tempAddress?.landmark && <p className="text-[10px] text-slate-400 font-medium">Landmark: {staffDetails.tempAddress.landmark}</p>}
                        <p>{staffDetails.tempAddress?.city}, {staffDetails.tempAddress?.state}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 block">PIN: {staffDetails.tempAddress?.pinCode}</p>
                      </div>
                    </div>

                    {/* Perm address info */}
                    <div className="space-y-3 pt-4 sm:pt-0 sm:pl-5">
                      <h4 className="text-[10px] font-black text-indigo-650 uppercase tracking-widest">Permanent Address</h4>
                      <div className="space-y-1 text-xs font-semibold text-slate-700">
                        <p className="font-bold text-slate-800">{staffDetails.permAddress?.line1 || 'N/A'}</p>
                        {staffDetails.permAddress?.line2 && <p>{staffDetails.permAddress.line2}</p>}
                        {staffDetails.permAddress?.landmark && <p className="text-[10px] text-slate-400 font-medium">Landmark: {staffDetails.permAddress.landmark}</p>}
                        <p>{staffDetails.permAddress?.city}, {staffDetails.permAddress?.state}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 block">PIN: {staffDetails.permAddress?.pinCode}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Bank Account Details */}
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-600">
                    Bank Details
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Bank Name</span>
                      <span className="text-xs font-bold text-slate-755 block">{staffDetails.bank?.bankName || 'N/A'}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Account Number</span>
                      <span className="text-xs font-bold text-slate-755 block">{staffDetails.bank?.accountNumber || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-50/50 pt-3">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">IFSC Code</span>
                      <span className="text-xs font-bold text-slate-755 block">{staffDetails.bank?.ifscCode || 'N/A'}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">UPI ID</span>
                      <span className="text-xs font-bold text-slate-755 block">{staffDetails.bank?.upiId || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* 5. Document Details (Previews & Actions) */}
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
                  <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-600">
                    Document Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { name: 'Aadhar Card Front', key: 'aadharFront' },
                      { name: 'Aadhar Card Back', key: 'aadharBack' },
                      { name: 'PAN Card Front', key: 'panFront' },
                      { name: 'PAN Card Back', key: 'panBack' }
                    ].map((doc) => {
                      const docVal = staffDetails.documents?.[doc.key];
                      const isUploaded = !!docVal;

                      return (
                        <div key={doc.key} className="border border-slate-100 p-3.5 rounded-xl bg-slate-50/40 flex flex-col justify-between h-32 group">
                          <div>
                            <span className="text-[10px] font-bold text-slate-700 block">{doc.name}</span>
                            <span className="text-[8px] text-slate-400 mt-0.5 uppercase tracking-wide block">
                              {isUploaded ? 'UPLOADED ✓' : 'MISSING ✗'}
                            </span>
                          </div>
                          
                          {isUploaded ? (
                            <div className="flex gap-2.5 mt-2">
                              <button
                                onClick={() => alert(`Viewing document: ${docVal}`)}
                                className="flex items-center gap-1 text-[9px] font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all cursor-pointer"
                              >
                                <ExternalLink size={10} />
                                <span>View</span>
                              </button>
                              <a
                                href="#download"
                                onClick={(e) => { e.preventDefault(); alert(`Downloading file: ${docVal}`); }}
                                className="flex items-center gap-1 text-[9px] font-bold text-slate-500 hover:text-slate-800 hover:underline transition-all"
                              >
                                <Download size={10} />
                                <span>Download</span>
                              </a>
                            </div>
                          ) : (
                            <span className="text-[8px] text-slate-400 italic mt-2">No file uploaded.</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
