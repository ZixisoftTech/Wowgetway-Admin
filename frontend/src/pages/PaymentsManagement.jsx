import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  SlidersHorizontal, 
  CheckCircle, 
  Clock, 
  XCircle, 
  DollarSign, 
  Calendar, 
  RefreshCw, 
  Download,
  AlertCircle
} from 'lucide-react';

const initialPayments = [
  { id: 'TXN-9021', type: 'receipt', reference: 'BKG-2901', payee: 'Amit Saxena', amount: 4800, gateway: 'Razorpay', status: 'Settled', date: '2026-06-12 14:32' },
  { id: 'TXN-9022', type: 'payout', reference: 'BKG-2882', payee: 'Mountain View Homestay (Owner)', amount: 3840, gateway: 'NEFT Payout', status: 'Settled', date: '2026-06-12 16:10' },
  { id: 'TXN-9023', type: 'receipt', reference: 'BKG-2905', payee: 'Priya Nair', amount: 7200, gateway: 'Stripe', status: 'Settled', date: '2026-06-12 18:45' },
  { id: 'TXN-9024', type: 'receipt', reference: 'BKG-2910', payee: 'Vikram Singh', amount: 1500, gateway: 'Razorpay', status: 'Pending', date: '2026-06-13 09:12' },
  { id: 'TXN-9025', type: 'payout', reference: 'BKG-2895', payee: 'Rose Petals Villa (Owner)', amount: 5400, gateway: 'IMPS Payout', status: 'Pending', date: '2026-06-13 10:00' },
  { id: 'TXN-9026', type: 'receipt', reference: 'BKG-2899', payee: 'Rahul Bose', amount: 3200, gateway: 'Razorpay', status: 'Failed', date: '2026-06-11 11:22' }
];

export default function PaymentsManagement() {
  const [payments, setPayments] = useState(initialPayments);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);

  // Settlement processing mock
  const [bankAccount, setBankAccount] = useState('');
  const [ifsc, setIfsc] = useState('');

  const handleOpenSettle = (txn) => {
    setSelectedTxn(txn);
    setBankAccount('50100239401824');
    setIfsc('HDFC0000241');
    setSettleModalOpen(true);
  };

  const handleProcessSettlement = (e) => {
    e.preventDefault();
    if (!bankAccount || !ifsc) {
      alert('Please fill out account parameters.');
      return;
    }
    setPayments(prev => prev.map(p => {
      if (p.id === selectedTxn.id) {
        return { ...p, status: 'Settled', gateway: 'Processed Payout' };
      }
      return p;
    }));
    setSettleModalOpen(false);
    alert('Settlement processed successfully via mock gateway transfer.');
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.payee.toLowerCase().includes(search.toLowerCase()) || p.reference.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'All' || p.type === filterType;
    const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 sm:space-y-8 select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <CreditCard size={22} />
            </span>
            B2B Payouts & Payments
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Track customer invoices, payment gateways receipts, and disburse payouts to homestay/hotel owners.
          </p>
        </div>
        <button
          onClick={() => alert('Transactions ledger CSV download triggered.')}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow"
        >
          <Download size={13} />
          Export Ledger
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#ebfbee] border border-emerald-100/50 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Receipts (Invoiced)</span>
            <span className="text-2xl font-extrabold text-slate-800 font-mono">₹ 16,700</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <ArrowDownLeft size={22} className="stroke-[2.5]" />
          </div>
        </div>

        <div className="bg-[#fff8f0] border border-amber-100/50 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Owner Payouts (Settled)</span>
            <span className="text-2xl font-extrabold text-slate-800 font-mono">₹ 3,840</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <ArrowUpRight size={22} className="stroke-[2.5]" />
          </div>
        </div>

        <div className="bg-[#edf9ff] border border-sky-100/50 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Unsettled Reserves</span>
            <span className="text-2xl font-extrabold text-slate-800 font-mono">₹ 6,900</span>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-600 rounded-xl">
            <Clock size={22} className="stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
        <div className="relative w-full lg:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payee or reference..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-slate-350 transition-colors"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch sm:items-center">
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-150">
            {['All', 'receipt', 'payout'].map(ty => (
              <button
                key={ty}
                onClick={() => setFilterType(ty)}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all capitalize cursor-pointer ${
                  filterType === ty
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200/40'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {ty === 'receipt' ? 'Receipts' : ty === 'payout' ? 'Payouts' : 'All Types'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-150">
            {['All', 'Settled', 'Pending', 'Failed'].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  filterStatus === st
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200/40'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tables list */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                <th className="py-4 px-6">Transaction ID</th>
                <th className="py-4 px-6">Type</th>
                <th className="py-4 px-6">Reference</th>
                <th className="py-4 px-6">Payee / Account</th>
                <th className="py-4 px-6">Amount</th>
                <th className="py-4 px-6">Gateway</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-650">
              {filteredPayments.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-4 px-6 font-mono font-bold text-slate-800">
                    {p.id}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`flex items-center gap-1.5 font-bold ${
                      p.type === 'receipt' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {p.type === 'receipt' ? (
                        <ArrowDownLeft size={13} className="stroke-[2.5]" />
                      ) : (
                        <ArrowUpRight size={13} className="stroke-[2.5]" />
                      )}
                      {p.type === 'receipt' ? 'Receipt' : 'Payout'}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-500">
                    {p.reference}
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-bold text-slate-700 block">{p.payee}</span>
                  </td>
                  <td className="py-4 px-6 font-mono font-bold text-slate-800">
                    ₹ {p.amount.toLocaleString()}
                  </td>
                  <td className="py-4 px-6 text-slate-500">
                    {p.gateway}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                      p.status === 'Settled'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : p.status === 'Pending'
                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                        : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-500">
                    {p.date}
                  </td>
                  <td className="py-4 px-6 text-right">
                    {p.type === 'payout' && p.status === 'Pending' ? (
                      <button
                        onClick={() => handleOpenSettle(p)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                      >
                        Disburse Payout
                      </button>
                    ) : (
                      <span className="text-slate-400 font-bold text-[10px]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settle Modal */}
      <AnimatePresence>
        {settleModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-800">
                  Process Owner Payout
                </h3>
                <button
                  onClick={() => setSettleModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-655 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5">
                <div className="flex justify-between">
                  <span>Payee:</span>
                  <strong className="text-slate-800">{selectedTxn?.payee}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Reference:</span>
                  <strong className="text-slate-800">{selectedTxn?.reference}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Disburse Amount:</span>
                  <strong className="text-slate-900 font-bold text-sm font-mono">₹ {selectedTxn?.amount.toLocaleString()}</strong>
                </div>
              </div>

              <form onSubmit={handleProcessSettlement} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Destination Bank Account</label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Enter Account Number"
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">IFSC Code</label>
                  <input
                    type="text"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value)}
                    placeholder="Enter Bank IFSC Code"
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSettleModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Transfer Funds
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
