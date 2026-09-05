import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Modal } from '../../components/Modal';
import {
  UserCheck,
  Plus,
  ShieldCheck,
  Users,
  Calculator,
  User,
  Key,
  Edit,
  Mail,
  Phone
} from 'lucide-react';

export function UserManagementPage() {
  const { user, showToast } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create User Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    roleId: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uRes, rRes] = await Promise.all([
        api.getUsers(),
        api.getRoles()
      ]);

      if (uRes.success) setUsers(uRes.users);
      if (rRes.success) {
        setRoles(rRes.roles);
        if (rRes.roles.length > 0 && !formData.roleId) {
          setFormData(prev => ({ ...prev, roleId: rRes.roles[0].id }));
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
        roleId: formData.roleId
      });
      showToast(res.message, 'success');
      setModalOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        phone: '',
        roleId: roles[0]?.id || ''
      });
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
            Control authentication credentials and enforce RBAC permissions across all 5 discrete system roles.
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
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Last Login</th>
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
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
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
        title="Create System User"
        subtitle="Provision account credentials and assign RBAC role"
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
    </div>
  );
}
