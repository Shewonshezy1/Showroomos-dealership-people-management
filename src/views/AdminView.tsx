/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../context/ShowroomContext';
import { ALL_STAFF_ROLES, ROLE_LABELS } from '../auth/permissions';
import { UserRole } from '../types';
import {
  ShieldCheck,
  UserPlus,
  Download,
  Lock,
  Ban,
  CheckCircle2,
  FileClock,
  AlertTriangle,
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const {
    currentUser,
    can,
    staffUsers,
    staffInvites,
    auditLogs,
    inviteStaff,
    updateStaffRoleOrStatus,
    exportDatabaseBackup,
  } = useShowroom();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('sales');
  const [designation, setDesignation] = useState('Sales Consultant');
  const [department, setDepartment] = useState('Sales');
  const [branch, setBranch] = useState('Colombo 03 Flagship');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canManageInvites = can('users.manage_invites');
  const canAssignRoles = can('users.assign_role');
  const canToggleDisable = can('users.toggle_disable');
  const canExportBackup = can('backup.export');

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!email.trim() || !fullName.trim()) return;
    setSubmitting(true);
    const res = await inviteStaff({
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      role,
      designation: designation.trim() || ROLE_LABELS[role],
      department: department.trim() || 'Showroom Operations',
      branch: branch.trim() || 'Colombo 03 Flagship',
    });
    setSubmitting(false);
    if (res.success) {
      setFeedback({
        type: 'ok',
        text: `Staff invitation recorded for ${email.trim().toLowerCase()} with role "${ROLE_LABELS[role]}".`,
      });
      setEmail('');
      setFullName('');
    } else {
      setFeedback({ type: 'err', text: res.error || 'Failed to invite staff.' });
    }
  };

  const handleDownloadBackup = async () => {
    setFeedback(null);
    const snapshot = await exportDatabaseBackup();
    if (!snapshot) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            exportedBy: currentUser?.email,
            note: 'HR Payroll collection (employees_payroll) is excluded from Admin snapshots by separation-of-duties rules.',
            collections: snapshot,
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `showroomos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback({ type: 'ok', text: 'Firestore JSON snapshot downloaded and logged to audit trail.' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#18191d] border border-stone-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-amber-400 font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Identity, Access Control & Audit</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            Staff Access Governance & Audit Trail
          </h1>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl">
            Manage pre-approved staff invitations, role assignments, account enable/disable status, and immutable operation audit logs.
          </p>
        </div>

        {canExportBackup && (
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer self-start md:self-auto"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export JSON Backup</span>
          </button>
        )}
      </div>

      {/* Separation of Duties Notice */}
      <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-200">
        <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-300 block">
            Separation of Duties Active
          </span>
          <span className="text-stone-300">
            System Administrators manage staff invitations, roles, and backups ONLY — they cannot read HR salary figures, approve discounts, verify/reverse customer payments, or approve trade-in credits.
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.type === 'ok'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/40 border-rose-800 text-rose-200'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Invite Staff Form (Admin only) */}
      {canManageInvites && (
        <div className="bg-[#18191d] border border-stone-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
            <UserPlus className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold text-white">Pre-Approve & Invite Staff Account</h2>
          </div>

          <form onSubmit={handleInviteSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-stone-400 mb-1">Staff Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="staff.member@company.lk"
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-red-700"
              />
            </div>

            <div>
              <label className="block text-stone-400 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Full Staff Name"
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-red-700"
              />
            </div>

            <div>
              <label className="block text-stone-400 mb-1">Assigned Role *</label>
              <select
                value={role}
                onChange={e => {
                  const next = e.target.value as UserRole;
                  setRole(next);
                  setDesignation(ROLE_LABELS[next]);
                }}
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-red-700"
              >
                {ALL_STAFF_ROLES.map(r => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]} ({r})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-400 mb-1">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-red-700"
              />
            </div>

            <div>
              <label className="block text-stone-400 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-red-700"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 px-4 bg-[#9b1c1c] hover:bg-[#b91c1c] disabled:opacity-50 text-white rounded-md font-semibold transition-colors cursor-pointer"
              >
                {submitting ? 'Creating Invite...' : 'Issue Staff Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Staff Accounts Table */}
      <div className="bg-[#18191d] border border-stone-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-800 flex items-center justify-between bg-[#141518]">
          <h3 className="text-sm font-bold text-white">
            Provisioned Staff Accounts ({staffUsers.length})
          </h3>
          <span className="text-[11px] text-stone-400">
            Role updates & account disablement enforce immediately in Firestore rules
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121316] text-[10px] uppercase text-stone-400 border-b border-stone-800">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                {canToggleDisable && <th className="py-3 px-4 text-right">Access Control</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/70">
              {staffUsers.map(u => {
                const isSelf = u.uid === currentUser?.uid;
                return (
                  <tr key={u.uid} className="hover:bg-stone-800/30">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">
                        {u.fullName} {isSelf && <span className="text-[10px] text-amber-400">(You)</span>}
                      </div>
                      <div className="text-[11px] text-stone-400">{u.designation}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-300">{u.email}</td>
                    <td className="py-3 px-4 text-stone-300">{u.department}</td>
                    <td className="py-3 px-4">
                      {canAssignRoles && !isSelf ? (
                        <select
                          value={u.role}
                          onChange={e =>
                            updateStaffRoleOrStatus(u.uid, { role: e.target.value as UserRole })
                          }
                          className="bg-[#121316] border border-stone-700 rounded px-2 py-1 text-xs text-stone-100"
                        >
                          {ALL_STAFF_ROLES.map(r => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-mono text-[11px] bg-stone-800 px-2 py-0.5 rounded text-stone-200">
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          u.disabled
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {u.disabled ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    {canToggleDisable && (
                      <td className="py-3 px-4 text-right">
                        {isSelf ? (
                          <span className="text-[11px] text-stone-500 italic">Current Session</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              updateStaffRoleOrStatus(u.uid, { disabled: !u.disabled })
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                              u.disabled
                                ? 'bg-emerald-900/70 hover:bg-emerald-800 text-emerald-200'
                                : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60'
                            }`}
                          >
                            <Ban className="w-3 h-3" />
                            <span>{u.disabled ? 'Re-enable' : 'Disable'}</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {staffUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-stone-500">
                    No staff user documents found yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Invites Queue */}
      {canManageInvites && (
        <div className="bg-[#18191d] border border-stone-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-800 bg-[#141518]">
            <h3 className="text-sm font-bold text-white">
              Staff Invitations ({staffInvites.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121316] text-[10px] uppercase text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Assigned Role</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/70">
                {staffInvites.map(inv => (
                  <tr key={inv.id}>
                    <td className="py-2.5 px-4 font-mono text-stone-200">{inv.email}</td>
                    <td className="py-2.5 px-4 text-stone-300">{inv.fullName}</td>
                    <td className="py-2.5 px-4 text-stone-300">{ROLE_LABELS[inv.role] || inv.role}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          inv.status === 'Accepted'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : inv.status === 'Revoked'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {staffInvites.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-5 text-center text-stone-500">
                      No staff invitations issued yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Immutable Audit Trail */}
      <div className="bg-[#18191d] border border-stone-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-800 bg-[#141518] flex items-center gap-2">
          <FileClock className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">
            Immutable Security & Business Audit Log ({auditLogs.length})
          </h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121316] text-[10px] uppercase text-stone-400 border-b border-stone-800 sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Target Record</th>
                <th className="py-2.5 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {auditLogs.slice(0, 100).map(log => (
                <tr key={log.id} className="hover:bg-stone-800/30">
                  <td className="py-2.5 px-4 font-mono text-amber-300 font-semibold">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-4 text-stone-200">{log.actorEmail}</td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-stone-400">
                    {log.actorRole}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-stone-300">
                    {log.collection}/{log.recordId}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[10px] text-stone-400 max-w-xs truncate">
                    {log.changes ? JSON.stringify(log.changes) : '—'}
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-stone-500">
                    No audit log entries recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
