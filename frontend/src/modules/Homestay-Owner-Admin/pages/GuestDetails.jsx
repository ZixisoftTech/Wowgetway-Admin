import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  XCircle, 
  Calendar, 
  Edit, 
  MessageSquare, 
  Users, 
  Baby, 
  Home, 
  DollarSign, 
  CheckCircle,
  FileText,
  Clock,
  Printer,
  Save
} from 'lucide-react';

export default function GuestDetails() {
  const navigate = useNavigate();
  const { guestId } = useParams();

  // Guest details state
  const [guest, setGuest] = useState({
    id: guestId || 'HB4243',
    name: 'Priya Mehta',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    phone: '+91 9876543210',
    email: 'priya.mehta@example.com',
    adults: 2,
    child5_9: 1,
    child0_4: 0,
    rooms: [
      { name: 'Deluxe Room', type: 'Room Type 1', number: '203' },
      { name: 'Deluxe Room', type: 'Room Type 2', number: '204' }
    ],
    checkInDate: 'Apr 20, 2024',
    checkInTime: '02:00 PM',
    checkOutDate: 'Apr 23, 2024',
    checkOutTime: '11:00 AM',
    totalAmount: '₹ 8,700',
    advanceReceived: '₹ 7,000',
    totalDue: '₹ 1,700',
    comments: ''
  });

  const [note, setNote] = useState('');
  const [savedNotes, setSavedNotes] = useState([]);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const handleSaveNote = () => {
    if (note.trim()) {
      setSavedNotes([...savedNotes, note]);
      setNote('');
      alert('Note saved successfully!');
    }
  };

  const handleCancelBooking = () => {
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = () => {
    setIsCancelModalOpen(false);
    alert('Booking cancelled successfully!');
    navigate('/homestay-owner/guests');
  };

  return (
    <div className="space-y-6 select-none font-sans pb-12">
      
      {/* Top Header Card */}
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <button 
          onClick={() => navigate('/homestay-owner/guests')}
          className="hover:text-slate-600 bg-transparent border-none cursor-pointer flex items-center gap-1 p-0 text-[10px] font-black uppercase text-slate-400"
        >
          <ArrowLeft size={10} className="stroke-[3]" />
          <span>Back</span>
        </button>
        <span>/</span>
        <span>Dashboard</span>
        <span>/</span>
        <span>Today's Check-ins</span>
        <span>/</span>
        <span className="text-rose-700 font-extrabold">Guest Details</span>
      </div>

      {/* Main card */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="flex items-center gap-4.5">
          <div className="w-18 h-18 rounded-full overflow-hidden border border-slate-150">
            <img src={guest.photo} alt={guest.name} className="w-full h-full object-cover" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-800 leading-none">{guest.name}</h2>
            <span className="block text-[10px] text-slate-400 font-bold uppercase">Booking ID: #{guest.id}</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500 font-extrabold">{guest.phone}</span>
              <a 
                href={`https://wa.me/${guest.phone.replace(/[^0-9]/g, '')}`}
                target="_blank" 
                rel="noreferrer"
                className="w-5.5 h-5.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <MessageSquare size={10} className="stroke-[3]" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={handleCancelBooking}
            className="flex-1 md:flex-none px-4.5 py-3 border border-rose-600 hover:bg-rose-50/10 text-rose-700 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center justify-center gap-1.5"
          >
            <XCircle size={13} />
            <span>Cancel Booking</span>
          </button>
          
          <button
            onClick={() => alert('Rescheduling calendar dates...')}
            className="flex-1 md:flex-none px-4.5 py-3 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center justify-center gap-1.5"
          >
            <Clock size={13} className="text-slate-400" />
            <span>Reschedule Booking</span>
          </button>

          <button
            onClick={() => alert('Editing guest details...')}
            className="w-full md:w-auto px-4.5 py-3 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center justify-center gap-1.5"
          >
            <Edit size={13} className="text-slate-400" />
            <span>Edit Guest Details</span>
          </button>
        </div>
      </div>

      {/* Stats row & Room Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5.5">
        
        {/* Total Adults */}
        <div className="lg:col-span-3 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-rose-700 stroke-[2.2]" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Adults</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block leading-none">10+ Years</span>
            <span className="text-3xl font-black text-rose-700 leading-none block">{guest.adults}</span>
          </div>
        </div>

        {/* Total Child 5-9 */}
        <div className="lg:col-span-3 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Baby size={16} className="text-amber-500 stroke-[2.2]" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Child</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block leading-none">5-9 Years</span>
            <span className="text-3xl font-black text-amber-500 leading-none block">{guest.child5_9}</span>
          </div>
        </div>

        {/* Total Child 0-4 */}
        <div className="lg:col-span-3 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Baby size={16} className="text-emerald-500 stroke-[2.2]" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Child</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block leading-none">0-4 Years</span>
            <span className="text-3xl font-black text-emerald-500 leading-none block">{guest.child0_4}</span>
          </div>
        </div>

        {/* Room Details list */}
        <div className="lg:col-span-3 bg-white border border-slate-100 p-5.5 rounded-2xl shadow-sm space-y-4.5">
          <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Room Details</span>
            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[8px] font-black uppercase rounded">
              Total Rooms: {guest.rooms.length}
            </span>
          </div>
          
          <div className="space-y-3">
            {guest.rooms.map((room, idx) => (
              <div key={idx} className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-150">
                <div className="flex items-center gap-2">
                  <Home size={13} className="text-slate-400" />
                  <div className="space-y-0.5">
                    <span className="block text-[10px] font-black text-slate-800 leading-none">{room.name}</span>
                    <span className="block text-[8px] text-slate-400 font-bold">{room.type}</span>
                  </div>
                </div>
                <span className="text-sm font-black text-slate-800">{room.number}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Check-In / Out Details & Payment row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5.5 items-start">
        
        {/* Check in / Check out */}
        <div className="lg:col-span-6 grid grid-cols-2 gap-5.5">
          
          {/* Check-in */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4.5">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <Calendar size={14} className="text-rose-700" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Check-In</span>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-black text-slate-800 block">{guest.checkInDate}</span>
              <span className="text-[10px] font-semibold text-slate-400 block">⏰ {guest.checkInTime}</span>
            </div>
          </div>

          {/* Check-out */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4.5">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <Calendar size={14} className="text-emerald-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Check-Out</span>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-black text-slate-800 block">{guest.checkOutDate}</span>
              <span className="text-[10px] font-semibold text-slate-400 block">⏰ {guest.checkOutTime}</span>
            </div>
          </div>

        </div>

        {/* Payment details grid */}
        <div className="lg:col-span-6 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-5.5">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 leading-none">
            <DollarSign size={14} className="text-rose-700" />
            <span>Payment Details</span>
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-center">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Total Amount</span>
              <span className="text-sm font-black text-slate-707 block mt-1.5 leading-none font-mono">{guest.totalAmount}</span>
            </div>
            <div className="p-3 bg-emerald-50/20 border border-emerald-150 rounded-xl text-center">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Advance Received</span>
              <span className="text-sm font-black text-emerald-600 block mt-1.5 leading-none font-mono">{guest.advanceReceived}</span>
            </div>
            <div className="p-3 bg-rose-50/20 border border-rose-150 rounded-xl text-center">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Total Due</span>
              <span className="text-sm font-black text-rose-700 block mt-1.5 leading-none font-mono">{guest.totalDue}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Notes & Comments card */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 leading-none">
          <FileText size={14} className="text-slate-400" />
          <span>Comments</span>
        </h3>

        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for the guest's stay preferences or special requests..."
          className="w-full px-4 py-3 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
        />

        <div className="flex justify-end">
          <button
            onClick={handleSaveNote}
            className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5"
          >
            <Save size={12} />
            <span>Save Note</span>
          </button>
        </div>
      </div>

      {/* Booking Actions Row */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-wrap gap-2.5">
        <button
          onClick={() => alert('Collecting balance amount...')}
          className="px-5 py-3 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5"
        >
          <CheckCircle size={13} />
          <span>Collect Balance</span>
        </button>
        
        <button
          onClick={() => alert('Checking out guest Priya Mehta...')}
          className="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5"
        >
          <XCircle size={13} />
          <span>Check Out Guest</span>
        </button>

        <button
          onClick={() => window.print()}
          className="px-5 py-3 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center justify-center gap-1.5"
        >
          <Printer size={13} className="text-slate-400" />
          <span>Print Receipt</span>
        </button>
      </div>

      {/* Cancel Booking Confirmation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Cancel Booking</h4>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">
              Are you sure you want to cancel booking #{guest.id} for guest Priya Mehta? This action will mark the booking as cancelled.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-707 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
