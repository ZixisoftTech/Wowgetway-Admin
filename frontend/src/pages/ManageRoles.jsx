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
  ShieldCheck, 
  Users, 
  KeyRound, 
  Lock, 
  ArrowLeft, 
  Check, 
  X, 
  Info, 
  Layers, 
  Settings,
  Calendar,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

const API_ROLES_URL = 'http://localhost:5005/api/dashboard/roles';
const API_EMPLOYEES_URL = 'http://localhost:5005/api/dashboard/employees-list';
const API_ASSIGN_URL = 'http://localhost:5005/api/dashboard/employees-assign-role';

// Fetch lists helpers
const fetchRolesList = async () => {
  const response = await axios.get(API_ROLES_URL);
  return response.data;
};

const fetchEmployeesList = async () => {
  const response = await axios.get(API_EMPLOYEES_URL);
  return response.data;
};

const modulesList = [
  'Dashboard',
  'Staff Management',
  'Roles & Permissions',
  'Attendance',
  'Salary Management',
  'Manage Homestays',
  'Manage Bookings',
  'Manage Users',
  'Manage Drivers',
  'Payments',
  'Reports'
];

export default function ManageRoles() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState('roles'); // 'roles' | 'assignment'
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'add' | 'edit' | 'details'
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  
  // Search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Assign Role Modal Dialog State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assignForm, setAssignForm] = useState({
    roleName: '',
    department: 'Operations',
    effectiveDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // 1. Fetch queries
  const { data: rolesList = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['rolesList'],
    queryFn: fetchRolesList
  });

  const { data: staffList = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staffList'],
    queryFn: fetchEmployeesList
  });

  // Get selected role details
  const selectedRole = rolesList.find(r => r._id === selectedRoleId);

  // 2. Mutations
  const createRoleMutation = useMutation({
    mutationFn: async (newRole) => {
      const response = await axios.post(API_ROLES_URL, newRole);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rolesList']);
      setViewMode('list');
      resetRoleForm();
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, updatedData }) => {
      const response = await axios.put(`${API_ROLES_URL}/${id}`, updatedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rolesList']);
      setViewMode('list');
      setSelectedRoleId(null);
      resetRoleForm();
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id) => {
      const response = await axios.delete(`${API_ROLES_URL}/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rolesList']);
    }
  });

  const assignRoleMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await axios.post(API_ASSIGN_URL, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staffList']);
      setAssignModalOpen(false);
      setSelectedEmployee(null);
    }
  });

  // Dedicated Form State for Create / Edit Roles
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: modulesList.map(mod => ({
      module: mod,
      view: false,
      add: false,
      edit: false,
      delete: false
    }))
  });

  const resetRoleForm = () => {
    setRoleForm({
      name: '',
      description: '',
      permissions: modulesList.map(mod => ({
        module: mod,
        view: false,
        add: false,
        edit: false,
        delete: false
      }))
    });
  };

  // Matrix Checkbox helpers
  const handleMatrixChange = (moduleIndex, field, value) => {
    const updatedPermissions = [...roleForm.permissions];
    if (field === 'all') {
      updatedPermissions[moduleIndex] = {
        ...updatedPermissions[moduleIndex],
        view: value,
        add: value,
        edit: value,
        delete: value
      };
    } else {
      updatedPermissions[moduleIndex] = {
        ...updatedPermissions[moduleIndex],
        [field]: value
      };
    }
    setRoleForm(prev => ({
      ...prev,
      permissions: updatedPermissions
    }));
  };

  const handleRoleSubmit = (e) => {
    e.preventDefault();
    if (!roleForm.name.trim()) return alert('Role name is required.');
    
    if (viewMode === 'add') {
      createRoleMutation.mutate(roleForm);
    } else if (viewMode === 'edit') {
      updateRoleMutation.mutate({ id: selectedRoleId, updatedData: roleForm });
    }
  };

  const handleEditClick = (role) => {
    setSelectedRoleId(role._id);
    // Align permissions checklist
    const mappedPermissions = modulesList.map(mod => {
      const match = (role.permissions || []).find(p => p.module === mod);
      return {
        module: mod,
        view: match ? !!match.view : false,
        add: match ? !!match.add : false,
        edit: match ? !!match.edit : false,
        delete: match ? !!match.delete : false
      };
    });
    setRoleForm({
      name: role.name,
      description: role.description || '',
      permissions: mappedPermissions
    });
    setViewMode('edit');
  };

  const handleDeleteRole = (id, name) => {
    if (window.confirm(`Are you sure you want to delete the "${name}" role?`)) {
      deleteRoleMutation.mutate(id);
    }
  };

  // Open assign role dialog
  const handleOpenAssignModal = (employee) => {
    setSelectedEmployee(employee);
    setAssignForm({
      roleName: employee.role || '',
      department: employee.department || 'Operations',
      effectiveDate: employee.roleAssignedDate ? new Date(employee.roleAssignedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      notes: employee.roleNotes || ''
    });
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    assignRoleMutation.mutate({
      employeeId: selectedEmployee._id,
      roleName: assignForm.roleName,
      department: assignForm.department,
      effectiveDate: assignForm.effectiveDate,
      notes: assignForm.notes
    });
  };

  // Filter computations
  const filteredRoles = rolesList.filter(role => {
    const name = (role.name || '').toLowerCase();
    const desc = (role.description || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || desc.includes(query);
  });

  const filteredStaff = staffList.filter(emp => {
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const empId = (emp._id || '').toLowerCase();
    const dept = (emp.department || '').toLowerCase();
    const query = assignSearchQuery.toLowerCase();
    
    const matchesQuery = fullName.includes(query) || empId.includes(query) || dept.includes(query);
    const matchesRole = roleFilter === 'All' || emp.role === roleFilter;

    return matchesQuery && matchesRole;
  });

  // Count employees assigned to each role helper
  const getAssignedCount = (roleName) => {
    return staffList.filter(emp => emp.role === roleName).length;
  };

  // Get total permissions count for a role
  const getPermissionMetrics = (permissions = []) => {
    let modulesCount = 0;
    let totalPerms = 0;
    permissions.forEach(p => {
      const activeCount = (p.view ? 1 : 0) + (p.add ? 1 : 0) + (p.edit ? 1 : 0) + (p.delete ? 1 : 0);
      if (activeCount > 0) modulesCount++;
      totalPerms += activeCount;
    });
    return { modulesCount, totalPerms };
  };

  // Fade up layout transitions
  const layoutVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      
      {/* Page Title & Tab Switcher Header */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
                Roles & Permissions Management
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Create roles, define modular permissions, and assign employee access coordinates.
              </p>
            </div>
            
            {activeSubTab === 'roles' && (
              <button
                onClick={() => { resetRoleForm(); setViewMode('add'); }}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all cursor-pointer"
              >
                <Plus size={14} className="stroke-[2.5]" />
                <span>Create New Role</span>
              </button>
            )}
          </div>

          {/* Sub Tab Switcher */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => { setActiveSubTab('roles'); setSearchQuery(''); }}
              className={`px-5 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeSubTab === 'roles' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-655'
              }`}
            >
              Role Management
            </button>
            <button
              onClick={() => { setActiveSubTab('assignment'); setAssignSearchQuery(''); setRoleFilter('All'); }}
              className={`px-5 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeSubTab === 'assignment' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-655'
              }`}
            >
              Employee Role Assignment
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Row (Visible in List View) */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="bg-[#edf4ff] p-5 rounded-2xl border border-blue-50 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Total Roles</span>
              <span className="text-xl font-black text-slate-800 block">{rolesList.length}</span>
              <span className="text-[9px] text-slate-400 font-semibold block">Active in deployment</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
              <ShieldCheck size={20} className="stroke-[2.2]" />
            </div>
          </div>

          <div className="bg-[#ecfbf3] p-5 rounded-2xl border border-emerald-50 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Active Roles</span>
              <span className="text-xl font-black text-slate-800 block">{rolesList.length}</span>
              <span className="text-[9px] text-slate-400 font-semibold block">Fully operational status</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-650 shadow-sm">
              <KeyRound size={20} className="stroke-[2.2]" />
            </div>
          </div>

          <div className="bg-[#f8f0ff] p-5 rounded-2xl border border-purple-50 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Employees Assigned</span>
              <span className="text-xl font-black text-slate-800 block">
                {staffList.filter(e => e.role && e.role !== 'None').length}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold block">Active staff links</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-purple-650 shadow-sm">
              <Users size={20} className="stroke-[2.2]" />
            </div>
          </div>

          <div className="bg-[#fff8f0] p-5 rounded-2xl border border-orange-50 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">Permission Groups</span>
              <span className="text-xl font-black text-slate-800 block">{modulesList.length}</span>
              <span className="text-[9px] text-slate-400 font-semibold block">Registered system modules</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-orange-650 shadow-sm">
              <Lock size={20} className="stroke-[2.2]" />
            </div>
          </div>
        </div>
      )}

      {/* -------------------- 1. ROLE MANAGEMENT TAB -------------------- */}
      {viewMode === 'list' && activeSubTab === 'roles' && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
          {/* Search Filter Box */}
          <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
            <div className="relative max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roles by name or description..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Role Tabular List */}
          {rolesLoading ? (
            <div className="py-24 text-center text-slate-400 text-xs font-semibold">
              Loading roles list database...
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="bg-white border border-slate-100 p-12 text-center rounded-2xl shadow-sm">
              <span className="text-xs font-bold text-slate-400">No roles defined. Click "Create New Role" to get started.</span>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Role Name</th>
                      <th className="py-4 px-6">Description</th>
                      <th className="py-4 px-6 text-center">Permissions</th>
                      <th className="py-4 px-6 text-center">Modules Allowed</th>
                      <th className="py-4 px-6 text-center">Assigned Employees</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                    {filteredRoles.map(role => {
                      const metrics = getPermissionMetrics(role.permissions);
                      const assignedStaffCount = getAssignedCount(role.name);
                      return (
                        <tr key={role._id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-4 px-6 font-bold text-slate-800">
                            <div className="flex items-center gap-2">
                              <span>{role.name}</span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[8px] font-black uppercase">
                                System
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-medium max-w-sm truncate">
                            {role.description || 'No description provided.'}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="bg-[#f8f0ff] text-purple-700 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                              {metrics.totalPerms} Active
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="bg-[#edf4ff] text-blue-600 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                              {metrics.modulesCount} / 11
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="bg-[#ecfbf3] text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                              {assignedStaffCount} Staff
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2.5">
                              <button
                                onClick={() => { setSelectedRoleId(role._id); setViewMode('details'); }}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                title="View detailed permissions"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => handleEditClick(role)}
                                className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                                title="Edit permissions matrix"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteRole(role._id, role.name)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title="Delete role"
                                disabled={role.name === 'Super Admin'}
                              >
                                <Trash2 size={15} className={role.name === 'Super Admin' ? 'opacity-30' : ''} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Showing {filteredRoles.length} of {rolesList.length} roles</span>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* -------------------- 2. EMPLOYEE ROLE ASSIGNMENT TAB -------------------- */}
      {viewMode === 'list' && activeSubTab === 'assignment' && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
          {/* Filters Row */}
          <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4.5 justify-between">
            <div className="relative max-w-md w-full">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={assignSearchQuery}
                onChange={(e) => setAssignSearchQuery(e.target.value)}
                placeholder="Search staff name, employee ID, or department..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-655 rounded-xl focus:outline-none focus:ring-2 shadow-sm cursor-pointer"
              >
                <option value="All">All Roles</option>
                {rolesList.map(role => (
                  <option key={role._id} value={role.name}>{role.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Employee Name</th>
                    <th className="py-4 px-6">Employee ID</th>
                    <th className="py-4 px-6">Department</th>
                    <th className="py-4 px-6">Current Role</th>
                    <th className="py-4 px-6">Assigned Date</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                  {staffLoading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        Loading employees coordinates...
                      </td>
                    </tr>
                  ) : filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-450">
                        No employees found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map(emp => {
                      const assignedDate = emp.roleAssignedDate 
                        ? new Date(emp.roleAssignedDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
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
                          <td className="py-4 px-6 text-slate-500 font-medium">#{emp._id}</td>
                          <td className="py-4 px-6 text-slate-650">{emp.department || 'Operations'}</td>
                          <td className="py-4 px-6">
                            <span className="bg-slate-100 text-slate-655 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                              {emp.role || 'Unassigned'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-medium">{assignedDate}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide ${emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {emp.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleOpenAssignModal(emp)}
                              className="px-3.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                            >
                              {emp.role ? 'Change Role' : 'Assign Role'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Showing {filteredStaff.length} of {staffList.length} employees</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* -------------------- 3. CREATE / EDIT DEDICATED PAGE -------------------- */}
      {(viewMode === 'add' || viewMode === 'edit') && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
          
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setViewMode('list'); resetRoleForm(); }}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-105 rounded-xl bg-white border border-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
                {viewMode === 'add' ? 'Create New Role' : 'Edit Role Access'}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Set role title, narrative description, and checklist access matrix variables.
              </p>
            </div>
          </div>

          <form onSubmit={handleRoleSubmit} className="space-y-6 pb-20">
            {/* Row Grid */}
            <div className="grid grid-cols-1 gap-6 sm:gap-8">
              
              {/* Section 1: Basic Information */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 border-b border-slate-55 pb-2.5 uppercase tracking-widest text-indigo-600">
                  Basic Role Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Role Name / Identifier *
                    </label>
                    <input
                      type="text"
                      required
                      value={roleForm.name}
                      onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Sales Coordinator"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      disabled={viewMode === 'edit' && roleForm.name === 'Super Admin'}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Short Description / Responsibilities
                    </label>
                    <input
                      type="text"
                      value={roleForm.description}
                      onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="What responsibilities does this staff role handle?"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Permissions Matrix Card */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest text-indigo-600">
                    Permissions Access Matrix
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 italic">
                    Select All to automatically inherit sub-permissions
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-4 px-6">System Module</th>
                        <th className="py-4 px-6 text-center">View</th>
                        <th className="py-4 px-6 text-center">Add</th>
                        <th className="py-4 px-6 text-center">Edit</th>
                        <th className="py-4 px-6 text-center">Delete</th>
                        <th className="py-4 px-6 text-center bg-blue-50/20 text-blue-600">All Permissions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                      {roleForm.permissions.map((perm, index) => {
                        const allChecked = perm.view && perm.add && perm.edit && perm.delete;
                        return (
                          <tr key={perm.module} className="hover:bg-slate-50/20 transition-colors">
                            <td className="py-3 px-6 font-bold text-slate-800">{perm.module}</td>
                            
                            <td className="py-3 px-6 text-center">
                              <input
                                type="checkbox"
                                checked={perm.view}
                                onChange={(e) => handleMatrixChange(index, 'view', e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 border-slate-200 focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-6 text-center">
                              <input
                                type="checkbox"
                                checked={perm.add}
                                onChange={(e) => handleMatrixChange(index, 'add', e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 border-slate-200 focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-6 text-center">
                              <input
                                type="checkbox"
                                checked={perm.edit}
                                onChange={(e) => handleMatrixChange(index, 'edit', e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 border-slate-200 focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-6 text-center">
                              <input
                                type="checkbox"
                                checked={perm.delete}
                                onChange={(e) => handleMatrixChange(index, 'delete', e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 border-slate-200 focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-6 text-center bg-blue-50/10">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                onChange={(e) => handleMatrixChange(index, 'all', e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600 border-indigo-200 focus:ring-0 cursor-pointer"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Bottom Actions Footer */}
            <div className="fixed bottom-0 right-0 left-0 lg:left-64 bg-white/85 backdrop-blur-md border-t border-slate-100 py-4 px-6 flex justify-end gap-3 z-10 shadow-lg">
              <button
                type="button"
                onClick={() => { setViewMode('list'); resetRoleForm(); }}
                className="px-5 py-2.5 border border-slate-200 text-slate-655 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all cursor-pointer"
              >
                {createRoleMutation.isPending || updateRoleMutation.isPending ? 'Saving...' : 'Save Role'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* -------------------- 4. ROLE DETAILS PAGE -------------------- */}
      {viewMode === 'details' && selectedRole && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6 pb-20">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setViewMode('list'); setSelectedRoleId(null); }}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-105 rounded-xl bg-white border border-slate-200 transition-colors shadow-sm cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
                  Role Detail Specifications
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Detailed inspection coordinates of active system access configurations.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleEditClick(selectedRole)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 border border-blue-150 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Edit2 size={13} />
              <span>Modify Access Matrix</span>
            </button>
          </div>

          {/* Single Column Details */}
          <div className="space-y-6 sm:space-y-8">
            
            {/* Card 1: Role Information Card */}
            <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <ShieldCheck size={24} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-850 leading-none">{selectedRole.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1.5">
                      {selectedRole.description || 'No description listed.'}
                    </p>
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-400">
                  Created Date: <span className="text-slate-700">{selectedRole.createdAt ? new Date(selectedRole.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '30 March 2024'}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Permission Matrix Card (Read Only view) */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest text-indigo-600">
                  Active Access Matrix Specifications
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Module Name</th>
                      <th className="py-4 px-6 text-center">View</th>
                      <th className="py-4 px-6 text-center">Add</th>
                      <th className="py-4 px-6 text-center">Edit</th>
                      <th className="py-4 px-6 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                    {selectedRole.permissions.map(perm => (
                      <tr key={perm.module} className="hover:bg-slate-50/20 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-slate-800">{perm.module}</td>
                        <td className="py-3.5 px-6 text-center">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${perm.view ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${perm.add ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${perm.edit ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${perm.delete ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card 3: Assigned Employees List */}
            <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-600">
                Assigned Employees List ({getAssignedCount(selectedRole.name)})
              </h3>
              
              {getAssignedCount(selectedRole.name) === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs italic">
                  No employees currently assigned to this role.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {staffList
                    .filter(emp => emp.role === selectedRole.name)
                    .map(emp => (
                      <div key={emp._id} className="border border-slate-150 p-3.5 rounded-2xl flex items-center gap-3">
                        <img
                          src={emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                          alt={`${emp.firstName} ${emp.lastName}`}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-100 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-slate-800 text-xs truncate">
                            {emp.firstName} {emp.lastName}
                          </h5>
                          <span className="text-[9px] text-slate-400 font-semibold block">{emp.department || 'Operations'}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {emp.status}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

          </div>
        </motion.div>
      )}

      {/* -------------------- 5. ASSIGN ROLE DIALOG MODAL -------------------- */}
      <AnimatePresence>
        {assignModalOpen && selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => { setAssignModalOpen(false); setSelectedEmployee(null); }}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden z-10 p-6 space-y-4 relative"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-blue-600" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                    Assign/Change Role
                  </h3>
                </div>
                <button
                  onClick={() => { setAssignModalOpen(false); setSelectedEmployee(null); }}
                  className="p-1 text-slate-400 hover:text-slate-650 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Employee Bio summary */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                <img
                  src={selectedEmployee.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt={selectedEmployee.firstName}
                  className="w-10 h-10 rounded-lg object-cover border border-slate-150 flex-shrink-0"
                />
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h4>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">
                    ID: #{selectedEmployee._id} | {selectedEmployee.department || 'Operations'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleAssignSubmit} className="space-y-4 pt-1">
                {/* Select Role */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Choose System Role *
                  </label>
                  <select
                    required
                    value={assignForm.roleName}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, roleName: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="" disabled>-- Select a role --</option>
                    {rolesList.map(role => (
                      <option key={role._id} value={role.name}>{role.name}</option>
                    ))}
                    <option value="None">None (Revoke Access)</option>
                  </select>
                </div>

                {/* Department */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Department / Division
                  </label>
                  <input
                    type="text"
                    value={assignForm.department}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g. Sales, Operations"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2"
                  />
                </div>

                {/* Effective Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={assignForm.effectiveDate}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 cursor-pointer"
                  />
                </div>

                {/* Assignment Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Internal Assignment Notes / Context
                  </label>
                  <textarea
                    rows={2}
                    value={assignForm.notes}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. Assigned as part of Q2 team onboarding restructure plans..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 resize-none"
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => { setAssignModalOpen(false); setSelectedEmployee(null); }}
                    className="px-4 py-2 border border-slate-200 text-slate-605 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assignRoleMutation.isPending}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all cursor-pointer"
                  >
                    {assignRoleMutation.isPending ? 'Processing...' : 'Assign Role'}
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
