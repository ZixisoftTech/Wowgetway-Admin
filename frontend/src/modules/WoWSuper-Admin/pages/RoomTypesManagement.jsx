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
  X, 
  ArrowUpDown, 
  CheckCircle,
  Home
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://wow-getway-api.onrender.com';
  return `${base}${path}`;
};

export default function RoomTypesManagement() {
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals / Form State
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [roomTypeName, setRoomTypeName] = useState('');
  const [roomTypeStatus, setRoomTypeStatus] = useState('Active');
  
  // View Modal State
  const [viewRoomType, setViewRoomType] = useState(null);

  const fetchRoomTypes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('superAdminToken');
      const res = await axios.get(getApiUrl('/api/admin/settings/room-types'), {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage,
          limit: 10,
          search,
          status: statusFilter,
          sortBy,
          sortOrder
        }
      });
      setRoomTypes(res.data.docs);
      setTotalDocs(res.data.totalDocs);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to fetch room types.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomTypes();
  }, [currentPage, search, statusFilter, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const openAddForm = () => {
    setEditId(null);
    setRoomTypeName('');
    setRoomTypeStatus('Active');
    setFormOpen(true);
  };

  const openEditForm = (rtObj) => {
    setEditId(rtObj._id);
    setRoomTypeName(rtObj.roomTypeName);
    setRoomTypeStatus(rtObj.status);
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomTypeName.trim()) {
      Swal.fire('Validation', 'Room Type Name is required.', 'warning');
      return;
    }

    const payload = {
      roomTypeName: roomTypeName.trim(),
      status: roomTypeStatus
    };

    try {
      const token = localStorage.getItem('superAdminToken');
      const headers = { 
        Authorization: `Bearer ${token}` 
      };

      if (editId) {
        await axios.put(getApiUrl(`/api/admin/settings/room-types/${editId}`), payload, { headers });
        Swal.fire('Saved', 'Room Type updated successfully.', 'success');
      } else {
        await axios.post(getApiUrl('/api/admin/settings/room-types'), payload, { headers });
        Swal.fire('Added', 'New Room Type registered successfully.', 'success');
      }
      setFormOpen(false);
      fetchRoomTypes();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to save room type.', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('superAdminToken');
      // 1. Check dependencies first
      const checkRes = await axios.get(getApiUrl(`/api/admin/settings/check-dependencies`), {
        headers: { Authorization: `Bearer ${token}` },
        params: { type: 'room-type', id }
      });
      const counts = checkRes.data;
      const totalDeps = (counts.homestays || 0) + (counts.bookings || 0);

      if (totalDeps > 0) {
        // Show complete dependency tree and confirm cascade delete
        Swal.fire({
          title: 'Cascade Deletion Warning',
          html: `
            <div class="text-left space-y-3 font-sans">
              <p class="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 mb-4 leading-relaxed">
                ⚠️ Deleting room type "<strong>${counts.name}</strong>" will cascade delete it from all associated properties and bookings listed below. This action is irreversible.
              </p>
              <div class="space-y-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div class="flex justify-between border-b border-slate-200 pb-1.5">
                  <span>🏡 Linked Homestays:</span>
                  <span class="font-bold text-slate-900">${counts.homestays}</span>
                </div>
                <div class="flex justify-between border-b border-slate-200 pb-1.5">
                  <span>📅 Affected Bookings:</span>
                  <span class="font-bold text-slate-900">${counts.bookings}</span>
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
                type: 'room-type',
                id,
                deletedReason: result.value
              }, { headers: { Authorization: `Bearer ${token}` } });
              Swal.fire('Deleted!', 'Room Type and linked bookings cascade deleted successfully.', 'success');
              fetchRoomTypes();
            } catch (err) {
              Swal.fire('Error', err.response?.data?.message || 'Cascade deletion failed.', 'error');
            }
          }
        });
      } else {
        // No dependencies: normal soft-delete but ask for reason
        Swal.fire({
          title: 'Delete Room Type?',
          text: `Are you sure you want to delete room type "${counts.name}"? No active dependent records detected.`,
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
              await axios.delete(getApiUrl(`/api/admin/settings/room-types/${id}`), {
                headers: { Authorization: `Bearer ${token}` },
                params: { force: true, reason: result.value.trim() }
              });
              Swal.fire('Deleted!', 'Room Type soft-deleted successfully.', 'success');
              fetchRoomTypes();
            } catch (err) {
              Swal.fire('Error', err.response?.data?.message || 'Failed to delete room type.', 'error');
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
            getApiUrl(`/api/admin/settings/room-types/${id}/status`),
            { status: nextStatus },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          Swal.fire('Changed!', 'Status updated successfully.', 'success');
          fetchRoomTypes();
        } catch (err) {
          console.error(err);
          Swal.fire('Error', 'Failed to toggle room type status.', 'error');
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
              <Home size={22} className="stroke-[2.2]" />
            </span>
            Room Types Management
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Configure room classification models (Single, Deluxe, Suit, Villa, Cottage) and status.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddForm}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer border-none"
        >
          <Plus size={14} />
          Add Room Type
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search room types..."
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
        
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none text-xs font-bold text-slate-700"
          >
            <option value="all">All Types</option>
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
            Loading room types...
          </div>
        ) : roomTypes.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs font-bold">
            No room types registered. Use the "Add Room Type" button to register.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-6 cursor-pointer hover:text-slate-700" onClick={() => handleSort('roomTypeName')}>
                    Room Type <ArrowUpDown size={10} className="inline ml-1" />
                  </th>
                  <th className="py-3 px-6 cursor-pointer hover:text-slate-700 text-center" onClick={() => handleSort('status')}>
                    Status <ArrowUpDown size={10} className="inline ml-1" />
                  </th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                {roomTypes.map((rt) => (
                  <tr key={rt._id} className="hover:bg-slate-50/20 transition-colors">
                    <td className="py-3 px-6">
                      <span className="font-bold text-slate-850 text-sm block">{rt.roomTypeName}</span>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(rt._id, rt.status)}
                        className="border-none bg-transparent cursor-pointer focus:outline-none"
                      >
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                          rt.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : 'bg-rose-50 text-rose-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${rt.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {rt.status}
                        </span>
                      </button>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewRoomType(rt)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
                          title="View Details"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditForm(rt)}
                          className="p-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-100 rounded text-slate-500 hover:text-blue-600 cursor-pointer transition-colors"
                          title="Edit"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rt._id)}
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
            Showing {totalDocs > 0 ? (currentPage - 1) * 10 + 1 : 0} - {Math.min(currentPage * 10, totalDocs)} of {totalDocs} room types
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

      {/* Add / Edit Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-150 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editId ? 'Modify Room Type Records' : 'Add New Room Type'}
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Room Type Name</label>
                <input
                  type="text"
                  value={roomTypeName}
                  onChange={(e) => setRoomTypeName(e.target.value)}
                  placeholder="e.g. Deluxe Room"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Initial Status</label>
                <select
                  value={roomTypeStatus}
                  onChange={(e) => setRoomTypeStatus(e.target.value)}
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
                Save Room Type Details
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewRoomType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-150 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Room Type Card Details</h3>
              <button 
                type="button" 
                onClick={() => setViewRoomType(null)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3 w-full">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room Type Name</span>
                  <span className="text-sm font-bold text-slate-800">{viewRoomType.roomTypeName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    viewRoomType.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                  }`}>{viewRoomType.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered At</span>
                  <span className="text-xs text-slate-500 font-semibold">
                    {new Date(viewRoomType.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
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
