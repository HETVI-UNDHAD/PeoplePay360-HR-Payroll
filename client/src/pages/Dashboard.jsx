import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
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
  Download
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
  Legend
} from 'recharts';

export function Dashboard({ onNavigate }) {
  const { user, isEmployee, isPayrollTeam, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
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
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading database analytics...</p>
        </div>
      </div>
    );
  }

  // 1. Employee Dashboard View
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

        {/* Employee KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Latest Net Salary"
            value={latestPayslip ? `$${parseFloat(latestPayslip.net_salary).toLocaleString()}` : '$0'}
            subtitle={latestPayslip ? `Period: ${latestPayslip.period_start} to ${latestPayslip.period_end}` : 'No payslip yet'}
            icon={DollarSign}
            color="emerald"
          />
          <StatCard
            title="YTD Total Net Disbursed"
            value={`$${parseFloat(ytdEarnings?.ytd_net || 0).toLocaleString()}`}
            subtitle={`${ytdEarnings?.total_payslips || 0} payslip(s) generated`}
            icon={TrendingUp}
            color="brand"
          />
          <StatCard
            title="Present Days This Month"
            value={`${monthlyAttendance?.present_days || 0} Days`}
            subtitle={`${monthlyAttendance?.late_days || 0} late check-in(s)`}
            icon={Clock}
            color="purple"
          />
          <StatCard
            title="Annual Paid Leave Left"
            value={`${leaveBalances[0]?.remaining_days || 0} Days`}
            subtitle={`Allocated: ${leaveBalances[0]?.allocated_days || 0} Days`}
            icon={Award}
            color="amber"
          />
        </div>

        {/* Leave Balances Grid */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-400" />
            My Leave Allocations & Balances ({new Date().getFullYear()})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {leaveBalances.map((item) => (
              <div key={item.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">{item.leave_name}</span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color_code || '#3B82F6' }} />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-bold text-white">{item.remaining_days}</span>
                    <span className="text-xs text-slate-400 ml-1">days left</span>
                  </div>
                  <span className="text-xs text-slate-500">Used: {item.used_days}/{item.allocated_days}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. Admin / HR / Payroll Manager Comprehensive Dashboard
  const { kpis, payrollStatus = [], salaryCostByDepartment = [], monthlySalaryTrend = [], attendanceBreakdown = [], timeOffBreakdown = [], alerts = [] } = data || {};

  const COLORS = ['#0e8fe6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Executive Payroll & HR Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time organizational analytics computed directly from database records.</p>
        </div>
        <div className="flex items-center gap-3">
          {(isPayrollTeam || isAdmin) && (
            <button
              onClick={() => onNavigate('payruns')}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Process Pay Run
            </button>
          )}
          {user?.role === 'HR_MANAGER' && (
            <button
              onClick={() => onNavigate('employees')}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Manage Employees
            </button>
          )}
          <button
            onClick={() => onNavigate('reports')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            View Reports
          </button>
        </div>
      </div>

      {/* Payroll Alerts if any */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alt, idx) => (
            <div key={idx} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <strong className="font-semibold">{alt.title}:</strong> {alt.message}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Net Salary"
          value={`$${kpis?.totalNetSalary?.toLocaleString()}`}
          subtitle="Paid disbursements"
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Total Payslips"
          value={kpis?.totalPayslips || 0}
          subtitle="Paid payslips count"
          icon={Receipt}
          color="brand"
        />
        <StatCard
          title="Avg Salary / Employee"
          value={`$${Math.round(kpis?.avgSalaryPerEmployee || 0).toLocaleString()}`}
          subtitle="Net average monthly"
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Active Employees"
          value={kpis?.totalEmployees || 0}
          subtitle={`${kpis?.activeContractsCount || 0} active contracts`}
          icon={Users}
          color="brand"
        />
        <StatCard
          title="Attendance Health"
          value={`${kpis?.attendanceHealth || 100}%`}
          subtitle="On-time punch rate"
          icon={Activity}
          color="emerald"
        />
        <StatCard
          title="Approved Leaves"
          value={`${kpis?.approvedLeaveDays || 0} Days`}
          subtitle="Approved this year"
          icon={CalendarCheck}
          color="amber"
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Monthly Net Salary Trend (8 Cols) */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Monthly Net Salary Trend</h3>
              <p className="text-xs text-slate-400">Total gross, deductions and net salary disbursements over time</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-brand-400 border border-slate-700">
              Live DB Aggregates
            </span>
          </div>

          <div className="h-72 w-full">
            {monthlySalaryTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySalaryTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0e8fe6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0e8fe6" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="month_label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val) => [`$${parseFloat(val).toLocaleString()}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="gross_amount" name="Gross Salary" stroke="#10B981" fillOpacity={1} fill="url(#colorGross)" />
                  <Area type="monotone" dataKey="net_amount" name="Net Disbursed" stroke="#0e8fe6" strokeWidth={2} fillOpacity={1} fill="url(#colorNet)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                No historical pay runs recorded yet. Process a pay run to see monthly trends.
              </div>
            )}
          </div>
        </div>

        {/* Salary Cost by Department (4 Cols) */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-3xl border border-slate-800">
          <div className="mb-4">
            <h3 className="text-base font-bold text-white">Salary Cost by Department</h3>
            <p className="text-xs text-slate-400">Total monthly payroll expenditure</p>
          </div>

          <div className="h-72 w-full">
            {salaryCostByDepartment.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryCostByDepartment} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(v) => `$${v / 1000}k`} />
                  <YAxis dataKey="department_name" type="category" stroke="#94a3b8" fontSize={10} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val) => [`$${parseFloat(val).toLocaleString()}`, 'Total Cost']}
                  />
                  <Bar dataKey="total_cost" fill="#0e8fe6" radius={[0, 8, 8, 0]}>
                    {salaryCostByDepartment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                No department cost records available.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Secondary Row: Attendance Breakdown & Time Off Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Attendance Breakdown */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1">Attendance Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Punched statuses across all employees</p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceBreakdown}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {attendanceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time-Off Breakdown */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1">Time-Off by Category</h3>
          <p className="text-xs text-slate-400 mb-4">Approved leave days distribution</p>
          <div className="space-y-3 mt-4">
            {timeOffBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color_code || '#0e8fe6' }} />
                  <span className="text-xs font-semibold text-slate-200">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-white">{item.total_days}</span>
                  <span className="text-[11px] text-slate-400 ml-1">days ({item.request_count} reqs)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pay Run Status Distribution */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1">Pay Run Pipelines</h3>
          <p className="text-xs text-slate-400 mb-4">Current lifecycle stages</p>
          <div className="space-y-2.5 mt-4">
            {['DRAFT', 'COMPUTED', 'VALIDATED', 'PAID'].map((status) => {
              const match = payrollStatus.find(s => s.status === status) || { count: 0, total_amount: 0 };
              return (
                <div key={status} className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                  <StatusBadge status={status} />
                  <div className="text-right">
                    <span className="text-xs font-bold text-white">{match.count} pay runs</span>
                    <p className="text-[10px] text-slate-400">${parseFloat(match.total_amount || 0).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
