import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  BarChart3,
  Download,
  Filter,
  FileSpreadsheet,
  Users,
  Clock,
  PlaneTakeoff,
  Calculator,
  Building2,
  Receipt
} from 'lucide-react';

export function ReportsPage() {
  const { isEmployee } = useAuth();
  const [activeReport, setActiveReport] = useState('payroll'); // 'payroll' | 'employees' | 'attendance' | 'timeoff' | 'tax' | 'dept-cost'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);

  const reportTabs = [
    { id: 'payroll', label: 'Payroll Summary', icon: Calculator },
    { id: 'employees', label: 'Employee Roster', icon: Users },
    { id: 'attendance', label: 'Attendance Audit', icon: Clock },
    { id: 'timeoff', label: 'Time-Off Usage', icon: PlaneTakeoff },
    { id: 'tax', label: 'Tax & Deductions', icon: Receipt },
    { id: 'dept-cost', label: 'Department Costs', icon: Building2 },
  ];

  const fetchReportData = async () => {
    try {
      setLoading(true);
      let res;
      if (activeReport === 'payroll') res = await api.getPayrollSummaryReport();
      else if (activeReport === 'employees') res = await api.getEmployeeReport({ department_id: departmentId });
      else if (activeReport === 'attendance') res = await api.getAttendanceReport({ department_id: departmentId });
      else if (activeReport === 'timeoff') res = await api.getTimeOffReport({ department_id: departmentId });
      else if (activeReport === 'tax') res = await api.getTaxReport();
      else if (activeReport === 'dept-cost') res = await api.getDepartmentCostsReport();

      if (res?.success) {
        setData(res.data || []);
      }
    } catch (err) {
      console.error('Fetch report error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getDepartments().then(r => r.success && setDepartments(r.departments));
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [activeReport, departmentId]);

  // Export to CSV helper
  const exportCSV = () => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        const escaped = ('' + (val !== null && val !== undefined ? val : '')).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${activeReport}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Executive Reports Suite</h2>
          <p className="text-xs text-slate-400 mt-1">
            Exportable compliance summaries, department expenditure audits, and workforce attendance telemetry.
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={data.length === 0}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export CSV Spreadsheet
        </button>
      </div>

      {/* Report Categories Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all shrink-0 ${
                active
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                  : 'glass-panel bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      {['employees', 'attendance', 'timeoff'].includes(activeReport) && (
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={departmentId}
            onChange={e => setDepartmentId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      )}

      {/* Report Dynamic Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Generating report...</div>
          ) : data.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">No records found for this report.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  {Object.keys(data[0]).map((col, idx) => (
                    <th key={idx} className="py-3.5 px-4 font-semibold">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-800/40 transition-colors">
                    {Object.keys(row).map((col, colIdx) => (
                      <td key={colIdx} className="py-3 px-4 text-slate-300">
                        {typeof row[col] === 'number'
                          ? col.includes('amount') || col.includes('gross') || col.includes('net') || col.includes('wage') || col.includes('cost')
                            ? `$${parseFloat(row[col]).toLocaleString()}`
                            : row[col]
                          : row[col] === true ? 'Yes' : row[col] === false ? 'No' : row[col] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
