import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  ArrowLeft, 
  Save, 
  Upload, 
  Trash2, 
  Plus, 
  Check, 
  RefreshCw,
  ChevronRight,
  Wifi, 
  Car, 
  Zap, 
  Utensils, 
  Mountain, 
  Flame, 
  ChefHat, 
  Shirt,
  Calendar,
  AlertTriangle,
  FolderOpen,
  Eye,
  Edit,
  Info,
  Layers,
  ArrowRight,
  Sparkles,
  Bed,
  Moon,
  Sun,
  Copy,
  AlertCircle,
  ShieldAlert,
  Search,
  Crown,
  CreditCard,
  PlusCircle
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getImageUrl = (path) => {
  if (!path) return 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=500';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) return path;
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  return `${base}${path}`;
};

const validateSeasonsCoverage = (roomSeasons) => {
  if (!roomSeasons) return { valid: false, error: 'No season dates configured.', totalDays: 0 };
  const ranges = [];
  const errors = [];

  ['off', 'mid', 'peak'].forEach(seasonType => {
    const list = roomSeasons[seasonType] || [];
    list.forEach((r, idx) => {
      if (!r.start || !r.end) {
        errors.push(`Missing start or end date in ${seasonType.toUpperCase()} season (range #${idx + 1}).`);
      } else {
        const s = new Date(r.start);
        const e = new Date(r.end);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) {
          errors.push(`Invalid date format in ${seasonType.toUpperCase()} season.`);
        } else if (s > e) {
          errors.push(`Start date cannot be after End date in ${seasonType.toUpperCase()} season (${r.start} to ${r.end}).`);
        } else {
          ranges.push({
            start: s,
            end: e,
            type: seasonType.toUpperCase(),
            startStr: r.start,
            endStr: r.end
          });
        }
      }
    });
  });

  if (errors.length > 0) {
    return { valid: false, error: errors[0], totalDays: 0 };
  }

  if (ranges.length === 0) {
    return { valid: false, error: 'Please configure date ranges across Off-Season, Mid-Season, and Peak Season to cover the entire 365-day calendar.', totalDays: 0 };
  }

  // Check overlaps
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      if (ranges[i].start <= ranges[j].end && ranges[j].start <= ranges[i].end) {
        return {
          valid: false,
          error: `Date overlap detected: ${ranges[i].type} (${ranges[i].startStr} to ${ranges[i].endStr}) overlaps with ${ranges[j].type} (${ranges[j].startStr} to ${ranges[j].endStr}).`,
          totalDays: 0
        };
      }
    }
  }

  // Calculate unique days covered
  let totalDays = 0;
  ranges.forEach(r => {
    const diff = Math.round((r.end.getTime() - r.start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    totalDays += Math.max(0, diff);
  });

  ranges.sort((a, b) => a.start - b.start);

  // Check gaps
  for (let i = 0; i < ranges.length - 1; i++) {
    const diff = ranges[i+1].start.getTime() - ranges[i].end.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (diff > oneDayMs + 1000) {
      return {
        valid: false,
        error: `A calendar gap of unassigned dates exists between ${ranges[i].endStr} and ${ranges[i+1].startStr}. All days must be covered.`,
        totalDays
      };
    }
  }

  if (totalDays < 365) {
    return {
      valid: false,
      error: `The 12-month calendar is incomplete. All 365 days of the year must be covered across Off-Season, Mid-Season, and Peak Season (currently covered: ${totalDays} / 365 days, missing: ${365 - totalDays} days).`,
      totalDays
    };
  }

  return { valid: true, totalDays };
};

export default function PropertySetupWizard({ propertyId: propPropertyId = null, isAdmin = false, onBack: propOnBack = null }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([1]);
  const [errors, setErrors] = useState({});
  const [propertyStatus, setPropertyStatus] = useState('Draft');
  const [seasonModalError, setSeasonModalError] = useState('');
  const [masterOwners, setMasterOwners] = useState([]);

  // Active configurations inside Steps 4, 5, 6
  const [activeConfigureRoomId, setActiveConfigureRoomId] = useState(null); 
  const [activeConfigureSeasonRoomId, setActiveConfigureSeasonRoomId] = useState(null); 
  const [activeConfigureRateRoomId, setActiveConfigureRateRoomId] = useState(null); 

  // Master Data Lookups
  const [masterStates, setMasterStates] = useState([]);
  const [masterCities, setMasterCities] = useState([]);
  const [masterAmenities, setMasterAmenities] = useState([]);
  const [masterRoomTypes, setMasterRoomTypes] = useState([]);
  const [amenitySearch, setAmenitySearch] = useState('');
  const [activeFolderCategory, setActiveFolderCategory] = useState('Lobby');

  const galleryCategoriesList = [
    'Lobby', 'Rooms', 'Restaurant', 'Reception', 'Bathroom', 'Balcony', 'Kitchen', 'Amenities', 'Garden', 'Parking', 'Swimming Pool', 'Conference Hall', 'Others'
  ];

  const [propertyDbId, setPropertyDbId] = useState(null);
  const [approvalComments, setApprovalComments] = useState([]);
  const [ownerSubscription, setOwnerSubscription] = useState(null);
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [addonRoomsCount, setAddonRoomsCount] = useState(1);
  const [addonPurchasing, setAddonPurchasing] = useState(false);

  const isReadOnly = !isAdmin && (propertyStatus === 'Submitted For Review' || propertyStatus === 'Pending Approval');

  const getAuthToken = () => {
    if (isAdmin) {
      return localStorage.getItem('superAdminToken') || localStorage.getItem('homestayOwnerToken');
    }
    return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
  };

  const handleExit = () => {
    if (propOnBack) {
      propOnBack();
    } else if (isAdmin) {
      navigate('/homestays');
    } else {
      navigate('/homestay-owner/inventory');
    }
  };

  // Wizard state data
  const [formData, setFormData] = useState({
    name: '',
    type: 'Homestay',
    category: '',
    ownerName: '',
    phone: '',
    email: '',
    website: '',
    gstNumber: '',
    address: '',
    country: 'India',
    state: '',
    city: '',
    pinCode: '',
    googleMap: '',
    latitude: '',
    longitude: '',
    description: '',
    gallery: {
      cover: '',
      lobby: [], rooms: [], restaurant: [], reception: [], bathroom: [], balcony: [], kitchen: [], amenities: [], garden: [], parking: [], swimmingPool: [], conferenceHall: [], others: []
    },
    amenities: [],
    rooms: [],
    seasons: {},
    rates: {},
    taxes: '12',
    extraBedPrice: '1000'
  });

  // Load Master Settings on mount
  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const resStates = await axios.get(getApiUrl('/api/settings/master-states'));
        setMasterStates(resStates.data);
        const resAmenities = await axios.get(getApiUrl('/api/settings/master-amenities'));
        setMasterAmenities(resAmenities.data);
        const resTypes = await axios.get(getApiUrl('/api/settings/master-room-types'));
        setMasterRoomTypes(resTypes.data);
      } catch (err) {
        console.error("Master settings fetch failed", err);
      }
    };
    fetchMaster();
  }, []);

  // Fetch Cities when selected State changes
  useEffect(() => {
    const fetchCities = async () => {
      if (!formData.state) {
        setMasterCities([]);
        return;
      }
      try {
        const stateObj = masterStates.find(s => s.stateName === formData.state);
        const stateId = stateObj ? stateObj._id : '';
        const resCities = await axios.get(getApiUrl('/api/settings/master-cities'), {
          params: { stateId }
        });
        setMasterCities(resCities.data);
      } catch (err) {
        console.error("Failed to load cities list", err);
      }
    };
    fetchCities();
  }, [formData.state, masterStates]);

  // Load Property Setup Draft from backend
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        
        const searchParams = new URLSearchParams(window.location.search);
        const isNew = (searchParams.get('new') === 'true' || (isAdmin && !propPropertyId)) && !propPropertyId;
        const isPreview = searchParams.get('preview') === 'true';
        const propertyIdParam = propPropertyId || searchParams.get('propertyId');

        let draftUrl = '/api/homestay-owner/properties/draft';
        if (isNew) {
          draftUrl += '?new=true';
        } else if (propertyIdParam) {
          draftUrl += `?propertyId=${propertyIdParam}`;
        }

        const res = await axios.get(getApiUrl(draftUrl), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const { property, gallery, rooms, amenities, seasons, rates, approval } = res.data;

        setPropertyDbId(property._id);
        setPropertyStatus(property.status || 'Draft');
        if (res.data.subscription) {
          setOwnerSubscription(res.data.subscription);
        }
        if (isPreview) {
          setCurrentStep(7);
        } else {
          setCurrentStep(property.currentStep || 1);
        }
        setApprovalComments(approval ? approval.comments || [] : []);

        if (isAdmin) {
          try {
            const ownRes = await axios.get(getApiUrl('/api/dashboard/owners'), {
              headers: { Authorization: `Bearer ${token}` }
            });
            setMasterOwners(ownRes.data || []);
          } catch (e) {
            console.error("Failed to load owners list", e);
          }
        }

        const initialGallery = {
          cover: gallery.coverImage || '',
          lobby: [], rooms: [], restaurant: [], reception: [], bathroom: [], balcony: [], kitchen: [], amenities: [], garden: [], parking: [], swimmingpool: [], conferencehall: [], others: []
        };
        if (gallery.images && Array.isArray(gallery.images)) {
          gallery.images.forEach(img => {
            const key = img.category.toLowerCase().replace(' ', '');
            if (initialGallery[key]) initialGallery[key].push(img.url);
          });
        }

        setFormData(prev => ({
          ...prev,
          name: property.name || '',
          type: property.type || 'Homestay',
          category: property.category || '',
          ownerName: property.ownerName || '',
          phone: property.ownerMobile || '',
          email: property.ownerEmail || '',
          website: property.website || '',
          gstNumber: property.gstNumber || '',
          address: property.address || '',
          country: property.country || 'India',
          state: property.state || '',
          city: property.city || '',
          pinCode: property.pinCode || '',
          googleMap: property.googleMapUrl || '',
          latitude: property.latitude || '',
          longitude: property.longitude || '',
          description: property.description || '',
          gallery: initialGallery,
          amenities: amenities || [],
          rooms: rooms || [],
          seasons: seasons || {},
          rates: rates || {}
        }));
      } catch (err) {
        console.error("Draft resume load failed", err);
      }
    };
    loadDraft();
  }, []);

  // Save Progress step-by-step to MongoDB Atlas
  const autoSave = async (data, stepNum = currentStep) => {
    if (isReadOnly) return;
    localStorage.setItem('propertySetupDraft', JSON.stringify(data));
    try {
      const token = getAuthToken();
      if (!token || !propertyDbId) return;

      let stepData = {};
      if (stepNum === 1) {
        stepData = data;
      } else if (stepNum === 2) {
        // Build gallery images array
        const images = [];
        galleryCategoriesList.forEach(cat => {
          const key = cat.toLowerCase().replace(' ', '');
          const urls = data.gallery[key] || [];
          urls.forEach((url, i) => {
            images.push({ url, category: cat, order: i });
          });
        });
        stepData = { cover: data.gallery.cover, images };
      } else if (stepNum === 3) {
        stepData = { amenityIds: data.amenities };
      } else if (stepNum === 4) {
        stepData = { rooms: data.rooms };
      } else if (stepNum === 5) {
        stepData = { seasons: data.seasons };
      } else if (stepNum === 6) {
        stepData = { rates: data.rates };
      }

      const res = await axios.post(getApiUrl('/api/homestay-owner/properties/save-step'), {
        propertyId: propertyDbId,
        step: stepNum,
        data: stepData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (stepNum === 4 && res.data.rooms) {
        // Sync generated database category IDs for pricing steps
        const idMap = {};
        formData.rooms.forEach((r, idx) => {
          const newRoom = res.data.rooms[idx];
          if (newRoom && r.id !== newRoom.id) {
            idMap[r.id] = newRoom.id;
          }
        });

        setFormData(prev => {
          const updatedSeasons = { ...prev.seasons };
          const updatedRates = { ...prev.rates };

          Object.entries(idMap).forEach(([oldId, newId]) => {
            if (updatedSeasons[oldId]) {
              updatedSeasons[newId] = updatedSeasons[oldId];
              delete updatedSeasons[oldId];
            }
            if (updatedRates[oldId]) {
              updatedRates[newId] = updatedRates[oldId];
              delete updatedRates[oldId];
            }
          });

          return {
            ...prev,
            rooms: res.data.rooms,
            seasons: updatedSeasons,
            rates: updatedRates
          };
        });
      }
    } catch (e) {
      console.error("Autosave backend update failed:", e.response?.data?.message || e.message);
      throw e;
    }
  };
 
  // Purchase Extra Room Add-ons (Calculated per additional room)
  const handlePurchaseExtraRooms = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!propertyDbId) {
      Swal.fire('Error', 'Property not initialized yet. Please complete Step 1 first.', 'error');
      return;
    }
    const count = Number(addonRoomsCount);
    if (isNaN(count) || count <= 0) {
      Swal.fire('Invalid Count', 'Please specify at least 1 extra room to purchase.', 'warning');
      return;
    }

    const rate = ownerSubscription?.extraRoomPrice !== undefined ? Number(ownerSubscription.extraRoomPrice) : 500;
    const totalAmount = count * rate;

    const confirm = await Swal.fire({
      title: 'Purchase Extra Room Add-ons',
      html: `You are purchasing <b>${count}</b> Extra Room Add-on(s) at <b>₹${rate.toLocaleString()}/room</b>.<br/><br/><span style="font-size: 1.25rem; font-weight: 800; color: #1e3a8a;">Total: ₹${totalAmount.toLocaleString()}</span>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Pay ₹${totalAmount.toLocaleString()}`,
      confirmButtonColor: '#2563eb'
    });

    if (!confirm.isConfirmed) return;

    setAddonPurchasing(true);
    try {
      const token = getAuthToken();
      const res = await axios.post(
        getApiUrl(`/api/homestay-owner/properties/${propertyDbId}/extra-rooms`),
        {
          extraRoomsCount: count,
          paymentMethod: 'UPI'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        setOwnerSubscription(prev => ({
          ...prev,
          extraRoomsPurchased: res.data.extraRoomsPurchased
        }));
        setAddonModalOpen(false);
        setErrors(prev => {
          const copy = { ...prev };
          delete copy.rooms;
          return copy;
        });

        Swal.fire({
          title: 'Add-on Confirmed!',
          text: `Successfully added ${count} extra room(s)! Your total room allowance for this homestay is now ${res.data.totalAllowedRooms} rooms.`,
          icon: 'success',
          confirmButtonColor: '#2563eb'
        });
      }
    } catch (err) {
      console.error('Error purchasing extra rooms:', err);
      Swal.fire('Failed', err.response?.data?.message || 'Could not complete extra room purchase.', 'error');
    } finally {
      setAddonPurchasing(false);
    }
  };

  // Image Upload handler
  const handleImageUpload = async (e, categoryKey) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const token = localStorage.getItem('homestayOwnerToken');
    if (!token) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        Swal.fire('File Too Large', `Image ${file.name} exceeds the 10MB limit.`, 'error');
        continue;
      }

      const uploadForm = new FormData();
      uploadForm.append('file', file);

      try {
        const res = await axios.post(getApiUrl('/api/homestay-owner/properties/upload-image'), uploadForm, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        });

        const uploadedUrl = res.data.optimizedUrl;

        setFormData(prev => {
          let updated = {};
          if (categoryKey === 'cover') {
            updated = {
              ...prev,
              gallery: { ...prev.gallery, cover: uploadedUrl }
            };
          } else {
            const list = [...(prev.gallery[categoryKey] || []), uploadedUrl];
            updated = {
              ...prev,
              gallery: { ...prev.gallery, [categoryKey]: list }
            };
          }
          autoSave(updated);
          return updated;
        });
      } catch (err) {
        console.error(err);
        Swal.fire('Upload Failed', err.response?.data?.message || 'Could not upload image.', 'error');
      }
    }
  };

  const handleReplaceImage = async (e, categoryKey, indexToReplace) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem('homestayOwnerToken');
    if (!token) return;

    if (file.size > 10 * 1024 * 1024) {
      Swal.fire('File Too Large', 'Image exceeds the 10MB limit.', 'error');
      return;
    }

    const uploadForm = new FormData();
    uploadForm.append('file', file);

    try {
      Swal.showLoading();
      const res = await axios.post(getApiUrl('/api/homestay-owner/properties/upload-image'), uploadForm, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      const uploadedUrl = res.data.optimizedUrl;

      setFormData(prev => {
        const list = [...(prev.gallery[categoryKey] || [])];
        list[indexToReplace] = uploadedUrl;
        const updated = {
          ...prev,
          gallery: { ...prev.gallery, [categoryKey]: list }
        };
        autoSave(updated);
        return updated;
      });
      Swal.close();
    } catch (err) {
      console.error(err);
      Swal.fire('Replacement Failed', 'Could not replace image.', 'error');
    }
  };

  // Steps definitions
  const steps = [
    { num: 1, title: 'Property Details' },
    { num: 2, title: 'Gallery' },
    { num: 3, title: 'Amenities' },
    { num: 4, title: 'Rooms' },
    { num: 5, title: 'Seasons' },
    { num: 6, title: 'Pricing' },
    { num: 7, title: 'Preview' },
    { num: 8, title: 'Publish' }
  ];

  // Validation
  const validateStep = (stepNum, returnErrors = false) => {
    let stepErrors = {};
    if (stepNum === 1) {
      if (!formData.name.trim() || formData.name.trim().length < 5 || formData.name.trim().length > 150) {
        stepErrors.name = 'Property Name must be between 5 and 150 characters.';
      }
      if (!formData.address.trim()) stepErrors.address = 'Property Address is required';
      if (!formData.ownerName.trim()) stepErrors.ownerName = 'Owner Name is required';
      if (!formData.phone.trim()) stepErrors.phone = 'Mobile Number is required';
      if (!formData.email.trim()) stepErrors.email = 'Email Address is required';
      if (!formData.state) stepErrors.state = 'State is required';
      if (!formData.city) stepErrors.city = 'City is required';
      if (!formData.description || formData.description.trim().length < 100 || formData.description.trim().length > 5000) {
        stepErrors.description = 'Description must be between 100 and 5000 characters.';
      }
    }
    if (stepNum === 2) {
      if (!formData.gallery.cover) stepErrors.cover = 'Cover Image is required';
    }
    if (stepNum === 4) {
      if (formData.rooms.length === 0) {
        stepErrors.rooms = 'At least one Room Category must be configured';
      } else {
        const missingImages = formData.rooms.filter(r => !r.images || r.images.length === 0);
        if (missingImages.length > 0) {
          stepErrors.rooms = `Every Room Category must have at least one image. Missing images in: ${missingImages.map(r => r.name).join(', ')}`;
        }

        // Room Limit & Add-on verification
        if (!isAdmin && ownerSubscription && ownerSubscription.status === 'Active') {
          const totalRoomsCount = formData.rooms.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
          const included = Number(ownerSubscription.maxRoomsPerHomestay) || 5;
          const extra = Number(ownerSubscription.extraRoomsPurchased) || 0;
          const maxAllowed = included + extra;
          if (totalRoomsCount > maxAllowed) {
            const extraNeeded = totalRoomsCount - maxAllowed;
            const rate = Number(ownerSubscription.extraRoomPrice !== undefined ? ownerSubscription.extraRoomPrice : 500);
            stepErrors.rooms = `Room limit exceeded! Your plan includes ${included} rooms per homestay (+${extra} extra room add-ons = ${maxAllowed} total allowed). You have configured ${totalRoomsCount} rooms. Please purchase ${extraNeeded} Extra Room Add-on(s) at ₹${rate}/room (Total: ₹${(extraNeeded * rate).toLocaleString()}) before proceeding.`;
            setAddonRoomsCount(extraNeeded);
            setAddonModalOpen(true);
          }
        }
      }
    }
    if (stepNum === 5) {
      for (const room of formData.rooms) {
        const roomSeasons = formData.seasons[room.id] || { peak: [], mid: [], off: [] };
        const valRes = validateSeasonsCoverage(roomSeasons);
        if (!valRes.valid) {
          stepErrors.seasons = `Category "${room.name}": ${valRes.error}`;
          break;
        }
      }
    }
    if (stepNum === 6) {
      for (const room of formData.rooms) {
        const roomRates = formData.rates[room.id] || {};
        const seasons = ['peak', 'mid', 'off'];
        const plans = ['EP', 'CP', 'MAP', 'AP'];
        for (const s of seasons) {
          for (const p of plans) {
            const val = roomRates[s]?.[p] || { b2b: '', b2c: '' };
            const b2b = parseFloat(val.b2b);
            const b2c = parseFloat(val.b2c);
            if (isNaN(b2b) || isNaN(b2c) || b2b <= 0 || b2c <= 0) {
              stepErrors.rates = `Rates for category "${room.name}" in ${s.toUpperCase()} season (${p} plan) must be greater than zero.`;
              break;
            }
            if (b2b > b2c) {
              stepErrors.rates = `B2B Price cannot exceed B2C Price for category "${room.name}" in ${s.toUpperCase()} season (${p} plan).`;
              break;
            }
          }
          if (stepErrors.rates) break;
        }
        if (stepErrors.rates) break;
      }
    }

    if (returnErrors) return stepErrors;
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = async () => {
    if (isReadOnly) {
      setCurrentStep(prev => Math.min(prev + 1, 8));
      window.scrollTo(0, 0);
      return;
    }
    if (validateStep(currentStep)) {
      try {
        await autoSave(formData, currentStep);
        if (!completedSteps.includes(currentStep)) {
          setCompletedSteps([...completedSteps, currentStep]);
        }
        setCurrentStep(prev => Math.min(prev + 1, 8));
        window.scrollTo(0, 0);
      } catch (err) {
        console.error(err);
        Swal.fire({
          title: 'Save Failed',
          text: err.response?.data?.message || 'Failed to save progress to the server. Please check your connection and try again.',
          icon: 'error',
          confirmButtonColor: '#be123c'
        });
      }
    } else {
      Swal.fire({
        title: 'Validation Errors',
        text: 'Please fill in all mandatory fields correctly before proceeding.',
        icon: 'warning',
        confirmButtonColor: '#be123c'
      });
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const handleSaveDraft = async () => {
    if (isReadOnly) return;
    await autoSave(formData, currentStep);
    Swal.fire({
      title: 'Draft Saved',
      text: 'Property setup progress has been saved successfully.',
      icon: 'success',
      confirmButtonColor: '#be123c'
    });
    handleExit();
  };

  const handleStepClick = async (stepNum) => {
    if (isReadOnly) {
      setCurrentStep(stepNum);
      return;
    }
    if (completedSteps.includes(stepNum) || stepNum <= Math.max(...completedSteps) + 1) {
      if (validateStep(currentStep)) {
        await autoSave(formData, currentStep);
        setCurrentStep(stepNum);
      }
    }
  };

  const handlePublishProperty = async () => {
    if (isReadOnly) return;
    try {
      const token = getAuthToken();
      if (!token) {
        Swal.fire({
          title: 'Session Expired',
          text: 'Your session has expired. Please log in again.',
          icon: 'warning',
          confirmButtonColor: '#be123c'
        });
        return;
      }
      if (!propertyDbId) {
        Swal.fire({
          title: 'Draft Not Found',
          text: 'The property draft has not been initialized. Please refresh the page or step back to Step 1 to save first.',
          icon: 'error',
          confirmButtonColor: '#be123c'
        });
        return;
      }

      // E2E validations audit on publish submission
      const step1Errors = validateStep(1, true);
      const step2Errors = validateStep(2, true);
      const step4Errors = validateStep(4, true);
      const step5Errors = validateStep(5, true);
      const step6Errors = validateStep(6, true);

      const allErrors = { ...step1Errors, ...step2Errors, ...step4Errors, ...step5Errors, ...step6Errors };
      if (Object.keys(allErrors).length > 0) {
        Swal.fire({
          title: 'Validation Errors!',
          html: `<div style="text-align: left; font-size: 13px; max-height: 250px; overflow-y: auto;">
            <p style="font-weight: 600; margin-bottom: 8px;">Please resolve the following issues before submitting:</p>
            ${Object.values(allErrors).map(msg => `<div style="margin-bottom: 4px; color: #e11d48;">• ${msg}</div>`).join('')}
          </div>`,
          icon: 'error',
          confirmButtonColor: '#be123c'
        });
        return;
      }

      await axios.post(getApiUrl('/api/homestay-owner/properties/publish'), {
        propertyId: propertyDbId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Clear local storage draft
      localStorage.removeItem('propertySetupDraft');

      if (isAdmin) {
        Swal.fire({
          title: 'Property Saved & Published!',
          text: 'Property details have been saved successfully.',
          icon: 'success',
          confirmButtonColor: '#be123c'
        });
      } else {
        Swal.fire({
          title: 'Submitted For Review!',
          text: 'Your property has been successfully submitted for review. It will become live on the public portal upon administrator approval.',
          icon: 'success',
          confirmButtonColor: '#be123c'
        });
      }
      handleExit();
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: 'Publish Failed',
        text: err.response?.data?.message || 'Final verification audit checks failed.',
        icon: 'error',
        confirmButtonColor: '#be123c'
      });
    }
  };

  // Step 4 Configure Room handlers
  const [currentEditRoom, setCurrentEditRoom] = useState(null);

  const handleOpenRoomConfigure = (room) => {
    setCurrentEditRoom({ ...room });
    setActiveConfigureRoomId(room.id);
  };

  const handleSaveRoomConfigure = () => {
    const count = Number(currentEditRoom.count) || 0;
    if (count <= 0) {
      Swal.fire({
        title: 'Room Count Required',
        text: 'Total Number of Rooms must be at least 1.',
        icon: 'warning',
        confirmButtonColor: '#be123c'
      });
      return;
    }

    const nums = (currentEditRoom.roomNumbers || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (nums.length !== count) {
      Swal.fire({
        title: 'Room Numbers Incomplete',
        text: `Please enter room numbers for all ${count} room boxes. Currently entered: ${nums.length}/${count}.`,
        icon: 'warning',
        confirmButtonColor: '#be123c'
      });
      return;
    }

    if (new Set(nums).size !== nums.length) {
      Swal.fire({
        title: 'Duplicate Room Numbers',
        text: 'Each room number must be unique. Duplicate room numbers detected.',
        icon: 'warning',
        confirmButtonColor: '#be123c'
      });
      return;
    }

    if (!currentEditRoom.images || currentEditRoom.images.length === 0) {
      Swal.fire({
        title: 'Room Images Required',
        text: 'Every Room Category must have at least one image uploaded.',
        icon: 'warning',
        confirmButtonColor: '#be123c'
      });
      return;
    }
    const updatedRooms = formData.rooms.map(r => r.id === activeConfigureRoomId ? currentEditRoom : r);
    const updated = { ...formData, rooms: updatedRooms };
    setFormData(updated);
    autoSave(updated);
    setActiveConfigureRoomId(null);
    setCurrentEditRoom(null);
  };

  const handleAddRoomCategory = () => {
    const nextId = `RM-${Date.now()}`;
    const newCategory = {
      id: nextId,
      name: '',
      type: '',
      plan: 'EP Plan (European Plan)',
      count: '',
      occupancy: '',
      extraPerson: '',
      roomNumbers: '',
      description: '',
      images: []
    };
    
    const updatedRooms = [...formData.rooms, newCategory];
    const updatedSeasons = {
      ...formData.seasons,
      [nextId]: { off: [], mid: [], peak: [] }
    };
    const updatedRates = {
      ...formData.rates,
      [nextId]: {}
    };

    setFormData({
      ...formData,
      rooms: updatedRooms,
      seasons: updatedSeasons,
      rates: updatedRates
    });
  };

  const handleDuplicateRoom = (room) => {
    const copyId = `RM-${Date.now()}`;
    const duplicate = { ...room, id: copyId, name: `${room.name} (Copy)` };
    setFormData({
      ...formData,
      rooms: [...formData.rooms, duplicate],
      seasons: { ...formData.seasons, [copyId]: JSON.parse(JSON.stringify(formData.seasons[room.id] || {})) },
      rates: { ...formData.rates, [copyId]: JSON.parse(JSON.stringify(formData.rates[room.id] || {})) }
    });
  };

  const handleDeleteRoom = (roomId) => {
    setFormData({
      ...formData,
      rooms: formData.rooms.filter(r => r.id !== roomId)
    });
  };

  // Step 5 Season configuration subscreen
  const [currentEditSeasons, setCurrentEditSeasons] = useState(null);
  const handleOpenSeasonConfigure = (roomId) => {
    let seasonsData = formData.seasons[roomId];
    const hasExistingSeasons = seasonsData && 
      ((seasonsData.off && seasonsData.off.length > 0) || 
       (seasonsData.mid && seasonsData.mid.length > 0) || 
       (seasonsData.peak && seasonsData.peak.length > 0));

    if (!hasExistingSeasons) {
      const otherRoomId = Object.keys(formData.seasons).find(id => {
        if (id === roomId) return false;
        const otherSeasons = formData.seasons[id];
        return otherSeasons && 
          ((otherSeasons.off && otherSeasons.off.length > 0) || 
           (otherSeasons.mid && otherSeasons.mid.length > 0) || 
           (otherSeasons.peak && otherSeasons.peak.length > 0));
      });
      
      if (otherRoomId) {
        seasonsData = JSON.parse(JSON.stringify(formData.seasons[otherRoomId]));
      }
    }

    setSeasonModalError('');
    setCurrentEditSeasons(JSON.parse(JSON.stringify(seasonsData || { off: [], mid: [], peak: [] })));
    setActiveConfigureSeasonRoomId(roomId);
  };

  const handleSaveSeasonConfigure = () => {
    const coverage = validateSeasonsCoverage(currentEditSeasons);
    if (!coverage.valid) {
      setSeasonModalError(coverage.error);
      return;
    }
    setSeasonModalError('');
    setFormData({
      ...formData,
      seasons: {
        ...formData.seasons,
        [activeConfigureSeasonRoomId]: currentEditSeasons
      }
    });
    setActiveConfigureSeasonRoomId(null);
    setCurrentEditSeasons(null);
  };

  const handleAddDateRange = (seasonKey) => {
    setCurrentEditSeasons(prev => ({
      ...prev,
      [seasonKey]: [...(prev[seasonKey] || []), { start: '', end: '' }]
    }));
  };

  const handleRemoveDateRange = (seasonKey, idx) => {
    setCurrentEditSeasons(prev => ({
      ...prev,
      [seasonKey]: prev[seasonKey].filter((_, i) => i !== idx)
    }));
  };

  // Step 6 Rates subscreen
  const [currentEditRates, setCurrentEditRates] = useState(null);
  const [selectedSeasonTab, setSelectedSeasonTab] = useState('off'); // 'off', 'mid', 'peak'
  
  const handleOpenRateConfigure = (roomId) => {
    let ratesData = formData.rates[roomId];
    const hasExistingRates = ratesData && Object.keys(ratesData).length > 0;

    if (!hasExistingRates) {
      const otherRoomId = Object.keys(formData.rates).find(id => {
        if (id === roomId) return false;
        const otherRates = formData.rates[id];
        return otherRates && Object.keys(otherRates).length > 0;
      });

      if (otherRoomId) {
        ratesData = JSON.parse(JSON.stringify(formData.rates[otherRoomId]));
      }
    }

    setCurrentEditRates(JSON.parse(JSON.stringify(ratesData || {})));
    setActiveConfigureRateRoomId(roomId);
  };

  const handleSaveRateConfigure = () => {
    setFormData({
      ...formData,
      rates: {
        ...formData.rates,
        [activeConfigureRateRoomId]: currentEditRates
      }
    });
    setActiveConfigureRateRoomId(null);
    setCurrentEditRates(null);
  };



  const currentConfiguringRoomName = formData.rooms.find(r => r.id === activeConfigureRoomId)?.name || '';
  const currentConfiguringSeasonRoomName = formData.rooms.find(r => r.id === activeConfigureSeasonRoomId)?.name || '';
  const currentConfiguringRateRoomName = formData.rooms.find(r => r.id === activeConfigureRateRoomId)?.name || '';

  return (
    <div className="space-y-6 select-none font-sans pb-28 relative">
      
      {formData.status === 'Changes Requested' && approvalComments && approvalComments.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl space-y-2">
          <h3 className="text-xs font-black text-amber-800 flex items-center gap-1.5 uppercase tracking-wider">
            <AlertTriangle size={15} className="text-amber-600" />
            <span>Changes Requested by Administrator</span>
          </h3>
          <div className="space-y-2 text-xs text-amber-700 font-semibold pl-6">
            {approvalComments.map((c, i) => (
              <div key={i} className="border-b border-amber-100/50 pb-1.5 last:border-0 last:pb-0">
                <span className="text-[10px] text-amber-500 block">Review Comment:</span>
                <p className="mt-0.5">{c.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. TOP HEADER - Setup Progress Bar */}
      <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Sparkles size={16} className="text-rose-600" />
              <span>Property Setup Wizard</span>
            </h1>
            <p className="text-[10px] font-semibold text-slate-400">
              Guideline step: Configure premium details matching partner portals.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExit}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-205 hover:bg-slate-50 text-slate-600 text-[10px] font-black rounded-xl uppercase tracking-wider cursor-pointer bg-white"
            >
              <ArrowLeft size={12} className="text-slate-400" />
              <span>Back to Properties</span>
            </button>
            {!isReadOnly && (
              <button 
                onClick={handleSaveDraft}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-205 hover:bg-slate-50 text-slate-707 text-[10px] font-black rounded-xl uppercase tracking-wider cursor-pointer bg-white"
              >
                <Save size={12} className="text-slate-400" />
                <span>Save Draft</span>
              </button>
            )}
          </div>
        </div>

        {/* Setup Progress Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 bg-slate-50/50 p-2 rounded-2xl border border-slate-150">
          {steps.map((s) => {
            const isCurrent = currentStep === s.num;
            const isCompleted = completedSteps.includes(s.num);
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => handleStepClick(s.num)}
                className={`py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-between border-none transition-all cursor-pointer ${
                  isCurrent 
                    ? 'bg-rose-700 text-white shadow-md shadow-rose-900/10' 
                    : isCompleted
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100/50'
                      : 'bg-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span>{s.title}</span>
                {isCompleted && !isCurrent && (
                  <Check size={11} className="stroke-[3] text-rose-700 ml-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SUB-PAGES INTEGRATION INTERCEPTORS */}
      
      {/* Interceptor for Edit Room Details (Step 4) */}
      {activeConfigureRoomId && currentEditRoom && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Edit Room Details: {currentConfiguringRoomName}
            </h2>
            <button 
              onClick={() => { setActiveConfigureRoomId(null); setCurrentEditRoom(null); }}
              className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-xl text-[9px] uppercase tracking-wider cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="space-y-5.5">
            {/* Room Type & Info */}
            <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-150 space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest text-slate-400">Room Type & Basic Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Room Type</label>
                  <select
                    value={currentEditRoom.type}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCurrentEditRoom({
                        ...currentEditRoom,
                        type: val,
                        name: val || currentEditRoom.name
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                  >
                    <option value="">Select Room Type</option>
                    {masterRoomTypes.map(rt => (
                      <option key={rt._id} value={rt.roomTypeName}>{rt.roomTypeName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Room Category Name</label>
                  <input
                    type="text"
                    value={currentEditRoom.name}
                    onChange={(e) => setCurrentEditRoom({...currentEditRoom, name: e.target.value})}
                    placeholder="e.g. Deluxe Room, Premium Suite"
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Number of Rooms</label>
                  <input
                    type="number"
                    value={currentEditRoom.count === 0 ? '' : currentEditRoom.count}
                    onChange={(e) => setCurrentEditRoom({...currentEditRoom, count: e.target.value === '' ? '' : parseInt(e.target.value) || ''})}
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Occupancy</label>
                  <input
                    type="number"
                    value={currentEditRoom.occupancy === 0 ? '' : currentEditRoom.occupancy}
                    onChange={(e) => setCurrentEditRoom({...currentEditRoom, occupancy: e.target.value === '' ? '' : parseInt(e.target.value) || ''})}
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Room Numbers */}
            <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-150 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest text-slate-400">
                  Specific Room Numbers ({currentEditRoom.count || 0} Rooms)
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold">Enter a unique identifier for each room</span>
              </div>

              {(!currentEditRoom.count || Number(currentEditRoom.count) <= 0) ? (
                <div className="p-4 bg-white border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-bold">
                  Enter Total Number of Rooms above to configure individual room numbers.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {Array.from({ length: Number(currentEditRoom.count) }).map((_, idx) => {
                    const rawNums = (currentEditRoom.roomNumbers || '').split(',').map(s => s.trim());
                    const val = rawNums[idx] !== undefined ? rawNums[idx] : '';
                    return (
                      <div key={idx} className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
                          Room {idx + 1} Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={val}
                          onChange={(e) => {
                            const newNums = [...rawNums];
                            while (newNums.length < Number(currentEditRoom.count)) {
                              newNums.push('');
                            }
                            newNums[idx] = e.target.value.trim();
                            setCurrentEditRoom({
                              ...currentEditRoom,
                              roomNumbers: newNums.slice(0, Number(currentEditRoom.count)).join(', ')
                            });
                          }}
                          placeholder={`Room ${idx + 1}`}
                          className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-600 font-mono text-center"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Extra Person Allowed */}
            <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-150 space-y-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest text-slate-400">Extra Person Allowed</h3>
              <select
                value={currentEditRoom.extraPerson}
                onChange={(e) => setCurrentEditRoom({...currentEditRoom, extraPerson: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none cursor-pointer"
              >
                <option value="">Select Option</option>
                <option value="1 Extra Person">1 Extra Person</option>
                <option value="2 Extra Person">2 Extra Person</option>
                <option value="Not Allowed">Not Allowed</option>
              </select>
            </div>

            {/* Room Description */}
            <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-150 space-y-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest text-slate-400">Room Description</h3>
              <textarea
                rows={3}
                value={currentEditRoom.description}
                onChange={(e) => setCurrentEditRoom({...currentEditRoom, description: e.target.value})}
                className="w-full px-4 py-3 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
              />
            </div>

            {/* Room Images Gallery */}
            <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-150 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest text-slate-400">Room Images * (Min 1, Max 20)</h3>
                <span className="text-[10px] font-black text-slate-400">{(currentEditRoom.images || []).length} / 20</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(currentEditRoom.images || []).map((url, idx) => (
                  <div key={idx} className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200 bg-white">
                    <img src={getImageUrl(url)} alt={`Room ${idx + 1}`} className="w-full h-full object-cover" />
                    
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      {/* Move Left */}
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const list = [...currentEditRoom.images];
                            const temp = list[idx];
                            list[idx] = list[idx - 1];
                            list[idx - 1] = temp;
                            setCurrentEditRoom({ ...currentEditRoom, images: list });
                          }}
                          className="p-1 bg-slate-800 text-white rounded hover:bg-slate-900 border-none cursor-pointer text-[10px] font-bold"
                        >
                          &larr;
                        </button>
                      )}
                      
                      {/* Move Right */}
                      {idx < (currentEditRoom.images || []).length - 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const list = [...currentEditRoom.images];
                            const temp = list[idx];
                            list[idx] = list[idx + 1];
                            list[idx + 1] = temp;
                            setCurrentEditRoom({ ...currentEditRoom, images: list });
                          }}
                          className="p-1 bg-slate-800 text-white rounded hover:bg-slate-900 border-none cursor-pointer text-[10px] font-bold"
                        >
                          &rarr;
                        </button>
                      )}
                      
                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => {
                          const list = (currentEditRoom.images || []).filter((_, i) => i !== idx);
                          setCurrentEditRoom({ ...currentEditRoom, images: list });
                        }}
                        className="p-1 bg-rose-700 text-white rounded hover:bg-rose-800 border-none cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>

                      {/* Replace */}
                      <label
                        htmlFor={`replace-room-image-${idx}`}
                        className="p-1 bg-blue-700 text-white rounded hover:bg-blue-800 border-none cursor-pointer flex items-center justify-center"
                      >
                        <RefreshCw size={11} />
                      </label>
                      <input
                        type="file"
                        id={`replace-room-image-${idx}`}
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const token = localStorage.getItem('homestayOwnerToken');
                          if (!token) return;
                          const uploadForm = new FormData();
                          uploadForm.append('file', file);
                          try {
                            const res = await axios.post(getApiUrl('/api/homestay-owner/properties/upload-image'), uploadForm, {
                              headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
                            });
                            const list = [...currentEditRoom.images];
                            list[idx] = res.data.optimizedUrl;
                            setCurrentEditRoom({ ...currentEditRoom, images: list });
                          } catch (err) {
                            console.error(err);
                            Swal.fire('Replace Failed', 'Image replacement failed', 'error');
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
                
                {/* Upload Button Card */}
                {(currentEditRoom.images || []).length < 20 && (
                  <div className="border-2 border-dashed border-slate-250 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50/20 hover:bg-slate-50 transition-colors cursor-pointer relative min-h-[70px]">
                    <Upload size={18} className="text-slate-400 stroke-[2] mb-1" />
                    <span className="text-[9px] font-bold text-slate-500 text-center">Upload Room Image</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      id="room-image-upload-input"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        const token = localStorage.getItem('homestayOwnerToken');
                        if (!token) return;
                        
                        const list = [...(currentEditRoom.images || [])];
                        for (let i = 0; i < files.length; i++) {
                          const file = files[i];
                          if (list.length >= 20) break;
                          const uploadForm = new FormData();
                          uploadForm.append('file', file);
                          try {
                            const res = await axios.post(getApiUrl('/api/homestay-owner/properties/upload-image'), uploadForm, {
                              headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
                            });
                            list.push(res.data.optimizedUrl);
                          } catch (err) {
                            console.error(err);
                          }
                        }
                        setCurrentEditRoom({ ...currentEditRoom, images: list });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              onClick={() => { setActiveConfigureRoomId(null); setCurrentEditRoom(null); }}
              className="px-5 py-2.5 border border-slate-200 text-slate-707 font-bold rounded-xl text-xs bg-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveRoomConfigure}
              className="px-5 py-2.5 bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer border-none"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Interceptor for Edit Season Dates (Step 5) */}
      {activeConfigureSeasonRoomId && currentEditSeasons && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Edit Season Dates: {currentConfiguringSeasonRoomName}
            </h2>
            <button 
              onClick={() => { setActiveConfigureSeasonRoomId(null); setCurrentEditSeasons(null); }}
              className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-xl text-[9px] uppercase tracking-wider cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="space-y-6">
            {/* Calendar Coverage Tracker & Inline Error Banner */}
            {(() => {
              const coverage = validateSeasonsCoverage(currentEditSeasons);
              return (
                <div className="space-y-3">
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    coverage.valid ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-amber-50/80 border-amber-200 text-amber-900'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <Calendar size={18} className={coverage.valid ? 'text-emerald-600' : 'text-amber-600'} />
                      <div>
                        <span className="font-extrabold text-xs uppercase tracking-wider block">
                          365-Day / 12-Month Calendar Coverage
                        </span>
                        <span className="text-[11px] font-bold text-slate-600">
                          {coverage.totalDays || 0} / 365 Days Assigned ({Math.min(100, Math.round(((coverage.totalDays || 0) / 365) * 100))}%)
                        </span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider text-center ${
                      coverage.valid ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {coverage.valid ? '✓ Full Year Covered' : '⚠️ Incomplete Coverage'}
                    </span>
                  </div>

                  {seasonModalError && (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-start gap-2.5 shadow-sm">
                      <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black uppercase tracking-wider block text-[10px] text-rose-800">
                          Calendar Coverage Error (Required on This Page)
                        </span>
                        <span className="text-rose-900">{seasonModalError}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Off Season */}
            <div className="bg-slate-50/30 p-5 rounded-2xl border border-slate-150 space-y-4">
              <h3 className="text-xs font-black text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                <Moon size={14} />
                <span>Off-Season</span>
              </h3>
              
              <div className="space-y-3">
                {(currentEditSeasons.off || []).map((range, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="date"
                      value={range.start || ''}
                      onChange={(e) => {
                        const list = [...currentEditSeasons.off];
                        list[idx].start = e.target.value;
                        setCurrentEditSeasons({ ...currentEditSeasons, off: list });
                      }}
                      className="px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none bg-white"
                    />
                    <span className="text-[10px] font-bold text-slate-400">TO</span>
                    <input
                      type="date"
                      value={range.end || ''}
                      onChange={(e) => {
                        const list = [...currentEditSeasons.off];
                        list[idx].end = e.target.value;
                        setCurrentEditSeasons({ ...currentEditSeasons, off: list });
                      }}
                      className="px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveDateRange('off', idx)}
                      className="p-2 text-rose-600 hover:bg-rose-50 border-none bg-transparent cursor-pointer rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => handleAddDateRange('off')}
                  className="text-xs font-black text-rose-700 bg-transparent border-none cursor-pointer flex items-center gap-1"
                >
                  + Add Another Off-Season Date Range
                </button>
              </div>
            </div>

            {/* Mid Season */}
            <div className="bg-slate-50/30 p-5 rounded-2xl border border-slate-150 space-y-4">
              <h3 className="text-xs font-black text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sun size={14} />
                <span>Mid-Season</span>
              </h3>
              
              <div className="space-y-3">
                {(currentEditSeasons.mid || []).map((range, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="date"
                      value={range.start || ''}
                      onChange={(e) => {
                        const list = [...currentEditSeasons.mid];
                        list[idx].start = e.target.value;
                        setCurrentEditSeasons({ ...currentEditSeasons, mid: list });
                      }}
                      className="px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none bg-white"
                    />
                    <span className="text-[10px] font-bold text-slate-400">TO</span>
                    <input
                      type="date"
                      value={range.end || ''}
                      onChange={(e) => {
                        const list = [...currentEditSeasons.mid];
                        list[idx].end = e.target.value;
                        setCurrentEditSeasons({ ...currentEditSeasons, mid: list });
                      }}
                      className="px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveDateRange('mid', idx)}
                      className="p-2 text-rose-600 hover:bg-rose-50 border-none bg-transparent cursor-pointer rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => handleAddDateRange('mid')}
                  className="text-xs font-black text-rose-700 bg-transparent border-none cursor-pointer flex items-center gap-1"
                >
                  + Add Another Mid-Season Date Range
                </button>
              </div>
            </div>

            {/* Peak Season */}
            <div className="bg-slate-50/30 p-5 rounded-2xl border border-slate-150 space-y-4">
              <h3 className="text-xs font-black text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} />
                <span>Peak Season</span>
              </h3>
              
              <div className="space-y-3">
                {(currentEditSeasons.peak || []).map((range, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="date"
                      value={range.start || ''}
                      onChange={(e) => {
                        const list = [...currentEditSeasons.peak];
                        list[idx].start = e.target.value;
                        setCurrentEditSeasons({ ...currentEditSeasons, peak: list });
                      }}
                      className="px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none bg-white"
                    />
                    <span className="text-[10px] font-bold text-slate-400">TO</span>
                    <input
                      type="date"
                      value={range.end || ''}
                      onChange={(e) => {
                        const list = [...currentEditSeasons.peak];
                        list[idx].end = e.target.value;
                        setCurrentEditSeasons({ ...currentEditSeasons, peak: list });
                      }}
                      className="px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveDateRange('peak', idx)}
                      className="p-2 text-rose-600 hover:bg-rose-50 border-none bg-transparent cursor-pointer rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => handleAddDateRange('peak')}
                  className="text-xs font-black text-rose-700 bg-transparent border-none cursor-pointer flex items-center gap-1"
                >
                  + Add Another Peak Season Date Range
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              onClick={() => { setActiveConfigureSeasonRoomId(null); setCurrentEditSeasons(null); }}
              className="px-5 py-2.5 border border-slate-200 text-slate-707 font-bold rounded-xl text-xs bg-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSeasonConfigure}
              className="px-5 py-2.5 bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer border-none"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Interceptor for Edit Rate Chart (Step 6) */}
      {activeConfigureRateRoomId && currentEditRates && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Configure Meal Plan Pricing: {currentConfiguringRateRoomName}
            </h2>
            <button 
              onClick={() => { setActiveConfigureRateRoomId(null); setCurrentEditRates(null); }}
              className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-xl text-[9px] uppercase tracking-wider cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Season Tabs Selection */}
          <div className="flex gap-2">
            {['off', 'mid', 'peak'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedSeasonTab(tab)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer border-none transition-all ${
                  selectedSeasonTab === tab 
                    ? 'bg-rose-700 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {tab === 'off' ? 'Off-Season' : tab === 'mid' ? 'Mid-Season' : 'Peak Season'}
              </button>
            ))}
          </div>

          {/* Plan rates inputs matrix table */}
          <div className="overflow-x-auto border border-slate-150 rounded-2xl bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Plan / Category</th>
                  <th className="py-3 px-4 text-center border-l border-slate-150" colSpan={2}>Adults (12+ years)</th>
                  <th className="py-3 px-4 text-center border-l border-slate-150" colSpan={2}>Extra Person (10+)</th>
                  <th className="py-3 px-4 text-center border-l border-slate-150" colSpan={2}>Child (5-9 years)</th>
                </tr>
                <tr className="bg-slate-50/50 border-b border-slate-150 text-[8px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-2 px-4"></th>
                  <th className="py-2 px-2 text-center border-l border-slate-150">B2B</th>
                  <th className="py-2 px-2 text-center text-rose-700 bg-rose-50/10">B2C</th>
                  <th className="py-2 px-2 text-center border-l border-slate-150">B2B</th>
                  <th className="py-2 px-2 text-center text-rose-700 bg-rose-50/10">B2C</th>
                  <th className="py-2 px-2 text-center border-l border-slate-150">B2B</th>
                  <th className="py-2 px-2 text-center text-rose-700 bg-rose-50/10">B2C</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 font-bold text-slate-707">
                {['EP', 'CP', 'MAP', 'AP'].map((plan) => {
                  const planRates = currentEditRates[selectedSeasonTab]?.[plan] || { b2b: '0', b2c: '0', extraAdultB2B: '0', extraAdultB2C: '0', childB2b: '0', childB2c: '0' };
                  const updateRateField = (field, val) => {
                    const nextRates = { ...currentEditRates };
                    if (!nextRates[selectedSeasonTab]) nextRates[selectedSeasonTab] = {};
                    if (!nextRates[selectedSeasonTab][plan]) nextRates[selectedSeasonTab][plan] = {};
                    nextRates[selectedSeasonTab][plan][field] = val;
                    setCurrentEditRates(nextRates);
                  };

                  return (
                    <tr key={plan} className="hover:bg-slate-50/10">
                      <td className="py-3 px-4 font-black">
                        <span className="block text-slate-800">{plan}</span>
                        <span className="block text-[8px] text-slate-400 mt-0.5 leading-none font-semibold">
                          {plan === 'EP' ? 'Only Room' : plan === 'CP' ? 'Breakfast Included' : plan === 'MAP' ? 'Breakfast + Dinner' : 'All Meals'}
                        </span>
                      </td>
                      
                      {/* B2B Adults */}
                      <td className="py-3 px-2 border-l border-slate-150 text-center font-mono">
                        <input
                          type="number"
                          value={planRates.b2b}
                          onChange={(e) => updateRateField('b2b', e.target.value)}
                          className="w-16 px-1.5 py-1 border border-slate-205 rounded-lg text-center font-bold"
                        />
                      </td>
                      {/* B2C Adults */}
                      <td className="py-3 px-2 text-center font-mono bg-rose-50/5 text-rose-700">
                        <input
                          type="number"
                          value={planRates.b2c}
                          onChange={(e) => updateRateField('b2c', e.target.value)}
                          className="w-16 px-1.5 py-1 border border-rose-205 rounded-lg text-center font-bold text-rose-700 bg-rose-50/10"
                        />
                      </td>

                      {/* B2B Extra Person */}
                      <td className="py-3 px-2 border-l border-slate-150 text-center font-mono">
                        <input
                          type="number"
                          value={planRates.extraAdultB2B}
                          onChange={(e) => updateRateField('extraAdultB2B', e.target.value)}
                          className="w-16 px-1.5 py-1 border border-slate-205 rounded-lg text-center font-bold"
                        />
                      </td>
                      {/* B2C Extra Person */}
                      <td className="py-3 px-2 text-center font-mono bg-rose-50/5 text-rose-700">
                        <input
                          type="number"
                          value={planRates.extraAdultB2C}
                          onChange={(e) => updateRateField('extraAdultB2C', e.target.value)}
                          className="w-16 px-1.5 py-1 border border-rose-205 rounded-lg text-center font-bold text-rose-707 bg-rose-50/10"
                        />
                      </td>

                      {/* B2B Child */}
                      <td className="py-3 px-2 border-l border-slate-150 text-center font-mono">
                        <input
                          type="number"
                          value={planRates.childB2b}
                          onChange={(e) => updateRateField('childB2b', e.target.value)}
                          className="w-16 px-1.5 py-1 border border-slate-205 rounded-lg text-center font-bold"
                        />
                      </td>
                      {/* B2C Child */}
                      <td className="py-3 px-2 text-center font-mono bg-rose-50/5 text-rose-700">
                        <input
                          type="number"
                          value={planRates.childB2c}
                          onChange={(e) => updateRateField('childB2c', e.target.value)}
                          className="w-16 px-1.5 py-1 border border-rose-205 rounded-lg text-center font-bold text-rose-707 bg-rose-50/10"
                        />
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              onClick={() => { setActiveConfigureRateRoomId(null); setCurrentEditRates(null); }}
              className="px-5 py-2.5 border border-slate-200 text-slate-707 font-bold rounded-xl text-xs bg-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveRateConfigure}
              className="px-5 py-2.5 bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer border-none"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* 3. STEP-BY-STEP CONTENTS RENDERING */}
      
      {!activeConfigureRoomId && !activeConfigureSeasonRoomId && !activeConfigureRateRoomId && (
        <div className="space-y-6">
          
          {/* Status & Review Banners */}
          {propertyStatus === 'Submitted For Review' && !isAdmin && (
            <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={18} className="text-blue-600 shrink-0" />
                <span>This property has been <strong>Submitted For Review</strong> to Super Admin. All editing is locked until review is complete.</span>
              </div>
              <span className="px-2.5 py-1 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg">View Only</span>
            </div>
          )}

          {(propertyStatus === 'Rejected' || propertyStatus === 'Changes Requested') && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-black uppercase tracking-wider text-[11px] text-rose-700">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>Super Admin Review Feedback ({propertyStatus})</span>
              </div>
              <p className="text-xs text-rose-900 font-semibold pl-6">
                {approvalComments?.length > 0 ? approvalComments[approvalComments.length - 1]?.comment : 'Please update the requested details and re-submit for approval.'}
              </p>
            </div>
          )}

          {(propertyStatus === 'Approved' || propertyStatus === 'Active') && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm">
              <Check size={16} className="text-emerald-600 shrink-0" />
              <span>This property is currently <strong>Approved & Active</strong>. Any modifications saved will automatically be sent for Super Admin re-approval.</span>
            </div>
          )}

          {isAdmin && (
            <div className="p-3.5 bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-purple-600 shrink-0" />
                <span>Super Admin Property Editor Mode (Editing as Administrator)</span>
              </div>
              <span className="px-2.5 py-1 bg-purple-600 text-white text-[10px] font-black uppercase rounded-lg">Super Admin</span>
            </div>
          )}

          {/* STEP 1: PROPERTY DETAILS */}
          {currentStep === 1 && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6.5">
              <div className="space-y-1 pb-3 border-b border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Step 1 of 8</span>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Basic Property Information</h2>
                <p className="text-[10px] text-slate-400">Provide the baseline information, category, and map parameters of your homestay property.</p>
              </div>

              {/* Admin Owner Selector */}
              {isAdmin && masterOwners.length > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
                    Link / Assign to Homestay Owner
                  </label>
                  <select
                    onChange={(e) => {
                      const selected = masterOwners.find(o => o._id === e.target.value);
                      if (selected) {
                        setFormData(prev => ({
                          ...prev,
                          ownerName: selected.name,
                          phone: selected.phone || selected.mobile || prev.phone,
                          email: selected.email || prev.email
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="">-- Choose Existing Owner or Type Below --</option>
                    {masterOwners.map(o => (
                      <option key={o._id} value={o._id}>
                        {o.name} ({o.email || o.phone || 'Owner'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Property Name *</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  {errors.name && <span className="text-[9px] font-bold text-rose-500 block">{errors.name}</span>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Property Type *</label>
                  <select
                    value="Homestay"
                    disabled
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold text-slate-700 cursor-not-allowed"
                  >
                    <option value="Homestay">Homestay</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Property Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Owner Name *</label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold"
                  />
                  {errors.ownerName && <span className="text-[9px] font-bold text-rose-500 block">{errors.ownerName}</span>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Mobile Number *</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold"
                  />
                  {errors.phone && <span className="text-[9px] font-bold text-rose-500 block">{errors.phone}</span>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold"
                  />
                  {errors.email && <span className="text-[9px] font-bold text-rose-500 block">{errors.email}</span>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Website (Optional)</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5.5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Property Address *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold"
                  />
                  {errors.address && <span className="text-[9px] font-bold text-rose-500 block">{errors.address}</span>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">GST Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">State *</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '' })}
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold focus:outline-none"
                    required
                  >
                    <option value="">Select State</option>
                    {masterStates.map(s => (
                      <option key={s._id} value={s.stateName}>{s.stateName}</option>
                    ))}
                  </select>
                  {errors.state && <span className="text-[9px] font-bold text-rose-500 block">{errors.state}</span>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">City *</label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold focus:outline-none"
                    required
                  >
                    <option value="">Select City</option>
                    {masterCities.map(c => (
                      <option key={c._id} value={c.cityName}>{c.cityName}</option>
                    ))}
                  </select>
                  {errors.city && <span className="text-[9px] font-bold text-rose-500 block">{errors.city}</span>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">PIN Code</label>
                  <input
                    type="text"
                    value={formData.pinCode}
                    onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Google Map Location Link</label>
                  <input
                    type="text"
                    value={formData.googleMap}
                    onChange={(e) => setFormData({ ...formData, googleMap: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Latitude</label>
                    <input
                      type="text"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Longitude</label>
                    <input
                      type="text"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Property Description * (Min 100 characters)</label>
                  <span className="text-[9px] font-bold text-slate-400">
                    {formData.description.length} / 5000 characters
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={5000}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                />
                {errors.description && <span className="text-[9px] font-bold text-rose-500 block">{errors.description}</span>}
              </div>
            </div>
          )}

          {/* STEP 2: PROPERTY GALLERY */}
          {currentStep === 2 && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6.5">
              <div className="space-y-1 pb-3 border-b border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Step 2 of 8</span>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Media & Property Gallery</h2>
                <p className="text-[10px] text-slate-400">Upload high-resolution property imagery (Min 1200x800px) mapped to category folders.</p>
              </div>

              {/* Cover Photo */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Cover Image *</h3>
                {formData.gallery.cover ? (
                  <div className="relative w-full max-w-xl h-60 rounded-2xl overflow-hidden border border-slate-150 shadow-sm">
                    <img src={getImageUrl(formData.gallery.cover)} alt="Cover" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setFormData({ ...formData, gallery: { ...formData.gallery, cover: '' } })}
                      className="absolute top-3 right-3 p-2 bg-rose-700 hover:bg-rose-800 text-white rounded-full border-none shadow-md cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="w-full max-w-xl border-2 border-dashed border-slate-250 rounded-2xl p-8 text-center bg-slate-50/30">
                    <Upload size={32} className="mx-auto text-slate-400 stroke-[2] mb-3" />
                    <span className="block text-xs font-bold text-slate-707">Upload Cover Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      id="cover-upload-input"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'cover')}
                    />
                    <label
                      htmlFor="cover-upload-input"
                      className="inline-block mt-3 px-4.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded-xl cursor-pointer"
                    >
                      Choose File
                    </label>
                  </div>
                )}
                {errors.cover && <span className="text-[9px] font-bold text-rose-500 block">{errors.cover}</span>}
              </div>

              {/* Folders grid */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Gallery Categories</h3>
                
                {/* Folder Tab Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {galleryCategoriesList.map(cat => {
                    const key = cat.toLowerCase().replace(' ', '');
                    const count = formData.gallery[key]?.length || 0;
                    const isActive = activeFolderCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveFolderCategory(cat)}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          isActive
                            ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm font-black'
                            : 'bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-50 font-bold'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase tracking-wider block truncate">{cat}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{count} Images</span>
                        </div>
                        {count > 0 ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Check size={10} className="stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-200 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="p-5 border border-slate-150 rounded-2xl bg-slate-50/10 space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      📁 Category Folder: {activeFolderCategory}
                    </span>
                    <div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        id="folder-upload-input"
                        className="hidden"
                        onChange={(e) => {
                          const catKey = activeFolderCategory.toLowerCase().replace(' ', '');
                          handleImageUpload(e, catKey);
                        }}
                      />
                      <label
                        htmlFor="folder-upload-input"
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded-xl cursor-pointer"
                      >
                        Upload Images
                      </label>
                    </div>
                  </div>

                  {/* Display folder images */}
                  {(() => {
                    const catKey = activeFolderCategory.toLowerCase().replace(' ', '');
                    const imagesList = formData.gallery[catKey] || [];
                    if (imagesList.length === 0) {
                      return (
                        <p className="text-[10px] font-bold text-slate-400 py-6 text-center">
                          No Images Uploaded in this category folder yet.
                        </p>
                      );
                    }
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                        {imagesList.map((url, idx) => (
                          <div key={url} className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200 bg-white">
                            <img src={getImageUrl(url)} alt="Gallery" className="w-full h-full object-cover" />
                            
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                              {/* Move Left */}
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const list = [...imagesList];
                                    const temp = list[idx];
                                    list[idx] = list[idx - 1];
                                    list[idx - 1] = temp;
                                    const updated = {
                                      ...formData,
                                      gallery: { ...formData.gallery, [catKey]: list }
                                    };
                                    setFormData(updated);
                                    autoSave(updated);
                                  }}
                                  className="p-1 bg-slate-800 text-white rounded hover:bg-slate-900 border-none cursor-pointer text-[10px] font-bold"
                                >
                                  &larr;
                                </button>
                              )}
                              
                              {/* Move Right */}
                              {idx < imagesList.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const list = [...imagesList];
                                    const temp = list[idx];
                                    list[idx] = list[idx + 1];
                                    list[idx + 1] = temp;
                                    const updated = {
                                      ...formData,
                                      gallery: { ...formData.gallery, [catKey]: list }
                                    };
                                    setFormData(updated);
                                    autoSave(updated);
                                  }}
                                  className="p-1 bg-slate-800 text-white rounded hover:bg-slate-900 border-none cursor-pointer text-[10px] font-bold"
                                >
                                  &rarr;
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedList = imagesList.filter((_, i) => i !== idx);
                                  const updated = {
                                    ...formData,
                                    gallery: { ...formData.gallery, [catKey]: updatedList }
                                  };
                                  setFormData(updated);
                                  autoSave(updated);
                                }}
                                className="p-1 bg-rose-700 text-white rounded hover:bg-rose-800 border-none cursor-pointer"
                              >
                                <Trash2 size={11} />
                              </button>

                              {/* Replace */}
                              <label
                                htmlFor={`replace-gallery-${catKey}-${idx}`}
                                className="p-1 bg-blue-700 text-white rounded hover:bg-blue-850 border-none cursor-pointer flex items-center justify-center"
                              >
                                <RefreshCw size={11} />
                              </label>
                              <input
                                type="file"
                                id={`replace-gallery-${catKey}-${idx}`}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleReplaceImage(e, catKey, idx)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: AMENITIES */}
          {currentStep === 3 && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6.5">
              <div className="space-y-1 pb-3 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Step 3 of 8</span>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Select Amenities</h2>
                  <p className="text-[10px] text-slate-400">Select what features and experiences are offered at your property location.</p>
                </div>
                <div className="relative w-full md:w-64">
                  <Search size={14} className="absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={amenitySearch}
                    onChange={(e) => setAmenitySearch(e.target.value)}
                    placeholder="Search amenities..."
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-205 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {masterAmenities
                  .filter(item => item.amenityName.toLowerCase().includes(amenitySearch.toLowerCase()))
                  .map((item) => {
                    const isSelected = formData.amenities.includes(item._id);
                    return (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => {
                          const nextList = isSelected
                            ? formData.amenities.filter(id => id !== item._id)
                            : [...formData.amenities, item._id];
                          setFormData({ ...formData, amenities: nextList });
                          autoSave({ ...formData, amenities: nextList });
                        }}
                        className={`p-4 border rounded-2xl text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-rose-700 bg-rose-50/10 text-rose-700 shadow-sm' 
                            : 'border-slate-200 hover:bg-slate-50/50 text-slate-600 bg-white'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden p-1">
                          <img 
                            src={getImageUrl(item.amenityIcon)} 
                            alt={item.amenityName} 
                            onError={(e) => { e.target.src = 'https://img.icons8.com/color/48/wifi.png'; }}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-xs font-black text-slate-800">{item.amenityName}</span>
                          <span className="block text-[9px] text-slate-400 leading-normal font-semibold">Active master amenity</span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* STEP 4: ROOM CONFIGURATION */}
          {currentStep === 4 && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6.5">
              <div className="space-y-1 pb-3 border-b border-slate-50 flex justify-between items-end">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Step 4 of 8</span>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Room Categories Manager</h2>
                  <p className="text-[10px] text-slate-400">Define standard room categories and guest capacities.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddRoomCategory}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black rounded-xl border-none flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={11} />
                  <span>Add Category</span>
                </button>
              </div>

              {/* Subscription Room Allowance & Add-on Indicator */}
              {(() => {
                const totalRoomsCount = (formData.rooms || []).reduce((sum, r) => sum + (Number(r.count) || 0), 0);
                const includedRooms = ownerSubscription?.maxRoomsPerHomestay || 5;
                const extraRoomsPurchased = ownerSubscription?.extraRoomsPurchased || 0;
                const maxAllowedRooms = includedRooms + extraRoomsPurchased;
                const isLimitExceeded = totalRoomsCount > maxAllowedRooms;
                const extraRoomsNeeded = Math.max(0, totalRoomsCount - maxAllowedRooms);
                const ratePerExtraRoom = ownerSubscription?.extraRoomPrice !== undefined ? Number(ownerSubscription.extraRoomPrice) : 500;
                const totalAddonCost = extraRoomsNeeded * ratePerExtraRoom;

                return (
                  <div className={`p-4 rounded-2xl border transition-all ${
                    isLimitExceeded 
                      ? 'bg-rose-50/60 border-rose-200' 
                      : 'bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-blue-100'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-blue-600 text-white rounded-lg">
                          <Crown size={14} />
                        </span>
                        <div>
                          <span className="text-xs font-black text-slate-800">
                            Subscription Room Allowance: {ownerSubscription?.planName || 'Standard Plan'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold block">
                            Extra Room Add-on Rate: ₹{ratePerExtraRoom.toLocaleString()} / additional room
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAddonRoomsCount(Math.max(1, extraRoomsNeeded || 1));
                          setAddonModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-extrabold flex items-center gap-1 cursor-pointer border-none shadow-xs transition-colors self-start sm:self-auto"
                      >
                        <PlusCircle size={13} />
                        <span>+ Purchase Extra Rooms</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-center">
                      <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-2xs">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Plan Included</span>
                        <span className="block text-xs font-black text-slate-800 mt-0.5">{includedRooms} Rooms</span>
                      </div>

                      <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-2xs">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Extra Purchased</span>
                        <span className="block text-xs font-black text-amber-700 mt-0.5">+{extraRoomsPurchased} Rooms</span>
                      </div>

                      <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-2xs">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Total Allowed</span>
                        <span className="block text-xs font-black text-blue-700 mt-0.5">{maxAllowedRooms} Rooms</span>
                      </div>

                      <div className={`p-2 bg-white rounded-xl border shadow-2xs ${
                        isLimitExceeded ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-100'
                      }`}>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Total Configured</span>
                        <span className={`block text-xs font-black mt-0.5 ${
                          isLimitExceeded ? 'text-rose-600' : 'text-emerald-700'
                        }`}>
                          {totalRoomsCount} Rooms
                        </span>
                      </div>
                    </div>

                    {isLimitExceeded && (
                      <div className="mt-3 p-3 bg-rose-100/70 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-rose-900">
                        <div className="flex items-start gap-2 text-xs">
                          <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Room limit exceeded:</strong> You configured <strong>{totalRoomsCount}</strong> rooms, which exceeds your allowance of <strong>{maxAllowedRooms}</strong>. You must purchase <strong>{extraRoomsNeeded}</strong> Extra Room Add-on(s) ({extraRoomsNeeded} × ₹{ratePerExtraRoom} = ₹{totalAddonCost.toLocaleString()}) to proceed.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAddonRoomsCount(extraRoomsNeeded);
                            setAddonModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl border-none cursor-pointer whitespace-nowrap shadow-xs"
                        >
                          Buy {extraRoomsNeeded} Room{extraRoomsNeeded > 1 ? 's' : ''} (₹{totalAddonCost.toLocaleString()})
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {errors.rooms && (
                <div className="p-3.5 bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold rounded-2xl">
                  {errors.rooms}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5.5">
                {formData.rooms.map((room) => (
                  <div key={room.id} className="border border-slate-150 rounded-2xl bg-white shadow-sm flex flex-col justify-between overflow-hidden">
                    <div className="p-4.5 space-y-3.5 flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-xs font-black text-slate-800 tracking-tight leading-none">{room.name}</h4>
                          <span className="text-[8px] font-black text-slate-400 uppercase font-mono mt-1 block">ID: {room.id}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[8px] font-black uppercase tracking-wider rounded-md leading-none">
                          {room.type}
                        </span>
                      </div>

                      <p className="text-[10px] font-bold text-slate-400 line-clamp-2 leading-normal">
                        {room.description || 'No description provided.'}
                      </p>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50 text-slate-707">
                        <div>
                          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Inventory</span>
                          <span className="text-[11px] font-black block mt-0.5">{room.count} Units</span>
                        </div>
                        <div>
                          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Occupancy</span>
                          <span className="text-[11px] font-black block mt-0.5">{room.occupancy} Guests</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateRoom(room)}
                          className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 rounded-lg cursor-pointer"
                          title="Duplicate Category"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRoom(room.id)}
                          className="p-2 border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenRoomConfigure(room)}
                        className="px-3.5 py-1.5 bg-rose-700 text-white text-[9px] font-black rounded-lg border-none cursor-pointer"
                      >
                        Configure Room
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: SEASON CONFIGURATION */}
          {currentStep === 5 && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6.5">
              <div className="space-y-1 pb-3 border-b border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Step 5 of 8</span>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Season Date Configurations</h2>
                <p className="text-[10px] text-slate-400">Map date ranges for Peak, Mid, and Off seasons per Room Category.</p>
              </div>

              {errors.seasons && (
                <div className="p-3.5 bg-rose-50 border border-rose-150 text-rose-600 text-[10px] font-bold rounded-2xl">
                  {errors.seasons}
                </div>
              )}

              <div className="space-y-4">
                {formData.rooms.map((room) => {
                  const hasSeasons = Object.values(formData.seasons[room.id] || {}).flat().length > 0;
                  return (
                    <div key={room.id} className="p-4 border border-slate-150 rounded-2xl bg-white shadow-sm flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 leading-none">{room.name}</h4>
                        <span className="text-[9px] text-slate-400 block mt-1">
                          {hasSeasons ? 'Seasons configured' : 'Pending season configuration'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenSeasonConfigure(room.id)}
                        className="px-4 py-2 border border-slate-205 hover:bg-slate-50 text-slate-707 text-[10px] font-bold rounded-xl cursor-pointer"
                      >
                        Configure Seasons
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 6: RATE CONFIGURATION */}
          {currentStep === 6 && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6.5">
              <div className="space-y-1 pb-3 border-b border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Step 6 of 8</span>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Room Rates Configuration</h2>
                <p className="text-[10px] text-slate-400">Setup specific B2B and B2C pricing for room plan formats (EP, CP, MAP, AP).</p>
              </div>

              {errors.rates && (
                <div className="p-3.5 bg-rose-50 border border-rose-150 text-rose-600 text-[10px] font-bold rounded-2xl">
                  {errors.rates}
                </div>
              )}

              <div className="space-y-4">
                {formData.rooms.map((room) => {
                  return (
                    <div key={room.id} className="p-4 border border-slate-150 rounded-2xl bg-white shadow-sm flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 leading-none">{room.name}</h4>
                        <span className="text-[9px] text-slate-400 block mt-1">EP, CP, MAP, AP rates pricing configured.</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenRateConfigure(room.id)}
                        className="px-4 py-2 border border-slate-205 hover:bg-slate-50 text-slate-707 text-[10px] font-bold rounded-xl cursor-pointer"
                      >
                        Configure Rates
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 7: PROPERTY PREVIEW */}
          {currentStep === 7 && (
            <div className="space-y-6">
              {/* Alert box info */}
              <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-2xl flex items-center gap-2">
                <Info size={14} className="text-emerald-600" />
                <span>This is a preview representation of your property listing exactly as visitors will see it.</span>
              </div>

              {/* Renders property details preview */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">{formData.name} Preview</h2>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black rounded-lg text-[9px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1"
                    >
                      <Edit size={10} />
                      <span>Edit Info</span>
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">📍 {formData.city}, {formData.state}</span>
                </div>

                {/* Images Preview Section */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center">
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Property Images</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-2 py-0.5 text-slate-500 hover:text-slate-800 font-black text-[9px] uppercase tracking-wider bg-transparent border-none cursor-pointer flex items-center gap-1"
                    >
                      <Edit size={10} />
                      <span>Edit Gallery</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {formData.gallery.cover && (
                      <div className="h-52 rounded-xl overflow-hidden shadow-sm relative border border-slate-100 bg-white">
                        <img src={getImageUrl(formData.gallery.cover)} alt="Preview Cover" className="w-full h-full object-cover" />
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-rose-600 text-white text-[8px] font-black uppercase rounded tracking-wider">Cover Image</span>
                      </div>
                    )}
                    {Object.entries(formData.gallery).map(([category, list]) => {
                      if (category === 'cover' || !Array.isArray(list)) return null;
                      return list.map((url, idx) => (
                        <div key={`${category}-${idx}`} className="h-52 rounded-xl overflow-hidden shadow-sm relative border border-slate-100 bg-white">
                          <img src={getImageUrl(url)} alt={`Preview ${category}`} className="w-full h-full object-cover" />
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[8px] font-black uppercase rounded tracking-wider">{category}</span>
                        </div>
                      ));
                    })}
                    {formData.rooms.flatMap((room) => (room.images || []).map((url, idx) => (
                      <div key={`${room.id}-${idx}`} className="h-52 rounded-xl overflow-hidden shadow-sm relative border border-slate-100 bg-white">
                        <img src={getImageUrl(url)} alt={`Preview ${room.name}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase rounded tracking-wider">{room.name}</span>
                      </div>
                    )))}
                  </div>
                </div>

                {/* Description Preview Section */}
                <div className="space-y-1.5 border-t border-slate-50 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">About the Property</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-2 py-0.5 text-slate-500 hover:text-slate-800 font-black text-[9px] uppercase tracking-wider bg-transparent border-none cursor-pointer flex items-center gap-1"
                    >
                      <Edit size={10} />
                      <span>Edit Description</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-bold">{formData.description}</p>
                </div>

                {/* Amenities Preview Section */}
                <div className="space-y-2 border-t border-slate-50 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Amenities Included</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="px-2 py-0.5 text-slate-500 hover:text-slate-800 font-black text-[9px] uppercase tracking-wider bg-transparent border-none cursor-pointer flex items-center gap-1"
                    >
                      <Edit size={10} />
                      <span>Edit Amenities</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.amenities.map(a => (
                      <span key={a} className="px-2.5 py-1 bg-slate-100 text-slate-707 font-bold rounded-lg text-[9px] uppercase tracking-wider">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Rooms Preview Section */}
                <div className="space-y-3 border-t border-slate-50 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Room Configurations</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="px-2 py-0.5 text-slate-500 hover:text-slate-800 font-black text-[9px] uppercase tracking-wider bg-transparent border-none cursor-pointer flex items-center gap-1"
                    >
                      <Edit size={10} />
                      <span>Edit Rooms</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {formData.rooms.map(r => (
                      <div key={r.id} className="p-4 border border-slate-150 rounded-2xl bg-slate-50/20">
                        <span className="block text-xs font-black text-slate-800 leading-none">{r.name}</span>
                        <span className="block text-[9px] text-slate-400 mt-1">{r.count} Rooms | Occupancy: {r.occupancy} Guests</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: PUBLISH CHECKLIST */}
          {currentStep === 8 && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="space-y-1 pb-3 border-b border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Step 8 of 8</span>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Final Setup Checklist</h2>
                <p className="text-[10px] text-slate-400">Review all sections before publishing your property listing live to WOW Gateways.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3.5 border border-slate-150 rounded-2xl bg-white">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                  <span className="text-xs font-bold text-slate-707">Property Information Complete</span>
                </div>

                <div className="flex items-center gap-3 p-3.5 border border-slate-150 rounded-2xl bg-white">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                  <span className="text-xs font-bold text-slate-707">Gallery Folder Uploaded</span>
                </div>

                <div className="flex items-center gap-3 p-3.5 border border-slate-150 rounded-2xl bg-white">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                  <span className="text-xs font-bold text-slate-707">Selected Amenities Confirmed</span>
                </div>

                <div className="flex items-center gap-3 p-3.5 border border-slate-150 rounded-2xl bg-white">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                  <span className="text-xs font-bold text-slate-707">Room Categories Mapped</span>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 4. STICKY FOOTER NAVIGATION */}
      {!activeConfigureRoomId && !activeConfigureSeasonRoomId && !activeConfigureRateRoomId && (
        <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-slate-200 px-6 py-4.5 z-40 flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExit}
              className="px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer bg-white"
            >
              <span>Exit</span>
            </button>
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-707 font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer bg-white"
              >
                <ArrowLeft size={13} />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <button
                onClick={handleSaveDraft}
                className="px-5 py-3 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-2xl text-xs transition-colors cursor-pointer bg-white"
              >
                Save Draft
              </button>
            )}

            {currentStep < 8 ? (
              <button
                onClick={handleNext}
                className="px-5 py-3 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-900/10 uppercase tracking-wider"
              >
                <span>Continue</span>
                <ArrowRight size={13} />
              </button>
            ) : isReadOnly ? (
              <span className="px-5 py-3 bg-blue-50 text-blue-700 font-bold rounded-2xl text-xs flex items-center gap-1.5">
                🔒 Under Review — Locked
              </span>
            ) : (
              <button
                onClick={handlePublishProperty}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer border-none shadow-sm uppercase tracking-wider"
              >
                {isAdmin ? 'Save & Publish Property' : 'Publish Property'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Extra Room Add-on Purchase Modal */}
      {addonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <PlusCircle size={20} />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 m-0">Purchase Extra Room Add-ons</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Add room capacity beyond your plan limit.</p>
                </div>
              </div>
              <button
                onClick={() => setAddonModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            {(() => {
              const rate = ownerSubscription?.extraRoomPrice !== undefined ? Number(ownerSubscription.extraRoomPrice) : 500;
              const count = Math.max(1, Number(addonRoomsCount) || 1);
              const total = count * rate;

              return (
                <form onSubmit={handlePurchaseExtraRooms} className="space-y-4">
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900">
                    <span className="font-bold block">Centrally Defined Plan Pricing:</span>
                    <span className="text-[11px] text-blue-700 block mt-0.5">
                      Your subscription plan defines extra room add-ons at <strong>₹{rate.toLocaleString()} / room</strong>. Extra rooms are permanently linked to this homestay.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Number of Extra Rooms *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAddonRoomsCount(prev => Math.max(1, (Number(prev) || 1) - 1))}
                        className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-black text-slate-700 cursor-pointer text-base"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        required
                        value={addonRoomsCount}
                        onChange={(e) => setAddonRoomsCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="flex-1 px-3 py-2 text-center text-sm font-black text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setAddonRoomsCount(prev => (Number(prev) || 0) + 1)}
                        className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-black text-slate-700 cursor-pointer text-base"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Pricing Calculation Summary */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-150 space-y-2">
                    <div className="flex justify-between text-xs text-slate-600 font-medium">
                      <span>Formula:</span>
                      <span>{count} Room{count > 1 ? 's' : ''} × ₹{rate.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total Add-on Cost:</span>
                      <span className="text-xl font-black text-blue-600">
                        ₹{total.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setAddonModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addonPurchasing}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border-none shadow-sm shadow-blue-100 disabled:opacity-50"
                    >
                      {addonPurchasing ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <Check size={13} className="stroke-[3]" />
                      )}
                      <span>Pay ₹{total.toLocaleString()} & Confirm</span>
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
