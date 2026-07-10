import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  RefreshCw, 
  Upload, 
  X, 
  ArrowUpDown, 
  CheckCircle,
  Building,
  Filter
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://wow-getway-api.onrender.com';
  return `${base}${path}`;
};

const getImageUrl = (path) => {
  if (!path) return 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=500';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) return path;
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  return `${base}${path}`;
};

const handleImageError = (e) => {
  e.target.src = 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=500';
};

export default function CityManagement() {
  const [cities, setCities] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals / Form State
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [cityName, setCityName] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [cityStatus, setCityStatus] = useState('Active');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  
  // View Modal State
  const [viewCity, setViewCity] = useState(null);

  const fetchStatesList = async () => {
    try {
      const token = localStorage.getItem('superAdminToken');
      const res = await axios.get(getApiUrl('/api/admin/settings/states'), {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100 }
      });
      setStatesList(res.data.docs);
    } catch (err) {
      console.error('Failed to load states list:', err);
    }
  };

  const fetchCities = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('superAdminToken');
      const res = await axios.get(getApiUrl('/api/admin/settings/cities'), {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage,
          limit: 10,
          search,
          stateId: stateFilter,
          status: statusFilter,
          sortBy,
          sortOrder
        }
      });
      setCities(res.data.docs);
      setTotalDocs(res.data.totalDocs);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to fetch cities.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatesList();
  }, []);

  useEffect(() => {
    fetchCities();
  }, [currentPage, search, stateFilter, statusFilter, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError('');
    if (!file) return;

    // Validation (JPG, JPEG, PNG, WEBP, <= 2MB)
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setFileError('Invalid type. Only JPG, JPEG, PNG, WEBP allowed.');
      setSelectedFile(null);
      setImagePreview('');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileError('File exceeds 2 MB limit.');
      setSelectedFile(null);
      setImagePreview('');
      return;
    }

    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const openAddForm = () => {
    setEditId(null);
    setCityName('');
    setSelectedStateId('');
    setCityStatus('Active');
    setSelectedFile(null);
    setFileError('');
    setImagePreview('');
    setFormOpen(true);
  };

  const openEditForm = (cityObj) => {
    setEditId(cityObj._id);
    setCityName(cityObj.cityName);
    setSelectedStateId(typeof cityObj.stateId === 'object' ? cityObj.stateId._id : cityObj.stateId);
    setCityStatus(cityObj.status);
    setSelectedFile(null);
    setFileError('');
    setImagePreview(cityObj.cityImage);
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cityName.trim() || !selectedStateId) {
      Swal.fire('Validation', 'City Name and State are required.', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('cityName', cityName.trim());
    formData.append('stateId', selectedStateId);
    formData.append('status', cityStatus);
    if (selectedFile) {
      formData.append('cityImage', selectedFile);
    }

    try {
      const token = localStorage.getItem('superAdminToken');
      const headers = { 
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}` 
      };

      if (editId) {
        await axios.put(getApiUrl(`/api/admin/settings/cities/${editId}`), formData, { headers });
        Swal.fire('Saved', 'City details updated successfully.', 'success');
      } else {
        await axios.post(getApiUrl('/api/admin/settings/cities'), formData, { headers });
        Swal.fire('Added', 'New city registered successfully.', 'success');
      }
      setFormOpen(false);
      fetchCities();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to save city.', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('superAdminToken');
      // 1. Check dependencies first
      const checkRes = await axios.get(getApiUrl(`/api/admin/settings/check-dependencies`), {
        headers: { Authorization: `Bearer ${token}` },
        params: { type: 'city', id }
      });
      const counts = checkRes.data;
      const totalDeps = (counts.homestays || 0) + (counts.rooms || 0) + (counts.bookings || 0);

      if (totalDeps > 0) {
        // Show complete dependency tree and confirm cascade delete
        Swal.fire({
          title: 'Cascade Deletion Warning',
          html: `
            <div class="text-left space-y-3 font-sans">
              <p class="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 mb-4 leading-relaxed">
                ⚠️ Deleting city "<strong>${counts.name}</strong>" will also cascade delete all associated child records listed below. This action is irreversible.
              </p>
              <div class="space-y-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div class="flex justify-between border-b border-slate-200 pb-1.5">
                  <span>🏡 Linked Homestays:</span>
                  <span class="font-bold text-slate-900">${counts.homestays}</span>
                </div>
                <div class="flex justify-between border-b border-slate-200 pb-1.5">
                  <span>🛏️ Total Rooms:</span>
                  <span class="font-bold text-slate-900">${counts.rooms}</span>
                </div>
                <div class="flex justify-between border-b border-slate-200 pb-1.5">
                  <span>📅 Total Bookings:</span>
                  <span class="font-bold text-slate-900">${counts.bookings}</span>
                </div>
                <div class="flex justify-between border-b border-slate-200 pb-1.5">
                  <span>👥 Total Customers:</span>
                  <span class="font-bold text-slate-900">${counts.customers}</span>
                </div>
              </div>
              <div class="mt-4 flex flex-col gap-1.5">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Reason for Deletion</label>
                <input type="text" id="swal-delete-reason" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="Explain deletion reason...">
              </div>
            </div>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#dc2626',
          cancelButtonColor: '#94a3b8',
          confirmButtonText: 'Delete Everything',
          cancelButtonText: 'Cancel',
          preConfirm: () => {
            const reason = Swal.getPopup().querySelector('#swal-delete-reason').value;
            if (!reason || !reason.trim()) {
              Swal.showValidationMessage('Deletion reason is required');
              return false;
            }
            return reason.trim();
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await axios.post(getApiUrl('/api/admin/settings/cascade-delete'), {
                type: 'city',
                id,
                deletedReason: result.value
              }, { headers: { Authorization: `Bearer ${token}` } });
              Swal.fire('Deleted!', 'City and all associated records cascade deleted.', 'success');
              fetchCities();
            } catch (err) {
              Swal.fire('Error', err.response?.data?.message || 'Cascade deletion failed.', 'error');
            }
          }
        });
      } else {
        // No dependencies: normal soft-delete but ask for reason
        Swal.fire({
          title: 'Delete City?',
          text: `Are you sure you want to delete city "${counts.name}"? No active dependent records detected.`,
          icon: 'warning',
          input: 'text',
          inputPlaceholder: 'Enter reason for deletion (required)...',
          showCancelButton: true,
          confirmButtonColor: '#dc2626',
          cancelButtonColor: '#94a3b8',
          confirmButtonText: 'Delete',
          cancelButtonText: 'Cancel',
          inputValidator: (value) => {
            if (!value || !value.trim()) {
              return 'You must enter a reason!';
            }
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await axios.delete(getApiUrl(`/api/admin/settings/cities/${id}`), {
                headers: { Authorization: `Bearer ${token}` },
                params: { force: true, reason: result.value.trim() }
              });
              Swal.fire('Deleted!', 'City soft-deleted successfully.', 'success');
              fetchCities();
            } catch (err) {
              Swal.fire('Error', err.response?.data?.message || 'Failed to delete city.', 'error');
            }
          }
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to process deletion checks.', 'error');
    }
  };

  const handleToggleStatus = (id, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    Swal.fire({
      title: 'Change Status?',
      text: `Are you sure you want to change status to ${nextStatus}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, change',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = localStorage.getItem('superAdminToken');
          await axios.patch(
            getApiUrl(`/api/admin/settings/cities/${id}/status`),
            { status: nextStatus },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          Swal.fire('Changed!', 'Status updated successfully.', 'success');
          fetchCities();
        } catch (err) {
          console.error(err);
          Swal.fire('Error', 'Failed to toggle city status.', 'error');
        }
      }
    });
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto select-none">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Building size={22} className="stroke-[2.2]" />
            </span>
            City Management
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Configure urban regions, associate tourist locations to states, and manage image previews.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddForm}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer border-none"
        >
          <Plus size={14} />
          Add City
        </button>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm items-center">
        <div className="relative col-span-1">
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search city by name..."
            className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
          />
          {search && (
            <button 
              type="button" 
              onClick={() => setSearch('')} 
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3 justify-start sm:justify-center">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter State</label>
          <select
            value={stateFilter}
            onChange={(e) => { setStateFilter(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none text-xs font-bold text-slate-700 max-w-[200px]"
          >
            <option value="">All States</option>
            {statesList.map(st => (
              <option key={st._id} value={st._id}>{st.stateName}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 justify-start sm:justify-end">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none text-xs font-bold text-slate-700"
          >
            <option value="all">All Cities</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Main List Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin" />
            Loading cities...
          </div>
        ) : cities.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs font-bold">
            No cities registered. Use the "Add City" button to register.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-6">Image</th>
                  <th className="py-3 px-6 cursor-pointer hover:text-slate-700" onClick={() => handleSort('cityName')}>
                    City Name <ArrowUpDown size={10} className="inline ml-1" />
                  </th>
                  <th className="py-3 px-6 cursor-pointer hover:text-slate-700" onClick={() => handleSort('stateId')}>
                    Associated State <ArrowUpDown size={10} className="inline ml-1" />
                  </th>
                  <th className="py-3 px-6 cursor-pointer hover:text-slate-700 text-center" onClick={() => handleSort('status')}>
                    Status <ArrowUpDown size={10} className="inline ml-1" />
                  </th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                {cities.map((ct) => (
                  <tr key={ct._id} className="hover:bg-slate-50/20 transition-colors">
                    <td className="py-3 px-6">
                      <img 
                        src={getImageUrl(ct.cityImage)} 
                        alt={ct.cityName} 
                        onError={handleImageError}
                        className="w-10 h-10 object-cover rounded-xl border border-slate-100 bg-slate-50"
                      />
                    </td>
                    <td className="py-3 px-6">
                      <span className="font-bold text-slate-800 text-sm block">{ct.cityName}</span>
                    </td>
                    <td className="py-3 px-6">
                      <span className="text-slate-500 font-bold">
                        {typeof ct.stateId === 'object' ? ct.stateId.stateName : 'Unknown State'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(ct._id, ct.status)}
                        className="border-none bg-transparent cursor-pointer focus:outline-none"
                      >
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                          ct.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : 'bg-rose-50 text-rose-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${ct.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {ct.status}
                        </span>
                      </button>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewCity(ct)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
                          title="View Details"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditForm(ct)}
                          className="p-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-100 rounded text-slate-500 hover:text-blue-600 cursor-pointer transition-colors"
                          title="Edit"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ct._id)}
                          className="p-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded text-slate-500 hover:text-rose-600 cursor-pointer transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginated footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4">
          <span className="text-[11px] text-slate-400 font-bold">
            Showing {totalDocs > 0 ? (currentPage - 1) * 10 + 1 : 0} - {Math.min(currentPage * 10, totalDocs)} of {totalDocs} cities
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3.5 py-1.5 bg-white border border-slate-200 disabled:opacity-50 text-[11px] font-bold text-slate-700 rounded-lg cursor-pointer select-none"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3.5 py-1.5 bg-white border border-slate-200 disabled:opacity-50 text-[11px] font-bold text-slate-700 rounded-lg cursor-pointer select-none"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Form Modal Drawer */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-150 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editId ? 'Modify City Records' : 'Add New City'}
              </h3>
              <button 
                type="button" 
                onClick={() => setFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Associated State</label>
                <select
                  value={selectedStateId}
                  onChange={(e) => setSelectedStateId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none text-slate-700"
                  required
                >
                  <option value="">-- Select State --</option>
                  {statesList.map(st => (
                    <option key={st._id} value={st._id}>{st.stateName}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">City Name</label>
                <input
                  type="text"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  placeholder="e.g. Panaji"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">City Image</label>
                <div className="flex items-center gap-4">
                  {imagePreview && (
                    <img 
                      src={getImageUrl(imagePreview)} 
                      alt="Preview" 
                      onError={handleImageError}
                      className="w-16 h-16 object-cover rounded-xl border border-slate-100"
                    />
                  )}
                  <div className="flex-1 relative">
                    <input
                      type="file"
                      id="city-file-input"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="city-file-input"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer text-xs font-semibold text-slate-550 transition-all select-none"
                    >
                      <Upload size={14} />
                      Choose File (Max 2MB)
                    </label>
                  </div>
                </div>
                {fileError && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{fileError}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Initial Status</label>
                <select
                  value={cityStatus}
                  onChange={(e) => setCityStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none text-slate-700"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer border-none mt-4"
              >
                <CheckCircle size={14} />
                Save City Details
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-150 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">City Directory Card</h3>
              <button 
                type="button" 
                onClick={() => setViewCity(null)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-6">
                 <img 
                   src={getImageUrl(viewCity.cityImage)} 
                   alt={viewCity.cityName} 
                   onError={handleImageError}
                   className="w-full h-48 object-cover rounded-xl border border-slate-100"
                 />
              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">City Name</span>
                  <span className="text-xs font-bold text-slate-800">{viewCity.cityName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">State</span>
                  <span className="text-xs font-bold text-slate-800">
                    {typeof viewCity.stateId === 'object' ? viewCity.stateId.stateName : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    viewCity.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                  }`}>{viewCity.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered At</span>
                  <span className="text-xs text-slate-500 font-semibold">
                    {new Date(viewCity.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
