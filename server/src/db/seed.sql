-- ==============================================================================
-- PeoplePay360 - Clean Dynamic Seed Data
-- Only Master Configuration & Admin User (Ready for 100% Dynamic User Input)
-- Default Admin: admin@peoplepay360.com / password123
-- ==============================================================================

-- 1. COMPANY MASTER
INSERT INTO companies (id, name, code, email, phone, website, address, currency, currency_symbol)
VALUES ('comp-001', 'PeoplePay360 Global Technologies Inc.', 'PP360', 'contact@peoplepay360.com', '+1 (555) 019-2834', 'https://peoplepay360.com', '100 Enterprise Way, Suite 400, San Francisco, CA 94105', 'USD', '$')
ON CONFLICT (id) DO NOTHING;

-- 2. SYSTEM ROLES (5 Exact Roles)
INSERT INTO roles (id, name, code, description) VALUES
('role-admin', 'System Administrator', 'ADMIN', 'Full system access, user and role management, master configuration, salary rules, all reports'),
('role-hrmanager', 'HR Manager', 'HR_MANAGER', 'Employee lifecycle management, contracts, schedules, attendance, leave approval, HR reports'),
('role-payrolladmin', 'Payroll Administrator', 'PAYROLL_ADMIN', 'Manage salary structures, salary rules, create/compute/validate/pay pay runs, generate payslips, reports'),
('role-payrolluser', 'Payroll User', 'PAYROLL_USER', 'Process assigned payrolls, compute payroll, view/generate payslips'),
('role-employee', 'Employee', 'EMPLOYEE', 'Self-service portal: view own profile, contract, punch attendance, apply time-off, view/download payslips')
ON CONFLICT (id) DO NOTHING;

-- 3. SYSTEM ADMIN USER (password: password123)
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, is_active) VALUES
('usr-admin', 'admin@peoplepay360.com', '$2a$10$sTnBq5myc/cs.WqgCwukleufj/UfywI6MdaBufbMPwkso/Wgarjoa', 'Alexander', 'Wright', '+1 (555) 100-0001', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. ASSIGN ADMIN ROLE
INSERT INTO user_roles (id, user_id, role_id) VALUES
('ur-1', 'usr-admin', 'role-admin')
ON CONFLICT (id) DO NOTHING;

-- 5. TIME-OFF TYPES MASTER
INSERT INTO time_off_types (id, company_id, name, code, is_allocation_required, is_approval_required, is_paid, default_days_per_year, color_code, is_active) VALUES
('tot-paid', 'comp-001', 'Paid Time Off / Annual Leave', 'PTO', TRUE, TRUE, TRUE, 15.0, '#3B82F6', TRUE),
('tot-sick', 'comp-001', 'Sick Leave', 'SICK', TRUE, TRUE, TRUE, 10.0, '#10B981', TRUE),
('tot-casual', 'comp-001', 'Casual / Personal Leave', 'CASUAL', TRUE, TRUE, TRUE, 5.0, '#F59E0B', TRUE),
('tot-unpaid', 'comp-001', 'Unpaid Leave', 'UNPAID', FALSE, TRUE, FALSE, 0.0, '#EF4444', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 6. DEFAULT WORKING SCHEDULE
INSERT INTO working_schedules (id, company_id, name, timezone, weekly_working_hours, working_days, start_time, end_time, break_hours, is_active) VALUES
('sched-std', 'comp-001', 'Standard Full-Time (40h/week)', 'America/Los_Angeles', 40.00, 'Monday,Tuesday,Wednesday,Thursday,Friday', '09:00:00', '18:00:00', 1.00, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 7. WORKING SCHEDULE DAYS
INSERT INTO working_schedule_days (id, schedule_id, day_of_week, is_working_day, start_time, end_time, break_hours, hours) VALUES
('wsd-1', 'sched-std', 'Monday', TRUE, '09:00:00', '18:00:00', 1.00, 8.00),
('wsd-2', 'sched-std', 'Tuesday', TRUE, '09:00:00', '18:00:00', 1.00, 8.00),
('wsd-3', 'sched-std', 'Wednesday', TRUE, '09:00:00', '18:00:00', 1.00, 8.00),
('wsd-4', 'sched-std', 'Thursday', TRUE, '09:00:00', '18:00:00', 1.00, 8.00),
('wsd-5', 'sched-std', 'Friday', TRUE, '09:00:00', '18:00:00', 1.00, 8.00),
('wsd-6', 'sched-std', 'Saturday', FALSE, '00:00:00', '00:00:00', 0.00, 0.00),
('wsd-7', 'sched-std', 'Sunday', FALSE, '00:00:00', '00:00:00', 0.00, 0.00)
ON CONFLICT (id) DO NOTHING;

-- 8. INITIAL SALARY STRUCTURE TEMPLATE
INSERT INTO salary_structures (id, name, code, type, description, is_active) VALUES
('struct-reg', 'Standard Professional Salary Structure', 'REG_SAL_2026', 'REGULAR', 'Standard monthly salary structure with Basic, Allowances, PF, and Tax rules', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 9. INITIAL SALARY RULES
INSERT INTO salary_rules (id, salary_structure_id, name, code, sequence, category, computation_type, fixed_amount, percentage, base_code, formula, is_active) VALUES
('rule-basic', 'struct-reg', 'Basic Salary', 'BASIC', 10, 'BASIC', 'PERCENTAGE', 0.00, 50.00, 'WAGE', NULL, TRUE),
('rule-hra', 'struct-reg', 'House Rent Allowance (HRA)', 'HRA', 20, 'ALLOWANCE', 'PERCENTAGE', 0.00, 20.00, 'BASIC', NULL, TRUE),
('rule-ta', 'struct-reg', 'Transport Allowance', 'TA', 30, 'ALLOWANCE', 'FIXED', 300.00, 0.00, NULL, NULL, TRUE),
('rule-pf', 'struct-reg', 'Provident Fund (PF)', 'PF', 50, 'DEDUCTION', 'PERCENTAGE', 0.00, 12.00, 'BASIC', NULL, TRUE),
('rule-tax', 'struct-reg', 'Income Tax Withholding', 'TAX', 60, 'DEDUCTION', 'FORMULA', 0.00, 0.00, NULL, '(BASIC + HRA) * 0.08', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 10. SYSTEM AUDIT LOG
INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details, ip_address) VALUES
('log-1', 'usr-admin', 'SYSTEM_INITIALIZATION', 'system', 'sys-001', 'PeoplePay360 System configured for dynamic production data', '127.0.0.1')
ON CONFLICT (id) DO NOTHING;
