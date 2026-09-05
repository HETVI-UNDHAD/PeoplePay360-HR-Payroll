import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  Clock,
  CheckCircle2,
  Calendar,
  Search,
  Filter,
  UserCheck,
  AlertCircle,
  Building2,
  Edit,
  ArrowRight
} from 'lucide-react';

export function AttendancePage() {
  const { user, isHR, isAdmin, isEmployee, showToast } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [punchNotes, setPunchNotes] = useState('');

  // Correction Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editForm, setEditForm] = useState({ worked_hours: 8, status: 'PRESENT', notes: '' });

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const [allRes, todayRes] = await Promise.all([
        api.getAttendance({ status: filterStatus }),
        user?.employeeId ? api.getTodayAttendance() : Promise.resolve({ success: true, attendance: null })
      ]);

      if (allRes.success) setAttendanceRecords(allRes.attendance);
      if (todayRes.success) setTodayAttendance(todayRes.attendance);
    } catch (err) {
      console.error('Fetch attendance error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [filterStatus, user]);

  const handlePunch = async (action) => {
    setPunchLoading(true);
    try {
      if (action === 'in') {
        const res = await api.checkIn(punchNotes);
        showToast(res.message, 'success');
        setPunchNotes('');
      } else {
        const res = await api.checkOut();
        showToast(res.message, 'success');
      }
      fetchAttendance();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleOpenEdit = (rec) => {
    setSelectedRecord(rec);
    setEditForm({
      worked_hours: rec.worked_hours || 8,
      status: rec.status || 'PRESENT',
      notes: rec.notes || ''
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateAttendance(selectedRecord.id, editForm);
      showToast(res.message, 'success');
      setEditModalOpen(false);
      fetchAttendance();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Attendance & Time Tracking</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time biometric & web punch logging, worked hours calculations, and HR compliance corrections.
          </p>
        </div>
      </div>

      {/* Employee Punch Card (Shown prominently for Employees or users with linked employee profiles) */}
      {user?.employeeId && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Daily Punch In / Out Terminal</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Today is <span className="text-slate-200 font-semibold">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </p>
                <div className="flex items-center gap-3 mt-2">
                  {todayAttendance?.check_in && (
                    <span className="text-xs font-mono text-brand-300 bg-brand-500/10 px-2.5 py-1 rounded-lg border border-brand-500/20">
                      Check-in: {new Date(todayAttendance.check_in).toLocaleTimeString()}
                    </span>
                  )}
                  {todayAttendance?.check_out && (
                    <span className="text-xs font-mono text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      Check-out: {new Date(todayAttendance.check_out).toLocaleTimeString()}
                    </span>
                  )}
                  {todayAttendance?.status && <StatusBadge status={todayAttendance.status} />}
                </div>
              </div>
            </div>

            {/* Punch Action Buttons */}
            <div className="flex items-center gap-3">
              {!todayAttendance?.check_in ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Optional notes (e.g. WFH)..."
                    value={punchNotes}
                    onChange={e => setPunchNotes(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 w-48"
                  />
                  <button
                    onClick={() => handlePunch('in')}
                    disabled={punchLoading}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {punchLoading ? 'Processing...' : 'Punch Check-In'}
                  </button>
                </div>
              ) : !todayAttendance?.check_out ? (
                <button
                  onClick={() => handlePunch('out')}
                  disabled={punchLoading}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  {punchLoading ? 'Processing...' : 'Punch Check-Out'}
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                  Daily Shift Completed ({todayAttendance.worked_hours} hours logged)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ABSENT">Absent</option>
            <option value="LEAVE">Leave</option>
          </select>
        </div>

        <span className="text-xs text-slate-400">
          Showing {attendanceRecords.length} records
        </span>
      </div>

      {/* Attendance Records Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Employee</th>
                <th className="py-3.5 px-4 font-semibold">Date</th>
                <th className="py-3.5 px-4 font-semibold">Check In</th>
                <th className="py-3.5 px-4 font-semibold">Check Out</th>
                <th className="py-3.5 px-4 font-semibold">Worked Hours</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Notes</th>
                {(isHR || isAdmin) && <th className="py-3.5 px-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-slate-500">Loading attendance records...</td></tr>
              ) : attendanceRecords.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-slate-500">No attendance records found.</td></tr>
              ) : (
                attendanceRecords.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-white">{att.employee_name}</p>
                        <p className="text-[11px] font-mono text-brand-400">{att.employee_code}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-medium">{att.date}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {att.check_in ? new Date(att.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {att.check_out ? new Date(att.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-200">
                      {att.worked_hours ? `${att.worked_hours}h` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={att.status} size="xs" />
                    </td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-xs">{att.notes || '—'}</td>
                    {(isHR || isAdmin) && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(att)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-colors"
                          title="Correct Attendance"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* HR Attendance Correction Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Correct Attendance Record"
        subtitle={`Editing log for ${selectedRecord?.employee_name} (${selectedRecord?.date})`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
            <select
              value={editForm.status}
              onChange={e => setEditForm({ ...editForm, status: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="PRESENT">Present (Full Day)</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="LATE">Late Check-in</option>
              <option value="ABSENT">Absent</option>
              <option value="LEAVE">Approved Leave</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Worked Hours</label>
            <input
              type="number"
              step="0.1"
              required
              value={editForm.worked_hours}
              onChange={e => setEditForm({ ...editForm, worked_hours: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Correction Notes / Reason</label>
            <textarea
              rows={2}
              value={editForm.notes}
              onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="e.g. Approved adjustment for client visit..."
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
              Update Attendance Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
