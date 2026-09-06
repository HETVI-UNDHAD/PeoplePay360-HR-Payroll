/**
 * PeoplePay360 - Dynamic Sequential Salary Rule Engine
 * Evaluates Fixed, Percentage, and Custom Formula Rules in sequence order.
 * Automatically incorporates:
 * 1. Unpaid Leave / Loss of Pay (LOP) deductions based on approved unpaid leave days and unworked absence days
 * 2. Overtime / Extra Hours additions based on recorded attendance hours
 */

// Safely evaluate simple math expressions using context variables
function evaluateExpression(expression, context) {
  if (!expression || typeof expression !== 'string') return 0;

  try {
    // Replace variable identifiers with their values from context
    let sanitized = expression;
    const sortedKeys = Object.keys(context).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      const val = Number(context[key]) || 0;
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      sanitized = sanitized.replace(regex, `(${val})`);
    }

    // Only allow numbers, math operators, parentheses, decimal points, and spaces
    if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) {
      console.warn('Unsafe characters in formula:', expression, 'Sanitized:', sanitized);
      return 0;
    }

    // Evaluate mathematical expression
    const func = new Function(`return (${sanitized});`);
    const result = func();
    return Number.isFinite(result) ? Math.max(0, Math.round(result * 100) / 100) : 0;
  } catch (err) {
    console.error(`Error evaluating formula: "${expression}"`, err.message);
    return 0;
  }
}

// Safely evaluate boolean condition
function evaluateCondition(conditionStr, context) {
  if (!conditionStr || !conditionStr.trim()) return true;

  try {
    let sanitized = conditionStr;
    const sortedKeys = Object.keys(context).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      const val = Number(context[key]) || 0;
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      sanitized = sanitized.replace(regex, `(${val})`);
    }

    // Only allow comparison operators, numbers, and basic logic
    if (!/^[0-9+\-*/().\s><=!&|]+$/.test(sanitized)) {
      return true;
    }

    const func = new Function(`return Boolean(${sanitized});`);
    return Boolean(func());
  } catch (err) {
    console.warn(`Condition evaluation warning: "${conditionStr}"`, err.message);
    return true;
  }
}

/**
 * Compute Salary for an Employee
 * @param {Object} contract - Employee contract record (contains wage)
 * @param {Array} rules - Array of salary_rules ordered by sequence ASC
 * @param {Object} attendanceData - { workingDays, presentDays, paidLeaveDays, unpaidLeaveDays, overtimeHours, standardDailyHours, overtimeMultiplier }
 * @returns {Object} { lines, grossSalary, totalDeductions, netSalary, overtimeHours, overtimeAmount, unpaidLeaveDays, unpaidLeaveAmount, workingDays, presentDays, paidLeaveDays, payableDays, attendanceRatio, wage }
 */
