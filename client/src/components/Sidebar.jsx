import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  CalendarDays,
  Clock,
  PlaneTakeoff,
  Award,
  Calculator,
  Receipt,
  FileSpreadsheet,
  Sliders,
  CreditCard,
  BarChart3,
  UserCheck,
  ShieldCheck,
  ChevronDown,
  Building2
} from 'lucide-react';

export function Sidebar({ currentTab, setCurrentTab }) {
  const { user, isAdmin, isHR, isPayrollAdmin, isPayrollTeam, isEmployee } = useAuth();
  const [payrollExpanded, setPayrollExpanded] = useState(true);

  // Define nav links with role guards
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      show: true
    },
    {
      id: 'employees',
      label: isEmployee ? 'My Profile' : 'Employees',
      icon: Users,
      show: true
    },
    {
      id: 'contracts',
      label: isEmployee ? 'My Contract' : 'Contracts',
      icon: FileText,
      show: true
    },
    {
      id: 'schedules',
      label: 'Working Schedules',
      icon: CalendarDays,
      show: isHR || isAdmin
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: Clock,
      show: true
    },
    {
      id: 'timeoff',
      label: 'Time Off / Leaves',
      icon: PlaneTakeoff,
      show: true
    },
    {
      id: 'allocations',
      label: 'Leave Allocations',
      icon: Award,
      show: isHR || isAdmin
    },
    // Payroll Group
    {
      isGroup: true,
      id: 'payroll_group',
      label: 'Payroll',
      icon: Calculator,
      show: true,
      children: [
        { id: 'payruns', label: 'Pay Runs', icon: Calculator, show: isPayrollTeam },
        { id: 'payslips', label: (isPayrollTeam || isAdmin) ? 'Payslips' : 'My Payslips', icon: Receipt, show: true },
        { id: 'salary-structures', label: 'Salary Structures', icon: FileSpreadsheet, show: isPayrollTeam || isAdmin },
        { id: 'salary-rules', label: 'Salary Rules & Engine', icon: Sliders, show: isPayrollTeam || isAdmin },
      ]
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: CreditCard,
      show: isPayrollTeam || isAdmin
    },
    {
      id: 'departments',
      label: 'Departments',
      icon: Building2,
      show: isHR || isAdmin
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      show: !isEmployee
    },
    {
      id: 'users',
      label: 'Users & Roles',
      icon: UserCheck,
      show: isAdmin
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: ShieldCheck,
      show: isAdmin
    }
  ];

  return (
    <aside className="w-64 bg-surface border-r border-theme flex flex-col h-[calc(100vh-4rem)] sticky top-16 select-none theme-transition">
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems
          .filter(item => item.show)
          .map((item) => {
            if (item.isGroup) {
              const visibleChildren = item.children.filter(c => c.show);
              if (visibleChildren.length === 0) return null;

              const isChildActive = visibleChildren.some(c => c.id === currentTab);

              return (
                <div key={item.id} className="pt-2 pb-1">
                  <button
                    onClick={() => setPayrollExpanded(!payrollExpanded)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors theme-transition ${
                      isChildActive
                        ? 'text-brand-500 bg-brand-500/10'
                        : 'text-secondary hover:text-primary hover:bg-elevated'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="w-4 h-4 text-brand-500" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${payrollExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {payrollExpanded && (
                    <div className="mt-1 pl-4 space-y-1 border-l border-theme ml-4">
                      {visibleChildren.map((child) => {
                        const ChildIcon = child.icon;
                        const active = currentTab === child.id;
                        return (
                          <button
                            key={child.id}
                            onClick={() => setCurrentTab(child.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all theme-transition ${
                              active
                                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 font-semibold'
                                : 'text-secondary hover:text-primary hover:bg-elevated'
                            }`}
                          >
                            <ChildIcon className={`w-4 h-4 ${active ? 'text-white' : 'text-muted'}`} />
                            <span>{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all theme-transition ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 font-semibold'
                    : 'text-secondary hover:text-primary hover:bg-elevated'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-muted'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
      </div>

      {/* Role Footer */}
      <div className="p-3 border-t border-theme bg-surface2 theme-transition">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-elevated border border-theme">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <div className="overflow-hidden">
            <p className="text-[11px] font-bold text-primary truncate">{user?.roleName || user?.role}</p>
            <p className="text-[10px] text-secondary truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
