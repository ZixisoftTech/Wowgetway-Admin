import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  Plus, 
  Trash2, 
  Building, 
  MapPin, 
  CreditCard, 
  FileText, 
  User, 
  ShieldCheck,
  Check
} from 'lucide-react';

export default function AddEditHomestayOwner({ ownerDetails, onBack, onSave, isSubmitting }) {
  const isEdit = !!ownerDetails;

  const initialFormState = {
    firstName: '',
    lastName: '',
    fatherName: '',
    email: '',
    mobile: '',
    whatsApp: '',
    password: '',
    aadharNo: '',
    panNo: '',
    voterId: '',
    tradeLicense: '',
    aadharFront: '',
    aadharBack: '',
    panFront: '',
    profilePhoto: '',
    tradeLicenseDoc: '',
    tempAddress: { line1: '', line2: '', landmark: '', city: '', state: '', pinCode: '' },
    permAddress: { line1: '', line2: '', landmark: '', city: '', state: '', pinCode: '' },
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    status: 'Pending Verification',
    aadharVerified: false,
    panVerified: false,
    bankVerified: false,
    properties: []
  };

  const [formData, setFormData] = useState(initialFormState);
  const [sameAsTemp, setSameAsTemp] = useState(false);

  useEffect(() => {
    if (ownerDetails) {
      setFormData({
        firstName: ownerDetails.firstName || '',
        lastName: ownerDetails.lastName || '',
        fatherName: ownerDetails.fatherName || '',
        email: ownerDetails.email || '',
        mobile: ownerDetails.mobile || '',
        whatsApp: ownerDetails.whatsApp || '',
        password: ownerDetails.password || '',
        aadharNo: ownerDetails.aadharNo || '',
        panNo: ownerDetails.panNo || '',
        voterId: ownerDetails.voterId || '',
        tradeLicense: ownerDetails.tradeLicense || '',
        aadharFront: ownerDetails.aadharFront || '',
        aadharBack: ownerDetails.aadharBack || '',
        panFront: ownerDetails.panFront || '',
        profilePhoto: ownerDetails.profilePhoto || '',
        tradeLicenseDoc: ownerDetails.tradeLicenseDoc || '',
        tempAddress: ownerDetails.tempAddress || { line1: '', line2: '', landmark: '', city: '', state: '', pinCode: '' },
        permAddress: ownerDetails.permAddress || { line1: '', line2: '', landmark: '', city: '', state: '', pinCode: '' },
        bankName: ownerDetails.bankName || '',
        accountNumber: ownerDetails.accountNumber || '',
        ifscCode: ownerDetails.ifscCode || '',
        upiId: ownerDetails.upiId || '',
        status: ownerDetails.status || 'Pending Verification',
        aadharVerified: ownerDetails.aadharVerified || false,
        panVerified: ownerDetails.panVerified || false,
        bankVerified: ownerDetails.bankVerified || false,
        properties: ownerDetails.properties || []
      });
    }
  }, [ownerDetails]);

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData(prev => {
        const updatedSection = {
          ...prev[section],
          [field]: value
        };
        const updated = {
          ...prev,
          [section]: updatedSection
        };
        // Auto-sync permanent address if "Same as temp" is checked
        if (section === 'tempAddress' && sameAsTemp) {
          updated.permAddress = { ...updatedSection };
        }
        return updated;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSameAddressToggle = (e) => {
    const isChecked = e.target.checked;
    setSameAsTemp(isChecked);
    if (isChecked) {
      setFormData(prev => ({
        ...prev,
        permAddress: { ...prev.tempAddress }
      }));
    }
  };

  // Property Linking dynamic list actions
  const handleAddProperty = () => {
    setFormData(prev => ({
      ...prev,
      properties: [
        ...prev.properties,
        { propertyName: '', location: '', status: 'Active', bookings: 0 }
      ]
    }));
  };

  const handlePropertyChange = (index, field, value) => {
    setFormData(prev => {
      const updatedProps = [...prev.properties];
      updatedProps[index] = {
        ...updatedProps[index],
        [field]: field === 'bookings' ? Number(value) || 0 : value
      };
      return {
        ...prev,
        properties: updatedProps
      };
    });
  };

  const handleRemoveProperty = (index) => {
    setFormData(prev => ({
      ...prev,
      properties: prev.properties.filter((_, i) => i !== index)
    }));
  };

  // Mock document upload helper
  const handleMockUpload = (field, fileName) => {
    setFormData(prev => ({
      ...prev,
      [field]: fileName
    }));
    alert(`Mock file "${fileName}" attached successfully.`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header Back & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl bg-white border border-slate-200 transition-colors shadow-sm cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
            {isEdit ? 'Edit Homestay Owner Profile' : 'Add New Homestay Owner'}
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Register personal profiles, bank accounts, KYC verifications, and property credentials.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-24">
        {/* Main Form Fields Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          
          {/* Card 1: Personal Details */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
              <User size={13} className="text-indigo-500" />
              <span>Personal Information</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => handleInputChange(null, 'firstName', e.target.value)}
                  placeholder="Enter first name"
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => handleInputChange(null, 'lastName', e.target.value)}
                  placeholder="Enter last name"
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Father's Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fatherName}
                  onChange={(e) => handleInputChange(null, 'fatherName', e.target.value)}
                  placeholder="Enter father name"
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange(null, 'email', e.target.value)}
                  placeholder="name@email.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={(e) => handleInputChange(null, 'mobile', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">WhatsApp Number</label>
                <input
                  type="tel"
                  value={formData.whatsApp}
                  onChange={(e) => handleInputChange(null, 'whatsApp', e.target.value)}
                  placeholder="WhatsApp link number"
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Access Password *</label>
                <input
                  type="password"
                  required={!isEdit}
                  value={formData.password}
                  onChange={(e) => handleInputChange(null, 'password', e.target.value)}
                  placeholder="Set login password"
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Acount Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange(null, 'status', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Profile Photo Link URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.profilePhoto}
                  onChange={(e) => handleInputChange(null, 'profilePhoto', e.target.value)}
                  placeholder="https://images.unsplash.com/photo-... or custom photo url"
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleMockUpload('profilePhoto', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-150 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Upload size={12} />
                  <span>Mock</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Bank details */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
              <CreditCard size={13} className="text-indigo-500" />
              <span>Bank Account Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleInputChange(null, 'bankName', e.target.value)}
                  placeholder="State Bank of India"
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Account Number</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => handleInputChange(null, 'accountNumber', e.target.value)}
                  placeholder="Enter Account No."
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">IFSC Code</label>
                <input
                  type="text"
                  value={formData.ifscCode}
                  onChange={(e) => handleInputChange(null, 'ifscCode', e.target.value)}
                  placeholder="SBIN0000123"
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">UPI ID</label>
                <input
                  type="text"
                  value={formData.upiId}
                  onChange={(e) => handleInputChange(null, 'upiId', e.target.value)}
                  placeholder="ownername@okaxis"
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-150 space-y-3.5 mt-3">
              <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block">Verification & Checks</span>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 border border-slate-200 rounded-lg select-none hover:border-blue-300">
                  <input
                    type="checkbox"
                    checked={formData.aadharVerified}
                    onChange={(e) => handleInputChange(null, 'aadharVerified', e.target.checked)}
                    className="w-3.5 h-3.5 accent-blue-600 rounded"
                  />
                  <span className="text-[10px] font-bold text-slate-600">Aadhaar Ok</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 border border-slate-200 rounded-lg select-none hover:border-blue-300">
                  <input
                    type="checkbox"
                    checked={formData.panVerified}
                    onChange={(e) => handleInputChange(null, 'panVerified', e.target.checked)}
                    className="w-3.5 h-3.5 accent-blue-600 rounded"
                  />
                  <span className="text-[10px] font-bold text-slate-600">PAN Ok</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 border border-slate-200 rounded-lg select-none hover:border-blue-300">
                  <input
                    type="checkbox"
                    checked={formData.bankVerified}
                    onChange={(e) => handleInputChange(null, 'bankVerified', e.target.checked)}
                    className="w-3.5 h-3.5 accent-blue-600 rounded"
                  />
                  <span className="text-[10px] font-bold text-slate-600">Bank Ok</span>
                </label>
              </div>
            </div>
          </div>

          {/* Card 3: Address Coordinates */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-5 lg:col-span-2">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
              <MapPin size={13} className="text-indigo-500" />
              <span>Address Coordinates</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* Temporary Address Group */}
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block">Temporary / Correspondence Address</span>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Address Line 1 *</label>
                  <input
                    type="text"
                    required
                    value={formData.tempAddress.line1}
                    onChange={(e) => handleInputChange('tempAddress', 'line1', e.target.value)}
                    placeholder="House/Plot No, Apartment Name"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Address Line 2</label>
                  <input
                    type="text"
                    value={formData.tempAddress.line2}
                    onChange={(e) => handleInputChange('tempAddress', 'line2', e.target.value)}
                    placeholder="Street Name, Area"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Landmark</label>
                    <input
                      type="text"
                      value={formData.tempAddress.landmark}
                      onChange={(e) => handleInputChange('tempAddress', 'landmark', e.target.value)}
                      placeholder="e.g. Near Park"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">City / Town *</label>
                    <input
                      type="text"
                      required
                      value={formData.tempAddress.city}
                      onChange={(e) => handleInputChange('tempAddress', 'city', e.target.value)}
                      placeholder="City name"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">State *</label>
                    <input
                      type="text"
                      required
                      value={formData.tempAddress.state}
                      onChange={(e) => handleInputChange('tempAddress', 'state', e.target.value)}
                      placeholder="State"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pincode / ZIP *</label>
                    <input
                      type="text"
                      required
                      value={formData.tempAddress.pinCode}
                      onChange={(e) => handleInputChange('tempAddress', 'pinCode', e.target.value)}
                      placeholder="6-digit PIN"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Permanent Address Group */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block">Permanent Address</span>
                  <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50/50 px-2.5 py-1.5 border border-slate-200 rounded-lg select-none hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={sameAsTemp}
                      onChange={handleSameAddressToggle}
                      className="w-3 h-3 accent-blue-600 rounded"
                    />
                    <span className="text-[9px] font-bold text-slate-500">Same as temporary</span>
                  </label>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Address Line 1 *</label>
                  <input
                    type="text"
                    required
                    disabled={sameAsTemp}
                    value={sameAsTemp ? formData.tempAddress.line1 : formData.permAddress.line1}
                    onChange={(e) => handleInputChange('permAddress', 'line1', e.target.value)}
                    placeholder="House/Plot No, Apartment Name"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none disabled:opacity-65"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Address Line 2</label>
                  <input
                    type="text"
                    disabled={sameAsTemp}
                    value={sameAsTemp ? formData.tempAddress.line2 : formData.permAddress.line2}
                    onChange={(e) => handleInputChange('permAddress', 'line2', e.target.value)}
                    placeholder="Street Name, Area"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none disabled:opacity-65"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Landmark</label>
                    <input
                      type="text"
                      disabled={sameAsTemp}
                      value={sameAsTemp ? formData.tempAddress.landmark : formData.permAddress.landmark}
                      onChange={(e) => handleInputChange('permAddress', 'landmark', e.target.value)}
                      placeholder="e.g. Near Park"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none disabled:opacity-65"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">City / Town *</label>
                    <input
                      type="text"
                      required
                      disabled={sameAsTemp}
                      value={sameAsTemp ? formData.tempAddress.city : formData.permAddress.city}
                      onChange={(e) => handleInputChange('permAddress', 'city', e.target.value)}
                      placeholder="City name"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none disabled:opacity-65"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">State *</label>
                    <input
                      type="text"
                      required
                      disabled={sameAsTemp}
                      value={sameAsTemp ? formData.tempAddress.state : formData.permAddress.state}
                      onChange={(e) => handleInputChange('permAddress', 'state', e.target.value)}
                      placeholder="State"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none disabled:opacity-65"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pincode / ZIP *</label>
                    <input
                      type="text"
                      required
                      disabled={sameAsTemp}
                      value={sameAsTemp ? formData.tempAddress.pinCode : formData.permAddress.pinCode}
                      onChange={(e) => handleInputChange('permAddress', 'pinCode', e.target.value)}
                      placeholder="6-digit PIN"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none disabled:opacity-65"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: KYC Documents */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
              <FileText size={13} className="text-indigo-500" />
              <span>KYC Documents Coordinates</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Aadhaar Card No</label>
                <input
                  type="text"
                  value={formData.aadharNo}
                  onChange={(e) => handleInputChange(null, 'aadharNo', e.target.value)}
                  placeholder="12-digit Aadhaar No"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">PAN Card No</label>
                <input
                  type="text"
                  value={formData.panNo}
                  onChange={(e) => handleInputChange(null, 'panNo', e.target.value)}
                  placeholder="10-digit PAN No"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none font-mono uppercase"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Voter ID Card No</label>
                <input
                  type="text"
                  value={formData.voterId}
                  onChange={(e) => handleInputChange(null, 'voterId', e.target.value)}
                  placeholder="Voter ID Card No"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none font-mono uppercase"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Trade License No</label>
                <input
                  type="text"
                  value={formData.tradeLicense}
                  onChange={(e) => handleInputChange(null, 'tradeLicense', e.target.value)}
                  placeholder="Trade License Certificate No"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none font-mono uppercase"
                />
              </div>
            </div>

            {/* Document upload attachments mockup */}
            <div className="border-t border-slate-50/50 pt-4 mt-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-3">Attach File Documents Coordinates</span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Aadhaar Front */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 text-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Aadhaar Card Front</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Front scan filename"
                      value={formData.aadharFront}
                      onChange={(e) => handleInputChange(null, 'aadharFront', e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleMockUpload('aadharFront', 'aadhar_front.jpg')}
                      className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-pointer"
                    >
                      <Upload size={13} />
                    </button>
                  </div>
                </div>

                {/* Aadhaar Back */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 text-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Aadhaar Card Back</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Back scan filename"
                      value={formData.aadharBack}
                      onChange={(e) => handleInputChange(null, 'aadharBack', e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleMockUpload('aadharBack', 'aadhar_back.jpg')}
                      className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-pointer"
                    >
                      <Upload size={13} />
                    </button>
                  </div>
                </div>

                {/* PAN Front */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 text-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">PAN Card Image</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="PAN Front scan"
                      value={formData.panFront}
                      onChange={(e) => handleInputChange(null, 'panFront', e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleMockUpload('panFront', 'pan_front.jpg')}
                      className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-pointer"
                    >
                      <Upload size={13} />
                    </button>
                  </div>
                </div>

                {/* Trade License Doc */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 text-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Trade License Scan</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Certificate scan"
                      value={formData.tradeLicenseDoc}
                      onChange={(e) => handleInputChange(null, 'tradeLicenseDoc', e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleMockUpload('tradeLicenseDoc', 'trade_license.pdf')}
                      className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-pointer"
                    >
                      <Upload size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Property Linking Section */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                <Building size={13} className="text-indigo-500" />
                <span>Linked Homestay Properties ({formData.properties.length})</span>
              </h3>
              <button
                type="button"
                onClick={handleAddProperty}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 hover:text-slate-800 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              >
                <Plus size={11} className="stroke-[2.5]" />
                <span>Link Property</span>
              </button>
            </div>

            {formData.properties.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 border border-dashed border-slate-200 rounded-xl font-medium">
                No homestays linked yet. Click 'Link Property' above to add one.
              </div>
            ) : (
              <div className="space-y-3">
                {formData.properties.map((prop, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl relative">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Property Name *</label>
                        <input
                          type="text"
                          required
                          value={prop.propertyName}
                          onChange={(e) => handlePropertyChange(idx, 'propertyName', e.target.value)}
                          placeholder="e.g. Hilltop Resort"
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-750 focus:outline-none"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Location *</label>
                        <input
                          type="text"
                          required
                          value={prop.location}
                          onChange={(e) => handlePropertyChange(idx, 'location', e.target.value)}
                          placeholder="e.g. Manali, HP"
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-750 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                        <select
                          value={prop.status}
                          onChange={(e) => handlePropertyChange(idx, 'status', e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Bookings count</label>
                        <input
                          type="number"
                          value={prop.bookings}
                          onChange={(e) => handlePropertyChange(idx, 'bookings', e.target.value)}
                          placeholder="0"
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-750 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-end justify-end pl-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveProperty(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-colors cursor-pointer"
                        title="Remove link"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Sticky Form Footer Bar */}
        <div className="fixed bottom-0 right-0 left-0 lg:left-64 bg-white border-t border-slate-100 px-6 py-4.5 flex justify-end gap-3 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-60 shadow-md shadow-blue-100"
          >
            {isSubmitting ? (
              <div className="flex justify-center gap-1 items-center">
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" />
                <span className="w-1 h-1 bg-white rounded-full animate-bounce delay-75" />
                <span className="w-1 h-1 bg-white rounded-full animate-bounce delay-150" />
              </div>
            ) : (
              <>
                <Check size={14} className="stroke-[2.5]" />
                <span>Save Owner Profile</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
