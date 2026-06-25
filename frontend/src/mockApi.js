import axios from 'axios';
import mockData from './mockData.json' with { type: 'json' };

// Initialize localStorage databases if they don't exist
const initDB = (key, defaultData) => {
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(defaultData));
  }
};

initDB('wow_admins', mockData.mockAdminsDatabase);
initDB('wow_roles', mockData.mockRolesDatabase);
initDB('wow_attendance', mockData.mockAttendanceDatabase);
initDB('wow_salaries', mockData.mockSalariesDatabase);
initDB('wow_owners', mockData.mockOwnersDatabase);
initDB('wow_homestays', mockData.mockHomestaysDatabase);
initDB('wow_bookings', mockData.mockBookingsDatabase);
initDB('wow_employees', mockData.mockEmployeesDatabase);
initDB('wow_drivers', mockData.mockDriversDatabase);
initDB('wow_guests', mockData.mockGuestsDatabase);
initDB('wow_rides', mockData.mockRidesDatabase);
initDB('wow_riders', mockData.mockRidersDatabase);
initDB('wow_users', mockData.mockUsersDatabase);
initDB('wow_tour_packages', mockData.mockTourPackagesDatabase);
initDB('wow_summary', mockData.mockFallbackData.summary);
initDB('wow_charts', mockData.mockFallbackData.charts);

// Helper methods to get and set local data
const getDB = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const setDB = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// Date filter utility
const isWithinDateRange = (date, start, end) => {
  const d = new Date(date);
  if (start) {
    const s = new Date(start);
    if (d < s) return false;
  }
  if (end) {
    const e = new Date(end);
    if (d > e) return false;
  }
  return true;
};

