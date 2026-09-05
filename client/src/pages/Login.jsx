import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Calculator,
  ShieldCheck,
  Users,
  UserCheck,
  User,
  ArrowRight,
  Lock,
  Mail,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
// Login page with 1-click role switcher for hackathon evaluation
export function Login() {
  const { login, switchDemoRole, showToast } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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
      color: 'hover:border-purple-500/50 dark:hover:bg-purple-950/20 hover:bg-purple-50 text-purple-500'
    },
    {
      role: 'HR_MANAGER',
      title: 'HR Manager',
      email: 'hrmanager@peoplepay360.com',
      badge: 'Employees & Leaves',
      icon: Users,
      color: 'hover:border-blue-500/50 dark:hover:bg-blue-950/20 hover:bg-blue-50 text-blue-500'
    },
    {
      role: 'PAYROLL_ADMIN',
      title: 'Payroll Administrator',
      email: 'payrolladmin@peoplepay360.com',
      badge: 'Pay Runs & Rules',
      icon: Calculator,
      color: 'hover:border-emerald-500/50 dark:hover:bg-emerald-950/20 hover:bg-emerald-50 text-emerald-500'
    },
    {
      role: 'PAYROLL_USER',
      title: 'Payroll User',
      email: 'payrolluser@peoplepay360.com',
      badge: 'Compute & Payslips',
      icon: UserCheck,
      color: 'hover:border-amber-500/50 dark:hover:bg-amber-950/20 hover:bg-amber-50 text-amber-500'
    },
    {
      role: 'EMPLOYEE',
      title: 'Employee (Self-Service)',
      email: 'alex.morgan@peoplepay360.com',
      badge: 'Punch, Leaves, Payslip',
      icon: User,
      color: 'hover:border-cyan-500/50 dark:hover:bg-cyan-950/20 hover:bg-cyan-50 text-cyan-500'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-page theme-transition relative">
      {/* Decorative gradient background (dark mode only) */}
      <div className="pointer-events-none absolute inset-0 dark:bg-[radial-gradient(ellipse_at_top,_#0f1f3d_0%,_#020617_60%)] bg-gradient-to-br from-blue-50 via-white to-slate-100" />

      {/* Theme toggle on login page */}
      <button
        id="login-theme-toggle-btn"
        onClick={toggleTheme}
        className="absolute top-5 right-5 p-2.5 rounded-xl border border-theme bg-surface hover:bg-elevated text-secondary hover:text-primary transition-all theme-transition z-10"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-brand-500" />}
      </button>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left: Brand & Credentials Form */}
        <div className="lg:col-span-6 glass-panel bg-surface border border-theme rounded-3xl p-8 shadow-2xl theme-transition">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-brand-500/25">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary tracking-tight">PeoplePay<span className="text-brand-500">360</span></h2>
              <p className="text-xs text-secondary">Production HR & Payroll System</p>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="admin@peoplepay360.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-elevated border border-theme rounded-xl pl-10 pr-4 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all theme-transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-elevated border border-theme rounded-xl pl-10 pr-4 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all theme-transition"
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

          <div className="mt-6 pt-6 border-t border-theme text-center">
            <p className="text-xs text-muted">
              Default password for all seeded accounts is <code className="text-primary bg-elevated px-1.5 py-0.5 rounded border border-theme">password123</code>
            </p>
          </div>
        </div>

        {/* Right: 1-Click Fast Role Switcher for Hackathon Evaluation */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-primary">Instant 1-Click Evaluation</h3>
          </div>
          <p className="text-xs text-secondary mb-4">
            Test and evaluate the exact 5 RBAC roles with pre-configured access permissions:
          </p>

          <div className="space-y-2.5">
            {demoAccounts.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.role}
                  onClick={() => switchDemoRole(item.role)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl glass-panel bg-surface border border-theme transition-all text-left group ${item.color} theme-transition`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-elevated group-hover:bg-hover transition-colors theme-transition">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary group-hover:text-brand-500 transition-colors">{item.title}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-elevated text-secondary border border-theme">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">{item.email}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted group-hover:text-brand-500 transition-all transform group-hover:translate-x-1" />
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
