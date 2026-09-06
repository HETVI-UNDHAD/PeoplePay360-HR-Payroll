import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Receipt,
  Download,
  Printer,
  Eye,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  Search,
  FileText
} from 'lucide-react';

export function PayslipPage({ preSelectedPayslipId }) {
  const { user, isEmployee, showToast } = useAuth();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const payslipRef = useRef(null);

  // Selected Payslip for View/Print
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPayslipData, setSelectedPayslipData] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Filter
  const [search, setSearch] = useState('');

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const res = await api.getPayslips();
      if (res.success) setPayslips(res.payslips);
    } catch (err) {
      console.error('Fetch payslips error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayslip = async (id) => {
    try {
      setDetailsLoading(true);
      const res = await api.getPayslipDetails(id);
      if (res.success) {
        setSelectedPayslipData(res);
        setViewModalOpen(true);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [user]);

  useEffect(() => {
    if (preSelectedPayslipId) {
      handleOpenPayslip(preSelectedPayslipId);
    }
  }, [preSelectedPayslipId]);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    if (!payslipRef.current) return;
    try {
      showToast('Generating PDF...', 'info');
      const canvas = await html2canvas(payslipRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${selectedPayslipData?.payslip?.payslip_number || 'payslip'}.pdf`);
      showToast('PDF downloaded successfully!', 'success');
    } catch (err) {
      showToast('PDF generation failed', 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const filteredPayslips = payslips.filter(ps =>
    ps.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    ps.payslip_number?.toLowerCase().includes(search.toLowerCase()) ||
    ps.payroll_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isEmployee ? 'My Payslips & Salary Statements' : 'Payslips Directory'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Official itemized payslips with earnings, paid/unpaid leave tracking, tax withholdings, and printable PDF formats.
          </p>
        </div>
      </div>

      {/* Filter */}
      {!isEmployee && (
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by employee, payslip number, or pay run..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
          <span className="text-xs text-slate-400">Showing {filteredPayslips.length} payslips</span>
        </div>
      )}

      {/* Payslips Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Payslip #</th>
                <th className="py-3.5 px-4 font-semibold">Employee</th>
                <th className="py-3.5 px-4 font-semibold">Pay Run Period</th>
                <th className="py-3.5 px-4 font-semibold">Attendance & Leave</th>
                <th className="py-3.5 px-4 font-semibold">Gross Salary</th>
                <th className="py-3.5 px-4 font-semibold">Deductions</th>
                <th className="py-3.5 px-4 font-semibold">Net Salary</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-500">Loading payslips...</td></tr>
              ) : filteredPayslips.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-500">No payslips found.</td></tr>
              ) : (
                filteredPayslips.map((ps) => {
                  const present = parseFloat(ps.present_days || 0);
                  const paidLeave = parseFloat(ps.paid_leave_days || 0);
                  const unpaidLeave = parseFloat(ps.unpaid_leave_days || 0);
                  const workingDays = parseFloat(ps.working_days || 22);
                  const payable = present + paidLeave;

                  return (
                    <tr key={ps.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-brand-400">{ps.payslip_number}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-white">{ps.employee_name}</p>
                        <p className="text-[11px] text-slate-400">{ps.department_name || ps.employee_code}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        {formatDate(ps.period_start)} &rarr; {formatDate(ps.period_end)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                            {payable}/{workingDays}d
                          </span>
                          {paidLeave > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">
                              {paidLeave} Paid
                            </span>
                          )}
                          {unpaidLeave > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                              -{unpaidLeave} LOP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-semibold">₹{parseFloat(ps.gross_salary).toLocaleString()}</td>
                      <td className="py-3 px-4 text-rose-400 font-semibold">-₹{parseFloat(ps.total_deductions).toLocaleString()}</td>
                      <td className="py-3 px-4 font-bold text-emerald-400 text-sm">
                        ₹{parseFloat(ps.net_salary).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={ps.status} size="xs" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenPayslip(ps.id)}
                          className="px-3 py-1 rounded-xl bg-brand-600/20 text-brand-300 hover:bg-brand-600 hover:text-white border border-brand-500/30 text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Statement
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Printable PDF Payslip Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Official Payslip & Salary Statement"
        subtitle={selectedPayslipData?.payslip?.payslip_number}
        maxWidth="max-w-3xl"
      >
        {selectedPayslipData && (
          <div className="space-y-6 text-slate-900 bg-white p-8 rounded-2xl shadow-inner select-text print:p-0 print:shadow-none">
            {/* Action Bar inside modal (No-print) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 no-print">
              <span className="text-xs text-slate-500 font-medium">Payslip generated via PeoplePay360 Salary Engine</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>
            </div>

            {/* Printable content wrapped completely in payslipRef */}
            <div ref={payslipRef} className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedPayslipData.company.name}</h2>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm">{selectedPayslipData.company.address}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Email: {selectedPayslipData.company.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-700 bg-brand-50 px-3 py-1 rounded border border-brand-200">
                    Payslip Statement
                  </span>
                  <p className="text-sm font-mono font-bold text-slate-900 mt-2">{selectedPayslipData.payslip.payslip_number}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Period: {formatDate(selectedPayslipData.payslip.period_start)} to {formatDate(selectedPayslipData.payslip.period_end)}
                  </p>
                </div>
              </div>

              {/* Employee Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="space-y-1.5">
                  <p><strong className="text-slate-500 font-medium">Employee Name:</strong> <span className="font-bold text-slate-900">{selectedPayslipData.payslip.employee_name}</span></p>
                  <p><strong className="text-slate-500 font-medium">Employee Code:</strong> <span className="font-mono font-bold text-slate-900">{selectedPayslipData.payslip.employee_code}</span></p>
                  <p><strong className="text-slate-500 font-medium">Department:</strong> <span className="text-slate-800">{selectedPayslipData.payslip.department_name || 'N/A'}</span></p>
                  <p><strong className="text-slate-500 font-medium">Designation:</strong> <span className="text-slate-800">{selectedPayslipData.payslip.designation_name || 'N/A'}</span></p>
                </div>
                <div className="space-y-1.5">
                  <p><strong className="text-slate-500 font-medium">Contract Type:</strong> <span className="font-semibold text-slate-900">{selectedPayslipData.payslip.contract_type || 'Permanent'}</span></p>
                  <p><strong className="text-slate-500 font-medium">Contract Base Wage:</strong> <span className="font-bold text-slate-900 font-mono">₹{parseFloat(selectedPayslipData.payslip.wage || selectedPayslipData.payslip.base_wage || 0).toLocaleString()} / mo</span></p>
                  <p><strong className="text-slate-500 font-medium">Salary Structure:</strong> <span className="text-slate-800 font-medium">{selectedPayslipData.payslip.salary_structure_name || 'Standard Structure'}</span></p>
                  <p><strong className="text-slate-500 font-medium">Payment Status:</strong> <span className="font-bold text-emerald-700">{selectedPayslipData.payslip.status}</span></p>
                </div>
                <div className="space-y-1.5">
                  <p><strong className="text-slate-500 font-medium">Bank Name:</strong> <span className="text-slate-800">{selectedPayslipData.payslip.bank_name || 'Direct Deposit'}</span></p>
                  <p><strong className="text-slate-500 font-medium">Account Number:</strong> <span className="font-mono text-slate-800">{selectedPayslipData.payslip.bank_account_number || '••••••••'}</span></p>
                  <p><strong className="text-slate-500 font-medium">IFSC / SWIFT:</strong> <span className="font-mono text-slate-800">{selectedPayslipData.payslip.bank_ifsc_swift || 'N/A'}</span></p>
                  <p><strong className="text-slate-500 font-medium">Tax ID / PAN:</strong> <span className="font-mono text-slate-800">{selectedPayslipData.payslip.tax_identifier || 'N/A'}</span></p>
                </div>
              </div>

              {/* Attendance & Leave Accounting Card */}
              <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Attendance & Leave Accounting Breakdown
                  </span>
                  <span className="font-semibold text-brand-700 text-[11px] bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                    Payable Ratio: {((parseFloat(selectedPayslipData.payslip.present_days || 0) + parseFloat(selectedPayslipData.payslip.paid_leave_days || 0)) / Math.max(1, parseFloat(selectedPayslipData.payslip.working_days || 22)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-[10px] text-slate-500 uppercase block font-medium">Working Days</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedPayslipData.payslip.working_days}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-[10px] text-emerald-600 uppercase block font-medium">Present Days</span>
                    <span className="font-bold text-emerald-600 text-sm">{selectedPayslipData.payslip.present_days}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-[10px] text-blue-600 uppercase block font-medium">Paid Leave</span>
                    <span className="font-bold text-blue-600 text-sm">{selectedPayslipData.payslip.paid_leave_days || 0}</span>
                  </div>
                  <div className="bg-rose-50/60 p-2 rounded-lg border border-rose-200 shadow-sm">
                    <span className="text-[10px] text-rose-600 uppercase block font-bold">Unpaid / LOP</span>
                    <span className="font-bold text-rose-600 text-sm">
                      {selectedPayslipData.payslip.unpaid_leave_days || 0} Days
                    </span>
                  </div>
                  <div className="bg-brand-50 p-2 rounded-lg border border-brand-200 shadow-sm">
                    <span className="text-[10px] text-brand-700 uppercase font-bold block">Payable Days</span>
                    <span className="font-bold text-brand-700 text-sm">
                      {(parseFloat(selectedPayslipData.payslip.present_days || 0) + parseFloat(selectedPayslipData.payslip.paid_leave_days || 0)).toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Day-Rate & Present Days Pro-Rata Formula */}
                <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-600 gap-1">
                  <span>
                    <strong>Rate:</strong> ₹{parseFloat(selectedPayslipData.payslip.wage || selectedPayslipData.payslip.base_wage || 0).toLocaleString()} / {selectedPayslipData.payslip.working_days} days = <strong className="text-slate-900 font-mono">₹{(parseFloat(selectedPayslipData.payslip.wage || selectedPayslipData.payslip.base_wage || 0) / Math.max(1, parseFloat(selectedPayslipData.payslip.working_days || 22))).toFixed(2)}/day</strong>
                  </span>
                  <span className="text-slate-700 font-medium">
                    ✓ Salary earned for <strong className="text-emerald-700 font-bold">{(parseFloat(selectedPayslipData.payslip.present_days || 0) + parseFloat(selectedPayslipData.payslip.paid_leave_days || 0)).toFixed(1)} Days</strong> ({selectedPayslipData.payslip.present_days} Present + {selectedPayslipData.payslip.paid_leave_days || 0} Paid Leave)
                  </span>
                </div>
              </div>

              {/* Two-Column Itemized Breakdown (Earnings vs Deductions) */}
              <div className="grid grid-cols-2 gap-6 text-xs">
                {/* Earnings */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800 border-b border-slate-200 flex justify-between">
                    <span>Earnings & Allowances</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="divide-y divide-slate-100 p-2 min-h-[140px]">
                    {selectedPayslipData.lines.filter(l => ['BASIC', 'ALLOWANCE'].includes(l.category)).map((line, idx) => (
                      <div key={idx} className="flex justify-between py-1.5 px-2 text-slate-700 hover:bg-slate-50 rounded">
                        <div>
                          <p className="font-medium text-slate-900">{line.rule_name}</p>
                          {line.days_worked && line.working_days && line.days_worked < line.working_days && (
                            <p className="text-[10px] text-emerald-600">Earned for {line.days_worked} / {line.working_days} days</p>
                          )}
                        </div>
                        <span className="font-semibold text-slate-900 font-mono">₹{parseFloat(line.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-50 px-4 py-2.5 font-bold text-slate-900 border-t border-slate-200 flex justify-between">
                    <span>Total Earnings (Gross)</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">₹{parseFloat(selectedPayslipData.payslip.gross_salary).toLocaleString()}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800 border-b border-slate-200 flex justify-between">
                    <span>Deductions & Taxes</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="divide-y divide-slate-100 p-2 min-h-[140px]">
                    {selectedPayslipData.lines.filter(l => l.category === 'DEDUCTION').map((line, idx) => {
                      const isLop = (line.rule_code === 'UNPAID_LEAVE' || line.rule_code === 'LOP' || (line.rule_name && line.rule_name.includes('LOP')));
                      return (
                        <div key={idx} className={`flex justify-between py-1.5 px-2 rounded ${isLop ? 'bg-rose-50 text-rose-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>
                          <span>{line.rule_name}</span>
                          <span className="font-semibold text-rose-600 font-mono">-₹{parseFloat(line.amount).toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="bg-slate-50 px-4 py-2.5 font-bold text-slate-900 border-t border-slate-200 flex justify-between">
                    <span>Total Deductions</span>
                    <span className="text-sm font-bold text-rose-600 font-mono">-₹{parseFloat(selectedPayslipData.payslip.total_deductions).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Net Salary Highlight */}
              <div className="bg-gradient-to-r from-slate-900 to-brand-900 text-white p-5 rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <span className="text-xs font-semibold text-brand-200 uppercase tracking-wider">Net Salary Payable</span>
                  <p className="text-xs text-slate-300 mt-0.5">Disbursed via direct electronic fund transfer</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-emerald-400 font-mono">
                    ₹{parseFloat(selectedPayslipData.payslip.net_salary).toLocaleString()}
                  </span>
                  <p className="text-[10px] text-slate-300">INR</p>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-12 pt-6 text-center text-xs text-slate-600">
                <div className="border-t border-slate-300 pt-2">
                  <p className="font-bold text-slate-900">Employer Authorized Signature</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{selectedPayslipData.company.name}</p>
                </div>
                <div className="border-t border-slate-300 pt-2">
                  <p className="font-bold text-slate-900">Employee Signature & Acknowledgement</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{selectedPayslipData.payslip.employee_name}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
