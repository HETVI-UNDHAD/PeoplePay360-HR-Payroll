import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  PlaneTakeoff,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Calendar,
  Filter,
  UserCheck,
  AlertCircle
} from 'lucide-react';

export function TimeOffPage() {
  const { user, isHR, isAdmin, isEmployee, showToast } = useAuth();
  const [requests, setRequests] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'allocations'
  const [filterStatus, setFilterStatus] = useState('');

  // Apply Modal
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({
    time_off_type_id: '',
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    total_days: 1,
    reason: ''
  });

  // Review Modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVE');
  const [reviewComment, setReviewComment] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, allocRes, typeRes] = await Promise.all([
        api.getTimeOffRequests({ status: filterStatus }),
        api.getAllocations(),
        api.getTimeOffTypes()
      ]);

      if (reqRes.success) setRequests(reqRes.requests);
      if (allocRes.success) setAllocations(allocRes.allocations);
      if (typeRes.success) {
        setLeaveTypes(typeRes.types);
        if (typeRes.types.length > 0 && !applyForm.time_off_type_id) {
          setApplyForm(prev => ({ ...prev, time_off_type_id: typeRes.types[0].id }));
        }
      }
    } catch (err) {
      console.error('Fetch timeoff error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus, user]);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.applyTimeOff(applyForm);
      showToast(res.message, 'success');
      setApplyModalOpen(false);
      setApplyForm({
        time_off_type_id: leaveTypes[0]?.id || '',
        from_date: new Date().toISOString().split('T')[0],
        to_date: new Date().toISOString().split('T')[0],
        total_days: 1,
        reason: ''
      });
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenReview = (req, action) => {
    setSelectedRequest(req);
    setReviewAction(action);
    setReviewComment('');
    setReviewModalOpen(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.reviewTimeOff(selectedRequest.id, reviewAction, reviewComment);
      showToast(res.message, 'success');
      setReviewModalOpen(false);
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
          <h2 className="text-2xl font-bold text-white tracking-tight">Time Off & Leave Management</h2>
          <p className="text-xs text-slate-400 mt-1">
            Submit leave applications, view remaining allocations, and review team requests with automatic balance deductions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setApplyModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Apply For Leave
          </button>
        </div>
      </div>

      {/* Leave Allocations Cards (Top Summary) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {allocations.slice(0, 4).map((al) => (
          <div key={al.id} className="glass-panel p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400">{al.leave_type_name}</span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-white">{al.remaining_days}</span>
                <span className="text-xs text-slate-500">/ {al.allocated_days} days</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{al.employee_name || 'My Balance'} ({al.year})</p>
            </div>
            <div className="p-3 rounded-2xl" style={{ backgroundColor: `${al.color_code || '#3B82F6'}20`, color: al.color_code || '#3B82F6' }}>
              <Award className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Subtabs Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'requests' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Leave Requests ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('allocations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'allocations' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Leave Allocations
          </button>
        </div>

        {activeTab === 'requests' && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'requests' ? (
        <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Employee</th>
                  <th className="py-3.5 px-4 font-semibold">Leave Type</th>
                  <th className="py-3.5 px-4 font-semibold">Date Range</th>
                  <th className="py-3.5 px-4 font-semibold">Duration</th>
                  <th className="py-3.5 px-4 font-semibold">Reason</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  {(isHR || isAdmin) && <th className="py-3.5 px-4 font-semibold text-right">Review Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-500">Loading leave requests...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-500">No time-off requests found.</td></tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-white">{r.employee_name}</p>
                          <p className="text-[11px] font-mono text-brand-400">{r.employee_code}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-200">{r.leave_type_name}</span>
                        {r.is_paid ? (
                          <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium">Paid</span>
                        ) : (
                          <span className="ml-2 text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded font-medium">Unpaid</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {r.from_date} &rarr; {r.to_date}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">{r.total_days} Day(s)</td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{r.reason}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={r.status} size="xs" />
                      </td>
                      {(isHR || isAdmin) && (
                        <td className="py-3 px-4 text-right">
                          {r.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenReview(r, 'APPROVE')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleOpenReview(r, 'REJECT')}
                                className="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 text-xs font-semibold transition-all flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Reviewed by {r.reviewer_name || 'HR'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Allocations Table */
        <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Employee</th>
                  <th className="py-3.5 px-4 font-semibold">Department</th>
                  <th className="py-3.5 px-4 font-semibold">Leave Type</th>
                  <th className="py-3.5 px-4 font-semibold">Allocated Days</th>
                  <th className="py-3.5 px-4 font-semibold">Used Days</th>
                  <th className="py-3.5 px-4 font-semibold">Remaining Balance</th>
                  <th className="py-3.5 px-4 font-semibold">Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {allocations.map((al) => (
                  <tr key={al.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{al.employee_name}</td>
                    <td className="py-3 px-4 text-slate-300">{al.department_name || '—'}</td>
                    <td className="py-3 px-4 font-medium text-slate-200">{al.leave_type_name}</td>
                    <td className="py-3 px-4 font-bold text-slate-300">{al.allocated_days}</td>
                    <td className="py-3 px-4 font-bold text-rose-400">{al.used_days}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400 text-sm">{al.remaining_days}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{al.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        title="Apply for Time Off"
        subtitle="Submit leave request for HR review. Validates remaining allocation balance."
      >
        <form onSubmit={handleApplySubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Time-Off Type *</label>
            <select
              required
              value={applyForm.time_off_type_id}
              onChange={e => setApplyForm({ ...applyForm, time_off_type_id: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              {leaveTypes.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.is_paid ? 'Paid' : 'Unpaid'} - {t.default_days_per_year} days/yr)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">From Date *</label>
              <input
                type="date"
                required
                value={applyForm.from_date}
                onChange={e => setApplyForm({ ...applyForm, from_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">To Date *</label>
              <input
                type="date"
                required
                value={applyForm.to_date}
                onChange={e => setApplyForm({ ...applyForm, to_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Total Days *</label>
            <input
              type="number"
              step="0.5"
              required
              value={applyForm.total_days}
              onChange={e => setApplyForm({ ...applyForm, total_days: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Leave *</label>
            <textarea
              rows={3}
              required
              placeholder="Provide context for HR review..."
              value={applyForm.reason}
              onChange={e => setApplyForm({ ...applyForm, reason: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setApplyModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/25"
            >
              Submit Time-Off Application
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Modal (HR Manager) */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={`${reviewAction === 'APPROVE' ? 'Approve' : 'Reject'} Time-Off Request`}
        subtitle={`Request for ${selectedRequest?.employee_name} (${selectedRequest?.total_days} days of ${selectedRequest?.leave_type_name})`}
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <div className={`p-4 rounded-2xl border text-xs ${
            reviewAction === 'APPROVE' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
          }`}>
            <p className="font-semibold">
              {reviewAction === 'APPROVE'
                ? 'Approving this request will automatically deduct the requested days from the employee leave allocation balance.'
                : 'Rejecting this request will leave the employee leave allocation balance unchanged.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">HR Review Notes / Comments</label>
            <textarea
              rows={3}
              placeholder="e.g. Approved. Have a good break!"
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setReviewModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-lg transition-all ${
                reviewAction === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/25'
              }`}
            >
              Confirm {reviewAction === 'APPROVE' ? 'Approval' : 'Rejection'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
