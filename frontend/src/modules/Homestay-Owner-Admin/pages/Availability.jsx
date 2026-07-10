import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Share2,
  Calendar,
  Filter,
  Plus,
  Lock,
  RefreshCw,
  Home,
  CheckCircle,
  Clock,
  X,
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';

export default function Availability() {
  const navigate = useNavigate();
  
  // States
  const [selectedMonth, setSelectedMonth] = useState('May');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [roomTypeFilter, setRoomTypeFilter] = useState('All');
  
  // Booking Drawer & Modal States
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form states for Block Dates
  const [blockRoomType, setBlockRoomType] = useState('Super Deluxe');
  const [blockRoomNo, setBlockRoomNo] = useState('101');
  const [blockStartDate, setBlockStartDate] = useState('2024-05-08');
  const [blockEndDate, setBlockEndDate] = useState('2024-05-10');
  const [blockReason, setBlockReason] = useState('Maintenance');

  // Form states for Quick Create Booking
  const [createGuestName, setCreateGuestName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createRoomNo, setCreateRoomNo] = useState('101');
  const [createCheckIn, setCreateCheckIn] = useState('2024-05-14');
  const [createCheckOut, setCreateCheckOut] = useState('2024-05-17');

  // Day columns (May 1 to May 17, matching mockup exactly)
  const days = Array.from({ length: 17 }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `2024-05-${dayNum.toString().padStart(2, '0')}`;
    const dateObj = new Date(dateStr);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      day: dayNum.toString().padStart(2, '0'),
      name: dayNames[dateObj.getDay()],
      dateString: dateStr,
      isWeekend: dateObj.getDay() === 0 // Sunday matching mockup red header
    };
  });

  // Mock Calendar Booking & Block data matching screenshot exactly
  const [events, setEvents] = useState([
    // Room 101 bookings
    {
      id: 'B1',
      room: '101',
      type: 'booked',
      guestName: 'Rahul Sharma',
      bookingId: '332',
      startDay: 3, // May 3
      endDay: 6, // May 6 (inclusive check-out)
      color: 'bg-sky-100 border-sky-300 text-sky-700'
    },
    {
      id: 'M1',
      room: '101',
      type: 'maintenance',
      startDay: 8,
      endDay: 9,
      color: 'bg-rose-600 text-white border-rose-700'
    },
    {
      id: 'O1',
      room: '101',
      type: 'blocked_owner',
      startDay: 12,
      endDay: 12,
      color: 'bg-amber-500 text-white border-amber-600'
    },
    // Room 102
    {
      id: 'M2',
      room: '102',
      type: 'maintenance',
      startDay: 9,
      endDay: 10,
      color: 'bg-rose-600 text-white border-rose-700'
    },
    // Room 103
    {
      id: 'M3',
      room: '103',
      type: 'maintenance',
      startDay: 5,
      endDay: 8,
      color: 'bg-rose-600 text-white border-rose-700'
    },
    {
      id: 'M4',
      room: '103',
      type: 'maintenance',
      startDay: 13,
      endDay: 15,
      color: 'bg-rose-600 text-white border-rose-700'
    },
    // Room 104
    {
      id: 'B2',
      room: '104',
      type: 'booked',
      guestName: 'Neha Gupta',
      bookingId: '127',
      startDay: 8,
      endDay: 11,
      color: 'bg-sky-100 border-sky-300 text-sky-700'
    },
    // Room 201
    {
      id: 'M5',
      room: '201',
      type: 'maintenance',
      startDay: 6,
      endDay: 9,
      color: 'bg-rose-600 text-white border-rose-700'
    },
    // Room 202
    {
      id: 'O2',
      room: '202',
      type: 'blocked_owner',
      startDay: 5,
      endDay: 5,
      color: 'bg-amber-500 text-white border-amber-600'
    },
    {
      id: 'O3',
      room: '202',
      type: 'blocked_owner',
      startDay: 11,
      endDay: 12,
      color: 'bg-amber-500 text-white border-amber-600'
    },
    // Room 203
    {
      id: 'B3',
      room: '203',
      type: 'booked',
      guestName: 'Priya Singh',
      bookingId: '231',
      startDay: 7,
      endDay: 10,
      color: 'bg-sky-100 border-sky-300 text-sky-700'
    },
    {
      id: 'M6',
      room: '203',
      type: 'maintenance',
      startDay: 13,
      endDay: 14,
      color: 'bg-rose-600 text-white border-rose-700'
    },
    // Room 304
    {
      id: 'O4',
      room: '304',
      type: 'blocked_owner',
      startDay: 1,
      endDay: 1,
      color: 'bg-amber-500 text-white border-amber-600'
    },
    {
      id: 'M7',
      room: '304',
      type: 'maintenance',
      startDay: 8,
      endDay: 13,
      color: 'bg-rose-600 text-white border-rose-700'
    }
  ]);

  // Categories Structure matching client layout exactly
  const categories = [
    {
      name: 'Super Deluxe',
      roomsCount: 4,
      rooms: ['101', '102', '103', '104']
    },
    {
      name: 'Deluxe',
      roomsCount: 2,
      rooms: ['201', '202']
    },
    {
      name: 'Non-View',
      roomsCount: 3,
      rooms: ['203', '303', '304']
    }
  ];

  // Helper to determine cell occupancy state
  const getCellEvent = (roomNo, dayNum) => {
    return events.find(e => e.room === roomNo && dayNum >= e.startDay && dayNum <= e.endDay);
  };

  const handleCellClick = (roomNo, dayNum) => {
    const activeEvent = getCellEvent(roomNo, dayNum);
    if (activeEvent) {
      if (activeEvent.type === 'booked') {
        setSelectedBooking({
          id: `HB${activeEvent.bookingId}`,
          guestName: activeEvent.guestName,
          roomNo: activeEvent.room,
          checkIn: 'May 03, 2024',
          checkOut: 'May 06, 2024',
          phone: '+91 9876543210',
          adults: 2,
          children: 1,
          status: 'Confirmed',
          due: '₹ 1,500'
        });
      } else {
        alert(`${activeEvent.type.replace('_', ' ').toUpperCase()} Block in Room ${roomNo}`);
      }
    } else {
      // Empty cell clicks trigger booking modal
      setCreateRoomNo(roomNo);
      setCreateCheckIn(`2024-05-${dayNum.toString().padStart(2, '0')}`);
      setCreateCheckOut(`2024-05-${(dayNum + 3).toString().padStart(2, '0')}`);
      setIsCreateModalOpen(true);
    }
  };

  const handleBlockSubmit = (e) => {
    e.preventDefault();
    const newBlock = {
      id: `BL-${Date.now()}`,
      room: blockRoomNo,
      type: blockReason === 'Maintenance' ? 'maintenance' : 'blocked_owner',
      startDay: parseInt(blockStartDate.split('-')[2]),
      endDay: parseInt(blockEndDate.split('-')[2]),
      color: blockReason === 'Maintenance' ? 'bg-rose-600 text-white border-rose-700' : 'bg-amber-500 text-white border-amber-600'
    };
    setEvents(prev => [...prev, newBlock]);
    setIsBlockModalOpen(false);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const newBooking = {
      id: `BK-${Date.now()}`,
      room: createRoomNo,
      type: 'booked',
      guestName: createGuestName || 'New Guest',
      bookingId: Math.floor(100 + Math.random() * 900).toString(),
      startDay: parseInt(createCheckIn.split('-')[2]),
      endDay: parseInt(createCheckOut.split('-')[2]),
      color: 'bg-sky-100 border-sky-300 text-sky-700'
    };
    setEvents(prev => [...prev, newBooking]);
    setIsCreateModalOpen(false);
    setCreateGuestName('');
    setCreatePhone('');
  };

  return (
    <div className="space-y-6 select-none font-sans pb-12">
      
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
        <span>Panchpokhari Homestay</span>
        <span>/</span>
        <span className="text-rose-700 font-extrabold">Room Availability</span>
      </div>

      {/* Header and Action button section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Room Availability / Calendar</h1>
          <p className="text-[10px] font-bold text-slate-400">
            Check and manage room availability for your homestay.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => alert('Availability link copied!')}
            className="px-4.5 py-2.5 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center gap-2 shadow-sm"
          >
            <Share2 size={13} className="text-rose-700" />
            <div className="text-left">
              <span className="block font-black leading-none text-rose-700">Share Availability</span>
              <span className="block text-[8px] text-slate-400 font-bold leading-none mt-0.5">Share calendar link with guests</span>
            </div>
          </button>

          <button
            onClick={() => alert('Jumping to Today...')}
            className="px-4.5 py-2.5 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center gap-1.5 shadow-sm"
          >
            <Calendar size={13} className="text-slate-400" />
            <span>Go to Today</span>
          </button>
        </div>
      </div>

      {/* FILTER SECTION */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
          {/* Select Month */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Select Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
            >
              <option value="May">May</option>
              <option value="June">June</option>
            </select>
          </div>

          {/* Select Year */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
            </select>
          </div>

          {/* Room Type */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Room Type</label>
            <select
              value={roomTypeFilter}
              onChange={(e) => setRoomTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
            >
              <option value="All">All Room Types</option>
              <option value="Super Deluxe">Super Deluxe</option>
              <option value="Deluxe">Deluxe</option>
              <option value="Non-View">Non-View</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => setIsBlockModalOpen(true)}
            className="px-5 py-2.5 border border-rose-700 hover:bg-rose-50/10 text-rose-707 font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white"
          >
            Block Dates
          </button>
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1 shadow-sm"
          >
            <Plus size={12} />
            <span>Create Booking</span>
          </button>
        </div>
      </div>

      {/* CALENDAR PMS GRID CARD */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Month Header Controller */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <button className="p-1 hover:bg-slate-200 rounded-lg cursor-pointer bg-white border border-slate-200 text-slate-500">
            <ChevronLeft size={13} />
          </button>
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{selectedMonth} {selectedYear}</span>
          <button className="p-1 hover:bg-slate-200 rounded-lg cursor-pointer bg-white border border-slate-200 text-slate-500">
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Scrollable grid viewport */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] font-black text-slate-500 bg-slate-50/20">
                <th className="py-3 px-4.5 border-r border-slate-100 w-44">Date</th>
                {days.map(d => (
                  <th 
                    key={d.day} 
                    className={`py-2 text-center border-r border-slate-100 w-16 leading-tight ${
                      d.isWeekend ? 'text-rose-600 bg-rose-50/5' : ''
                    }`}
                  >
                    <span className="block text-[8px] font-bold text-slate-400 uppercase">{d.name}</span>
                    <span className="block text-xs font-black">{d.day}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                if (roomTypeFilter !== 'All' && cat.name !== roomTypeFilter) return null;
                return (
                  <React.Fragment key={cat.name}>
                    {/* Category Divider row */}
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-black text-slate-600 uppercase tracking-wider">
                      <td colSpan={18} className="py-2 px-4.5">
                        🏨 {cat.name} <span className="text-slate-400 font-bold font-sans">({cat.roomsCount} Rooms)</span>
                      </td>
                    </tr>
                    
                    {/* Individual Room Rows */}
                    {cat.rooms.map((roomNo) => (
                      <tr key={roomNo} className="border-b border-slate-100 hover:bg-slate-50/10">
                        <td className="py-4 px-4.5 border-r border-slate-100 font-extrabold text-slate-800 text-xs">
                          {roomNo}
                        </td>
                        
                        {/* Day Cell blocks */}
                        {days.map((d) => {
                          const dayNum = parseInt(d.day);
                          const activeEvent = getCellEvent(roomNo, dayNum);
                          
                          // Handle cells occupied by event bars
                          if (activeEvent) {
                            // Render details only on the start day of the booking
                            if (activeEvent.startDay === dayNum) {
                              const colspan = activeEvent.endDay - activeEvent.startDay + 1;
                              
                              if (activeEvent.type === 'booked') {
                                return (
                                  <td 
                                    key={d.day}
                                    colSpan={colspan}
                                    onClick={() => handleCellClick(roomNo, dayNum)}
                                    className="py-1 px-1 border-r border-slate-100 cursor-pointer"
                                  >
                                    <div className="h-10 rounded-lg bg-sky-100 border border-sky-300 px-2 flex flex-col justify-center text-[9px] font-bold text-sky-700 leading-tight truncate">
                                      <span className="block font-black truncate">{activeEvent.guestName}</span>
                                      <span className="block text-[7px] text-sky-500 font-bold truncate">#{activeEvent.bookingId}</span>
                                    </div>
                                  </td>
                                );
                              } else if (activeEvent.type === 'maintenance') {
                                return (
                                  <td 
                                    key={d.day}
                                    colSpan={colspan}
                                    onClick={() => handleCellClick(roomNo, dayNum)}
                                    className="py-1 px-1 border-r border-slate-100 cursor-pointer"
                                  >
                                    <div className="h-10 rounded-lg bg-rose-600 text-white font-black text-[9px] flex items-center justify-center border-none">
                                      Blocked
                                    </div>
                                  </td>
                                );
                              } else {
                                return (
                                  <td 
                                    key={d.day}
                                    colSpan={colspan}
                                    onClick={() => handleCellClick(roomNo, dayNum)}
                                    className="py-1 px-1 border-r border-slate-100 cursor-pointer"
                                  >
                                    <div className="h-10 rounded-lg bg-amber-500 text-white font-black text-[9px] flex items-center justify-center border-none">
                                      Blocked
                                    </div>
                                  </td>
                                );
                              }
                            }
                            // Skip rendering column cells that are covered by colspan
                            return null;
                          }

                          // Render default available (mint green) cell
                          return (
                            <td 
                              key={d.day}
                              onClick={() => handleCellClick(roomNo, dayNum)}
                              className="p-1 border-r border-slate-100 cursor-pointer text-center bg-emerald-50/10 hover:bg-emerald-50/30 h-12"
                            />
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend color guides block */}
        <div className="p-4 border-t border-slate-100 flex flex-wrap gap-4.5 bg-slate-50/20 text-[9px] font-black uppercase tracking-wider">
          <div className="flex items-center gap-1.5 text-slate-707">
            <span className="w-3.5 h-3.5 rounded bg-emerald-50 border border-emerald-200 block" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-707">
            <span className="w-3.5 h-3.5 rounded bg-sky-100 border border-sky-300 block" />
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-707">
            <span className="w-3.5 h-3.5 rounded bg-rose-600 block" />
            <span>Blocked (Unavailable)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-707">
            <span className="w-3.5 h-3.5 rounded bg-amber-500 block" />
            <span>Blocked by Owner</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-707">
            <span className="w-3.5 h-3.5 rounded bg-slate-200 block" />
            <span>Not Available</span>
          </div>
        </div>
      </div>

      {/* TODAY'S SUMMARY BLOCKS */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider leading-none">Today's Summary <span className="text-slate-400 font-bold">(May 09, 2024)</span></h2>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Rooms */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Rooms</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-black rounded uppercase">All Types</span>
            </div>
            <span className="text-3xl font-black text-slate-800 leading-none">9</span>
          </div>

          {/* Available Rooms */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Available Rooms</span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-black rounded uppercase">55.6%</span>
            </div>
            <span className="text-3xl font-black text-slate-800 leading-none">5</span>
          </div>

          {/* Occupied Rooms */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Occupied Rooms</span>
              <span className="px-2 py-0.5 bg-sky-50/50 text-sky-600 text-[8px] font-black rounded uppercase">22.2%</span>
            </div>
            <span className="text-3xl font-black text-slate-800 leading-none">2</span>
          </div>

          {/* Blocked Rooms */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Blocked Rooms</span>
              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[8px] font-black rounded uppercase">22.2%</span>
            </div>
            <span className="text-3xl font-black text-slate-800 leading-none">2</span>
          </div>
        </div>
      </div>

      {/* Booking Detail Side Drawer Popup */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white border-l border-slate-150 w-full max-w-md h-full p-6 shadow-2xl space-y-6 flex flex-col justify-between">
            
            {/* Header info */}
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-slate-105 pb-3">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Booking Details</span>
                <button 
                  onClick={() => setSelectedBooking(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Guest card info */}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">{selectedBooking.guestName}</h3>
                    <span className="text-[9px] text-slate-400 font-bold block uppercase mt-0.5">Booking ID: #{selectedBooking.id}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase rounded-lg">
                    {selectedBooking.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-extrabold">{selectedBooking.phone}</span>
                  <a
                    href={`https://wa.me/${selectedBooking.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-5.5 h-5.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <MessageSquare size={10} className="stroke-[3]" />
                  </a>
                </div>
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Check-In</span>
                  <span className="block text-xs font-black text-slate-800 mt-1">{selectedBooking.checkIn}</span>
                </div>
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Check-Out</span>
                  <span className="block text-xs font-black text-slate-800 mt-1">{selectedBooking.checkOut}</span>
                </div>
              </div>

              {/* Room details */}
              <div className="grid grid-cols-3 gap-4 border-t border-slate-50 pt-4">
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Room No.</span>
                  <span className="block text-xs font-black text-slate-800 mt-1">{selectedBooking.roomNo}</span>
                </div>
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Adults</span>
                  <span className="block text-xs font-black text-slate-800 mt-1">{selectedBooking.adults} Guests</span>
                </div>
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Children</span>
                  <span className="block text-xs font-black text-slate-800 mt-1">{selectedBooking.children} Guests</span>
                </div>
              </div>

              {/* Due Details */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 flex justify-between items-center mt-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Remaining Due</span>
                <span className="text-sm font-black text-rose-700 font-mono">{selectedBooking.due}</span>
              </div>
            </div>

            {/* Footer Action buttons */}
            <div className="space-y-2 border-t border-slate-50 pt-4">
              <button
                onClick={() => {
                  setSelectedBooking(null);
                  navigate(`/homestay-owner/guests/${selectedBooking.id.replace('HB', '')}`);
                }}
                className="w-full py-3 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border-none flex items-center justify-center gap-1.5"
              >
                <span>View Full Details</span>
              </button>

              <button
                onClick={() => setSelectedBooking(null)}
                className="w-full py-3 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer bg-white"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Block Dates Configuration Modal */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleBlockSubmit} className="bg-white border border-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Block Dates</h4>
              <button type="button" onClick={() => setIsBlockModalOpen(false)} className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Room Type</label>
                <select
                  value={blockRoomType}
                  onChange={(e) => setBlockRoomType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                >
                  <option value="Super Deluxe">Super Deluxe</option>
                  <option value="Deluxe">Deluxe</option>
                  <option value="Non-View">Non-View</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Room Number</label>
                <select
                  value={blockRoomNo}
                  onChange={(e) => setBlockRoomNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                >
                  <option value="101">101</option>
                  <option value="102">102</option>
                  <option value="103">103</option>
                  <option value="104">104</option>
                  <option value="201">201</option>
                  <option value="202">202</option>
                  <option value="203">203</option>
                  <option value="304">304</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={blockStartDate}
                  onChange={(e) => setBlockStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={blockEndDate}
                  onChange={(e) => setBlockEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Reason</label>
              <select
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
              >
                <option value="Maintenance">Maintenance</option>
                <option value="Owner Block">Owner Block</option>
                <option value="Festival">Festival</option>
                <option value="Private Use">Private Use</option>
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="px-4.5 py-2 border border-slate-200 text-slate-707 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4.5 py-2 bg-rose-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none"
              >
                Block Dates
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Booking Wizard Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSubmit} className="bg-white border border-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Quick Create Booking</h4>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Guest Name</label>
              <input
                type="text"
                required
                value={createGuestName}
                onChange={(e) => setCreateGuestName(e.target.value)}
                placeholder="Priya Mehta"
                className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Phone Number</label>
              <input
                type="tel"
                required
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1 col-span-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Room No.</label>
                <select
                  value={createRoomNo}
                  onChange={(e) => setCreateRoomNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                >
                  <option value="101">101</option>
                  <option value="102">102</option>
                  <option value="103">103</option>
                  <option value="104">104</option>
                  <option value="201">201</option>
                  <option value="202">202</option>
                  <option value="203">203</option>
                  <option value="304">304</option>
                </select>
              </div>

              <div className="space-y-1 col-span-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Check-in</label>
                <input
                  type="date"
                  value={createCheckIn}
                  onChange={(e) => setCreateCheckIn(e.target.value)}
                  className="w-full px-2 py-2 border border-slate-205 rounded-xl text-[10px] font-bold text-slate-707 focus:outline-none"
                />
              </div>

              <div className="space-y-1 col-span-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Check-out</label>
                <input
                  type="date"
                  value={createCheckOut}
                  onChange={(e) => setCreateCheckOut(e.target.value)}
                  className="w-full px-2 py-2 border border-slate-205 rounded-xl text-[10px] font-bold text-slate-707 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4.5 py-2 border border-slate-200 text-slate-707 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4.5 py-2 bg-rose-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none"
              >
                Create Booking
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
