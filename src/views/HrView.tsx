/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../context/ShowroomContext';
import { formatLKR } from '../utils/formatters';
import { AttendanceStatus, LeaveStatus } from '../types';
import {
  UserCheck2,
  Calendar,
  DollarSign,
  Users,
  Check,
  X,
  Clock,
  ShieldAlert,
  Search,
  CheckCircle2,
  Briefcase,
  Phone,
  Mail,
} from 'lucide-react';

export const HrView: React.FC = () => {
  const {
    can,
    employees,
    leaveRequests,
    updateLeaveRequestStatus,
    attendance,
    markAttendance,
    metrics,
  } = useShowroom();

  const canReadPayroll = can('hr.payroll.read');
  const canDecideLeaves = can('hr.leaves.decide');
  const canWriteAttendance = can('hr.attendance.write');
  const canReadDirectory = can('hr.directory.read');

  const [activeTab, setActiveTab] = useState<'leaves' | 'directory' | 'payroll'>('leaves');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [employeeSearch, setEmployeeSearch] = useState('');

  const filteredEmployees = employees.filter(e => {
    const matchesDept = departmentFilter === 'All' || e.department === departmentFilter;
    const matchesSearch =
      e.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      e.role.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      e.empCode.toLowerCase().includes(employeeSearch.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const departments = ['All', 'Sales', 'Service & PDI', 'Showroom Operations', 'Finance & Admin'];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#18191d] border border-stone-800 p-5 rounded-xl text-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-amber-400">
              People & Dealership Operations
            </span>
            <span className="text-stone-600">·</span>
            <span className="text-xs text-stone-400">Ideal Motors Sri Lanka</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
            Human Resources & Staff Operations
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Employee rosters, leave authorizations with real-time dashboard sync, daily attendance tracking, and illustrative payroll preview.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1 bg-[#121316] p-1 rounded-lg border border-stone-800 text-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'leaves'
                ? 'bg-[#9b1c1c] text-white shadow-xs font-semibold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Leave Requests ({leaveRequests.filter(l => l.status === 'Pending').length} Pending)
          </button>
          {canReadDirectory && (
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                activeTab === 'directory'
                  ? 'bg-[#9b1c1c] text-white shadow-xs font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Staff Directory ({employees.length})
            </button>
          )}
          {canReadPayroll && (
            <button
              onClick={() => setActiveTab('payroll')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                activeTab === 'payroll'
                  ? 'bg-[#9b1c1c] text-white shadow-xs font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Attendance & Illustrative Payroll
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: LEAVE REQUESTS */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="bg-[#18191d] border border-stone-800 p-4 rounded-xl flex items-center justify-between text-xs text-stone-300">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white text-sm">
                Staff Leave Authorization Queue
              </span>
              <span className="text-stone-500">|</span>
              <span className="text-stone-400">
                Approving or rejecting requests updates executive dashboard counts in real time.
              </span>
            </div>
            <div className="font-mono text-amber-300 text-xs">
              Pending Management Review: <strong>{metrics.pendingLeaveRequestsCount}</strong>
            </div>
          </div>

          <div className="bg-[#18191d] border border-stone-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#141518] border-b border-stone-800 text-[10px] uppercase text-stone-400 font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Request Ref</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/80">
                {leaveRequests.map(req => {
                  const isPending = req.status === 'Pending';

                  return (
                    <tr key={req.id} className="hover:bg-stone-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                        {req.id}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-white">
                        {req.employeeName}
                      </td>

                      <td className="py-3.5 px-4 text-stone-300">
                        {req.department}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="bg-stone-800 px-2 py-0.5 rounded text-[11px] text-stone-300">
                          {req.leaveType}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-stone-300">
                        <div>
                          {req.startDate} to {req.endDate}
                        </div>
                        <span className="text-[10px] text-stone-500 font-sans">
                          {req.days} Day{req.days > 1 ? 's' : ''}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-stone-300 max-w-xs truncate">
                        {req.reason}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            req.status === 'Approved'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : req.status === 'Rejected'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {req.status}
                        </span>
                        {req.decisionBy && (
                          <span className="block text-[10px] text-stone-500 mt-0.5 truncate">
                            By {req.decisionBy}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isPending && canDecideLeaves ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => updateLeaveRequestStatus(req.id, 'Approved')}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded shadow-xs transition-colors cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => updateLeaveRequestStatus(req.id, 'Rejected')}
                              className="flex items-center gap-1 px-2.5 py-1 bg-rose-900/80 hover:bg-rose-800 text-rose-200 text-[11px] font-semibold rounded transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-500 italic">
                            {isPending ? 'Pending HR/GM' : 'Settled'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div className="bg-[#18191d] border border-stone-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
              <input
                type="text"
                value={employeeSearch}
                onChange={e => setEmployeeSearch(e.target.value)}
                placeholder="Search staff by name, code, role..."
                className="w-full bg-[#121316] border border-stone-700 rounded-lg pl-9 pr-3 py-2 text-stone-200 placeholder-stone-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#121316] rounded-lg border border-stone-800">
              {departments.map(d => (
                <button
                  key={d}
                  onClick={() => setDepartmentFilter(d)}
                  className={`px-3 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                    departmentFilter === d
                      ? 'bg-[#9b1c1c] text-white font-semibold shadow-xs'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredEmployees.map(emp => (
              <div
                key={emp.id}
                className="bg-[#18191d] border border-stone-800 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-sm hover:border-stone-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-amber-300 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded">
                      {emp.empCode}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active Staff"></span>
                  </div>

                  <h3 className="font-bold text-white text-sm mt-2">{emp.fullName}</h3>
                  <p className="text-xs text-amber-400 font-medium">{emp.role}</p>
                  <p className="text-[11px] text-stone-400">{emp.department}</p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-stone-800 text-[11px] text-stone-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 text-stone-500 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3 h-3 text-stone-500 shrink-0" />
                    <span>{emp.phone}</span>
                  </div>
                  <div className="text-[10px] text-stone-500 pt-1">
                    Reports to: {emp.manager}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ATTENDANCE & ILLUSTRATIVE PAYROLL (Strictly HR Role Only) */}
      {activeTab === 'payroll' && !canReadPayroll && (
        <div className="bg-[#18191d] border border-rose-900/60 p-6 rounded-xl text-xs text-rose-200">
          Access Restricted: Payroll & compensation records are limited exclusively to the HR & People Ops role.
        </div>
      )}
      {activeTab === 'payroll' && canReadPayroll && (
        <div className="space-y-5">
          {/* Statutory Disclaimer Box */}
          <div className="bg-[#18191d] border border-amber-800/80 bg-amber-950/20 p-4 rounded-xl text-xs text-amber-200 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-300 uppercase tracking-wider block">
                Illustrative Payroll — Not Statutory Payroll
              </span>
              <p className="text-stone-300 leading-relaxed">
                This screen displays illustrative salary components stored in the HR-restricted employees_payroll collection. It does not calculate statutory Sri Lankan taxes, EPF, ETF, or legal deductions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Attendance Roster */}
            <div className="bg-[#18191d] border border-stone-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Today's Showroom Attendance
                  </h3>
                  <p className="text-xs text-stone-400">
                    Daily floor attendance records for Colombo flagship
                  </p>
                </div>
                <span className="font-mono text-xs text-amber-300">
                  {attendance.filter(a => a.status === 'Present').length} / {attendance.length} Present
                </span>
              </div>

              <div className="space-y-2">
                {attendance.map(rec => (
                  <div
                    key={rec.id}
                    className="bg-[#141518] p-3 rounded-lg border border-stone-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white block">{rec.employeeName}</span>
                      <span className="text-[11px] text-stone-400">
                        {rec.department} · In: {rec.checkInTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(['Present', 'Late', 'Half Day', 'On Leave'] as AttendanceStatus[]).map(st => {
                        const isCurrent = rec.status === st;
                        return (
                          <button
                            key={st}
                            disabled={!canWriteAttendance}
                            onClick={() => markAttendance(rec.employeeId, st)}
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                              isCurrent
                                ? st === 'Present'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : st === 'Late'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                            }`}
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Illustrative Payroll Preview Table */}
            <div className="bg-[#18191d] border border-stone-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Illustrative Compensation Breakdown
                  </h3>
                  <p className="text-xs text-stone-400">
                    Monthly figures in illustrative LKR
                  </p>
                </div>
                <span className="text-[10px] bg-stone-800 text-stone-400 px-2 py-0.5 rounded font-mono">
                  Sample Figures
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#141518] border-b border-stone-800 text-[10px] uppercase text-stone-400 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Staff Member</th>
                      <th className="py-2.5 px-3 text-right">Basic (LKR)</th>
                      <th className="py-2.5 px-3 text-right">Allowance</th>
                      <th className="py-2.5 px-3 text-right">Incentive</th>
                      <th className="py-2.5 px-3 text-right">Net Illustrative</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/80">
                    {employees.map(e => {
                      const gross =
                        e.salary.basicLkr +
                        e.salary.showroomAllowanceLkr +
                        e.salary.salesIncentiveLkr;
                      const net = gross - e.salary.illustrativeDeductionsLkr;

                      return (
                        <tr key={e.id} className="hover:bg-stone-800/40">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-white block">{e.fullName}</span>
                            <span className="text-[10px] text-stone-400">{e.role}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-stone-300">
                            {formatLKR(e.salary.basicLkr)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-stone-300">
                            {formatLKR(e.salary.showroomAllowanceLkr)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-medium">
                            {formatLKR(e.salary.salesIncentiveLkr)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                            {formatLKR(net)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
