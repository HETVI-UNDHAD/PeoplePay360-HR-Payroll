const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');

router.use(authenticate);

// GET /api/dashboard/stats - Fetch dynamic KPIs and visual metrics from DB
router.get('/stats', async (req, res) => {
  try {
    const { department_id, year } = req.query;
    const userRole = req.user.role;
    const userEmpId = req.user.employeeId;
    const currentYear = parseInt(year, 10) || new Date().getFullYear();

    // 1. Employee Dashboard (Self-service metrics if role is EMPLOYEE)
    if (userRole === ROLES.EMPLOYEE) {
      if (!userEmpId) {
        return res.json({ success: true, isEmployee: true, stats: {} });
      }

      // Latest payslip
      const lastPayslip = await query(
        `SELECT ps.*, p.name as payroll_name 
         FROM payslips ps 
         JOIN payrolls p ON p.id = ps.payroll_id 
         WHERE ps.employee_id = $1 
         ORDER BY ps.period_start DESC LIMIT 1`,
        [userEmpId]
      );

      // Leave balance summary
      const leaves = await query(
        `SELECT la.*, tot.name as leave_name, tot.color_code
         FROM leave_allocations la
         JOIN time_off_types tot ON tot.id = la.time_off_type_id
         WHERE la.employee_id = $1 AND la.year = $2`,
        [userEmpId, currentYear]
      );

      // Attendance summary this month
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const attRes = await query(
        `SELECT 
          COUNT(*) as total_days,
          COUNT(CASE WHEN status = 'PRESENT' THEN 1 END) as present_days,
          COUNT(CASE WHEN status = 'LATE' THEN 1 END) as late_days,
          COUNT(CASE WHEN status = 'HALF_DAY' THEN 1 END) as half_days,
          COUNT(CASE WHEN status = 'LEAVE' THEN 1 END) as leave_days
         FROM attendance 
         WHERE employee_id = $1 AND date >= $2`,
        [userEmpId, firstDayOfMonth]
      );

      // Total Year-to-date earnings
      const ytdRes = await query(
        `SELECT 
          COALESCE(SUM(gross_salary), 0) as ytd_gross,
          COALESCE(SUM(total_deductions), 0) as ytd_deductions,
          COALESCE(SUM(net_salary), 0) as ytd_net,
          COUNT(*) as total_payslips
         FROM payslips 
         WHERE employee_id = $1 AND EXTRACT(YEAR FROM period_start) = $2 AND status = 'PAID'`,
        [userEmpId, currentYear]
      );

      return res.json({
        success: true,
        isEmployee: true,
        stats: {
          latestPayslip: lastPayslip.rows[0] || null,
          leaveBalances: leaves.rows,
          monthlyAttendance: attRes.rows[0] || { present_days: 0, late_days: 0, half_days: 0 },
          ytdEarnings: ytdRes.rows[0]
        }
      });
    }

    // 2. Admin / HR / Payroll Manager Overview (Database aggregated analytics)

    // A. Total Active Employees
    const empCountRes = await query(`SELECT COUNT(*) as total FROM employees WHERE status = 'ACTIVE'`);
    const totalEmployees = parseInt(empCountRes.rows[0].count || empCountRes.rows[0].total, 10);

    // B. Total Net Salary, Gross, Deductions & Payslips Count (All time or filtered)
    const payrollAggRes = await query(
      `SELECT 
        COALESCE(SUM(ps.net_salary), 0) as total_net_salary,
        COALESCE(SUM(ps.gross_salary), 0) as total_gross_salary,
        COALESCE(SUM(ps.total_deductions), 0) as total_deductions,
        COUNT(ps.id) as total_payslips,
        COALESCE(AVG(ps.net_salary), 0) as avg_salary_per_employee
       FROM payslips ps
       WHERE ps.status = 'PAID'`
    );
    const payrollKpis = payrollAggRes.rows[0];

    // C. Approved Time-Off Days
    const leaveAggRes = await query(
      `SELECT COALESCE(SUM(total_days), 0) as total_approved_leave_days 
       FROM time_off_requests 
       WHERE status = 'APPROVED' AND EXTRACT(YEAR FROM from_date) = $1`,
      [currentYear]
    );
    const approvedLeaveDays = parseFloat(leaveAggRes.rows[0].total_approved_leave_days);

    // D. Attendance Health % (Present days / Total records)
    const attHealthRes = await query(
      `SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN status IN ('PRESENT', 'LATE') THEN 1 END) as on_time_records,
        COUNT(CASE WHEN status = 'LATE' THEN 1 END) as late_records
       FROM attendance`
    );
    const totalAtt = parseInt(attHealthRes.rows[0].total_records, 10);
    const onTimeAtt = parseInt(attHealthRes.rows[0].on_time_records, 10);
    const attendanceHealth = totalAtt > 0 ? Math.round((onTimeAtt / totalAtt) * 100) : 100;

    // E. Payroll Status Counts (DRAFT, COMPUTED, VALIDATED, PAID)
    const statusCountsRes = await query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(total_net), 0) as total_amount
       FROM payrolls
       GROUP BY status`
    );

    // F. Salary Cost by Department (Chart Data)
    const deptCostRes = await query(
      `SELECT 
        d.name as department_name,
        COALESCE(SUM(ps.gross_salary), 0) as total_cost,
        COALESCE(SUM(ps.net_salary), 0) as net_cost,
        COUNT(DISTINCT ps.employee_id) as employee_count
       FROM departments d
       JOIN employees e ON e.department_id = d.id
       JOIN payslips ps ON ps.employee_id = e.id AND ps.status = 'PAID'
       GROUP BY d.id, d.name
       ORDER BY total_cost DESC`
    );

    // Fallback if no paid payslips yet: use active contract wages by department
    let departmentCosts = deptCostRes.rows;
    if (departmentCosts.length === 0) {
      const contractDeptRes = await query(
        `SELECT 
          d.name as department_name,
          COALESCE(SUM(c.wage), 0) as total_cost,
          COALESCE(SUM(c.wage * 0.8), 0) as net_cost,
          COUNT(DISTINCT e.id) as employee_count
         FROM departments d
         JOIN employees e ON e.department_id = d.id
         JOIN contracts c ON c.employee_id = e.id AND c.status = 'ACTIVE'
         GROUP BY d.id, d.name
         ORDER BY total_cost DESC`
      );
      departmentCosts = contractDeptRes.rows;
    }

    // G. Monthly Net Salary Trend (Chart Data)
    const paidPayrollsRes = await query(
      `SELECT period_start, total_gross, total_deductions, total_net
       FROM payrolls
       WHERE status = 'PAID'
       ORDER BY period_start ASC`
    );

    const monthMap = {};
    for (const p of paidPayrollsRes.rows) {
      const d = new Date(p.period_start);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthLabel = `${months[d.getMonth()]} ${d.getFullYear()}`;
      if (!monthMap[monthLabel]) {
        monthMap[monthLabel] = {
          month_label: monthLabel,
          gross_amount: 0,
          deductions_amount: 0,
          net_amount: 0,
          payruns_count: 0
        };
      }
      monthMap[monthLabel].gross_amount += parseFloat(p.total_gross || 0);
      monthMap[monthLabel].deductions_amount += parseFloat(p.total_deductions || 0);
      monthMap[monthLabel].net_amount += parseFloat(p.total_net || 0);
      monthMap[monthLabel].payruns_count += 1;
    }
    const monthlySalaryTrend = Object.values(monthMap);

    // H. Attendance Overview Breakdown
    const attBreakdownRes = await query(
      `SELECT status, COUNT(*) as count 
       FROM attendance 
       GROUP BY status`
    );

    // I. Time-Off by Type Breakdown
    const leaveBreakdownRes = await query(
      `SELECT tot.name, tot.color_code, COUNT(tor.id) as request_count, COALESCE(SUM(tor.total_days), 0) as total_days
       FROM time_off_types tot
       LEFT JOIN time_off_requests tor ON tor.time_off_type_id = tot.id AND tor.status = 'APPROVED'
       GROUP BY tot.id, tot.name, tot.color_code`
    );

    // J. Payroll Alerts (Pending approvals, Draft payrolls, Expiring contracts)
    const pendingLeaves = await query(`SELECT COUNT(*) as count FROM time_off_requests WHERE status = 'PENDING'`);
    const draftPayrolls = await query(`SELECT COUNT(*) as count FROM payrolls WHERE status = 'DRAFT'`);
    const computedPayrolls = await query(`SELECT COUNT(*) as count FROM payrolls WHERE status = 'COMPUTED'`);
    const activeContracts = await query(`SELECT COUNT(*) as count FROM contracts WHERE status = 'ACTIVE'`);

    const alerts = [];
    if (parseInt(pendingLeaves.rows[0].count, 10) > 0) {
      alerts.push({
        type: 'warning',
        title: 'Pending Time-off Approvals',
        message: `${pendingLeaves.rows[0].count} employee leave request(s) waiting for HR review.`
      });
    }
    if (parseInt(draftPayrolls.rows[0].count, 10) > 0) {
      alerts.push({
        type: 'info',
        title: 'Draft Pay Runs in Progress',
        message: `${draftPayrolls.rows[0].count} pay run(s) are in DRAFT state ready to be computed.`
      });
    }
    if (parseInt(computedPayrolls.rows[0].count, 10) > 0) {
      alerts.push({
        type: 'success',
        title: 'Computed Pay Runs Waiting for Validation',
        message: `${computedPayrolls.rows[0].count} pay run(s) have been computed and await final validation.`
      });
    }

    res.json({
      success: true,
      isEmployee: false,
      kpis: {
        totalEmployees,
        totalNetSalary: parseFloat(payrollKpis.total_net_salary) || 0,
        totalGrossSalary: parseFloat(payrollKpis.total_gross_salary) || 0,
        totalDeductions: parseFloat(payrollKpis.total_deductions) || 0,
        totalPayslips: parseInt(payrollKpis.total_payslips, 10) || 0,
        avgSalaryPerEmployee: parseFloat(payrollKpis.avg_salary_per_employee) || 0,
        approvedLeaveDays,
        attendanceHealth,
        activeContractsCount: parseInt(activeContracts.rows[0].count, 10) || 0
      },
      payrollStatus: statusCountsRes.rows,
      salaryCostByDepartment: departmentCosts,
      monthlySalaryTrend: monthlySalaryTrend,
      attendanceBreakdown: attBreakdownRes.rows,
      timeOffBreakdown: leaveBreakdownRes.rows,
      alerts
    });
  } catch (err) {
    console.error('Fetch dashboard stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to compute dashboard metrics' });
  }
});

module.exports = router;
