import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  Sliders,
  Plus,
  Play,
  ArrowDown,
  Percent,
  DollarSign,
  Calculator,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Edit,
  Trash2
} from 'lucide-react';

export function SalaryRulesPage({ selectedStructureId }) {
  const { isPayrollAdmin, isAdmin, showToast } = useAuth();
  const [structures, setStructures] = useState([]);
  const [currentStructureId, setCurrentStructureId] = useState(selectedStructureId || '');
  const [structureData, setStructureData] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simulator State
  const [simWage, setSimWage] = useState(8000);
  const [simWorkingDays, setSimWorkingDays] = useState(22);
  const [simPresentDays, setSimPresentDays] = useState(20);
  const [simUnpaidLeave, setSimUnpaidLeave] = useState(0);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Modal
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    code: '',
    sequence: 10,
    category: 'ALLOWANCE',
    computation_type: 'PERCENTAGE',
    fixed_amount: 0,
    percentage: 10,
    base_code: 'BASIC',
    formula: '',
    condition: ''
  });

  const fetchStructures = async () => {
    try {
      const res = await api.getSalaryStructures();
      if (res.success) {
        setStructures(res.structures);
        if (!currentStructureId && res.structures.length > 0) {
          setCurrentStructureId(res.structures[0].id);
        }
      }
    } catch (err) {
      console.error('Fetch structures error:', err);
    }
  };

  const fetchStructureDetails = async () => {
    if (!currentStructureId) return;
    try {
      setLoading(true);
      const res = await api.getSalaryStructureDetails(currentStructureId);
      if (res.success) {
        setStructureData(res.structure);
        setRules(res.rules || []);
        // Run initial simulation
        runSimulator(res.structure.id, simWage);
      }
    } catch (err) {
      console.error('Fetch details error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, []);

  useEffect(() => {
    if (currentStructureId) {
      fetchStructureDetails();
    }
  }, [currentStructureId]);

  const runSimulator = async (structureId = currentStructureId, wage = simWage) => {
    if (!structureId) return;
    setSimLoading(true);
    try {
      const res = await api.testSalaryEngine({
        salary_structure_id: structureId,
        wage: parseFloat(wage),
        workingDays: parseFloat(simWorkingDays),
        presentDays: parseFloat(simPresentDays),
        unpaidLeaveDays: parseFloat(simUnpaidLeave)
      });
      if (res.success) {
        setSimResult(res.simulation);
      }
    } catch (err) {
      console.error('Simulator error:', err);
    } finally {
      setSimLoading(false);
    }
  };

  const handleOpenCreateRule = () => {
    setEditingRuleId(null);
    const nextSeq = rules.length > 0 ? Math.max(...rules.map(r => r.sequence || 0)) + 10 : 10;
    setRuleForm({
      name: '',
      code: '',
      sequence: nextSeq,
      category: 'ALLOWANCE',
      computation_type: 'PERCENTAGE',
      fixed_amount: 0,
      percentage: 15,
      base_code: 'BASIC',
      formula: '',
      condition: ''
    });
    setRuleModalOpen(true);
  };

  const handleOpenEditRule = (r) => {
    setEditingRuleId(r.id);
    setRuleForm({
      name: r.name,
      code: r.code,
      sequence: r.sequence,
      category: r.category,
      computation_type: r.computation_type,
      fixed_amount: r.fixed_amount || 0,
      percentage: r.percentage || 0,
      base_code: r.base_code || 'BASIC',
      formula: r.formula || '',
      condition: r.condition || ''
    });
    setRuleModalOpen(true);
  };

  const handleRuleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRuleId) {
        const res = await api.updateSalaryRule(editingRuleId, ruleForm);
        showToast(res.message, 'success');
      } else {
        const res = await api.createSalaryRule({
          ...ruleForm,
          salary_structure_id: currentStructureId
        });
        showToast(res.message, 'success');
      }
      setRuleModalOpen(false);
      fetchStructureDetails();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteRule = async (ruleId, ruleName) => {
    if (!window.confirm(`Are you sure you want to delete salary rule "${ruleName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await api.deleteSalaryRule(ruleId);
      showToast(res.message || 'Salary rule deleted successfully', 'success');
      fetchStructureDetails();
    } catch (err) {
      showToast(err.message || 'Failed to delete salary rule', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sequential Salary Rule Engine</h2>
          <p className="text-xs text-slate-400 mt-1">
            Build and simulate dynamic computation rules evaluated in sequential order (Sequence 10 &rarr; 20 &rarr; 30...).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Structure Selector */}
          <select
            value={currentStructureId}
            onChange={e => setCurrentStructureId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-semibold focus:outline-none focus:border-brand-500"
          >
            {structures.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>

          {(isPayrollAdmin || isAdmin) && (
            <button
              onClick={handleOpenCreateRule}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Salary Rule
            </button>
          )}
        </div>
      </div>

      {/* Rules Engine Flow & Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Sequential Rules List (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel p-5 rounded-3xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configured Rules Pipeline</h3>
                <p className="text-[11px] text-slate-400">Rules execute top-to-bottom according to Sequence index</p>
              </div>
              <span className="text-xs font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2.5 py-1 rounded-lg">
                {rules.length} Rules Active
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading rules...</div>
            ) : rules.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No salary rules defined for this structure.</div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule, idx) => (
                  <div
                    key={rule.id}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {/* Sequence Badge */}
                      <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 font-mono font-bold text-xs flex items-center justify-center border border-slate-700">
                        {rule.sequence}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white">{rule.name}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-brand-300 font-semibold border border-slate-700">
                            {rule.code}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className={`font-semibold ${
                            rule.category === 'BASIC' ? 'text-indigo-400' : rule.category === 'ALLOWANCE' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            [{rule.category}]
                          </span>
                          <span>•</span>
                          <span>
                            {rule.computation_type === 'FIXED' && `Fixed: $${rule.fixed_amount}`}
                            {rule.computation_type === 'PERCENTAGE' && `${rule.percentage}% of ${rule.base_code || 'BASIC'}`}
                            {rule.computation_type === 'FORMULA' && `Formula: ${rule.formula}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {(isPayrollAdmin || isAdmin) && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditRule(rule)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-brand-600 transition-all"
                          title="Edit Rule"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id, rule.name)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Interactive Simulator (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-5 h-5 text-brand-400" />
              <h3 className="text-sm font-bold text-white">Live Salary Engine Simulator</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Test rule equations with custom base wages and attendance factors:
            </p>

            {/* Simulator Inputs */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">Contract Base Wage ($)</label>
                <input
                  type="number"
                  value={simWage}
                  onChange={e => {
                    setSimWage(e.target.value);
                    runSimulator(currentStructureId, e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Working Days</label>
                  <input
                    type="number"
                    value={simWorkingDays}
                    onChange={e => {
                      setSimWorkingDays(e.target.value);
                      runSimulator(currentStructureId, simWage);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Unpaid Leaves</label>
                  <input
                    type="number"
                    value={simUnpaidLeave}
                    onChange={e => {
                      setSimUnpaidLeave(e.target.value);
                      runSimulator(currentStructureId, simWage);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-rose-400 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Simulator Real-Time Output */}
            {simResult && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-semibold text-slate-400">Gross Salary:</span>
                  <span className="text-sm font-bold text-white">${simResult.grossSalary?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-semibold text-slate-400">Total Deductions:</span>
                  <span className="text-sm font-bold text-rose-400">-${simResult.totalDeductions?.toLocaleString()}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-baseline justify-between mt-2">
                  <span className="text-xs font-bold text-brand-300 uppercase">Calculated Net Pay:</span>
                  <span className="text-xl font-bold text-emerald-400">${simResult.netSalary?.toLocaleString()}</span>
                </div>

                {/* Line by line breakdown */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5 max-h-48 overflow-y-auto">
                  <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Itemized Rule Computations:</p>
                  {simResult.lines?.map((line, idx) => (
                    <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-900">
                      <span className="text-slate-300">{line.ruleName} ({line.ruleCode})</span>
                      <span className={`font-mono font-medium ${line.category === 'DEDUCTION' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {line.category === 'DEDUCTION' ? '-' : '+'}${line.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal: Create/Edit Salary Rule */}
      <Modal
        isOpen={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title={editingRuleId ? 'Edit Salary Rule' : 'Create New Salary Rule'}
        subtitle="Specify sequential calculation parameters"
      >
        <form onSubmit={handleRuleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Rule Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. House Rent Allowance"
                value={ruleForm.name}
                onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Rule Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. HRA"
                value={ruleForm.code}
                onChange={e => setRuleForm({ ...ruleForm, code: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Sequence (Order) *</label>
              <input
                type="number"
                required
                value={ruleForm.sequence}
                onChange={e => setRuleForm({ ...ruleForm, sequence: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
              <select
                value={ruleForm.category}
                onChange={e => setRuleForm({ ...ruleForm, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="BASIC">Basic</option>
                <option value="ALLOWANCE">Allowance (Earning)</option>
                <option value="DEDUCTION">Deduction</option>
                <option value="NET">Net</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Computation Type *</label>
              <select
                value={ruleForm.computation_type}
                onChange={e => setRuleForm({ ...ruleForm, computation_type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount ($)</option>
                <option value="FORMULA">Custom Formula</option>
              </select>
            </div>
          </div>

          {/* Conditional Input based on Computation Type */}
          {ruleForm.computation_type === 'FIXED' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Fixed Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={ruleForm.fixed_amount}
                onChange={e => setRuleForm({ ...ruleForm, fixed_amount: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
              />
            </div>
          )}

          {ruleForm.computation_type === 'PERCENTAGE' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Percentage Rate (%) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={ruleForm.percentage}
                  onChange={e => setRuleForm({ ...ruleForm, percentage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Base Rule Code</label>
                <input
                  type="text"
                  placeholder="e.g. BASIC or WAGE"
                  value={ruleForm.base_code}
                  onChange={e => setRuleForm({ ...ruleForm, base_code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>
          )}

          {ruleForm.computation_type === 'FORMULA' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Formula Expression *</label>
              <input
                type="text"
                required
                placeholder="e.g. (BASIC + HRA) * 0.08"
                value={ruleForm.formula}
                onChange={e => setRuleForm({ ...ruleForm, formula: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Available variables: WAGE, BASIC, HRA, GROSS, etc.</p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRuleModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/25"
            >
              {editingRuleId ? 'Update Salary Rule' : 'Add Rule to Pipeline'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
