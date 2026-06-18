import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, Printer, FileText, Send, IndianRupee, HelpCircle, History, Check, ShieldAlert } from 'lucide-react';

const API_SALARIES_URL = 'https://wow-getway-api.onrender.com/api/dashboard/salaries';

export default function SalaryDetails({ onCancel, selectedSalaryId }) {
  const [activeSubTab, setActiveSubTab] = useState('slip'); // 'slip' | 'history'
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 1. Fetch details of the selected salary record
  const { data: salaryRecord, isLoading: recordLoading } = useQuery({
    queryKey: ['salaryRecordDetails', selectedSalaryId],
    queryFn: async () => {
      const response = await axios.get(`${API_SALARIES_URL}/${selectedSalaryId}`);
      return response.data;
    },
    enabled: !!selectedSalaryId
  });

  // 2. Fetch employee's salary history if history tab is selected
  useEffect(() => {
    if (activeSubTab === 'history' && salaryRecord?.employeeId) {
      setHistoryLoading(true);
      axios.get(`${API_SALARIES_URL}/employee/${salaryRecord.employeeId}`)
        .then(res => {
          setHistoryList(res.data);
          setHistoryLoading(false);
        })
        .catch(err => {
          console.error('Error fetching employee history:', err);
          setHistoryLoading(false);
        });
    }
  }, [activeSubTab, salaryRecord?.employeeId]);

  // 3. Email Salary Slip Alert simulated action
  const handleEmailSlip = () => {
    alert(`Salary slip for ${salaryRecord.month} ${salaryRecord.year} has been emailed successfully to ${salaryRecord.employee.email}`);
  };

  // 4. Download PDF simulated action
  const handleDownloadPDF = () => {
    alert(`Downloading salary slip for ${salaryRecord.month} ${salaryRecord.year} as a PDF file...`);
  };

  // 5. Native Print slip handler
  const handlePrint = () => {
    window.print();
  };

  if (recordLoading || !salaryRecord) {
    return (
      <div className="py-24 text-center text-slate-400 font-medium text-xs">
        Loading salary details...
      </div>
    );
  }

  const { employee } = salaryRecord;
  const paymentDateFormatted = salaryRecord.paymentDate
    ? new Date(salaryRecord.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
    : 'N/A';

  const layoutVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }
  };

  return (
    <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6 pb-20">
      
      {/* Print stylesheet override */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-salary-slip, #print-salary-slip * {
            visibility: visible;
          }
          #print-salary-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            box-shadow: none;
            padding: 0;
            margin: 0;
          }
        }
      `}</style>

      {/* Header section with back button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl bg-white border border-slate-200 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
              Employee Salary Statement
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              View employee payroll profile, detailed deductions balance, and printable slip invoices.
            </p>
          </div>
        </div>

        {/* Action buttons controls */}
        {activeSubTab === 'slip' && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-slate-200 text-slate-655 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Printer size={14} />
              Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 border border-slate-200 text-slate-655 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <FileText size={14} />
              PDF
            </button>
            <button
              onClick={handleEmailSlip}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-100"
            >
              <Send size={14} />
              Email Slip
            </button>
          </div>
        )}
      </div>

      {/* Sub tabs switcher */}
      <div className="flex border-b border-slate-100 print:hidden">
        <button
          onClick={() => setActiveSubTab('slip')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'slip'
              ? 'border-rose-500 text-rose-500 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <FileText size={14} />
          Salary Slip Generator
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'history'
              ? 'border-rose-500 text-rose-500 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <History size={14} />
          Salary Payment History
        </button>
      </div>

      {/* SUB-VIEW 1: SALARY SLIP GENERATOR */}
      {activeSubTab === 'slip' && (
        <div className="flex justify-center">
          
          {/* Printable Invoice Styled Slip Box */}
          <div 
            id="print-salary-slip"
            className="bg-white border border-slate-200 p-8 rounded-2xl shadow-md max-w-3xl w-full space-y-6"
          >
            {/* Logo and company info header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
                    <IndianRupee size={16} className="stroke-[2.5]" />
                  </div>
                  <h1 className="text-base font-black text-slate-850 tracking-tight">
                    Zixisoft-Wow.Gateways
                  </h1>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                  Corporate Operations & Hospitality Payroll
                </p>
              </div>
              <div className="text-right">
                <span className="bg-rose-50 border border-rose-100 text-rose-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
                  Payslip: {salaryRecord.month} {salaryRecord.year}
                </span>
                <span className="text-[10px] text-slate-400 block mt-2 font-bold">
                  Generated On: {new Date(salaryRecord.createdAt || Date.now()).toLocaleDateString('en-GB')}
                </span>
              </div>
            </div>

            {/* Employee detailed metadata info grid */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Employee Name</span>
                <span className="font-bold text-slate-800">{employee.firstName} {employee.lastName}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Employee ID</span>
                <span className="font-bold text-slate-800">#{employee._id}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Designation / Role</span>
                <span className="font-bold text-slate-800">{employee.role}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Department</span>
                <span className="font-bold text-slate-800">{employee.department || 'Operations'}</span>
              </div>

              <div className="space-y-0.5 pt-2 border-t border-slate-100 sm:col-span-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Bank Coordinates</span>
                <span className="font-bold text-slate-800 block">
                  {employee.bank?.bankName || 'HDFC Bank'} | Account: {employee.bank?.accountNumber || 'xxxx-xxxx-xxxx'}
                </span>
              </div>
              <div className="space-y-0.5 pt-2 border-t border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">PAN Number</span>
                <span className="font-bold text-slate-800">{employee.panNo || 'N/A'}</span>
              </div>
              <div className="space-y-0.5 pt-2 border-t border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Aadhar Number</span>
                <span className="font-bold text-slate-800">{employee.aadharNo || 'N/A'}</span>
              </div>
            </div>

            {/* Salary Breakdown Columns Grid (Earnings vs Deductions) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Earnings column table */}
              <div className="border border-slate-150 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-4 text-left">Earnings Structure</th>
                      <th className="py-2.5 px-4 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    <tr className="hover:bg-slate-50/20">
                      <td className="py-2.5 px-4">Basic Salary</td>
                      <td className="py-2.5 px-4 text-right">{(salaryRecord.basicSalary || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/20">
                      <td className="py-2.5 px-4">House Rent Allowance (HRA)</td>
                      <td className="py-2.5 px-4 text-right">{(salaryRecord.hra || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/20">
                      <td className="py-2.5 px-4">Dearness Allowance (DA)</td>
                      <td className="py-2.5 px-4 text-right">{(salaryRecord.da || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/20">
                      <td className="py-2.5 px-4">Special Allowance</td>
                      <td className="py-2.5 px-4 text-right">{(salaryRecord.specialAllowance || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/20">
                      <td className="py-2.5 px-4">Other Allowance</td>
                      <td className="py-2.5 px-4 text-right">{(salaryRecord.otherAllowance || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-slate-50/60 font-bold border-t border-slate-150 text-slate-800">
                      <td className="py-2.5 px-4">Gross Salary (A)</td>
                      <td className="py-2.5 px-4 text-right">{(salaryRecord.grossSalary || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Deductions column table */}
              <div className="border border-slate-150 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-4 text-left">Deductions</th>
                      <th className="py-2.5 px-4 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    <tr className="hover:bg-slate-50/20">
                      <td className="py-2.5 px-4">Provident Fund (PF)</td>
                      <td className="py-2.5 px-4 text-right">{(salaryRecord.pfDeduction || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/20">
                      <td className="py-2.5 px-4">Employee State Insurance (ESI)</td>
                      <td className="py-2.5 px-4 text-right">{(salaryRecord.esiDeduction || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/20">
                      <td className="py-2.5 px-4">Professional Tax / TDS</td>
                      <td className="py-2.5 px-4 text-right">{(salaryRecord.taxDeduction || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/20">
                      <td className="py-2.5 px-4">Salary Advances</td>
                      <td className="py-2.5 px-4 text-right">{(salaryRecord.advanceDeduction || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/20">
                      <td className="py-2.5 px-4">Penalties / LOP</td>
                      <td className="py-2.5 px-4 text-right">{(salaryRecord.penaltyDeduction || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/20">
                      <td className="py-2.5 px-4">Other Deductions</td>
                      <td className="py-2.5 px-4 text-right">{(salaryRecord.otherDeduction || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-slate-50/60 font-bold border-t border-slate-150 text-slate-800">
                      <td className="py-2.5 px-4">Total Deductions (B)</td>
                      <td className="py-2.5 px-4 text-right">{(salaryRecord.totalDeductions || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>

            {/* Net Salary Summary Block */}
            <div className="bg-rose-50/20 border border-rose-100 rounded-xl p-4 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Net Take-Home Wage</span>
                <span className="text-xs text-slate-450 mt-0.5 block">Net Salary Payable = (A) Gross Salary - (B) Total Deductions</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-rose-500 block flex items-center justify-end">
                  <IndianRupee size={20} className="stroke-[2.5] text-rose-450" />
                  {(salaryRecord.netSalary || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] font-bold text-slate-500 block uppercase mt-0.5">
                  ({formNumberToWords(salaryRecord.netSalary || 0)} Rupees Only)
                </span>
              </div>
            </div>

            {/* Payment logs details */}
            <div className="border-t border-slate-200 pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Payment Mode</span>
                <span className="text-slate-800 block">{salaryRecord.paymentMode || 'Bank Transfer'}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Transaction / Ref ID</span>
                <span className="text-slate-800 block truncate">{salaryRecord.transactionId || 'N/A'}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Payment Date & Time</span>
                <span className="text-slate-800 block">
                  {paymentDateFormatted} {salaryRecord.paymentTime ? `| ${salaryRecord.paymentTime}` : ''}
                </span>
              </div>
              
              <div className="sm:col-span-3 space-y-0.5 pt-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Remarks / Notes</span>
                <span className="text-slate-500 font-medium block leading-relaxed italic">
                  {salaryRecord.remarks || 'Salary processed and logged successfully.'}
                </span>
              </div>
            </div>

            {/* Signatures and Sign-off */}
            <div className="pt-12 flex justify-between items-end">
              <div>
                <span className="border-t border-slate-300 pt-1.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Employee Signature
                </span>
              </div>
              <div className="text-right">
                <div className="h-8 font-serif italic text-slate-600 pr-4">Rahul Sharma</div>
                <span className="border-t border-slate-300 pt-1.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Authorized Signatory
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SUB-VIEW 2: SALARY PAYMENT HISTORY */}
      {activeSubTab === 'history' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden animate-fade-in print:hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Salary Month</th>
                  <th className="py-4 px-6">Gross Salary</th>
                  <th className="py-4 px-6">Total Deductions</th>
                  <th className="py-4 px-6">Net Take-Home</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6">Payment Date</th>
                  <th className="py-4 px-6">Payment Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                {historyLoading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                      Loading payment history logs...
                    </td>
                  </tr>
                ) : historyList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-450 font-medium">
                      No past monthly salaries processed for this employee.
                    </td>
                  </tr>
                ) : (
                  historyList.map(record => {
                    const payDate = record.paymentDate
                      ? new Date(record.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
                      : 'N/A';

                    // Status style mapper
                    let badgeClass = 'bg-slate-55 text-slate-600 border-slate-200';
                    if (record.status === 'Paid') badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                    if (record.status === 'Pending') badgeClass = 'bg-amber-50 text-amber-800 border-amber-100';
                    if (record.status === 'Partially Paid') badgeClass = 'bg-blue-50 text-blue-800 border-blue-100';
                    if (record.status === 'Hold') badgeClass = 'bg-rose-50 text-rose-800 border-rose-100';

                    return (
                      <tr key={record._id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-800">
                          {record.month} {record.year}
                        </td>
                        <td className="py-4 px-6 text-slate-650">
                          INR {record.grossSalary.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-6 text-rose-500 font-medium">
                          - INR {record.totalDeductions.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-6 text-emerald-600 font-bold">
                          INR {record.netSalary.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`border px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${badgeClass}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500 font-medium">{payDate}</td>
                        <td className="py-4 px-6 text-slate-650">{record.paymentMode}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </motion.div>
  );
}

// Helper: Convert numbers to English words (simple fallback)
function formNumberToWords(num) {
  if (num === 0) return 'zero';
  const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  const g = ['', 'thousand', 'million', 'billion'];

  const convertThree = (n) => {
    let word = '';
    if (n >= 100) {
      word += a[Math.floor(n / 100)] + ' hundred ';
      n %= 100;
    }
    if (n >= 20) {
      word += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      word += a[n] + ' ';
    }
    return word;
  };

  let str = '';
  let i = 0;
  while (num > 0) {
    let rem = num % 1000;
    if (rem > 0) {
      str = convertThree(rem) + g[i] + ' ' + str;
    }
    num = Math.floor(num / 1000);
    i++;
  }
  return str.trim();
}
