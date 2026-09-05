-- ==============================================================================
-- PeoplePay360 - Production HR & Payroll Management System
-- Database Schema (PostgreSQL DDL)
-- ==============================================================================


-- 1. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    address TEXT,
    currency VARCHAR(10) DEFAULT 'USD',
    currency_symbol VARCHAR(10) DEFAULT '$',
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ROLES TABLE (5 Exact Roles)
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL, -- 'ADMIN', 'HR_MANAGER', 'PAYROLL_ADMIN', 'PAYROLL_USER', 'EMPLOYEE'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. USER_ROLES TABLE
CREATE TABLE IF NOT EXISTS user_roles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(36) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, role_id)
);

-- 5. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    manager_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. DESIGNATIONS TABLE
CREATE TABLE IF NOT EXISTS designations (
    id VARCHAR(36) PRIMARY KEY,
    department_id VARCHAR(36) REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. WORKING SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS working_schedules (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    timezone VARCHAR(100) DEFAULT 'UTC',
    weekly_working_hours NUMERIC(5, 2) DEFAULT 40.00,
    working_days VARCHAR(100) DEFAULT 'Monday,Tuesday,Wednesday,Thursday,Friday',
    start_time VARCHAR(10) DEFAULT '09:00:00',
    end_time VARCHAR(10) DEFAULT '18:00:00',
    break_hours NUMERIC(4, 2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. WORKING SCHEDULE DAYS
CREATE TABLE IF NOT EXISTS working_schedule_days (
    id VARCHAR(36) PRIMARY KEY,
    schedule_id VARCHAR(36) NOT NULL REFERENCES working_schedules(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL,
    is_working_day BOOLEAN DEFAULT TRUE,
    start_time VARCHAR(10) DEFAULT '09:00:00',
    end_time VARCHAR(10) DEFAULT '18:00:00',
    break_hours NUMERIC(4, 2) DEFAULT 1.00,
    hours NUMERIC(4, 2) DEFAULT 8.00
);

-- 9. SALARY STRUCTURES TABLE
CREATE TABLE IF NOT EXISTS salary_structures (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) DEFAULT 'REGULAR', -- 'REGULAR', 'EXECUTIVE', 'CONTRACTOR', 'INTERN'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. SALARY RULES TABLE (Sequential calculation)
CREATE TABLE IF NOT EXISTS salary_rules (
    id VARCHAR(36) PRIMARY KEY,
    salary_structure_id VARCHAR(36) NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    sequence INTEGER NOT NULL DEFAULT 10,
    category VARCHAR(50) NOT NULL, -- 'BASIC', 'ALLOWANCE', 'DEDUCTION', 'NET'
    computation_type VARCHAR(50) NOT NULL, -- 'FIXED', 'PERCENTAGE', 'FORMULA'
    fixed_amount NUMERIC(12, 2) DEFAULT 0.00,
    percentage NUMERIC(5, 2) DEFAULT 0.00,
    base_code VARCHAR(50) DEFAULT 'BASIC',
    formula TEXT,
    condition TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (salary_structure_id, code)
);

-- 11. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    department_id VARCHAR(36) REFERENCES departments(id) ON DELETE SET NULL,
    designation_id VARCHAR(36) REFERENCES designations(id) ON DELETE SET NULL,
    manager_id VARCHAR(36) REFERENCES employees(id) ON DELETE SET NULL,
    joining_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'ON_LEAVE', 'PROBATION', 'TERMINATED'
    profile_image TEXT,
    gender VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(100),
    bank_ifsc_swift VARCHAR(50),
    tax_identifier VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. CONTRACTS TABLE (One employee can have multiple contracts over time)
CREATE TABLE IF NOT EXISTS contracts (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    contract_start_date DATE NOT NULL,
    contract_end_date DATE,
    contract_type VARCHAR(50) DEFAULT 'PERMANENT', -- 'PERMANENT', 'PROBATION', 'TEMPORARY', 'CONSULTANT'
    salary_structure_id VARCHAR(36) NOT NULL REFERENCES salary_structures(id),
    wage NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    working_schedule_id VARCHAR(36) NOT NULL REFERENCES working_schedules(id),
    status VARCHAR(50) DEFAULT 'ACTIVE', -- 'DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    worked_hours NUMERIC(5, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'PRESENT', -- 'PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'LEAVE'
    notes TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, date)
);

-- 14. TIME-OFF TYPES TABLE
CREATE TABLE IF NOT EXISTS time_off_types (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    is_allocation_required BOOLEAN DEFAULT TRUE,
    is_approval_required BOOLEAN DEFAULT TRUE,
    is_paid BOOLEAN DEFAULT TRUE,
    default_days_per_year NUMERIC(4, 1) DEFAULT 12.0,
    color_code VARCHAR(20) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. LEAVE ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS leave_allocations (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    time_off_type_id VARCHAR(36) NOT NULL REFERENCES time_off_types(id) ON DELETE CASCADE,
    year INTEGER NOT NULL DEFAULT 2026,
    allocated_days NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    used_days NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    remaining_days NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, time_off_type_id, year)
);

-- 16. TIME-OFF REQUESTS TABLE
CREATE TABLE IF NOT EXISTS time_off_requests (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    time_off_type_id VARCHAR(36) NOT NULL REFERENCES time_off_types(id) ON DELETE RESTRICT,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    total_days NUMERIC(4, 1) NOT NULL DEFAULT 1.0,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
    reviewed_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    review_comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. PAYROLLS (PAY RUNS) TABLE
CREATE TABLE IF NOT EXISTS payrolls (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    salary_structure_id VARCHAR(36) REFERENCES salary_structures(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'COMPUTED', 'VALIDATED', 'PAID'
    total_gross NUMERIC(14, 2) DEFAULT 0.00,
    total_deductions NUMERIC(14, 2) DEFAULT 0.00,
    total_net NUMERIC(14, 2) DEFAULT 0.00,
    employee_count INTEGER DEFAULT 0,
    created_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    validated_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    validated_at TIMESTAMP,
    paid_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. PAYROLL EMPLOYEES TABLE (Selected employees for this pay run)
CREATE TABLE IF NOT EXISTS payroll_employees (
    id VARCHAR(36) PRIMARY KEY,
    payroll_id VARCHAR(36) NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    contract_id VARCHAR(36) REFERENCES contracts(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (payroll_id, employee_id)
);

-- 19. PAYSLIPS TABLE
CREATE TABLE IF NOT EXISTS payslips (
    id VARCHAR(36) PRIMARY KEY,
    payroll_id VARCHAR(36) NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    contract_id VARCHAR(36) NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    payslip_number VARCHAR(100) UNIQUE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    working_days NUMERIC(4, 1) DEFAULT 22.0,
    present_days NUMERIC(4, 1) DEFAULT 22.0,
    paid_leave_days NUMERIC(4, 1) DEFAULT 0.0,
    unpaid_leave_days NUMERIC(4, 1) DEFAULT 0.0,
    wage NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gross_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'COMPUTED', 'VALIDATED', 'PAID'
    pdf_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (payroll_id, employee_id)
);

-- 20. PAYSLIP LINES TABLE
CREATE TABLE IF NOT EXISTS payslip_lines (
    id VARCHAR(36) PRIMARY KEY,
    payslip_id VARCHAR(36) NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
    salary_rule_id VARCHAR(36) REFERENCES salary_rules(id) ON DELETE SET NULL,
    rule_code VARCHAR(50) NOT NULL,
    rule_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'BASIC', 'ALLOWANCE', 'DEDUCTION', 'NET'
    sequence INTEGER NOT NULL DEFAULT 10,
    computation_type VARCHAR(50) NOT NULL,
    rate NUMERIC(6, 2) DEFAULT 0.00,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 21. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    payroll_id VARCHAR(36) NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'BANK_TRANSFER', -- 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'ONLINE'
    reference VARCHAR(150),
    status VARCHAR(50) DEFAULT 'COMPLETED',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 22. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
