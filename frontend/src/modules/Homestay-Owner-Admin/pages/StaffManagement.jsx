import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  Save,
  CheckSquare,
  Square,
  AlertCircle,
  Building2,
  KeyRound,
  Mail,
  Phone,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  SlidersHorizontal,
  FileText,
  ArrowLeft,
  Upload
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getAuthToken = () => {
  return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
};

const DEFAULT_MODULES = [
  { module: 'inventory', moduleName: 'My Homestays & Inventory' },
  { module: 'bookings', moduleName: 'Manage Bookings & Rescheduling' },
  { module: 'requests', moduleName: 'Booking Requests & Approvals' },
  { module: 'guests', moduleName: 'Guest Directory & Records' },
  { module: 'rates', moduleName: 'Rates & Payment Settings' },
  { module: 'coupons', moduleName: 'Offers & Promo Coupons' },
  { module: 'availability', moduleName: 'Availability Calendar' },
  { module: 'staff', moduleName: 'Staff & Roles Management' }
];

export default function StaffManagement() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'roles'
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'add' | 'edit' | 'details'
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    inactiveStaff: 0,
    totalRoles: 0
  });

  // Filter and Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Notification Banner
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

  // Modals & Forms
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [sameAsTemp, setSameAsTemp] = useState(false);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  // Initial Comprehensive Staff Form State (6 Cards)
  const initialStaffForm = {
    firstName: '',
    lastName: '',
    fatherName: '',
    role: '',
    roleId: '',
    mobile: '',
    email: '',
    aadharNo: '',
    panNo: '',
    monthlySalary: '',
    basicSalary: '',
    hra: '',
    da: '',
    specialAllowance: '',
    otherAllowance: '',
    pfContribution: '',
    esiContribution: '',
    tempAddress: {
      line1: '',
      line2: '',
      landmark: '',
      state: '',
      city: '',
      pinCode: ''
    },
    permAddress: {
      line1: '',
      line2: '',
      landmark: '',
      state: '',
      city: '',
      pinCode: ''
    },
    bank: {
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      upiId: ''
    },
    documents: {
      aadharFront: '',
      aadharBack: '',
      panFront: '',
      panBack: '',
      drivingLicense: '',
      voterId: '',
      profilePhoto: ''
    },
    assignedProperties: ['all'],
    status: 'Active',
    pin: '1234',
    emergencyContact: '',
    notes: ''
  };
  const [staffForm, setStaffForm] = useState(initialStaffForm);

  // Role Form State (with granular checkboxes matrix)
  const initialRoleForm = {
    name: '',
    description: '',
    permissions: DEFAULT_MODULES.map((m) => ({
      module: m.module,
      moduleName: m.moduleName,
      view: false,
      add: false,
      edit: false,
      delete: false
    }))
  };
  const [roleForm, setRoleForm] = useState(initialRoleForm);

  // Fetch staff and roles from backend
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [staffRes, rolesRes] = await Promise.all([
        axios.get(getApiUrl('/api/homestay-owner/staff'), { headers }),
        axios.get(getApiUrl('/api/homestay-owner/roles'), { headers })
      ]);

      if (staffRes.data?.success) {
        setStaffList(staffRes.data.data || []);
        setProperties(staffRes.data.properties || []);
        if (staffRes.data.stats) setStats(staffRes.data.stats);
      }

      if (rolesRes.data?.success) {
        setRoles(rolesRes.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching staff and roles:', err);
      setActionMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to load staff and roles.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- ROLE ACTIONS & CHECKBOX HELPERS ---

  const handleOpenCreateRoleModal = () => {
    setEditingRoleId(null);
    setRoleForm({
      name: '',
      description: '',
      permissions: DEFAULT_MODULES.map((m) => ({
        module: m.module,
        moduleName: m.moduleName,
        view: false,
        add: false,
        edit: false,
        delete: false
      }))
    });
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRoleModal = (role) => {
    setEditingRoleId(role._id);
    const mappedPerms = DEFAULT_MODULES.map((defMod) => {
      const existing = role.permissions?.find((p) => p.module === defMod.module);
      return {
        module: defMod.module,
        moduleName: defMod.moduleName,
        view: Boolean(existing?.view),
        add: Boolean(existing?.add),
        edit: Boolean(existing?.edit),
        delete: Boolean(existing?.delete)
      };
    });

    setRoleForm({
      name: role.name,
      description: role.description || '',
      permissions: mappedPerms
    });
    setIsRoleModalOpen(true);
  };

  // Toggle single permission checkbox
  const handleTogglePermission = (moduleKey, action) => {
    setRoleForm((prev) => {
      const perms = prev.permissions.map((p) => {
        if (p.module !== moduleKey) return p;
        const newVal = !p[action];
        const updated = { ...p, [action]: newVal };
        // If enabling add, edit, or delete, automatically ensure view is true
        if (newVal && (action === 'add' || action === 'edit' || action === 'delete')) {
          updated.view = true;
        }
        // If disabling view, automatically disable add, edit, and delete
        if (!newVal && action === 'view') {
          updated.add = false;
          updated.edit = false;
          updated.delete = false;
        }
        return updated;
      });
      return { ...prev, permissions: perms };
    });
  };

  // Toggle entire module (all 4 actions for a module)
  const handleToggleModuleAll = (moduleKey) => {
    setRoleForm((prev) => {
      const current = prev.permissions.find((p) => p.module === moduleKey);
      const allActive = current?.view && current?.add && current?.edit && current?.delete;
      const targetState = !allActive;

      const perms = prev.permissions.map((p) => {
        if (p.module !== moduleKey) return p;
        return {
          ...p,
          view: targetState,
          add: targetState,
          edit: targetState,
          delete: targetState
        };
      });
      return { ...prev, permissions: perms };
    });
  };

  // Bulk Presets
  const handleSetAllPermissions = (grantAll) => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.map((p) => ({
        ...p,
        view: grantAll,
        add: grantAll,
        edit: grantAll,
        delete: grantAll
      }))
    }));
  };

  const handleSetViewOnlyPreset = () => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.map((p) => ({
        ...p,
        view: true,
        add: false,
        edit: false,
        delete: false
      }))
    }));
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      alert('Please provide a role name.');
      return;
    }

    try {
      setRoleSubmitting(true);
      const token = getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      if (editingRoleId) {
        // Update
        const res = await axios.put(
          getApiUrl(`/api/homestay-owner/roles/${editingRoleId}`),
          roleForm,
          { headers }
        );
        if (res.data?.success) {
          setActionMsg({ type: 'success', text: `Role "${roleForm.name}" updated successfully.` });
          setIsRoleModalOpen(false);
          fetchData();
        }
      } else {
        // Create
        const res = await axios.post(
          getApiUrl('/api/homestay-owner/roles'),
          roleForm,
          { headers }
        );
        if (res.data?.success) {
          setActionMsg({ type: 'success', text: `New role "${roleForm.name}" created successfully.` });
          setIsRoleModalOpen(false);
          fetchData();
        }
      }
    } catch (err) {
      console.error('Error saving role:', err);
      alert(err.response?.data?.message || 'Failed to save role.');
    } finally {
      setRoleSubmitting(false);
      setTimeout(() => setActionMsg({ type: '', text: '' }), 4000);
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Are you sure you want to delete role "${role.name}"?`)) return;

    try {
      const token = getAuthToken();
      const res = await axios.delete(getApiUrl(`/api/homestay-owner/roles/${role._id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setActionMsg({ type: 'success', text: `Role "${role.name}" deleted successfully.` });
        fetchData();
      }
    } catch (err) {
      console.error('Error deleting role:', err);
      alert(err.response?.data?.message || 'Failed to delete role.');
    } finally {
      setTimeout(() => setActionMsg({ type: '', text: '' }), 4000);
    }
  };

  // --- STAFF ACTIONS (6-Card Form & Views) ---

  const handleInputChange = (section, field, value) => {
    if (section) {
      setStaffForm((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setStaffForm((prev) => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSameAddressToggle = (e) => {
    const isChecked = e.target.checked;
    setSameAsTemp(isChecked);
    if (isChecked) {
      setStaffForm((prev) => ({
        ...prev,
        permAddress: { ...prev.tempAddress }
      }));
    }
  };

  const handleOpenCreateStaff = () => {
    setEditingStaffId(null);
    setSelectedStaff(null);
    setStaffForm({
      ...initialStaffForm,
      roleId: roles.length > 0 ? roles[0]._id : '',
      role: roles.length > 0 ? roles[0].name : ''
    });
    setSameAsTemp(false);
    setViewMode('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEditStaff = (staff) => {
    setEditingStaffId(staff._id);
    setSelectedStaff(staff);

    // Derive names if separated or single
    let fName = staff.firstName || '';
    let lName = staff.lastName || '';
    if (!fName && staff.name) {
      const parts = staff.name.trim().split(' ');
      fName = parts[0] || '';
      lName = parts.slice(1).join(' ') || '';
    }

    const currentRoleId = staff.roleId?._id || staff.roleId || '';
    const currentRoleName = staff.roleId?.name || staff.roleName || staff.role || '';

    setStaffForm({
      firstName: fName,
      lastName: lName,
      fatherName: staff.fatherName || '',
      role: currentRoleName,
      roleId: currentRoleId,
      mobile: staff.mobile || staff.phone || '',
      email: staff.email || '',
      aadharNo: staff.aadharNo || '',
      panNo: staff.panNo || '',
      monthlySalary: staff.monthlySalary || '',
      basicSalary: staff.basicSalary || '',
      hra: staff.hra || '',
      da: staff.da || '',
      specialAllowance: staff.specialAllowance || '',
      otherAllowance: staff.otherAllowance || '',
      pfContribution: staff.pfContribution || '',
      esiContribution: staff.esiContribution || '',
      tempAddress: {
        line1: staff.tempAddress?.line1 || staff.address || '',
        line2: staff.tempAddress?.line2 || '',
        landmark: staff.tempAddress?.landmark || '',
        state: staff.tempAddress?.state || '',
        city: staff.tempAddress?.city || '',
        pinCode: staff.tempAddress?.pinCode || ''
      },
      permAddress: {
        line1: staff.permAddress?.line1 || '',
        line2: staff.permAddress?.line2 || '',
        landmark: staff.permAddress?.landmark || '',
        state: staff.permAddress?.state || '',
        city: staff.permAddress?.city || '',
        pinCode: staff.permAddress?.pinCode || ''
      },
      bank: {
        bankName: staff.bank?.bankName || '',
        accountNumber: staff.bank?.accountNumber || '',
        ifscCode: staff.bank?.ifscCode || '',
        upiId: staff.bank?.upiId || ''
      },
      documents: {
        aadharFront: staff.documents?.aadharFront || '',
        aadharBack: staff.documents?.aadharBack || '',
        panFront: staff.documents?.panFront || '',
        panBack: staff.documents?.panBack || '',
        drivingLicense: staff.documents?.drivingLicense || '',
        voterId: staff.documents?.voterId || '',
        profilePhoto: staff.documents?.profilePhoto || ''
      },
      assignedProperties: staff.assignedProperties?.length ? staff.assignedProperties : ['all'],
      status: staff.status || 'Active',
      pin: staff.pin || '1234',
      emergencyContact: staff.emergencyContact || '',
      notes: staff.notes || ''
    });

    setSameAsTemp(false);
    setViewMode('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDetails = (staff) => {
    setSelectedStaff(staff);
    setViewMode('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleStaffProperty = (propId) => {
    setStaffForm((prev) => {
      let current = [...prev.assignedProperties];
      if (propId === 'all') {
        return { ...prev, assignedProperties: ['all'] };
      }
      if (current.includes('all')) {
        current = [];
      }
      if (current.includes(propId)) {
        current = current.filter((id) => id !== propId);
        if (current.length === 0) current = ['all'];
      } else {
        current.push(propId);
      }
      return { ...prev, assignedProperties: current };
    });
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.firstName?.trim() || !staffForm.lastName?.trim() || !staffForm.email?.trim() || !staffForm.mobile?.trim() || !staffForm.roleId) {
      alert('Please fill in all mandatory fields: First Name, Last Name, Email Address, Mobile Number, and Role.');
      return;
    }

    try {
      setStaffSubmitting(true);
      const token = getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Ensure full name and calculated salary values
      const fullName = `${staffForm.firstName.trim()} ${staffForm.lastName.trim()}`.trim();
      const dataToSend = {
        ...staffForm,
        name: fullName,
        phone: staffForm.mobile.trim(),
        monthlySalary: Number(staffForm.monthlySalary) || 0,
        basicSalary: Number(staffForm.basicSalary) || (Number(staffForm.monthlySalary) * 0.6) || 0,
        hra: Number(staffForm.hra) || (Number(staffForm.monthlySalary) * 0.2) || 0,
        da: Number(staffForm.da) || (Number(staffForm.monthlySalary) * 0.1) || 0,
        specialAllowance: Number(staffForm.specialAllowance) || 0,
        otherAllowance: Number(staffForm.otherAllowance) || 0,
        pfContribution: Number(staffForm.pfContribution) || 3600,
        esiContribution: Number(staffForm.esiContribution) || 1500,
        permAddress: sameAsTemp ? { ...staffForm.tempAddress } : { ...staffForm.permAddress }
      };

      if (editingStaffId) {
        // Update
        const res = await axios.put(
          getApiUrl(`/api/homestay-owner/staff/${editingStaffId}`),
          dataToSend,
          { headers }
        );
        if (res.data?.success) {
          setActionMsg({ type: 'success', text: `Staff member "${fullName}" updated successfully.` });
          setViewMode('list');
          setEditingStaffId(null);
          fetchData();
        }
      } else {
        // Create
        const res = await axios.post(
          getApiUrl('/api/homestay-owner/staff'),
          dataToSend,
          { headers }
        );
        if (res.data?.success) {
          setActionMsg({ type: 'success', text: `Staff member "${fullName}" added successfully.` });
          setViewMode('list');
          setEditingStaffId(null);
          fetchData();
        }
      }
    } catch (err) {
      console.error('Error saving staff:', err);
      alert(err.response?.data?.message || 'Failed to save staff member.');
    } finally {
      setStaffSubmitting(false);
      setTimeout(() => setActionMsg({ type: '', text: '' }), 4000);
    }
  };

  const handleToggleStaffStatus = async (staff) => {
    try {
      const token = getAuthToken();
      const res = await axios.patch(
        getApiUrl(`/api/homestay-owner/staff/${staff._id}/status`),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setStaffList((prev) =>
          prev.map((s) => (s._id === staff._id ? { ...s, status: res.data.data.status } : s))
        );
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      alert(err.response?.data?.message || 'Failed to toggle status.');
    }
  };

  const handleDeleteStaff = async (staff) => {
    if (!window.confirm(`Are you sure you want to remove staff member "${staff.name}"?`)) return;

    try {
      const token = getAuthToken();
      const res = await axios.delete(getApiUrl(`/api/homestay-owner/staff/${staff._id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setActionMsg({ type: 'success', text: `Staff member "${staff.name}" removed.` });
        fetchData();
      }
    } catch (err) {
      console.error('Error deleting staff:', err);
      alert(err.response?.data?.message || 'Failed to delete staff member.');
    } finally {
      setTimeout(() => setActionMsg({ type: '', text: '' }), 4000);
    }
  };

  // Filtered Staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name?.toLowerCase().includes(q);
        const matchesEmail = s.email?.toLowerCase().includes(q);
        const matchesPhone = s.phone?.toLowerCase().includes(q);
        const matchesRole = s.roleName?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesRole) return false;
      }

      // Status
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;

      // Role
      if (roleFilter !== 'all') {
        const staffRoleId = s.roleId?._id || s.roleId;
        if (String(staffRoleId) !== String(roleFilter)) return false;
      }

      // Property
      if (propertyFilter !== 'all') {
        const isAll = s.assignedProperties?.includes('all');
        const matchesProp = s.assignedProperties?.some((p) => String(p) === String(propertyFilter));
        if (!isAll && !matchesProp) return false;
      }

      return true;
    });
  }, [staffList, searchQuery, statusFilter, roleFilter, propertyFilter]);

  // Helper to get property names
  const getAssignedPropertyNames = (list) => {
    if (!list || list.length === 0 || list.includes('all')) return 'All Homestays';
    const matched = properties
      .filter((p) => list.includes(String(p._id)))
      .map((p) => p.name);
    return matched.length ? matched.join(', ') : `${list.length} Properties`;
  };

  return (
    <div className="space-y-6 font-sans pb-12 select-none">
      {/* Top Breadcrumb */}
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <span>Dashboard</span>
        <span>/</span>
        <span>Other</span>
        <span>/</span>
        <span className="text-rose-700 font-extrabold">Manage Staffs & Roles</span>
      </div>

      {/* Action Message Banner */}
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
            className="text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Header Card (Uniform across all pages) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-100 p-5 sm:p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Manage Staffs & Access Roles</h1>
          <p className="text-xs font-bold text-slate-400 mt-1">
            Manage employee access, configure granular permission checkboxes (View, Add, Edit, Delete), and assign roles.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <button
            type="button"
            onClick={fetchData}
            className="p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl cursor-pointer bg-white flex items-center justify-center transition-colors shadow-sm"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : 'text-slate-500'} />
          </button>

          {viewMode === 'list' && (
            <>
              <button
                type="button"
                onClick={handleOpenCreateRoleModal}
                className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm uppercase tracking-wider"
              >
                <ShieldCheck size={14} className="stroke-[2.5]" />
                <span>+ Create Role</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreateStaff}
                className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100 uppercase tracking-wider"
              >
                <UserPlus size={14} className="stroke-[2.5]" />
                <span>Add Staff Member</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Metric Cards (Exact uniform styling to Bookings & Dashboard) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Staff */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">TOTAL STAFF</span>
            <span className="text-2xl font-black text-slate-800 font-mono tracking-tight">{stats.totalStaff} Members</span>
          </div>
        </div>

        {/* Active Staff */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck size={20} />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">ACTIVE STAFF</span>
            <span className="text-2xl font-black text-emerald-600 font-mono tracking-tight">{stats.activeStaff} Active</span>
          </div>
        </div>

        {/* Defined Roles */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">ROLES DEFINED</span>
            <span className="text-2xl font-black text-slate-800 font-mono tracking-tight">{roles.length} Roles</span>
          </div>
        </div>

        {/* Inactive Staff */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <UserX size={20} />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">INACTIVE / OFF</span>
            <span className="text-2xl font-black text-slate-800 font-mono tracking-tight">{stats.inactiveStaff}</span>
          </div>
        </div>
      </div>

      {/* 1. LIST VIEW (Tabs: Staff Directory & Roles Permissions Matrix) */}
      {viewMode === 'list' && (
        <>
          {/* Main Tab Switcher (Capsule styling matching ManageBookings) */}
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 border-none ${
                activeTab === 'staff'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-200'
                  : 'bg-white hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Users size={14} />
              <span>Staff Directory</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'staff' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {staffList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 border-none ${
                activeTab === 'roles'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-200'
                  : 'bg-white hover:bg-slate-100 text-slate-600'
              }`}
            >
              <ShieldCheck size={14} />
              <span>Roles & Permissions Matrix</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'roles' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {roles.length}
              </span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: STAFF DIRECTORY                                                    */}
          {/* ========================================================================= */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              {/* Filters Bar */}
              <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                {/* Search */}
                <div className="relative w-full md:w-80">
                  <Search size={14} className="absolute left-3.5 top-3 text-slate-400 stroke-[2.5]" />
                  <input
                    type="text"
                    placeholder="Search staff by name, email, or mobile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 transition-all"
                  />
                </div>

                {/* Dropdowns */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  {/* Role filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Role:</span>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 cursor-pointer"
                    >
                      <option value="all">All Roles</option>
                      {roles.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

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
                    </select>
                  </div>

                  {/* Property filter */}
                  {properties.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Property:</span>
                      <select
                        value={propertyFilter}
                        onChange={(e) => setPropertyFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 cursor-pointer max-w-[160px] truncate"
                      >
                        <option value="all">All Homestays</option>
                        {properties.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Reset Filters */}
                  {(searchQuery || roleFilter !== 'all' || propertyFilter !== 'all' || statusFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setRoleFilter('all');
                        setPropertyFilter('all');
                        setStatusFilter('all');
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer border-none"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Staff Table */}
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-wider">
                        <th className="py-3.5 px-5">Staff Member</th>
                        <th className="py-3.5 px-4">Role & Access</th>
                        <th className="py-3.5 px-4">Homestay Assignment</th>
                        <th className="py-3.5 px-4">PIN</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Joined Date</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {filteredStaff.map((staff) => {
                        const roleName = staff.roleId?.name || staff.roleName || staff.role || 'Staff';
                        return (
                          <tr key={staff._id} className="hover:bg-slate-50/60 transition-colors">
                            {/* Member details */}
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-rose-400 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                                  {staff.firstName ? staff.firstName.charAt(0).toUpperCase() : (staff.name ? staff.name.charAt(0).toUpperCase() : 'S')}
                                </div>
                                <div>
                                  <span className="font-black text-slate-900 block text-xs leading-snug">
                                    {staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`.trim()}
                                  </span>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                    <span className="flex items-center gap-0.5">
                                      <Mail size={10} />
                                      <span>{staff.email}</span>
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-0.5">
                                      <Phone size={10} />
                                      <span>{staff.mobile || staff.phone}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Role Badge */}
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 inline-block">
                                {roleName}
                              </span>
                            </td>

                            {/* Assigned Homestays */}
                            <td className="py-3.5 px-4">
                              <span className="text-slate-700 text-xs font-bold truncate max-w-[200px] block" title={getAssignedPropertyNames(staff.assignedProperties)}>
                                {getAssignedPropertyNames(staff.assignedProperties)}
                              </span>
                            </td>

                            {/* PIN */}
                            <td className="py-3.5 px-4">
                              <span className="font-mono text-xs font-black bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 tracking-wider">
                                {staff.pin || '1234'}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <button
                                type="button"
                                onClick={() => handleToggleStaffStatus(staff)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer border transition-all ${
                                  staff.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    staff.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                  }`}
                                ></span>
                                <span>{staff.status}</span>
                              </button>
                            </td>

                            {/* Joined */}
                            <td className="py-3.5 px-4 text-slate-400 text-[11px] font-medium">
                              {new Date(staff.createdAt || staff.joinedDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetails(staff)}
                                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                                  title="View Employee Profile"
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditStaff(staff)}
                                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                                  title="Edit Staff Member"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStaff(staff)}
                                  className="p-1.5 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer border border-transparent hover:border-rose-200 transition-colors"
                                  title="Delete Staff Member"
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

                {/* Empty State */}
                {filteredStaff.length === 0 && !loading && (
                  <div className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">No staff members found</h3>
                      <p className="text-xs font-bold text-slate-400 mt-1">
                        {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                          ? 'No staff members match the selected filters.'
                          : 'You have not added any staff members yet. Click "Add Staff Member" to begin.'}
                      </p>
                    </div>
                    {searchQuery || roleFilter !== 'all' || statusFilter !== 'all' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setRoleFilter('all');
                          setPropertyFilter('all');
                          setStatusFilter('all');
                        }}
                        className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer border-none uppercase tracking-wider"
                      >
                        Clear Filters
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOpenCreateStaff}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs cursor-pointer border-none uppercase tracking-wider transition-colors shadow-sm"
                      >
                        + Add Staff Member
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ROLES & PERMISSIONS MATRIX                                         */}
          {/* ========================================================================= */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-800">Custom Roles & Security Profiles</h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    Define custom access rights using granular View, Add, Edit, and Delete checkboxes for each homestay module.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateRoleModal}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm uppercase tracking-wider shrink-0"
                >
                  <Plus size={14} />
                  <span>New Role</span>
                </button>
              </div>

              {/* Roles Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles.map((role) => {
                  const staffCount = role.staffCount !== undefined ? role.staffCount : staffList.filter((s) => (s.roleId?._id || s.roleId) === role._id).length;
                  const permittedModulesCount = (role.permissions || []).filter(
                    (p) => p.view || p.add || p.edit || p.delete
                  ).length;

                  return (
                    <div
                      key={role._id}
                      className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                              <ShieldCheck size={18} />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-800">{role.name}</h4>
                              <span className="text-[10px] font-bold text-slate-400">
                                {role.isSystemDefault ? 'Default Starter Role' : 'Custom Owner Role'}
                              </span>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">
                            {staffCount} {staffCount === 1 ? 'Staff' : 'Staffs'}
                          </span>
                        </div>

                        {role.description && (
                          <p className="text-xs text-slate-500 font-medium line-clamp-2">
                            {role.description}
                          </p>
                        )}

                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-400">Accessible Modules</span>
                          <span className="text-slate-800 font-black">{permittedModulesCount} / 8</span>
                        </div>

                        {/* Quick pills preview of active modules */}
                        <div className="flex flex-wrap gap-1">
                          {(role.permissions || [])
                            .filter((p) => p.view || p.add || p.edit || p.delete)
                            .slice(0, 5)
                            .map((p) => (
                              <span
                                key={p.module}
                                className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-100"
                              >
                                {p.moduleName?.split(' ')[0] || p.module}
                              </span>
                            ))}
                          {permittedModulesCount > 5 && (
                            <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-slate-50 text-slate-400">
                              +{permittedModulesCount - 5} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions footer */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditRoleModal(role)}
                          className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 uppercase tracking-wider"
                        >
                          <Edit2 size={12} />
                          <span>Configure Permissions</span>
                        </button>

                        {!role.isSystemDefault && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role)}
                            className="p-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer border border-transparent hover:border-rose-200 transition-colors"
                            title="Delete Role"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. FORM VIEW (ADD / EDIT EMPLOYEE) - EXACT 6 CARDS MATCHING DESIGN        */}
      {/* ========================================================================= */}
      {(viewMode === 'add' || viewMode === 'edit') && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Navigation */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-2xl bg-white border border-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight">
                {viewMode === 'add' ? 'Create New Employee' : 'Edit Employee Details'}
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                Provide onboarding, documents, addresses, and payroll profiles.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveStaff} className="space-y-6 pb-24">
            {/* Split layout in 2-column grid cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">

              {/* CARD A: PERSONAL INFORMATION */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-xs font-black text-rose-600 border-b border-slate-100 pb-2.5 uppercase tracking-widest">
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">First Name *</label>
                    <input
                      type="text"
                      required
                      value={staffForm.firstName}
                      onChange={(e) => handleInputChange(null, 'firstName', e.target.value)}
                      placeholder="Enter first name"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={staffForm.lastName}
                      onChange={(e) => handleInputChange(null, 'lastName', e.target.value)}
                      placeholder="Enter last name"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Father Name *</label>
                    <input
                      type="text"
                      required
                      value={staffForm.fatherName}
                      onChange={(e) => handleInputChange(null, 'fatherName', e.target.value)}
                      placeholder="Enter father name"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Job Title / Role *</label>
                    <select
                      required
                      value={staffForm.roleId}
                      onChange={(e) => {
                        const selectedRoleObj = roles.find((r) => r._id === e.target.value);
                        setStaffForm((prev) => ({
                          ...prev,
                          roleId: e.target.value,
                          role: selectedRoleObj ? selectedRoleObj.name : prev.role
                        }));
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 cursor-pointer"
                    >
                      <option value="" disabled>Select a role...</option>
                      {roles.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={staffForm.mobile}
                      onChange={(e) => handleInputChange(null, 'mobile', e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={staffForm.email}
                      onChange={(e) => handleInputChange(null, 'email', e.target.value)}
                      placeholder="Enter email address"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Aadhar Card No *</label>
                    <input
                      type="text"
                      required
                      value={staffForm.aadharNo}
                      onChange={(e) => handleInputChange(null, 'aadharNo', e.target.value)}
                      placeholder="12-digit Aadhar"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">PAN Card No *</label>
                    <input
                      type="text"
                      required
                      value={staffForm.panNo}
                      onChange={(e) => handleInputChange(null, 'panNo', e.target.value.toUpperCase())}
                      placeholder="Enter PAN (10 chars)"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white uppercase"
                    />
                  </div>
                </div>

                {/* Homestay Assignment & PIN */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Assigned Homestay Properties
                    </label>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {staffForm.assignedProperties.includes('all') ? 'All Homestays' : `${staffForm.assignedProperties.length} Selected`}
                    </span>
                  </div>

                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 max-h-28 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => handleToggleStaffProperty('all')}
                      className={`w-full p-2 rounded-xl flex items-center justify-between text-xs font-bold cursor-pointer transition-all border ${
                        staffForm.assignedProperties.includes('all')
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {staffForm.assignedProperties.includes('all') ? (
                          <CheckSquare size={14} className="text-emerald-600" />
                        ) : (
                          <Square size={14} className="text-slate-400" />
                        )}
                        <span>All Homestay Properties (Full Access)</span>
                      </div>
                    </button>

                    {properties.map((p) => {
                      const isSelected = !staffForm.assignedProperties.includes('all') && staffForm.assignedProperties.includes(String(p._id));
                      return (
                        <button
                          type="button"
                          key={p._id}
                          onClick={() => handleToggleStaffProperty(String(p._id))}
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
                            <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">{p.city}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Access PIN</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={staffForm.pin}
                        onChange={(e) => handleInputChange(null, 'pin', e.target.value.replace(/\D/g, ''))}
                        placeholder="1234"
                        className="w-full font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</label>
                      <select
                        value={staffForm.status}
                        onChange={(e) => handleInputChange(null, 'status', e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 cursor-pointer"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD B: SALARY INFORMATION */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-xs font-black text-rose-600 border-b border-slate-100 pb-2.5 uppercase tracking-widest">
                  Salary Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Monthly Salary (CTC) *</label>
                    <input
                      type="number"
                      required
                      value={staffForm.monthlySalary}
                      onChange={(e) => handleInputChange(null, 'monthlySalary', e.target.value)}
                      placeholder="Enter Monthly CTC (₹)"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Basic Salary</label>
                    <input
                      type="number"
                      value={staffForm.basicSalary}
                      onChange={(e) => handleInputChange(null, 'basicSalary', e.target.value)}
                      placeholder="Auto calculates if empty"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">HRA (House Rent Allowance)</label>
                    <input
                      type="number"
                      value={staffForm.hra}
                      onChange={(e) => handleInputChange(null, 'hra', e.target.value)}
                      placeholder="Enter HRA (₹)"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">DA (Dearness Allowance)</label>
                    <input
                      type="number"
                      value={staffForm.da}
                      onChange={(e) => handleInputChange(null, 'da', e.target.value)}
                      placeholder="Enter DA (₹)"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Special Allowance</label>
                    <input
                      type="number"
                      value={staffForm.specialAllowance}
                      onChange={(e) => handleInputChange(null, 'specialAllowance', e.target.value)}
                      placeholder="Enter special allowance"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Other Allowance</label>
                    <input
                      type="number"
                      value={staffForm.otherAllowance}
                      onChange={(e) => handleInputChange(null, 'otherAllowance', e.target.value)}
                      placeholder="Enter other allowance"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Deductions Sub-Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Deductions (Monthly)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">PF Contribution</label>
                      <input
                        type="number"
                        value={staffForm.pfContribution}
                        onChange={(e) => handleInputChange(null, 'pfContribution', e.target.value)}
                        placeholder="₹3,600"
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">ESI Contribution</label>
                      <input
                        type="number"
                        value={staffForm.esiContribution}
                        onChange={(e) => handleInputChange(null, 'esiContribution', e.target.value)}
                        placeholder="₹1,500"
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD C: TEMPORARY ADDRESS */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-xs font-black text-rose-600 border-b border-slate-100 pb-2.5 uppercase tracking-widest">
                  Temporary Address
                </h3>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Address Line 1</label>
                  <input
                    type="text"
                    value={staffForm.tempAddress.line1}
                    onChange={(e) => handleInputChange('tempAddress', 'line1', e.target.value)}
                    placeholder="Enter street, apartment no."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Address Line 2</label>
                  <input
                    type="text"
                    value={staffForm.tempAddress.line2}
                    onChange={(e) => handleInputChange('tempAddress', 'line2', e.target.value)}
                    placeholder="Area, Colony, Suite"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Landmark</label>
                    <input
                      type="text"
                      value={staffForm.tempAddress.landmark}
                      onChange={(e) => handleInputChange('tempAddress', 'landmark', e.target.value)}
                      placeholder="e.g. Near Station"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">State</label>
                    <input
                      type="text"
                      value={staffForm.tempAddress.state}
                      onChange={(e) => handleInputChange('tempAddress', 'state', e.target.value)}
                      placeholder="e.g. Maharashtra"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">City</label>
                    <input
                      type="text"
                      value={staffForm.tempAddress.city}
                      onChange={(e) => handleInputChange('tempAddress', 'city', e.target.value)}
                      placeholder="e.g. Mumbai"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pin Code</label>
                    <input
                      type="text"
                      value={staffForm.tempAddress.pinCode}
                      onChange={(e) => handleInputChange('tempAddress', 'pinCode', e.target.value)}
                      placeholder="6-digit PIN"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* CARD D: PERMANENT ADDRESS */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest">
                    Permanent Address
                  </h3>
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsTemp}
                      onChange={handleSameAddressToggle}
                      className="rounded text-rose-600 focus:ring-0 cursor-pointer"
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
                        value={staffForm.permAddress.line1}
                        onChange={(e) => handleInputChange('permAddress', 'line1', e.target.value)}
                        placeholder="Enter street, apartment no."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Address Line 2</label>
                      <input
                        type="text"
                        value={staffForm.permAddress.line2}
                        onChange={(e) => handleInputChange('permAddress', 'line2', e.target.value)}
                        placeholder="Area, Colony, Suite"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Landmark</label>
                        <input
                          type="text"
                          value={staffForm.permAddress.landmark}
                          onChange={(e) => handleInputChange('permAddress', 'landmark', e.target.value)}
                          placeholder="e.g. Near Station"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">State</label>
                        <input
                          type="text"
                          value={staffForm.permAddress.state}
                          onChange={(e) => handleInputChange('permAddress', 'state', e.target.value)}
                          placeholder="e.g. Maharashtra"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">City</label>
                        <input
                          type="text"
                          value={staffForm.permAddress.city}
                          onChange={(e) => handleInputChange('permAddress', 'city', e.target.value)}
                          placeholder="e.g. Mumbai"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pin Code</label>
                        <input
                          type="text"
                          value={staffForm.permAddress.pinCode}
                          onChange={(e) => handleInputChange('permAddress', 'pinCode', e.target.value)}
                          placeholder="6-digit PIN"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs font-bold italic border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    Same address as temporary coordinates loaded.
                  </div>
                )}
              </div>

              {/* CARD E: BANK DETAILS */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-xs font-black text-rose-600 border-b border-slate-100 pb-2.5 uppercase tracking-widest">
                  Bank Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bank Name</label>
                    <input
                      type="text"
                      value={staffForm.bank.bankName}
                      onChange={(e) => handleInputChange('bank', 'bankName', e.target.value)}
                      placeholder="e.g. HDFC Bank"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Account Number</label>
                    <input
                      type="text"
                      value={staffForm.bank.accountNumber}
                      onChange={(e) => handleInputChange('bank', 'accountNumber', e.target.value)}
                      placeholder="Enter account number"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">IFSC Code</label>
                    <input
                      type="text"
                      value={staffForm.bank.ifscCode}
                      onChange={(e) => handleInputChange('bank', 'ifscCode', e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0001234"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white uppercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">UPI ID</label>
                    <input
                      type="text"
                      value={staffForm.bank.upiId}
                      onChange={(e) => handleInputChange('bank', 'upiId', e.target.value)}
                      placeholder="e.g. name@upi"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* CARD F: DOCUMENT UPLOADS */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-xs font-black text-rose-600 border-b border-slate-100 pb-2.5 uppercase tracking-widest">
                  Document Uploads
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Aadhar Front', key: 'aadharFront' },
                    { label: 'Aadhar Back', key: 'aadharBack' },
                    { label: 'PAN Front', key: 'panFront' },
                    { label: 'PAN Back', key: 'panBack' },
                    { label: 'Driving License', key: 'drivingLicense' },
                    { label: 'Voter ID', key: 'voterId' },
                    { label: 'Profile Photo', key: 'profilePhoto' }
                  ].map((doc) => {
                    const hasFile = !!staffForm.documents[doc.key];
                    return (
                      <div
                        key={doc.key}
                        onClick={() => handleInputChange('documents', doc.key, `${doc.key}_uploaded.jpg`)}
                        className={`border border-dashed p-3 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-slate-50 ${
                          hasFile ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                        }`}
                      >
                        <Upload size={14} className={hasFile ? 'text-rose-600' : 'text-slate-400'} />
                        <span className="text-[10px] font-bold text-slate-700 mt-1.5 block">
                          {doc.label}
                        </span>
                        <span className="text-[8px] text-slate-400 mt-0.5 uppercase tracking-wider block font-bold">
                          {hasFile ? 'Uploaded ✓' : 'Click to Upload'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Sticky Action Footer Bar */}
            <div className="fixed bottom-0 right-0 left-0 bg-white/90 backdrop-blur-md border-t border-slate-200 py-3.5 px-6 flex justify-end items-center gap-3 z-30 shadow-lg">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={staffSubmitting}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 transition-all cursor-pointer uppercase tracking-wider flex items-center gap-1.5 border-none"
              >
                {staffSubmitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={13} />
                    <span>Save Employee</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DETAILS VIEW (VIEW EMPLOYEE ONBOARDING PROFILE)                        */}
      {/* ========================================================================= */}
      {viewMode === 'details' && selectedStaff && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setViewMode('list'); setSelectedStaff(null); }}
              className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-2xl bg-white border border-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight">
                Employee Profile Details
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                Onboarding profiles, assigned homestays, documents, and bank records.
              </p>
            </div>
          </div>

          <div className="space-y-6 pb-12">
            {/* Header Profile Card */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="w-18 h-18 rounded-3xl bg-rose-50 border border-rose-100 text-rose-700 font-black text-2xl flex items-center justify-center shadow-xs shrink-0">
                  {selectedStaff.firstName ? selectedStaff.firstName.charAt(0).toUpperCase() : (selectedStaff.name ? selectedStaff.name.charAt(0).toUpperCase() : 'S')}
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-lg font-black text-slate-800">
                      {selectedStaff.name || `${selectedStaff.firstName || ''} ${selectedStaff.lastName || ''}`.trim()}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      selectedStaff.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {selectedStaff.status}
                    </span>
                  </div>
                  <p className="text-xs text-purple-700 font-black uppercase tracking-wider">
                    {selectedStaff.roleId?.name || selectedStaff.roleName || selectedStaff.role || 'Staff'}
                  </p>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider pt-1">
                    Employee ID: <span className="font-mono text-slate-700">{selectedStaff._id}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditStaff(selectedStaff)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm border-none uppercase tracking-wider"
                >
                  <Edit2 size={12} />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>

            {/* 6 Cards Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Personal & Contact Details */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-xs font-black text-rose-600 border-b border-slate-100 pb-2.5 uppercase tracking-widest">
                  Personal & Contact Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">First Name</span>
                    <span className="text-xs font-black text-slate-800">{selectedStaff.firstName || selectedStaff.name?.split(' ')[0] || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Last Name</span>
                    <span className="text-xs font-black text-slate-800">{selectedStaff.lastName || selectedStaff.name?.split(' ').slice(1).join(' ') || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Father Name</span>
                    <span className="text-xs font-black text-slate-800">{selectedStaff.fatherName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Job Title</span>
                    <span className="text-xs font-black text-slate-800">{selectedStaff.roleId?.name || selectedStaff.roleName || selectedStaff.role || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Mobile Number</span>
                    <span className="text-xs font-black text-slate-800">{selectedStaff.mobile || selectedStaff.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                    <span className="text-xs font-black text-slate-800">{selectedStaff.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Aadhar Card No</span>
                    <span className="text-xs font-black text-slate-800">{selectedStaff.aadharNo || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">PAN Card No</span>
                    <span className="text-xs font-black text-slate-800 uppercase">{selectedStaff.panNo || '—'}</span>
                  </div>
                </div>
              </div>

              {/* 2. Salary Information */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-xs font-black text-rose-600 border-b border-slate-100 pb-2.5 uppercase tracking-widest">
                  Salary Details
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100">
                    <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider block">Monthly CTC</span>
                    <span className="text-base font-black text-slate-800 mt-1 block">
                      ₹{(selectedStaff.monthlySalary || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Basic</span>
                    <span className="text-xs font-bold text-slate-800 mt-1.5 block">
                      ₹{(selectedStaff.basicSalary || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">HRA</span>
                    <span className="text-xs font-bold text-slate-800 mt-1.5 block">
                      ₹{(selectedStaff.hra || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">DA</span>
                    <span className="font-bold text-slate-700">₹{(selectedStaff.da || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Special</span>
                    <span className="font-bold text-slate-700">₹{(selectedStaff.specialAllowance || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Others</span>
                    <span className="font-bold text-slate-700">₹{(selectedStaff.otherAllowance || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-rose-500 block font-bold uppercase">PF Deduct</span>
                    <span className="font-bold text-rose-600">-₹{(selectedStaff.pfContribution || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* 3. Temporary & Permanent Addresses */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-xs font-black text-rose-600 border-b border-slate-100 pb-2.5 uppercase tracking-widest">
                  Address Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Temporary Address</span>
                    <p className="text-xs font-bold text-slate-700 mt-1">
                      {selectedStaff.tempAddress?.line1 || selectedStaff.address || 'No street specified'}<br />
                      {selectedStaff.tempAddress?.line2 && <>{selectedStaff.tempAddress.line2}<br /></>}
                      {selectedStaff.tempAddress?.city || ''} {selectedStaff.tempAddress?.state || ''} {selectedStaff.tempAddress?.pinCode || ''}
                    </p>
                  </div>
                  <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Permanent Address</span>
                    <p className="text-xs font-bold text-slate-700 mt-1">
                      {selectedStaff.permAddress?.line1 || selectedStaff.tempAddress?.line1 || selectedStaff.address || 'Same as temporary'}<br />
                      {selectedStaff.permAddress?.city || ''} {selectedStaff.permAddress?.state || ''} {selectedStaff.permAddress?.pinCode || ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Bank Details */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-xs font-black text-rose-600 border-b border-slate-100 pb-2.5 uppercase tracking-widest">
                  Bank Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Bank Name</span>
                    <span className="text-xs font-black text-slate-800">{selectedStaff.bank?.bankName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Account Number</span>
                    <span className="text-xs font-mono font-black text-slate-800">{selectedStaff.bank?.accountNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">IFSC Code</span>
                    <span className="text-xs font-mono font-black text-slate-800 uppercase">{selectedStaff.bank?.ifscCode || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">UPI ID</span>
                    <span className="text-xs font-black text-slate-800">{selectedStaff.bank?.upiId || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Uploads Records */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-xs font-black text-rose-600 border-b border-slate-100 pb-2.5 uppercase tracking-widest">
                Uploaded Identification & Documents
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Aadhar Front', key: 'aadharFront' },
                  { label: 'Aadhar Back', key: 'aadharBack' },
                  { label: 'PAN Front', key: 'panFront' },
                  { label: 'PAN Back', key: 'panBack' },
                  { label: 'Driving License', key: 'drivingLicense' },
                  { label: 'Voter ID', key: 'voterId' },
                  { label: 'Profile Photo', key: 'profilePhoto' }
                ].map((doc) => {
                  const docVal = selectedStaff.documents?.[doc.key];
                  return (
                    <div key={doc.key} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{doc.label}</span>
                      <span className={`text-[10px] font-bold mt-1 inline-block ${docVal ? 'text-emerald-700' : 'text-slate-400 italic'}`}>
                        {docVal ? 'Verified Document ✓' : 'Not Uploaded'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT ROLE WITH PERMISSION CHECKBOXES MATRIX               */}
      {/* ========================================================================= */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl border border-slate-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 tracking-tight">
                    {editingRoleId ? 'Edit Role & Permissions Matrix' : 'Create New Role & Permission Matrix'}
                  </h2>
                  <p className="text-xs font-bold text-slate-400">
                    Use checkboxes to grant granular View, Add, Edit, and Delete rights per module.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-all border-none"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveRole} className="overflow-y-auto p-6 space-y-5">
              {/* Role Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Property Manager, Front Desk, Housekeeper"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of duties and responsibilities"
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Quick Presets Bar */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Granular Permissions Matrix (Checkboxes)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetAllPermissions(true)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200 cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleSetViewOnlyPreset}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200 cursor-pointer"
                  >
                    View Only
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllPermissions(false)}
                    className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-rose-200 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Permissions Checkboxes Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4">Module Name</th>
                      <th className="py-3 px-3 text-center">View (Read)</th>
                      <th className="py-3 px-3 text-center">Add (Create)</th>
                      <th className="py-3 px-3 text-center">Edit (Update)</th>
                      <th className="py-3 px-3 text-center">Delete (Remove)</th>
                      <th className="py-3 px-3 text-center">Module All</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {roleForm.permissions.map((perm) => {
                      const isModuleAll = perm.view && perm.add && perm.edit && perm.delete;
                      return (
                        <tr key={perm.module} className="hover:bg-slate-50/70 transition-colors">
                          {/* Module Name */}
                          <td className="py-3 px-4 font-black text-slate-800 text-xs">
                            {perm.moduleName}
                          </td>

                          {/* View Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(perm.module, 'view')}
                              className="bg-transparent border-none p-1 cursor-pointer inline-flex items-center justify-center text-slate-400 hover:text-slate-600"
                            >
                              {perm.view ? (
                                <CheckSquare size={17} className="text-emerald-600" />
                              ) : (
                                <Square size={17} />
                              )}
                            </button>
                          </td>

                          {/* Add Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(perm.module, 'add')}
                              className="bg-transparent border-none p-1 cursor-pointer inline-flex items-center justify-center text-slate-400 hover:text-slate-600"
                            >
                              {perm.add ? (
                                <CheckSquare size={17} className="text-blue-600" />
                              ) : (
                                <Square size={17} />
                              )}
                            </button>
                          </td>

                          {/* Edit Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(perm.module, 'edit')}
                              className="bg-transparent border-none p-1 cursor-pointer inline-flex items-center justify-center text-slate-400 hover:text-slate-600"
                            >
                              {perm.edit ? (
                                <CheckSquare size={17} className="text-amber-600" />
                              ) : (
                                <Square size={17} />
                              )}
                            </button>
                          </td>

                          {/* Delete Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(perm.module, 'delete')}
                              className="bg-transparent border-none p-1 cursor-pointer inline-flex items-center justify-center text-slate-400 hover:text-slate-600"
                            >
                              {perm.delete ? (
                                <CheckSquare size={17} className="text-rose-600" />
                              ) : (
                                <Square size={17} />
                              )}
                            </button>
                          </td>

                          {/* Module All Checkbox */}
                          <td className="py-3 px-3 text-center bg-slate-50/50">
                            <button
                              type="button"
                              onClick={() => handleToggleModuleAll(perm.module)}
                              className="bg-transparent border-none p-1 cursor-pointer inline-flex items-center justify-center text-slate-400 hover:text-slate-600"
                              title="Toggle all 4 actions for this module"
                            >
                              {isModuleAll ? (
                                <CheckSquare size={17} className="text-purple-600" />
                              ) : (
                                <Square size={17} />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs cursor-pointer border-none uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={roleSubmitting}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm uppercase tracking-wider"
                >
                  {roleSubmitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Saving Role...</span>
                    </>
                  ) : (
                    <>
                      <Save size={13} />
                      <span>{editingRoleId ? 'Update Role' : 'Create Role'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
