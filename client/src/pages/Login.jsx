import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Calculator,
  ShieldCheck,
  Users,
  UserCheck,
  User,
  ArrowRight,
  Lock,
  Mail,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export function Login() {
  const { login, switchDemoRole, showToast } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    {
      role: 'ADMIN',
      title: 'System Administrator',
      email: 'admin@peoplepay360.com',
      badge: 'Full Access',
      icon: ShieldCheck,
      color: 'hover:border-purple-500/50 hover:bg-purple-950/20 text-purple-400'
    },
    {
      role: 'HR_MANAGER',
      title: 'HR Manager',
      email: 'hrmanager@peoplepay360.com',
      badge: 'Employees & Leaves',
      icon: Users,
      color: 'hover:border-blue-500/50 hover:bg-blue-950/20 text-blue-400'
    },
    {
      role: 'PAYROLL_ADMIN',
      title: 'Payroll Administrator',
      email: 'payrolladmin@peoplepay360.com',
      badge: 'Pay Runs & Rules',
      icon: Calculator,
      color: 'hover:border-emerald-500/50 hover:bg-emerald-950/20 text-emerald-400'
    },
    {
      role: 'PAYROLL_USER',
      title: 'Payroll User',
      email: 'payrolluser@peoplepay360.com',
      badge: 'Compute & Payslips',
      icon: UserCheck,
      color: 'hover:border-amber-500/50 hover:bg-amber-950/20 text-amber-400'
    },
    {
      role: 'EMPLOYEE',
      title: 'Employee (Self-Service)',
      email: 'alex.morgan@peoplepay360.com',
      badge: 'Punch, Leaves, Payslip',
      icon: User,
      color: 'hover:border-cyan-500/50 hover:bg-cyan-950/20 text-cyan-400'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left: Brand & Credentials Form */}
        <div className="lg:col-span-6 glass-panel bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-brand-500/25">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">PeoplePay<span className="text-brand-400">360</span></h2>
              <p className="text-xs text-slate-400">Production HR & Payroll System</p>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="admin@peoplepay360.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500">
              Default password for all seeded accounts is <code className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">password123</code>
            </p>
          </div>
        </div>

        {/* Right: 1-Click Fast Role Switcher for Hackathon Evaluation */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Instant 1-Click Evaluation</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Test and evaluate the exact 5 RBAC roles with pre-configured access permissions:
          </p>

          <div className="space-y-2.5">
            {demoAccounts.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.role}
                  onClick={() => switchDemoRole(item.role)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 transition-all text-left group ${item.color}`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-slate-800/80 group-hover:bg-slate-800 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white group-hover:text-brand-300">{item.title}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{item.email}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
