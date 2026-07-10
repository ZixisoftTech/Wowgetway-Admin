import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Globe, 
  User, 
  Briefcase, 
  Info, 
  Check, 
  Copy, 
  Plus, 
  Minus, 
  Calendar as CalendarIcon, 
  ChevronRight, 
  Percent, 
  DollarSign, 
  Download, 
  Smartphone,
  CheckCircle2,
  FileText,
  Lock,
  ChevronDown,
  X
} from 'lucide-react';

export default function CreateBookingFlow() {
  const navigate = useNavigate();
  
  // Re-ordered steps state (1: Guest Info, 2: Stay Details, 3: Room & Meal, 4: Share Link, 5: Success Receipt)
  const [currentStep, setCurrentStep] = useState(1); 

  // STEP 4 State (was Step 1): Link Generation
  const [generatedLink, setGeneratedLink] = useState('');
  const [showLinkSuccessModal, setShowLinkSuccessModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Property Selection State (to prevent confusion between multiple homestays)
  const [selectedProperty, setSelectedProperty] = useState('Panchpokhari Homestay');

  // STEP 2 & Wizard Common State
  const [bookingType, setBookingType] = useState('guest'); // guest / agent
  const [formData, setFormData] = useState({
    guestName: '',
    phone: '',
    checkIn: '2024-05-14',
    checkOut: '2024-05-16',
    roomCount: 2,
    rooms: [
      { id: 1, adults: 2, child5_9: 1, child0_4: 0 },
      { id: 2, adults: 2, child5_9: 0, child0_4: 1 }
    ],
    advanceAmount: 0,
    selectedRoomsConfig: [
      { roomId: 1, category: 'Super Deluxe Room', mealPlan: 'EP', price: 4499 },
      { roomId: 2, category: 'Deluxe Room', mealPlan: 'CP', price: 3899 }
    ]
  });

  // Dynamic pricing states
  const [pricing, setPricing] = useState({
    roomCost: 8398,
    tax: 1008,
    discount: 500,
    addOns: 300,
    finalAmount: 9206
  });

  // Calculate prices dynamically when room count or configs change
  useEffect(() => {
    let baseCost = 0;
    formData.selectedRoomsConfig.forEach(room => {
      const mealAddon = room.mealPlan === 'CP' ? 500 : room.mealPlan === 'MAP' ? 800 : room.mealPlan === 'AP' ? 1200 : 0;
      baseCost += (room.price + mealAddon);
    });

    const tax = Math.round(baseCost * 0.12);
    const final = baseCost + tax + pricing.addOns - pricing.discount;

    setPricing(prev => ({
      ...prev,
      roomCost: baseCost,
      tax: tax,
      finalAmount: final
    }));
  }, [formData.selectedRoomsConfig, formData.roomCount, pricing.addOns, pricing.discount]);

  // Handle room counters
  const updateRoomCountVal = (roomId, field, val) => {
    setFormData(prev => {
      const updatedRooms = prev.rooms.map(room => {
        if (room.id === roomId) {
          const newVal = Math.max(0, room[field] + val);
          return { ...room, [field]: newVal };
        }
        return room;
      });
      return { ...prev, rooms: updatedRooms };
    });
  };

  // Adjust total number of rooms
  const handleRoomCountChange = (count) => {
    setFormData(prev => {
      const newRooms = [];
      const newConfigs = [];
      for (let i = 1; i <= count; i++) {
        newRooms.push(prev.rooms[i - 1] || { id: i, adults: 2, child5_9: 0, child0_4: 0 });
        newConfigs.push(prev.selectedRoomsConfig[i - 1] || { roomId: i, category: 'Super Deluxe Room', mealPlan: 'EP', price: 4499 });
      }
      return {
        ...prev,
        roomCount: count,
        rooms: newRooms,
        selectedRoomsConfig: newConfigs
      };
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const generateLink = (type) => {
    const link = `https://homestayapp.com/ta/booking/${Math.random().toString(36).substring(7)}`;
    setGeneratedLink(link);
    setShowLinkSuccessModal(true);
  };

  return (
    <div className="space-y-6 font-sans pb-12 select-none">
      
      {/* Top Breadcrumb */}
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <button 
          onClick={() => navigate(-1)}
          className="hover:text-slate-600 bg-transparent border-none cursor-pointer flex items-center gap-1 p-0 text-[10px] font-black uppercase text-slate-400"
        >
          <ArrowLeft size={10} className="stroke-[3]" />
          <span>Back</span>
        </button>
        <span>/</span>
        <span>Dashboard</span>
        <span>/</span>
        <span>My Homestays</span>
        <span>/</span>
        <span>{selectedProperty}</span>
        <span>/</span>
        <span className="text-rose-700 font-extrabold">Create Booking</span>
      </div>

      {/* Progress Wizard tracker at the top (Updated with new Step Order) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-slate-400">
        <div className={`flex items-center gap-1 ${currentStep === 1 ? 'text-rose-700 font-black' : ''}`}>
          <span>1. Guest Info Form</span>
          {currentStep > 1 && <Check size={10} className="text-emerald-600" />}
        </div>
        <ChevronRight size={10} />
        <div className={`flex items-center gap-1 ${currentStep === 2 ? 'text-rose-700 font-black' : ''}`}>
          <span>2. Stay Details</span>
          {currentStep > 2 && <Check size={10} className="text-emerald-600" />}
        </div>
        <ChevronRight size={10} />
        <div className={`flex items-center gap-1 ${currentStep === 3 ? 'text-rose-700 font-black' : ''}`}>
          <span>3. Room & Meal</span>
          {currentStep > 3 && <Check size={10} className="text-emerald-600" />}
        </div>
        <ChevronRight size={10} />
        <div className={`flex items-center gap-1 ${currentStep === 4 ? 'text-rose-700 font-black' : ''}`}>
          <span>4. Share Link</span>
          {currentStep > 4 && <Check size={10} className="text-emerald-600" />}
        </div>
        <ChevronRight size={10} />
        <div className={`flex items-center gap-1 ${currentStep === 5 ? 'text-rose-700 font-black' : ''}`}>
          <span>5. Success Receipt</span>
        </div>
      </div>

      {/* STEP 1: CREATE BOOKING DETAIL FORM */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Columns Form (70%) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Create Booking</h2>
              
              {/* Segment control */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setBookingType('guest')}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg cursor-pointer border-none transition-all ${
                    bookingType === 'guest' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 bg-transparent'
                  }`}
                >
                  For Guest
                </button>
                <button
                  onClick={() => setBookingType('agent')}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg cursor-pointer border-none transition-all ${
                    bookingType === 'agent' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 bg-transparent'
                  }`}
                >
                  For Travel Agent
                </button>
              </div>
            </div>

            {/* Guest Details Form Card */}
            <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5">
                <User size={16} className="text-rose-700" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Guest Details</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Guest Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.guestName}
                    onChange={(e) => setFormData(prev => ({ ...prev, guestName: e.target.value }))}
                    placeholder="Enter guest name"
                    className="w-full px-3.5 py-2.5 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Guest Mobile Number *</label>
                  <div className="flex gap-2">
                    <select className="px-2 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707">
                      <option value="+91">+91 (IN)</option>
                      <option value="+977">+977 (NP)</option>
                    </select>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter mobile number"
                      className="flex-1 px-3.5 py-2.5 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Check-in Date *</label>
                  <input
                    type="date"
                    value={formData.checkIn}
                    onChange={(e) => setFormData(prev => ({ ...prev, checkIn: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Check-out Date *</label>
                  <input
                    type="date"
                    value={formData.checkOut}
                    onChange={(e) => setFormData(prev => ({ ...prev, checkOut: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Number of Rooms Required *</label>
                <select
                  value={formData.roomCount}
                  onChange={(e) => handleRoomCountChange(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                >
                  <option value={1}>1 Room</option>
                  <option value={2}>2 Rooms</option>
                  <option value={3}>3 Rooms</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50/50 text-slate-500 rounded-xl text-[9px] font-bold flex items-center gap-2">
                <Info size={12} className="text-slate-400" />
                <span>Add guest details, select number of rooms and continue to stay details.</span>
              </div>
            </div>

            {/* Dynamic Room Cards */}
            <div className="space-y-4">
              {formData.rooms.map((room) => (
                <div key={room.id} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="text-xs font-black text-slate-800 uppercase">Room {room.id} Details</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* Adults */}
                    <div className="p-3.5 bg-slate-50/50 border border-slate-150 rounded-xl flex flex-col justify-between items-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Adults (10+) *</span>
                      <div className="flex items-center gap-3.5 mt-2">
                        <button
                          type="button"
                          onClick={() => updateRoomCountVal(room.id, 'adults', -1)}
                          className="w-6.5 h-6.5 bg-white border border-slate-200 hover:bg-slate-55 rounded-full flex items-center justify-center cursor-pointer"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-xs font-black text-slate-800">{room.adults}</span>
                        <button
                          type="button"
                          onClick={() => updateRoomCountVal(room.id, 'adults', 1)}
                          className="w-6.5 h-6.5 bg-white border border-slate-200 hover:bg-slate-55 rounded-full flex items-center justify-center cursor-pointer"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Child 5-9 */}
                    <div className="p-3.5 bg-slate-50/50 border border-slate-150 rounded-xl flex flex-col justify-between items-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Child (5-9 Years)</span>
                      <div className="flex items-center gap-3.5 mt-2">
                        <button
                          type="button"
                          onClick={() => updateRoomCountVal(room.id, 'child5_9', -1)}
                          className="w-6.5 h-6.5 bg-white border border-slate-200 hover:bg-slate-55 rounded-full flex items-center justify-center cursor-pointer"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-xs font-black text-slate-800">{room.child5_9}</span>
                        <button
                          type="button"
                          onClick={() => updateRoomCountVal(room.id, 'child5_9', 1)}
                          className="w-6.5 h-6.5 bg-white border border-slate-200 hover:bg-slate-55 rounded-full flex items-center justify-center cursor-pointer"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Child 0-4 */}
                    <div className="p-3.5 bg-slate-50/50 border border-slate-150 rounded-xl flex flex-col justify-between items-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Child (0-4 Years)</span>
                      <div className="flex items-center gap-3.5 mt-2">
                        <button
                          type="button"
                          onClick={() => updateRoomCountVal(room.id, 'child0_4', -1)}
                          className="w-6.5 h-6.5 bg-white border border-slate-200 hover:bg-slate-55 rounded-full flex items-center justify-center cursor-pointer"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-xs font-black text-slate-800">{room.child0_4}</span>
                        <button
                          type="button"
                          onClick={() => updateRoomCountVal(room.id, 'child0_4', 1)}
                          className="w-6.5 h-6.5 bg-white border border-slate-200 hover:bg-slate-55 rounded-full flex items-center justify-center cursor-pointer"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Simple Next Step CTA Button (Replaced from the removed Select Rooms & Dates section) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-full py-4.5 bg-rose-750 hover:bg-rose-850 text-white font-black text-xs uppercase tracking-wider rounded-2xl cursor-pointer border-none shadow-md flex items-center justify-center gap-2"
              >
                <span>Continue to Stay Details</span>
                <ChevronRight size={14} className="stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Right Column Sticky Summary (30%) */}
          <div className="lg:col-span-4 sticky top-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                <FileText size={16} className="text-slate-400" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider leading-none">Pricing Summary</h3>
              </div>

              <div className="space-y-3.5 text-xs font-semibold text-slate-500">
                <div className="flex justify-between items-center">
                  <span>Total Cost (Editable)</span>
                  <span className="font-mono font-black text-slate-800">₹ {pricing.roomCost}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Tax (Editable)</span>
                  <span className="font-mono font-bold text-slate-800">₹ {pricing.tax}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Add-ons</span>
                  <button onClick={() => alert('Custom add-ons selection...')} className="text-rose-700 hover:underline bg-transparent border-none cursor-pointer font-bold text-[10px] uppercase">
                    + Add Add-ons
                  </button>
                </div>

                <div className="border-t border-slate-50 pt-3 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-800">Final Cost</span>
                  <span className="text-lg font-black text-rose-700 font-mono">₹ {pricing.finalAmount}</span>
                </div>

                <div className="space-y-1.5 border-t border-slate-50 pt-3">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Advance Amount Received</label>
                  <input
                    type="number"
                    value={formData.advanceAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, advanceAmount: parseInt(e.target.value) || 0 }))}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>

                <div className="flex justify-between items-center border-t border-slate-50 pt-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Balance Amount</span>
                  <span className="text-sm font-black text-slate-800 font-mono">₹ {pricing.finalAmount - formData.advanceAmount}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => setCurrentStep(5)}
                  disabled={!formData.guestName}
                  className="w-full py-3 bg-rose-700 hover:bg-rose-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={13} />
                  <span>Create Booking</span>
                </button>

                <button
                  onClick={() => alert('Booking placed on hold!')}
                  className="w-full py-3 border border-slate-205 hover:bg-slate-50 text-slate-707 font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer bg-white"
                >
                  Hold Booking
                </button>
              </div>

              {/* Disabled summary buttons */}
              <div className="grid grid-cols-2 gap-2.5 border-t border-slate-50 pt-4">
                <button disabled className="py-2.5 bg-slate-50 border border-slate-100 text-slate-400 font-bold rounded-xl text-[9px] uppercase cursor-not-allowed">
                  Confirmation Slip
                </button>
                <button disabled className="py-2.5 bg-slate-50 border border-slate-100 text-slate-400 font-bold rounded-xl text-[9px] uppercase cursor-not-allowed">
                  Generate Invoice
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* STEP 2: GUEST STAY DETAILS PUBLIC VIEW (was Step 3) */}
      {currentStep === 2 && (
        <div className="max-w-[750px] mx-auto bg-white border border-slate-100 rounded-3xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider leading-none">Guest Stay Details</h2>
            <p className="text-[10px] text-slate-400 font-bold">Please provide your stay details.</p>
          </div>

          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-150 space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Number of Rooms</label>
            <select
              value={formData.roomCount}
              onChange={(e) => handleRoomCountChange(parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none bg-white"
            >
              <option value={1}>1 Room</option>
              <option value={2}>2 Rooms</option>
              <option value={3}>3 Rooms</option>
            </select>
          </div>

          {/* Dynamic Rooms counter configuration matching client mock exactly */}
          <div className="space-y-4">
            {formData.rooms.map((room) => (
              <div key={room.id} className="p-5 border border-slate-150 rounded-2xl space-y-4">
                <span className="block text-xs font-black text-rose-700 uppercase">Room {room.id} Details</span>
                
                <div className="grid grid-cols-3 gap-4">
                  {/* Adults */}
                  <div className="flex flex-col items-center p-3 bg-slate-50/30 border border-slate-100 rounded-xl space-y-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase">Adults (10+ Years)</span>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => updateRoomCountVal(room.id, 'adults', -1)} className="w-6.5 h-6.5 bg-white border rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-50"><Minus size={10} /></button>
                      <span className="text-xs font-black text-slate-800">{room.adults}</span>
                      <button type="button" onClick={() => updateRoomCountVal(room.id, 'adults', 1)} className="w-6.5 h-6.5 bg-white border rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-50"><Plus size={10} /></button>
                    </div>
                  </div>

                  {/* Children 5-9 */}
                  <div className="flex flex-col items-center p-3 bg-slate-50/30 border border-slate-100 rounded-xl space-y-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase">Children (5 - 9 Years)</span>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => updateRoomCountVal(room.id, 'child5_9', -1)} className="w-6.5 h-6.5 bg-white border rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-50"><Minus size={10} /></button>
                      <span className="text-xs font-black text-slate-800">{room.child5_9}</span>
                      <button type="button" onClick={() => updateRoomCountVal(room.id, 'child5_9', 1)} className="w-6.5 h-6.5 bg-white border rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-50"><Plus size={10} /></button>
                    </div>
                  </div>

                  {/* Children 0-5 */}
                  <div className="flex flex-col items-center p-3 bg-slate-50/30 border border-slate-100 rounded-xl space-y-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase">Children (0 - 5 Years)</span>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => updateRoomCountVal(room.id, 'child0_4', -1)} className="w-6.5 h-6.5 bg-white border rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-50"><Minus size={10} /></button>
                      <span className="text-xs font-black text-slate-800">{room.child0_4}</span>
                      <button type="button" onClick={() => updateRoomCountVal(room.id, 'child0_4', 1)} className="w-6.5 h-6.5 bg-white border rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-50"><Plus size={10} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setCurrentStep(3)}
            className="w-full py-3.5 bg-rose-700 hover:bg-rose-800 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>Click to Continue</span>
          </button>
        </div>
      )}

      {/* STEP 3: ROOM & MEAL SELECTION (was Step 4) */}
      {currentStep === 3 && (
        <div className="max-w-[1000px] mx-auto bg-white border border-slate-100 rounded-3xl shadow-xl p-8 space-y-6">
          
          {/* Property Name Selection Dropdown (Requirement 1: prevent confusion with 2 homestays) */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-2 shadow-sm">
            <label className="text-[10px] font-black text-rose-700 uppercase tracking-widest block">Select Property / Homestay</label>
            <div className="relative">
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="w-full px-4 py-3 border border-slate-205 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none bg-slate-50/30 cursor-pointer appearance-none"
              >
                <option value="Panchpokhari Homestay">Panchpokhari Homestay (Nepal)</option>
                <option value="Bloom Homestay">Bloom Homestay (Manali)</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          {/* Summary Strip */}
          <div className="bg-slate-55 border border-slate-150 p-4.5 rounded-2xl flex flex-wrap justify-between items-center gap-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
            <div className="flex gap-5">
              <div>
                <span className="block text-[8px] text-slate-400">Check-in</span>
                <span className="text-slate-800 font-extrabold">14 May 2024</span>
              </div>
              <div>
                <span className="block text-[8px] text-slate-400">Check-out</span>
                <span className="text-slate-800 font-extrabold">16 May 2024</span>
              </div>
              <div>
                <span className="block text-[8px] text-slate-400">Rooms</span>
                <span className="text-slate-800 font-extrabold">{formData.roomCount} Rooms</span>
              </div>
            </div>
            <button onClick={() => setCurrentStep(1)} className="px-3.5 py-1.5 border border-slate-205 hover:bg-slate-100 text-slate-800 rounded-lg font-bold text-[9px] uppercase cursor-pointer bg-white">
              Edit
            </button>
          </div>

          <div className="flex gap-2">
            <button className="px-5 py-2.5 bg-rose-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none">
              Room 1
            </button>
            <button className="px-5 py-2.5 bg-slate-100 text-slate-500 font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none">
              Room 2
            </button>
          </div>

          <div className="p-3 bg-rose-50/30 text-rose-700 border border-rose-100 rounded-xl text-[9px] font-bold flex items-center gap-2">
            <Info size={12} className="text-rose-600" />
            <span>Please select a room category and meal plan for Room 1.</span>
          </div>

          {/* Room Category item cards */}
          <div className="space-y-6">
            
            {/* Super Deluxe Room */}
            <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5 bg-white">
              <div className="flex flex-col md:flex-row gap-5">
                <div className="w-full md:w-56 h-36 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                  <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&h=200&q=80" alt="Super Deluxe" className="w-full h-full object-cover" />
                </div>
                
                <div className="space-y-2.5">
                  <h3 className="text-sm font-black text-slate-800 leading-none">Super Deluxe Room</h3>
                  <div className="flex items-center gap-3 text-[9px] font-black uppercase">
                    <span className="text-emerald-600">✔ 4 Rooms Available</span>
                    <span className="text-slate-400">👤 Max Occupancy: 3 Guests</span>
                  </div>
                  <span className="block text-sm font-black text-rose-700 font-mono">₹ 4,499 <span className="text-[10px] text-slate-400 font-semibold uppercase">/ night</span></span>
                </div>
              </div>

              {/* Meal Plan Selectors */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4.5 pt-3">
                <div className="p-3 border border-rose-700 bg-rose-50/10 rounded-xl text-center space-y-1 relative cursor-pointer">
                  <span className="block text-xs font-black text-slate-800">EP</span>
                  <span className="block text-[8px] text-slate-400">(Room Only)</span>
                  <span className="block text-[10px] font-mono font-black text-rose-700">+ ₹ 0</span>
                  <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-rose-700 text-white flex items-center justify-center">
                    <Check size={8} className="stroke-[3]" />
                  </div>
                </div>

                <div className="p-3 border border-slate-150 rounded-xl text-center space-y-1 cursor-pointer">
                  <span className="block text-xs font-black text-slate-800">CP</span>
                  <span className="block text-[8px] text-slate-400">(Breakfast)</span>
                  <span className="block text-[10px] font-mono font-black text-slate-700">+ ₹ 500</span>
                </div>

                <div className="p-3 border border-slate-150 rounded-xl text-center space-y-1 cursor-pointer">
                  <span className="block text-xs font-black text-slate-800">MAP</span>
                  <span className="block text-[8px] text-slate-400">(Half Board)</span>
                  <span className="block text-[10px] font-mono font-black text-rose-700">+ ₹ 800</span>
                </div>

                <div className="p-3 border border-slate-150 rounded-xl text-center space-y-1 cursor-pointer">
                  <span className="block text-xs font-black text-slate-800">AP</span>
                  <span className="block text-[8px] text-slate-400">(Full Board)</span>
                  <span className="block text-[10px] font-mono font-black text-rose-700">+ ₹ 1,200</span>
                </div>
              </div>
            </div>

            {/* Deluxe Room */}
            <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5 bg-white">
              <div className="flex flex-col md:flex-row gap-5">
                <div className="w-full md:w-56 h-36 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                  <img src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=300&h=200&q=80" alt="Deluxe Room" className="w-full h-full object-cover" />
                </div>
                
                <div className="space-y-2.5">
                  <h3 className="text-sm font-black text-slate-800 leading-none">Deluxe Room</h3>
                  <div className="flex items-center gap-3 text-[9px] font-black uppercase">
                    <span className="text-emerald-600">✔ 5 Rooms Available</span>
                    <span className="text-slate-400">👤 Max Occupancy: 3 Guests</span>
                  </div>
                  <span className="block text-sm font-black text-rose-700 font-mono">₹ 3,499 <span className="text-[10px] text-slate-400 font-semibold uppercase">/ night</span></span>
                </div>
              </div>
            </div>

          </div>

          {/* Cost Summary block */}
          <div className="p-5 bg-slate-50 border border-slate-150 rounded-2xl space-y-3.5 text-xs">
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Cost Summary <span className="text-slate-400 font-bold">(Per Night)</span></span>
            
            <div className="space-y-1 font-semibold text-slate-500">
              <div className="flex justify-between items-center">
                <span>Room 1: Super Deluxe Room | EP (Room Only)</span>
                <span className="font-mono text-slate-800 font-bold">₹ 4,499 x 2 Nights = ₹ 8,998</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Room 2: Not Selected Yet</span>
                <span className="font-mono text-slate-400">₹ 0</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
              <span className="text-xs font-black text-slate-800">Total Amount (For 2 Nights)</span>
              <span className="text-sm font-black text-rose-700 font-mono">₹ 8,998</span>
            </div>
          </div>

          <button
            onClick={() => setCurrentStep(4)}
            className="w-full py-3.5 bg-rose-700 hover:bg-rose-800 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>Continue</span>
          </button>
        </div>
      )}

      {/* STEP 4: SHARE PUBLIC BOOKING LINK VIEW (was Step 1) */}
      {currentStep === 4 && (
        <div className="max-w-[850px] mx-auto bg-white border border-slate-100 rounded-3xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-purple-50 text-purple-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Globe size={26} />
            </div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Share Public Link</h2>
            <p className="text-xs text-slate-400 font-bold max-w-md mx-auto">
              Anyone with this link can check room availability and submit a booking request.
            </p>
          </div>

          <div className="border-t border-slate-50 pt-5 space-y-2">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Choose Link Type</span>
            <p className="text-[9px] font-semibold text-slate-400 text-center">Select who will use this booking link.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5.5">
            {/* Card 1: For Guests */}
            <div className="bg-white border border-slate-150 p-6 rounded-2xl hover:shadow-md transition-shadow flex flex-col justify-between items-center text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center">
                <User size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase">For Guests</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-relaxed">
                  Guests can view dates, check available inventory, and request booking directly.
                </p>
              </div>
              <button
                onClick={() => generateLink('guest')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm"
              >
                Generate Guest Link
              </button>
            </div>

            {/* Card 2: For Travel Agents */}
            <div className="bg-white border border-slate-150 p-6 rounded-2xl hover:shadow-md transition-shadow flex flex-col justify-between items-center text-center space-y-4">
              <div className="w-12 h-12 bg-sky-50 text-sky-700 rounded-full flex items-center justify-center">
                <Briefcase size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase">For Travel Agents</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-relaxed">
                  Travel agents can check rates, select configurations, and book rooms with commissions.
                </p>
              </div>
              <button
                onClick={() => generateLink('agent')}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm"
              >
                Generate Travel Agent Link
              </button>
            </div>
          </div>

          {/* Bottom Info box */}
          <div className="p-3.5 bg-sky-50/50 text-sky-700 border border-sky-100 rounded-2xl text-[10px] font-bold flex items-center gap-2">
            <Info size={14} className="text-sky-600" />
            <span>These booking links can be shared based on the intended audience.</span>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setCurrentStep(5)}
              className="px-6 py-3 bg-rose-700 hover:bg-rose-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm flex items-center gap-1"
            >
              <span>Skip and View Receipt</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: BOOKING SUCCESS RECEIPT */}
      {currentStep === 5 && (
        <div className="max-w-[650px] mx-auto bg-white border border-slate-100 rounded-3xl shadow-xl p-8 text-center space-y-6">
          
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 size={28} className="stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Booking Created Successfully!</h2>
            <p className="text-[10px] text-slate-400 font-bold">
              Your homestay booking has been verified and registered.
            </p>
          </div>

          {/* Generated summary sheet */}
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-150 text-left space-y-3.5 text-xs font-semibold text-slate-500">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase">Guest Name</span>
              <span className="text-slate-800 font-extrabold">{formData.guestName || 'Priya Mehta'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase">Phone</span>
              <span className="text-slate-800 font-mono">{formData.phone || '+91 9876543210'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase">Check-In</span>
              <span className="text-slate-800 font-extrabold">{formData.checkIn}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase">Check-Out</span>
              <span className="text-slate-800 font-extrabold">{formData.checkOut}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-xs font-black text-slate-800">Final Cost Paid</span>
              <span className="text-sm font-black text-rose-700 font-mono">₹ {pricing.finalAmount}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                alert('Downloading receipt slip...');
                navigate('/homestay-owner/guests');
              }}
              className="w-full py-3.5 bg-rose-700 hover:bg-rose-800 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm flex items-center justify-center gap-1.5"
            >
              <Download size={14} />
              <span>Download Confirmation Slip</span>
            </button>

            <button
              onClick={() => {
                setCurrentStep(1);
                setFormData(prev => ({
                  ...prev,
                  guestName: '',
                  phone: ''
                }));
              }}
              className="w-full py-3.5 border border-slate-205 hover:bg-slate-50 text-slate-707 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer bg-white"
            >
              Create Another Booking
            </button>
          </div>

        </div>
      )}

      {/* TRAVEL AGENT LINK SUCCESS GENERATED MODAL POPUP */}
      {showLinkSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6 text-center relative">
            <button
              onClick={() => setShowLinkSuccessModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-650 bg-transparent border-none cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Check className="stroke-[3]" size={24} />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Link for Travel Agent Generated!</h3>
              <p className="text-[10px] text-slate-400 font-bold max-w-sm mx-auto">
                This link has been generated for travel agents. Only one booking can be done from this link.
              </p>
            </div>

            {/* Read-only copy input */}
            <div className="space-y-1.5 text-left">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Your Travel Agent Link</span>
              <div className="flex border border-slate-205 rounded-xl overflow-hidden bg-slate-50/50">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 px-3 py-2 text-xs font-bold text-slate-600 bg-transparent border-none focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="px-4.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5"
                >
                  <Copy size={11} />
                  <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Informational checklist block */}
            <div className="p-5 bg-emerald-50/10 border border-emerald-100 rounded-2xl text-left space-y-2">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-emerald-600 mt-0.5" />
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Note</span>
              </div>
              <ul className="list-disc pl-4 text-[9px] font-bold text-slate-500 space-y-1.5">
                <li>Only one booking can be done through this link.</li>
                <li>Once a booking is confirmed, this link will be deactivated automatically.</li>
                <li>You can generate a new link anytime if needed.</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setShowLinkSuccessModal(false);
                setCurrentStep(5); // Continue to Success Receipt page
              }}
              className="w-full py-3 bg-rose-700 hover:bg-rose-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm"
            >
              Continue to Success Receipt
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
