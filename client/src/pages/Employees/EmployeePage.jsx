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
  UserCheck,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Check,
  Calculator
} from 'lucide-react';

export function EmployeePage() {
  const { user, isHR, isAdmin, isEmployee, showToast } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
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

  // Delete Confirmation Modal
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [empToDelete, setEmpToDelete] = useState(null);

  // Edit Employee Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department_id: '',
    designation_id: '',
    joining_date: '',
    status: 'ACTIVE',
    role_code: 'EMPLOYEE',
    wage: '',
    salary_structure_id: '',
    working_schedule_id: '',
    contract_type: 'PERMANENT',
    bank_name: '',
    bank_account_number: '',
    tax_identifier: ''
  });

  // Create Form State
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
    role_code: 'EMPLOYEE',
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
      const [empRes, deptRes, desigRes, structRes, schedRes, rolesRes] = await Promise.all([
        api.getEmployees({ department_id: selectedDept, status: selectedStatus, search }),
        api.getDepartments(),
        api.getDesignations(),
        api.getSalaryStructures(),
        api.getSchedules(),
        api.getRoles()
      ]);

      if (empRes.success) setEmployees(empRes.employees);
      if (deptRes.success) setDepartments(deptRes.departments);
      if (desigRes.success) setDesignations(desigRes.designations);
      if (rolesRes.success) setRoles(rolesRes.roles);
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

  const handleOpenEdit = (emp) => {
    setEditFormData({
      id: emp.id,
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      department_id: emp.department_id || '',
      designation_id: emp.designation_id || '',
      joining_date: emp.joining_date ? emp.joining_date.split('T')[0] : '',
      status: emp.status || 'ACTIVE',
      role_code: emp.role_code || 'EMPLOYEE',
      wage: emp.wage ? parseFloat(emp.wage) : '',
      salary_structure_id: emp.salary_structure_id || (salaryStructures[0]?.id || ''),
      working_schedule_id: emp.working_schedule_id || (schedules[0]?.id || ''),
      contract_type: emp.contract_type || 'PERMANENT',
      bank_name: emp.bank_name || '',
      bank_account_number: emp.bank_account_number || '',
      tax_identifier: emp.tax_identifier || ''
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateEmployee(editFormData.id, editFormData);
      showToast(res.message || 'Employee updated successfully', 'success');
      setEditModalOpen(false);
      fetchData();
      if (selectedEmpDetails && selectedEmpDetails.employee.id === editFormData.id) {
        handleOpenDetails(editFormData.id);
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
      setFormData({
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
        role_code: 'EMPLOYEE',
        date_of_birth: '',
        address: '',
        bank_name: '',
        bank_account_number: '',
        bank_ifsc_swift: '',
        tax_identifier: '',
        create_contract: true,
        contract_type: 'PERMANENT',
        wage: 6000,
        salary_structure_id: salaryStructures[0]?.id || '',
        working_schedule_id: schedules[0]?.id || ''
      });
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteClick = (emp) => {
    setEmpToDelete(emp);
    setDeleteConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!empToDelete) return;
    try {
      const res = await api.deleteEmployee(empToDelete.id);
      showToast(res.message || 'Employee deleted successfully', 'success');
      setDeleteConfirmModal(false);
      setEmpToDelete(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete employee', 'error');
    }
  };

  const getRoleBadge = (roleCode) => {
    const badges = {
      ADMIN: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      HR_MANAGER: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      PAYROLL_ADMIN: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      PAYROLL_USER: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      EMPLOYEE: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    };
    return badges[roleCode] || 'bg-slate-800 text-slate-300';
  };

  return (
    <div className="space-y-6">
      {/* Header matching Excalidraw specification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Employees</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {viewMode === 'card' ? 'Default view: Kanban' : 'List view for sort, filter and bulk scanning'}
          </p>
        </div>

        {(isHR || isAdmin) && (
          <button
            onClick={() => setFormModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-brand-500/25 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            NEW
          </button>
        )}
      </div>

      {/* Control Bar: Search, Filters & Kanban / List Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 glass-panel rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PROBATION">Probation</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="TERMINATED">Terminated</option>
          </select>

          {/* Kanban / List Toggle Buttons with Text Labels matching Excalidraw */}
          <div className="flex items-center border border-slate-800 rounded-xl p-0.5 bg-slate-950">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'card'
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Cards or Table */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-xs">Loading employee directory...</div>
      ) : employees.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl border border-slate-800 text-slate-400 text-xs">
          No employees found matching criteria.
        </div>
      ) : viewMode === 'card' ? (
        /* Kanban Card Grid View matching Excalidraw Screen 2 */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {employees.map((emp) => {
            const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase() || 'EM';
            return (
              <div
                key={emp.id}
                onClick={() => handleOpenDetails(emp.id)}
                className="glass-panel p-5 rounded-3xl border border-slate-800 hover:border-brand-500/50 hover:bg-slate-900/80 transition-all cursor-pointer flex items-center justify-between group bg-slate-900/60"
              >
                <div className="flex items-center gap-4">
                  {/* Initial Avatar Badge */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600/30 to-indigo-600/30 border border-brand-500/40 flex items-center justify-center font-bold text-sm text-brand-300 shadow-md shrink-0">
                    {initials}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white group-hover:text-brand-300 transition-colors">
                      {emp.first_name} {emp.last_name}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {emp.designation_name || 'Payroll Specialist'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {emp.department_name || 'General'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{emp.status === 'ACTIVE' ? 'Active' : emp.status}</span>
                  </div>

                  {(isHR || isAdmin) && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors"
                        title="Edit Profile"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(emp)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
                        title="Delete Employee"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Table View matching Excalidraw Screen 3 */
        <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Employee</th>
                  <th className="py-3.5 px-4 font-semibold">Work Email</th>
                  <th className="py-3.5 px-4 font-semibold">Job Position</th>
                  <th className="py-3.5 px-4 font-semibold">Department</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => handleOpenDetails(emp.id)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-brand-400">
                          {`${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{emp.first_name} {emp.last_name}</p>
                          <p className="text-[10px] font-mono text-slate-400">{emp.employee_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{emp.email}</td>
                    <td className="py-3 px-4 text-slate-300 font-medium">{emp.designation_name || 'Staff'}</td>
                    <td className="py-3 px-4 text-slate-300">{emp.department_name || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{emp.status === 'ACTIVE' ? 'Active' : emp.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {(isHR || isAdmin) && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(emp)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors"
                              title="Edit Profile & Contract"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(emp)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
                              title="Delete Employee"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleOpenDetails(emp.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-colors"
                          title="View Employee Form"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Employee Form View matching Excalidraw Screen 4 */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={selectedEmpDetails ? `Employee / ${selectedEmpDetails.employee.first_name} ${selectedEmpDetails.employee.last_name}` : 'Employee Form'}
        subtitle="Main employee form with related HR actions"
        maxWidth="max-w-4xl"
      >
        {selectedEmpDetails && (() => {
          const emp = selectedEmpDetails.employee;
          const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase() || 'EM';
          const contractsCount = selectedEmpDetails.contracts?.length || 0;
          const attendanceCount = selectedEmpDetails.attendance?.length || 0;
          const timeoffCount = selectedEmpDetails.timeoff?.length || selectedEmpDetails.allocations?.length || 0;
          const payslipsCount = selectedEmpDetails.payslips?.length || 0;

          return (
            <div className="space-y-6">
              {/* Header with Avatar and Smart Stat Buttons */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 border border-brand-400/40 flex items-center justify-center font-bold text-lg text-white shadow-lg shrink-0">
                    {initials}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {emp.first_name} {emp.last_name}
                    </h3>
                    <p className="text-xs text-brand-300 font-medium mt-0.5">
                      {emp.designation_name || 'Payroll Specialist'} • {emp.department_name || 'Finance'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      {emp.email} | {emp.phone || '+91 98765 43210'}
                    </p>
                  </div>
                </div>

                {/* Smart Stat Buttons matching Screen 4 */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(isHR || isAdmin) && (
                    <button
                      onClick={() => {
                        setDetailsModalOpen(false);
                        handleOpenEdit(emp);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5 text-brand-400" />
                      EDIT
                    </button>
                  )}

                  <button
                    onClick={() => setDetailsTab('timeoff')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      detailsTab === 'timeoff'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>Time Off</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                      {timeoffCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setDetailsTab('contracts')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      detailsTab === 'contracts'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>Contracts</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      {contractsCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setDetailsTab('attendance')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      detailsTab === 'attendance'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>Attendance</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                      {attendanceCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setDetailsTab('payslips')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      detailsTab === 'payslips'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>Payslips</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                      {payslipsCount}
                    </span>
                  </button>
                </div>
              </div>

              {/* Form Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
                {[
                  { id: 'work', label: 'Work Information', icon: Briefcase },
                  { id: 'private', label: 'Private Information', icon: Users },
                  { id: 'contracts', label: `Contracts (${contractsCount})`, icon: FileText },
                  { id: 'attendance', label: `Attendance (${attendanceCount})`, icon: Clock },
                  { id: 'timeoff', label: `Time Off & Leaves (${timeoffCount})`, icon: Award },
                  { id: 'payslips', label: `Payslips History (${payslipsCount})`, icon: Receipt },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = detailsTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setDetailsTab(tab.id)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                        active
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: WORK INFORMATION (Exact match with Screen 4) */}
              {detailsTab === 'work' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-3xl bg-slate-950/40 border border-slate-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Department</label>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white">
                      {emp.department_name || 'Finance'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Job Position</label>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white">
                      {emp.designation_name || 'Payroll Specialist'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Manager</label>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
                      {emp.manager_name || 'Sara Khan'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Work Location</label>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
                      {emp.address?.split(',')?.[0] || 'Mumbai Office'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Working Schedule</label>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
                      {selectedEmpDetails.contracts?.[0]?.working_schedule_name || '40 Hours / Week'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Status</label>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-emerald-400">
                      {emp.status === 'ACTIVE' ? 'Active' : emp.status}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Company</label>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
                      OXP Pvt Ltd
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Work Email</label>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-brand-300">
                      {emp.email}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRIVATE INFORMATION */}
              {detailsTab === 'private' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-3xl bg-slate-950/40 border border-slate-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Personal Phone</label>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white">
                      {emp.phone || '+91 98765 43210'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Date of Birth</label>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white">
                      {emp.date_of_birth || '15-May-1994'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Gender</label>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white">
                      {emp.gender || 'Not Specified'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Tax ID (PAN/SSN)</label>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white">
                      {emp.tax_identifier || 'ABCDE1234F'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Bank Name</label>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white">
                      {emp.bank_name || 'HDFC Bank Ltd'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Bank Account Number</label>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400 font-semibold">
                      {emp.bank_account_number || '50100234567890'}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Residential Address</label>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white">
                      {emp.address || '402, Skyline Residency, Bandra West, Mumbai, Maharashtra 400050'}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CONTRACTS */}
              {detailsTab === 'contracts' && (
                <div className="space-y-3">
                  {selectedEmpDetails.contracts.length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center glass-panel rounded-2xl border border-slate-800">
                      No contracts found for this employee.
                    </p>
                  ) : (
                    selectedEmpDetails.contracts.map((c) => (
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
                          <span className="text-lg font-bold text-emerald-400">₹ {parseFloat(c.wage).toLocaleString('en-IN')}</span>
                          <p className="text-[10px] text-slate-500">Monthly Base Wage</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: ATTENDANCE */}
              {detailsTab === 'attendance' && (
                <div className="space-y-2">
                  {selectedEmpDetails.attendance.length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center glass-panel rounded-2xl border border-slate-800">
                      No attendance records logged yet.
                    </p>
                  ) : (
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
                        {selectedEmpDetails.attendance.map((a) => (
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
                  )}
                </div>
              )}

              {/* TAB 5: TIME OFF */}
              {detailsTab === 'timeoff' && (
                <div className="space-y-4">
                  <h5 className="text-xs font-bold text-white uppercase">Leave Allocations</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedEmpDetails.allocations.map((a) => (
                      <div key={a.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium block truncate">{a.leave_type_name}</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-lg font-bold text-white">{a.remaining_days}</span>
                          <span className="text-[10px] text-slate-500">/ {a.allocated_days} days left</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <h5 className="text-xs font-bold text-white uppercase mt-4">Recent Time-Off Requests</h5>
                  {selectedEmpDetails.timeoff?.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3">No leave requests submitted.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedEmpDetails.timeoff?.map((req) => (
                        <div key={req.id} className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-white">{req.leave_type_name || 'Leave'}</span>
                            <p className="text-[11px] text-slate-400">{req.from_date} to {req.to_date} ({req.total_days} days)</p>
                          </div>
                          <StatusBadge status={req.status} size="xs" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: PAYSLIPS */}
              {detailsTab === 'payslips' && (
                <div className="space-y-3">
                  {selectedEmpDetails.payslips.length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center glass-panel rounded-2xl border border-slate-800">
                      No payslips generated yet for this employee.
                    </p>
                  ) : (
                    selectedEmpDetails.payslips.map((ps) => (
                      <div key={ps.id} className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">{ps.payslip_number}</p>
                          <p className="text-slate-400 text-[11px]">Period: {ps.period_start} to {ps.period_end}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-emerald-400">₹ {parseFloat(ps.net_salary).toLocaleString('en-IN')}</p>
                            <p className="text-[10px] text-slate-500">Gross: ₹ {parseFloat(ps.gross_salary).toLocaleString('en-IN')}</p>
                          </div>
                          <StatusBadge status={ps.status} size="xs" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Modal: Create Employee */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Create New Employee Profile"
        subtitle="Registers employee, generates user account with role, contracts, and leave balances"
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

            {/* System Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-brand-300 mb-1">Assign System Role *</label>
              <select
                required
                value={formData.role_code}
                onChange={e => setFormData({ ...formData, role_code: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.code}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
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

      {/* Modal: Edit Employee Profile & Contract */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Employee Profile & Contract"
        subtitle="Update department, designation, salary contract, and system role"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={editFormData.first_name}
                onChange={e => setEditFormData({ ...editFormData, first_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={editFormData.last_name}
                onChange={e => setEditFormData({ ...editFormData, last_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={editFormData.email}
                onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={editFormData.phone}
                onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            {/* System Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-brand-300 mb-1">Assigned System Role *</label>
              <select
                required
                value={editFormData.role_code}
                onChange={e => setEditFormData({ ...editFormData, role_code: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.code}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
              <select
                value={editFormData.department_id}
                onChange={e => setEditFormData({ ...editFormData, department_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Designation</label>
              <select
                value={editFormData.designation_id}
                onChange={e => setEditFormData({ ...editFormData, designation_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="">Select Designation</option>
                {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
              <select
                value={editFormData.status}
                onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="ACTIVE">Active</option>
                <option value="PROBATION">Probation</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
          </div>

          {/* Contract & Wage Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h5 className="text-xs font-bold text-brand-400 uppercase">Employment Contract & Wage</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Wage ($)</label>
                <input
                  type="number"
                  value={editFormData.wage}
                  onChange={e => setEditFormData({ ...editFormData, wage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Salary Structure</label>
                <select
                  value={editFormData.salary_structure_id}
                  onChange={e => setEditFormData({ ...editFormData, salary_structure_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  {salaryStructures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Working Schedule</label>
                <select
                  value={editFormData.working_schedule_id}
                  onChange={e => setEditFormData({ ...editFormData, working_schedule_id: e.target.value })}
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
                  value={editFormData.bank_name}
                  onChange={e => setEditFormData({ ...editFormData, bank_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. CHS-12345678"
                  value={editFormData.bank_account_number}
                  onChange={e => setEditFormData({ ...editFormData, bank_account_number: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tax Identifier (SSN)</label>
                <input
                  type="text"
                  placeholder="e.g. TAX-US-1029"
                  value={editFormData.tax_identifier}
                  onChange={e => setEditFormData({ ...editFormData, tax_identifier: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
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
              Update Employee & Contract
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmModal}
        onClose={() => setDeleteConfirmModal(false)}
        title="Confirm Employee Deletion"
        subtitle="This action will permanently delete the employee record and related credentials"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Are you sure you want to delete this employee?</p>
              <p className="mt-1 text-slate-400">
                You are about to remove <span className="font-bold text-white">{empToDelete?.first_name} {empToDelete?.last_name}</span> ({empToDelete?.employee_code}).
                Their contracts, attendance history, and user authentication account will be removed.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteConfirmModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/25"
            >
              Delete Employee Record
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
