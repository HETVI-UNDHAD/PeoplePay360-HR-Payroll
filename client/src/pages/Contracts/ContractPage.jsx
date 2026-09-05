import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  FileText,
  Plus,
  DollarSign,
  Calendar,
  Building2,
  Clock,
  Edit,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

export function ContractPage() {
  const { user, isHR, isAdmin, isEmployee, showToast } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    contract_start_date: new Date().toISOString().split('T')[0],
    contract_end_date: '',
    contract_type: 'PERMANENT',
    salary_structure_id: '',
    wage: 6500,
    working_schedule_id: '',
    status: 'ACTIVE',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cRes, empRes, stRes, scRes] = await Promise.all([
        api.getContracts(),
        isEmployee ? Promise.resolve({ success: true, employees: [] }) : api.getEmployees(),
        api.getSalaryStructures(),
        api.getSchedules()
      ]);

      if (cRes.success) setContracts(cRes.contracts);
      if (empRes.success) {
        setEmployees(empRes.employees);
        if (empRes.employees.length > 0 && !formData.employee_id) {
          setFormData(prev => ({ ...prev, employee_id: empRes.employees[0].id }));
        }
      }
      if (stRes.success) {
        setStructures(stRes.structures);
        if (stRes.structures.length > 0 && !formData.salary_structure_id) {
          setFormData(prev => ({ ...prev, salary_structure_id: stRes.structures[0].id }));
        }
      }
      if (scRes.success) {
        setSchedules(scRes.schedules);
        if (scRes.schedules.length > 0 && !formData.working_schedule_id) {
          setFormData(prev => ({ ...prev, working_schedule_id: scRes.schedules[0].id }));
        }
      }
    } catch (err) {
      console.error('Fetch contracts error:', err);
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
      const res = await api.createContract(formData);
      showToast(res.message, 'success');
      setModalOpen(false);
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
            {isEmployee ? 'My Employment Contracts' : 'Employee Contracts & Agreements'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage multi-contract lifecycle, wages, salary structure linkages, and assigned working schedules.
          </p>
        </div>

        {(isHR || isAdmin) && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Contract
          </button>
        )}
      </div>

      {/* Contracts Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Employee</th>
                <th className="py-3.5 px-4 font-semibold">Contract Type</th>
                <th className="py-3.5 px-4 font-semibold">Monthly Wage</th>
                <th className="py-3.5 px-4 font-semibold">Salary Structure</th>
                <th className="py-3.5 px-4 font-semibold">Schedule</th>
                <th className="py-3.5 px-4 font-semibold">Valid Period</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-500">Loading contracts...</td></tr>
              ) : contracts.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-500">No contracts found.</td></tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-white">{c.employee_name}</p>
                        <p className="text-[11px] font-mono text-brand-400">{c.employee_code}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-200">{c.contract_type}</span>
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-bold text-sm">
                      ${parseFloat(c.wage).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-300 font-medium">{c.salary_structure_name || 'Standard'}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{c.working_schedule_name}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {c.contract_start_date} &rarr; {c.contract_end_date || 'Ongoing'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={c.status} size="xs" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Contract Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Employee Contract"
        subtitle="Links employee wage, salary structure rules, and working schedule"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Employee *</label>
            <select
              required
              value={formData.employee_id}
              onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code}) - {emp.department_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.contract_start_date}
                onChange={e => setFormData({ ...formData, contract_start_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">End Date (Optional)</label>
              <input
                type="date"
                value={formData.contract_end_date}
                onChange={e => setFormData({ ...formData, contract_end_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Contract Type</label>
              <select
                value={formData.contract_type}
                onChange={e => setFormData({ ...formData, contract_type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="PERMANENT">Permanent Full-Time</option>
                <option value="PROBATION">Probationary Period</option>
                <option value="TEMPORARY">Temporary / Fixed Term</option>
                <option value="CONSULTANT">Contractor / Consultant</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Wage ($) *</label>
              <input
                type="number"
                required
                value={formData.wage}
                onChange={e => setFormData({ ...formData, wage: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold text-emerald-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Salary Structure *</label>
              <select
                required
                value={formData.salary_structure_id}
                onChange={e => setFormData({ ...formData, salary_structure_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                {structures.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Working Schedule *</label>
              <select
                required
                value={formData.working_schedule_id}
                onChange={e => setFormData({ ...formData, working_schedule_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                {schedules.map(sc => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="ACTIVE">Active (Will apply to current and upcoming payrolls)</option>
              <option value="DRAFT">Draft</option>
              <option value="EXPIRED">Expired</option>
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
              Save Contract
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