// Route handlers
const handlers = {
  GET: [
    // Dashboard Summary
    {
      pattern: /^\/api\/dashboard\/summary$/,
      handler: () => {
        const bookings = getDB('wow_bookings');
        const employees = getDB('wow_employees');
        const homestays = getDB('wow_homestays');

        const activeEmployees = employees.filter(e => e.status === 'Active').length;
        const inactiveEmployees = employees.filter(e => e.status === 'Inactive').length;
        const totalHomestays = homestays.filter(h => h.type === 'Homestay').length;
        const totalHotels = homestays.filter(h => h.type === 'Hotel').length;

        const todayStr = new Date().toISOString().split('T')[0];
        const todayCheckins = bookings.filter(b => {
          if (!b.checkInDate) return false;
          const d = new Date(b.checkInDate).toISOString().split('T')[0];
          return d === todayStr && b.bookingStatus !== 'Cancelled';
        }).length || 9;

        const todayCheckouts = bookings.filter(b => {
          if (!b.checkOutDate) return false;
          const d = new Date(b.checkOutDate).toISOString().split('T')[0];
          return d === todayStr && b.bookingStatus === 'Completed';
        }).length || 10;

        const repeatCount = bookings.filter(b => b.isRepeatCustomer).length;
        const repeatRate = bookings.length ? ((repeatCount / bookings.length) * 100).toFixed(1) : 0;

        const todayBookings = bookings.filter(b => {
          const d = new Date(b.createdAt).toISOString().split('T')[0];
          return d === todayStr;
        });
        const todayBookingsCount = todayBookings.length || 28;
        const todayRevenue = todayBookings.length 
          ? todayBookings.reduce((sum, b) => sum + (b.amount || 0), 0)
          : 125600;

        return {
          totalBookings: bookings.length || 1248,
          totalEmployees: employees.length || 56,
          activeEmployees: activeEmployees || 42,
          inactiveEmployees: inactiveEmployees || 14,
          totalHomestays: totalHomestays || 18,
          totalHotels: totalHotels || 7,
          todayCheckins,
          todayCheckouts,
          repeatCustomersRate: parseFloat(repeatRate) || 38.7,
          todayBookingsCount,
          todayRevenue,
          monthBookingsChange: 12.5,
          monthEmployeesChange: 5.3,
          monthRepeatChange: 4.5,
          todayBookingsChange: 7.1,
          todayRevenueChange: 10.2
        };
      }
    },

    // Dashboard Charts
    {
      pattern: /^\/api\/dashboard\/charts$/,
      handler: () => JSON.parse(localStorage.getItem('wow_charts'))
    },

    // Dashboard Top Employees
    {
      pattern: /^\/api\/dashboard\/employees$/,
      handler: () => {
        const employees = getDB('wow_employees');
        const sorted = [...employees].sort((a, b) => {
          const aBookings = a.bookingsCount || a.bookings || 0;
          const bBookings = b.bookingsCount || b.bookings || 0;
          return bBookings - aBookings;
        });
        return sorted.slice(0, 5).map(e => ({
          name: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.name,
          role: e.role,
          bookings: e.bookingsCount || e.bookings || 0,
          revenue: e.revenue || 0,
          avatar: e.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
        }));
      }
    },

    // Dashboard Top Homestays
    {
      pattern: /^\/api\/dashboard\/homestays$/,
      handler: () => {
        const homestays = getDB('wow_homestays');
        const sorted = [...homestays].sort((a, b) => (b.bookings || 0) - (a.bookings || 0));
        return sorted.slice(0, 5).map(h => ({
          name: h.name,
          bookings: h.bookings || 0,
          occupancyRate: h.occupancyRate || 60
        }));
      }
    },

    // Employees list
    {
      pattern: /^\/api\/dashboard\/employees-list$/,
      handler: ({ query }) => {
        let list = getDB('wow_employees');
        if (query.status && query.status !== 'All') {
          list = list.filter(e => e.status === query.status);
        }
        if (query.department && query.department !== 'All') {
          list = list.filter(e => e.department === query.department);
        }
        if (query.role && query.role !== 'All') {
          list = list.filter(e => e.role === query.role);
        }
        if (query.search) {
          const q = query.search.toLowerCase();
          list = list.filter(e => 
            `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
            e.mobile.includes(q) ||
            e.email.toLowerCase().includes(q) ||
            e._id.toLowerCase().includes(q)
          );
        }
        return list;
      }
    },

    // Single Employee details
    {
      pattern: /^\/api\/dashboard\/employees-list\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_employees');
        const item = list.find(e => e._id === params.id);
        if (!item) return { status: 404, data: { error: 'Employee not found' } };
        return item;
      }
    },

    // Roles list
    {
      pattern: /^\/api\/dashboard\/roles$/,
      handler: () => getDB('wow_roles')
    },

    // Single Role details
    {
      pattern: /^\/api\/dashboard\/roles\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_roles');
        const item = list.find(r => r._id === params.id);
        if (!item) return { status: 404, data: { error: 'Role not found' } };
        return item;
      }
    },

    // Attendance records
    {
      pattern: /^\/api\/dashboard\/attendance$/,
      handler: ({ query }) => {
        const employees = getDB('wow_employees');
        const attendance = getDB('wow_attendance');
        const dateStr = query.date || new Date().toISOString().split('T')[0];
        const queryDate = new Date(dateStr);

        const startOfDay = new Date(queryDate.setUTCHours(0,0,0,0));
        const endOfDay = new Date(queryDate.setUTCHours(23,59,59,999));

        const dayRecords = attendance.filter(att => {
          const attDate = new Date(att.date);
          return attDate >= startOfDay && attDate <= endOfDay;
        });

        return employees.map(emp => {
          const record = dayRecords.find(r => r.employeeId === emp._id);
          return {
            employee: emp,
            attendance: record || {
              employeeId: emp._id,
              date: startOfDay.toISOString(),
              status: 'Absent',
              loginTime: '',
              logoutTime: '',
              workingHours: 0,
              notes: ''
            }
          };
        });
      }
    },

    // Employee attendance history
    {
      pattern: /^\/api\/dashboard\/attendance\/employee\/([^\/]+)$/,
      handler: ({ params }) => {
        const attendance = getDB('wow_attendance');
        return attendance.filter(att => att.employeeId === params.id);
      }
    },

    // Salary/Payroll Stats
    {
      pattern: /^\/api\/dashboard\/salaries\/stats$/,
      handler: ({ query }) => {
        const currentMonth = query.month || 'June';
        const currentYear = query.year || '2026';
        const employees = getDB('wow_employees');
        const salaries = getDB('wow_salaries');

        const totalEmployees = employees.filter(e => e.status === 'Active').length;
        const processedSalaries = salaries.filter(s => s.month === currentMonth && s.year === currentYear);
        const processedThisMonth = processedSalaries.length;
        const paidCount = processedSalaries.filter(s => s.status === 'Paid').length;
        const pendingSalaries = Math.max(0, totalEmployees - paidCount);
        const totalSalaryAmount = processedSalaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);

        return {
          totalEmployees,
          processedThisMonth,
          pendingSalaries,
          totalSalaryAmount
        };
      }
    },

    // Salaries list
    {
      pattern: /^\/api\/dashboard\/salaries$/,
      handler: ({ query }) => {
        let list = getDB('wow_salaries');
        const employees = getDB('wow_employees');

        if (query.month) list = list.filter(s => s.month === query.month);
        if (query.year) list = list.filter(s => s.year === query.year);
        if (query.status && query.status !== 'All') list = list.filter(s => s.status === query.status);

        const results = list.map(sal => {
          const emp = employees.find(e => e._id === sal.employeeId);
          return {
            ...sal,
            employee: emp || {
              _id: sal.employeeId,
              firstName: 'Unknown',
              lastName: 'Staff',
              role: 'Staff',
              avatar: ''
            }
          };
        });

        if (query.search) {
          const q = query.search.toLowerCase();
          return results.filter(item => 
            item.employee.firstName.toLowerCase().includes(q) ||
            item.employee.lastName.toLowerCase().includes(q) ||
            item.employee.role.toLowerCase().includes(q) ||
            item.employeeId.toLowerCase().includes(q)
          );
        }
        return results;
      }
    },

    // Employee salary history
    {
      pattern: /^\/api\/dashboard\/salaries\/employee\/([^\/]+)$/,
      handler: ({ params }) => {
        const salaries = getDB('wow_salaries');
        return salaries.filter(s => s.employeeId === params.id);
      }
    },

    // Single Salary Record details
    {
      pattern: /^\/api\/dashboard\/salaries\/([^\/]+)$/,
      handler: ({ params }) => {
        const salaries = getDB('wow_salaries');
        const item = salaries.find(s => s._id === params.id);
        if (!item) return { status: 404, data: { error: 'Salary record not found' } };
        return item;
      }
    },

    // Homestay Owners Stats
    {
      pattern: /^\/api\/dashboard\/owners\/stats$/,
      handler: () => {
        const owners = getDB('wow_owners');
        const totalOwners = owners.length;
        const activeOwners = owners.filter(o => o.status === 'Active').length;
        const verifiedAadhar = owners.filter(o => o.aadharVerified).length;
        const verifiedPan = owners.filter(o => o.panVerified).length;
        const verifiedBank = owners.filter(o => o.bankVerified).length;

        return {
          totalOwners,
          activeOwners,
          verifiedAadhar,
          verifiedPan,
          verifiedBank
        };
      }
    },

    // Homestay Owners list
    {
      pattern: /^\/api\/dashboard\/owners$/,
      handler: ({ query }) => {
        let list = getDB('wow_owners');

        if (query.status && query.status !== 'All') {
          list = list.filter(o => o.status === query.status);
        }
        if (query.verification && query.verification !== 'All') {
          if (query.verification === 'Aadhar Verified') list = list.filter(o => o.aadharVerified);
          if (query.verification === 'PAN Verified') list = list.filter(o => o.panVerified);
          if (query.verification === 'Bank Verified') list = list.filter(o => o.bankVerified);
        }
        if (query.search) {
          const q = query.search.toLowerCase();
          list = list.filter(o => 
            `${o.firstName} ${o.lastName}`.toLowerCase().includes(q) ||
            o.email.toLowerCase().includes(q) ||
            o.mobile.includes(q) ||
            o._id.toLowerCase().includes(q)
          );
        }
        return list;
      }
    },

    // Single Homestay Owner details
    {
      pattern: /^\/api\/dashboard\/owners\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_owners');
        const item = list.find(o => o._id === params.id);
        if (!item) return { status: 404, data: { error: 'Owner not found' } };
        return item;
      }
    },

    // Homestays list Stats
    {
      pattern: /^\/api\/dashboard\/homestays-list\/stats$/,
      handler: () => {
        const list = getDB('wow_homestays');
        const totalHomestays = list.filter(h => h.type === 'Homestay').length;
        const totalHotels = list.filter(h => h.type === 'Hotel').length;
        const activeProperties = list.filter(h => h.status === 'Active').length;
        const pendingApproval = list.filter(h => h.status === 'Pending').length;

        // occupancy average
        const occupancyRate = list.length 
          ? Math.round(list.reduce((sum, h) => sum + (h.occupancyRate || 0), 0) / list.length)
          : 0;

        return {
          totalHomestays,
          totalHotels,
          activeProperties,
          pendingApproval,
          occupancyRate
        };
      }
    },

    // Homestays list
    {
      pattern: /^\/api\/dashboard\/homestays-list$/,
      handler: ({ query }) => {
        let list = getDB('wow_homestays');

        if (query.type && query.type !== 'All') {
          list = list.filter(h => h.type === query.type);
        }
        if (query.region && query.region !== 'All') {
          list = list.filter(h => h.region === query.region);
        }
        if (query.status && query.status !== 'All') {
          list = list.filter(h => h.status === query.status);
        }
        if (query.search) {
          const q = query.search.toLowerCase();
          list = list.filter(h => 
            h.name.toLowerCase().includes(q) ||
            h.ownerName.toLowerCase().includes(q) ||
            h.address.toLowerCase().includes(q) ||
            h._id.toLowerCase().includes(q)
          );
        }
        return list;
      }
    },

    // Single Homestay details
    {
      pattern: /^\/api\/dashboard\/homestays-list\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_homestays');
        const item = list.find(h => h._id === params.id);
        if (!item) return { status: 404, data: { error: 'Homestay not found' } };
        return item;
      }
    },

    // Bookings list Stats
    {
      pattern: /^\/api\/dashboard\/bookings-list\/stats$/,
      handler: () => {
        const list = getDB('wow_bookings');
        const totalBookings = list.length;
        const confirmedBookings = list.filter(b => b.bookingStatus === 'Confirmed').length;
        const pendingBookings = list.filter(b => b.bookingStatus === 'Pending').length;
        const completedBookings = list.filter(b => b.bookingStatus === 'Completed').length;
        const totalRevenue = list.reduce((sum, b) => sum + (b.amount || 0), 0);

        return {
          totalBookings,
          confirmedBookings,
          pendingBookings,
          completedBookings,
          totalRevenue
        };
      }
    },

    // Bookings list
    {
      pattern: /^\/api\/dashboard\/bookings-list$/,
      handler: ({ query }) => {
        let list = getDB('wow_bookings');

        if (query.status && query.status !== 'All') {
          list = list.filter(b => b.bookingStatus === query.status);
        }
        if (query.type && query.type !== 'All') {
          list = list.filter(b => b.bookingType === query.type);
        }
        if (query.paymentStatus && query.paymentStatus !== 'All') {
          list = list.filter(b => b.paymentStatus === query.paymentStatus);
        }
        if (query.source && query.source !== 'All') {
          list = list.filter(b => b.bookingSource === query.source);
        }
        if (query.startDate || query.endDate) {
          list = list.filter(b => isWithinDateRange(b.checkInDate, query.startDate, query.endDate));
        }
        if (query.search) {
          const q = query.search.toLowerCase();
          list = list.filter(b => 
            b.bookingId.toLowerCase().includes(q) ||
            b.customer.name.toLowerCase().includes(q) ||
            b.customer.email.toLowerCase().includes(q) ||
            b.customer.mobile.includes(q) ||
            (b.propertyDetails && b.propertyDetails.propertyName.toLowerCase().includes(q)) ||
            b._id.toLowerCase().includes(q)
          );
        }
        return list;
      }
    },

    // Single Booking details
    {
      pattern: /^\/api\/dashboard\/bookings-list\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_bookings');
        const item = list.find(b => b._id === params.id);
        if (!item) return { status: 404, data: { error: 'Booking not found' } };
        return item;
      }
    },

    // Rides stats
    {
      pattern: /^\/api\/dashboard\/rides\/stats$/,
      handler: () => {
        const rides = getDB('wow_rides');
        const drivers = getDB('wow_drivers');

        const totalRides = rides.length;
        const completedRides = rides.filter(r => r.status === 'Completed').length;
        const ongoingRides = rides.filter(r => r.status === 'Ongoing').length;
        const pendingRides = rides.filter(r => r.status === 'Pending').length;
        const totalDrivers = drivers.length;
        const activeDrivers = drivers.filter(d => d.status === 'Active').length;

        return {
          totalRides,
          completedRides,
          ongoingRides,
          pendingRides,
          totalDrivers,
          activeDrivers
        };
      }
    },

    // Drivers list
    {
      pattern: /^\/api\/dashboard\/rides\/drivers$/,
      handler: () => getDB('wow_drivers')
    },

    // Rides list
    {
      pattern: /^\/api\/dashboard\/rides$/,
      handler: ({ query }) => {
        let list = getDB('wow_rides');

        if (query.status && query.status !== 'All') {
          list = list.filter(r => r.status === query.status);
        }
        if (query.paymentStatus && query.paymentStatus !== 'All') {
          list = list.filter(r => r.paymentStatus === query.paymentStatus);
        }
        if (query.search) {
          const q = query.search.toLowerCase();
          list = list.filter(r => 
            r.rideId.toLowerCase().includes(q) ||
            r.driverName.toLowerCase().includes(q) ||
            r.guestName.toLowerCase().includes(q) ||
            r.pickupLocation.toLowerCase().includes(q) ||
            r.dropLocation.toLowerCase().includes(q)
          );
        }
        return list;
      }
    },

    // Single Ride details
    {
      pattern: /^\/api\/dashboard\/rides\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_rides');
        const item = list.find(r => r._id === params.id);
        if (!item) return { status: 404, data: { error: 'Ride not found' } };
        return item;
      }
    },

    // Riders Stats
    {
      pattern: /^\/api\/dashboard\/riders\/stats$/,
      handler: () => {
        const list = getDB('wow_riders');
        const totalRiders = list.length;
        const activeRiders = list.filter(r => r.status === 'Active').length;
        const availableRiders = list.filter(r => r.status === 'Active' && r.availability === 'Available').length;
        const onTripRiders = list.filter(r => r.status === 'Active' && r.availability === 'On Trip').length;
        const inactiveRiders = list.filter(r => r.status === 'Inactive').length;
        const totalEarningsThisMonth = list.reduce((sum, r) => sum + (r.performance.monthlyEarnings || 0), 0);

        return {
          totalRiders,
          activeRiders,
          availableRiders,
          onTripRiders,
          inactiveRiders,
          totalEarningsThisMonth
        };
      }
    },

    // Riders list
    {
      pattern: /^\/api\/dashboard\/riders$/,
      handler: ({ query }) => {
        let list = getDB('wow_riders');

        if (query.status && query.status !== 'All') {
          list = list.filter(r => r.status === query.status);
        }
        if (query.availability && query.availability !== 'All') {
          list = list.filter(r => r.availability === query.availability);
        }
        if (query.vehicleType && query.vehicleType !== 'All') {
          list = list.filter(r => r.vehicle.vehicleType.includes(query.vehicleType));
        }
        if (query.rating && query.rating !== 'All') {
          const minRating = parseFloat(query.rating);
          list = list.filter(r => r.rating >= minRating);
        }
        if (query.location && query.location !== 'All') {
          const q = query.location.toLowerCase();
          list = list.filter(r => r.tempAddress.city.toLowerCase().includes(q));
        }
        if (query.search) {
          const q = query.search.toLowerCase();
          list = list.filter(r => 
            `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
            r.mobile.includes(q) ||
            r.vehicle.vehicleNumber.toLowerCase().includes(q) ||
            r._id.toLowerCase().includes(q)
          );
        }
        return list;
      }
    },

    // Single Rider details
    {
      pattern: /^\/api\/dashboard\/riders\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_riders');
        const item = list.find(r => r._id === params.id);
        if (!item) return { status: 404, data: { error: 'Rider not found' } };
        return item;
      }
    },

    // Users Stats
    {
      pattern: /^\/api\/dashboard\/users\/stats$/,
      handler: () => {
        const users = getDB('wow_users');
        const totalUsers = users.filter(u => u.status !== 'Deleted').length;
        const activeUsers = users.filter(u => u.status === 'Active').length;
        const blockedUsers = users.filter(u => u.status === 'Blocked').length;

        const newRegistrationsThisMonth = users.filter(u => {
          const d = new Date(u.registrationDate);
          return d.getMonth() === 5 && d.getFullYear() === 2026; // June 2026
        }).length;

        const totalBookings = users.reduce((sum, u) => sum + (u.totalBookings || 0), 0);
        const totalRevenueGenerated = users.reduce((sum, u) => sum + (u.totalSpend || 0), 0);

        return {
          totalUsers,
          activeUsers,
          blockedUsers,
          newRegistrationsThisMonth,
          totalBookings,
          totalRevenueGenerated
        };
      }
    },

    // Users list
    {
      pattern: /^\/api\/dashboard\/users$/,
      handler: ({ query }) => {
        let list = getDB('wow_users').filter(u => u.status !== 'Deleted');

        if (query.status && query.status !== 'All') {
          list = list.filter(u => u.status === query.status);
        }
        if (query.userType && query.userType !== 'All') {
          list = list.filter(u => u.userType === query.userType);
        }
        if (query.location && query.location !== 'All') {
          const q = query.location.toLowerCase();
          list = list.filter(u => u.address.city.toLowerCase().includes(q));
        }
        if (query.search) {
          const q = query.search.toLowerCase();
          list = list.filter(u => 
            u.fullName.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.mobile.includes(q) ||
            u._id.toLowerCase().includes(q)
          );
        }
        return list;
      }
    },

    // Single User details
    {
      pattern: /^\/api\/dashboard\/users\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_users');
        const item = list.find(u => u._id === params.id);
        if (!item) return { status: 404, data: { error: 'User not found' } };
        return item;
      }
    },

    // Sightseeing/Tour Packages Stats
    {
      pattern: /^\/api\/dashboard\/tour-packages\/stats$/,
      handler: () => {
        const list = getDB('wow_tour_packages');
        const totalPackages = list.length;
        const activePackages = list.filter(p => p.status === 'Active').length;
        const draftPackages = list.filter(p => p.status === 'Draft').length;
        const totalBookings = list.reduce((sum, p) => sum + (p.bookings || 0), 0);
        const totalRevenue = list.reduce((sum, p) => sum + (p.revenueGenerated || 0), 0);

        return {
          totalPackages,
          activePackages,
          draftPackages,
          totalBookings,
          totalRevenue
        };
      }
    },

    // Tour Packages list
    {
      pattern: /^\/api\/dashboard\/tour-packages$/,
      handler: ({ query }) => {
        let list = getDB('wow_tour_packages');

        if (query.status && query.status !== 'All') {
          list = list.filter(p => p.status === query.status);
        }
        if (query.destination && query.destination !== 'All') {
          list = list.filter(p => p.destinations.includes(query.destination));
        }
        if (query.duration && query.duration !== 'All') {
          if (query.duration === '1-3 Nights') {
            list = list.filter(p => p.nightsCount >= 1 && p.nightsCount <= 3);
          } else if (query.duration === '4-6 Nights') {
            list = list.filter(p => p.nightsCount >= 4 && p.nightsCount <= 6);
          } else if (query.duration === '7+ Nights') {
            list = list.filter(p => p.nightsCount >= 7);
          }
        }
        if (query.mealPlan && query.mealPlan !== 'All') {
          list = list.filter(p => p.mealPlan === query.mealPlan);
        }
        if (query.tourType && query.tourType !== 'All') {
          list = list.filter(p => p.tourType === query.tourType);
        }
        if (query.isPrivate && query.isPrivate !== 'All') {
          const val = query.isPrivate === 'true';
          list = list.filter(p => p.isPrivate === val);
        }
        if (query.region && query.region !== 'All') {
          list = list.filter(p => p.region === query.region);
        }
        if (query.search) {
          const q = query.search.toLowerCase();
          list = list.filter(p => 
            p.packageId.toLowerCase().includes(q) ||
            p.title.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.region.toLowerCase().includes(q) ||
            p.destinations.some(d => d.toLowerCase().includes(q))
          );
        }
        return list;
      }
    },

    // Single Tour Package details
    {
      pattern: /^\/api\/dashboard\/tour-packages\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_tour_packages');
        const item = list.find(p => p._id === params.id);
        if (!item) return { status: 404, data: { error: 'Package not found' } };
        return item;
      }
    }
  ],

  POST: [
    // Auth login
    {
      pattern: /^\/api\/auth\/login$/,
      handler: ({ data }) => {
        const { email, password } = data;
        const admins = getDB('wow_admins');
        const admin = admins.find(a => a.email === email);

        if (!admin) {
          return { status: 404, data: { error: 'Email not found' } };
        }
        if (admin.passwordHash === password) {
          return {
            token: `mock-token-${admin._id}-${Date.now()}`,
            user: { email: admin.email, fullName: admin.fullName }
          };
        } else {
          return { status: 400, data: { error: 'Invalid credentials. Please verify password.' } };
        }
      }
    },

    // Forgot Password
    {
      pattern: /^\/api\/auth\/forgot-password$/,
      handler: () => ({ message: 'Reset link sent to your registered email.' })
    },

    // Reset Password
    {
      pattern: /^\/api\/auth\/reset-password$/,
      handler: () => ({ message: 'Password reset successful.' })
    },

    // Create Employee
    {
      pattern: /^\/api\/dashboard\/employees-list$/,
      handler: ({ data }) => {
        const list = getDB('wow_employees');
        const newEmp = {
          _id: `emp-${Date.now().toString().slice(-5)}`,
          createdAt: new Date().toISOString(),
          status: 'Active',
          bookingsCount: 0,
          revenue: 0,
          avatar: data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          ...data
        };
        list.unshift(newEmp);
        setDB('wow_employees', list);
        return { status: 201, data: newEmp };
      }
    },

    // Create Role
    {
      pattern: /^\/api\/dashboard\/roles$/,
      handler: ({ data }) => {
        const list = getDB('wow_roles');
        const newRole = {
          _id: `role-${Date.now().toString().slice(-5)}`,
          createdAt: new Date().toISOString(),
          ...data
        };
        list.push(newRole);
        setDB('wow_roles', list);
        return { status: 201, data: newRole };
      }
    },

    // Assign Role to Employee
    {
      pattern: /^\/api\/dashboard\/employees-assign-role$/,
      handler: ({ data }) => {
        const { employeeId, roleId } = data;
        const employees = getDB('wow_employees');
        const roles = getDB('wow_roles');

        const empIdx = employees.findIndex(e => e._id === employeeId);
        const role = roles.find(r => r._id === roleId);

        if (empIdx === -1) return { status: 404, data: { error: 'Employee not found' } };
        if (!role) return { status: 404, data: { error: 'Role not found' } };

        employees[empIdx].role = role.name;
        setDB('wow_employees', employees);
        return employees[empIdx];
      }
    },

    // Save Attendance Record
    {
      pattern: /^\/api\/dashboard\/attendance$/,
      handler: ({ data }) => {
        const attendance = getDB('wow_attendance');
        const { employeeId, date, status, loginTime, logoutTime, workingHours, notes } = data;
        const targetDate = new Date(date);

        const startOfDay = new Date(targetDate.setUTCHours(0,0,0,0));
        const endOfDay = new Date(targetDate.setUTCHours(23,59,59,999));

        const idx = attendance.findIndex(att => {
          const attDate = new Date(att.date);
          return att.employeeId === employeeId && attDate >= startOfDay && attDate <= endOfDay;
        });

        const updatedRecord = {
          employeeId,
          date: startOfDay.toISOString(),
          status,
          loginTime: loginTime || '',
          logoutTime: logoutTime || '',
          workingHours: Number(workingHours) || 0,
          notes: notes || ''
        };

        if (idx !== -1) {
          attendance[idx] = {
            ...attendance[idx],
            ...updatedRecord
          };
          setDB('wow_attendance', attendance);
          return attendance[idx];
        } else {
          const newRecord = {
            _id: `att-${Date.now().toString().slice(-5)}`,
            ...updatedRecord
          };
          attendance.push(newRecord);
          setDB('wow_attendance', attendance);
          return { status: 201, data: newRecord };
        }
      }
    },

    // Process Salary / Create payroll record
    {
      pattern: /^\/api\/dashboard\/salaries$/,
      handler: ({ data }) => {
        const salaries = getDB('wow_salaries');
        const newSal = {
          _id: `sal-${Date.now().toString().slice(-5)}`,
          createdAt: new Date().toISOString(),
          status: 'Pending',
          ...data
        };
        salaries.unshift(newSal);
        setDB('wow_salaries', salaries);
        return { status: 201, data: newSal };
      }
    },

    // Create Homestay Owner
    {
      pattern: /^\/api\/dashboard\/owners$/,
      handler: ({ data }) => {
        const owners = getDB('wow_owners');
        const newOwner = {
          _id: `own-${Date.now().toString().slice(-5)}`,
          status: 'Active',
          aadharVerified: true,
          panVerified: true,
          bankVerified: true,
          properties: [],
          profilePhoto: data.profilePhoto || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
          ...data
        };
        owners.unshift(newOwner);
        setDB('wow_owners', owners);
        return { status: 201, data: newOwner };
      }
    },

    // Create Homestay Properties
    {
      pattern: /^\/api\/dashboard\/homestays-list$/,
      handler: ({ data }) => {
        const homestays = getDB('wow_homestays');
        const newProp = {
          _id: `hs-${Date.now().toString().slice(-5)}`,
          status: 'Active',
          occupancyRate: Math.floor(Math.random() * 30) + 40,
          bookings: 0,
          ...data
        };
        homestays.unshift(newProp);
        setDB('wow_homestays', homestays);

        // Also add property to owner
        if (data.ownerName) {
          const owners = getDB('wow_owners');
          const ownerIdx = owners.findIndex(o => `${o.firstName} ${o.lastName}`.trim() === data.ownerName.trim());
          if (ownerIdx !== -1) {
            owners[ownerIdx].properties.push({
              propertyName: newProp.name,
              location: newProp.address,
              status: 'Active',
              bookings: 0
            });
            setDB('wow_owners', owners);
          }
        }

        return { status: 201, data: newProp };
      }
    },

    // Create Booking
    {
      pattern: /^\/api\/dashboard\/bookings-list$/,
      handler: ({ data }) => {
        const bookings = getDB('wow_bookings');
        const finalAmount = Number(data.amount) || 5000;
        const newBooking = {
          _id: `bk-${Date.now().toString().slice(-5)}`,
          bookingId: `BK-2026-${1000 + bookings.length + 1}`,
          createdAt: new Date().toISOString(),
          bookingDate: new Date().toISOString(),
          bookingSource: 'Super Admin Portal',
          isRepeatCustomer: false,
          bookingStatus: data.bookingStatus || 'Confirmed',
          paymentStatus: data.paymentStatus || 'Paid',
          timeline: [
            { activity: 'Booking Created', timestamp: new Date().toISOString(), createdBy: 'Super Admin' }
          ],
          customer: {
            customerId: `cust-${100 + bookings.length}`,
            name: data.customer?.name || 'Walkin Guest',
            email: data.customer?.email || 'walkin@gmail.com',
            mobile: data.customer?.mobile || '+91 9988776655',
            whatsApp: data.customer?.mobile || '+91 9988776655',
            address: data.customer?.address || 'Mumbai, Maharashtra'
          },
          guests: {
            total: Number(data.guests?.total) || 2,
            adults: Number(data.guests?.adults) || 2,
            children: Number(data.guests?.children) || 0
          },
          pricing: {
            bookingAmount: finalAmount,
            discount: 0,
            tax: Math.round(finalAmount * 0.12),
            convenienceFee: 120,
            paidAmount: data.paymentStatus === 'Paid' ? finalAmount : 0,
            pendingAmount: data.paymentStatus === 'Paid' ? 0 : finalAmount,
            refundAmount: 0,
            finalAmount
          },
          paymentDetails: {
            method: 'UPI',
            transactionId: `TXN-WOW-${Date.now().toString().slice(-4)}`,
            paymentDate: data.paymentStatus === 'Paid' ? new Date().toISOString() : null,
            paymentStatus: data.paymentStatus || 'Paid'
          },
          ...data
        };
        bookings.unshift(newBooking);
        setDB('wow_bookings', bookings);
        return { status: 201, data: newBooking };
      }
    },

    // Create Rider
    {
      pattern: /^\/api\/dashboard\/riders$/,
      handler: ({ data }) => {
        const list = getDB('wow_riders');
        const newRider = {
          _id: `DR${Math.floor(Math.random() * 900) + 1000}`,
          joinedDate: new Date().toISOString(),
          rating: 5.0,
          status: 'Active',
          availability: 'Available',
          performance: {
            totalRides: 0,
            completedRides: 0,
            cancelledRides: 0,
            averageRating: 5.0,
            completionRate: 100,
            totalEarnings: 0,
            monthlyEarnings: 0
          },
          rideHistory: [],
          documents: {
            profilePhoto: data.documents?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            drivingLicense: 'Verified',
            rcBook: 'Verified',
            insurance: 'Verified',
            pollutionCertificate: 'Verified',
            aadharFront: 'Verified',
            aadharBack: 'Verified',
            panCard: 'Verified'
          },
          ...data
        };
        list.unshift(newRider);
        setDB('wow_riders', list);
        return { status: 201, data: newRider };
      }
    },

    // Create User
    {
      pattern: /^\/api\/dashboard\/users$/,
      handler: ({ data }) => {
        const list = getDB('wow_users');
        const newUser = {
          _id: `UR${Math.floor(Math.random() * 9000) + 10000}`,
          registrationDate: new Date().toISOString(),
          status: 'Active',
          totalBookings: 0,
          totalSpend: 0,
          rewardPoints: 0,
          upcomingBookings: 0,
          cancelledBookings: 0,
          averageDailyUsage: '10 mins / day',
          activity: {
            recentLogins: [new Date().toISOString()],
            lastAppActivity: new Date().toISOString()
          },
          bookings: [],
          payments: [],
          photo: data.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          ...data
        };
        list.unshift(newUser);
        setDB('wow_users', list);
        return { status: 201, data: newUser };
      }
    },

    // Create Tour Package
    {
      pattern: /^\/api\/dashboard\/tour-packages$/,
      handler: ({ data }) => {
        const list = getDB('wow_tour_packages');
        const newPkg = {
          _id: `pkg-${Date.now().toString().slice(-5)}`,
          packageId: `PKG-WOW-${Date.now().toString().slice(-4)}`,
          status: 'Draft',
          bookings: 0,
          revenueGenerated: 0,
          createdAt: new Date().toISOString(),
          createdBy: 'Super Admin',
          ...data
        };
        list.unshift(newPkg);
        setDB('wow_tour_packages', list);
        return { status: 201, data: newPkg };
      }
    }
  ],

  PUT: [
    // Edit Employee
    {
      pattern: /^\/api\/dashboard\/employees-list\/([^\/]+)$/,
      handler: ({ params, data }) => {
        const list = getDB('wow_employees');
        const idx = list.findIndex(e => e._id === params.id);
        if (idx === -1) return { status: 404, data: { error: 'Employee not found' } };

        list[idx] = {
          ...list[idx],
          ...data
        };
        setDB('wow_employees', list);
        return list[idx];
      }
    },

    // Edit Role
    {
      pattern: /^\/api\/dashboard\/roles\/([^\/]+)$/,
      handler: ({ params, data }) => {
        const list = getDB('wow_roles');
        const idx = list.findIndex(r => r._id === params.id);
        if (idx === -1) return { status: 404, data: { error: 'Role not found' } };

        list[idx] = {
          ...list[idx],
          ...data
        };
        setDB('wow_roles', list);
        return list[idx];
      }
    },

    // Edit Salary record
    {
      pattern: /^\/api\/dashboard\/salaries\/([^\/]+)$/,
      handler: ({ params, data }) => {
        const list = getDB('wow_salaries');
        const idx = list.findIndex(s => s._id === params.id);
        if (idx === -1) return { status: 404, data: { error: 'Salary record not found' } };

        list[idx] = {
          ...list[idx],
          ...data
        };
        setDB('wow_salaries', list);
        return list[idx];
      }
    },

    // Edit Owner details
    {
      pattern: /^\/api\/dashboard\/owners\/([^\/]+)$/,
      handler: ({ params, data }) => {
        const list = getDB('wow_owners');
        const idx = list.findIndex(o => o._id === params.id);
        if (idx === -1) return { status: 404, data: { error: 'Owner not found' } };

        list[idx] = {
          ...list[idx],
          ...data
        };
        setDB('wow_owners', list);
        return list[idx];
      }
    },

    // Edit Homestay Property details
    {
      pattern: /^\/api\/dashboard\/homestays-list\/([^\/]+)$/,
      handler: ({ params, data }) => {
        const list = getDB('wow_homestays');
        const idx = list.findIndex(h => h._id === params.id);
        if (idx === -1) return { status: 404, data: { error: 'Homestay not found' } };

        list[idx] = {
          ...list[idx],
          ...data
        };
        setDB('wow_homestays', list);
        return list[idx];
      }
    },

    // Edit Booking
    {
      pattern: /^\/api\/dashboard\/bookings-list\/([^\/]+)$/,
      handler: ({ params, data }) => {
        const list = getDB('wow_bookings');
        const idx = list.findIndex(b => b._id === params.id);
        if (idx === -1) return { status: 404, data: { error: 'Booking not found' } };

        list[idx] = {
          ...list[idx],
          ...data
        };
        setDB('wow_bookings', list);
        return list[idx];
      }
    },

    // Edit Ride
    {
      pattern: /^\/api\/dashboard\/rides\/([^\/]+)$/,
      handler: ({ params, data }) => {
        const list = getDB('wow_rides');
        const idx = list.findIndex(r => r._id === params.id);
        if (idx === -1) return { status: 404, data: { error: 'Ride not found' } };

        list[idx] = {
          ...list[idx],
          ...data
        };
        setDB('wow_rides', list);
        return list[idx];
      }
    },

    // Edit Rider
    {
      pattern: /^\/api\/dashboard\/riders\/([^\/]+)$/,
      handler: ({ params, data }) => {
        const list = getDB('wow_riders');
        const idx = list.findIndex(r => r._id === params.id);
        if (idx === -1) return { status: 404, data: { error: 'Rider not found' } };

        list[idx] = {
          ...list[idx],
          ...data
        };
        setDB('wow_riders', list);
        return list[idx];
      }
    },

    // Edit User details
    {
      pattern: /^\/api\/dashboard\/users\/([^\/]+)$/,
      handler: ({ params, data }) => {
        const list = getDB('wow_users');
        const idx = list.findIndex(u => u._id === params.id);
        if (idx === -1) return { status: 404, data: { error: 'User not found' } };

        list[idx] = {
          ...list[idx],
          ...data
        };
        setDB('wow_users', list);
        return list[idx];
      }
    },

    // Edit Tour Package details
    {
      pattern: /^\/api\/dashboard\/tour-packages\/([^\/]+)$/,
      handler: ({ params, data }) => {
        const list = getDB('wow_tour_packages');
        const idx = list.findIndex(p => p._id === params.id);
        if (idx === -1) return { status: 404, data: { error: 'Package not found' } };

        list[idx] = {
          ...list[idx],
          ...data
        };
        setDB('wow_tour_packages', list);
        return list[idx];
      }
    }
  ],

  DELETE: [
    // Delete Employee
    {
      pattern: /^\/api\/dashboard\/employees-list\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_employees');
        const filtered = list.filter(e => e._id !== params.id);
        if (filtered.length === list.length) return { status: 404, data: { error: 'Employee not found' } };
        setDB('wow_employees', filtered);
        return { message: 'Employee deleted successfully' };
      }
    },

    // Delete Role
    {
      pattern: /^\/api\/dashboard\/roles\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_roles');
        const filtered = list.filter(r => r._id !== params.id);
        if (filtered.length === list.length) return { status: 404, data: { error: 'Role not found' } };
        setDB('wow_roles', filtered);
        return { message: 'Role deleted successfully' };
      }
    },

    // Delete Salary Record
    {
      pattern: /^\/api\/dashboard\/salaries\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_salaries');
        const filtered = list.filter(s => s._id !== params.id);
        if (filtered.length === list.length) return { status: 404, data: { error: 'Salary record not found' } };
        setDB('wow_salaries', filtered);
        return { message: 'Salary record deleted successfully' };
      }
    },

    // Delete Homestay Owner
    {
      pattern: /^\/api\/dashboard\/owners\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_owners');
        const filtered = list.filter(o => o._id !== params.id);
        if (filtered.length === list.length) return { status: 404, data: { error: 'Owner not found' } };
        setDB('wow_owners', filtered);
        return { message: 'Owner deleted successfully' };
      }
    },

    // Delete Homestay property
    {
      pattern: /^\/api\/dashboard\/homestays-list\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_homestays');
        const filtered = list.filter(h => h._id !== params.id);
        if (filtered.length === list.length) return { status: 404, data: { error: 'Homestay not found' } };
        setDB('wow_homestays', filtered);
        return { message: 'Homestay property deleted successfully' };
      }
    },

    // Delete Booking
    {
      pattern: /^\/api\/dashboard\/bookings-list\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_bookings');
        const filtered = list.filter(b => b._id !== params.id);
        if (filtered.length === list.length) return { status: 404, data: { error: 'Booking not found' } };
        setDB('wow_bookings', filtered);
        return { message: 'Booking deleted successfully' };
      }
    },

    // Delete Ride
    {
      pattern: /^\/api\/dashboard\/rides\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_rides');
        const filtered = list.filter(r => r._id !== params.id);
        if (filtered.length === list.length) return { status: 404, data: { error: 'Ride not found' } };
        setDB('wow_rides', filtered);
        return { message: 'Ride deleted successfully' };
      }
    },

    // Delete Rider
    {
      pattern: /^\/api\/dashboard\/riders\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_riders');
        const filtered = list.filter(r => r._id !== params.id);
        if (filtered.length === list.length) return { status: 404, data: { error: 'Rider not found' } };
        setDB('wow_riders', filtered);
        return { message: 'Rider profile deleted successfully' };
      }
    },

    // Delete User
    {
      pattern: /^\/api\/dashboard\/users\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_users');
        const idx = list.findIndex(u => u._id === params.id);
        if (idx === -1) return { status: 404, data: { error: 'User not found' } };
        
        // Soft delete user by setting status to Deleted
        list[idx].status = 'Deleted';
        setDB('wow_users', list);
        return { message: 'User profile deleted successfully' };
      }
    },

    // Delete Tour Package
    {
      pattern: /^\/api\/dashboard\/tour-packages\/([^\/]+)$/,
      handler: ({ params }) => {
        const list = getDB('wow_tour_packages');
        const filtered = list.filter(p => p._id !== params.id);
        if (filtered.length === list.length) return { status: 404, data: { error: 'Package not found' } };
        setDB('wow_tour_packages', filtered);
        return { message: 'Tour package deleted successfully' };
      }
    }
  ]
};

