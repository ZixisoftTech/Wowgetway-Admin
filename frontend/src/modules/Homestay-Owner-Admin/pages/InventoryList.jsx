import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal,
  MapPin,
  Building,
  Calendar,
  AlertTriangle,
  Send
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  return `${base}${path}`;
};

const getImageUrl = (path) => {
  if (!path) return 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=400&q=80';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  return getApiUrl(path);
};

export default function InventoryList() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  
  // Search, Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [sortOption, setSortOption] = useState('Newest');

  // Confirmation modal state
  const [deletePropertyId, setDeletePropertyId] = useState(null);

  // Backend properties state
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch properties from MongoDB
  const fetchProperties = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('homestayOwnerToken');
      if (!token) {
        navigate('/login');
        return;
      }
      const res = await axios.get(getApiUrl('/api/homestay-owner/properties'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties(res.data);
    } catch (err) {
      console.error("Failed to load owner properties:", err);
      Swal.fire('Error', 'Failed to retrieve inventory listings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // Handle Delete Confirmation
  const handleDeleteClick = (id) => {
    setDeletePropertyId(id);
  };

  const handleConfirmDelete = async () => {
    try {
      const token = localStorage.getItem('homestayOwnerToken');
      await axios.delete(getApiUrl(`/api/homestay-owner/properties/${deletePropertyId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      Swal.fire({
        title: 'Deleted!',
        text: 'Property has been deleted successfully.',
        icon: 'success',
        confirmButtonColor: '#be123c'
      });
      setDeletePropertyId(null);
      fetchProperties();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to delete property.', 'error');
    }
  };

  // Handle Publish Action
  const handlePublishClick = async (id) => {
    const res = await Swal.fire({
      title: 'Publish Property',
      text: 'Are you sure you want to submit this property listing for admin review?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Submit',
      confirmButtonColor: '#be123c',
      cancelButtonColor: '#64748b'
    });

    if (res.isConfirmed) {
      try {
        Swal.showLoading();
        const token = localStorage.getItem('homestayOwnerToken');
        await axios.post(getApiUrl('/api/homestay-owner/properties/publish'), { propertyId: id }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Swal.fire({
          title: 'Submitted!',
          text: 'Property has been submitted for admin review successfully.',
          icon: 'success',
          confirmButtonColor: '#be123c'
        });
        fetchProperties();
      } catch (err) {
        console.error(err);
        Swal.fire({
          title: 'Publish Failed',
          text: err.response?.data?.message || 'Failed to submit property.',
          icon: 'error',
          confirmButtonColor: '#be123c'
        });
      }
    }
  };

  // Dynamic filter choices from loaded data
  const citiesList = useMemo(() => {
    const list = properties.map(p => p.city).filter(Boolean);
    return ['All', ...new Set(list)];
  }, [properties]);

  // Filter & Sort Logic
  const filteredProperties = properties.filter(p => {
    const nameStr = p.name || '';
    const idStr = p.propertyId || p._id || '';
    const cityStr = p.city || '';
    const ownerStr = p.ownerName || '';

    const matchesSearch = 
      nameStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cityStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ownerStr.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    const matchesCity = cityFilter === 'All' || cityStr === cityFilter;

    return matchesSearch && matchesStatus && matchesCity;
  }).sort((a, b) => {
    if (sortOption === 'Newest') return new Date(b.createdAt || b.createdDate) - new Date(a.createdAt || a.createdDate);
    if (sortOption === 'Oldest') return new Date(a.createdAt || a.createdDate) - new Date(b.createdAt || b.createdDate);
    if (sortOption === 'A-Z') return (a.name || '').localeCompare(b.name || '');
    if (sortOption === 'Z-A') return (b.name || '').localeCompare(a.name || '');
    if (sortOption === 'Rooms') return (b.rooms || 0) - (a.rooms || 0);
    return 0;
  });

  return (
    <div className="space-y-6 select-none font-sans pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 p-6 rounded-3xl shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Inventory</h1>
          <p className="text-[10px] font-semibold text-slate-400">
            Manage your homestay listings, room configurations, and rate plans.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* View Toggler */}
          <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-150 shadow-inner">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg border-none cursor-pointer transition-all ${
                viewMode === 'table' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 bg-transparent'
              }`}
            >
              <List size={16} className="stroke-[2.5]" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg border-none cursor-pointer transition-all ${
                viewMode === 'grid' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 bg-transparent'
              }`}
            >
              <Grid size={16} className="stroke-[2.5]" />
            </button>
          </div>

          <button
            onClick={() => navigate('/homestay-owner/inventory/setup-property?new=true')}
            className="flex-1 sm:flex-none px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100 uppercase tracking-wider"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>Add New Property</span>
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 bg-white border border-slate-100 p-5 rounded-3xl shadow-sm gap-4 items-center">
        {/* Search */}
        <div className="md:col-span-4 relative">
          <Search size={14} className="absolute left-3.5 top-3 text-slate-400 stroke-[2.5]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, name, owner, city..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none focus:border-rose-600"
          />
        </div>

        {/* Status Filter */}
        <div className="md:col-span-2 flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none focus:border-rose-600 cursor-pointer"
          >
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Draft">Draft</option>
            <option value="Submitted For Review">Submitted For Review</option>
            <option value="Changes Requested">Changes Requested</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* City Filter */}
        <div className="md:col-span-2 flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">City:</span>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none focus:border-rose-600 cursor-pointer"
          >
            <option value="All">All</option>
            {citiesList.filter(c => c !== 'All').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Sort Filter */}
        <div className="md:col-span-4 flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
            <SlidersHorizontal size={12} className="inline mr-1" />Sort:
          </span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none focus:border-rose-600 cursor-pointer"
          >
            <option value="Newest">Newest Created</option>
            <option value="Oldest">Oldest Created</option>
            <option value="A-Z">A-Z Name</option>
            <option value="Z-A">Z-A Name</option>
            <option value="Rooms">Most Rooms</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 font-bold">
          <p>Loading listings from MongoDB Atlas...</p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4 text-center">S.No</th>
                  <th className="py-3 px-4">Property Image</th>
                  <th className="py-3 px-4">Property Details</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Owner Name</th>
                  <th className="py-3 px-4">Rooms / Occupancy</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-707">
                {filteredProperties.map((p, idx) => (
                  <tr key={p._id} className="hover:bg-slate-50/20 transition-colors">
                    <td className="py-4 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-4 px-4">
                      <div className="w-14 h-10 rounded-xl overflow-hidden shadow-sm border border-slate-100">
                        <img src={getImageUrl(p.coverImage)} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <span className="block font-black text-slate-800 leading-none">{p.name || 'Untitled Property'}</span>
                        <span className="block text-[8px] text-slate-400 font-extrabold uppercase mt-1 leading-none font-mono">
                          ID: {p.propertyId || p._id}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400 stroke-[2.5]" />
                        <span className="text-slate-500 font-bold">{p.address ? `${p.city || ''}, ${p.state || ''}` : 'Location pending'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-800 font-extrabold">
                      <div>
                        <span className="block">{p.ownerName}</span>
                        <span className="block text-[9px] text-slate-400 font-semibold mt-0.5 leading-none">{p.ownerMobile || p.phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <span className="block text-slate-800 font-extrabold">{p.rooms || 0} Rooms</span>
                        <span className="block text-[9px] text-slate-400">Max Occupancy: {p.occupancy || 0}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider inline-block ${
                        p.status === 'Active' || p.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                        p.status === 'Submitted For Review' ? 'bg-blue-50 text-blue-600' :
                        p.status === 'Changes Requested' ? 'bg-amber-50 text-amber-600' :
                        p.status === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-rose-50 text-rose-500'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {p.status === 'Submitted For Review' ? (
                          <button
                            onClick={() => navigate(`/homestay-owner/inventory/setup-property?propertyId=${p._id}&preview=true`)}
                            title="Preview Listing"
                            className="w-7.5 h-7.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center transition-colors bg-white cursor-pointer"
                          >
                            <Eye size={13} className="stroke-[2.5]" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => navigate(`/homestay-owner/inventory/setup-property?propertyId=${p._id}`)}
                              title={p.status === 'Draft' ? 'Continue Draft' : 'Edit Property'}
                              className="w-7.5 h-7.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center transition-colors bg-white cursor-pointer"
                            >
                              <Edit size={13} className="stroke-[2.5]" />
                            </button>
                            {p.status === 'Draft' && (
                              <button
                                onClick={() => handlePublishClick(p._id)}
                                title="Publish"
                                className="w-7.5 h-7.5 border border-blue-200 hover:bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center transition-colors bg-white cursor-pointer"
                              >
                                <Send size={13} className="stroke-[2.5]" />
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteClick(p._id)}
                          title="Delete Property"
                          className="w-7.5 h-7.5 border border-rose-200 hover:bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center transition-colors bg-white cursor-pointer"
                        >
                          <Trash2 size={13} className="stroke-[2.5]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Empty State */}
          {filteredProperties.length === 0 && (
            <div className="p-8 text-center text-slate-400 font-bold space-y-2">
              <p>No homestays match the search query or status filter.</p>
            </div>
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProperties.map((p) => (
            <div key={p._id} className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
              <div>
                {/* Cover Image & Status Badge */}
                <div className="relative h-44 w-full">
                  <img src={getImageUrl(p.coverImage)} alt={p.name} className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-black text-white font-mono">
                    ID: {p.propertyId || p._id}
                  </div>
                  <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                    p.status === 'Active' || p.status === 'Approved' ? 'bg-emerald-50/95 text-emerald-600' :
                    p.status === 'Submitted For Review' ? 'bg-blue-50/95 text-blue-600' :
                    p.status === 'Changes Requested' ? 'bg-amber-50/95 text-amber-600' :
                    p.status === 'Draft' ? 'bg-slate-100/95 text-slate-500' : 'bg-rose-50/95 text-rose-500'
                  }`}>
                    {p.status}
                  </span>
                </div>

                {/* Details Section */}
                <div className="p-5 space-y-3">
                  <h3 className="text-sm font-black text-slate-800 tracking-tight leading-snug">{p.name || 'Untitled Property'}</h3>
                  
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                    <MapPin size={13} className="stroke-[2.2]" />
                    <span className="truncate">{p.address ? `${p.city || ''}, ${p.state || ''}` : 'Location pending'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4.5 pt-2 border-t border-slate-50">
                    <div className="space-y-0.5">
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Rooms</span>
                      <span className="text-xs font-black text-slate-700">{p.rooms || 0} Rooms</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Occupancy</span>
                      <span className="text-xs font-black text-slate-700">{p.occupancy || 0} Guests</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-5 pt-0 border-t border-slate-50/60 bg-slate-50/20 flex items-center justify-end gap-3">
                <div className="flex items-center gap-1.5 w-full justify-between">
                  {p.status === 'Draft' && (
                    <button
                      onClick={() => handlePublishClick(p._id)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-[9px] uppercase tracking-wider transition-colors cursor-pointer border-none"
                    >
                      Publish
                    </button>
                  )}
                  <div className="flex gap-1.5 ml-auto">
                    {p.status === 'Submitted For Review' ? (
                      <button
                        onClick={() => navigate(`/homestay-owner/inventory/setup-property?propertyId=${p._id}&preview=true`)}
                        className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 font-black rounded-xl text-[9px] uppercase tracking-wider transition-colors cursor-pointer bg-white"
                      >
                        Preview
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/homestay-owner/inventory/setup-property?propertyId=${p._id}`)}
                        className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 font-black rounded-xl text-[9px] uppercase tracking-wider transition-colors cursor-pointer bg-white"
                      >
                        {p.status === 'Draft' ? 'Continue' : 'Edit'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteClick(p._id)}
                      className="p-2 border border-rose-200 hover:bg-rose-50 text-rose-500 rounded-xl transition-colors cursor-pointer bg-white"
                    >
                      <Trash2 size={13} className="stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Grid Empty State */}
          {filteredProperties.length === 0 && (
            <div className="col-span-full p-8 text-center text-slate-400 font-bold">
              <p>No homestays match the search query or status filter.</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination component */}
      <div className="bg-white border border-slate-100 px-6 py-4.5 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <span className="text-xs font-bold text-slate-400">
          Showing 1 to {filteredProperties.length} of {filteredProperties.length} properties
        </span>
        <div className="flex items-center gap-1.5">
          <button className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-400 rounded-xl transition-colors cursor-pointer bg-white disabled:opacity-50 disabled:pointer-events-none" disabled>
            <ChevronLeft size={14} className="stroke-[2.5]" />
          </button>
          <button className="w-8 h-8 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center justify-center border-none">
            1
          </button>
          <button className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-400 rounded-xl transition-colors cursor-pointer bg-white disabled:opacity-50 disabled:pointer-events-none" disabled>
            <ChevronRight size={14} className="stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal component */}
      {deletePropertyId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle size={18} className="stroke-[2.5]" />
              </div>
              <h4 className="text-sm font-black tracking-tight text-slate-800">Delete Property</h4>
            </div>

            <p className="text-xs font-bold text-slate-500 leading-relaxed">
              Are you sure you want to delete this property? This action cannot be undone and will permanently remove it from your inventory.
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setDeletePropertyId(null)}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer border-none shadow-sm shadow-rose-100"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
