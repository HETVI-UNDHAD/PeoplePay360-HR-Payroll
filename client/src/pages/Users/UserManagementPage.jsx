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
  XCircle
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">System Users & Role Assignments</h2>
          <p className="text-xs text-slate-400 mt-1">
            Control authentication credentials, enforce RBAC permissions across all 5 discrete system roles, and link employee profiles with contracts.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create User
        </button>
      </div>

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
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-colors"
                      title="Edit User & Profile"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}
