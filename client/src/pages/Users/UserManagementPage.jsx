import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Modal } from '../../components/Modal';
import {
  UserCheck,
  Plus,
  ShieldCheck,
  Users,
  Building2,
  Briefcase,
  DollarSign,
  User,
  Key,
  Edit,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Trash2,
  Lock,
  Shield,
  Sliders,
  Check,
  AlertTriangle
} from 'lucide-react';

export function UserManagementPage() {
  const { user, showToast } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create User Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    roleId: '',
    departmentId: '',
    designationId: '',
    monthlyWage: 6000,
    salaryStructureId: '',
    workingScheduleId: ''
  });

  // Edit User Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    roleId: '',
    isActive: true,
    departmentId: '',
    designationId: '',
    monthlyWage: '',
    salaryStructureId: '',
    workingScheduleId: '',
    password: ''
  });

  // Tab & Modals State
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'matrix'
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleDesc, setRoleDesc] = useState('');
  const [roleName, setRoleName] = useState('');

  const handleDeleteClick = (u) => {
    if (u.id === 'usr-admin' || u.email.toLowerCase() === 'admin@peoplepay360.com') {
      showToast('Cannot delete primary System Administrator account', 'error');
      return;
    }
    if (u.id === user?.id) {
      showToast('You cannot delete your own active administrator account', 'error');
      return;
    }
    setUserToDelete(u);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      const res = await api.deleteUser(userToDelete.id);
      showToast(res.message || 'User deleted successfully', 'success');
      setDeleteModalOpen(false);
      setUserToDelete(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete user', 'error');
    }
  };

  const handleOpenEditRole = (r) => {
    setSelectedRole(r);
    setRoleName(r.name);
    setRoleDesc(r.description || '');
    setRoleModalOpen(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!selectedRole) return;
    try {
      const res = await api.updateRole(selectedRole.id, { name: roleName, description: roleDesc });
      showToast(res.message || 'Role updated successfully', 'success');
      setRoleModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update role', 'error');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uRes, rRes, dRes, desRes, sRes, scRes] = await Promise.all([
        api.getUsers(),
        api.getRoles(),
        api.getDepartments(),
        api.getDesignations(),
        api.getSalaryStructures(),
        api.getSchedules()
      ]);

      if (uRes.success) setUsers(uRes.users);
      if (rRes.success) {
        setRoles(rRes.roles);
        if (rRes.roles.length > 0 && !formData.roleId) {
          setFormData(prev => ({ ...prev, roleId: rRes.roles[0].id }));
        }
      }
      if (dRes.success) setDepartments(dRes.departments);
      if (desRes.success) setDesignations(desRes.designations);
      if (sRes.success) {
        setSalaryStructures(sRes.structures);
        if (sRes.structures.length > 0 && !formData.salaryStructureId) {
          setFormData(prev => ({ ...prev, salaryStructureId: sRes.structures[0].id }));
        }
      }
      if (scRes.success) {
        setSchedules(scRes.schedules);
        if (scRes.schedules.length > 0 && !formData.workingScheduleId) {
          setFormData(prev => ({ ...prev, workingScheduleId: scRes.schedules[0].id }));
        }
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createUser({
        firstName: formData.first_name,
        lastName: formData.last_name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        roleId: formData.roleId,
        departmentId: formData.departmentId || null,
        designationId: formData.designationId || null,
        monthlyWage: formData.monthlyWage || 0,
        salaryStructureId: formData.salaryStructureId || null,
        workingScheduleId: formData.workingScheduleId || null
      });
      showToast(res.message, 'success');
      setModalOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        phone: '',
        roleId: roles[0]?.id || '',
        departmentId: '',
        designationId: '',
        monthlyWage: 6000,
        salaryStructureId: salaryStructures[0]?.id || '',
        workingScheduleId: schedules[0]?.id || ''
      });
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenEdit = (u) => {
    setEditFormData({
      id: u.id,
      firstName: u.first_name || '',
      lastName: u.last_name || '',
      email: u.email || '',
      phone: u.phone || '',
      roleId: u.role_id || (roles[0]?.id || ''),
      isActive: u.is_active,
      departmentId: u.department_id || '',
      designationId: u.designation_id || '',
      monthlyWage: u.monthly_wage ? parseFloat(u.monthly_wage) : '',
      salaryStructureId: u.salary_structure_id || (salaryStructures[0]?.id || ''),
      workingScheduleId: u.working_schedule_id || (schedules[0]?.id || ''),
      password: ''
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateUser(editFormData.id, editFormData);
      showToast(res.message || 'User updated successfully', 'success');
      setEditModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
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

  const accessMatrix = [
    {
      module: 'Employee Directory & Profiles',
      desc: 'Creation, full editing, contact records, and profile status',
      ADMIN: 'Full CRUD',
      HR_MANAGER: 'Full CRUD',
      PAYROLL_ADMIN: 'Full CRUD',
      PAYROLL_USER: 'Full CRUD',
      EMPLOYEE: 'View Own Only',
    },
    {
      module: 'Employment Contracts & Wage',
      desc: 'Wage structure, contract terms, linked structures & schedules',
      ADMIN: 'Full CRUD',
      HR_MANAGER: 'Full CRUD',
      PAYROLL_ADMIN: 'Full CRUD',
      PAYROLL_USER: 'Full CRUD',
      EMPLOYEE: 'View Own Only',
    },
    {
      module: 'Working Schedules & Shifts',
      desc: 'Work hours, shift calendar, breaks & schedule assignments',
      ADMIN: 'Full CRUD',
      HR_MANAGER: 'Full CRUD',
      PAYROLL_ADMIN: 'Full CRUD',
      PAYROLL_USER: 'Full CRUD',
      EMPLOYEE: 'No Access',
    },
    {
      module: 'Attendance & Punch Records',
      desc: 'Daily check-in / check-out, team logs, and audit corrections',
      ADMIN: 'Full CRUD & Correct',
      HR_MANAGER: 'Full CRUD & Correct',
      PAYROLL_ADMIN: 'Full CRUD & Correct',
      PAYROLL_USER: 'Full CRUD & Correct',
      EMPLOYEE: 'Punch & View Own',
    },
    {
      module: 'Time Off & Leave Allocations',
      desc: 'Leave types, allocation balances, request review & approvals',
      ADMIN: 'Full CRUD & Approvals',
      HR_MANAGER: 'Full CRUD & Approvals',
      PAYROLL_ADMIN: 'Full CRUD & Approvals',
      PAYROLL_USER: 'Full CRUD & Approvals',
      EMPLOYEE: 'Apply & View Balance',
    },
    {
      module: 'Salary Structures',
      desc: 'Master compensation templates grouping calculation rules',
      ADMIN: 'Full CRUD',
      HR_MANAGER: 'No Access',
      PAYROLL_ADMIN: 'Full CRUD',
      PAYROLL_USER: 'Read Only',
      EMPLOYEE: 'No Access',
    },
    {
      module: 'Salary Calculation Rules',
      desc: 'Sequential rule formulas, allowances, PF, and tax deductions',
      ADMIN: 'Full CRUD',
      HR_MANAGER: 'No Access',
      PAYROLL_ADMIN: 'Full CRUD',
      PAYROLL_USER: 'Read Only',
      EMPLOYEE: 'No Access',
    },
    {
      module: 'Payroll Runs & Computation',
      desc: 'Drafting, salary engine computation, validation, and marking paid',
      ADMIN: 'Full Lifecycle & Payout',
      HR_MANAGER: 'No Access',
      PAYROLL_ADMIN: 'Full Lifecycle & Payout',
      PAYROLL_USER: 'Draft & Compute',
      EMPLOYEE: 'No Access',
    },
    {
      module: 'Payslips & PDF Generation',
      desc: 'Itemized salary line calculation, PDF printing, and history',
      ADMIN: 'Full Access & Edit',
      HR_MANAGER: 'No Access',
      PAYROLL_ADMIN: 'Full Access & Edit',
      PAYROLL_USER: 'View All & Generate',
      EMPLOYEE: 'View & Print Own',
    },
    {
      module: 'Users & RBAC Administration',
      desc: 'Account credentials, role assignment, password resets, user deletion',
      ADMIN: 'Full Administration',
      HR_MANAGER: 'No Access',
      PAYROLL_ADMIN: 'No Access',
      PAYROLL_USER: 'No Access',
      EMPLOYEE: 'No Access',
    },
    {
      module: 'Security & Audit Trail',
      desc: 'Immutable system audit logs, IP tracking, and change logs',
      ADMIN: 'Full Access',
      HR_MANAGER: 'No Access',
      PAYROLL_ADMIN: 'No Access',
      PAYROLL_USER: 'No Access',
      EMPLOYEE: 'No Access',
    },
    {
      module: 'Executive Reports & Analytics',
      desc: 'Workforce analytics, payroll summaries, tax statements, and costs',
      ADMIN: 'All Reports & Data',
      HR_MANAGER: 'HR & Headcount',
      PAYROLL_ADMIN: 'All Reports & Data',
      PAYROLL_USER: 'Payroll Reports',
      EMPLOYEE: 'No Access',
    }
  ];

  const getPermBadge = (perm) => {
    if (perm.includes('Full') || perm.includes('All')) {
      return 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold';
    }
    if (perm.includes('Draft') || perm.includes('Read')) {
      return 'bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold';
    }
    if (perm.includes('Own') || perm.includes('Punch') || perm.includes('Apply')) {
      return 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold';
    }
    if (perm.includes('HR')) {
      return 'bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold';
    }
    return 'bg-slate-800/80 text-slate-500 border border-slate-800 font-normal';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white tracking-tight">System Administration & Access Control</h2>
          </div>
          <p className="text-xs text-slate-400">
            Highest-level system control: Provision user accounts, assign roles, inspect security trails, and enforce strict RBAC permissions across all modules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'users' && (
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Create User
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          User Accounts & Credentials ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'matrix'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Role Permissions & Access Matrix (5 Roles)
        </button>
      </div>

      {/* Tab 1: User Accounts */}
      {activeTab === 'users' && (
        <>
          {/* 5 Roles Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {roles.map(r => (
              <div key={r.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getRoleBadge(r.code)}`}>
                    {r.code}
                  </span>
                  <h4 className="text-xs font-bold text-white mt-2">{r.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{r.description}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-500">
                  Users: <strong className="text-slate-200">{users.filter(u => u.role_code === r.code).length}</strong>
                </div>
              </div>
            ))}
          </div>

          {/* Users Table */}
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">User</th>
                    <th className="py-3.5 px-4 font-semibold">Email</th>
                    <th className="py-3.5 px-4 font-semibold">Assigned Role</th>
                    <th className="py-3.5 px-4 font-semibold">Linked Employee</th>
                    <th className="py-3.5 px-4 font-semibold">Department</th>
                    <th className="py-3.5 px-4 font-semibold">Designation</th>
                    <th className="py-3.5 px-4 font-semibold">Monthly Wage</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        {u.first_name} {u.last_name}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getRoleBadge(u.role_code)}`}>
                          {u.role_name || u.role_code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-brand-400">
                        {u.employee_code || 'None'}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{u.department_name || '—'}</td>
                      <td className="py-3 px-4 text-slate-300">{u.designation_name || '—'}</td>
                      <td className="py-3 px-4 text-emerald-400 font-semibold">
                        {u.monthly_wage ? `$${parseFloat(u.monthly_wage).toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {u.is_active ? (
                          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-[11px] font-semibold border border-rose-500/20">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-colors"
                            title="Edit User & Profile"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {u.id !== 'usr-admin' && u.email?.toLowerCase() !== 'admin@peoplepay360.com' && u.id !== user?.id && (
                            <button
                              onClick={() => handleDeleteClick(u)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab 2: Role Permissions & Access Control Matrix */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          {/* 5 Roles Description Cards with Configure button */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {roles.map(r => (
              <div key={r.id} className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getRoleBadge(r.code)}`}>
                      {r.code}
                    </span>
                    <button
                      onClick={() => handleOpenEditRole(r)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-brand-600 text-slate-400 hover:text-white transition-colors"
                      title="Configure Role Details"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-2">{r.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">{r.description}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Assigned Users:</span>
                  <strong className="text-white">{users.filter(u => u.role_code === r.code).length}</strong>
                </div>
              </div>
            ))}
          </div>

          {/* Matrix Comparison Table */}
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  Comparative RBAC Permission Boundaries
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Universal authorization matrix enforced across API endpoints and UI controllers.
                </p>
              </div>
              <span className="text-xs font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20 px-3 py-1 rounded-lg">
                Admin: Universal Override Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold w-72">Operational Domain / Module</th>
                    <th className="py-3.5 px-3 font-semibold text-center text-purple-400">Admin 🔐</th>
                    <th className="py-3.5 px-3 font-semibold text-center text-blue-400">HR Manager 👨‍💼</th>
                    <th className="py-3.5 px-3 font-semibold text-center text-emerald-400">HR Payroll Mgr 🧑‍💼💰</th>
                    <th className="py-3.5 px-3 font-semibold text-center text-amber-400">Payroll User 💰</th>
                    <th className="py-3.5 px-3 font-semibold text-center text-cyan-400">Employee 👤</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {accessMatrix.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-white text-xs">{item.module}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] px-2 py-1 rounded-lg inline-block ${getPermBadge(item.ADMIN)}`}>
                          {item.ADMIN}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] px-2 py-1 rounded-lg inline-block ${getPermBadge(item.HR_MANAGER)}`}>
                          {item.HR_MANAGER}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] px-2 py-1 rounded-lg inline-block ${getPermBadge(item.PAYROLL_ADMIN)}`}>
                          {item.PAYROLL_ADMIN}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] px-2 py-1 rounded-lg inline-block ${getPermBadge(item.PAYROLL_USER)}`}>
                          {item.PAYROLL_USER}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] px-2 py-1 rounded-lg inline-block ${getPermBadge(item.EMPLOYEE)}`}>
                          {item.EMPLOYEE}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create System User & Profile"
        subtitle="Provision account credentials, assign RBAC role, and configure employment profile"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password *</label>
              <input
                type="password"
                required
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assign Role *</label>
              <select
                required
                value={formData.roleId}
                onChange={e => setFormData({ ...formData, roleId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Department, Designation & Wage Section */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <h5 className="text-xs font-bold text-brand-400 uppercase">Employment & Compensation Details</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                <select
                  value={formData.departmentId}
                  onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Designation</label>
                <select
                  value={formData.designationId}
                  onChange={e => setFormData({ ...formData, designationId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="">Select Designation</option>
                  {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Wage ($)</label>
                <input
                  type="number"
                  value={formData.monthlyWage}
                  onChange={e => setFormData({ ...formData, monthlyWage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Salary Structure</label>
                <select
                  value={formData.salaryStructureId}
                  onChange={e => setFormData({ ...formData, salaryStructureId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  {salaryStructures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Working Schedule</label>
                <select
                  value={formData.workingScheduleId}
                  onChange={e => setFormData({ ...formData, workingScheduleId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/25"
            >
              Provision User
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit System User & Profile"
        subtitle="Update role permissions, employment profile, department, and salary"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={editFormData.firstName}
                onChange={e => setEditFormData({ ...editFormData, firstName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={editFormData.lastName}
                onChange={e => setEditFormData({ ...editFormData, lastName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={editFormData.phone}
                onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Role *</label>
              <select
                required
                value={editFormData.roleId}
                onChange={e => setEditFormData({ ...editFormData, roleId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
              <select
                value={editFormData.isActive ? 'true' : 'false'}
                onChange={e => setEditFormData({ ...editFormData, isActive: e.target.value === 'true' })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reset Password (Optional)</label>
              <input
                type="password"
                placeholder="Leave blank to keep current"
                value={editFormData.password}
                onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Department, Designation & Wage Section */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <h5 className="text-xs font-bold text-brand-400 uppercase">Employment & Compensation Details</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                <select
                  value={editFormData.departmentId}
                  onChange={e => setEditFormData({ ...editFormData, departmentId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Designation</label>
                <select
                  value={editFormData.designationId}
                  onChange={e => setEditFormData({ ...editFormData, designationId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="">Select Designation</option>
                  {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Wage ($)</label>
                <input
                  type="number"
                  value={editFormData.monthlyWage}
                  onChange={e => setEditFormData({ ...editFormData, monthlyWage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Salary Structure</label>
                <select
                  value={editFormData.salaryStructureId}
                  onChange={e => setEditFormData({ ...editFormData, salaryStructureId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  {salaryStructures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Working Schedule</label>
                <select
                  value={editFormData.workingScheduleId}
                  onChange={e => setEditFormData({ ...editFormData, workingScheduleId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
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
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm User Deletion"
        subtitle="Permanently remove user credentials and unbind linked profile"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Delete user {userToDelete?.first_name} {userToDelete?.last_name}?</p>
              <p className="mt-1 text-slate-400">
                You are about to delete user <strong className="text-white">{userToDelete?.email}</strong> with assigned role <strong className="text-white">{userToDelete?.role_name}</strong>.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/25"
            >
              Delete User
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Role Definition Modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={`Configure Role: ${selectedRole?.name}`}
        subtitle={`System Role Code: ${selectedRole?.code}`}
      >
        <form onSubmit={handleSaveRole} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Role Display Name *</label>
            <input
              type="text"
              required
              value={roleName}
              onChange={e => setRoleName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Role Description / Scope *</label>
            <textarea
              rows={3}
              required
              value={roleDesc}
              onChange={e => setRoleDesc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
            />
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRoleModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/25"
            >
              Update Role Definition
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
