import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  Settings as SettingsIcon, 
  Save, 
  Sliders, 
  CreditCard, 
  ShieldAlert, 
  Mail, 
  Database,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Send,
  MapPin,
  Plus,
  Trash2,
  Edit
} from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('SMTP');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // General settings state
  const [platformName, setPlatformName] = useState('WOW Gateways');
  const [supportEmail, setSupportEmail] = useState('ops@wowgateways.com');
  const [commissionRate, setCommissionRate] = useState(15);

  // Gateway toggles
  const [razorpayEnabled, setRazorpayEnabled] = useState(true);
  const [stripeEnabled, setStripeEnabled] = useState(false);

  // Security Toggles
  const [mfaRequired, setMfaRequired] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(30);

  // SMTP Settings State
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpEmail, setSmtpEmail] = useState('Chetanprajapat007@gmail.com');
  const [smtpPassword, setSmtpPassword] = useState('••••••••••••••••');
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpSenderName, setSmtpSenderName] = useState('Wow Gateways Support');
  const [smtpEnabled, setSmtpEnabled] = useState(true);
  
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpError, setSmtpError] = useState('');

  // Test Email State
  const [testRecipient, setTestRecipient] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState('');
  const [testError, setTestError] = useState('');

  // Locations Management State
  const [locations, setLocations] = useState([]);
  const [locLoading, setLocLoading] = useState(false);
  const [locSubTab, setLocSubTab] = useState('states'); // 'states' or 'cities'
  
  // State directory states
  const [stateSearch, setStateSearch] = useState('');
  const [statePage, setStatePage] = useState(1);
  const [newStateName, setNewStateName] = useState('');
  const [editingStateId, setEditingStateId] = useState(null);
  const [editingStateName, setEditingStateName] = useState('');

  // City directory states
  const [citySearch, setCitySearch] = useState('');
  const [cityPage, setCityPage] = useState(1);
  const [selectedStateIdForCity, setSelectedStateIdForCity] = useState('');
  const [newCityName, setNewCityName] = useState('');
  const [newCityStatus, setNewCityStatus] = useState('Active');
  const [editingCityStateId, setEditingCityStateId] = useState(null);
  const [editingCityId, setEditingCityId] = useState(null);
  const [editingCityName, setEditingCityName] = useState('');
  const [editingCityStatus, setEditingCityStatus] = useState('Active');

  const getApiUrl = (path) => {
    const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
    return `${base}${path}`;
  };

  const fetchLocations = async () => {
    setLocLoading(true);
    try {
      const res = await axios.get(getApiUrl('/api/admin/locations'));
      setLocations(res.data);
      if (res.data.length > 0 && !selectedStateIdForCity) {
        setSelectedStateIdForCity(res.data[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    } finally {
      setLocLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Locations') {
      fetchLocations();
    }
  }, [activeTab]);

  const handleAddState = async (e) => {
    e.preventDefault();
    if (!newStateName.trim()) return;
    try {
      const token = localStorage.getItem('superAdminToken');
      await axios.post(
        getApiUrl('/api/admin/locations'),
        { state: newStateName.trim(), cities: [] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewStateName('');
      fetchLocations();
      alert('State added successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to add state.');
    }
  };

  const handleSaveStateEdit = async (id) => {
    if (!editingStateName.trim()) return;
    const loc = locations.find(l => l._id === id);
    if (!loc) return;
    try {
      const token = localStorage.getItem('superAdminToken');
      await axios.put(
        getApiUrl(`/api/admin/locations/${id}`),
        { state: editingStateName.trim(), cities: loc.cities },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingStateId(null);
      setEditingStateName('');
      fetchLocations();
      alert('State updated successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update state.');
    }
  };

  const handleDeleteState = async (id, force = false) => {
    Swal.fire({
      title: 'Delete State?',
      text: 'Are you sure you want to permanently delete this state and all its cities? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = localStorage.getItem('superAdminToken');
          await axios.delete(getApiUrl(`/api/admin/locations/${id}${force ? '?force=true' : ''}`), {
            headers: { Authorization: `Bearer ${token}` }
          });
          fetchLocations();
          Swal.fire({
            title: 'Deleted!',
            text: 'State and its cities deleted successfully.',
            icon: 'success',
            confirmButtonColor: '#2563eb'
          });
        } catch (err) {
          console.error(err);
          if (err.response?.status === 409 && err.response?.data?.hasAssociatedData) {
            const detailsList = err.response.data.details.map(d => `<li>• ${d}</li>`).join('');
            Swal.fire({
              title: 'Associated Data Warning',
              html: `
                <div class="text-left text-xs text-slate-600">
                  <p class="font-bold text-rose-600">${err.response.data.message}</p>
                  <p class="font-semibold text-slate-700 mt-2">Linked Associated Records:</p>
                  <ul class="max-h-32 overflow-y-auto bg-slate-50 p-2 rounded border border-slate-200 mt-1 select-none space-y-1">
                    ${detailsList}
                  </ul>
                  <p class="text-[11px] text-slate-400 mt-3">Are you sure you want to force hard-delete this state? Any linked owner or homestay records will remain without a valid state address.</p>
                </div>
              `,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#dc2626',
              cancelButtonColor: '#94a3b8',
              confirmButtonText: 'Force Hard-Delete',
              cancelButtonText: 'Cancel'
            }).then(async (res) => {
              if (res.isConfirmed) {
                try {
                  const token = localStorage.getItem('superAdminToken');
                  await axios.delete(getApiUrl(`/api/admin/locations/${id}?force=true`), {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  fetchLocations();
                  Swal.fire({
                    title: 'Deleted!',
                    text: 'State force-deleted successfully.',
                    icon: 'success',
                    confirmButtonColor: '#2563eb'
                  });
                } catch (e) {
                  Swal.fire('Error', e.response?.data?.message || 'Failed to force delete state', 'error');
                }
              }
            });
          } else {
            Swal.fire({
              title: 'Error',
              text: err.response?.data?.message || 'Failed to delete state.',
              icon: 'error',
              confirmButtonColor: '#dc2626'
            });
          }
        }
      }
    });
  };

  const handleAddCity = async (e) => {
    e.preventDefault();
    if (!selectedStateIdForCity || !newCityName.trim()) return;
    const loc = locations.find(l => l._id === selectedStateIdForCity);
    if (!loc) return;
    const getCityName = (c) => typeof c === 'string' ? c : c.name;
    const exists = loc.cities.find(c => getCityName(c).toLowerCase() === newCityName.trim().toLowerCase());
    if (exists) {
      alert('City already exists in this state.');
      return;
    }
    const updatedCities = [
      ...loc.cities.map(c => typeof c === 'string' ? { name: c, status: 'Active' } : c),
      { name: newCityName.trim(), status: newCityStatus }
    ];
    try {
      const token = localStorage.getItem('superAdminToken');
      await axios.put(
        getApiUrl(`/api/admin/locations/${selectedStateIdForCity}`),
        { cities: updatedCities },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewCityName('');
      fetchLocations();
      alert('City added successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to add city.');
    }
  };

  const handleSaveCityEdit = async (stateId, cityId) => {
    if (!editingCityName.trim()) return;
    const loc = locations.find(l => l._id === stateId);
    if (!loc) return;
    const updatedCities = loc.cities.map(c => {
      const cName = typeof c === 'string' ? c : c.name;
      const cId = typeof c === 'string' ? c : (c._id || c.name);
      if (cId === cityId) {
        return { name: editingCityName.trim(), status: editingCityStatus };
      }
      return typeof c === 'string' ? { name: c, status: 'Active' } : c;
    });
    try {
      const token = localStorage.getItem('superAdminToken');
      await axios.put(
        getApiUrl(`/api/admin/locations/${stateId}`),
        { cities: updatedCities },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingCityStateId(null);
      setEditingCityId(null);
      setEditingCityName('');
      fetchLocations();
      alert('City updated successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update city.');
    }
  };

  const handleToggleCityStatus = async (stateId, cityId, currentStatus) => {
    const loc = locations.find(l => l._id === stateId);
    if (!loc) return;
    const updatedCities = loc.cities.map(c => {
      const cId = typeof c === 'string' ? c : (c._id || c.name);
      if (cId === cityId) {
        return { name: typeof c === 'string' ? c : c.name, status: currentStatus === 'Active' ? 'Inactive' : 'Active' };
      }
      return typeof c === 'string' ? { name: c, status: 'Active' } : c;
    });
    try {
      const token = localStorage.getItem('superAdminToken');
      await axios.put(
        getApiUrl(`/api/admin/locations/${stateId}`),
        { cities: updatedCities },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchLocations();
    } catch (err) {
      console.error(err);
      alert('Failed to toggle city status.');
    }
  };

  const handleDeleteCity = async (stateId, cityId) => {
    const loc = locations.find(l => l._id === stateId);
    if (!loc) return;
    const cityObj = loc.cities.find(c => {
      const cId = typeof c === 'string' ? c : (c._id || c.name);
      return cId === cityId;
    });
    if (!cityObj) return;
    const cityName = typeof cityObj === 'string' ? cityObj : cityObj.name;

    Swal.fire({
      title: 'Delete City?',
      text: `Are you sure you want to permanently delete the city "${cityName}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = localStorage.getItem('superAdminToken');
          
          // Check dependencies
          const checkRes = await axios.get(getApiUrl(`/api/admin/locations/check-city?city=${encodeURIComponent(cityName)}`), {
            headers: { Authorization: `Bearer ${token}` }
          });

          const performDeletion = async () => {
            const updatedCities = loc.cities.filter(c => {
              const cId = typeof c === 'string' ? c : (c._id || c.name);
              return cId !== cityId;
            }).map(c => typeof c === 'string' ? { name: c, status: 'Active' } : c);

            await axios.put(
              getApiUrl(`/api/admin/locations/${stateId}`),
              { cities: updatedCities },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchLocations();
            Swal.fire({
              title: 'Deleted!',
              text: 'City deleted successfully.',
              icon: 'success',
              confirmButtonColor: '#2563eb'
            });
          };

          if (checkRes.data?.count > 0) {
            const detailsList = checkRes.data.details.map(d => `<li>• ${d}</li>`).join('');
            Swal.fire({
              title: 'Associated Data Warning',
              html: `
                <div class="text-left text-xs text-slate-600">
                  <p class="font-bold text-rose-600">${checkRes.data.message}</p>
                  <p class="font-semibold text-slate-700 mt-2">Linked Associated Records:</p>
                  <ul class="max-h-32 overflow-y-auto bg-slate-50 p-2 rounded border border-slate-200 mt-1 select-none space-y-1">
                    ${detailsList}
                  </ul>
                  <p class="text-[11px] text-slate-400 mt-3">Are you sure you want to force hard-delete this city? Any linked owner or homestay records will remain without a valid city address.</p>
                </div>
              `,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#dc2626',
              cancelButtonColor: '#94a3b8',
              confirmButtonText: 'Force Delete City',
              cancelButtonText: 'Cancel'
            }).then((res) => {
              if (res.isConfirmed) {
                performDeletion();
              }
            });
          } else {
            await performDeletion();
          }
        } catch (err) {
          console.error(err);
          Swal.fire('Error', err.response?.data?.message || 'Failed to delete city.', 'error');
        }
      }
    });
  };

  // Fetch current SMTP Settings
  const fetchSmtpSettings = async () => {
    setSmtpLoading(true);
    setSmtpError('');
    try {
      const res = await axios.get(getApiUrl('/api/admin/settings/smtp'));
      setSmtpHost(res.data.host);
      setSmtpPort(res.data.port);
      setSmtpEmail(res.data.email);
      setSmtpPassword(res.data.appPassword);
      setSmtpSecure(res.data.secure);
      setSmtpSenderName(res.data.senderName || 'Wow Gateways Support');
      setSmtpEnabled(res.data.enabled !== false);
    } catch (err) {
      console.error('Failed to load SMTP settings:', err);
      setSmtpError(err.response?.data?.message || 'Could not fetch active SMTP configurations from server.');
    } finally {
      setSmtpLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'SMTP') {
      fetchSmtpSettings();
    }
  }, [activeTab]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveSuccess(false);
    setSmtpError('');

    if (activeTab === 'SMTP') {
      setSmtpLoading(true);
      try {
        await axios.put(getApiUrl('/api/admin/settings/smtp'), {
          host: smtpHost,
          port: smtpPort,
          email: smtpEmail,
          appPassword: smtpPassword,
          secure: smtpSecure,
          senderName: smtpSenderName,
          enabled: smtpEnabled
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } catch (err) {
        console.error('Failed to update SMTP configurations:', err);
        setSmtpError(err.response?.data?.error || err.message || 'Failed to save SMTP configurations.');
      } finally {
        setSmtpLoading(false);
      }
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    setTestSuccess('');
    setTestError('');

    if (!testRecipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testRecipient.trim())) {
      setTestError('Please enter a valid recipient email address.');
      return;
    }

    setTestLoading(true);
    try {
      const res = await axios.post(getApiUrl('/api/admin/settings/smtp/test-email'), {
        recipientEmail: testRecipient
      });
      setTestSuccess(res.data.message || 'Test email dispatched successfully!');
      setTestRecipient('');
    } catch (err) {
      console.error('Failed to send test email:', err);
      setTestError(err.response?.data?.message || err.response?.data?.error || 'Failed to connect/send test email.');
    } finally {
      setTestLoading(false);
    }
  };

  // Derived state/city lists
  const filteredStates = locations.filter(loc => 
    loc.state.toLowerCase().includes(stateSearch.toLowerCase())
  );
  const statePageSize = 5;
  const totalStatePages = Math.ceil(filteredStates.length / statePageSize) || 1;
  const paginatedStates = filteredStates.slice((statePage - 1) * statePageSize, statePage * statePageSize);

  // Flat map cities with state references
  const allCitiesList = locations.flatMap(loc => 
    loc.cities.map(c => ({
      stateId: loc._id,
      stateName: loc.state,
      cityId: typeof c === 'string' ? c : (c._id || c.name || c),
      cityName: typeof c === 'string' ? c : c.name,
      cityStatus: typeof c === 'string' ? 'Active' : (c.status || 'Active')
    }))
  );
  
  const filteredCities = allCitiesList.filter(city => 
    city.cityName.toLowerCase().includes(citySearch.toLowerCase()) ||
    city.stateName.toLowerCase().includes(citySearch.toLowerCase())
  );
  const cityPageSize = 10;
  const totalCityPages = Math.ceil(filteredCities.length / cityPageSize) || 1;
  const paginatedCities = filteredCities.slice((cityPage - 1) * cityPageSize, cityPage * cityPageSize);

  return (
    <div className="space-y-6 sm:space-y-8 select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <SettingsIcon size={22} />
            </span>
            System Settings
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Configure platform policies, set transaction rates, manage API key integrations, and toggle security controls.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Settings Tab Sidebar */}
        <div className="w-full lg:w-64 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm space-y-1">
          {[
            { id: 'SMTP', label: 'SMTP Config', icon: Mail },
            { id: 'Locations', label: 'State & City Settings', icon: MapPin }
          ].map(tab => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                  isTabActive
                    ? 'bg-blue-50 text-blue-600 border border-blue-100/30'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon size={14} className={isTabActive ? 'text-blue-600' : 'text-slate-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Box */}
        <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            


            {activeTab === 'SMTP' && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2">SMTP Mail Server Config</h3>
                
                {smtpError && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-700 font-semibold leading-relaxed">
                    {smtpError}
                  </div>
                )}

                {smtpLoading ? (
                  <div className="text-slate-400 text-xs font-semibold py-4 flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    Loading current SMTP configurations...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 block">Enable SMTP Mail Service</span>
                        <span className="text-[10px] text-slate-400">Toggle whether the platform triggers system emails via SMTP.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSmtpEnabled(!smtpEnabled)}
                        className="text-slate-400 hover:text-slate-650 focus:outline-none cursor-pointer"
                      >
                        {smtpEnabled ? (
                          <ToggleRight size={36} className="text-blue-500" />
                        ) : (
                          <ToggleLeft size={36} className="text-slate-350" />
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Outgoing SMTP Server Host</label>
                        <input
                          type="text"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                          required
                          placeholder="e.g. smtp.gmail.com"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">SMTP Port</label>
                        <input
                          type="number"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                          required
                          placeholder="e.g. 465 or 587"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">SMTP Authentication Email Address</label>
                        <input
                          type="email"
                          value={smtpEmail}
                          onChange={(e) => setSmtpEmail(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                          required
                          placeholder="e.g. ops@wowgateways.com"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">SMTP App Password / Secret Key</label>
                        <input
                          type="password"
                          value={smtpPassword}
                          onChange={(e) => setSmtpPassword(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                          required
                          placeholder="••••••••••••••••"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Sender Display Name</label>
                        <input
                          type="text"
                          value={smtpSenderName}
                          onChange={(e) => setSmtpSenderName(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                          required
                          placeholder="e.g. Wow Gateways Operations Center"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-800 block">Enforce Secure Connection (SSL/TLS)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSmtpSecure(!smtpSecure)}
                            className="text-slate-400 hover:text-slate-650 focus:outline-none cursor-pointer"
                          >
                            {smtpSecure ? (
                              <ToggleRight size={32} className="text-blue-500" />
                            ) : (
                              <ToggleLeft size={32} className="text-slate-350" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Locations' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">State & City Settings</h3>
                    <p className="text-[11px] text-slate-400">Configure regions and towns active on the system.</p>
                  </div>
                  {/* Sub-tabs switch */}
                  <div className="flex bg-slate-50 border border-slate-200/60 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => { setLocSubTab('states'); setStatePage(1); }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                        locSubTab === 'states'
                          ? 'bg-white text-slate-800 shadow-sm font-extrabold'
                          : 'text-slate-500 hover:text-slate-700 bg-transparent'
                      }`}
                    >
                      States Directory
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLocSubTab('cities'); setCityPage(1); }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                        locSubTab === 'cities'
                          ? 'bg-white text-slate-800 shadow-sm font-extrabold'
                          : 'text-slate-500 hover:text-slate-700 bg-transparent'
                      }`}
                    >
                      Cities Directory
                    </button>
                  </div>
                </div>

                {/* sub tab: states */}
                {locSubTab === 'states' && (
                  <div className="space-y-6">
                    {/* Add State Form */}
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 space-y-4">
                      <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider block">Add New State</span>
                      <div className="flex flex-col sm:flex-row gap-3 items-end">
                        <div className="flex-1 flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">State Name</label>
                          <input
                            type="text"
                            value={newStateName}
                            onChange={(e) => setNewStateName(e.target.value)}
                            placeholder="e.g. Goa"
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none text-xs font-semibold text-slate-750"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddState}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 h-[38px] cursor-pointer border-none"
                        >
                          <Plus size={13} />
                          <span>Add State</span>
                        </button>
                      </div>
                    </div>

                    {/* States List Table with Search & Pagination */}
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                        <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block">States List</span>
                        {/* Search states */}
                        <div className="relative w-full sm:w-64">
                          <input
                            type="text"
                            value={stateSearch}
                            onChange={(e) => { setStateSearch(e.target.value); setStatePage(1); }}
                            placeholder="Search states..."
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg focus:outline-none text-xs font-semibold text-slate-750"
                          />
                        </div>
                      </div>

                      {locLoading ? (
                        <div className="text-center py-6 text-xs text-slate-400 font-bold">Loading state list...</div>
                      ) : paginatedStates.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400 font-bold">No states found.</div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="py-2.5 px-4">State Name</th>
                                <th className="py-2.5 px-4 text-center">Total Cities Registered</th>
                                <th className="py-2.5 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-707">
                              {paginatedStates.map((loc) => (
                                <tr key={loc._id} className="hover:bg-slate-50/20 transition-colors">
                                  <td className="py-3 px-4">
                                    {editingStateId === loc._id ? (
                                      <input
                                        type="text"
                                        value={editingStateName}
                                        onChange={(e) => setEditingStateName(e.target.value)}
                                        className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold w-full max-w-sm focus:outline-none focus:border-blue-500"
                                      />
                                    ) : (
                                      <span className="font-bold text-slate-800">{loc.state}</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center text-slate-550 font-bold">
                                    {loc.cities?.length || 0} cities
                                  </td>
                                  <td className="py-3 px-4 text-right flex justify-end gap-2">
                                    {editingStateId === loc._id ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveStateEdit(loc._id)}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer border-none"
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingStateId(null)}
                                          className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded text-[10px] font-bold cursor-pointer border-none"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingStateId(loc._id);
                                            setEditingStateName(loc.state);
                                          }}
                                          className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-500 hover:text-slate-700 cursor-pointer animate-none"
                                        >
                                          <Edit size={12} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteState(loc._id)}
                                          className="p-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded text-slate-500 hover:text-rose-600 cursor-pointer animate-none"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Pagination controls for states */}
                          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50/50">
                            <span className="text-[10px] text-slate-400 font-bold">
                              Showing {((statePage - 1) * statePageSize) + 1} - {Math.min(statePage * statePageSize, filteredStates.length)} of {filteredStates.length} states
                            </span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                disabled={statePage === 1}
                                onClick={() => setStatePage(prev => Math.max(1, prev - 1))}
                                className="px-2.5 py-1 bg-white border border-slate-250 disabled:opacity-50 text-[10px] font-bold rounded cursor-pointer select-none"
                              >
                                Prev
                              </button>
                              <button
                                type="button"
                                disabled={statePage === totalStatePages}
                                onClick={() => setStatePage(prev => Math.min(totalStatePages, prev + 1))}
                                className="px-2.5 py-1 bg-white border border-slate-250 disabled:opacity-50 text-[10px] font-bold rounded cursor-pointer select-none"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* sub tab: cities */}
                {locSubTab === 'cities' && (
                  <div className="space-y-6">
                    {/* Add City Form */}
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 space-y-4">
                      <span className="text-[10px] font-black uppercase text-indigo-650 tracking-wider block">Add New City</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Select State</label>
                          <select
                            value={selectedStateIdForCity}
                            onChange={(e) => setSelectedStateIdForCity(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none text-xs font-semibold text-slate-750"
                          >
                            <option value="">-- Choose State --</option>
                            {locations.map(loc => (
                              <option key={loc._id} value={loc._id}>{loc.state}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">City Name</label>
                          <input
                            type="text"
                            value={newCityName}
                            onChange={(e) => setNewCityName(e.target.value)}
                            placeholder="e.g. Panaji"
                            className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none text-xs font-semibold text-slate-750"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Initial Status</label>
                          <select
                            value={newCityStatus}
                            onChange={(e) => setNewCityStatus(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none text-xs font-semibold text-slate-750"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCity}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer border-none"
                      >
                        <Plus size={13} />
                        <span>Add City</span>
                      </button>
                    </div>

                    {/* Cities List Table with Search, Active/Inactive Switch & Pagination */}
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                        <span className="text-[10px] font-black uppercase text-slate-455 tracking-wider block">Cities List</span>
                        {/* Search cities */}
                        <div className="relative w-full sm:w-64">
                          <input
                            type="text"
                            value={citySearch}
                            onChange={(e) => { setCitySearch(e.target.value); setCityPage(1); }}
                            placeholder="Search city or state..."
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg focus:outline-none text-xs font-semibold text-slate-750"
                          />
                        </div>
                      </div>

                      {locLoading ? (
                        <div className="text-center py-6 text-xs text-slate-400 font-bold">Loading cities list...</div>
                      ) : paginatedCities.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400 font-bold">No cities found.</div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="py-2.5 px-4">City Name</th>
                                <th className="py-2.5 px-4">State</th>
                                <th className="py-2.5 px-4 text-center">Status</th>
                                <th className="py-2.5 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-707">
                              {paginatedCities.map((city) => {
                                const isEditingThisCity = editingCityStateId === city.stateId && editingCityId === city.cityId;
                                return (
                                  <tr key={`${city.stateId}-${city.cityId}`} className="hover:bg-slate-50/20 transition-colors">
                                    <td className="py-3 px-4">
                                      {isEditingThisCity ? (
                                        <input
                                          type="text"
                                          value={editingCityName}
                                          onChange={(e) => setEditingCityName(e.target.value)}
                                          className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold w-full focus:outline-none focus:border-blue-500"
                                        />
                                      ) : (
                                        <span className="font-bold text-slate-800">{city.cityName}</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-slate-500 font-semibold">
                                      {city.stateName}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      {isEditingThisCity ? (
                                        <select
                                          value={editingCityStatus}
                                          onChange={(e) => setEditingCityStatus(e.target.value)}
                                          className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold"
                                        >
                                          <option value="Active">Active</option>
                                          <option value="Inactive">Inactive</option>
                                        </select>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleToggleCityStatus(city.stateId, city.cityId, city.cityStatus)}
                                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-wider uppercase cursor-pointer border-none shadow-sm transition-all ${
                                            city.cityStatus === 'Active'
                                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                          }`}
                                        >
                                          <span className={`w-1.5 h-1.5 rounded-full ${city.cityStatus === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                          {city.cityStatus}
                                        </button>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-right flex justify-end gap-2">
                                      {isEditingThisCity ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handleSaveCityEdit(city.stateId, city.cityId)}
                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer border-none"
                                          >
                                            Save
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingCityStateId(null);
                                              setEditingCityId(null);
                                            }}
                                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded text-[10px] font-bold cursor-pointer border-none"
                                          >
                                            Cancel
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingCityStateId(city.stateId);
                                              setEditingCityId(city.cityId);
                                              setEditingCityName(city.cityName);
                                              setEditingCityStatus(city.cityStatus);
                                            }}
                                            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-500 hover:text-slate-700 cursor-pointer animate-none"
                                          >
                                            <Edit size={12} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteCity(city.stateId, city.cityId)}
                                            className="p-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded text-slate-500 hover:text-rose-600 cursor-pointer animate-none"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>

                          {/* Pagination controls for cities */}
                          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50/50">
                            <span className="text-[10px] text-slate-400 font-bold">
                              Showing {((cityPage - 1) * cityPageSize) + 1} - {Math.min(cityPage * cityPageSize, filteredCities.length)} of {filteredCities.length} cities
                            </span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                disabled={cityPage === 1}
                                onClick={() => setCityPage(prev => Math.max(1, prev - 1))}
                                className="px-2.5 py-1 bg-white border border-slate-250 disabled:opacity-50 text-[10px] font-bold rounded cursor-pointer select-none"
                              >
                                Prev
                              </button>
                              <button
                                type="button"
                                disabled={cityPage === totalCityPages}
                                onClick={() => setCityPage(prev => Math.min(totalCityPages, prev + 1))}
                                className="px-2.5 py-1 bg-white border border-slate-250 disabled:opacity-50 text-[10px] font-bold rounded cursor-pointer select-none"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}



            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-6">
              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold animate-fade-in">
                    <CheckCircle size={14} /> Settings saved successfully!
                  </span>
                )}
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Save size={13} />
                Save Settings
              </button>
            </div>

          </form>

          {/* Separate Send Test Email Panel (Issue 5 Requirement) */}
          {activeTab === 'SMTP' && !smtpLoading && (
            <div className="border-t border-slate-100 pt-6 mt-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pl-1">Send Test Email</h3>
              <p className="text-[11px] text-slate-400 leading-normal pl-1">
                Dispatch a verification test email to verify that your outgoing SMTP mail server configuration is fully functional.
              </p>

              {testSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700 font-semibold">
                  {testSuccess}
                </div>
              )}

              {testError && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-700 font-semibold">
                  {testError}
                </div>
              )}

              <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Recipient Email Address</label>
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="e.g. test@example.com"
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={testLoading}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-2 cursor-pointer h-[38px] min-w-[140px] justify-center"
                >
                  {testLoading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      Send Test Email
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
