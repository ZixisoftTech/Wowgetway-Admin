import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft,
  MapPin,
  Wifi,
  Car,
  Utensils,
  Zap,
  Dog,
  Mountain,
  Flame,
  ChefHat,
  Shirt,
  Edit,
  Plus,
  Eye,
  Trash2,
  Calendar,
  Grid,
  Percent,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';

export default function PropertyDetails() {
  const navigate = useNavigate();
  const { propertyId } = useParams();
  
  // Property details mock state
  const [property, setProperty] = useState({
    id: propertyId || 'PROP-2025-001',
    name: 'Panchpokhari Homestay',
    type: 'Homestay',
    address: 'Helambu Ward 4',
    city: 'Helambu',
    state: 'Sindhupalchok, Bagmati',
    country: 'Nepal',
    pinCode: '45300',
    ownerName: 'Keshav',
    phone: '+977-9841234567',
    email: 'owner@homestay.com',
    description: 'A cozy, premium mountain retreat nestled under the Panchpokhari peaks, offering genuine hospitality, local culinary experiences, and majestic Himalayan views. Located at Sindhupalchok, Helambu, this homestay offers visitors an escape into pure nature with modern hospitality comforts.',
    status: 'Active',
    coverImage: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=400&q=80'
    ],
    amenities: ['Wifi', 'Parking', 'Restaurant', 'Mountain View', 'Room Heater', 'Power Backup', 'Laundry'],
    rooms: [
      { id: 'RM-101', type: 'Deluxe Room', count: 4, occupancy: 2, extraPerson: 'Allowed', roomNumbers: '101, 102, 103, 104', b2bRate: 2500, b2cRate: 3000 },
      { id: 'RM-201', type: 'Super Deluxe', count: 2, occupancy: 3, extraPerson: 'Allowed', roomNumbers: '201, 202', b2bRate: 3500, b2cRate: 4200 }
    ],
    rates: { EP: 'Room Only', CP: 'Breakfast Included', MAP: 'Breakfast + Dinner', AP: 'All Meals Included' }
  });

  const handleToggleStatus = () => {
    setProperty(prev => ({
      ...prev,
      status: prev.status === 'Active' ? 'Inactive' : 'Active'
    }));
  };

  const handleEditRoom = (roomId) => {
    navigate(`/homestay-owner/inventory/property/${property.id}/edit-room`, { state: { roomId } });
  };

  const amenityIcons = {
    'Wifi': Wifi,
    'Parking': Car,
    'Restaurant': Utensils,
    'Power Backup': Zap,
    'Pet Friendly': Dog,
    'Mountain View': Mountain,
    'Room Heater': Flame,
    'Kitchen': ChefHat,
    'Laundry': Shirt
  };

  return (
    <div className="space-y-6 select-none font-sans pb-12">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 p-6 rounded-3xl shadow-sm gap-4">
        <div className="space-y-1">
          <button 
            onClick={() => navigate('/homestay-owner/inventory')}
            className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-transparent border-none cursor-pointer hover:text-slate-600 mb-1 p-0"
          >
            <ArrowLeft size={12} className="stroke-[2.5]" />
            <span>Back to Inventory</span>
          </button>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">{property.name}</h1>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none font-mono">
            ID: {property.id}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate(`/homestay-owner/inventory/property/${property.id}/rate-chart`)}
            className="px-5 py-3 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white"
          >
            <Calendar size={13} className="text-slate-400" />
            <span>View Rate Chart</span>
          </button>

          <button
            onClick={() => navigate(`/homestay-owner/inventory/property/${property.id}/edit`)}
            className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100 uppercase tracking-wider"
          >
            <Edit size={13} />
            <span>Edit Property</span>
          </button>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Section: Details */}
        <div className="lg:col-span-8 space-y-6">
          {/* Cover & Gallery card */}
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm p-6 space-y-5">
            <div className="relative h-64 md:h-80 w-full rounded-2xl overflow-hidden border border-slate-100 shadow-inner">
              <img src={property.coverImage} alt={property.name} className="w-full h-full object-cover" />
              <button 
                onClick={() => alert('Cover photo upload modal...')}
                className="absolute bottom-4 right-4 px-4 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white font-bold rounded-xl text-[10px] flex items-center gap-1.5 border-none cursor-pointer transition-colors shadow-lg"
              >
                <ImageIcon size={12} />
                <span>Edit Cover Photo</span>
              </button>
            </div>

            {/* Gallery list */}
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {property.gallery.map((img, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                  <img src={img} alt="Gallery item" className="w-full h-full object-cover" />
                </div>
              ))}
              {/* Trigger click */}
              <button 
                onClick={() => alert('Add more photo...')}
                className="border border-dashed border-slate-205 rounded-xl bg-slate-50/50 hover:bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-1 cursor-pointer transition-all aspect-video text-[10px] font-black uppercase tracking-wider p-0"
              >
                <Plus size={15} />
                <span>Add Image</span>
              </button>
            </div>
          </div>

          {/* Description Card */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase tracking-wider text-[10px] text-slate-400">Description</h3>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">{property.description}</p>
          </div>

          {/* Amenities Card */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase tracking-wider text-[10px] text-slate-400">Amenities</h3>
            <div className="flex flex-wrap gap-2.5">
              {property.amenities.map((item) => {
                const IconComp = amenityIcons[item] || Wifi;
                return (
                  <div key={item} className="px-3.5 py-2 border border-slate-150 rounded-xl bg-slate-50/50 text-slate-707 flex items-center gap-2 text-xs font-bold shadow-sm">
                    <IconComp size={14} className="text-rose-600 stroke-[2.2]" />
                    <span>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rooms Table Card */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex justify-between items-center pb-2">
              <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase tracking-wider text-[10px] text-slate-400">Rooms & Rates Configuration</h3>
              <button 
                onClick={() => navigate(`/homestay-owner/inventory/property/${property.id}/edit`)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-[9px] uppercase tracking-wider transition-colors cursor-pointer border-none flex items-center gap-1 shadow-sm"
              >
                <Plus size={11} />
                <span>Add Room</span>
              </button>
            </div>

            <div className="space-y-4">
              {property.rooms.map((room) => (
                <div key={room.id} className="border border-slate-150 rounded-2xl p-4.5 bg-slate-50/30 grid grid-cols-1 md:grid-cols-12 gap-4 items-center shadow-sm hover:border-slate-350 transition-colors">
                  <div className="md:col-span-5 space-y-1">
                    <span className="block text-xs font-black text-slate-800 leading-none">{room.type}</span>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      {room.count} Rooms | Occupancy: {room.occupancy} Guests | Extra Person: {room.extraPerson}
                    </span>
                    <span className="block text-[9px] text-slate-500 font-mono mt-0.5 leading-none">Rooms: {room.roomNumbers}</span>
                  </div>
                  
                  <div className="md:col-span-4 grid grid-cols-2 gap-3.5">
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">B2B Rate</span>
                      <span className="text-xs font-black text-slate-707 block mt-1 leading-none font-mono">₹{room.b2bRate.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">B2C Rate</span>
                      <span className="text-xs font-black text-rose-600 block mt-1 leading-none font-mono">₹{room.b2cRate.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="md:col-span-3 flex justify-end gap-1.5">
                    <button
                      onClick={() => handleEditRoom(room.id)}
                      className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-[9px] uppercase tracking-wider transition-colors cursor-pointer bg-white flex items-center gap-1 shadow-sm"
                    >
                      <Edit size={11} className="stroke-[2.5]" />
                      <span>Edit Room</span>
                    </button>
                    <button
                      onClick={() => alert(`Remove Room ${room.type}?`)}
                      className="p-2 border border-rose-200 hover:bg-rose-50 text-rose-500 rounded-xl transition-colors cursor-pointer bg-white flex items-center justify-center shadow-sm"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Section: Sidebar Actions */}
        <div className="lg:col-span-4 space-y-6">
          {/* Status Box */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-slate-400 leading-none">Property Status</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider inline-block ${
                  property.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                }`}>
                  {property.status}
                </span>
                <span className="block text-[8px] text-slate-400 mt-1 font-bold">
                  {property.status === 'Active' ? 'Listed and open to bookings' : 'Hidden from portals'}
                </span>
              </div>

              {/* Status Switch Toggle */}
              <button
                onClick={handleToggleStatus}
                className={`relative w-9 h-5 rounded-full border-none transition-all duration-300 cursor-pointer ${
                  property.status === 'Active' ? 'bg-rose-600' : 'bg-slate-200'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                  property.status === 'Active' ? 'left-4.5' : 'left-0.5'
                }`}></span>
              </button>
            </div>
          </div>

          {/* Configuration Actions */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-slate-400 leading-none pb-1">Quick Config</h3>

            <button
              onClick={() => navigate(`/homestay-owner/inventory/property/${property.id}/rate-chart`)}
              className="w-full py-3.5 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer bg-white shadow-sm uppercase tracking-wider"
            >
              <Grid size={13} className="text-slate-400 stroke-[2.5]" />
              <span>Manage Rate Chart</span>
            </button>

            <button
              onClick={() => navigate(`/homestay-owner/inventory/property/${property.id}/edit-season`)}
              className="w-full py-3.5 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer bg-white shadow-sm uppercase tracking-wider"
            >
              <Calendar size={13} className="text-slate-400 stroke-[2.5]" />
              <span>Edit Season Dates</span>
            </button>
          </div>

          {/* Contact Box */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-slate-400 leading-none">Owner Contact</h3>
            <div className="space-y-2 text-xs font-bold text-slate-707">
              <div className="flex justify-between">
                <span className="text-slate-400">Name:</span>
                <span>{property.ownerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span>{property.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span>{property.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
