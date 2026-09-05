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
  UserCheck,
  Search,
  CheckCircle2,
  Eye,
  Info
} from 'lucide-react';

export function ContractPage() {
  const { user, isHR, isAdmin, isEmployee, showToast } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);

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

  const handleOpenView = (contract) => {
    setSelectedContract(contract);
    setViewModalOpen(true);
  };

  // Format Contract Code e.g. CON/2026/0042
  const getContractCode = (c, idx) => {
    if (c.code) return c.code;
    const year = c.contract_start_date ? new Date(c.contract_start_date).getFullYear() : '2026';
    const num = (idx + 1).toString().padStart(4, '0');
    return `CON/${year}/${num}`;
  };

  const formatDate = (val) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
    } catch (e) {
      return val;
    }
  };

  const filteredContracts = contracts.filter(c =>
    c.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.employee_code?.toLowerCase().includes(search.toLowerCase()) ||
    c.contract_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header matching Excalidraw Screen 5 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Contracts</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            List view of employee contracts
          </p>
        </div>

        {(isHR || isAdmin) && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-brand-500/25 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            NEW
          </button>
        )}
      </div>

      {/* Control Search Bar */}
      <div className="flex items-center gap-3 p-3 glass-panel rounded-2xl border border-slate-800 bg-slate-900/60 max-w-md">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search contracts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
        />
      </div>

      {/* Contracts Table matching Excalidraw Screen 5 */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Contract</th>
                <th className="py-3.5 px-4 font-semibold">Employee</th>
                <th className="py-3.5 px-4 font-semibold">Start</th>
                <th className="py-3.5 px-4 font-semibold">End</th>
                <th className="py-3.5 px-4 font-semibold">Wage / Month</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">Loading contracts...</td></tr>
              ) : filteredContracts.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">No contracts found.</td></tr>
              ) : (
                filteredContracts.map((c, idx) => {
                  const contractCode = getContractCode(c, idx);
                  const isRunning = c.status === 'ACTIVE';

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleOpenView(c)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-brand-300">
                        {contractCode}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-white">{c.employee_name}</p>
                          <p className="text-[10px] font-mono text-slate-400">{c.employee_code}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                        {formatDate(c.contract_start_date)}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {formatDate(c.contract_end_date)}
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-bold text-sm">
                        ₹ {parseFloat(c.wage).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isRunning
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-950/40 text-rose-400 border-rose-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                          {isRunning ? 'Running' : 'Expired'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenView(c)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-colors"
                          title="View Contract Form"
                        >
                          <Eye className="w-3.5 h-3.5" />
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

      {/* Contract Details Form View matching Excalidraw Screen 6 */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={selectedContract ? `Contract / ${getContractCode(selectedContract, 0)}` : 'Contract Details'}
        subtitle="Form view of one contract"
        maxWidth="max-w-3xl"
      >
        {selectedContract && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-3xl bg-slate-950/60 border border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Employee</label>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white">
                  {selectedContract.employee_name} ({selectedContract.employee_code})
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Department</label>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white">
                  {selectedContract.department_name || 'Finance'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Start Date</label>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono">
                  {selectedContract.contract_start_date}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Job Position</label>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
                  {selectedContract.designation_name || 'Payroll Specialist'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">End Date</label>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">
                  {selectedContract.contract_end_date || '— (Ongoing)'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Wage / Month</label>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-bold text-emerald-400 font-mono">
                  ₹ {parseFloat(selectedContract.wage).toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Status</label>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {selectedContract.status === 'ACTIVE' ? 'Running' : selectedContract.status}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Working Schedule</label>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
                  {selectedContract.working_schedule_name || '40 Hours / Week'}
                </div>
              </div>
            </div>

            {/* Salary Structure / Notes Box matching Screen 6 */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
              <h5 className="text-xs font-bold text-brand-300">Salary Structure / Notes</h5>
              <p className="text-xs text-slate-300">
                Structure Type: <strong className="text-white">{selectedContract.salary_structure_name || 'Standard Professional Salary Structure'}</strong>
              </p>
              <p className="text-xs text-slate-400">
                This running contract is the source for payroll calculation in the active period.
              </p>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 text-center italic">
              Useful note: one employee should not have multiple Running contracts for the same period.
            </div>
          </div>
        )}
      </Modal>

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
                <option value="PERMANENT">Permanent / Full-Time</option>
                <option value="PROBATION">Probation</option>
                <option value="CONTRACTOR">Contractor</option>
                <option value="CONSULTANT">Consultant</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Wage (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.wage}
                onChange={e => setFormData({ ...formData, wage: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
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
                {structures.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
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
              Create Contract
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
