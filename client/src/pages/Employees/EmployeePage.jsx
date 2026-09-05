import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  Users,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Mail,
  Phone,
  Building2,
  Calendar,
  Briefcase,
  DollarSign,
  Edit,
  Eye,
  FileText,
  Clock,
  Award,
  Receipt,
  UserCheck
} from 'lucide-react';

export function EmployeePage() {
  const { user, isHR, isAdmin, isEmployee, showToast } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & View
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'card'
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedEmpDetails, setSelectedEmpDetails] = useState(null);
  const [detailsTab, setDetailsTab] = useState('overview'); // overview, contracts, attendance, timeoff, payslips

  // Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department_id: '',
    designation_id: '',
    manager_id: '',
    joining_date: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    gender: 'Female',
    date_of_birth: '',
    address: '',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc_swift: '',
    tax_identifier: '',
    create_contract: true,
    contract_type: 'PERMANENT',
    wage: 6000,
    salary_structure_id: '',
    working_schedule_id: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, deptRes, desigRes, structRes, schedRes] = await Promise.all([
        api.getEmployees({ department_id: selectedDept, status: selectedStatus, search }),
        api.getDepartments(),
        api.getDesignations(),
        api.getSalaryStructures(),
        api.getSchedules()
      ]);

      if (empRes.success) setEmployees(empRes.employees);
      if (deptRes.success) setDepartments(deptRes.departments);
      if (desigRes.success) setDesignations(desigRes.designations);
      if (structRes.success) {
        setSalaryStructures(structRes.structures);
        if (structRes.structures.length > 0 && !formData.salary_structure_id) {
          setFormData(prev => ({ ...prev, salary_structure_id: structRes.structures[0].id }));
        }
      }
      if (schedRes.success) {
        setSchedules(schedRes.schedules);
        if (schedRes.schedules.length > 0 && !formData.working_schedule_id) {
          setFormData(prev => ({ ...prev, working_schedule_id: schedRes.schedules[0].id }));
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDept, selectedStatus, search]);

  const handleOpenDetails = async (empId) => {
    try {
      const res = await api.getEmployeeDetails(empId);
      if (res.success) {
        setSelectedEmpDetails(res);
        setDetailsTab('overview');
        setDetailsModalOpen(true);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createEmployee(formData);
      showToast(res.message, 'success');
      setFormModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isEmployee ? 'My Employee Profile' : 'Employee Directory'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isEmployee ? 'View your personal profile, contracts, and assigned schedule.' : 'Manage organizational personnel, contracts, schedules, and salary structures.'}
          </p>
        </div>

        {(isHR || isAdmin) && (
          <button
            onClick={() => setFormModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Employee
          </button>
        )}
      </div>

      {/* Filter Bar */}
      {!isEmployee && (
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by name, code or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="PROBATION">Probation</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'card' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-500">Loading employees...</div>
      ) : employees.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-white">No employees found</h4>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or create a new employee.</p>
        </div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {employees.map((emp) => (
            <div
              key={emp.id}
              onClick={() => handleOpenDetails(emp.id)}
              className="glass-panel glass-panel-hover p-5 rounded-3xl border border-slate-800 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={emp.profile_image || `https://ui-avatars.com/api/?name=${emp.first_name}+${emp.last_name}&background=0e8fe6&color=fff`}
                      alt={emp.first_name}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-700"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight">{emp.first_name} {emp.last_name}</h4>
                      <p className="text-[11px] text-brand-400 font-medium mt-0.5">{emp.designation_name || 'Staff'}</p>
                    </div>
                  </div>
                  <StatusBadge status={emp.status} size="xs" />
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 py-3 border-y border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-300">{emp.department_name || 'General'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-emerald-400 font-semibold">{emp.wage ? `$${parseFloat(emp.wage).toLocaleString()}/mo` : 'No contract'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>Code: <strong className="text-slate-300 font-mono">{emp.employee_code}</strong></span>
                <span className="text-brand-400 flex items-center gap-1 font-medium">360° View &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List / Table View */
        <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Employee</th>
                  <th className="py-3.5 px-4 font-semibold">Code</th>
                  <th className="py-3.5 px-4 font-semibold">Department</th>
                  <th className="py-3.5 px-4 font-semibold">Designation</th>
                  <th className="py-3.5 px-4 font-semibold">Monthly Wage</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={emp.profile_image || `https://ui-avatars.com/api/?name=${emp.first_name}+${emp.last_name}&background=0e8fe6&color=fff`}
                          alt={emp.first_name}
                          className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                        />
                        <div>
                          <p className="font-semibold text-white">{emp.first_name} {emp.last_name}</p>
                          <p className="text-[11px] text-slate-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-300">{emp.employee_code}</td>
                    <td className="py-3 px-4 text-slate-300">{emp.department_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-300">{emp.designation_name || '—'}</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      {emp.wage ? `$${parseFloat(emp.wage).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={emp.status} size="xs" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetails(emp.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-colors"
                        title="View 360 Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: 360° Employee Details */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={selectedEmpDetails ? `${selectedEmpDetails.employee.first_name} ${selectedEmpDetails.employee.last_name} (${selectedEmpDetails.employee.employee_code})` : 'Employee Details'}
        subtitle={selectedEmpDetails?.employee.designation_name}
        maxWidth="max-w-4xl"
      >
        {selectedEmpDetails && (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview & Bank', icon: Users },
                { id: 'contracts', label: 'Contracts', icon: FileText },
                { id: 'attendance', label: 'Attendance', icon: Clock },
                { id: 'timeoff', label: 'Time Off & Leaves', icon: Award },
                { id: 'payslips', label: 'Payslips History', icon: Receipt },
              ].map(tab => {
                const Icon = tab.icon;
                const active = detailsTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setDetailsTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                      active ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Overview */}
            {detailsTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Employment Details</h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Department:</span> <span className="text-white font-medium">{selectedEmpDetails.employee.department_name || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Designation:</span> <span className="text-white font-medium">{selectedEmpDetails.employee.designation_name || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Joining Date:</span> <span className="text-white font-medium">{selectedEmpDetails.employee.joining_date}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Manager:</span> <span className="text-white font-medium">{selectedEmpDetails.employee.manager_name || 'None'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Status:</span> <StatusBadge status={selectedEmpDetails.employee.status} size="xs" /></div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Bank & Tax Disbursement</h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Bank Name:</span> <span className="text-white font-medium">{selectedEmpDetails.employee.bank_name || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Account Number:</span> <span className="text-white font-mono">{selectedEmpDetails.employee.bank_account_number || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Routing / Swift:</span> <span className="text-white font-mono">{selectedEmpDetails.employee.bank_ifsc_swift || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Tax ID (SSN/EIN):</span> <span className="text-white font-mono">{selectedEmpDetails.employee.tax_identifier || '—'}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Contracts */}
            {detailsTab === 'contracts' && (
              <div className="space-y-3">
                {selectedEmpDetails.contracts.map((c) => (
                  <div key={c.id} className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{c.contract_type}</span>
                        <StatusBadge status={c.status} size="xs" />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Structure: <strong className="text-brand-300">{c.salary_structure_name}</strong> • Schedule: {c.working_schedule_name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Period: {c.contract_start_date} to {c.contract_end_date || 'Ongoing'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-emerald-400">${parseFloat(c.wage).toLocaleString()}</span>
                      <p className="text-[10px] text-slate-500">Monthly Base Wage</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Attendance */}
            {detailsTab === 'attendance' && (
              <div className="space-y-2">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Check In</th>
                      <th className="p-2.5">Check Out</th>
                      <th className="p-2.5">Worked</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedEmpDetails.attendance.map(a => (
                      <tr key={a.id}>
                        <td className="p-2.5 text-white font-medium">{a.date}</td>
                        <td className="p-2.5 text-slate-400">{a.check_in ? new Date(a.check_in).toLocaleTimeString() : '—'}</td>
                        <td className="p-2.5 text-slate-400">{a.check_out ? new Date(a.check_out).toLocaleTimeString() : '—'}</td>
                        <td className="p-2.5 text-slate-300">{a.worked_hours}h</td>
                        <td className="p-2.5"><StatusBadge status={a.status} size="xs" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 4: Time Off & Allocations */}
            {detailsTab === 'timeoff' && (
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-white uppercase">Leave Allocations</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedEmpDetails.allocations.map(al => (
                    <div key={al.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-xs font-semibold text-slate-300">{al.leave_type_name}</p>
                      <p className="text-lg font-bold text-brand-400 mt-1">{al.remaining_days} <span className="text-[11px] font-normal text-slate-500">/ {al.allocated_days} days left</span></p>
                    </div>
                  ))}
                </div>

                <h5 className="text-xs font-bold text-white uppercase mt-4">Recent Requests</h5>
                <div className="space-y-2">
                  {selectedEmpDetails.timeOffRequests.map(r => (
                    <div key={r.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white">{r.leave_type_name}</span> ({r.total_days} days)
                        <p className="text-slate-400 text-[11px]">{r.from_date} to {r.to_date} • Reason: {r.reason}</p>
                      </div>
                      <StatusBadge status={r.status} size="xs" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 5: Payslips */}
            {detailsTab === 'payslips' && (
              <div className="space-y-2">
                {selectedEmpDetails.payslips.map(ps => (
                  <div key={ps.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{ps.payslip_number}</p>
                      <p className="text-slate-400 text-[11px]">Period: {ps.period_start} to {ps.period_end}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-emerald-400">${parseFloat(ps.net_salary).toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500">Gross: ${parseFloat(ps.gross_salary).toLocaleString()}</p>
                      </div>
                      <StatusBadge status={ps.status} size="xs" />
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </Modal>

      {/* Modal: Create Employee */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Create New Employee Profile"
        subtitle="Registers employee, generates user account, contracts, and leave balances"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
              <select
                value={formData.department_id}
                onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Designation</label>
              <select
                value={formData.designation_id}
                onChange={e => setFormData({ ...formData, designation_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="">Select Designation</option>
                {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Joining Date *</label>
              <input
                type="date"
                required
                value={formData.joining_date}
                onChange={e => setFormData({ ...formData, joining_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="ACTIVE">Active</option>
                <option value="PROBATION">Probation</option>
              </select>
            </div>
          </div>

          {/* Initial Contract Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h5 className="text-xs font-bold text-brand-400 uppercase">Initial Employment Contract & Wage</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Wage ($) *</label>
                <input
                  type="number"
                  required
                  value={formData.wage}
                  onChange={e => setFormData({ ...formData, wage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Salary Structure *</label>
                <select
                  required
                  value={formData.salary_structure_id}
                  onChange={e => setFormData({ ...formData, salary_structure_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  {salaryStructures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Working Schedule *</label>
                <select
                  required
                  value={formData.working_schedule_id}
                  onChange={e => setFormData({ ...formData, working_schedule_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Bank details */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h5 className="text-xs font-bold text-slate-400 uppercase">Disbursement & Bank Info</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. Chase Bank"
                  value={formData.bank_name}
                  onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. CHS-12345678"
                  value={formData.bank_account_number}
                  onChange={e => setFormData({ ...formData, bank_account_number: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tax Identifier (SSN)</label>
                <input
                  type="text"
                  placeholder="e.g. TAX-US-1029"
                  value={formData.tax_identifier}
                  onChange={e => setFormData({ ...formData, tax_identifier: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setFormModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/25"
            >
              Save Employee & Contract
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
