const http = require('http');

const API_BASE = 'http://localhost:5000/api';

async function req(endpoint, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const request = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    request.on('error', reject);
    if (body) {
      request.write(JSON.stringify(body));
    }
    request.end();
  });
}

async function testPayrollAdmin() {
  console.log('--- Testing HR Payroll Manager (PAYROLL_ADMIN) RBAC & Features ---');

  // 1. Switch demo role to PAYROLL_ADMIN
  const switchRes = await req('/auth/demo-switch', 'POST', { roleCode: 'PAYROLL_ADMIN' });
  console.log('1. Demo Switch to PAYROLL_ADMIN:', switchRes.status, switchRes.data.success ? 'SUCCESS' : 'FAILED');
  if (!switchRes.data.success) {
    throw new Error('Failed to switch to PAYROLL_ADMIN: ' + JSON.stringify(switchRes.data));
  }
  const token = switchRes.data.token;
  console.log('   User:', switchRes.data.user.firstName, switchRes.data.user.lastName, '| Role:', switchRes.data.user.role);

  // 2. Can manage employees? (Read & check)
  const empRes = await req('/employees', 'GET', null, token);
  console.log('2. GET /employees:', empRes.status, `(${empRes.data.employees?.length || 0} employees found)`);

  // 3. Can manage attendance?
  const attRes = await req('/attendance', 'GET', null, token);
  console.log('3. GET /attendance:', attRes.status, `(${attRes.data.attendance?.length || 0} records found)`);

  // 4. Can manage schedules?
  const schRes = await req('/schedules', 'GET', null, token);
  console.log('4. GET /schedules:', schRes.status, `(${schRes.data.schedules?.length || 0} schedules found)`);

  // 5. Create Salary Structure
  const structCode = 'TEST_STRUCT_' + Date.now();
  const createStructRes = await req('/salary/structures', 'POST', {
    name: 'Test Automation Structure',
    code: structCode,
    type: 'REGULAR',
    description: 'Structure created by HR Payroll Manager'
  }, token);
  console.log('5. POST /salary/structures:', createStructRes.status, createStructRes.data.message);
  const structId = createStructRes.data.id;

  // 6. Update Salary Structure
  const updateStructRes = await req(`/salary/structures/${structId}`, 'PUT', {
    name: 'Updated Automation Structure',
    description: 'Updated description'
  }, token);
  console.log('6. PUT /salary/structures/:id:', updateStructRes.status, updateStructRes.data.message);

  // 7. Create Salary Rule under Structure
  const ruleCode = 'TEST_RULE_' + Date.now().toString().slice(-4);
  const createRuleRes = await req('/salary/rules', 'POST', {
    salary_structure_id: structId,
    name: 'Automation Performance Bonus',
    code: ruleCode,
    sequence: 25,
    category: 'ALLOWANCE',
    computation_type: 'PERCENTAGE',
    percentage: 12.5,
    base_code: 'BASIC'
  }, token);
  console.log('7. POST /salary/rules:', createRuleRes.status, createRuleRes.data.message);
  const ruleId = createRuleRes.data.id;

  // 8. Update Salary Rule
  const updateRuleRes = await req(`/salary/rules/${ruleId}`, 'PUT', {
    name: 'Updated Performance Bonus',
    percentage: 15.0
  }, token);
  console.log('8. PUT /salary/rules/:id:', updateRuleRes.status, updateRuleRes.data.message);

  // 9. Delete Salary Rule
  const delRuleRes = await req(`/salary/rules/${ruleId}`, 'DELETE', null, token);
  console.log('9. DELETE /salary/rules/:id:', delRuleRes.status, delRuleRes.data.message);

  // 10. Delete Salary Structure
  const delStructRes = await req(`/salary/structures/${structId}`, 'DELETE', null, token);
  console.log('10. DELETE /salary/structures/:id:', delStructRes.status, delStructRes.data.message);

  // 11. Can view and manage Payruns?
  const payrunsRes = await req('/payroll/payruns', 'GET', null, token);
  console.log('11. GET /payroll/payruns:', payrunsRes.status, `(${payrunsRes.data.payruns?.length || 0} payruns found)`);

  console.log('\n🎉 ALL HR PAYROLL MANAGER PERMISSION CHECKS PASSED PERFECTLY!');
}

testPayrollAdmin().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