function computeSalary(contract, rules = [], attendanceData = {}) {
  const wage = parseFloat(contract.wage) || 0;
  const workingDays = Math.max(1, parseFloat(attendanceData.workingDays) || 22);
  const presentDays = parseFloat(attendanceData.presentDays !== undefined ? attendanceData.presentDays : workingDays);
  const paidLeaveDays = parseFloat(attendanceData.paidLeaveDays) || 0;
  const unpaidLeaveDays = parseFloat(attendanceData.unpaidLeaveDays) || 0;
  const overtimeHours = Math.max(0, parseFloat(attendanceData.overtimeHours) || 0);
  const standardDailyHours = Math.max(1, parseFloat(attendanceData.standardDailyHours) || 8.0);
  const overtimeMultiplier = parseFloat(attendanceData.overtimeMultiplier) || 1.5;

  // Rate calculations
  const dailyRate = Math.round((wage / workingDays) * 100) / 100;
  const standardHourlyRate = Math.round((dailyRate / standardDailyHours) * 100) / 100;
  const overtimeHourlyRate = Math.round((standardHourlyRate * overtimeMultiplier) * 100) / 100;

  // Overtime and Unpaid Leave Amounts
  const overtimeAmount = Math.round(overtimeHours * overtimeHourlyRate * 100) / 100;

  // Working factor for pro-rata adjustment if unpaid leaves exist
  const effectiveDays = Math.min(workingDays, Math.max(0, presentDays + paidLeaveDays));
  const attendanceRatio = workingDays > 0 ? (effectiveDays / workingDays) : 1;

  // Calculate total unpaid / unworked days (including unworked absence days beyond paid leave)
  const totalUnpaidDays = Math.max(unpaidLeaveDays, Math.max(0, workingDays - effectiveDays));
  const unpaidLeaveAmount = Math.round(totalUnpaidDays * dailyRate * 100) / 100;

  // Context dictionary storing values of computed rules and runtime telemetry
  const context = {
    WAGE: wage,
    WORKING_DAYS: workingDays,
    PRESENT_DAYS: presentDays,
    PAID_LEAVE: paidLeaveDays,
    UNPAID_LEAVE: totalUnpaidDays,
    PAYABLE_DAYS: effectiveDays,
    OVERTIME_HOURS: overtimeHours,
    OVERTIME_PAY: overtimeAmount,
    LEAVE_DEDUCTION: unpaidLeaveAmount,
    DAILY_RATE: dailyRate,
    HOURLY_RATE: standardHourlyRate,
    OVERTIME_RATE: overtimeHourlyRate,
    ATTENDANCE_RATIO: attendanceRatio,
    GROSS: 0,
    TOTAL_DEDUCTIONS: 0
  };

  const lines = [];
  let grossSalary = 0;
  let totalDeductions = 0;

  // Sort rules strictly by sequence
  const sortedRules = [...rules].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  let hasExplicitOvertimeRule = false;
  let hasExplicitUnpaidLeaveRule = false;

  for (const rule of sortedRules) {
    if (rule.is_active === false) continue;

    const ruleCode = (rule.code || '').toUpperCase();
    if (ruleCode === 'OVERTIME') hasExplicitOvertimeRule = true;
    if (['UNPAID_LEAVE', 'LOP', 'LEAVE_DEDUCTION'].includes(ruleCode)) hasExplicitUnpaidLeaveRule = true;

    // Check condition
    if (rule.condition && !evaluateCondition(rule.condition, context)) {
      continue;
    }

    let amount = 0;
    const computationType = (rule.computation_type || 'FIXED').toUpperCase();
    const rate = parseFloat(rule.percentage) || parseFloat(rule.rate) || 0;

    if (computationType === 'FIXED') {
      amount = parseFloat(rule.fixed_amount) || 0;
    } else if (computationType === 'PERCENTAGE') {
      const baseCode = (rule.base_code || 'BASIC').toUpperCase();
      const baseValue = baseCode === 'WAGE' ? wage : (context[baseCode] || 0);
      amount = (rate / 100) * baseValue;
    } else if (computationType === 'FORMULA') {
      amount = evaluateExpression(rule.formula, context);
    }

    // Apply attendance pro-rata factor to earnings (Basic & Allowances) if payable days < working days
    const isEarning = (rule.category === 'BASIC' || rule.category === 'ALLOWANCE');
    if (isEarning && attendanceRatio < 1 && ruleCode !== 'OT' && ruleCode !== 'OVERTIME') {
      amount = amount * attendanceRatio;
    }

    // Round to 2 decimals
    amount = Math.round(amount * 100) / 100;

    // Store in context for subsequent rules
    context[ruleCode] = amount;

    // Categorize
    if (rule.category === 'BASIC' || rule.category === 'ALLOWANCE') {
      grossSalary += amount;
      context.GROSS = grossSalary;
    } else if (rule.category === 'DEDUCTION') {
      totalDeductions += amount;
      context.TOTAL_DEDUCTIONS = totalDeductions;
    }

    lines.push({
      salaryRuleId: rule.id || null,
      ruleCode: rule.code,
      ruleName: rule.name,
      category: rule.category,
      sequence: rule.sequence || 10,
      computationType: rule.computation_type,
      rate: rate,
      amount: amount
    });
  }

  // If there are overtime / extra hours and no manual overtime rule in structure, add as allowance
  if (overtimeHours > 0 && !hasExplicitOvertimeRule && overtimeAmount > 0) {
    lines.push({
      salaryRuleId: null,
      ruleCode: 'OVERTIME',
      ruleName: `Overtime Pay (${overtimeHours} hrs @ ₹${overtimeHourlyRate.toFixed(2)}/hr)`,
      category: 'ALLOWANCE',
      sequence: 85,
      computationType: 'HOURLY',
      rate: overtimeMultiplier,
      amount: overtimeAmount
    });
    grossSalary += overtimeAmount;
    context.GROSS = grossSalary;
    context.OVERTIME = overtimeAmount;
  }

  // If there are unpaid leaves / unworked absent days and no manual deduction rule, add as explicit LOP deduction
  if (totalUnpaidDays > 0 && !hasExplicitUnpaidLeaveRule && unpaidLeaveAmount > 0) {
    lines.push({
      salaryRuleId: null,
      ruleCode: 'UNPAID_LEAVE',
      ruleName: `Loss of Pay (LOP) / Unpaid Leave (${totalUnpaidDays} days @ ₹${dailyRate.toFixed(2)}/day)`,
      category: 'DEDUCTION',
      sequence: 95,
      computationType: 'DAILY',
      rate: dailyRate,
      amount: unpaidLeaveAmount
    });
    totalDeductions += unpaidLeaveAmount;
    context.TOTAL_DEDUCTIONS = totalDeductions;
    context.UNPAID_LEAVE = unpaidLeaveAmount;
  }

  // Final Net salary calculation
  grossSalary = Math.round(grossSalary * 100) / 100;
  totalDeductions = Math.round(totalDeductions * 100) / 100;
  const netSalary = Math.max(0, Math.round((grossSalary - totalDeductions) * 100) / 100);

  return {
    lines,
    grossSalary,
    totalDeductions,
    netSalary,
    workingDays,
    presentDays,
    paidLeaveDays,
    unpaidLeaveDays: totalUnpaidDays,
    overtimeHours,
    overtimeAmount,
    unpaidLeaveAmount,
    dailyRate,
    standardHourlyRate,
    overtimeHourlyRate,
    payableDays: effectiveDays,
    attendanceRatio,
    wage
  };
}

module.exports = {
  computeSalary,
  evaluateExpression,
  evaluateCondition
};
