import React from 'react';
import { motion } from 'framer-motion';
import { 
  CalendarClock, 
  Users, 
  UserCheck, 
  UserX, 
  Home, 
  Building,
  RotateCcw,
  CalendarDays,
  Banknote
} from 'lucide-react';
import MetricCard from '../components/widgets/MetricCard.jsx';
import BookingsBarChart from '../components/widgets/BookingsBarChart.jsx';
import BookingOverviewPie from '../components/widgets/BookingOverviewPie.jsx';
import IncomeLineChart from '../components/widgets/IncomeLineChart.jsx';
import EmployeePerformanceTable from '../components/widgets/EmployeePerformanceTable.jsx';
import TopHomestaysTable from '../components/widgets/TopHomestaysTable.jsx';
import { 
  CheckinIllustration, 
  CheckoutIllustration 
} from '../components/widgets/Illustrations.jsx';
import { 
  useDashboardSummary, 
  useDashboardCharts, 
  useEmployeePerformance, 
  useTopHomestays 
} from '../hooks/useDashboardData.js';

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: charts, isLoading: chartsLoading } = useDashboardCharts();
  const { data: employees, isLoading: employeesLoading } = useEmployeePerformance();
  const { data: homestays, isLoading: homestaysLoading } = useTopHomestays();

  // Staggered Container Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 sm:space-y-8"
    >
      {/* 1. Top Metrics Grid: 6 Columns with custom colorful pastel backgrounds */}
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5"
      >
        <MetricCard
          title="Total Bookings"
          value={summary?.totalBookings?.toLocaleString() || '1,248'}
          subtext="vs last month"
          trendText={`${summary?.monthBookingsChange || 12.5}%`}
          trendDirection="up"
          icon={CalendarClock}
          iconBgColor="bg-blue-500/10"
          iconColor="text-blue-600"
          bgColor="bg-[#edf4ff]"
          loading={summaryLoading}
        />
        <MetricCard
          title="Total Employees"
          value={summary?.totalEmployees || '56'}
          subtext="vs last month"
          trendText={`${summary?.monthEmployeesChange || 5.3}%`}
          trendDirection="up"
          icon={Users}
          iconBgColor="bg-emerald-500/10"
          iconColor="text-emerald-650"
          bgColor="bg-[#ecfbf3]"
          loading={summaryLoading}
        />
        <MetricCard
          title="Active"
          value={summary?.activeEmployees || '42'}
          subtext=""
          trendText="Employees"
          trendDirection="status-green"
          icon={UserCheck}
          iconBgColor="bg-purple-500/10"
          iconColor="text-purple-650"
          bgColor="bg-[#f8f0ff]"
          loading={summaryLoading}
        />
        <MetricCard
          title="Inactive"
          value={summary?.inactiveEmployees || '14'}
          subtext=""
          trendText="Employees"
          trendDirection="status-red"
          icon={UserX}
          iconBgColor="bg-rose-500/10"
          iconColor="text-rose-650"
          bgColor="bg-[#fff0f4]"
          loading={summaryLoading}
        />
        <MetricCard
          title="Total Homestays"
          value={summary?.totalHomestays || '18'}
          subtext="Properties"
          icon={Home}
          iconBgColor="bg-orange-500/10"
          iconColor="text-orange-650"
          bgColor="bg-[#fff8f0]"
          loading={summaryLoading}
        />
        <MetricCard
          title="Total Homestay/Hotel"
          value={summary?.totalHotels || '7'}
          subtext="Including Hotels"
          icon={Building}
          iconBgColor="bg-sky-500/10"
          iconColor="text-sky-650"
          bgColor="bg-[#edf9ff]"
          loading={summaryLoading}
        />
      </motion.div>

      {/* 2. Middle Row: Month-wise Bookings Bar & Booking Overview Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2">
          <BookingsBarChart 
            data={charts?.monthWiseBookings} 
            loading={chartsLoading} 
          />
        </div>
        <div>
          <BookingOverviewPie 
            data={charts?.bookingOverview} 
            total={summary?.totalBookings || 1248} 
            loading={chartsLoading || summaryLoading} 
          />
        </div>
      </div>

      {/* 3. Bottom Row: Income Spline, Employee Perf Table, Top Homestays Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        <div>
          <IncomeLineChart
            total={charts?.incomeOverview?.total || 1245000}
            change={`${charts?.incomeOverview?.change || 15.6}%`}
            data={charts?.incomeOverview?.points}
            loading={chartsLoading}
          />
        </div>
        <div>
          <EmployeePerformanceTable 
            data={employees} 
            loading={employeesLoading} 
          />
        </div>
        <div className="md:col-span-2 lg:col-span-1">
          <TopHomestaysTable 
            data={homestays} 
            loading={homestaysLoading} 
          />
        </div>
      </div>

      {/* 4. Footer Summary Metrics Row: 5 Columns with custom backgrounds */}
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 border-t border-slate-100 pt-6 sm:pt-8"
      >
        <MetricCard
          title="Total checkin Today"
          value={summary?.todayCheckins || '9'}
          subtext="Checkins today"
          illustration={CheckinIllustration}
          bgColor="bg-[#fff5f5]"
          loading={summaryLoading}
        />
        <MetricCard
          title="Total Checkout Today"
          value={summary?.todayCheckouts || '10'}
          subtext="Checkouts today"
          illustration={CheckoutIllustration}
          bgColor="bg-[#fffaf0]"
          loading={summaryLoading}
        />
        <MetricCard
          title="Repeat Customers"
          value={`${summary?.repeatCustomersRate || '38.7'}%`}
          subtext="vs last month"
          trendText={`↗ ${summary?.monthRepeatChange || '4.5'}%`}
          trendDirection="up"
          icon={RotateCcw}
          iconBgColor="bg-teal-500/10"
          iconColor="text-teal-650"
          bgColor="bg-[#e6fcf5]"
          loading={summaryLoading}
        />
        <MetricCard
          title="Today's Bookings"
          value={summary?.todayBookingsCount || '28'}
          subtext="vs yesterday"
          trendText={`↗ ${summary?.todayBookingsChange || '7.1'}%`}
          trendDirection="up"
          icon={CalendarDays}
          iconBgColor="bg-indigo-500/10"
          iconColor="text-indigo-650"
          bgColor="bg-[#f3f0ff]"
          loading={summaryLoading}
        />
        <MetricCard
          title="Today's Revenue"
          value={typeof summary?.todayRevenue === 'number' 
            ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(summary.todayRevenue)
            : '₹ 1,25,600'
          }
          subtext="vs yesterday"
          trendText={`↗ ${summary?.todayRevenueChange || '10.2'}%`}
          trendDirection="up"
          icon={Banknote}
          iconBgColor="bg-emerald-500/10"
          iconColor="text-emerald-650"
          bgColor="bg-[#ebfbee]"
          loading={summaryLoading}
        />
      </motion.div>
    </motion.div>
  );
}
