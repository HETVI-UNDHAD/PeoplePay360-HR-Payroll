-- ==============================================================================
-- PeoplePay360 - Initial Seed Data for Local PostgreSQL
-- Pre-hashed bcrypt passwords for demo accounts:
-- Password: password123 (hash: $2a$10$7Z8q2UqVkWqYtFzH5CjS1.3w2QhOvg9Wv6l9JcM.0iU7Y7sW5vF1G)
-- ==============================================================================

-- 1. COMPANY
INSERT INTO companies (id, name, code, email, phone, website, address, currency, currency_symbol)
VALUES ('comp-001', 'PeoplePay360 Global Technologies Inc.', 'PP360', 'contact@peoplepay360.com', '+1 (555) 019-2834', 'https://peoplepay360.com', '100 Enterprise Way, Suite 400, San Francisco, CA 94105', 'USD', '$')
ON CONFLICT (id) DO NOTHING;

-- 2. ROLES (5 Exact Roles)
INSERT INTO roles (id, name, code, description) VALUES
('role-admin', 'System Administrator', 'ADMIN', 'Full system access, user and role management, master configuration, salary rules, all reports'),
('role-hrmanager', 'HR Manager', 'HR_MANAGER', 'Employee lifecycle management, contracts, schedules, attendance, leave approval, HR reports'),
('role-payrolladmin', 'Payroll Administrator', 'PAYROLL_ADMIN', 'Manage salary structures, salary rules, create/compute/validate/pay pay runs, generate payslips, reports'),
('role-payrolluser', 'Payroll User', 'PAYROLL_USER', 'Process assigned payrolls, compute payroll, view/generate payslips'),
('role-employee', 'Employee', 'EMPLOYEE', 'Self-service portal: view own profile, contract, punch attendance, apply time-off, view/download payslips')
ON CONFLICT (id) DO NOTHING;

