import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Search, 
  ArrowLeft, 
  Check, 
  X, 
  Info, 
  Calendar,
  Clock,
  User,
  AlertTriangle,
  Download,
  ChevronLeft,
  ChevronRight,
  Home,
  Briefcase
} from 'lucide-react';

const API_ATTENDANCE_URL = 'https://wow-getway-api.onrender.com/api/dashboard/attendance';

export default function AttendanceManagement() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'history'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  
  // Date and filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Mark Attendance Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [activeEmpRecord, setActiveEmpRecord] = useState(null);
  const [modalForm, setModalForm] = useState({
    status: 'Present',
    loginTime: '09:00',
    logoutTime: '18:00',
    notes: ''
  });

  // Calendar View month state (for history page)
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth()); // 0-indexed

  // 1. Fetch queries
  const { data: attendanceList = [], isLoading: listLoading } = useQuery({
    queryKey: ['attendanceList', selectedDate],
    queryFn: async () => {
      const response = await axios.get(`${API_ATTENDANCE_URL}?date=${selectedDate}`);
      return response.data;
    }
  });

  const { data: employeeHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['employeeHistory', selectedEmployeeId],
    queryFn: async () => {
      const response = await axios.get(`${API_ATTENDANCE_URL}/employee/${selectedEmployeeId}`);
      return response.data;
    },
    enabled: !!selectedEmployeeId
  });

  // Get selected employee info
  const selectedEmployeeObj = attendanceList.find(item => item.employee._id === selectedEmployeeId)?.employee;

  // 2. Mutations
  const saveAttendanceMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await axios.post(API_ATTENDANCE_URL, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['attendanceList', selectedDate]);
      if (selectedEmployeeId) {
        queryClient.invalidateQueries(['employeeHistory', selectedEmployeeId]);
      }
      setModalOpen(false);
      setActiveEmpRecord(null);
    }
  });

  // Compute metrics for top KPI cards (today)
  const getTodayKPIs = () => {
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let onLeave = 0;

    attendanceList.forEach(item => {
      const status = item.attendance.status;
      if (status === 'Present' || status === 'Work From Home' || status === 'Late') present++;
      else if (status === 'Absent') absent++;
      else if (status === 'Half Day') halfDay++;
      else if (status === 'On Leave' || status === 'Sick Leave') onLeave++;
    });

    return { present, absent, halfDay, onLeave };
  };

  const todayKPIs = getTodayKPIs();

  // Export features
  const exportToCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Employee ID,First Name,Last Name,Role,Status,Login Time,Logout Time,Working Hours,Notes\n';
    
    filteredAttendance.forEach(item => {
      const emp = item.employee;
      const att = item.attendance;
      csvContent += `"${emp._id}","${emp.firstName}","${emp.lastName}","${emp.role}","${att.status}","${att.loginTime}","${att.logoutTime}",${att.workingHours},"${att.notes || ''}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter computations
  const filteredAttendance = attendanceList.filter(item => {
    const fullName = `${item.employee.firstName || ''} ${item.employee.lastName || ''}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesQuery = fullName.includes(query) || (item.employee.role || '').toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'All' || item.attendance.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  // Trigger mark attendance modal
  const handleMarkAttendanceClick = (item) => {
    setActiveEmpRecord(item);
    setModalForm({
      status: item.attendance.status || 'Present',
      loginTime: item.attendance.loginTime || '09:00',
      logoutTime: item.attendance.logoutTime || '18:00',
      notes: item.attendance.notes || ''
    });
    setModalOpen(true);
  };

  const handleModalSave = (e) => {
    e.preventDefault();
    if (!activeEmpRecord) return;

    // Calculate working hours
    let workingHours = 0;
    if (['Present', 'Half Day', 'Work From Home', 'Late'].includes(modalForm.status)) {
      const [linH, linM] = modalForm.loginTime.split(':').map(Number);
      const [loutH, loutM] = modalForm.logoutTime.split(':').map(Number);
      if (linH !== undefined && loutH !== undefined) {
        const diffHrs = (loutH + loutM / 60) - (linH + linM / 60);
        workingHours = Math.max(0, parseFloat(diffHrs.toFixed(2)));
      }
    }

    saveAttendanceMutation.mutate({
      employeeId: activeEmpRecord.employee._id,
      date: selectedDate,
      status: modalForm.status,
      loginTime: ['Absent', 'On Leave', 'Sick Leave'].includes(modalForm.status) ? '' : modalForm.loginTime,
      logoutTime: ['Absent', 'On Leave', 'Sick Leave'].includes(modalForm.status) ? '' : modalForm.logoutTime,
      workingHours: ['Absent', 'On Leave', 'Sick Leave'].includes(modalForm.status) ? 0 : workingHours,
      notes: modalForm.notes
    });
  };

  // Compute employee monthly history summary metrics
  const getHistoryMetrics = () => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let halfDay = 0;
    let wfh = 0;

    employeeHistory.forEach(r => {
      const status = r.status;
      if (status === 'Present' || status === 'Late') present++;
      else if (status === 'Absent') absent++;
      else if (status === 'On Leave' || status === 'Sick Leave') leave++;
      else if (status === 'Half Day') halfDay++;
      else if (status === 'Work From Home') wfh++;
    });

    const totalDays = present + absent + leave + halfDay + wfh;
    const rate = totalDays > 0 ? ((present + wfh + 0.5 * halfDay) / totalDays * 100).toFixed(1) : '0';

    return { present, absent, leave, halfDay, wfh, rate, totalDays };
  };

  const historyMetrics = getHistoryMetrics();

  // Calendar rendering computations
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const renderCalendarDays = () => {
    const totalDays = getDaysInMonth(calYear, calMonth);
    const firstDayIndex = getFirstDayOfMonth(calYear, calMonth);
    const dayCells = [];

    // Empty offset cells
    for (let i = 0; i < firstDayIndex; i++) {
      dayCells.push(<div key={`empty-${i}`} className="h-14 bg-slate-50/50 border border-slate-100 rounded-lg opacity-40" />);
    }

    // Days grid
    for (let day = 1; day <= totalDays; day++) {
      const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = employeeHistory.find(r => {
        const rDate = new Date(r.date);
        return (
          rDate.getFullYear() === calYear &&
          rDate.getMonth() === calMonth &&
          rDate.getDate() === day
        );
      });

      // Status indicator styles
      let cellDotColor = '';
      if (record) {
        if (record.status === 'Present' || record.status === 'Late') cellDotColor = 'bg-emerald-500';
        else if (record.status === 'Absent') cellDotColor = 'bg-rose-500';
        else if (record.status === 'Half Day') cellDotColor = 'bg-amber-500';
        else if (record.status === 'On Leave' || record.status === 'Sick Leave') cellDotColor = 'bg-blue-500';
        else if (record.status === 'Work From Home') cellDotColor = 'bg-purple-500';
      }

      dayCells.push(
        <div key={`day-${day}`} className="h-14 p-2 bg-white border border-slate-100 rounded-xl shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all cursor-pointer relative group">
          <span className="text-[10px] font-bold text-slate-500">{day}</span>
          
          {record && (
            <div className="flex items-center justify-between">
              {/* Colored Dot indicator */}
              <span className={`w-2 h-2 rounded-full ${cellDotColor}`} />
              <span className="text-[8px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bottom-1 bg-white px-1">
                {record.status === 'Work From Home' ? 'WFH' : record.status}
              </span>
            </div>
          )}
        </div>
      );
    }

    return dayCells;
  };

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(prev => prev - 1);
    } else {
      setCalMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(prev => prev + 1);
    } else {
      setCalMonth(prev => prev + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Fade up layout transitions
  const layoutVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* -------------------- 1. ATTENDANCE DASHBOARD VIEW -------------------- */}
      {viewMode === 'list' && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6 sm:space-y-8">
          
          {/* Header Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
                Attendance Management
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Track and manage employee attendance records.
              </p>
            </div>
          </div>

          {/* Top KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div className="bg-[#ecfbf3] p-5 rounded-2xl border border-emerald-50 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Present Today</span>
                <span className="text-xl font-black text-slate-800 block">{todayKPIs.present}</span>
                <span className="text-[9px] text-slate-400 font-semibold block">Office & WFH combined</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                <Check size={20} className="stroke-[2.5]" />
              </div>
            </div>

            <div className="bg-[#fff0f4] p-5 rounded-2xl border border-rose-50 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Absent Today</span>
                <span className="text-xl font-black text-slate-800 block">{todayKPIs.absent}</span>
                <span className="text-[9px] text-slate-400 font-semibold block">Unmarked / Absent</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-rose-500 shadow-sm">
                <X size={20} className="stroke-[2.5]" />
              </div>
            </div>

            <div className="bg-[#fffbf0] p-5 rounded-2xl border border-amber-50 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Half Day Today</span>
                <span className="text-xl font-black text-slate-800 block">{todayKPIs.halfDay}</span>
                <span className="text-[9px] text-slate-400 font-semibold block">4 Hours logged</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-500 shadow-sm">
                <span className="font-extrabold text-xs">½</span>
              </div>
            </div>

            <div className="bg-[#edf4ff] p-5 rounded-2xl border border-blue-50 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">On Leave Today</span>
                <span className="text-xl font-black text-slate-800 block">{todayKPIs.onLeave}</span>
                <span className="text-[9px] text-slate-400 font-semibold block">Approved leaves</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-500 shadow-sm">
                <Calendar size={18} className="stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* Filter Section Card */}
          <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4.5 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1 max-w-2xl">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search employee name or role..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all"
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-650 rounded-xl focus:outline-none focus:ring-2 shadow-sm cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Half Day">Half Day</option>
                <option value="On Leave">On Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Work From Home">Work From Home</option>
                <option value="Late">Late</option>
              </select>
            </div>

            {/* Date Picker & Export */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-650 rounded-xl focus:outline-none focus:ring-2 shadow-sm cursor-pointer"
              />
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1.5 px-4.5 py-2.5 border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>Export Report</span>
              </button>
            </div>
          </div>

          {/* Main Attendance Table */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Login Time</th>
                    <th className="py-4 px-6 text-center">Logout Time</th>
                    <th className="py-4 px-6 text-center">Working Hours</th>
                    <th className="py-4 px-6">Notes / Remarks</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                  {listLoading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        Loading daily attendance coordinates...
                      </td>
                    </tr>
                  ) : filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-450">
                        No employees found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map(item => {
                      const emp = item.employee;
                      const att = item.attendance;

                      // Badge color mapping
                      let badgeStyle = 'bg-slate-100 text-slate-650';
                      if (att.status === 'Present') badgeStyle = 'bg-emerald-50 text-emerald-700';
                      else if (att.status === 'Absent') badgeStyle = 'bg-rose-50 text-rose-700';
                      else if (att.status === 'Half Day') badgeStyle = 'bg-amber-50 text-amber-700';
                      else if (att.status === 'On Leave' || att.status === 'Sick Leave') badgeStyle = 'bg-blue-50 text-blue-700';
                      else if (att.status === 'Work From Home') badgeStyle = 'bg-purple-50 text-purple-700';
                      else if (att.status === 'Late') badgeStyle = 'bg-orange-50 text-orange-700';

                      return (
                        <tr key={emp._id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-4 px-6">
                            <div 
                              onClick={() => { setSelectedEmployeeId(emp._id); setViewMode('history'); }}
                              className="flex items-center gap-3 cursor-pointer group"
                            >
                              <img
                                src={emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                                alt={`${emp.firstName} ${emp.lastName}`}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-100 flex-shrink-0"
                              />
                              <div>
                                <span className="font-bold text-slate-800 group-hover:text-blue-600 block transition-colors">
                                  {emp.firstName} {emp.lastName}
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold block">{emp.role}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide ${badgeStyle}`}>
                              {att.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center text-slate-600 font-medium">
                            {att.loginTime || '- - : - -'}
                          </td>
                          <td className="py-4 px-6 text-center text-slate-600 font-medium">
                            {att.logoutTime || '- - : - -'}
                          </td>
                          <td className="py-4 px-6 text-center text-slate-800 font-bold">
                            {att.workingHours > 0 ? `${att.workingHours} hrs` : '-'}
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-medium max-w-xs truncate">
                            {att.notes || '-'}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleMarkAttendanceClick(item)}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-md shadow-blue-100"
                            >
                              Mark Attendance
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Showing {filteredAttendance.length} of {attendanceList.length} employees</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* -------------------- 2. ATTENDANCE HISTORY VIEW -------------------- */}
      {viewMode === 'history' && selectedEmployeeObj && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6 pb-20">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setViewMode('list'); setSelectedEmployeeId(null); }}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl bg-white border border-slate-200 transition-colors shadow-sm cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
                  Attendance History Profile
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Detailed inspection of employee monthly statistics and calendars.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Left Column: Profile Bio & Monthly Statistics Summary */}
            <div className="lg:col-span-1 space-y-6 sm:space-y-8">
              
              {/* Profile Card */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={selectedEmployeeObj.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={selectedEmployeeObj.firstName}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-150 shadow-sm flex-shrink-0"
                  />
                  <div>
                    <h3 className="text-sm font-black text-slate-850 leading-none">
                      {selectedEmployeeObj.firstName} {selectedEmployeeObj.lastName}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1 uppercase tracking-wider">{selectedEmployeeObj.role}</span>
                    <span className="text-[9px] text-slate-400 font-medium block mt-0.5">#{selectedEmployeeObj._id}</span>
                  </div>
                </div>

                <div className="border-t border-slate-50 pt-3 space-y-2 text-xs font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Department</span>
                    <span>{selectedEmployeeObj.department || 'Operations'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mobile</span>
                    <span>{selectedEmployeeObj.mobile}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email</span>
                    <span>{selectedEmployeeObj.email}</span>
                  </div>
                </div>
              </div>

              {/* Monthly Stats KPI Summary Card */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-indigo-650 uppercase tracking-widest border-b border-slate-50 pb-2.5">
                  Monthly statistics overview
                </h4>

                <div className="space-y-3.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-slate-600">Present Days</span>
                    </div>
                    <span className="text-xs font-black text-slate-800">{historyMetrics.present} Days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-xs font-bold text-slate-600">Absent Days</span>
                    </div>
                    <span className="text-xs font-black text-slate-800">{historyMetrics.absent} Days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-slate-600">Half Days logged</span>
                    </div>
                    <span className="text-xs font-black text-slate-800">{historyMetrics.halfDay} Days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-xs font-bold text-slate-600">Leave Days</span>
                    </div>
                    <span className="text-xs font-black text-slate-800">{historyMetrics.leave} Days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-xs font-bold text-slate-600">WFH Days</span>
                    </div>
                    <span className="text-xs font-black text-slate-800">{historyMetrics.wfh} Days</span>
                  </div>

                  <div className="border-t border-slate-50 pt-3.5 flex justify-between items-center">
                    <span className="text-xs font-black text-slate-700">Attendance Rate</span>
                    <span className="text-base font-black text-emerald-600">{historyMetrics.rate}%</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Calendar grid & History table */}
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              
              {/* Card 1: Monthly Attendance Calendar View */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest text-indigo-600">
                    Monthly Calendar View
                  </h3>
                  
                  {/* Month Switcher Controls */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handlePrevMonth}
                      className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs font-bold text-slate-700 min-w-28 text-center">
                      {monthNames[calMonth]} {calYear}
                    </span>
                    <button 
                      onClick={handleNextMonth}
                      className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Calendar Days Header */}
                <div className="grid grid-cols-7 gap-2 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {renderCalendarDays()}
                </div>

                {/* Calendar Indicators Legend */}
                <div className="flex flex-wrap justify-center gap-4 pt-3 text-[10px] font-bold text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Present</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>Absent</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Half Day</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>Leave</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span>WFH</span>
                  </div>
                </div>
              </div>

              {/* Card 2: History Table */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest text-indigo-600">
                    Logged Attendance Records
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-4 px-6">Date</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-center">Login Time</th>
                        <th className="py-4 px-6 text-center">Logout Time</th>
                        <th className="py-4 px-6 text-center">Working Hours</th>
                        <th className="py-4 px-6">Remarks Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                      {historyLoading ? (
                        <tr>
                          <td colSpan="6" className="py-12 text-center text-slate-400">
                            Loading history profile...
                          </td>
                        </tr>
                      ) : employeeHistory.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-12 text-center text-slate-450">
                            No logs submitted for this employee.
                          </td>
                        </tr>
                      ) : (
                        employeeHistory.map(r => {
                          const dateObj = new Date(r.date);
                          const dateText = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
                          
                          let badgeStyle = 'bg-slate-100 text-slate-655';
                          if (r.status === 'Present') badgeStyle = 'bg-emerald-50 text-emerald-700';
                          else if (r.status === 'Absent') badgeStyle = 'bg-rose-50 text-rose-700';
                          else if (r.status === 'Half Day') badgeStyle = 'bg-amber-50 text-amber-700';
                          else if (r.status === 'On Leave' || r.status === 'Sick Leave') badgeStyle = 'bg-blue-50 text-blue-700';
                          else if (r.status === 'Work From Home') badgeStyle = 'bg-purple-50 text-purple-700';
                          else if (r.status === 'Late') badgeStyle = 'bg-orange-50 text-orange-700';

                          return (
                            <tr key={r._id} className="hover:bg-slate-50/20 transition-colors">
                              <td className="py-3.5 px-6 font-bold text-slate-800">{dateText}</td>
                              <td className="py-3.5 px-6 text-center">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${badgeStyle}`}>
                                  {r.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-6 text-center text-slate-600">{r.loginTime || '-'}</td>
                              <td className="py-3.5 px-6 text-center text-slate-600">{r.logoutTime || '-'}</td>
                              <td className="py-3.5 px-6 text-center text-slate-800 font-bold">
                                {r.workingHours > 0 ? `${r.workingHours} hrs` : '-'}
                              </td>
                              <td className="py-3.5 px-6 text-slate-500 font-medium max-w-xs truncate">{r.notes || '-'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        </motion.div>
      )}

      {/* -------------------- 3. MARK ATTENDANCE MODAL DIALOG -------------------- */}
      <AnimatePresence>
        {modalOpen && activeEmpRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Modal Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => { setModalOpen(false); setActiveEmpRecord(null); }}
            />

            {/* Modal Box Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-[95%] sm:w-[90%] md:w-[780px] max-h-[80vh] flex flex-col z-10 overflow-hidden relative"
            >
              
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-100 px-4 py-3 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <img
                    src={activeEmpRecord.employee.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={activeEmpRecord.employee.firstName}
                    className="w-7 h-7 rounded-full object-cover border border-slate-150 flex-shrink-0"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-bold text-slate-900 leading-none">
                      {activeEmpRecord.employee.firstName} {activeEmpRecord.employee.lastName}
                    </h3>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider px-1.5 py-0.5 bg-slate-50 border border-slate-150 rounded">
                      {activeEmpRecord.employee.role}
                    </span>
                    <span className="text-[9px] text-blue-600 font-black uppercase tracking-wider px-1.5 py-0.5 bg-blue-50/50 border border-blue-100 rounded">
                      {selectedDate}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { setModalOpen(false); setActiveEmpRecord(null); }}
                  className="p-1 text-slate-400 hover:text-slate-650 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form wrapping body and footer */}
              <form onSubmit={handleModalSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                
                {/* Scrollable Body */}
                <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
                  
                  {/* Warning Alert banner */}
                  <div className="bg-amber-50/50 border border-amber-100 px-3 py-1.5 rounded-lg flex items-center gap-2 text-amber-800 flex-shrink-0">
                    <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />
                    <p className="text-[10px] font-semibold leading-relaxed">
                      Updating attendance will overwrite any existing attendance record for this date.
                    </p>
                  </div>

                  {/* Custom status selector cards */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                      Choose Attendance Status *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                      {[
                        { key: 'Present', label: '✓ Present', style: 'border-emerald-200 hover:bg-emerald-50/25', activeStyle: 'border-emerald-500 bg-emerald-50/20 text-emerald-800' },
                        { key: 'Absent', label: '✕ Absent', style: 'border-rose-200 hover:bg-rose-50/25', activeStyle: 'border-rose-500 bg-rose-50/20 text-rose-800' },
                        { key: 'Half Day', label: '½ Half Day', style: 'border-amber-200 hover:bg-amber-50/25', activeStyle: 'border-amber-500 bg-amber-50/20 text-amber-800' },
                        { key: 'On Leave', label: '🏖 Leave', style: 'border-blue-200 hover:bg-blue-50/25', activeStyle: 'border-blue-500 bg-blue-50/20 text-blue-800' },
                        { key: 'Sick Leave', label: '🤒 Sick Leave', style: 'border-indigo-200 hover:bg-indigo-50/25', activeStyle: 'border-indigo-500 bg-indigo-50/20 text-indigo-800' },
                        { key: 'Work From Home', label: '🏠 Work From Home', style: 'border-purple-200 hover:bg-purple-50/25', activeStyle: 'border-purple-500 bg-purple-50/20 text-purple-800' }
                      ].map(card => {
                        const isActive = modalForm.status === card.key;
                        return (
                          <div
                            key={card.key}
                            onClick={() => setModalForm(prev => ({ ...prev, status: card.key }))}
                            className={`border py-1.5 px-0.5 rounded-xl text-center text-[10px] sm:text-xs font-bold tracking-wide cursor-pointer transition-all whitespace-nowrap ${
                              isActive ? card.activeStyle + ' shadow-sm' : 'border-slate-200 text-slate-600 ' + card.style
                            }`}
                          >
                            {card.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time section (Visible when status requires time input) */}
                  {['Present', 'Half Day', 'Work From Home', 'Late'].includes(modalForm.status) && (
                    <div className="grid grid-cols-2 gap-3 border-t border-slate-50 pt-2.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                          Login / Check-In Time *
                        </label>
                        <div className="relative">
                          <input
                            type="time"
                            required
                            value={modalForm.loginTime}
                            onChange={(e) => setModalForm(prev => ({ ...prev, loginTime: e.target.value }))}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                          Logout / Check-Out Time *
                        </label>
                        <div className="relative">
                          <input
                            type="time"
                            required
                            value={modalForm.logoutTime}
                            onChange={(e) => setModalForm(prev => ({ ...prev, logoutTime: e.target.value }))}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Remarks/Notes */}
                  <div className="space-y-1 border-t border-slate-50 pt-2.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                      Remarks (Optional)
                    </label>
                    <textarea
                      value={modalForm.notes}
                      onChange={(e) => setModalForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Add remarks (optional)"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none h-[60px]"
                    />
                  </div>

                </div>

                {/* Buttons row */}
                <div className="flex justify-end gap-2.5 px-4 py-3.5 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => { setModalOpen(false); setActiveEmpRecord(null); }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveAttendanceMutation.isPending}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all cursor-pointer"
                  >
                    {saveAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
