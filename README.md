# PeoplePay360 - Enterprise HR & Payroll Management System

A complete, production-grade, Odoo-inspired HR & Payroll Management System built with **React.js**, **Node.js + Express.js**, **Local PostgreSQL Database (with auto-migration and resilient in-memory fallback)**, and **JWT Role-Based Access Control (RBAC)** across 5 exact system roles.

---

## 🌟 Key Capabilities & Features

1. **5 Discrete RBAC Roles**:
   - 🛡️ **ADMIN**: User accounts management, role assignments, system-wide configuration, master data, audit logs.
   - 👥 **HR MANAGER**: Employee profiles, contract management, working schedules, attendance review & corrections, time-off requests approval with leave balance deduction.
   - 🧮 **PAYROLL ADMIN**: Salary structures, sequential rule equations, pay run creation with explicit employee selection, compute payroll, validate payroll, mark as paid & disburse, generate payslips.
   - 📑 **PAYROLL USER**: Process assigned payroll, compute payroll, view and generate payslips.
   - 👤 **EMPLOYEE (Self-Service)**: View own profile and contract, biometric check-in / check-out terminal, apply for time-off, view live leave balance, view and print/download official payslip statements as PDF.

2. **Sequential Dynamic Salary Rule Engine**:
   - Execution strictly governed by sequence ordering (10 &rarr; 20 &rarr; 30...).
   - Rule categories: `BASIC`, `ALLOWANCE`, `DEDUCTION`, `NET`.
   - Rule calculation types:
     - `FIXED`: Fixed dollar allowance/deduction.
     - `PERCENTAGE`: Percentage of base rule (e.g., 20% of `BASIC`).
     - `FORMULA`: Safe arithmetic expression parsing (e.g., `(BASIC + HRA) * 0.08`).
   - Integrated live simulator for interactive wage testing.

3. **Complete Pay Run Lifecycle**:
   - **Explicit Employee Selection**: Select individual employees per pay run.
   - **DRAFT** &rarr; **COMPUTED** &rarr; **VALIDATED** &rarr; **PAID**.
   - Contract resolution matching applicable period.
   - Attendance and unpaid leaves factoring.
   - Bank transfer and cash disbursement transaction records generation.

4. **Real-time DB-Calculated Analytics & Reports**:
   - KPI cards calculated from PostgreSQL database records.
   - Monthly net salary trend area charts.
   - Department cost breakdown bar charts.
   - Attendance health and time-off distribution pie charts.
   - Filterable reports suite with CSV export.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL (optional: if PostgreSQL server is running locally, it connects automatically via `DATABASE_URL`; if offline, it seamlessly runs with an in-memory PostgreSQL engine so you can evaluate immediately with zero friction!)

### 2. Backend Setup
```bash
cd server
npm install
npm run db:init   # Migrates schema and loads rich initial seed data
npm start         # Starts backend on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev       # Starts React Vite frontend on http://localhost:5173
```

---

## 🔑 Demo Login Accounts (5 Exact Roles)

All accounts share the default password: `password123`

| Role | Email | Password | Access Highlights |
|---|---|---|---|
| **System Administrator** | `admin@peoplepay360.com` | `password123` | Full access, user creation, role assignment, audit logs |
| **HR Manager** | `hrmanager@peoplepay360.com` | `password123` | Employee management, contracts, leave approvals |
| **Payroll Administrator** | `payrolladmin@peoplepay360.com` | `password123` | Salary structures, rules engine, pay runs, mark paid |
| **Payroll User** | `payrolluser@peoplepay360.com` | `password123` | Process assigned payrolls, compute, payslips |
| **Employee (Alex Morgan)** | `alex.morgan@peoplepay360.com` | `password123` | Self punch in/out, leave application, view own payslips |

> ⚡ **Tip:** You can also use the **1-Click Instant Demo Switcher** in the top navigation bar to test and toggle across all 5 roles instantly!

---

## 🗄️ Database Architecture (PostgreSQL)

- `users`, `roles`, `user_roles`: RBAC authentication and role binding.
- `departments`, `designations`: Organization master structure.
- `employees`: Personnel profiles, manager hierarchy, and bank details.
- `contracts`: Multi-contract history per employee, wage, linked salary structure and working schedule.
- `working_schedules`, `working_schedule_days`: Operating hours, shifts, and break rules.
- `attendance`: Biometric and web punch records (Present, Late, Half Day, Leave).
- `time_off_types`, `leave_allocations`, `time_off_requests`: Leave balances and approval workflow.
- `salary_structures`, `salary_rules`: Sequential computation engine rules.
- `payrolls`, `payroll_employees`: Pay run batches with explicit employee assignments.
- `payslips`, `payslip_lines`: Itemized earnings, deductions, and gross/net calculations.
- `payments`: Disbursed transaction history with reference IDs.
- `audit_logs`: Security and operational audit trail.