-- 3. USERS (Demo accounts for all 5 roles)
-- Hashed password for 'password123': $2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, is_active) VALUES
('usr-admin', 'admin@peoplepay360.com', '$2a$10$sTnBq5myc/cs.WqgCwukleufj/UfywI6MdaBufbMPwkso/Wgarjoa', 'Alexander', 'Wright', '+1 (555) 100-0001', TRUE),
('usr-hrmanager', 'hrmanager@peoplepay360.com', '$2a$10$sTnBq5myc/cs.WqgCwukleufj/UfywI6MdaBufbMPwkso/Wgarjoa', 'Helena', 'Davis', '+1 (555) 100-0002', TRUE),
('usr-payrolladmin', 'payrolladmin@peoplepay360.com', '$2a$10$sTnBq5myc/cs.WqgCwukleufj/UfywI6MdaBufbMPwkso/Wgarjoa', 'Peter', 'Sterling', '+1 (555) 100-0003', TRUE),
('usr-payrolluser', 'payrolluser@peoplepay360.com', '$2a$10$sTnBq5myc/cs.WqgCwukleufj/UfywI6MdaBufbMPwkso/Wgarjoa', 'Pamela', 'Underwood', '+1 (555) 100-0004', TRUE),
('usr-emp-1', 'alex.morgan@peoplepay360.com', '$2a$10$sTnBq5myc/cs.WqgCwukleufj/UfywI6MdaBufbMPwkso/Wgarjoa', 'Alex', 'Morgan', '+1 (555) 200-0001', TRUE),
('usr-emp-2', 'sarah.connor@peoplepay360.com', '$2a$10$sTnBq5myc/cs.WqgCwukleufj/UfywI6MdaBufbMPwkso/Wgarjoa', 'Sarah', 'Connor', '+1 (555) 200-0002', TRUE),
('usr-emp-3', 'david.miller@peoplepay360.com', '$2a$10$sTnBq5myc/cs.WqgCwukleufj/UfywI6MdaBufbMPwkso/Wgarjoa', 'David', 'Miller', '+1 (555) 200-0003', TRUE),
('usr-emp-4', 'emma.watson@peoplepay360.com', '$2a$10$sTnBq5myc/cs.WqgCwukleufj/UfywI6MdaBufbMPwkso/Wgarjoa', 'Emma', 'Watson', '+1 (555) 200-0004', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. USER_ROLES ASSIGNMENTS
INSERT INTO user_roles (id, user_id, role_id) VALUES
('ur-1', 'usr-admin', 'role-admin'),
('ur-2', 'usr-hrmanager', 'role-hrmanager'),
('ur-3', 'usr-payrolladmin', 'role-payrolladmin'),
('ur-4', 'usr-payrolluser', 'role-payrolluser'),
('ur-5', 'usr-emp-1', 'role-employee'),
('ur-6', 'usr-emp-2', 'role-employee'),
('ur-7', 'usr-emp-3', 'role-employee'),
('ur-8', 'usr-emp-4', 'role-employee')
ON CONFLICT (id) DO NOTHING;

-- 5. DEPARTMENTS
INSERT INTO departments (id, company_id, name, code, is_active) VALUES
('dept-eng', 'comp-001', 'Engineering & Product', 'ENG', TRUE),
('dept-hr', 'comp-001', 'Human Resources', 'HR', TRUE),
('dept-fin', 'comp-001', 'Finance & Payroll', 'FIN', TRUE),
('dept-ops', 'comp-001', 'Operations & Facilities', 'OPS', TRUE),
('dept-sales', 'comp-001', 'Sales & Marketing', 'SALES', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 6. DESIGNATIONS
INSERT INTO designations (id, department_id, name, code, description, is_active) VALUES
('desig-se', 'dept-eng', 'Senior Software Engineer', 'SR_SWE', 'Full-stack software engineering and architecture', TRUE),
('desig-fe', 'dept-eng', 'Frontend Engineer', 'FE_DEV', 'UI/UX and Web Application development', TRUE),
('desig-hrm', 'dept-hr', 'HR Manager', 'HR_MGR', 'People operations and talent management', TRUE),
('desig-pa', 'dept-fin', 'Payroll Specialist', 'PAY_SPEC', 'Payroll calculations, compliance and disbursements', TRUE),
('desig-ops', 'dept-ops', 'Operations Lead', 'OPS_LEAD', 'Logistics, office management and facilities', TRUE),
('desig-ae', 'dept-sales', 'Account Executive', 'ACCT_EXEC', 'Enterprise client acquisitions and sales', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 7. WORKING SCHEDULES
INSERT INTO working_schedules (id, company_id, name, timezone, weekly_working_hours, working_days, start_time, end_time, break_hours, is_active) VALUES
('sched-std', 'comp-001', 'Standard Full-Time (40h/week)', 'America/Los_Angeles', 40.00, 'Monday,Tuesday,Wednesday,Thursday,Friday', '09:00:00', '18:00:00', 1.00, TRUE),
('sched-flex', 'comp-001', 'Engineering Flexible (40h/week)', 'America/Los_Angeles', 40.00, 'Monday,Tuesday,Wednesday,Thursday,Friday', '10:00:00', '19:00:00', 1.00, TRUE),
('sched-part', 'comp-001', 'Part-Time Schedule (20h/week)', 'America/Los_Angeles', 20.00, 'Monday,Wednesday,Friday', '09:00:00', '16:00:00', 1.00, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 8. WORKING SCHEDULE DAYS (Standard Schedule)
INSERT INTO working_schedule_days (id, schedule_id, day_of_week, is_working_day, start_time, end_time, break_hours, hours) VALUES
('wsd-1', 'sched-std', 'Monday', TRUE, '09:00:00', '18:00:00', 1.00, 8.00),
('wsd-2', 'sched-std', 'Tuesday', TRUE, '09:00:00', '18:00:00', 1.00, 8.00),
('wsd-3', 'sched-std', 'Wednesday', TRUE, '09:00:00', '18:00:00', 1.00, 8.00),
('wsd-4', 'sched-std', 'Thursday', TRUE, '09:00:00', '18:00:00', 1.00, 8.00),
('wsd-5', 'sched-std', 'Friday', TRUE, '09:00:00', '18:00:00', 1.00, 8.00),
('wsd-6', 'sched-std', 'Saturday', FALSE, '00:00:00', '00:00:00', 0.00, 0.00),
('wsd-7', 'sched-std', 'Sunday', FALSE, '00:00:00', '00:00:00', 0.00, 0.00)
ON CONFLICT (id) DO NOTHING;

-- 9. SALARY STRUCTURES
INSERT INTO salary_structures (id, name, code, type, description, is_active) VALUES
('struct-reg', 'Standard Professional Salary Structure', 'REG_SAL_2026', 'REGULAR', 'Standard monthly salary structure with Basic, HRA, Medical, PF, and Tax rules', TRUE),
('struct-exec', 'Executive Leadership Structure', 'EXEC_SAL_2026', 'EXECUTIVE', 'Executive salary package with Performance Bonus, Special Allowances, and Executive Tax', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 10. SALARY RULES (Sequential Execution Engine)
-- Rule Sequence:
-- 10: BASIC (50% of Wage)
-- 20: HRA (House Rent Allowance, 20% of Basic)
-- 30: TA (Transport Allowance, Fixed $300)
-- 40: MEDICAL (Medical Allowance, Fixed $250)
-- 50: PF (Provident Fund Deduction, 12% of Basic)
-- 60: TAX (Income Tax, Formula: (BASIC + HRA) * 0.08)
-- 70: INS (Health Insurance, Fixed $150)
INSERT INTO salary_rules (id, salary_structure_id, name, code, sequence, category, computation_type, fixed_amount, percentage, base_code, formula, is_active) VALUES
('rule-basic', 'struct-reg', 'Basic Salary', 'BASIC', 10, 'BASIC', 'PERCENTAGE', 0.00, 50.00, 'WAGE', NULL, TRUE),
('rule-hra', 'struct-reg', 'House Rent Allowance (HRA)', 'HRA', 20, 'ALLOWANCE', 'PERCENTAGE', 0.00, 20.00, 'BASIC', NULL, TRUE),
('rule-ta', 'struct-reg', 'Transport Allowance', 'TA', 30, 'ALLOWANCE', 'FIXED', 300.00, 0.00, NULL, NULL, TRUE),
('rule-med', 'struct-reg', 'Medical Allowance', 'MEDICAL', 40, 'ALLOWANCE', 'FIXED', 250.00, 0.00, NULL, NULL, TRUE),
('rule-pf', 'struct-reg', 'Provident Fund (PF)', 'PF', 50, 'DEDUCTION', 'PERCENTAGE', 0.00, 12.00, 'BASIC', NULL, TRUE),
('rule-tax', 'struct-reg', 'Income Tax Withholding', 'TAX', 60, 'DEDUCTION', 'FORMULA', 0.00, 0.00, NULL, '(BASIC + HRA) * 0.08', TRUE),
('rule-ins', 'struct-reg', 'Health Insurance', 'INS', 70, 'DEDUCTION', 'FIXED', 150.00, 0.00, NULL, NULL, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 11. EMPLOYEES
INSERT INTO employees (id, user_id, employee_code, first_name, last_name, email, phone, department_id, designation_id, joining_date, status, profile_image, gender, date_of_birth, address, bank_name, bank_account_number, bank_ifsc_swift, tax_identifier) VALUES
('emp-1', 'usr-emp-1', 'EMP-1001', 'Alex', 'Morgan', 'alex.morgan@peoplepay360.com', '+1 (555) 200-0001', 'dept-eng', 'desig-se', '2024-01-15', 'ACTIVE', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'Female', '1992-06-18', '742 Evergreen Terrace, San Francisco, CA', 'Silicon Valley Bank', 'SVB-99882211', 'SVBUS33SF', 'TAX-US-9912'),
('emp-2', 'usr-emp-2', 'EMP-1002', 'Sarah', 'Connor', 'sarah.connor@peoplepay360.com', '+1 (555) 200-0002', 'dept-eng', 'desig-fe', '2024-03-01', 'ACTIVE', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'Female', '1995-11-22', '124 Conch Street, San Francisco, CA', 'Chase Bank', 'CHS-77334411', 'CHASUS33NY', 'TAX-US-8834'),
('emp-3', 'usr-emp-3', 'EMP-1003', 'David', 'Miller', 'david.miller@peoplepay360.com', '+1 (555) 200-0003', 'dept-fin', 'desig-pa', '2023-08-10', 'ACTIVE', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'Male', '1990-04-12', '456 Elm Street, Oakland, CA', 'Wells Fargo', 'WF-55443322', 'WFBIUS6S', 'TAX-US-7745'),
('emp-4', 'usr-emp-4', 'EMP-1004', 'Emma', 'Watson', 'emma.watson@peoplepay360.com', '+1 (555) 200-0004', 'dept-sales', 'desig-ae', '2024-05-20', 'ACTIVE', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'Female', '1996-09-05', '890 Market St, San Francisco, CA', 'Bank of America', 'BOA-11223344', 'BOFAUS3N', 'TAX-US-6656')
ON CONFLICT (id) DO NOTHING;

-- 12. CONTRACTS (Active contracts linked to salary structure and working schedule)
INSERT INTO contracts (id, employee_id, contract_start_date, contract_end_date, contract_type, salary_structure_id, wage, working_schedule_id, status, notes) VALUES
('cnt-1', 'emp-1', '2024-01-15', NULL, 'PERMANENT', 'struct-reg', 8000.00, 'sched-std', 'ACTIVE', 'Senior full-time software engineering contract'),
('cnt-2', 'emp-2', '2024-03-01', NULL, 'PERMANENT', 'struct-reg', 6500.00, 'sched-std', 'ACTIVE', 'Frontend engineering permanent agreement'),
('cnt-3', 'emp-3', '2023-08-10', NULL, 'PERMANENT', 'struct-reg', 7000.00, 'sched-std', 'ACTIVE', 'Payroll lead financial agreement'),
('cnt-4', 'emp-4', '2024-05-20', NULL, 'PERMANENT', 'struct-reg', 6000.00, 'sched-std', 'ACTIVE', 'Enterprise Sales Account Executive contract')
ON CONFLICT (id) DO NOTHING;

-- 13. TIME-OFF TYPES
INSERT INTO time_off_types (id, company_id, name, code, is_allocation_required, is_approval_required, is_paid, default_days_per_year, color_code, is_active) VALUES
('tot-paid', 'comp-001', 'Paid Time Off / Annual Leave', 'PTO', TRUE, TRUE, TRUE, 15.0, '#3B82F6', TRUE),
('tot-sick', 'comp-001', 'Sick Leave', 'SICK', TRUE, TRUE, TRUE, 10.0, '#10B981', TRUE),
('tot-casual', 'comp-001', 'Casual / Personal Leave', 'CASUAL', TRUE, TRUE, TRUE, 5.0, '#F59E0B', TRUE),
('tot-unpaid', 'comp-001', 'Unpaid Leave', 'UNPAID', FALSE, TRUE, FALSE, 0.0, '#EF4444', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 14. LEAVE ALLOCATIONS (Year 2026)
INSERT INTO leave_allocations (id, employee_id, time_off_type_id, year, allocated_days, used_days, remaining_days, status) VALUES
('alloc-1', 'emp-1', 'tot-paid', 2026, 15.0, 2.0, 13.0, 'ACTIVE'),
('alloc-2', 'emp-1', 'tot-sick', 2026, 10.0, 1.0, 9.0, 'ACTIVE'),
('alloc-3', 'emp-1', 'tot-casual', 2026, 5.0, 0.0, 5.0, 'ACTIVE'),
('alloc-4', 'emp-2', 'tot-paid', 2026, 15.0, 3.0, 12.0, 'ACTIVE'),
('alloc-5', 'emp-2', 'tot-sick', 2026, 10.0, 0.0, 10.0, 'ACTIVE'),
('alloc-6', 'emp-3', 'tot-paid', 2026, 15.0, 1.0, 14.0, 'ACTIVE'),
('alloc-7', 'emp-4', 'tot-paid', 2026, 15.0, 0.0, 15.0, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 15. TIME-OFF REQUESTS
INSERT INTO time_off_requests (id, employee_id, time_off_type_id, from_date, to_date, total_days, reason, status, reviewed_by, review_comments) VALUES
('tor-1', 'emp-1', 'tot-paid', '2026-08-10', '2026-08-11', 2.0, 'Family vacation trip', 'APPROVED', 'usr-hrmanager', 'Approved. Enjoy your time off!'),
('tor-2', 'emp-1', 'tot-sick', '2026-08-25', '2026-08-25', 1.0, 'Doctor appointment and fever', 'APPROVED', 'usr-hrmanager', 'Approved. Rest well.'),
('tor-3', 'emp-2', 'tot-paid', '2026-09-15', '2026-09-17', 3.0, 'Attending developer conference', 'PENDING', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 16. ATTENDANCE SAMPLES
INSERT INTO attendance (id, employee_id, date, check_in, check_out, worked_hours, status, notes) VALUES
('att-1', 'emp-1', '2026-09-01', '2026-09-01 09:02:15', '2026-09-01 18:05:30', 8.05, 'PRESENT', 'On-time standard day'),
('att-2', 'emp-1', '2026-09-02', '2026-09-02 08:58:00', '2026-09-02 18:00:10', 8.03, 'PRESENT', 'On-time'),
('att-3', 'emp-1', '2026-09-03', '2026-09-03 09:25:00', '2026-09-03 18:15:00', 7.83, 'LATE', 'Traffic delay'),
('att-4', 'emp-1', '2026-09-04', '2026-09-04 09:00:00', '2026-09-04 18:00:00', 8.00, 'PRESENT', 'Full working day'),
('att-5', 'emp-2', '2026-09-01', '2026-09-01 09:05:00', '2026-09-01 18:00:00', 7.92, 'PRESENT', 'Regular'),
('att-6', 'emp-2', '2026-09-02', '2026-09-02 09:00:00', '2026-09-02 18:00:00', 8.00, 'PRESENT', 'Regular'),
('att-7', 'emp-3', '2026-09-01', '2026-09-01 08:55:00', '2026-09-01 18:00:00', 8.08, 'PRESENT', 'Regular'),
('att-8', 'emp-4', '2026-09-01', '2026-09-01 09:10:00', '2026-09-01 18:00:00', 7.83, 'PRESENT', 'Regular')
ON CONFLICT (id) DO NOTHING;

-- 17. PAST COMPLETED PAY RUN SAMPLE (August 2026)
INSERT INTO payrolls (id, name, period_start, period_end, salary_structure_id, status, total_gross, total_deductions, total_net, employee_count, created_by, validated_by, paid_at, notes) VALUES
('pr-aug2026', 'August 2026 Regular Pay Run', '2026-08-01', '2026-08-31', 'struct-reg', 'PAID', 23150.00, 3812.00, 19338.00, 3, 'usr-payrolladmin', 'usr-payrolladmin', '2026-08-31 16:30:00', 'August monthly salary disbursement')
ON CONFLICT (id) DO NOTHING;

-- Payroll Employees selected for Aug pay run
INSERT INTO payroll_employees (id, payroll_id, employee_id, contract_id) VALUES
('pe-1', 'pr-aug2026', 'emp-1', 'cnt-1'),
('pe-2', 'pr-aug2026', 'emp-2', 'cnt-2'),
('pe-3', 'pr-aug2026', 'emp-3', 'cnt-3')
ON CONFLICT (id) DO NOTHING;

-- Sample Payslip for emp-1 (Alex Morgan)
-- Wage: 8000
-- BASIC (50%): 4000
-- HRA (20% of Basic): 800
-- TA: 300
-- MEDICAL: 250
-- Gross: 5350
-- PF (12% of Basic): 480
-- TAX ((4000+800)*0.08): 384
-- INS: 150
-- Total Deductions: 1014
-- Net Salary: 4336
INSERT INTO payslips (id, payroll_id, employee_id, contract_id, payslip_number, period_start, period_end, working_days, present_days, paid_leave_days, unpaid_leave_days, wage, gross_salary, total_deductions, net_salary, status) VALUES
('ps-aug-1', 'pr-aug2026', 'emp-1', 'cnt-1', 'PAY-2026-08-001', '2026-08-01', '2026-08-31', 22.0, 20.0, 2.0, 0.0, 8000.00, 5350.00, 1014.00, 4336.00, 'PAID')
ON CONFLICT (id) DO NOTHING;

-- Payslip Lines for emp-1
INSERT INTO payslip_lines (id, payslip_id, salary_rule_id, rule_code, rule_name, category, sequence, computation_type, rate, amount) VALUES
('psl-1', 'ps-aug-1', 'rule-basic', 'BASIC', 'Basic Salary', 'BASIC', 10, 'PERCENTAGE', 50.00, 4000.00),
('psl-2', 'ps-aug-1', 'rule-hra', 'HRA', 'House Rent Allowance (HRA)', 'ALLOWANCE', 20, 'PERCENTAGE', 20.00, 800.00),
('psl-3', 'ps-aug-1', 'rule-ta', 'TA', 'Transport Allowance', 'ALLOWANCE', 30, 'FIXED', 0.00, 300.00),
('psl-4', 'ps-aug-1', 'rule-med', 'MEDICAL', 'Medical Allowance', 'ALLOWANCE', 40, 'FIXED', 0.00, 250.00),
('psl-5', 'ps-aug-1', 'rule-pf', 'PF', 'Provident Fund (PF)', 'DEDUCTION', 50, 'PERCENTAGE', 12.00, 480.00),
('psl-6', 'ps-aug-1', 'rule-tax', 'TAX', 'Income Tax Withholding', 'DEDUCTION', 60, 'FORMULA', 8.00, 384.00),
('psl-7', 'ps-aug-1', 'rule-ins', 'INS', 'Health Insurance', 'DEDUCTION', 70, 'FIXED', 0.00, 150.00)
ON CONFLICT (id) DO NOTHING;

-- Sample Payment record
INSERT INTO payments (id, payroll_id, employee_id, amount, payment_date, payment_method, reference, status, notes) VALUES
('pay-aug-1', 'pr-aug2026', 'emp-1', 4336.00, '2026-08-31', 'BANK_TRANSFER', 'ACH-TXN-20260831-01', 'COMPLETED', 'Direct Bank Deposit to SVB-99882211')
ON CONFLICT (id) DO NOTHING;

-- 18. AUDIT LOGS
INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details, ip_address) VALUES
('log-1', 'usr-admin', 'SYSTEM_INITIALIZATION', 'system', 'sys-001', 'PeoplePay360 System configured and initial master data seeded', '127.0.0.1'),
('log-2', 'usr-payrolladmin', 'PAYROLL_VALIDATED', 'payrolls', 'pr-aug2026', 'August 2026 pay run successfully computed and validated for 3 employees', '127.0.0.1'),
('log-3', 'usr-payrolladmin', 'PAYROLL_PAID', 'payrolls', 'pr-aug2026', 'August 2026 payroll disbursed via direct bank transfer', '127.0.0.1')
ON CONFLICT (id) DO NOTHING;
