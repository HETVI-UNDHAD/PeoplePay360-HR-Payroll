const API_BASE = '/api';

// Helper to make API requests with JWT Auth
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('peoplepay360_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => request('/auth/me'),
  switchDemoRole: (roleCode) => request('/auth/demo-switch', { method: 'POST', body: JSON.stringify({ roleCode }) }),

  // Users & Roles
  getUsers: () => request('/users'),
  getRoles: () => request('/users/roles'),
  createUser: (userData) => request('/users', { method: 'POST', body: JSON.stringify(userData) }),
  updateUser: (id, userData) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) }),

  // Departments & Designations
  getDepartments: () => request('/departments'),
  createDepartment: (data) => request('/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id, data) => request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getDesignations: () => request('/departments/designations/all'),
  createDesignation: (data) => request('/departments/designations', { method: 'POST', body: JSON.stringify(data) }),

  // Employees
  getEmployees: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/employees${qs ? `?${qs}` : ''}`);
  },
  getEmployeeDetails: (id) => request(`/employees/${id}`),
  createEmployee: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),

  // Contracts
  getContracts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/contracts${qs ? `?${qs}` : ''}`);
  },
  createContract: (data) => request('/contracts', { method: 'POST', body: JSON.stringify(data) }),
  updateContract: (id, data) => request(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Working Schedules
  getSchedules: () => request('/schedules'),
  getScheduleDetails: (id) => request(`/schedules/${id}`),
  createSchedule: (data) => request('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (id, data) => request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Attendance
  getTodayAttendance: () => request('/attendance/today'),
  checkIn: (notes = '') => request('/attendance/check-in', { method: 'POST', body: JSON.stringify({ notes }) }),
  checkOut: () => request('/attendance/check-out', { method: 'POST' }),
  getAttendance: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/attendance${qs ? `?${qs}` : ''}`);
  },
  createAttendance: (data) => request('/attendance', { method: 'POST', body: JSON.stringify(data) }),
  updateAttendance: (id, data) => request(`/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Time-Off & Leave Allocations
  getTimeOffTypes: () => request('/timeoff/types'),
  getAllocations: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/timeoff/allocations${qs ? `?${qs}` : ''}`);
  },
  updateAllocation: (data) => request('/timeoff/allocations', { method: 'POST', body: JSON.stringify(data) }),
  getTimeOffRequests: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/timeoff/requests${qs ? `?${qs}` : ''}`);
  },
  applyTimeOff: (data) => request('/timeoff/requests', { method: 'POST', body: JSON.stringify(data) }),
  reviewTimeOff: (id, action, comment = '') => request(`/timeoff/requests/${id}/action`, {
    method: 'POST',
    body: JSON.stringify({ action, comment })
  }),

  // Salary Structures & Rules Engine
  getSalaryStructures: () => request('/salary/structures'),
  getSalaryStructureDetails: (id) => request(`/salary/structures/${id}`),
  createSalaryStructure: (data) => request('/salary/structures', { method: 'POST', body: JSON.stringify(data) }),
  updateSalaryStructure: (id, data) => request(`/salary/structures/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSalaryStructure: (id) => request(`/salary/structures/${id}`, { method: 'DELETE' }),
  createSalaryRule: (data) => request('/salary/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateSalaryRule: (id, data) => request(`/salary/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSalaryRule: (id) => request(`/salary/rules/${id}`, { method: 'DELETE' }),
  testSalaryEngine: (data) => request('/salary/test-engine', { method: 'POST', body: JSON.stringify(data) }),

  // Pay Runs (Payroll Lifecycle: Draft -> Compute -> Validate -> Mark Paid)
  getPayRuns: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/payroll/payruns${qs ? `?${qs}` : ''}`);
  },
  getPayRunDetails: (id) => request(`/payroll/payruns/${id}`),
  createPayRun: (data) => request('/payroll/payruns', { method: 'POST', body: JSON.stringify(data) }),
  updatePayRun: (id, data) => request(`/payroll/payruns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  computePayRun: (id) => request(`/payroll/payruns/${id}/compute`, { method: 'POST' }),
  validatePayRun: (id) => request(`/payroll/payruns/${id}/validate`, { method: 'POST' }),
  markPayRunPaid: (id, paymentData = {}) => request(`/payroll/payruns/${id}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify(paymentData)
  }),

  // Payslips
  getPayslips: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/payslips${qs ? `?${qs}` : ''}`);
  },
  getPayslipDetails: (id) => request(`/payslips/${id}`),
  createPayslip: (data) => request('/payslips', { method: 'POST', body: JSON.stringify(data) }),
  updatePayslip: (id, data) => request(`/payslips/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Payments
  getPayments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/payments${qs ? `?${qs}` : ''}`);
  },

  // Dashboard Analytics
  getDashboardStats: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/dashboard/stats${qs ? `?${qs}` : ''}`);
  },

  // Reports
  getEmployeeReport: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/employees${qs ? `?${qs}` : ''}`);
  },
  getAttendanceReport: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/attendance${qs ? `?${qs}` : ''}`);
  },
  getTimeOffReport: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/timeoff${qs ? `?${qs}` : ''}`);
  },
  getPayrollSummaryReport: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/payroll-summary${qs ? `?${qs}` : ''}`);
  },
  getTaxReport: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/tax-deductions${qs ? `?${qs}` : ''}`);
  },
  getDepartmentCostsReport: () => request('/reports/department-costs'),

  // Audit Logs
  getAuditLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/audit${qs ? `?${qs}` : ''}`);
  }
};
