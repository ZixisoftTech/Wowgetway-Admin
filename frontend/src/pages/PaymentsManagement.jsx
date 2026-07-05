import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  Search, 
  Check, 
  X,
  AlertCircle, 
  Calendar, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Info
} from 'lucide-react';

const initialDues = [
  { id: 'BKG-2345', type: 'HOMESTAY', propertyName: 'Seaside Villa', guestName: 'Rahul Sharma', guestMobile: '+91 98765 43210', amount: 12500, status: 'Unpaid', paidDate: '', dueDate: '01 Jun 2026 (Today)' },
  { id: 'BKG-2334', type: 'TOUR PACKAGE', propertyName: 'Himalayan Retreat', guestName: 'Neha Singh', guestMobile: '+91 99987 65432', amount: 8200, status: 'Paid', paidDate: '01 Jun 2026 11:20 AM', dueDate: '01 Jun 2026 (Today)' },
  { id: 'BKG-2321', type: 'HOTEL', propertyName: 'Ocean View Resort', guestName: 'Aman Das', guestMobile: '+91 87654 32109', amount: 15000, status: 'Unpaid', paidDate: '', dueDate: '01 Jun 2026 (Today)' },
  { id: 'BKG-2299', type: 'HOMESTAY', propertyName: 'Greenwood Cottage', guestName: 'Vikram Patel', guestMobile: '+91 99112 23344', amount: 6500, status: 'Paid', paidDate: '01 Jun 2026 10:15 AM', dueDate: '01 Jun 2026 (Today)' },
  { id: 'BKG-2401', type: 'HOTEL', propertyName: 'Sundance Resort', guestName: 'Rohan Gupta', guestMobile: '+91 99887 76655', amount: 9800, status: 'Unpaid', paidDate: '', dueDate: '02 Jun 2026' }
];