// Custom Axios Adapter
const mockAdapter = (config) => {
  return new Promise((resolve, reject) => {
    const method = config.method.toUpperCase();
    
    // Parse the pathname from config.url, combining with baseURL if relative
    let path = config.url || '';
    if (config.baseURL && !path.startsWith('http://') && !path.startsWith('https://')) {
      const base = config.baseURL.replace(/\/+$/, '');
      const relative = path.replace(/^\/+/, '');
      path = `${base}/${relative}`;
    }
    
    if (path.startsWith('http://') || path.startsWith('https://')) {
      try {
        path = new URL(path).pathname;
      } catch (e) {
        const matches = path.match(/^https?:\/\/[^\/]+(\/.*)/);
        if (matches) path = matches[1];
      }
    }
    
    // Strip out query string
    const queryIdx = path.indexOf('?');
    if (queryIdx !== -1) {
      path = path.substring(0, queryIdx);
    }
    
    // Look up handler
    const list = handlers[method] || [];
    let matched = null;
    let params = {};
    
    for (const route of list) {
      const match = path.match(route.pattern);
      if (match) {
        matched = route;
        if (match[1]) {
          params.id = match[1];
        }
        break;
      }
    }
    
    // If a handler is matched, execute it
    if (matched) {
      let data = {};
      if (config.data) {
        try {
          data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        } catch (e) {
          data = config.data;
        }
      }
      
      const query = config.params || {};
      
      console.log(`[Mock API] Intercepted: ${method} ${path}`, { query, data, params });
      
      setTimeout(() => {
        try {
          const responseData = matched.handler({ query, data, params });
          
          let status = 200;
          let payload = responseData;
          if (responseData && typeof responseData === 'object' && 'status' in responseData && 'data' in responseData) {
            status = responseData.status;
            payload = responseData.data;
          }
          
          resolve({
            data: payload,
            status: status,
            statusText: status === 200 || status === 201 ? 'OK' : 'Error',
            headers: { 'content-type': 'application/json' },
            config,
            request: {}
          });
        } catch (err) {
          console.error(`[Mock API] Handler error for ${method} ${path}:`, err);
          resolve({
            data: { error: 'Mock Handler Error', message: err.message },
            status: 500,
            statusText: 'Internal Server Error',
            headers: { 'content-type': 'application/json' },
            config,
            request: {}
          });
        }
      }, 300); // 300ms simulated delay for UI loading spinners
    } else {
      console.warn(`[Mock API] No match for: ${method} ${config.url}`);
      resolve({
        data: { error: 'Not Found', message: `No mock handler found for ${method} ${config.url}` },
        status: 404,
        statusText: 'Not Found',
        headers: { 'content-type': 'application/json' },
        config,
        request: {}
      });
    }
  });
};

// Set as default Axios adapter
axios.defaults.adapter = mockAdapter;
console.log('[Mock API] Globally registered Axios adapter successfully.');
