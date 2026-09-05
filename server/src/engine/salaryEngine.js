/**
 * PeoplePay360 - Dynamic Sequential Salary Rule Engine
 * Evaluates Fixed, Percentage, and Custom Formula Rules in sequence order.
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
 * @param {Object} attendanceData - { workingDays, presentDays, paidLeaveDays, unpaidLeaveDays }
 * @returns {Object} { lines, grossSalary, totalDeductions, netSalary }
 */
function computeSalary(contract, rules, attendanceData = {}) {
  const wage = parseFloat(contract.wage) || 0;
  const workingDays = parseFloat(attendanceData.workingDays) || 22;
  const presentDays = parseFloat(attendanceData.presentDays !== undefined ? attendanceData.presentDays : workingDays);
  const paidLeaveDays = parseFloat(attendanceData.paidLeaveDays) || 0;
  const unpaidLeaveDays = parseFloat(attendanceData.unpaidLeaveDays) || 0;
  const overtimeHours = parseFloat(attendanceData.overtimeHours) || 0;

  // Payable days = present days + paid leave days
  const payableDays = Math.min(workingDays, Math.max(0, presentDays + paidLeaveDays));
  const attendanceRatio = workingDays > 0 ? (payableDays / workingDays) : 1;
  const absentDays = Math.max(0, workingDays - payableDays - unpaidLeaveDays);

  // Hourly wage (assuming standard 8-hour workday)
  const dailyRate = workingDays > 0 ? (wage / workingDays) : 0;
  const hourlyRate = dailyRate / 8;
  const overtimePay = Math.round(overtimeHours * hourlyRate * 1.5 * 100) / 100;

  // Context dictionary storing values of computed rules
  const context = {
    WAGE: wage,
    WORKING_DAYS: workingDays,
    PRESENT_DAYS: presentDays,
    PAID_LEAVE: paidLeaveDays,
    UNPAID_LEAVE: unpaidLeaveDays,
    ABSENT_DAYS: absentDays,
    PAYABLE_DAYS: payableDays,
    ATTENDANCE_RATIO: attendanceRatio,
    OVERTIME_HOURS: overtimeHours,
    HOURLY_RATE: hourlyRate,
    OVERTIME_PAY: overtimePay,
    GROSS: 0,
    TOTAL_DEDUCTIONS: 0
  };

  const lines = [];
  let grossSalary = 0;
  let totalDeductions = 0;

  // Sort rules strictly by sequence
  const sortedRules = [...rules].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  let overtimeRuleProcessed = false;

  for (const rule of sortedRules) {
    if (rule.is_active === false) continue;

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

    // Apply pro-rata factor for BASIC and ALLOWANCE rules if payable days < working days
    // (Unless the rule code explicitly represents overtime)
    const rCode = (rule.code || '').toUpperCase();
    if (['BASIC', 'ALLOWANCE'].includes(rule.category) && attendanceRatio < 1 && rCode !== 'OT' && rCode !== 'OVERTIME') {
      amount = amount * attendanceRatio;
    }

    // Round to 2 decimals
    amount = Math.round(amount * 100) / 100;

    if (rCode === 'OT' || rCode === 'OVERTIME') {
      overtimeRuleProcessed = true;
      if (overtimeHours > 0 && amount === 0) {
        amount = overtimePay;
      }
    }

    // Store in context for subsequent rules
    context[rCode] = amount;

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

  // If overtime hours were logged and no explicit OT rule existed in the structure, auto-add Overtime Pay line
  if (overtimeHours > 0 && !overtimeRuleProcessed && overtimePay > 0) {
    grossSalary += overtimePay;
    context.GROSS = grossSalary;
    context.OT = overtimePay;
    lines.push({
      salaryRuleId: null,
      ruleCode: 'OT',
      ruleName: `Overtime Allowance (${overtimeHours} hrs @ 1.5x)`,
      category: 'ALLOWANCE',
      sequence: 45,
      computationType: 'FORMULA',
      rate: 150,
      amount: overtimePay
    });
  }

  // Net salary calculation
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
    unpaidLeaveDays,
    absentDays,
    overtimeHours,
    overtimePay,
    payableDays,
    attendanceRatio,
    wage
  };
}

module.exports = {
  computeSalary,
  evaluateExpression,
  evaluateCondition
};