export default function PaymentsManagement() {
  const [dues, setDues] = useState(initialDues);
  const [selectedDate, setSelectedDate] = useState(1); // 1 = 1st June 2026
  const [activeMonth, setActiveMonth] = useState('June');
  const [activeYear, setActiveYear] = useState('2026');

  // Mini-sub-filters for columns
  const [paidSearch, setPaidSearch] = useState('');
  const [unpaidSearch, setUnpaidSearch] = useState('');

  // Handle paid status change
  const handleMarkStatus = (id, newStatus) => {
    setDues(prev => prev.map(item => {
      if (item.id === id) {
        const timestamp = newStatus === 'Paid' 
          ? `01 Jun 2026 ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
          : '';
        return {
          ...item,
          status: newStatus,
          paidDate: timestamp
        };
      }
      return item;
    }));
  };

  // Filter dues list for the selected calendar date
  const filteredForDueList = dues.filter(item => {
    // Simulating 1st June has specific items
    if (selectedDate === 1) {
      return item.id === 'BKG-2345' || item.id === 'BKG-2334' || item.id === 'BKG-2321';
    } else {
      return item.id === 'BKG-2299' || item.id === 'BKG-2401';
    }
  });

  // Paid items list
  const paidListItems = dues.filter(item => {
    const isPaid = item.status === 'Paid';
    const matchesSearch = item.id.toLowerCase().includes(paidSearch.toLowerCase()) || item.propertyName.toLowerCase().includes(paidSearch.toLowerCase()) || item.guestName.toLowerCase().includes(paidSearch.toLowerCase());
    return isPaid && matchesSearch;
  });

  // Unpaid items list
  const unpaidListItems = dues.filter(item => {
    const isUnpaid = item.status === 'Unpaid';
    const matchesSearch = item.id.toLowerCase().includes(unpaidSearch.toLowerCase()) || item.propertyName.toLowerCase().includes(unpaidSearch.toLowerCase()) || item.guestName.toLowerCase().includes(unpaidSearch.toLowerCase());
    return isUnpaid && matchesSearch;
  });

  // Calculate totals
  const totalPaidSum = paidListItems.reduce((sum, item) => sum + item.amount, 0);
  const totalUnpaidSum = unpaidListItems.reduce((sum, item) => sum + item.amount, 0);

  // Month days sequence matching screenshot
  const calendarDays = [
    { day: '31', label: 'Su' },
    { day: '1', label: 'Mo', active: true },
    { day: '2', label: 'Tu' },
    { day: '3', label: 'We' },
    { day: '4', label: 'Th' },
    { day: '7', label: 'Fr' },
    { day: '8', label: 'Sa' },
    { day: '9', label: 'Su' },
    { day: '10', label: 'Mo' },
    { day: '11', label: 'Tu' },
    { day: '15', label: 'We' },
    { day: '10', label: 'Th' }
  ];

  return (
    <div className="space-y-6 select-none animate-fade-in pb-16">
      
      {/* -------------------- 1. HEADER & CALENDAR DATEPICKER SECTION -------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Welcome Text */}
        <div className="lg:col-span-2 space-y-1.5 mt-2">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">
            B2B Hotel / Homestay Payment
          </h1>
          <p className="text-xs text-slate-400 font-semibold flex items-center gap-1">
            Welcome, Karan 👋
          </p>
        </div>

        {/* Datepicker Picker Calendar Card */}
        <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex flex-col gap-3.5">
          <div className="flex justify-between items-start border-b border-slate-50 pb-3">
            <div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">TODAY'S DATE</span>
              <span className="text-xl font-black text-blue-600 block mt-1.5 font-sans leading-none">01 June 2026</span>
              <span className="text-[10px] text-slate-500 font-bold block mt-1">Opened on: 01 June 2026, 09:00 AM</span>
            </div>
            <span className="bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider">
              Monday
            </span>
          </div>

          {/* Mini Calendar Slider Widget */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-700 px-1">
              <span>Change Date</span>
              <div className="flex items-center gap-1.5 text-slate-400">
                <ChevronLeft size={13} className="hover:text-slate-800 cursor-pointer" />
                <span className="text-[9px] font-black uppercase text-slate-600 font-sans">June 2026</span>
                <ChevronRight size={13} className="hover:text-slate-800 cursor-pointer" />
              </div>
            </div>

            {/* Calendar Days row */}
            <div className="flex gap-2 justify-between overflow-x-auto pr-1 py-1.5 scrollbar-thin">
              {calendarDays.map((d, index) => {
                const isSelected = selectedDate === Number(d.day);
                return (
                  <div 
                    key={index}
                    onClick={() => setSelectedDate(Number(d.day))}
                    className={`flex flex-col items-center gap-1.5 p-1.5 rounded-xl cursor-pointer min-w-[32px] transition-all ${
                      isSelected 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
                    }`}
                  >
                    <span className="text-[8px] font-black uppercase tracking-wider">{d.label}</span>
                    <span className="text-xs font-black font-sans">{d.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* -------------------- 2. MAIN TABLE: DUE LIST -------------------- */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Card Header Title */}
        <div className="border-b border-slate-100 px-6 py-4.5 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <CreditCard size={15} />
            </span>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Due List — {selectedDate === 1 ? '01' : '02'} June 2026
            </h2>
          </div>
          <span className="bg-amber-50 border border-amber-100 text-amber-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
            {filteredForDueList.length} Due(s)
          </span>
        </div>

        {/* Info Notification Alert bar */}
        <div className="bg-blue-50/20 border-b border-slate-100/50 px-6 py-3 flex gap-2 text-blue-700 items-center">
          <Info size={14} className="text-blue-500 flex-shrink-0" />
          <p className="text-[10px] font-bold">
            Showing dues for the selected date. Click "Mark Paid" or "Mark Unpaid" to move items to respective lists.
          </p>
        </div>

        {/* Due Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-6">#</th>
                <th className="py-3 px-6">Booking ID</th>
                <th className="py-3 px-6">Property Name</th>
                <th className="py-3 px-6">Guest Name & Number</th>
                <th className="py-3 px-6">Due Amount</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredForDueList.map((item, index) => {
                let badgeTypeClass = 'bg-slate-100 text-slate-600';
                if (item.type === 'HOMESTAY') badgeTypeClass = 'bg-sky-50 text-sky-700 border border-sky-100';
                if (item.type === 'HOTEL') badgeTypeClass = 'bg-indigo-50 text-indigo-700 border border-indigo-100';
                if (item.type === 'TOUR PACKAGE') badgeTypeClass = 'bg-rose-50 text-rose-700 border border-rose-100';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4.5 px-6 text-slate-400 font-bold">{index + 1}</td>
                    
                    {/* ID & Badge */}
                    <td className="py-4.5 px-6 space-y-1">
                      <span className="font-extrabold text-blue-600 block">{item.id}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider inline-block ${badgeTypeClass}`}>
                        {item.type}
                      </span>
                    </td>

                    {/* Property */}
                    <td className="py-4.5 px-6 font-bold text-slate-800">{item.propertyName}</td>

                    {/* Guest details */}
                    <td className="py-4.5 px-6">
                      <span className="font-bold text-slate-800 block">{item.guestName}</span>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{item.guestMobile}</span>
                    </td>

                    {/* Amount */}
                    <td className="py-4.5 px-6 font-mono font-black text-slate-900">
                      ₹ {item.amount.toLocaleString('en-IN')}
                    </td>

                    {/* Status badge */}
                    <td className="py-4.5 px-6">
                      <span className={`border px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                        item.status === 'Paid' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                          : 'bg-amber-50 text-amber-800 border-amber-100'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    {/* Actions mark paid/unpaid */}
                    <td className="py-4.5 px-6">
                      <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                        {item.status === 'Unpaid' ? (
                          <>
                            <button
                              onClick={() => handleMarkStatus(item.id, 'Unpaid')}
                              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-black rounded-lg cursor-pointer transition-all w-28 text-center"
                            >
                              Mark Unpaid
                            </button>
                            <button
                              onClick={() => handleMarkStatus(item.id, 'Paid')}
                              className="px-3 py-1.5 bg-white border border-emerald-250 text-emerald-600 hover:bg-emerald-50 text-[10px] font-black rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 w-28"
                            >
                              <Check size={11} className="stroke-[3]" /> Mark Paid
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleMarkStatus(item.id, 'Unpaid')}
                            className="px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-850 hover:bg-emerald-100/50 text-[10px] font-black rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 w-full"
                          >
                            <Check size={11} className="stroke-[3]" /> Paid (Move to Paid List)
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* -------------------- 3. BOTTOM SIDE-BY-SIDE LISTS -------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: PAID LIST */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          
          <div className="border-b border-slate-100 px-5 py-4 flex justify-between items-center bg-slate-50/20">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full"></span>
              Paid List
            </h3>
            <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-lg text-[9px] font-black">
              {paidListItems.length} Paid
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1">
            <span className="text-[10px] text-slate-400 font-bold block leading-none">Payments completed on selected date</span>
            
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={paidSearch}
                  onChange={(e) => setPaidSearch(e.target.value)}
                  placeholder="Filter by Date or Booking ID..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 placeholder-slate-400 focus:outline-none shadow-inner"
                />
              </div>
            </div>

            <div className="bg-slate-50/50 border border-slate-100/50 p-3 rounded-xl flex items-center gap-2 text-slate-600 font-bold text-[10px]">
              <Calendar size={13} className="text-slate-450" />
              <span>Selected Date: {selectedDate === 1 ? '01' : '02'} June 2026</span>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto min-h-[160px]">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2 pb-1 px-1">Booking ID</th>
                    <th className="py-2 pb-1 px-1">Property Name</th>
                    <th className="py-2 pb-1 px-1">Guest Name</th>
                    <th className="py-2 pb-1 px-1">Amount</th>
                    <th className="py-2 pb-1 px-1 text-right">Paid On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {paidListItems.map(item => (
                    <tr key={item.id}>
                      <td className="py-3 px-1">
                        <span className="font-extrabold text-blue-600 block">{item.id}</span>
                        <span className="text-[7px] text-slate-400 font-black block uppercase tracking-wider mt-0.5">{item.type}</span>
                      </td>
                      <td className="py-3 px-1 text-slate-500">{item.propertyName}</td>
                      <td className="py-3 px-1 font-bold text-slate-800">{item.guestName}</td>
                      <td className="py-3 px-1 font-mono font-bold text-slate-850">₹{item.amount.toLocaleString()}</td>
                      <td className="py-3 px-1 text-right text-[10px] text-slate-400 font-medium">{item.paidDate || 'N/A'}</td>
                    </tr>
                  ))}
                  {paidListItems.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-400 font-medium">No completed payments found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paid Summary footer */}
          <div className="bg-emerald-50 border-t border-emerald-100/50 px-5 py-3 flex justify-between items-center text-xs font-bold text-emerald-800">
            <span className="flex items-center gap-1.5">
              <Check size={14} className="stroke-[3.5]" />
              Paid Count: {paidListItems.length}
            </span>
            <span className="font-mono text-sm font-black">Total ₹ {totalPaidSum.toLocaleString()}</span>
          </div>

        </div>

        {/* RIGHT COLUMN: UNPAID LIST */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          
          <div className="border-b border-slate-100 px-5 py-4 flex justify-between items-center bg-slate-50/20">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-rose-500 rounded-full"></span>
              Unpaid List
            </h3>
            <span className="bg-rose-50 border border-rose-100 text-rose-700 px-2.5 py-0.5 rounded-lg text-[9px] font-black">
              {unpaidListItems.length} Unpaid
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1">
            <span className="text-[10px] text-slate-400 font-bold block leading-none">Pending dues for selected date</span>
            
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={unpaidSearch}
                  onChange={(e) => setUnpaidSearch(e.target.value)}
                  placeholder="Filter by Date or Booking ID..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 placeholder-slate-400 focus:outline-none shadow-inner"
                />
              </div>
            </div>

            <div className="bg-slate-50/50 border border-slate-100/50 p-3 rounded-xl flex items-center gap-2 text-slate-600 font-bold text-[10px]">
              <Calendar size={13} className="text-slate-450" />
              <span>Selected Date: {selectedDate === 1 ? '01' : '02'} June 2026</span>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto min-h-[160px]">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2 pb-1 px-1">Booking ID</th>
                    <th className="py-2 pb-1 px-1">Property Name</th>
                    <th className="py-2 pb-1 px-1">Guest Name</th>
                    <th className="py-2 pb-1 px-1">Amount</th>
                    <th className="py-2 pb-1 px-1 text-right">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {unpaidListItems.map(item => (
                    <tr key={item.id}>
                      <td className="py-3 px-1">
                        <span className="font-extrabold text-blue-600 block">{item.id}</span>
                        <span className="text-[7px] text-slate-400 font-black block uppercase tracking-wider mt-0.5">{item.type}</span>
                      </td>
                      <td className="py-3 px-1 text-slate-500">{item.propertyName}</td>
                      <td className="py-3 px-1 font-bold text-slate-800">{item.guestName}</td>
                      <td className="py-3 px-1 font-mono font-bold text-slate-850">₹{item.amount.toLocaleString()}</td>
                      <td className="py-3 px-1 text-right text-[10px] text-rose-500 font-black uppercase tracking-wider">{item.dueDate}</td>
                    </tr>
                  ))}
                  {unpaidListItems.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-400 font-medium">No pending unpaid dues.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unpaid Summary footer */}
          <div className="bg-rose-50 border-t border-rose-100/50 px-5 py-3 flex justify-between items-center text-xs font-bold text-rose-800">
            <span className="flex items-center gap-1.5">
              <AlertCircle size={14} className="text-rose-500" />
              Unpaid Count: {unpaidListItems.length}
            </span>
            <span className="font-mono text-sm font-black">Total ₹ {totalUnpaidSum.toLocaleString()}</span>
          </div>

        </div>

      </div>

      {/* -------------------- 4. ALERT NOTE & RECYCLE BIN FOOTER -------------------- */}
      <div className="bg-blue-50/20 border border-blue-100 p-4.5 rounded-2xl flex items-center justify-center gap-2 text-blue-700 max-w-4xl mx-auto shadow-sm">
        <Info size={16} className="text-blue-500 flex-shrink-0" />
        <p className="text-xs font-bold">
          Tip: Use "Mark Paid" or "Mark Unpaid" in the Due List to move entries between Paid & Unpaid lists instantly.
        </p>
      </div>

      {/* Recycle Bin block */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => alert('Recycle Bin: Displaying archive payments logs database. No deleted items found.')}
          className="bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-655 font-extrabold px-6 py-4.5 rounded-2xl text-xs flex flex-col items-center gap-1 shadow-sm transition-all cursor-pointer min-w-[200px]"
        >
          <Trash2 size={16} className="text-slate-500" />
          <span className="mt-1">Recycle Bin</span>
          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">View all moved payments & history</span>
        </button>
      </div>

    </div>
  );
}
