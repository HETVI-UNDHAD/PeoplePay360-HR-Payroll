import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ShieldCheck,
  UserCheck,
  Calculator,
  Users,
  User,
  Clock,
  LogOut,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export function Navbar({ onOpenPunchModal }) {
  const { user, logout, switchDemoRole, showToast } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [punchLoading, setPunchLoading] = useState(false);

  // Load today's attendance status
  const fetchTodayStatus = async () => {
    try {
      const res = await api.getTodayAttendance();
      if (res.success) {
        setTodayAttendance(res.attendance);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    if (user?.employeeId) {
      fetchTodayStatus();
    }
  }, [user]);

  const handlePunchToggle = async () => {
    setPunchLoading(true);
    try {
      if (!todayAttendance || !todayAttendance.check_in) {
        // Punch in
        const res = await api.checkIn();
        showToast(res.message, 'success');
      } else if (!todayAttendance.check_out) {
        // Punch out
        const res = await api.checkOut();
        showToast(res.message, 'success');
      }
      await fetchTodayStatus();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPunchLoading(false);
    }
  };

  const demoRoles = [
    { code: 'ADMIN', name: 'Admin', desc: 'Full System, Master Config & Rules', icon: ShieldCheck, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
    { code: 'HR_MANAGER', name: 'HR Manager', desc: 'Employees, Contracts & Leave Approvals', icon: Users, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    { code: 'PAYROLL_ADMIN', name: 'Payroll Admin', desc: 'Structures, Compute & Mark Paid', icon: Calculator, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { code: 'PAYROLL_USER', name: 'Payroll User', desc: 'Process Pay Runs & Payslips', icon: UserCheck, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { code: 'EMPLOYEE', name: 'Employee', desc: 'Self-Service: Punch, Leave, Payslip', icon: User, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  ];

  const currentRoleConfig = demoRoles.find(r => r.code === user?.role) || demoRoles[0];

  return (
    <header className="sticky top-0 z-40 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between">
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Calculator className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">PeoplePay<span className="text-brand-400">360</span></h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">Enterprise HR</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-none mt-1">HR & Payroll Management System</p>
        </div>
      </div>

      {/* Center & Right Actions */}
      <div className="flex items-center gap-3">
        {/* Quick Check-In / Check-Out Widget for Employee */}
        {user?.employeeId && (
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5">
            <Clock className="w-4 h-4 text-brand-400" />
            <div className="text-xs">
              {!todayAttendance?.check_in ? (
                <span className="text-slate-400">Not checked in</span>
              ) : todayAttendance.check_out ? (
                <span className="text-emerald-400">Worked: {todayAttendance.worked_hours}h</span>
              ) : (
                <span className="text-brand-300">In: {new Date(todayAttendance.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
            <button
              onClick={handlePunchToggle}
              disabled={punchLoading || (todayAttendance?.check_in && todayAttendance?.check_out)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                !todayAttendance?.check_in
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : !todayAttendance?.check_out
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              {punchLoading ? '...' : !todayAttendance?.check_in ? 'Check In' : !todayAttendance?.check_out ? 'Check Out' : 'Done'}
            </button>
          </div>
        )}

        {/* Demo Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${currentRoleConfig.color} hover:brightness-110`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Role: {currentRoleConfig.name}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 glass-panel bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Switch Demo Role</p>
                <p className="text-[11px] text-slate-400">Test all 5 exact roles with 1-click:</p>
              </div>
              <div className="space-y-1 mt-1">
                {demoRoles.map((r) => {
                  const Icon = r.icon;
                  const isSelected = user?.role === r.code;
                  return (
                    <button
                      key={r.code}
                      onClick={() => {
                        switchDemoRole(r.code);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                        isSelected ? 'bg-brand-500/20 border border-brand-500/40 text-brand-200' : 'hover:bg-slate-800/80 text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mt-0.5 text-brand-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          {r.name}
                          {isSelected && <span className="text-[10px] text-brand-400 bg-brand-400/10 px-1 rounded font-normal">Active</span>}
                        </div>
                        <p className="text-[10px] text-slate-400">{r.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User profile & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-white">{user?.firstName} {user?.lastName}</p>
            <p className="text-[10px] text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
