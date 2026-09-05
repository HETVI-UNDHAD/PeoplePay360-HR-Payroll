import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Modal } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import {
  CreditCard,
  DollarSign,
  Calendar,
  Building2,
  Search,
  CheckCircle2,
  ArrowDownRight,
  User,
  FileText,
  Briefcase,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export function PaymentPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.getPayments();
      if (res.success) setPayments(res.payments);
    } catch (err) {
      console.error('Fetch payments error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleRowClick = async (paymentId) => {
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await api.getPaymentDetails(paymentId);
      if (res.success) {
        setSelectedPayment(res.payment);
      }
    } catch (err) {
      console.error('Fetch payment detail error:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const filteredPayments = payments.filter(p =>
    p.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.reference?.toLowerCase().includes(search.toLowerCase()) ||
    p.payroll_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Disbursement & Payment Transactions</h2>
          <p className="text-xs text-slate-400 mt-1">
            Historical bank transfer receipts and payment verification records for paid pay runs. Click any record to inspect full employee & payroll breakdown.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Disbursed</span>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">${totalPaid.toLocaleString()}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{payments.length} completed transactions</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Primary Channel</span>
            <h3 className="text-xl font-bold text-white mt-1">Direct ACH / Wire</h3>
            <p className="text-xs text-slate-500 mt-0.5">Automated clearing house</p>
          </div>
          <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Disbursement Status</span>
            <h3 className="text-xl font-bold text-emerald-400 mt-1">100% Completed</h3>
            <p className="text-xs text-slate-500 mt-0.5">Zero pending batch disputes</p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by employee, reference ID, or pay run..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
        <span className="text-xs text-slate-400">Showing {filteredPayments.length} transactions</span>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Transaction Reference</th>
                <th className="py-3.5 px-4 font-semibold">Employee</th>
                <th className="py-3.5 px-4 font-semibold">Disbursement Date</th>
                <th className="py-3.5 px-4 font-semibold">Method</th>
                <th className="py-3.5 px-4 font-semibold">Pay Run Source</th>
                <th className="py-3.5 px-4 font-semibold">Amount</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-500">Loading payments...</td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-500">No payment transactions recorded yet.</td></tr>
              ) : (
                filteredPayments.map((pay) => (
                  <tr 
                    key={pay.id} 
                    onClick={() => handleRowClick(pay.id)}
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-brand-400 group-hover:underline flex items-center gap-1.5">
                      {pay.reference}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-white">{pay.employee_name}</p>
                      <p className="text-[11px] font-mono text-slate-400">
                        {pay.employee_code} {pay.department_name && `• ${pay.department_name}`}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{pay.payment_date}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[11px] border border-slate-700">
                        {pay.payment_method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{pay.payroll_name}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400 text-sm">
                      ${parseFloat(pay.amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-xs font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => { setDetailModalOpen(false); setSelectedPayment(null); }}
        title="Payment Disbursement & Payroll Verification"
        subtitle={selectedPayment ? `Reference: ${selectedPayment.reference}` : 'Loading details...'}
        maxWidth="max-w-3xl"
      >
        {detailLoading || !selectedPayment ? (
          <div className="py-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent mb-3"></div>
            <p className="text-xs">Fetching complete payment & payroll record...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Status Header */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-400">Disbursement Completed</h4>
                  <p className="text-xs text-slate-300">
                    Disbursed on {selectedPayment.payment_date} via {selectedPayment.payment_method.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Net Amount Paid</span>
                <span className="text-xl font-bold text-emerald-400">
                  ${parseFloat(selectedPayment.amount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Grid 1: Employee & Bank Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white border-b border-slate-800 pb-2">
                  <User className="w-4 h-4 text-brand-400" />
                  Employee Profile
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Full Name:</span>
                    <span className="font-semibold text-white">{selectedPayment.employee_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Employee Code:</span>
                    <span className="font-mono text-slate-300">{selectedPayment.employee_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Department:</span>
                    <span className="text-slate-300">{selectedPayment.department_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Designation:</span>
                    <span className="text-slate-300">{selectedPayment.designation_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="text-slate-300">{selectedPayment.email || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white border-b border-slate-800 pb-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  Disbursement Bank Account
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bank Name:</span>
                    <span className="font-semibold text-white">{selectedPayment.bank_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account Number:</span>
                    <span className="font-mono text-slate-300">{selectedPayment.bank_account_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">IFSC / SWIFT Code:</span>
                    <span className="font-mono text-slate-300">{selectedPayment.bank_ifsc_swift || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tax Identifier / SSN:</span>
                    <span className="font-mono text-slate-300">{selectedPayment.tax_identifier || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid 2: Contract & Pay Run Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white border-b border-slate-800 pb-2">
                  <Briefcase className="w-4 h-4 text-purple-400" />
                  Contract Details (Snapshot)
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Contract Type:</span>
                    <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-200 font-medium">
                      {selectedPayment.contract_type || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Contract Base Wage:</span>
                    <span className="font-bold text-white">
                      ${parseFloat(selectedPayment.payslip_base_wage || selectedPayment.contract_wage || 0).toLocaleString()} / mo
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Salary Structure:</span>
                    <span className="text-slate-300 font-medium">{selectedPayment.salary_structure_name || 'Standard Structure'}</span>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white border-b border-slate-800 pb-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  Pay Run Context
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pay Run Name:</span>
                    <span className="font-semibold text-white">{selectedPayment.payroll_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payroll Period:</span>
                    <span className="text-slate-300 font-mono">
                      {selectedPayment.payrun_period_start} to {selectedPayment.payrun_period_end}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payslip Number:</span>
                    <span className="font-mono text-brand-400 font-bold">{selectedPayment.payslip_number || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown: Earnings & Deductions calculation */}
            {selectedPayment.payslip_lines && selectedPayment.payslip_lines.length > 0 && (
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-400" />
                    Payroll Calculation Breakdown
                  </span>
                  <div className="text-[11px] text-slate-400">
                    Attendance: <span className="text-white font-semibold">{selectedPayment.present_days}/{selectedPayment.working_days} Days</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Rule Name</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Computation</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-xs">
                      {selectedPayment.payslip_lines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-slate-200 font-medium">{line.rule_name}</td>
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              line.category === 'EARNING' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {line.category}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-400 text-[11px]">{line.computation_type}</td>
                          <td className={`py-2 px-3 text-right font-mono font-bold ${
                            line.category === 'EARNING' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {line.category === 'EARNING' ? '+' : '-'}${parseFloat(line.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl flex items-center justify-between border border-slate-800 mt-2 text-xs">
                  <div className="space-x-4">
                    <span className="text-slate-400">Gross: <strong className="text-emerald-400">${parseFloat(selectedPayment.gross_salary || 0).toLocaleString()}</strong></span>
                    <span className="text-slate-400">Deductions: <strong className="text-rose-400">${parseFloat(selectedPayment.total_deductions || 0).toLocaleString()}</strong></span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold mr-2">Net Pay:</span>
                    <span className="text-base font-bold text-emerald-400">${parseFloat(selectedPayment.net_salary || selectedPayment.amount).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

