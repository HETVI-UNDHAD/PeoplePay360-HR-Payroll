import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Modal } from '../../components/Modal';
import {
  Building2,
  Plus,
  Users,
  Briefcase,
  CheckCircle2,
  Edit
} from 'lucide-react';

export function DepartmentPage() {
  const { isHR, isAdmin, showToast } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [desigModalOpen, setDesigModalOpen] = useState(false);

  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [desigForm, setDesigForm] = useState({ name: '', code: '', department_id: '', description: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptRes, desigRes] = await Promise.all([
        api.getDepartments(),
        api.getDesignations()
      ]);

      if (deptRes.success) {
        setDepartments(deptRes.departments);
        if (deptRes.departments.length > 0 && !desigForm.department_id) {
          setDesigForm(prev => ({ ...prev, department_id: deptRes.departments[0].id }));
        }
      }
      if (desigRes.success) setDesignations(desigRes.designations);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createDepartment(deptForm);
      showToast(res.message, 'success');
      setDeptModalOpen(false);
      setDeptForm({ name: '', code: '' });
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDesigSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createDesignation(desigForm);
      showToast(res.message, 'success');
      setDesigModalOpen(false);
      setDesigForm({ name: '', code: '', department_id: departments[0]?.id || '', description: '' });
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
          <h2 className="text-2xl font-bold text-white tracking-tight">Departments & Job Designations</h2>
          <p className="text-xs text-slate-400 mt-1">
            Organize organizational units, hierarchical structures, and position titles.
          </p>
        </div>

        {(isHR || isAdmin) && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDesigModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Designation
            </button>
            <button
              onClick={() => setDeptModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Department
            </button>
          </div>
        )}
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((d) => (
          <div key={d.id} className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                  {d.code}
                </span>
              </div>

              <h3 className="text-base font-bold text-white">{d.name}</h3>

              <div className="mt-4 grid grid-cols-2 gap-3 py-3 border-y border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500">Active Staff:</span>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">{d.employee_count || 0} Members</p>
                </div>
                <div>
                  <span className="text-slate-500">Designations:</span>
                  <p className="text-base font-bold text-brand-400 mt-0.5">{d.designation_count || 0} Roles</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
              <span>Status: <strong className="text-emerald-400">Active</strong></span>
              <span className="text-slate-400">Company ID: PP360</span>
            </div>
          </div>
        ))}
      </div>

      {/* Designations Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">All Job Designations ({designations.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Designation Title</th>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Staff Assigned</th>
                <th className="p-3.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {designations.map((des) => (
                <tr key={des.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5 font-semibold text-white">{des.name}</td>
                  <td className="p-3.5 font-mono text-brand-400">{des.code || '—'}</td>
                  <td className="p-3.5 text-slate-300">{des.department_name}</td>
                  <td className="p-3.5 font-bold text-emerald-400">{des.employee_count || 0} Employees</td>
                  <td className="p-3.5 text-slate-400">{des.description || 'Standard role'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title="Create New Department"
        subtitle="Adds organizational division"
      >
        <form onSubmit={handleDeptSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Department Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Legal & Compliance"
              value={deptForm.name}
              onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Code (Optional)</label>
            <input
              type="text"
              placeholder="e.g. LEGAL"
              value={deptForm.code}
              onChange={e => setDeptForm({ ...deptForm, code: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
            />
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeptModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/25"
            >
              Save Department
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={desigModalOpen}
        onClose={() => setDesigModalOpen(false)}
        title="Create Job Designation"
        subtitle="Adds job title to a department"
      >
        <form onSubmit={handleDesigSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Department *</label>
            <select
              required
              value={desigForm.department_id}
              onChange={e => setDesigForm({ ...desigForm, department_id: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Designation Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Senior Product Designer"
              value={desigForm.name}
              onChange={e => setDesigForm({ ...desigForm, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Code</label>
            <input
              type="text"
              placeholder="e.g. SR_PROD_DES"
              value={desigForm.code}
              onChange={e => setDesigForm({ ...desigForm, code: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
            />
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDesigModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/25"
            >
              Save Designation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
