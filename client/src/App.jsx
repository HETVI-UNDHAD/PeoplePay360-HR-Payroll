import React, { useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
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
  const { user, loading, notification } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedStructureId, setSelectedStructureId] = useState(null);
  const [preSelectedPayslipId, setPreSelectedPayslipId] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Initializing PeoplePay360 Workspace...</p>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

        {/* Dynamic Page Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && <Dashboard onNavigate={(tab) => setCurrentTab(tab)} />}
            {currentTab === 'employees' && <EmployeePage />}
            {currentTab === 'contracts' && <ContractPage />}
            {currentTab === 'schedules' && <SchedulePage />}
            {currentTab === 'attendance' && <AttendancePage />}
            {currentTab === 'timeoff' && <TimeOffPage />}
            {currentTab === 'allocations' && <TimeOffPage />}
            {currentTab === 'salary-structures' && <SalaryStructuresPage onSelectStructure={handleSelectStructure} />}
            {currentTab === 'salary-rules' && <SalaryRulesPage selectedStructureId={selectedStructureId} />}
            {currentTab === 'payruns' && <PayRunPage onSelectPayslip={handleSelectPayslip} />}
            {currentTab === 'payslips' && <PayslipPage preSelectedPayslipId={preSelectedPayslipId} />}
            {currentTab === 'payments' && <PaymentPage />}
            {currentTab === 'departments' && <DepartmentPage />}
            {currentTab === 'reports' && <ReportsPage />}
            {currentTab === 'users' && <UserManagementPage />}
            {currentTab === 'audit' && <AuditLogsPage />}
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
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
