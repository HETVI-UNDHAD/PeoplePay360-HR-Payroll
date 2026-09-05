import React, { useState, useEffect, useMemo } from 'react';
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
  AlertTriangle,
  Edit,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  Check,
  HelpCircle,
  Info,
  Layers,
  ChevronRight,
  Send
} from 'lucide-react';

export function PayRunPage({ onSelectPayslip }) {
  const { isPayrollAdmin, isPayrollUser, isAdmin, showToast } = useAuth();
  const canManagePayroll = isAdmin || isPayrollAdmin || isPayrollUser;

  // Master Lists
  const [payruns, setPayruns] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Pay Run
  const [selectedPayrunId, setSelectedPayrunId] = useState(null);
  const [payrunDetails, setPayrunDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isComputing, setIsComputing] = useState(false);

  // Table Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [warningFilter, setWarningFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modals
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

  // Edit Pay Run Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    period_start: '',
    period_end: '',
    notes: ''
  });

  // Finalize Confirmation Modal
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [finalizeConfirmed, setFinalizeConfirmed] = useState(false);
  const [finalizeLoading, setFinalizeLoading] = useState(false);

  // Mark Paid Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'BANK_TRANSFER',
    reference: `ACH-${Date.now().toString().slice(-6)}`,
    notes: 'Direct deposit monthly salary disbursement'
  });

  // Employee Detail Breakdown Modal
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [selectedEmployeeBreakdown, setSelectedEmployeeBreakdown] = useState(null);

  // Send Bulk Payslips Action
  const [isSendingPayslips, setIsSendingPayslips] = useState(false);

  const handleSendPayslips = async () => {
    if (!selectedPayrunId) return;
    setIsSendingPayslips(true);
    try {
      const res = await api.sendPayRunPayslips(selectedPayrunId);
      if (res.success) {
        showToast(res.message || 'Digital payslips dispatched to employees successfully!', 'success');
      } else {
        showToast(res.message || 'Failed to dispatch payslips.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error dispatching payslips.', 'error');
    } finally {
      setIsSendingPayslips(false);
    }
  };

  // Dynamic Payroll Eligibility for New Pay Run
  const [eligibilityData, setEligibilityData] = useState({ eligible: [], ineligible: [], all: [] });
  const [eligibilityLoading, setEligibilityLoading] = useState(false);

  const fetchEligibility = async (pStart, pEnd) => {
    if (!pStart || !pEnd) return;
    try {
      setEligibilityLoading(true);
      const res = await api.getPayrollEligibility({ period_start: pStart, period_end: pEnd });
      if (res.success) {
        setEligibilityData(res);
        // Pre-select all eligible employees
        const eligibleIds = res.eligible.map(e => e.id);
        setCreateForm(prev => ({
          ...prev,
          employee_ids: eligibleIds
        }));
      }
    } catch (err) {
      console.error('Fetch eligibility error:', err);
    } finally {
      setEligibilityLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Data Fetching
  // ----------------------------------------------------------------------------
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
      }
      if (structRes.success && structRes.structures.length > 0) {
        setStructures(structRes.structures);
        setCreateForm(prev => ({ ...prev, salary_structure_id: structRes.structures[0].id }));
      }
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Failed to load initial payroll data', 'error');
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

  // ----------------------------------------------------------------------------
  // Lifecycle Actions
  // ----------------------------------------------------------------------------
  const handleCreatePayRun = async (e) => {
    e.preventDefault();
    if (createForm.employee_ids.length === 0) {
      return showToast('You must select at least one employee for this pay run', 'error');
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
    if (!selectedPayrunId) return;
    try {
      setIsComputing(true);
      const res = await api.computePayRun(selectedPayrunId);
      showToast(res.message || 'Payroll computed successfully', 'success');
      await fetchPayrunDetails(selectedPayrunId);
      await fetchPayruns();
    } catch (err) {
      showToast(err.message || 'Failed to compute payroll', 'error');
    } finally {
      setIsComputing(false);
    }
  };

  const handleRecalculateEmployee = async (employeeId) => {
    if (!selectedPayrunId || !employeeId) return;
    try {
      const res = await api.recalculatePayRunEmployee(selectedPayrunId, employeeId);
      showToast(res.message || 'Employee calculation refreshed', 'success');
      fetchPayrunDetails(selectedPayrunId);
      fetchPayruns();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleFinalizeSubmit = async () => {
    if (!selectedPayrunId) return;
    try {
      setFinalizeLoading(true);
      const res = await api.finalizePayRun(selectedPayrunId);
      showToast(res.message || 'Pay run finalized and locked!', 'success');
      setFinalizeModalOpen(false);
      setFinalizeConfirmed(false);
      await fetchPayrunDetails(selectedPayrunId);
      await fetchPayruns();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setFinalizeLoading(false);
    }
  };

  const handleMarkPaid = async (e) => {
    e.preventDefault();
    try {
      const res = await api.markPayRunPaid(selectedPayrunId, paymentForm);
      showToast(res.message || 'Payroll marked as PAID and disbursements recorded', 'success');
      setPaymentModalOpen(false);
      fetchPayrunDetails(selectedPayrunId);
      fetchPayruns();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenEdit = (payrun) => {
    setEditForm({
      name: payrun.name || '',
      period_start: payrun.period_start ? String(payrun.period_start).split('T')[0] : '',
      period_end: payrun.period_end ? String(payrun.period_end).split('T')[0] : '',
      notes: payrun.notes || ''
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updatePayRun(selectedPayrunId, editForm);
      showToast(res.message || 'Pay run details updated', 'success');
      setEditModalOpen(false);
      fetchPayrunDetails(selectedPayrunId);
      fetchPayruns();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ----------------------------------------------------------------------------
  // Filtered & Sorted Employees
  // ----------------------------------------------------------------------------
  const filteredEmployees = useMemo(() => {
    if (!payrunDetails?.employees) return [];
    let list = [...payrunDetails.employees];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        e =>
          (e.employee_name && e.employee_name.toLowerCase().includes(term)) ||
          (e.employee_code && e.employee_code.toLowerCase().includes(term)) ||
          (e.department_name && e.department_name.toLowerCase().includes(term))
      );
    }

    // Department filter
    if (departmentFilter !== 'ALL') {
      list = list.filter(e => e.department_name === departmentFilter);
    }

    // Warning filter
    if (warningFilter === 'WARNINGS_ONLY') {
      list = list.filter(e => e.warnings && e.warnings.length > 0);
    } else if (warningFilter === 'VALID_ONLY') {
      list = list.filter(e => !e.warnings || e.warnings.length === 0);
    }

    // Sorting
    list.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'name') {
        valA = a.employee_name || '';
        valB = b.employee_name || '';
      } else if (sortBy === 'department') {
        valA = a.department_name || '';
        valB = b.department_name || '';
      } else if (sortBy === 'gross') {
        valA = parseFloat(a.gross_salary || 0);
        valB = parseFloat(b.gross_salary || 0);
      } else if (sortBy === 'net') {
        valA = parseFloat(a.net_salary || 0);
        valB = parseFloat(b.net_salary || 0);
      } else if (sortBy === 'payable_days') {
        valA = parseFloat(a.payable_days || 0);
        valB = parseFloat(b.payable_days || 0);
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [payrunDetails?.employees, searchTerm, departmentFilter, warningFilter, sortBy, sortOrder]);

  const uniqueDepartments = useMemo(() => {
    if (!payrunDetails?.employees) return [];
    const depts = new Set(payrunDetails.employees.map(e => e.department_name).filter(Boolean));
    return Array.from(depts).sort();
  }, [payrunDetails?.employees]);

  // Current pay run status normalizer
  const currentStatus = payrunDetails?.payrun?.normalized_status || 'DRAFT';
  const isDraft = currentStatus === 'DRAFT';
  const isReview = currentStatus === 'REVIEW' || currentStatus === 'COMPUTED';
  const isFinalized = currentStatus === 'FINALIZED' || currentStatus === 'VALIDATED';
  const isPaid = currentStatus === 'PAID';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">Payroll Runs & Lifecycle</h2>
          <p className="text-xs text-text-secondary mt-1">
            Enterprise End-to-End Payroll Engine: <span className="font-semibold text-text-primary">Draft → Computing → Review → Finalized → Paid</span>
          </p>
        </div>

        {canManagePayroll && (
          <button
            onClick={() => {
              setCreateModalOpen(true);
              setWizardStep(1);
              fetchEligibility(createForm.period_start, createForm.period_end);
            }}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Pay Run
          </button>
        )}
      </div>

      {/* Pay Runs Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Pay Run History List (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="glass-panel p-4 rounded-3xl border border-border-color bg-surface-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Pay Run History</h3>
              <span className="text-[11px] font-semibold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full">
                {payruns.length} Batches
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-text-secondary">Loading pay runs...</div>
            ) : payruns.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-secondary">
                No pay runs created yet. Click "New Pay Run" to begin.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
                {payruns.map((pr) => {
                  const isSelected = selectedPayrunId === pr.id;
                  const prStatus = pr.normalized_status || pr.status;
                  return (
                    <div
                      key={pr.id}
                      onClick={() => setSelectedPayrunId(pr.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-brand-500/10 border-brand-500/50 shadow-md shadow-brand-500/10'
                          : 'bg-surface-elevated/40 border-border-color hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-text-primary truncate">{pr.name}</h4>
                          <p className="text-[11px] text-text-secondary mt-0.5">
                            {pr.period_start} &rarr; {pr.period_end}
                          </p>
                        </div>
                        <StatusBadge status={prStatus} size="xs" />
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-border-color flex items-center justify-between text-xs">
                        <span className="text-text-secondary text-[11px] flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          {pr.employee_count} Personnel
                        </span>
                        <span className="font-bold text-emerald-400">
                          ${parseFloat(pr.total_net || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
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
            <div className="glass-panel p-12 rounded-3xl border border-border-color bg-surface-card text-center">
              <Calculator className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-text-primary">Select a Pay Run to manage</h4>
              <p className="text-xs text-text-secondary mt-1">
                Choose a batch from the history list or create a new Pay Run to compute salaries.
              </p>
            </div>
          ) : detailsLoading || !payrunDetails ? (
            <div className="glass-panel p-12 rounded-3xl border border-border-color bg-surface-card text-center text-xs text-text-secondary">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
              Loading pay run details and computations...
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Pay Run Status & Lifecycle Header */}
              <div className="glass-panel p-6 rounded-3xl border border-border-color bg-surface-card">
                
                {/* 5-State Workflow Bar */}
                <div className="pb-5 border-b border-border-color">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-lg font-bold text-text-primary">{payrunDetails.payrun.name}</h3>
                      <StatusBadge status={currentStatus} />
                    </div>

                    <div className="flex items-center gap-2">
                      {isDraft && canManagePayroll && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(payrunDetails.payrun)}
                            className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-slate-700 text-text-secondary text-xs font-semibold flex items-center gap-1.5 border border-border-color"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={handleCompute}
                            disabled={isComputing}
                            className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/25 flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isComputing ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Computing...
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                Compute Payroll
                              </>
                            )}
                          </button>
                        </>
                      )}

                      {isReview && canManagePayroll && (
                        <>
                          <button
                            onClick={handleCompute}
                            disabled={isComputing}
                            className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-slate-700 text-text-secondary text-xs font-medium border border-border-color flex items-center gap-1.5"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isComputing ? 'animate-spin' : ''}`} />
                            Re-calculate All
                          </button>
                          {(isPayrollAdmin || isAdmin) && (
                            <button
                              onClick={() => {
                                setFinalizeConfirmed(false);
                                setFinalizeModalOpen(true);
                              }}
                              disabled={!payrunDetails.validation?.canFinalize}
                              className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-500/25 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                              title={
                                !payrunDetails.validation?.canFinalize
                                  ? 'Fix blocking validation errors below before finalization'
                                  : 'Finalize and lock pay run'
                              }
                            >
                              <Lock className="w-3.5 h-3.5" />
                              Finalize & Lock
                            </button>
                          )}
                        </>
                      )}

                      {isFinalized && (isPayrollAdmin || isAdmin) && (
                        <button
                          onClick={() => setPaymentModalOpen(true)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/25 flex items-center gap-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Mark as Paid & Disburse
                        </button>
                      )}

                      {isPaid && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                          <CheckCircle2 className="w-4 h-4" />
                          Locked Historical Record
                        </div>
                      )}

                      {/* Bulk Send Payslips Action */}
                      {canManagePayroll && (isFinalized || isPaid || currentStatus === 'COMPUTED' || currentStatus === 'REVIEW') && (
                        <button
                          onClick={handleSendPayslips}
                          disabled={isSendingPayslips}
                          className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-500/25 flex items-center gap-1.5 disabled:opacity-50 transition-all"
                          title="Send digital payslips & email notifications to all employees in this batch"
                        >
                          <Send className={`w-3.5 h-3.5 ${isSendingPayslips ? 'animate-pulse' : ''}`} />
                          {isSendingPayslips ? 'Sending...' : 'SEND PAYSLIPS'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lifecycle Stepper */}
                  <div className="grid grid-cols-5 gap-2 pt-2">
                    {[
                      { id: 'DRAFT', label: '1. Draft', desc: 'Scope defined' },
                      { id: 'COMPUTING', label: '2. Computing', desc: 'Rules evaluation' },
                      { id: 'REVIEW', label: '3. Review', desc: 'Verify & edit' },
                      { id: 'FINALIZED', label: '4. Finalized', desc: 'Locked & payslips' },
                      { id: 'PAID', label: '5. Paid', desc: 'Disbursed' }
                    ].map((step, idx) => {
                      const statesOrder = ['DRAFT', 'COMPUTING', 'REVIEW', 'FINALIZED', 'PAID'];
                      const currentIdx = statesOrder.indexOf(currentStatus === 'COMPUTED' ? 'REVIEW' : (currentStatus === 'VALIDATED' ? 'FINALIZED' : currentStatus));
                      const isPast = idx < currentIdx;
                      const isCurrent = idx === currentIdx;

                      return (
                        <div
                          key={step.id}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            isCurrent
                              ? 'bg-brand-500/15 border-brand-500/50 shadow-sm'
                              : isPast
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-surface-elevated/30 border-border-color/50 opacity-60'
                          }`}
                        >
                          <p
                            className={`text-[11px] font-bold ${
                              isCurrent ? 'text-brand-400' : isPast ? 'text-emerald-400' : 'text-text-secondary'
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="text-[10px] text-text-secondary truncate mt-0.5">{step.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Metadata details line */}
                <div className="flex flex-wrap items-center justify-between text-xs text-text-secondary pt-3">
                  <div className="flex items-center gap-3">
                    <span>
                      Period: <strong className="text-text-primary">{payrunDetails.payrun.period_start} to {payrunDetails.payrun.period_end}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Structure: <strong className="text-text-primary">{payrunDetails.payrun.salary_structure_name || 'Individual Employee Contracts'}</strong>
                    </span>
                  </div>
                  {payrunDetails.payrun.validator_name && (
                    <span>
                      Finalized by: <strong className="text-text-primary">{payrunDetails.payrun.validator_name}</strong>
                    </span>
                  )}
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-5 border-t border-border-color mt-4 text-center">
                  <div className="p-2.5 rounded-xl bg-surface-elevated/40 border border-border-color">
                    <span className="text-[10px] text-text-secondary uppercase font-semibold">Employees</span>
                    <p className="text-base font-bold text-text-primary mt-0.5">
                      {payrunDetails.kpis?.employee_count || payrunDetails.employees?.length || 0}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-elevated/40 border border-border-color">
                    <span className="text-[10px] text-text-secondary uppercase font-semibold">Total Gross</span>
                    <p className="text-base font-bold text-text-primary mt-0.5">
                      ${parseFloat(payrunDetails.kpis?.total_gross || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-elevated/40 border border-border-color">
                    <span className="text-[10px] text-text-secondary uppercase font-semibold">Deductions</span>
                    <p className="text-base font-bold text-rose-400 mt-0.5">
                      -${parseFloat(payrunDetails.kpis?.total_deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-elevated/40 border border-border-color">
                    <span className="text-[10px] text-text-secondary uppercase font-semibold">Net Disbursement</span>
                    <p className="text-base font-bold text-emerald-400 mt-0.5">
                      ${parseFloat(payrunDetails.kpis?.total_net || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-elevated/40 border border-border-color">
                    <span className="text-[10px] text-text-secondary uppercase font-semibold">Average Net</span>
                    <p className="text-base font-bold text-text-primary mt-0.5">
                      ${parseFloat(payrunDetails.kpis?.average_net || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Paid Status - Locked Historical Record Banner (§15 & §16) */}
              {isPaid && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-400 text-sm">PAID — Locked Historical Record</p>
                      <p className="text-[11px] text-emerald-200/80 mt-0.5">
                        Payroll completed successfully. All disbursements have been posted and this historical payroll is permanently locked.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-[11px] border border-emerald-500/30 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    LOCKED
                  </span>
                </div>
              )}

              {/* Blocking Errors Banner (§6 & §10) - only shown when in editable/reviewable lifecycle states */}
              {(isDraft || isReview) && payrunDetails.validation?.blockingErrors?.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-rose-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>Blocking Validation Errors ({payrunDetails.validation.blockingErrors.length}) — Finalization is Blocked</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-200">
                    {payrunDetails.validation.blockingErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Non-Blocking Warnings Banner (§10) */}
              {payrunDetails.validation?.warnings?.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Non-Blocking Warnings ({payrunDetails.validation.warnings.length})</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-200/90 max-h-24 overflow-y-auto">
                    {payrunDetails.validation.warnings.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Employee Review Table & Filter Toolbar (§4) */}
              <div className="glass-panel rounded-3xl border border-border-color bg-surface-card overflow-hidden">
                <div className="p-4 border-b border-border-color space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                        Employee Payroll Review Register ({filteredEmployees.length} of {payrunDetails.employees?.length || 0})
                      </h4>
                      <p className="text-[11px] text-text-secondary">
                        Click "Inspect Breakdown" to trace attendance, payable days, and earnings/deductions derivation.
                      </p>
                    </div>

                    {isPaid && (
                      <button
                        onClick={() => showToast('Payslip email notifications sent to all personnel!', 'success')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        Email Payslips
                      </button>
                    )}
                  </div>

                  {/* Filter / Search Toolbar */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                    {/* Search */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search employee or code..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    {/* Department */}
                    <select
                      value={departmentFilter}
                      onChange={e => setDepartmentFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="ALL" className="bg-slate-900 text-white">All Departments</option>
                      {uniqueDepartments.map(d => (
                        <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>
                      ))}
                    </select>

                    {/* Warning Filter */}
                    <select
                      value={warningFilter}
                      onChange={e => setWarningFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="ALL" className="bg-slate-900 text-white">All Statuses</option>
                      <option value="WARNINGS_ONLY" className="bg-slate-900 text-white">Flagged Warnings Only</option>
                      <option value="VALID_ONLY" className="bg-slate-900 text-white">Without Warnings</option>
                    </select>

                    {/* Sort */}
                    <div className="flex items-center gap-1">
                      <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                      >
                        <option value="name" className="bg-slate-900 text-white">Sort by Name</option>
                        <option value="department" className="bg-slate-900 text-white">Sort by Dept</option>
                        <option value="gross" className="bg-slate-900 text-white">Sort by Gross</option>
                        <option value="net" className="bg-slate-900 text-white">Sort by Net Pay</option>
                        <option value="payable_days" className="bg-slate-900 text-white">Sort by Payable Days</option>
                      </select>
                      <button
                        onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                        className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table (§4) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-elevated/80 text-text-secondary uppercase text-[10px] font-semibold border-b border-border-color">
                      <tr>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Department</th>
                        <th className="p-3 text-center">Working Days</th>
                        <th className="p-3 text-center">Present</th>
                        <th className="p-3 text-center">Leave</th>
                        <th className="p-3 text-center">Unpaid</th>
                        <th className="p-3 text-center font-bold text-brand-400">Payable Days</th>
                        <th className="p-3 text-right">Gross</th>
                        <th className="p-3 text-right">Deductions</th>
                        <th className="p-3 text-right">Net Pay</th>
                        <th className="p-3 text-center">Issues</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                      {filteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="p-8 text-center text-text-secondary text-xs">
                            No employees match the active filters.
                          </td>
                        </tr>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <tr
                            key={emp.employee_id}
                            className="hover:bg-surface-elevated/40 transition-colors"
                          >
                            <td className="p-3">
                              <p className="font-semibold text-text-primary">{emp.employee_name}</p>
                              <p className="text-[10px] font-mono text-brand-400">{emp.employee_code}</p>
                            </td>
                            <td className="p-3 text-text-secondary">{emp.department_name || '—'}</td>
                            <td className="p-3 text-center text-text-secondary">{emp.working_days}</td>
                            <td className="p-3 text-center text-emerald-400 font-medium">{emp.present_days}</td>
                            <td className="p-3 text-center text-blue-400">{emp.paid_leave_days}</td>
                            <td className="p-3 text-center text-rose-400">{emp.unpaid_leave_days}</td>
                            <td className="p-3 text-center font-bold text-brand-400 bg-brand-500/5">
                              {emp.payable_days}
                            </td>
                            <td className="p-3 text-right text-text-primary font-medium">
                              {emp.gross_salary ? `$${parseFloat(emp.gross_salary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="p-3 text-right text-rose-400 font-medium">
                              {emp.total_deductions ? `-$${parseFloat(emp.total_deductions).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-400 text-sm">
                              {emp.net_salary ? `$${parseFloat(emp.net_salary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="p-3 text-center">
                              {emp.warnings && emp.warnings.length > 0 ? (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30"
                                  title={emp.warnings.join(', ')}
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  {emp.warnings.length}
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[10px] text-emerald-400 font-medium">
                                  <Check className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Detail Breakdown Modal Trigger (§5) */}
                                <button
                                  onClick={() => {
                                    setSelectedEmployeeBreakdown(emp);
                                    setBreakdownModalOpen(true);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-surface-elevated hover:bg-slate-700 text-text-secondary hover:text-text-primary text-[11px] font-medium border border-border-color flex items-center gap-1"
                                  title="Inspect Calculation Trace"
                                >
                                  <Eye className="w-3 h-3" />
                                  Trace
                                </button>

                                {/* Per-employee recalculate in REVIEW */}
                                {isReview && canManagePayroll && (
                                  <button
                                    onClick={() => handleRecalculateEmployee(emp.employee_id)}
                                    className="p-1 rounded-lg bg-surface-elevated hover:bg-slate-700 text-text-secondary hover:text-text-primary text-[11px] border border-border-color"
                                    title="Recalculate this employee"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                  </button>
                                )}

                                {/* Payslip View */}
                                {emp.payslip_id && (
                                  <button
                                    onClick={() => onSelectPayslip && onSelectPayslip(emp.payslip_id)}
                                    className="px-2 py-1 rounded-lg bg-brand-600/20 text-brand-400 hover:bg-brand-600 hover:text-white border border-brand-500/30 text-[11px] font-semibold transition-all flex items-center gap-1"
                                    title="View Printable Payslip"
                                  >
                                    <Receipt className="w-3 h-3" />
                                    Payslip
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Disbursement Records (If Paid) */}
              {payrunDetails.payments?.length > 0 && (
                <div className="glass-panel p-5 rounded-3xl border border-border-color bg-surface-card">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Completed Disbursement Transactions ({payrunDetails.payments.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {payrunDetails.payments.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-surface-elevated/60 border border-border-color flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-text-primary">
                            {p.employee_name} ({p.employee_code})
                          </p>
                          <p className="text-[11px] font-mono text-text-secondary">
                            Ref: {p.reference} • Mode: {p.payment_method}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-400">
                            ${parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] text-text-secondary">{p.payment_date}</p>
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

      {/* ========================================================================= */}
      {/* MODAL: Employee Payroll Detail View (§5) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={breakdownModalOpen}
        onClose={() => setBreakdownModalOpen(false)}
        title="Employee Payroll Breakdown & Calculation Trace"
        subtitle={selectedEmployeeBreakdown ? `${selectedEmployeeBreakdown.employee_name} (${selectedEmployeeBreakdown.employee_code})` : ''}
        maxWidth="max-w-3xl"
      >
        {selectedEmployeeBreakdown && (
          <div className="space-y-4 text-xs">
            {/* Employee Meta Summary */}
            <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border-color grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-text-secondary uppercase">Department</span>
                <p className="font-semibold text-text-primary mt-0.5">{selectedEmployeeBreakdown.department_name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary uppercase">Designation</span>
                <p className="font-semibold text-text-primary mt-0.5">{selectedEmployeeBreakdown.designation_name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary uppercase">Contract Wage</span>
                <p className="font-bold text-brand-400 mt-0.5">
                  ${parseFloat(selectedEmployeeBreakdown.contract_wage || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary uppercase">Salary Structure</span>
                <p className="font-semibold text-text-primary mt-0.5 truncate">
                  {selectedEmployeeBreakdown.employee_structure_name || 'Standard Structure'}
                </p>
              </div>
            </div>

            {/* Attendance & Payable Days Trace */}
            <div className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-border-color space-y-2">
              <h5 className="font-bold text-text-primary flex items-center gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-brand-400" />
                Attendance & Payable Days Derivation
              </h5>
              <div className="grid grid-cols-5 gap-2 text-center pt-1">
                <div className="p-2 rounded-xl bg-surface-elevated border border-border-color">
                  <span className="text-[10px] text-text-secondary uppercase">Working Days</span>
                  <p className="font-bold text-text-primary text-sm mt-0.5">{selectedEmployeeBreakdown.working_days}</p>
                </div>
                <div className="p-2 rounded-xl bg-surface-elevated border border-border-color">
                  <span className="text-[10px] text-emerald-400 uppercase">Present</span>
                  <p className="font-bold text-emerald-400 text-sm mt-0.5">{selectedEmployeeBreakdown.present_days}</p>
                </div>
                <div className="p-2 rounded-xl bg-surface-elevated border border-border-color">
                  <span className="text-[10px] text-blue-400 uppercase">Paid Leave</span>
                  <p className="font-bold text-blue-400 text-sm mt-0.5">{selectedEmployeeBreakdown.paid_leave_days}</p>
                </div>
                <div className="p-2 rounded-xl bg-surface-elevated border border-border-color">
                  <span className="text-[10px] text-rose-400 uppercase">Unpaid Leave</span>
                  <p className="font-bold text-rose-400 text-sm mt-0.5">{selectedEmployeeBreakdown.unpaid_leave_days}</p>
                </div>
                <div className="p-2 rounded-xl bg-brand-500/15 border border-brand-500/40">
                  <span className="text-[10px] text-brand-400 uppercase font-bold">Payable Days</span>
                  <p className="font-bold text-brand-400 text-sm mt-0.5">{selectedEmployeeBreakdown.payable_days}</p>
                </div>
              </div>
              <p className="text-[11px] text-text-secondary pt-1">
                Formula applied: <code className="text-brand-300 font-mono">min(Working Days, Present Days + Paid Leave)</code>. Unpaid absences adjust wage pro-rata.
              </p>
            </div>

            {/* Earnings & Deductions Dual Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Earnings */}
              <div className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-border-color space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">Gross Earnings</h5>
                  <span className="font-bold text-emerald-400 text-sm">
                    ${parseFloat(selectedEmployeeBreakdown.gross_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {selectedEmployeeBreakdown.lines?.filter(l => l.category === 'BASIC' || l.category === 'ALLOWANCE').length === 0 ? (
                    <p className="text-[11px] text-text-secondary">No earnings line items recorded.</p>
                  ) : (
                    selectedEmployeeBreakdown.lines
                      ?.filter(l => l.category === 'BASIC' || l.category === 'ALLOWANCE')
                      .map(line => (
                        <div key={line.id || line.rule_code} className="p-2 rounded-xl bg-surface-elevated border border-border-color flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-text-primary">{line.rule_name}</span>
                            <span className="text-[10px] font-mono text-brand-400 ml-1.5">({line.rule_code})</span>
                            <p className="text-[10px] text-text-secondary">{line.computation_type} {line.rate ? `• ${line.rate}%` : ''}</p>
                          </div>
                          <span className="font-bold text-text-primary">
                            ${parseFloat(line.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Deductions */}
              <div className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-border-color space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-rose-400 uppercase tracking-wider text-[11px]">Total Deductions</h5>
                  <span className="font-bold text-rose-400 text-sm">
                    -${parseFloat(selectedEmployeeBreakdown.total_deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {selectedEmployeeBreakdown.lines?.filter(l => l.category === 'DEDUCTION').length === 0 ? (
                    <p className="text-[11px] text-text-secondary">No deduction line items recorded.</p>
                  ) : (
                    selectedEmployeeBreakdown.lines
                      ?.filter(l => l.category === 'DEDUCTION')
                      .map(line => (
                        <div key={line.id || line.rule_code} className="p-2 rounded-xl bg-surface-elevated border border-border-color flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-text-primary">{line.rule_name}</span>
                            <span className="text-[10px] font-mono text-rose-400 ml-1.5">({line.rule_code})</span>
                            <p className="text-[10px] text-text-secondary">{line.computation_type} {line.rate ? `• ${line.rate}%` : ''}</p>
                          </div>
                          <span className="font-bold text-rose-400">
                            -${parseFloat(line.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* Net Salary Final Derivation Banner */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Final Net Pay Due</span>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Gross Earnings (${parseFloat(selectedEmployeeBreakdown.gross_salary || 0).toLocaleString()}) − Total Deductions (${parseFloat(selectedEmployeeBreakdown.total_deductions || 0).toLocaleString()})
                </p>
              </div>
              <p className="text-xl font-extrabold text-emerald-400">
                ${parseFloat(selectedEmployeeBreakdown.net_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* Warnings list for this employee */}
            {selectedEmployeeBreakdown.warnings && selectedEmployeeBreakdown.warnings.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Notices for HR Attention:</strong>
                  <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                    {selectedEmployeeBreakdown.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setBreakdownModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-elevated text-text-primary text-xs font-semibold hover:bg-slate-700"
              >
                Close Trace
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Finalization Confirmation Summary (§9) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={finalizeModalOpen}
        onClose={() => setFinalizeModalOpen(false)}
        title="Confirm Payroll Finalization & Lock"
        subtitle="This action makes computations and payslips immutable. Review summary before proceeding."
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
            <h5 className="font-bold flex items-center gap-1.5 text-amber-400">
              <Lock className="w-4 h-4" />
              Finalization Summary Check
            </h5>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <span className="text-[10px] text-text-secondary uppercase">Eligible Personnel</span>
                <p className="text-base font-bold text-text-primary mt-0.5">{payrunDetails?.employees?.length || 0}</p>
              </div>
              <div>
                <span className="text-[10px] text-text-secondary uppercase">Total Net Disbursement</span>
                <p className="text-base font-bold text-emerald-400 mt-0.5">
                  ${parseFloat(payrunDetails?.kpis?.total_net || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Warnings Count */}
          {payrunDetails?.validation?.warnings?.length > 0 && (
            <div className="p-3 rounded-xl bg-surface-elevated border border-border-color text-text-secondary text-[11px]">
              <span className="font-semibold text-amber-400">
                Notice: {payrunDetails.validation.warnings.length} non-blocking warning(s) detected.
              </span>
              <p className="mt-0.5">You can still proceed with finalization, but verify any unusual entries.</p>
            </div>
          )}

          {/* Explicit Confirmation Checkbox */}
          <div className="p-3 rounded-xl bg-surface-elevated/60 border border-border-color flex items-start gap-2.5">
            <input
              type="checkbox"
              id="confirmFinalizeCheckbox"
              checked={finalizeConfirmed}
              onChange={e => setFinalizeConfirmed(e.target.checked)}
              className="mt-0.5 rounded bg-surface-elevated border-border-color text-brand-500 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="confirmFinalizeCheckbox" className="text-xs text-text-primary cursor-pointer select-none">
              I have reviewed all employee calculations, earnings, and statutory deductions. I understand that finalizing this pay run will permanently lock all records and generate finalized payslips.
            </label>
          </div>

          <div className="pt-3 border-t border-border-color flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setFinalizeModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-surface-elevated text-text-secondary text-xs font-semibold hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFinalizeSubmit}
              disabled={!finalizeConfirmed || finalizeLoading}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {finalizeLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Finalize & Lock Pay Run
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Create New Pay Run (Wizard) */}
      {/* ========================================================================= */}
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
              <label className="block text-xs font-semibold text-primary mb-1">Pay Run Name *</label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">Period Start *</label>
                <input
                  type="date"
                  required
                  value={createForm.period_start}
                  onChange={e => setCreateForm({ ...createForm, period_start: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">Period End *</label>
                <input
                  type="date"
                  required
                  value={createForm.period_end}
                  onChange={e => setCreateForm({ ...createForm, period_end: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Salary Structure</label>
              <select
                value={createForm.salary_structure_id}
                onChange={e => setCreateForm({ ...createForm, salary_structure_id: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                {structures.map(s => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Notes / Description</label>
              <textarea
                rows={2}
                value={createForm.notes}
                onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Optional batch notes..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="pt-4 border-t border-theme flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setCreateModalOpen(false); setWizardStep(1); }}
                className="px-4 py-2 rounded-xl bg-elevated text-secondary text-xs font-semibold hover:bg-slate-800 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!createForm.name || !createForm.period_start || !createForm.period_end) {
                    return showToast('Please fill all required fields', 'error');
                  }
                  if (new Date(createForm.period_start) > new Date(createForm.period_end)) {
                    return showToast('Period Start date cannot be after Period End date', 'error');
                  }
                  await fetchEligibility(createForm.period_start, createForm.period_end);
                  setWizardStep(2);
                }}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-2"
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreatePayRun} className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-theme">
              <div>
                <label className="block text-xs font-bold text-brand-400 uppercase tracking-wider">
                  Payroll Personnel Selection ({createForm.employee_ids.length} selected)
                </label>
                <p className="text-[11px] text-secondary">
                  Period: <span className="font-semibold text-primary">{createForm.period_start}</span> to <span className="font-semibold text-primary">{createForm.period_end}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchEligibility(createForm.period_start, createForm.period_end)}
                  className="text-[11px] text-brand-400 hover:underline flex items-center gap-1"
                  title="Re-run contract eligibility checks"
                >
                  <RefreshCw className={`w-3 h-3 ${eligibilityLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <span className="text-secondary">•</span>
                <button
                  type="button"
                  onClick={() => setCreateForm(prev => ({ ...prev, employee_ids: (eligibilityData.eligible || []).map(e => e.id) }))}
                  className="text-[11px] text-brand-400 hover:underline font-semibold"
                >
                  Select All Eligible
                </button>
                <span className="text-secondary">•</span>
                <button
                  type="button"
                  onClick={() => setCreateForm(prev => ({ ...prev, employee_ids: [] }))}
                  className="text-[11px] text-secondary hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            {eligibilityLoading ? (
              <div className="py-8 text-center text-xs text-secondary">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-brand-500 mb-2" />
                Evaluating employee contracts and period eligibility...
              </div>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {/* 1. Eligible Employees Section */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Eligible Personnel ({eligibilityData.eligible?.length || 0} Payroll Ready)
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium">
                      Valid contract & wage active for period
                    </span>
                  </div>

                  {(!eligibilityData.eligible || eligibilityData.eligible.length === 0) ? (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-secondary">
                      No employees are currently eligible for this period. Ensure an active contract with valid salary exists.
                    </div>
                  ) : (
                    eligibilityData.eligible.map(emp => {
                      const isSelected = createForm.employee_ids.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => {
                            setCreateForm(prev => {
                              const exists = prev.employee_ids.includes(emp.id);
                              return {
                                ...prev,
                                employee_ids: exists
                                  ? prev.employee_ids.filter(id => id !== emp.id)
                                  : [...prev.employee_ids, emp.id]
                              };
                            });
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-brand-950/60 border border-brand-500/50 shadow-sm'
                              : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded bg-slate-950 border-slate-700 text-brand-500 focus:ring-0 cursor-pointer w-4 h-4"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">
                                  {emp.first_name} {emp.last_name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">({emp.employee_code})</span>
                                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                  🟢 Payroll Ready
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-300 mt-1">
                                <span>Dept: <strong className="text-white">{emp.department_name || 'General'}</strong></span>
                                <span>•</span>
                                <span>Wage: <strong className="text-emerald-400 font-mono font-bold">${parseFloat(emp.contract_wage || emp.contract?.wage || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                                <span>•</span>
                                <span className="truncate max-w-[140px] text-slate-300">{emp.structure_name || emp.contract?.salary_structure_name || 'Standard Structure'}</span>
                              </div>
                              {emp.warnings && emp.warnings.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {emp.warnings.map((w, wIdx) => (
                                    <span key={wIdx} className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      {w}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 2. Ineligible Employees Section */}
                {eligibilityData.ineligible && eligibilityData.ineligible.length > 0 && (
                  <div className="space-y-1.5 pt-3 border-t border-theme">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Not Payroll Ready ({eligibilityData.ineligible.length})
                      </span>
                      <span className="text-[10px] text-rose-400 font-medium">
                        Excluded from payroll until requirements are fulfilled
                      </span>
                    </div>

                    {eligibilityData.ineligible.map(emp => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-rose-500/20 opacity-85"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-200">
                              {emp.first_name} {emp.last_name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">({emp.employee_code})</span>
                            <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                              ⚠ Not Ready
                            </span>
                          </div>
                          <div className="text-[11px] text-rose-300 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                            <span><strong>Reason:</strong> {emp.blocking_reason || (emp.blocking_reasons && emp.blocking_reasons.join(' • ')) || 'Missing contract or required bank/salary configuration.'}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                          {emp.department_name || 'General'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-theme flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className="px-4 py-2 rounded-xl bg-elevated text-secondary text-xs font-semibold hover:bg-slate-800 hover:text-white"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={createForm.employee_ids.length === 0}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Create Pay Run (DRAFT) ({createForm.employee_ids.length})
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Mark as Paid & Disburse */}
      {/* ========================================================================= */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Mark Pay Run as PAID & Disburse"
        subtitle="Generates individual payment transaction records and locks the payroll."
      >
        <form onSubmit={handleMarkPaid} className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs">
            <p className="font-semibold">
              Total Disbursement: <strong className="text-white text-sm">
                ${parseFloat(payrunDetails?.kpis?.total_net || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </p>
            <p className="text-[11px] text-emerald-300 mt-1">
              This will record individual payment transactions for all {payrunDetails?.employees?.length || 0} personnel.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1">Disbursement Method *</label>
            <select
              value={paymentForm.payment_method}
              onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="BANK_TRANSFER" className="bg-slate-900 text-white">Direct Bank ACH / Wire Transfer</option>
              <option value="CASH" className="bg-slate-900 text-white">Cash Disbursement</option>
              <option value="CHEQUE" className="bg-slate-900 text-white">Company Cheque</option>
              <option value="ONLINE" className="bg-slate-900 text-white">Corporate Online Portal</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1">Transaction Reference / Batch ID *</label>
            <input
              type="text"
              required
              value={paymentForm.reference}
              onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1">Payment Notes</label>
            <textarea
              rows={2}
              value={paymentForm.notes}
              onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="pt-4 border-t border-theme flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-elevated text-secondary text-xs font-semibold hover:bg-slate-800 hover:text-white"
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

      {/* ========================================================================= */}
      {/* MODAL: Edit Pay Run Details */}
      {/* ========================================================================= */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Pay Run Details"
        subtitle="Update pay run title, payroll period range, or operational notes"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-primary mb-1">Pay Run Name *</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Period Start *</label>
              <input
                type="date"
                required
                value={editForm.period_start}
                onChange={e => setEditForm({ ...editForm, period_start: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Period End *</label>
              <input
                type="date"
                required
                value={editForm.period_end}
                onChange={e => setEditForm({ ...editForm, period_end: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1">Notes / Remarks</label>
            <textarea
              rows={3}
              value={editForm.notes}
              onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="e.g. Adjusted processing cycle for monthly regular payroll..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="pt-4 border-t border-theme flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-elevated text-secondary text-xs font-semibold hover:bg-slate-800 hover:text-white"
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
