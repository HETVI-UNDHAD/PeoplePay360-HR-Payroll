import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Modal } from '../../components/Modal';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  Eye
} from 'lucide-react';

export function SchedulePage() {
  const { isHR, isAdmin, showToast } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const [formData, setFormData] = useState({
    name: 'Shift Schedule (40h/week)',
    timezone: 'America/Los_Angeles',
    weekly_working_hours: 40,
    working_days: 'Monday,Tuesday,Wednesday,Thursday,Friday',
    start_time: '09:00:00',
    end_time: '18:00:00',
    break_hours: 1.0
  });

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await api.getSchedules();
      if (res.success) setSchedules(res.schedules);
    } catch (err) {
      console.error('Fetch schedules error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleOpenDetails = async (id) => {
    try {
      const res = await api.getScheduleDetails(id);
      if (res.success) {
        setSelectedSchedule(res);
        setDetailsModalOpen(true);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createSchedule(formData);
      showToast(res.message, 'success');
      setModalOpen(false);
      fetchSchedules();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Working Schedules & Shifts</h2>
          <p className="text-xs text-slate-400 mt-1">
            Define daily operating hours, weekly shift durations, and break rules assigned to employee contracts.
          </p>
        </div>

        {(isHR || isAdmin) && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Schedule
          </button>
        )}
      </div>

      {/* Grid of Schedules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schedules.map((sc) => (
          <div key={sc.id} className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  {sc.assigned_contract_count || 0} contracts
                </span>
              </div>

              <h3 className="text-base font-bold text-white">{sc.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{sc.timezone}</p>

              <div className="mt-4 space-y-2 text-xs py-3 border-y border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Weekly Hours:</span>
                  <span className="text-white font-bold">{sc.weekly_working_hours} hrs/week</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Daily Timing:</span>
                  <span className="text-slate-300 font-mono">{sc.start_time} - {sc.end_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Daily Break:</span>
                  <span className="text-slate-300">{sc.break_hours} hr</span>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-[11px] text-slate-500 mb-1">Working Days:</p>
                <div className="flex flex-wrap gap-1">
                  {(sc.working_days || '').split(',').map((day, idx) => (
                    <span key={idx} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium">
                      {day.substring(0, 3)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleOpenDetails(sc.id)}
              className="mt-5 w-full py-2 rounded-xl bg-slate-800 hover:bg-brand-600 text-slate-200 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-3.5 h-3.5" />
              View Day-by-Day Roster
            </button>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={selectedSchedule?.schedule?.name || 'Schedule Details'}
        subtitle="Detailed 7-day breakdown for this schedule"
      >
        {selectedSchedule && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Day of Week</th>
                    <th className="p-3">Working Day?</th>
                    <th className="p-3">Start Time</th>
                    <th className="p-3">End Time</th>
                    <th className="p-3">Break</th>
                    <th className="p-3">Daily Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedSchedule.days.map((d) => (
                    <tr key={d.id} className={d.is_working_day ? 'bg-slate-900/50' : 'bg-slate-950/40 text-slate-500'}>
                      <td className="p-3 font-semibold text-white">{d.day_of_week}</td>
                      <td className="p-3">
                        {d.is_working_day ? (
                          <span className="text-emerald-400 font-medium">Yes</span>
                        ) : (
                          <span className="text-slate-500">Off Day</span>
                        )}
                      </td>
                      <td className="p-3 font-mono">{d.is_working_day ? d.start_time : '—'}</td>
                      <td className="p-3 font-mono">{d.is_working_day ? d.end_time : '—'}</td>
                      <td className="p-3">{d.is_working_day ? `${d.break_hours}h` : '—'}</td>
                      <td className="p-3 font-bold text-slate-200">{d.hours} hrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Working Schedule"
        subtitle="Defines weekly shift parameters"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Schedule Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Weekly Working Hours *</label>
              <input
                type="number"
                required
                value={formData.weekly_working_hours}
                onChange={e => setFormData({ ...formData, weekly_working_hours: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Break Duration (Hours) *</label>
              <input
                type="number"
                step="0.5"
                required
                value={formData.break_hours}
                onChange={e => setFormData({ ...formData, break_hours: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Shift Start Time *</label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Shift End Time *</label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Working Days (Comma Separated)</label>
            <input
              type="text"
              value={formData.working_days}
              onChange={e => setFormData({ ...formData, working_days: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
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
              Save Working Schedule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
