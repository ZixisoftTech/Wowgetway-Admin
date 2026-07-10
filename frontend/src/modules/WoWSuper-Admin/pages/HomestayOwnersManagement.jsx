import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useDispatch } from 'react-redux';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit2, 
  Trash2, 
  Users, 
  UserCheck, 
  ShieldAlert, 
  Building,
  LogIn,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import MetricCard from '../components/widgets/MetricCard.jsx';
import AddEditHomestayOwner from './AddEditHomestayOwner.jsx';
import HomestayOwnerDetails from './HomestayOwnerDetails.jsx';
import { authSuccess as ownerAuthSuccess } from '../../Homestay-Owner-Admin/store/homestayOwnerAuthSlice.js';

const API_BASE_URL = (window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app') + '/api/dashboard/owners';

export default function HomestayOwnersManagement() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();

  // Parsing viewMode and selectedId from the active route URL path
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'add' | 'edit' | 'details'
  const [selectedId, setSelectedId] = useState(null);

  // Listing state & query parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const path = location.pathname;
    if (path === '/homestay-owners/add') {
      setViewMode('add');
      setSelectedId(null);
    } else if (path.startsWith('/homestay-owners/edit/')) {
      setViewMode('edit');
      setSelectedId(routeId);
    } else if (path.startsWith('/homestay-owners/') && routeId) {
      setViewMode('details');
      setSelectedId(routeId);
    } else {
      setViewMode('list');
      setSelectedId(null);
    }
  }, [location.pathname, routeId]);

  // 1. Fetch Paginated Owners List
  const { data: ownersData = { data: [], totalRecords: 0 }, isLoading: listLoading } = useQuery({
    queryKey: ['ownersList', searchQuery, statusFilter, currentPage],
    queryFn: async () => {
      const response = await axios.get(API_BASE_URL, {
        params: {
          search: searchQuery,
          status: statusFilter,
          page: currentPage,
          limit: pageSize
        }
      });
      // Handle fallback if backend returns a simple array directly (e.g. unpaginated)
      if (Array.isArray(response.data)) {
        return { data: response.data, totalRecords: response.data.length };
      }
      return response.data;
    }
  });

  const ownersList = ownersData.data || [];
  const totalRecords = ownersData.totalRecords || 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Reset page to 1 when changing filters
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // 2. Fetch KPI Stats
  const { data: stats = { totalOwners: 0, activeOwners: 0, pendingVerification: 0, totalProperties: 0 }, isLoading: statsLoading } = useQuery({
    queryKey: ['ownersStats'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/stats`);
      return response.data;
    }
  });

  // 3. Fetch Single Owner Details
  const { data: ownerDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['ownerDetails', selectedId],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/${selectedId}`);
      return response.data;
    },
    enabled: !!selectedId && (viewMode === 'details' || viewMode === 'edit')
  });

  // 4. Mutations
  const createMutation = useMutation({
    mutationFn: async (newOwner) => {
      const response = await axios.post(API_BASE_URL, newOwner);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ownersList']);
      queryClient.invalidateQueries(['ownersStats']);
      Swal.fire({
        title: 'Success',
        text: 'Home Stay Owner added successfully.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#2563eb'
      }).then(() => {
        navigate('/homestay-owners');
      });
    },
    onError: (err) => {
      Swal.fire({
        title: 'Error',
        text: err.response?.data?.message || err.response?.data?.error || 'Failed to create owner account',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updatedData }) => {
      const response = await axios.put(`${API_BASE_URL}/${id}`, updatedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ownersList']);
      queryClient.invalidateQueries(['ownersStats']);
      queryClient.invalidateQueries(['ownerDetails', selectedId]);
      Swal.fire({
        title: 'Updated',
        text: 'Home Stay Owner updated successfully.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#2563eb'
      }).then(() => {
        navigate('/homestay-owners');
      });
    },
    onError: (err) => {
      Swal.fire({
        title: 'Error',
        text: err.response?.data?.message || err.response?.data?.error || 'Failed to update owner profile',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, force }) => {
      const response = await axios.delete(`${API_BASE_URL}/${id}${force ? '?force=true' : ''}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ownersList']);
      queryClient.invalidateQueries(['ownersStats']);
      Swal.fire({
        title: 'Deleted!',
        text: 'Home Stay Owner hard-deleted successfully.',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      });
    },
    onError: (err, variables) => {
      if (err.response?.status === 409 && err.response?.data?.hasAssociatedData) {
        const detailsList = err.response.data.details.map(d => `<li>• ${d}</li>`).join('');
        Swal.fire({
          title: 'Associated Data Warning',
          html: `
            <div class="text-left text-xs text-slate-600">
              <p class="font-bold text-rose-600">${err.response.data.message}</p>
              <p class="font-semibold text-slate-700 mt-2">Linked Properties:</p>
              <ul class="max-h-32 overflow-y-auto bg-slate-50 p-2 rounded border border-slate-200 mt-1 select-none space-y-1">
                ${detailsList}
              </ul>
              <p class="text-[11px] text-slate-400 mt-3">Are you sure you want to force hard-delete this owner from the database? This action cannot be undone.</p>
            </div>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#dc2626',
          cancelButtonColor: '#94a3b8',
          confirmButtonText: 'Force Hard-Delete',
          cancelButtonText: 'Cancel'
        }).then((result) => {
          if (result.isConfirmed) {
            deleteMutation.mutate({ id: variables.id, force: true });
          }
        });
      } else {
        Swal.fire({
          title: 'Error',
          text: err.response?.data?.message || err.response?.data?.error || 'Failed to delete owner record',
          icon: 'error',
          confirmButtonColor: '#dc2626'
        });
      }
    }
  });

  const handleSave = (formData) => {
    if (viewMode === 'add') {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate({ id: selectedId, updatedData: formData });
    }
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Delete Home Stay Owner?',
      text: 'Are you sure you want to hard-delete this Home Stay Owner? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate({ id, force: false });
      }
    });
  };

  // Direct login / impersonation action handler
  const handleImpersonateLogin = async (id) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/${id}/impersonate`);
      // Dispatch token and details to homestayOwnerAuthSlice Redux store
      dispatch(ownerAuthSuccess({ token: res.data.token, user: res.data.user }));
      
      Swal.fire({
        title: 'Impersonating Owner',
        text: `Redirecting directly to Homestay Owner dashboard...`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        window.location.href = '/homestay-owner/dashboard';
      });
    } catch (err) {
      Swal.fire({
        title: 'Impersonation Failed',
        text: err.response?.data?.message || 'Could not establish direct session.',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
    }
  };

  const layoutVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="space-y-6 sm:space-y-8 select-none">
      {/* 1. LIST VIEW */}
      {viewMode === 'list' && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
          
          {/* Header Title Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight flex items-center gap-2">
                <UserCheck className="text-sky-500 w-6 h-6" />
                <span>Manage Homestay Owners</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Register homestay owners, manage verified KYC parameters, and link properties.
              </p>
            </div>
            
            <button
              onClick={() => navigate('/homestay-owners/add')}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all cursor-pointer"
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span>Add Owner</span>
            </button>
          </div>

          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <MetricCard
              title="Total Owners"
              value={stats.totalOwners}
              icon={Users}
              iconBgColor="bg-blue-500/10"
              iconColor="text-blue-600"
              bgColor="bg-[#edf4ff]"
              loading={statsLoading}
            />
            <MetricCard
              title="Active Owners"
              value={stats.activeOwners}
              icon={UserCheck}
              iconBgColor="bg-emerald-500/10"
              iconColor="text-emerald-650"
              bgColor="bg-[#ecfbf3]"
              loading={statsLoading}
            />
            <MetricCard
              title="Pending Verification"
              value={stats.pendingVerification}
              icon={ShieldAlert}
              iconBgColor="bg-amber-500/10"
              iconColor="text-amber-650"
              bgColor="bg-[#fff8f0]"
              loading={statsLoading}
            />
            <MetricCard
              title="Linked Homestays"
              value={stats.totalProperties}
              icon={Building}
              iconBgColor="bg-indigo-500/10"
              iconColor="text-indigo-650"
              bgColor="bg-[#f8f0ff]"
              loading={statsLoading}
            />
          </div>

          {/* Filters Bar */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or mobile number..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all"
              />
            </div>

            <div className="flex gap-2.5 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider hidden sm:inline">Verification Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer focus:ring-2 focus:ring-blue-100"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Deleted">Deleted</option>
                </select>
              </div>
            </div>
          </div>

          {/* Responsive Tabular Grid List */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Owner Name</th>
                    <th className="py-4 px-6">Mobile Number</th>
                    <th className="py-4 px-6">Email Address</th>
                    <th className="py-4 px-6 text-center">Linked Properties</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6">Created By</th>
                    <th className="py-4 px-6">Created Date</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                  {listLoading ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        <div className="flex justify-center gap-1.5 items-center animate-pulse">
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-75" />
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-150" />
                        </div>
                      </td>
                    </tr>
                  ) : ownersList.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-450 font-medium">
                        No homestay owners registered matching the filters.
                      </td>
                    </tr>
                  ) : (
                    ownersList.map((owner) => {
                      const joiningDate = owner.createdAt 
                        ? new Date(owner.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
                        : '12-06-2026';

                      return (
                        <tr key={owner._id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              {owner.profilePhoto ? (
                                <img
                                  src={owner.profilePhoto}
                                  alt={`${owner.firstName} ${owner.lastName}`}
                                  className="w-8 h-8 rounded-lg object-cover border border-slate-100 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-500 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
                                  {owner.firstName[0]}{owner.lastName[0]}
                                </div>
                              )}
                              <span className="font-bold text-slate-800">
                                {owner.firstName} {owner.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-600">{owner.mobile}</td>
                          <td className="py-4 px-6 text-slate-500 font-medium">{owner.email}</td>
                          <td className="py-4 px-6 text-center">
                            <span className="bg-slate-100 text-slate-650 px-2.5 py-1 rounded-md text-[10px] font-bold">
                              {owner.properties?.length || 0} Homestays
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide ${
                              owner.status === 'Active' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : owner.status === 'Pending Verification'
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : owner.status === 'Inactive'
                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {owner.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-medium">{owner.createdBy || 'Rahul Sharma'}</td>
                          <td className="py-4 px-6 text-slate-500 font-medium">{joiningDate}</td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-1.5">
                              {owner.status !== 'Deleted' && (
                                <button
                                  onClick={() => handleImpersonateLogin(owner._id)}
                                  className="p-1.5 text-slate-550 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Login as Owner"
                                >
                                  <LogIn size={15} />
                                </button>
                              )}
                              <button
                                onClick={() => navigate(`/homestay-owners/${owner._id}`)}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="View profile"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => navigate(`/homestay-owners/edit/${owner._id}`)}
                                className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit profile"
                              >
                                <Edit2 size={15} />
                              </button>
                              {owner.status !== 'Deleted' && (
                                <button
                                  onClick={() => handleDelete(owner._id)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete owner"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls Footer */}
            <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Showing {ownersList.length} of {totalRecords} owners</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-slate-600 font-extrabold font-mono text-xs">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. FORM VIEW (ADD / EDIT) */}
      {(viewMode === 'add' || viewMode === 'edit') && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show">
          <AddEditHomestayOwner
            ownerDetails={viewMode === 'edit' ? ownerDetails : null}
            loading={viewMode === 'edit' && detailsLoading}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            onBack={() => navigate('/homestay-owners')}
            onSave={handleSave}
          />
        </motion.div>
      )}

      {/* 3. DETAILS VIEW */}
      {viewMode === 'details' && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show">
          <HomestayOwnerDetails
            ownerId={selectedId}
            ownerDetails={ownerDetails}
            loading={detailsLoading}
            onBack={() => navigate('/homestay-owners')}
            onEdit={(owner) => navigate(`/homestay-owners/edit/${owner._id}`)}
          />
        </motion.div>
      )}

    </div>
  );
}
