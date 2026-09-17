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
  TrendingUp,
  Image as ImageIcon,
  Building2,
  X,
  ExternalLink,
  BedDouble,
  CheckCircle2,
  Waves,
  Coffee,
  Camera,
  Stamp
} from 'lucide-react';
import HomestayBusinessDetailsModal from '../../WoWSuper-Admin/components/HomestayBusinessDetailsModal.jsx';

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
  const [deleteRoomId, setDeleteRoomId] = useState(null);
  const [showBusinessModal, setShowBusinessModal] = useState(false);

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
        setProperty(res.data.data || res.data);
      }
    } catch (err) {
      console.error('Failed to load property details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = (roomId) => {
    setDeleteRoomId(roomId);
  };

  const handleConfirmDeleteRoom = async () => {
    if (!deleteRoomId) return;
    setProperty(prev => ({
      ...prev,
      rooms: (prev.rooms || []).filter(r => (r._id || r.id) !== deleteRoomId)
    }));
    setDeleteRoomId(null);
  };

  const amenityIcons = {
    'Wifi': Wifi,
    'Free Wifi': Wifi,
    'WIFI': Wifi,
    'Parking': Car,
    'Free Parking': Car,
    'Restaurant': Utensils,
    'Power Backup': Zap,
    'Pet Friendly': Dog,
    'Mountain View': Mountain,
    'Room Heater': Flame,
    'Kitchen': ChefHat,
    'Laundry': Shirt,
    'Pool': Waves,
    'Swimming Pool': Waves,
    'Free Breakfast': Coffee,
    'Breakfast': Coffee
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
          className="px-5 py-2.5 bg-[#D80032] hover:bg-[#b00028] text-white font-bold rounded-xl text-xs cursor-pointer border-none shadow-sm"
        >
          Back to Inventory
        </button>
      </div>
    );
  }

  const fallbackHomestayImages = [
    'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80'
  ];

  const allImages = property.images && property.images.length > 0
    ? property.images
    : fallbackHomestayImages;

  const defaultRoomImages = [
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80'
  ];

  const roomsList = property.rooms || [];
  const amenitiesList = property.amenities && property.amenities.length > 0
    ? property.amenities
    : ['WIFI', 'Pool', 'Free Breakfast'];
  const status = property.status || 'Active';
  const totalRoomsConfigured = roomsList.reduce((sum, r) => sum + (r.totalRooms || r.numberOfRooms || (r.roomNumbers?.length || 1)), 0);

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
            onClick={() => setShowBusinessModal(true)}
            className="px-4 py-2.5 border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white"
            title="Configure Signature, Stamp & Official Business Details"
          >
            <Stamp size={13} className="text-rose-600" />
            <span>Signature & Stamp</span>
          </button>

          <button
            onClick={() => navigate(`/homestay-owner/inventory/setup-property?propertyId=${property._id}`)}
            className="px-5 py-2.5 bg-[#D80032] hover:bg-[#b00028] text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm uppercase tracking-wider"
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
          
          {/* Property Photos Showcase (Matching Reference Image 3) */}
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-slate-400 leading-none">
                Property Photos ({allImages.length})
              </h3>
              <button
                onClick={() => setLightboxImage(getImageUrl(allImages[0]))}
                className="text-xs font-bold text-[#D80032] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
              >
                <Eye size={12} />
                <span>View Full Gallery</span>
              </button>
            </div>

            {/* Gallery Grid (4 items side by side) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              {allImages.slice(0, 4).map((img, idx) => {
                const isLast = idx === 3 && allImages.length > 4;
                const remaining = allImages.length - 4;
                return (
                  <div 
                    key={idx} 
                    onClick={() => setLightboxImage(getImageUrl(img))}
                    className="relative h-44 md:h-52 rounded-2xl overflow-hidden border border-slate-100 shadow-sm cursor-pointer group bg-slate-50"
                  >
                    <img 
                      src={getImageUrl(img)} 
                      alt={`Property Gallery ${idx + 1}`} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                    {isLast ? (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-2 text-center transition-colors group-hover:bg-black/70">
                        <span className="text-lg font-black leading-none">+{remaining + 1}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Photos</span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 bg-black/70 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-opacity">
                          <Eye size={11} /> Expand
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description Card */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-slate-400 leading-none">
              Overview & Description
            </h3>
            <p className="text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-line">
              {property.description || `${property.name} offers authentic local hospitality, scenic surroundings, and comfortable guest accommodation in ${property.city || 'the region'}. Perfect for families, couples and solo travellers looking for a peaceful getaway.`}
            </p>
          </div>

          {/* Amenities Card */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-3.5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-slate-400 leading-none">
              Property Amenities ({amenitiesList.length})
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {amenitiesList.map((item) => {
                const name = typeof item === 'string' ? item : (item.name || 'Amenity');
                const IconComp = amenityIcons[name] || CheckCircle2;
                return (
                  <div key={name} className="px-4 py-2 border border-slate-200 rounded-2xl bg-white text-slate-800 flex items-center gap-2 text-xs font-bold shadow-xs">
                    <IconComp size={15} className="text-[#D80032] stroke-[2.2]" />
                    <span>{name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rooms Configuration Card (Matching Reference Image 3) */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden space-y-5 p-6">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider leading-none">
                  Rooms Configuration
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Total {totalRoomsConfigured} Rooms Configured
                </p>
              </div>
              <button 
                onClick={() => navigate(`/homestay-owner/inventory/setup-property?propertyId=${property._id}&step=4`)}
                className="px-4 py-2 bg-[#D80032] hover:bg-[#b00028] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer border-none flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={13} className="stroke-[3]" />
                <span>Configure Rooms</span>
              </button>
            </div>

            <div className="space-y-4">
              {roomsList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold text-xs space-y-2">
                  <BedDouble size={28} className="mx-auto text-slate-300" />
                  <p className="text-slate-600">No rooms configured yet.</p>
                  <p className="text-slate-400 text-[10px]">Click "Configure Rooms" to add your property room categories.</p>
                </div>
              ) : (
                roomsList.map((room, idx) => {
                  const roomNos = room.roomNumbers?.length > 0 
                    ? (Array.isArray(room.roomNumbers) ? room.roomNumbers : String(room.roomNumbers).split(',').map(n => n.trim()))
                    : ['101'];
                  const roomCount = room.totalRooms || room.numberOfRooms || (room.roomNumbers?.length || 1);
                  const roomCategoryName = room.roomCategoryName || room.roomType || 'Deluxe Room';

                  // Room photos from create time or fallback
                  const rawRoomImages = (Array.isArray(room.images) && room.images.length > 0)
                    ? room.images
                    : (Array.isArray(room.photos) && room.photos.length > 0 ? room.photos : []);

                  const roomPhotos = rawRoomImages.length > 0 ? rawRoomImages : defaultRoomImages;
                  const mainPhoto = roomPhotos[0];
                  const thumbnails = roomPhotos.slice(0, 4);

                  return (
                    <div 
                      key={room._id || room.id || idx} 
                      className="border border-slate-150 rounded-2xl p-4 bg-white flex flex-col md:flex-row gap-5 shadow-sm hover:border-slate-200 transition-colors"
                    >
                      {/* Left: Featured Room Image */}
                      <div 
                        onClick={() => setLightboxImage(getImageUrl(mainPhoto))}
                        className="relative w-full md:w-56 h-40 rounded-2xl overflow-hidden border border-slate-100 shrink-0 bg-slate-100 cursor-pointer group"
                      >
                        <img 
                          src={getImageUrl(mainPhoto)} 
                          alt={roomCategoryName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute bottom-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                          <Camera size={11} />
                          <span>{roomPhotos.length} Photos</span>
                        </div>
                      </div>

                      {/* Right: Details, badges, actions, and thumbnails */}
                      <div className="flex-1 flex flex-col justify-between space-y-3">
                        {/* Header Row: Room Title, Room Count, and Action Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <BedDouble size={18} className="text-[#D80032] shrink-0" />
                            <span className="text-base font-bold text-slate-900">{roomCategoryName}</span>
                            <span className="text-[10px] font-black px-2.5 py-0.5 bg-rose-50 text-[#E11D48] rounded-full uppercase tracking-wider">
                              {roomCount} ROOMS
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/homestay-owner/inventory/property/${property._id}/rate-chart`)}
                              className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer bg-white transition-colors"
                            >
                              RATE CHART
                            </button>
                            <button
                              onClick={() => navigate(`/homestay-owner/inventory/setup-property?propertyId=${property._id}&step=4`)}
                              className="px-3.5 py-1.5 border border-sky-200 hover:bg-sky-50 text-sky-600 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer bg-white flex items-center gap-1 transition-colors"
                            >
                              <Edit size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room._id || room.id)}
                              className="px-3.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer bg-white flex items-center gap-1 transition-colors"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Room Numbers Row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-400">Room Numbers:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {roomNos.map((no, i) => (
                              <span key={i} className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md font-mono">
                                {no}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Description if any */}
                        {room.description && (
                          <p className="text-xs text-slate-500 font-normal line-clamp-1">{room.description}</p>
                        )}

                        {/* Room Thumbnails Row (Matching Reference Image 3) */}
                        {thumbnails.length > 0 && (
                          <div className="flex items-center gap-2.5 pt-1">
                            {thumbnails.map((thumb, tIdx) => {
                              const isFourth = tIdx === 3 && roomPhotos.length > 4;
                              const extraCount = roomPhotos.length - 4;
                              return (
                                <div 
                                  key={tIdx}
                                  onClick={() => setLightboxImage(getImageUrl(thumb))}
                                  className="relative w-16 h-14 rounded-xl overflow-hidden border border-slate-100 shadow-xs cursor-pointer hover:opacity-90 transition-opacity bg-slate-50 shrink-0 group"
                                >
                                  <img 
                                    src={getImageUrl(thumb)} 
                                    alt={`Room thumbnail ${tIdx + 1}`} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  {isFourth && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-black">
                                      +{extraCount + 1}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
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
              <MapPin size={16} className="text-[#D80032] mt-0.5 shrink-0" />
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
                className="inline-flex items-center gap-1 text-[10px] font-black text-[#D80032] hover:underline uppercase tracking-wider pt-1"
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
              className="w-full py-3 bg-[#D80032] hover:bg-[#b00028] text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100"
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

      {/* Delete Room Confirmation Modal */}
      {deleteRoomId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Delete Room Category</h4>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Are you sure you want to remove this room category from the property?
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteRoomId(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer bg-white hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteRoom}
                className="px-4 py-2 bg-[#D80032] hover:bg-[#b00028] text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border-none"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Signature & Stamp Modal */}
      {property && (
        <HomestayBusinessDetailsModal
          isOpen={showBusinessModal}
          onClose={() => setShowBusinessModal(false)}
          homestayId={property._id || property.id}
          homestayName={property.name}
          onSuccess={() => fetchPropertyDetails()}
        />
      )}
    </div>
  );
}

