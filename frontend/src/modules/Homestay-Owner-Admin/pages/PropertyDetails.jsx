import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
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
  Image as ImageIcon,
  Building2,
  Phone,
  User,
  X,
  ExternalLink,
  BedDouble,
  CheckCircle2,
  Clock
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getImageUrl = (path) => {
  if (!path) return 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=800&q=80';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  return getApiUrl(path);
};

export default function PropertyDetails() {
  const navigate = useNavigate();
  const { propertyId } = useParams();

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    fetchPropertyDetails();
  }, [propertyId]);

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
      const res = await axios.get(getApiUrl(`/api/dashboard/homestays-list/${propertyId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setProperty(res.data);
      }
    } catch (err) {
      console.error('Failed to load property details:', err);
    } finally {
      setLoading(false);
    }
  };

  const amenityIcons = {
    'Wifi': Wifi,
    'Free Wifi': Wifi,
    'Parking': Car,
    'Free Parking': Car,
    'Restaurant': Utensils,
    'Power Backup': Zap,
    'Pet Friendly': Dog,
    'Mountain View': Mountain,
    'Room Heater': Flame,
    'Kitchen': ChefHat,
    'Laundry': Shirt
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-bold text-slate-400">Loading homestay details...</span>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-12 text-center bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4">
        <Building2 size={40} className="mx-auto text-slate-300 stroke-[1.5]" />
        <h2 className="text-base font-black text-slate-800">Property Not Found</h2>
        <p className="text-xs font-bold text-slate-400">Unable to retrieve details for property ID: {propertyId}</p>
        <button
          onClick={() => navigate('/homestay-owner/inventory')}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer border-none shadow-sm"
        >
          Back to Inventory
        </button>
      </div>
    );
  }

  const allImages = property.images && property.images.length > 0
    ? property.images
    : ['https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=1200&q=80'];

  const coverImage = allImages[0];
  const gallery = allImages.slice(1);

  const roomsList = property.rooms || [];
  const amenitiesList = property.amenities || [];
  const status = property.status || 'Active';

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
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">{property.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
              status === 'Approved' || status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
              status === 'Pending Approval' || status === 'Submitted For Review' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
              status === 'Changes Requested' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
              'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              {status}
            </span>
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none font-mono block">
            ID: {property._id || property.id}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate(`/homestay-owner/availability?propertyId=${property._id}`)}
            className="px-4 py-2.5 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white"
          >
            <Calendar size={13} className="text-slate-400" />
            <span>Calendar</span>
          </button>

          <button
            onClick={() => navigate(`/homestay-owner/inventory/property/${property._id}/rate-chart`)}
            className="px-4 py-2.5 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white"
          >
            <Grid size={13} className="text-slate-400" />
            <span>Rate Chart</span>
          </button>

          <button
            onClick={() => navigate(`/homestay-owner/inventory/setup-property?propertyId=${property._id}`)}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100 uppercase tracking-wider"
          >
            <Edit size={13} />
            <span>Edit Property</span>
          </button>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Section: Details & Photos */}
        <div className="lg:col-span-8 space-y-6">
          {/* Cover & Gallery Card */}
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm p-6 space-y-5">
            <div 
              onClick={() => setLightboxImage(getImageUrl(coverImage))}
              className="relative h-64 md:h-80 w-full rounded-2xl overflow-hidden border border-slate-100 shadow-inner cursor-pointer group"
            >
              <img 
                src={getImageUrl(coverImage)} 
                alt={property.name} 
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" 
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 bg-black/70 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-opacity">
                  <Eye size={13} /> Click to Expand
                </span>
              </div>
            </div>

            {/* Gallery Grid */}
            {gallery.length > 0 && (
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                  Property Gallery ({gallery.length + 1} Photos)
                </span>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {gallery.map((img, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setLightboxImage(getImageUrl(img))}
                      className="relative aspect-video rounded-xl overflow-hidden border border-slate-100 shadow-sm cursor-pointer hover:opacity-90 group"
                    >
                      <img 
                        src={getImageUrl(img)} 
                        alt={`Gallery ${idx + 1}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description Card */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-slate-400 leading-none">
              Overview & Description
            </h3>
            <p className="text-xs font-bold text-slate-600 leading-relaxed whitespace-pre-line">
              {property.description || `${property.name} offers authentic local hospitality, scenic surroundings, and comfortable guest accommodation in ${property.city || 'the region'}.`}
            </p>
          </div>

          {/* Amenities Card */}
          {amenitiesList.length > 0 && (
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-slate-400 leading-none">
                Property Amenities ({amenitiesList.length})
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {amenitiesList.map((item) => {
                  const name = typeof item === 'string' ? item : (item.name || 'Amenity');
                  const IconComp = amenityIcons[name] || CheckCircle2;
                  return (
                    <div key={name} className="px-3.5 py-2 border border-slate-150 rounded-xl bg-slate-50/50 text-slate-707 flex items-center gap-2 text-xs font-bold shadow-sm">
                      <IconComp size={14} className="text-rose-600 stroke-[2.2]" />
                      <span>{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rooms Configuration Card */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex justify-between items-center pb-1 border-b border-slate-50">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-slate-400 leading-none">
                  Rooms Configuration
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Total {roomsList.reduce((sum, r) => sum + (r.totalRooms || r.numberOfRooms || r.roomNumbers?.length || 1), 0)} Rooms Configured
                </p>
              </div>
              <button 
                onClick={() => navigate(`/homestay-owner/inventory/setup-property?propertyId=${property._id}`)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-[9px] uppercase tracking-wider transition-colors cursor-pointer border-none flex items-center gap-1 shadow-sm"
              >
                <Plus size={11} />
                <span>Configure Rooms</span>
              </button>
            </div>

            <div className="space-y-3">
              {roomsList.length === 0 ? (
                <div className="p-6 text-center text-slate-400 font-bold text-xs">
                  No rooms configured yet. Click "Configure Rooms" to add rooms.
                </div>
              ) : (
                roomsList.map((room, idx) => {
                  const roomNos = room.roomNumbers?.length > 0 
                    ? (Array.isArray(room.roomNumbers) ? room.roomNumbers.join(', ') : room.roomNumbers)
                    : '101';
                  const roomCount = room.totalRooms || room.numberOfRooms || (room.roomNumbers?.length || 1);
                  return (
                    <div key={idx} className="border border-slate-150 rounded-2xl p-4.5 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <BedDouble size={16} className="text-rose-600" />
                          <span className="text-xs font-black text-slate-800">{room.roomType || room.roomCategoryName || 'Standard Room'}</span>
                          <span className="text-[9px] px-2 py-0.5 bg-rose-50 text-rose-700 font-black uppercase rounded-full">
                            {roomCount} Rooms
                          </span>
                        </div>
                        {room.description && (
                          <p className="text-[10px] text-slate-500 font-semibold">{room.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="text-[9px] font-bold text-slate-400">Room Numbers:</span>
                          <span className="text-[9px] font-black text-slate-700 font-mono bg-white px-2 py-0.5 border border-slate-200 rounded-md">
                            {roomNos}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => navigate(`/homestay-owner/inventory/property/${property._id}/rate-chart`)}
                          className="px-3 py-1.5 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-[9px] uppercase tracking-wider cursor-pointer bg-white"
                        >
                          Rate Chart
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Sidebar Info */}
        <div className="lg:col-span-4 space-y-6">
          {/* Location Box */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-slate-400 leading-none">
              Location & Address
            </h3>
            
            <div className="flex items-start gap-2.5 text-xs font-bold text-slate-707">
              <MapPin size={16} className="text-rose-600 mt-0.5 shrink-0" />
              <div>
                <span className="block font-black text-slate-800">{property.address || property.city || 'Location Details'}</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  {[property.city, property.region || property.state, 'India'].filter(Boolean).join(', ')}
                </span>
              </div>
            </div>

            {property.googleMapsLink && (
              <a
                href={property.googleMapsLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 hover:underline uppercase tracking-wider pt-1"
              >
                <span>View on Google Maps</span>
                <ExternalLink size={10} />
              </a>
            )}
          </div>

          {/* Owner Details Box */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-slate-400 leading-none">
              Homestay Host
            </h3>
            <div className="space-y-2.5 text-xs font-bold text-slate-707">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Host Name:</span>
                <span className="font-black text-slate-800">{property.ownerName || 'Host'}</span>
              </div>
              {property.ownerMobile && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Contact:</span>
                  <span className="font-mono">{property.ownerMobile}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Property Type:</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-707 rounded-lg text-[9px] uppercase font-black">
                  {property.type || 'Homestay'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-slate-400 leading-none pb-1">
              Quick Actions
            </h3>

            <button
              onClick={() => navigate(`/homestay-owner/bookings/create?propertyId=${property._id}`)}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>Create Booking For This Property</span>
            </button>

            <button
              onClick={() => navigate(`/homestay-owner/availability?propertyId=${property._id}`)}
              className="w-full py-3 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer bg-white shadow-sm"
            >
              <Calendar size={13} className="text-slate-400" />
              <span>Availability Schedule</span>
            </button>

            <button
              onClick={() => navigate(`/homestay-owner/revenue?propertyId=${property._id}`)}
              className="w-full py-3 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer bg-white shadow-sm"
            >
              <TrendingUp size={13} className="text-slate-400" />
              <span>View Property Revenue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-rose-400 cursor-pointer bg-transparent border-none p-1"
            >
              <X size={24} />
            </button>
            <img 
              src={lightboxImage} 
              alt="Expanded view" 
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-2xl mx-auto" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
