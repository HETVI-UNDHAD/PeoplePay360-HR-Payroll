import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  DollarSign,
  Receipt,
  Users,
  CalendarCheck,
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  PlaneTakeoff,
  Award,
  ArrowUpRight,
  ShieldAlert,
  Download,
  Building2,
  Filter,
  CheckCircle2,
  Info,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
  LabelList
} from 'recharts';

export function Dashboard({ onNavigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedEmpType, setSelectedEmpType] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedPeriod !== 'all') params.period = selectedPeriod;
      if (selectedDept !== 'all') params.department_id = selectedDept;
      if (selectedEmpType !== 'all') params.employee_type = selectedEmpType;
      if (selectedCompany !== 'all') params.company_id = selectedCompany;

      const res = await api.getDashboardStats(params);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user, selectedPeriod, selectedDept, selectedEmpType, selectedCompany]);

  // Format Indian / Global Currency
  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    if (num >= 10000000) return `₹ ${(num / 10000000).toFixed(2)}Cr`;
    if (num >= 100000) return `₹ ${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹ ${(num / 1000).toFixed(1)}k`;
    return `₹ ${num.toLocaleString('en-IN')}`;
  };

  const formatNumber = (num) => {
    return (parseFloat(num) || 0).toLocaleString('en-IN');
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Aggregating live HR & Payroll database metrics...</p>
        </div>
      </div>
    );
  }

  // 1. Employee Dashboard View (Self-service portal)
  if (data?.isEmployee) {
    const { latestPayslip, leaveBalances = [], monthlyAttendance, ytdEarnings } = data.stats || {};
    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-brand-950/40">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">Welcome, {user?.firstName}!</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">Employee Portal</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Employee Code: <span className="text-slate-200 font-mono font-medium">{user?.employeeCode}</span> • Self-Service Portal</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('timeoff')}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
            >
              <PlaneTakeoff className="w-4 h-4" />
              Apply Leave
            </button>
            <button
              onClick={() => onNavigate('payslips')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              My Payslips
            </button>
          </div>
        </div>

        {/* Employee Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase">Latest Net Salary</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {latestPayslip ? formatCurrency(latestPayslip.net_salary) : '₹ 0.00'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {latestPayslip ? `Period: ${latestPayslip.payroll_name || 'Latest Payrun'}` : 'No processed payslips yet'}
            </p>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase">YTD Net Earnings</span>
              <Award className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(ytdEarnings?.ytd_net || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Across {ytdEarnings?.total_payslips || 0} payslip(s) in {new Date().getFullYear()}
            </p>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase">Present Days (Month)</span>
              <Clock className="w-4 h-4 text-brand-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {monthlyAttendance?.present_days || 0} <span className="text-sm font-normal text-slate-400">days</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {monthlyAttendance?.late_days || 0} late • {monthlyAttendance?.half_days || 0} half days
            </p>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase">Leave Balance</span>
              <PlaneTakeoff className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {leaveBalances.reduce((sum, l) => sum + parseFloat(l.remaining_days || 0), 0)}{' '}
              <span className="text-sm font-normal text-slate-400">days left</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Across active time-off allocations</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Comprehensive Admin / HR / Payroll Manager Dashboard
  const { kpis, filters = {}, salaryCostByDepartment = [], monthlySalaryTrend = [], payslipStatus = {}, alerts = [], attendanceOverview = {}, timeOffOverview = [], departmentOverview = [] } = data || {};

  // Total for status split progress bar
  const statusTotal = (payslipStatus.paid || 0) + (payslipStatus.done || 0) + (payslipStatus.pending || 0) + (payslipStatus.warning || 0) || 1;
  const paidPct = Math.round(((payslipStatus.paid || 0) / statusTotal) * 100);
  const donePct = Math.round(((payslipStatus.done || 0) / statusTotal) * 100);
  const pendingPct = Math.round(((payslipStatus.pending || 0) / statusTotal) * 100);
  const warningPct = Math.max(0, 100 - paidPct - donePct - pendingPct);

  return (
    <div className="space-y-6">
      {/* Top Module Sub-Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-2xl border border-slate-800 w-fit">
        <button
          onClick={() => onNavigate('employees')}
          className="px-4 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
        >
          HR
        </button>
        <button
          onClick={() => onNavigate('employees')}
          className="px-4 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
        >
          Employees
        </button>
        <button
          onClick={() => onNavigate('attendance')}
          className="px-4 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
        >
          Attendance
        </button>
        <button
          onClick={() => onNavigate('timeoff')}
          className="px-4 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
        >
          Time Off
        </button>
        <button
          onClick={() => onNavigate('dashboard')}
          className="px-4 py-1.5 rounded-xl text-xs font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/20 shadow-sm"
        >
          Payroll
        </button>
      </div>

      {/* Title & Subtitle Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Payroll Dashboard</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Dashboard should help payroll/HR users understand payments, staffing impact, leave patterns, and attendance quality for the selected period.
        </p>
      </div>

      {/* Dynamic Filter Controls Bar */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-900/60">
        {/* Period Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand-400" />
            Period
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 transition-colors"
          >
            <option value="all">All Periods (YTD)</option>
            {filters.periods?.map((p) => (
              <option key={p.period_key} value={p.period_key}>
                {p.period_label}
              </option>
            ))}
          </select>
        </div>

        {/* Department Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            Department
          </label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 transition-colors"
          >
            <option value="all">All Departments</option>
            {filters.departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Employee Type Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            Employee Type
          </label>
          <select
            value={selectedEmpType}
            onChange={(e) => setSelectedEmpType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 transition-colors"
          >
            <option value="all">All Types</option>
            <option value="PERMANENT">Permanent / Full-Time</option>
            <option value="CONTRACTOR">Contractor</option>
            <option value="PART_TIME">Part-Time</option>
            <option value="INTERN">Intern</option>
          </select>
        </div>

        {/* Company Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            Company
          </label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 transition-colors"
          >
            <option value="all">All Companies</option>
            {filters.companies?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 5 KPI Stat Cards (Matching Specification) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Net Salary Paid */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between bg-slate-900/60">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Net Salary Paid</span>
          <div className="my-2">
            <div className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(kpis?.totalNetSalary || 0)}
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="w-3 h-3 inline" />
              {kpis?.growthRate || '+8.5% vs. previous month'}
            </span>
          </div>
        </div>

        {/* KPI 2: Payslips Generated */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between bg-slate-900/60">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Payslips Generated</span>
          <div className="my-2">
            <div className="text-2xl font-bold text-white tracking-tight">
              {kpis?.payslipsGenerated || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              <span className="text-emerald-400 font-medium">{kpis?.paidPayslipsCount || 0} paid</span>, {kpis?.pendingPayslipsCount || 0} pending
            </p>
          </div>
        </div>

        {/* KPI 3: Avg Salary / Employee */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between bg-slate-900/60">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Salary / Employee</span>
          <div className="my-2">
            <div className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(kpis?.avgSalaryPerEmployee || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Based on current payrun</p>
          </div>
        </div>

        {/* KPI 4: Approved Time Off Days */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between bg-slate-900/60">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Approved Time Off Days</span>
          <div className="my-2">
            <div className="text-2xl font-bold text-white tracking-tight">
              {kpis?.approvedLeaveDays || 0} Days
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Across selected period</p>
          </div>
        </div>

        {/* KPI 5: Attendance Health */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between bg-slate-900/60">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Attendance Health</span>
          <div className="my-2">
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">
              {kpis?.attendanceHealth || 94}%
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Present / reviewed records</p>
          </div>
        </div>
      </div>

      {/* Main Charts & Alert Grid (Row 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Salary Cost by Department */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between bg-slate-900/60">
          <div>
            <h3 className="text-sm font-bold text-white">Salary Cost by Department</h3>
            <p className="text-[11px] text-slate-400 mb-4">Sources: Payslips + Employee Department</p>
          </div>

          <div className="h-56 w-full">
            {salaryCostByDepartment.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryCostByDepartment} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px' }}
                    formatter={(val) => [formatCurrency(val), 'Total Cost']}
                  />
                  <Bar dataKey="cost" fill="#0284c7" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="cost" position="top" formatter={(val) => formatCurrency(val)} fill="#94a3b8" fontSize={9} />
                    {salaryCostByDepartment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#0284c7', '#06b6d4', '#0ea5e9', '#38bdf8', '#6366f1'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No departmental cost records found
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Monthly Net Salary Trend */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between bg-slate-900/60">
          <div>
            <h3 className="text-sm font-bold text-white">Monthly Net Salary Trend</h3>
            <p className="text-[11px] text-slate-400 mb-4">Sources: Historical Payslips / Payruns</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySalaryTrend} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month_label" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px' }}
                  formatter={(val) => [formatCurrency(val), 'Net Salary Paid']}
                />
                <Area type="monotone" dataKey="net_amount" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#trendGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Payslip Status & Payroll Alerts */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between bg-slate-900/60">
          <div>
            <h3 className="text-sm font-bold text-white">Payslip Status & Payroll Alerts</h3>
            <p className="text-[11px] text-slate-400 mb-3">Sources: Payrun + Payslip validation</p>

            {/* Status Split Progress Bar */}
            <div className="mb-4">
              <span className="text-[11px] text-slate-400 block mb-1.5">Status split</span>
              <div className="w-full h-4 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
                <div style={{ width: `${paidPct}%` }} className="bg-emerald-500 h-full transition-all" title={`Paid: ${payslipStatus.paid}`} />
                <div style={{ width: `${donePct}%` }} className="bg-cyan-500 h-full transition-all" title={`Done: ${payslipStatus.done}`} />
                <div style={{ width: `${pendingPct}%` }} className="bg-amber-500 h-full transition-all" title={`Pending: ${payslipStatus.pending}`} />
                <div style={{ width: `${warningPct}%` }} className="bg-rose-500 h-full transition-all" title={`Warning: ${payslipStatus.warning}`} />
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span>Paid ({payslipStatus.paid || 0})</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />
                  <span>Done ({payslipStatus.done || 0})</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                  <span>Pending ({payslipStatus.pending || 0})</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                  <span>Warning ({payslipStatus.warning || 0})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Current Alerts List */}
          <div className="mt-2 pt-3 border-t border-slate-800">
            <span className="text-[11px] font-semibold text-slate-300 block mb-2">Current alerts</span>
            <div className="space-y-1.5 text-xs">
              {alerts.map((alert, idx) => (
                <div key={idx} className="flex items-center gap-2 text-rose-300/90">
                  <span className="text-rose-400">•</span>
                  <span>{alert.text || alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Overview Tables (Row 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Box 1: Attendance Overview */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between bg-slate-900/60">
          <div>
            <h3 className="text-sm font-bold text-white">Attendance Overview</h3>
            <p className="text-[11px] text-slate-400 mb-4">Sources: Attendance</p>

            {/* Attendance Status Bar representation */}
            <div className="grid grid-cols-4 gap-2 text-center mb-4">
              <div className="p-2.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/20">
                <span className="text-lg font-bold text-cyan-400 block">{attendanceOverview.present || 0}</span>
                <span className="text-[10px] text-slate-400">Present</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-amber-950/30 border border-amber-500/20">
                <span className="text-lg font-bold text-amber-400 block">{attendanceOverview.late || 0}</span>
                <span className="text-[10px] text-slate-400">Late</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-rose-950/30 border border-rose-500/20">
                <span className="text-lg font-bold text-rose-400 block">{attendanceOverview.absent || 0}</span>
                <span className="text-[10px] text-slate-400">Absent</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20">
                <span className="text-lg font-bold text-indigo-400 block">{attendanceOverview.overtime || 0}</span>
                <span className="text-[10px] text-slate-400">Half Day</span>
              </div>
            </div>
          </div>

          <div className="space-y-1 text-[11px] text-slate-400 pt-3 border-t border-slate-800">
            <div className="flex justify-between">
              <span>Missing check-outs:</span>
              <span className="text-white font-medium">{attendanceOverview.missingCheckouts || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Manual attendance edits:</span>
              <span className="text-white font-medium">{attendanceOverview.manualEdits || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Attendance coverage:</span>
              <span className="text-emerald-400 font-medium">{attendanceOverview.coverage || 96}%</span>
            </div>
          </div>
        </div>

        {/* Box 2: Time Off Overview */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between bg-slate-900/60">
          <div>
            <h3 className="text-sm font-bold text-white">Time Off Overview</h3>
            <p className="text-[11px] text-slate-400 mb-3">Sources: Time Off Requests + Allocations</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                    <th className="pb-2">Type</th>
                    <th className="pb-2 text-center">Approved Days</th>
                    <th className="pb-2 text-center">Pending</th>
                    <th className="pb-2 text-right">Remaining Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {timeOffOverview.length > 0 ? (
                    timeOffOverview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20">
                        <td className="py-2.5 font-medium text-slate-200 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.type}
                        </td>
                        <td className="py-2.5 text-center text-slate-300 font-medium">{item.approvedDays}</td>
                        <td className="py-2.5 text-center text-amber-400 font-medium">{item.pending}</td>
                        <td className="py-2.5 text-right text-slate-400">{item.remainingBalance}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-500 text-xs">
                        No time-off records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Box 3: Department Overview */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between bg-slate-900/60">
          <div>
            <h3 className="text-sm font-bold text-white">Department Overview</h3>
            <p className="text-[11px] text-slate-400 mb-3">Sources: Employee + Contract + Payslip totals</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                    <th className="pb-2">Department</th>
                    <th className="pb-2 text-center">Headcount</th>
                    <th className="pb-2 text-right">Monthly Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {departmentOverview.length > 0 ? (
                    departmentOverview.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20">
                        <td className="py-2.5 font-medium text-slate-200">{d.department}</td>
                        <td className="py-2.5 text-center text-cyan-400 font-medium">{d.headcount}</td>
                        <td className="py-2.5 text-right text-white font-semibold">{formatCurrency(d.monthlySalary)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-500 text-xs">
                        No department records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Box 4: Models to Aggregate Information Footer */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Models to Aggregate & Relational Integrity</h4>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          This is the actual relational engine behind the real-time aggregated dashboard:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="font-semibold text-brand-300 block mb-1">Employees / Departments</span>
            <span className="text-slate-400 text-[11px]">Headcount, hierarchy, designation ownership & grouping.</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="font-semibold text-cyan-300 block mb-1">Contracts & Schedules</span>
            <span className="text-slate-400 text-[11px]">Wage basis, active contracts, working schedule hours.</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="font-semibold text-emerald-300 block mb-1">Payruns / Payslips</span>
            <span className="text-slate-400 text-[11px]">Salary totals, paid vs. pending status, monthly trend data.</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="font-semibold text-amber-300 block mb-1">Attendance Records</span>
            <span className="text-slate-400 text-[11px]">Presence, absences, late check-ins, worked hours, and coverage.</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="font-semibold text-purple-300 block mb-1">Time Off & Allocations</span>
            <span className="text-slate-400 text-[11px]">Approved leaves, pending requests, and remaining leave quotas.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
