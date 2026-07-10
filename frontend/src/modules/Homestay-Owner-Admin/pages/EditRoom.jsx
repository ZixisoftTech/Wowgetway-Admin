import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';

export default function EditRoom() {
  const navigate = useNavigate();
  const { propertyId } = useParams();
  const location = useLocation();

  // Find Room info or default
  const defaultRoom = {
    type: 'Deluxe Room',
    count: 4,
    occupancy: 2,
    extraPerson: 'Allowed',
    roomNumbers: '101, 102, 103, 104',
    b2bRate: 2500,
    b2cRate: 3000
  };

  const [room, setRoom] = useState(defaultRoom);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!room.count) {
      setError('Number of rooms is required.');
      return;
    }
    if (!room.roomNumbers) {
      setError('Room numbers are required.');
      return;
    }
    if (!room.b2bRate || !room.b2cRate) {
      setError('Room price rates are required.');
      return;
    }

    setSuccess('Room configuration updated successfully!');
    setTimeout(() => {
      navigate(`/homestay-owner/inventory/property/${propertyId}`);
    }, 1500);
  };

  return (
    <div className="space-y-6 select-none font-sans pb-12">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 p-6 rounded-3xl shadow-sm gap-4">
        <div className="space-y-1">
          <button 
            onClick={() => navigate(`/homestay-owner/inventory/property/${propertyId}`)}
            className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-transparent border-none cursor-pointer hover:text-slate-600 mb-1 p-0"
          >
            <ArrowLeft size={12} className="stroke-[2.5]" />
            <span>Back to Property Details</span>
          </button>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Edit Room Details</h1>
          <p className="text-[10px] font-semibold text-slate-400">
            Configure room types, occupancies, and specific plan pricing.
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Room Type</label>
              <select
                value={room.type}
                onChange={(e) => setRoom({...room, type: e.target.value})}
                className="w-full px-4 py-3 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none focus:border-rose-600 cursor-pointer shadow-sm"
              >
                <option value="Deluxe Room">Deluxe Room</option>
                <option value="Super Deluxe">Super Deluxe</option>
                <option value="Suite">Suite</option>
                <option value="Family Room">Family Room</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Number of Rooms</label>
              <input
                type="number"
                value={room.count}
                onChange={(e) => setRoom({...room, count: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-3 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none focus:border-rose-600 shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Max Occupancy</label>
              <select
                value={room.occupancy}
                onChange={(e) => setRoom({...room, occupancy: parseInt(e.target.value) || 2})}
                className="w-full px-4 py-3 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none focus:border-rose-600 cursor-pointer shadow-sm"
              >
                <option value="1">1 Guest</option>
                <option value="2">2 Guests</option>
                <option value="3">3 Guests</option>
                <option value="4">4 Guests</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Extra Bed Accommodation</label>
              <select
                value={room.extraPerson}
                onChange={(e) => setRoom({...room, extraPerson: e.target.value})}
                className="w-full px-4 py-3 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none focus:border-rose-600 cursor-pointer shadow-sm"
              >
                <option value="Allowed">Allowed</option>
                <option value="Not Allowed">Not Allowed</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Room Numbers (Comma Separated)</label>
            <input
              type="text"
              value={room.roomNumbers}
              onChange={(e) => setRoom({...room, roomNumbers: e.target.value})}
              className="w-full px-4 py-3 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5.5 border-t border-slate-50 pt-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">B2B Base Rate (₹) *</label>
              <input
                type="number"
                value={room.b2bRate}
                onChange={(e) => setRoom({...room, b2bRate: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-3 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">B2C Base Rate (₹) *</label>
              <input
                type="number"
                value={room.b2cRate}
                onChange={(e) => setRoom({...room, b2cRate: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-3 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none focus:border-rose-600 text-rose-600"
              />
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-[11px] font-bold">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-255 text-emerald-600 rounded-xl text-[11px] font-bold">
              ✓ {success}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => navigate(`/homestay-owner/inventory/property/${propertyId}`)}
              className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-707 font-bold rounded-2xl text-xs transition-colors cursor-pointer bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100 uppercase tracking-wider"
            >
              <Save size={13} />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
