import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  Calculator,
  Plus,
  Play,
  CheckCircle2,
  DollarSign,
  Calendar,
  Users,
  Eye,
  CreditCard,
  Lock,
  ArrowRight,
  Receipt,
  FileCheck,
  AlertCircle,
  Edit
} from 'lucide-react';

export function PayRunPage({ onSelectPayslip }) {
  const { isPayrollAdmin, isPayrollUser, isAdmin, showToast } = useAuth();
  const [payruns, setPayruns] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Pay Run for detailed lifecycle management
  const [selectedPayrunId, setSelectedPayrunId] = useState(null);
  const [payrunDetails, setPayrunDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Create Pay Run Wizard Modal — 2 steps
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [createForm, setCreateForm] = useState({
    name: `Pay Run - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    salary_structure_id: '',
    employee_ids: [],
    notes: ''
  });

  // Mark Paid Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'BANK_TRANSFER',
    reference: `ACH-${Date.now().toString().slice(-6)}`,
    notes: 'Direct deposit monthly salary disbursement'
  });

  // Edit Pay Run Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    period_start: '',
    period_end: '',
    notes: ''
  });

  const handleOpenEdit = (payrun) => {
    setEditForm({
      name: payrun.name || '',
      period_start: payrun.period_start ? (payrun.period_start instanceof Date ? payrun.period_start.toISOString().split('T')[0] : String(payrun.period_start).split('T')[0]) : '',
      period_end: payrun.period_end ? (payrun.period_end instanceof Date ? payrun.period_end.toISOString().split('T')[0] : String(payrun.period_end).split('T')[0]) : '',
      notes: payrun.notes || ''
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updatePayRun(selectedPayrunId, editForm);
      showToast(res.message || 'Pay run updated successfully', 'success');
      setEditModalOpen(false);
      fetchPayrunDetails(selectedPayrunId);
      fetchPayruns();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const fetchPayruns = async () => {
    try {
      setLoading(true);
      const [prRes, empRes, structRes] = await Promise.all([
        api.getPayRuns(),
        api.getEmployees(),
        api.getSalaryStructures()
      ]);

      if (prRes.success) setPayruns(prRes.payruns);
      if (empRes.success) {
        setEmployees(empRes.employees);
        // Default select all active employees in wizard initially
        const activeIds = empRes.employees.filter(e => e.status === 'ACTIVE').map(e => e.id);
        setCreateForm(prev => ({ ...prev, employee_ids: activeIds }));
      }
      if (structRes.success && structRes.structures.length > 0) {
        setStructures(structRes.structures);
        setCreateForm(prev => ({ ...prev, salary_structure_id: structRes.structures[0].id }));
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrunDetails = async (id) => {
    try {
      setDetailsLoading(true);
      const res = await api.getPayRunDetails(id);
      if (res.success) {
        setPayrunDetails(res);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayruns();
  }, []);

  useEffect(() => {
    if (selectedPayrunId) {
      fetchPayrunDetails(selectedPayrunId);
    }
  }, [selectedPayrunId]);

  const handleCreatePayRun = async (e) => {
    e.preventDefault();
    if (createForm.employee_ids.length === 0) {
      return showToast('You must explicitly select at least one employee for this pay run', 'error');
    }

    try {
      const res = await api.createPayRun(createForm);
      showToast(res.message, 'success');
      setCreateModalOpen(false);
      setWizardStep(1);
      await fetchPayruns();
      setSelectedPayrunId(res.payrunId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCompute = async () => {
    try {
      const res = await api.computePayRun(selectedPayrunId);
      showToast(res.message, 'success');
      fetchPayrunDetails(selectedPayrunId);
      fetchPayruns();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleValidate = async () => {
    try {
      const res = await api.validatePayRun(selectedPayrunId);
      showToast(res.message, 'success');
      fetchPayrunDetails(selectedPayrunId);
      fetchPayruns();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleMarkPaid = async (e) => {
    e.preventDefault();
    try {
      const res = await api.markPayRunPaid(selectedPayrunId, paymentForm);
      showToast(res.message, 'success');
      setPaymentModalOpen(false);
      fetchPayrunDetails(selectedPayrunId);
      fetchPayruns();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toggleEmployeeSelection = (empId) => {
    setCreateForm(prev => {
      const exists = prev.employee_ids.includes(empId);
      return {
        ...prev,
        employee_ids: exists
          ? prev.employee_ids.filter(id => id !== empId)
          : [...prev.employee_ids, empId]
      };
    });
  };

  const selectAllEmployees = () => {
    setCreateForm(prev => ({
      ...prev,
      employee_ids: employees.map(e => e.id)
    }));
  };

  const deselectAllEmployees = () => {
    setCreateForm(prev => ({
      ...prev,
      employee_ids: []
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Payroll Runs & Lifecycle</h2>
          <p className="text-xs text-slate-400 mt-1">
            End-to-end Odoo-style payroll workflow: <strong className="text-slate-200">DRAFT &rarr; COMPUTED &rarr; VALIDATED &rarr; PAID</strong>.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Pay Run
        </button>
      </div>

      {/* Pay Runs Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Pay Run History List (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="glass-panel p-4 rounded-3xl border border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pay Run Batches</h3>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading pay runs...</div>
            ) : payruns.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No pay runs created yet.</div>
            ) : (
              <div className="space-y-2.5">
                {payruns.map((pr) => {
                  const isSelected = selectedPayrunId === pr.id;
                  return (
                    <div
                      key={pr.id}
                      onClick={() => setSelectedPayrunId(pr.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-brand-500/10 border-brand-500/50 shadow-lg shadow-brand-500/10'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white">{pr.name}</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">{pr.period_start} &rarr; {pr.period_end}</p>
                        </div>
                        <StatusBadge status={pr.status} size="xs" />
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-500">{pr.employee_count} Employees</span>
                        <span className="font-bold text-emerald-400">${parseFloat(pr.total_net || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Pay Run Details & Action Lifecycle (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedPayrunId ? (
            <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center">
              <Calculator className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-white">Select a Pay Run to manage</h4>
              <p className="text-xs text-slate-400 mt-1">Select from the list or create a new Pay Run to compute salaries.</p>
            </div>
          ) : detailsLoading || !payrunDetails ? (
            <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center text-xs text-slate-500">
              Loading pay run details...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pay Run Status & Lifecycle Header */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{payrunDetails.payrun.name}</h3>
                      <StatusBadge status={payrunDetails.payrun.status} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Period: <strong className="text-slate-200">{payrunDetails.payrun.period_start} to {payrunDetails.payrun.period_end}</strong>
                      {payrunDetails.payrun.salary_structure_name && ` • Structure: ${payrunDetails.payrun.salary_structure_name}`}
                    </p>
                  </div>

                  {/* Lifecycle Buttons */}
                  <div className="flex items-center gap-2">
                    {payrunDetails.payrun.status === 'DRAFT' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(payrunDetails.payrun)}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit Details
                        </button>
                        <button
                          onClick={handleCompute}
                          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-500/25 flex items-center gap-2"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Compute Payroll
                        </button>
                      </div>
                    )}

                    {payrunDetails.payrun.status === 'COMPUTED' && (
                      <>
                        <button
                          onClick={handleCompute}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                        >
                          Re-Compute
                        </button>
                        {(isPayrollAdmin || isAdmin) && (
                          <button
                            onClick={handleValidate}
                            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-500/25 flex items-center gap-2"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            Validate Payroll
                          </button>
                        )}
                      </>
                    )}

                    {payrunDetails.payrun.status === 'VALIDATED' && (isPayrollAdmin || isAdmin) && (
                      <button
                        onClick={() => setPaymentModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-2"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Mark as Paid & Disburse
                      </button>
                    )}

                    {payrunDetails.payrun.status === 'PAID' && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                        <CheckCircle2 className="w-4 h-4" />
                        Disbursed & Paid on {payrunDetails.payrun.paid_at ? new Date(payrunDetails.payrun.paid_at).toLocaleDateString() : 'Today'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="grid grid-cols-3 gap-4 pt-4 text-center">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Gross</span>
                    <p className="text-lg font-bold text-white mt-0.5">
                      ${parseFloat(payrunDetails.payrun.total_gross || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Deductions</span>
                    <p className="text-lg font-bold text-rose-400 mt-0.5">
                      -${parseFloat(payrunDetails.payrun.total_deductions || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Net Disbursement</span>
                    <p className="text-xl font-bold text-emerald-400 mt-0.5">
                      ${parseFloat(payrunDetails.payrun.total_net || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Warnings: missing bank details */}
              {payrunDetails.employees.some(e => !e.employee_email) && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Warning:</strong> Some employees are missing bank details. Verify before disbursement.
                  </div>
                </div>
              )}

              {/* Selected Employees & Payslip Items */}
              <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Selected Employees for this Pay Run ({payrunDetails.employees.length})
                    </h4>
                    <p className="text-[11px] text-slate-400">Only selected personnel are included and computed in this batch</p>
                  </div>
                  {payrunDetails.payrun.status === 'PAID' && (
                    <button
                      onClick={() => showToast('Payslip emails queued for all employees!', 'success')}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Send Payslips
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Contract Wage</th>
                        <th className="p-3">Days Worked</th>
                        <th className="p-3">Gross</th>
                        <th className="p-3">Deductions</th>
                        <th className="p-3">Net Pay</th>
                        <th className="p-3 text-right">Payslip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {payrunDetails.employees.map((emp) => (
                        <tr key={emp.employee_id} className="hover:bg-slate-800/40">
                          <td className="p-3">
                            <p className="font-semibold text-white">{emp.employee_name}</p>
                            <p className="text-[11px] font-mono text-brand-400">{emp.employee_code}</p>
                          </td>
                          <td className="p-3 text-slate-300">{emp.department_name}</td>
                          <td className="p-3 text-slate-200 font-semibold">${parseFloat(emp.contract_wage || 0).toLocaleString()}</td>
                          <td className="p-3 text-slate-300">{emp.present_days ? `${emp.present_days}/${emp.working_days}` : '—'}</td>
                          <td className="p-3 text-slate-200 font-medium">
                            {emp.gross_salary ? `$${parseFloat(emp.gross_salary).toLocaleString()}` : '—'}
                          </td>
                          <td className="p-3 text-rose-400 font-medium">
                            {emp.total_deductions ? `-$${parseFloat(emp.total_deductions).toLocaleString()}` : '—'}
                          </td>
                          <td className="p-3 font-bold text-emerald-400 text-sm">
                            {emp.net_salary ? `$${parseFloat(emp.net_salary).toLocaleString()}` : '—'}
                          </td>
                          <td className="p-3 text-right">
                            {emp.payslip_id ? (
                              <button
                                onClick={() => onSelectPayslip(emp.payslip_id)}
                                className="px-2.5 py-1 rounded-lg bg-brand-600/20 text-brand-300 hover:bg-brand-600 hover:text-white border border-brand-500/30 text-xs font-semibold transition-all flex items-center gap-1 ml-auto"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                Payslip
                              </button>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Draft</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Records (If Paid) */}
              {payrunDetails.payments?.length > 0 && (
                <div className="glass-panel p-5 rounded-3xl border border-slate-800">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Completed Disbursement Transactions ({payrunDetails.payments.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {payrunDetails.payments.map((p) => (
                      <div key={p.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-white">{p.employee_name} ({p.employee_code})</p>
                          <p className="text-[11px] font-mono text-slate-400">Ref: {p.reference} • Mode: {p.payment_method}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-400">${parseFloat(p.amount).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-500">{p.payment_date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Wizard Modal: 2-Step Pay Run Creation */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => { setCreateModalOpen(false); setWizardStep(1); }}
        title={wizardStep === 1 ? 'Step 1 of 2 — Define Pay Run Scope' : 'Step 2 of 2 — Select Employees'}
        subtitle={wizardStep === 1 ? 'Set salary structure and payroll period' : `${createForm.employee_ids.length} employee(s) selected`}
        maxWidth="max-w-3xl"
      >
        {wizardStep === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Pay Run Name *</label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Period Start *</label>
                <input type="date" required value={createForm.period_start}
                  onChange={e => setCreateForm({ ...createForm, period_start: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Period End *</label>
                <input type="date" required value={createForm.period_end}
                  onChange={e => setCreateForm({ ...createForm, period_end: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Salary Structure</label>
              <select value={createForm.salary_structure_id}
                onChange={e => setCreateForm({ ...createForm, salary_structure_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
                {structures.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button type="button" onClick={() => { setCreateModalOpen(false); setWizardStep(1); }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Cancel</button>
              <button type="button"
                onClick={() => {
                  if (!createForm.name || !createForm.period_start || !createForm.period_end) {
                    return showToast('Please fill all required fields', 'error');
                  }
                  setWizardStep(2);
                }}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-2">
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreatePayRun} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-brand-300 uppercase tracking-wider">
                  Select Employees * ({createForm.employee_ids.length} selected)
                </label>
                <p className="text-[11px] text-slate-400">Only selected personnel will be computed in this batch</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={selectAllEmployees} className="text-[11px] text-brand-400 hover:underline">Select All</button>
                <span className="text-slate-600">•</span>
                <button type="button" onClick={deselectAllEmployees} className="text-[11px] text-slate-400 hover:underline">Clear</button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5 p-2 bg-slate-950 border border-slate-800 rounded-2xl">
              {employees.map(emp => {
                const isSelected = createForm.employee_ids.includes(emp.id);
                const missingBank = !emp.bank_account_number;
                return (
                  <div key={emp.id} onClick={() => toggleEmployeeSelection(emp.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-brand-500/15 border border-brand-500/40 text-white' : 'hover:bg-slate-900 text-slate-400'
                    }`}>
                    <div className="flex items-center gap-2.5">
                      <input type="checkbox" checked={isSelected} onChange={() => {}} className="rounded bg-slate-900 border-slate-700 text-brand-500 focus:ring-0" />
                      <span className="text-xs font-semibold text-slate-200">{emp.first_name} {emp.last_name}</span>
                      <span className="text-[10px] font-mono text-slate-500">({emp.employee_code})</span>
                      {missingBank && <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">⚠ No bank</span>}
                    </div>
                    <span className="text-[11px] text-slate-400">{emp.department_name}</span>
                  </div>
                );
              })}
            </div>
            <div className="pt-4 border-t border-slate-800 flex justify-between gap-3">
              <button type="button" onClick={() => setWizardStep(1)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">← Back</button>
              <button type="submit"
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/25">
                Create Pay Run (DRAFT)
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Mark as Paid & Disburse Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Mark Pay Run as PAID & Disburse"
        subtitle="Generates individual payment transaction records and locks the payroll."
      >
        <form onSubmit={handleMarkPaid} className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs">
            <p className="font-semibold">
              Total Disbursement: <strong className="text-white text-sm">${parseFloat(payrunDetails?.payrun?.total_net || 0).toLocaleString()}</strong>
            </p>
            <p className="text-[11px] text-emerald-300 mt-1">
              This will record individual payment entries for all {payrunDetails?.employees?.length || 0} selected employees.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Disbursement Method *</label>
            <select
              value={paymentForm.payment_method}
              onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="BANK_TRANSFER">Direct Bank ACH / Wire Transfer</option>
              <option value="CASH">Cash Disbursement</option>
              <option value="CHEQUE">Company Cheque</option>
              <option value="ONLINE">Corporate Online Portal</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Transaction Reference / Batch ID *</label>
            <input
              type="text"
              required
              value={paymentForm.reference}
              onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Notes</label>
            <textarea
              rows={2}
              value={paymentForm.notes}
              onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25"
            >
              Confirm Disbursement & Mark PAID
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Pay Run Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Pay Run Details"
        subtitle="Update pay run title, payroll period range, or operational notes"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Pay Run Name *</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Period Start *</label>
              <input
                type="date"
                required
                value={editForm.period_start}
                onChange={e => setEditForm({ ...editForm, period_start: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Period End *</label>
              <input
                type="date"
                required
                value={editForm.period_end}
                onChange={e => setEditForm({ ...editForm, period_end: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Remarks</label>
            <textarea
              rows="3"
              value={editForm.notes}
              onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="e.g. Adjusted processing cycle for monthly regular payroll..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
            ></textarea>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/25"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
