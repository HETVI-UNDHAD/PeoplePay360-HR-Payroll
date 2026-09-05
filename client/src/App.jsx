import React, { useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { EmployeePage } from './pages/Employees/EmployeePage';
import { ContractPage } from './pages/Contracts/ContractPage';
import { SchedulePage } from './pages/Schedules/SchedulePage';
import { AttendancePage } from './pages/Attendance/AttendancePage';
import { TimeOffPage } from './pages/TimeOff/TimeOffPage';
import { SalaryStructuresPage } from './pages/SalaryRules/SalaryStructuresPage';
import { SalaryRulesPage } from './pages/SalaryRules/SalaryRulesPage';
import { PayRunPage } from './pages/Payroll/PayRunPage';
import { PayslipPage } from './pages/Payslips/PayslipPage';
import { PaymentPage } from './pages/Payments/PaymentPage';
import { DepartmentPage } from './pages/Departments/DepartmentPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { UserManagementPage } from './pages/Users/UserManagementPage';
import { AuditLogsPage } from './pages/AuditLogs/AuditLogsPage';

function MainLayout() {
  const { user, isEmployee, isHR, isAdmin, isPayrollTeam, loading, notification } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedStructureId, setSelectedStructureId] = useState(null);
  const [preSelectedPayslipId, setPreSelectedPayslipId] = useState(null);

  // Strict role guards:
  // 1. Employee only allowed in self-service tabs
  const employeeAllowedTabs = ['dashboard', 'employees', 'contracts', 'attendance', 'timeoff', 'payslips'];
  // 2. HR Manager handles HR modules, but strictly no payroll processing, salary structures, or admin config
  const hrBlockedTabs = ['payruns', 'salary-structures', 'salary-rules', 'payments', 'users', 'audit'];

  let activeTab = currentTab;
  if (isEmployee && !employeeAllowedTabs.includes(currentTab)) {
    activeTab = 'dashboard';
  } else if (user?.role === 'HR_MANAGER' && hrBlockedTabs.includes(currentTab)) {
    activeTab = 'dashboard';
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page text-primary theme-transition">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-secondary font-medium">Initializing PeoplePay360 Workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login />
        <Toast notification={notification} />
      </>
    );
  }

  const handleSelectStructure = (id) => {
    setSelectedStructureId(id);
    setCurrentTab('salary-rules');
  };

  const handleSelectPayslip = (payslipId) => {
    setPreSelectedPayslipId(payslipId);
    setCurrentTab('payslips');
  };

  return (
    <div className="min-h-screen bg-page text-primary flex flex-col font-sans theme-transition">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar currentTab={activeTab} setCurrentTab={setCurrentTab} />

        {/* Dynamic Page Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-page theme-transition">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <Dashboard onNavigate={(tab) => setCurrentTab(tab)} />}
            {activeTab === 'employees' && <EmployeePage />}
            {activeTab === 'contracts' && <ContractPage />}
            {activeTab === 'schedules' && <SchedulePage />}
            {activeTab === 'attendance' && <AttendancePage />}
            {activeTab === 'timeoff' && <TimeOffPage />}
            {activeTab === 'allocations' && <TimeOffPage />}
            {activeTab === 'salary-structures' && <SalaryStructuresPage onSelectStructure={handleSelectStructure} />}
            {activeTab === 'salary-rules' && <SalaryRulesPage selectedStructureId={selectedStructureId} />}
            {activeTab === 'payruns' && <PayRunPage onSelectPayslip={handleSelectPayslip} />}
            {activeTab === 'payslips' && <PayslipPage preSelectedPayslipId={preSelectedPayslipId} />}
            {activeTab === 'payments' && <PaymentPage />}
            {activeTab === 'departments' && <DepartmentPage />}
            {activeTab === 'reports' && <ReportsPage />}
            {activeTab === 'users' && <UserManagementPage />}
            {activeTab === 'audit' && <AuditLogsPage />}
          </div>
        </main>
      </div>

      {/* Global Notifications */}
      <Toast notification={notification} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}
