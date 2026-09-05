import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Modal } from '../../components/Modal';
import {
  FileSpreadsheet,
  Plus,
  Sliders,
  CheckCircle2,
  Building2,
  Users,
  Eye,
  ArrowRight,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export function SalaryStructuresPage({ onSelectStructure }) {
  const { isPayrollAdmin, isAdmin, showToast } = useAuth();
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'REGULAR',
    description: ''
  });

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    code: '',
    type: 'REGULAR',
    description: ''
  });

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [structureToDelete, setStructureToDelete] = useState(null);

  const fetchStructures = async () => {
    try {
      setLoading(true);
      const res = await api.getSalaryStructures();
      if (res.success) setStructures(res.structures);
    } catch (err) {
      console.error('Fetch structures error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createSalaryStructure(formData);
      showToast(res.message, 'success');
      setModalOpen(false);
      setFormData({ name: '', code: '', type: 'REGULAR', description: '' });
      fetchStructures();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenEdit = (s) => {
    setEditFormData({
      id: s.id,
      name: s.name || '',
      code: s.code || '',
      type: s.type || 'REGULAR',
      description: s.description || ''
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateSalaryStructure(editFormData.id, editFormData);
      showToast(res.message || 'Structure updated successfully', 'success');
      setEditModalOpen(false);
      fetchStructures();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteClick = (s) => {
    setStructureToDelete(s);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!structureToDelete) return;
    try {
      const res = await api.deleteSalaryStructure(structureToDelete.id);
      showToast(res.message || 'Structure deleted successfully', 'success');
      setDeleteModalOpen(false);
      setStructureToDelete(null);
      fetchStructures();
    } catch (err) {
      showToast(err.message || 'Failed to delete structure', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Salary Structures</h2>
          <p className="text-xs text-slate-400 mt-1">
            Define comprehensive compensation frameworks with sequenced earnings and deductions rules.
          </p>
        </div>

        {(isPayrollAdmin || isAdmin) && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Salary Structure
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {structures.map((s) => (
          <div key={s.id} className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                    {s.code}
                  </span>
                  {(isPayrollAdmin || isAdmin) && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors"
                        title="Edit Structure"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(s)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
                        title="Delete Structure"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <h3 className="text-base font-bold text-white">{s.name}</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.description || 'Standard corporate compensation package'}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 py-3 border-y border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500">Active Rules:</span>
                  <p className="text-base font-bold text-brand-400 mt-0.5">{s.rules_count || 0} Rules</p>
                </div>
                <div>
                  <span className="text-slate-500">Active Contracts:</span>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">{s.active_contracts_count || 0} Employees</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectStructure(s.id)}
              className="mt-5 w-full py-2.5 rounded-xl bg-brand-600/20 hover:bg-brand-600 text-brand-300 hover:text-white border border-brand-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Sliders className="w-3.5 h-3.5" />
              Configure Salary Rules Engine &rarr;
            </button>
          </div>
        ))}
      </div>

      {/* Create Salary Structure Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Salary Structure"
        subtitle="Define new salary package category"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Structure Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Standard Full-Time Structure"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. REG_SAL_2026"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Structure Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="REGULAR">Regular Full-Time</option>
                <option value="EXECUTIVE">Executive / Leadership</option>
                <option value="CONTRACTOR">Contractor / Consultant</option>
                <option value="INTERN">Intern / Trainee</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Brief description of rules applied..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
            />
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
              Save Structure
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Salary Structure Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Salary Structure"
        subtitle="Modify compensation framework details"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Structure Name *</label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Code *</label>
              <input
                type="text"
                required
                value={editFormData.code}
                onChange={e => setEditFormData({ ...editFormData, code: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Structure Type</label>
              <select
                value={editFormData.type}
                onChange={e => setEditFormData({ ...editFormData, type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="REGULAR">Regular Full-Time</option>
                <option value="EXECUTIVE">Executive / Leadership</option>
                <option value="CONTRACTOR">Contractor / Consultant</option>
                <option value="INTERN">Intern / Trainee</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={editFormData.description}
              onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
            />
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
              Update Structure
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Salary Structure Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Structure Deletion"
        subtitle="This action will delete the salary structure and its defined calculation rules"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Delete {structureToDelete?.name}?</p>
              <p className="mt-1 text-slate-400">
                You are about to delete <strong className="text-white">{structureToDelete?.name}</strong> ({structureToDelete?.code}).
                Ensure no active employment contracts are currently linked to this structure.
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
              Delete Salary Structure
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

