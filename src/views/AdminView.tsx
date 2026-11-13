/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { useShowroom } from '../context/ShowroomContext';
import {
  ALL_PERMISSIONS,
  DEALERSHIP_MODULES,
  DEFAULT_RESTRICTED_ADMIN_LIMITS,
  PERMANENT_SUPER_ADMIN_EMAIL,
  Permission,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  STANDARD_STAFF_ROLES,
  SUPER_ADMIN_ONLY_PERMISSIONS,
  buildPermissionsFromAdminLimits,
  getAssignableRoles,
  getEffectiveUserPermissions,
  isPermanentOwnerEmail,
  isSuperAdminUser,
} from '../auth/permissions';
import { DealershipModule, SystemAdminLimits, UserRole, UserSession } from '../types';
import {
  ShieldCheck,
  UserPlus,
  Download,
  Lock,
  Ban,
  CheckCircle2,
  FileClock,
  AlertTriangle,
  Crown,
  SlidersHorizontal,
  KeyRound,
  Trash2,
  X,
  Users,
  UserCog,
} from 'lucide-react';

function formatAuditTime(val: unknown): string {
  if (!val) return '—';
  if (typeof val === 'string') {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? val : d.toLocaleString();
  }
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    const sec = Number((val as { seconds: number }).seconds);
    return new Date(sec * 1000).toLocaleString();
  }
  return '—';
}

export const AdminView: React.FC = () => {
  const {
    currentUser,
    can,
    staffUsers,
    staffInvites,
    auditLogs,
    createAccount,
    revokeInvite,
    updateStaffRoleOrStatus,
    updateUserPermissions,
    resetUserPassword,
    deleteUserAccount,
    exportDatabaseBackup,
  } = useShowroom();

  const isSuper = isSuperAdminUser(currentUser);
  const canCreateStaff = can('users.create_staff') || can('users.manage_invites');
  const canCreateAdmin = can('users.create_admin');
  const canAssignRoles = can('users.assign_role');
  const canToggleDisable = can('users.toggle_disable');
  const canDeleteUsers = can('users.delete');
  const canResetPasswords = can('users.reset_password');
  const canViewAuditLogs = can('audit.view');
  const canExportBackup = can('backup.export');
  const canManageInvites = can('users.manage_invites');

  // Create Account State
  const [accountType, setAccountType] = useState<'staff' | 'admin'>('staff');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('sales');
  const [designation, setDesignation] = useState('Sales Consultant');
  const [department, setDepartment] = useState('Sales');
  const [branch, setBranch] = useState('Colombo 03 Flagship');
  const [createLimits, setCreateLimits] = useState<SystemAdminLimits>({
    ...DEFAULT_RESTRICTED_ADMIN_LIMITS,
    allowedModules: ['dashboard', 'crm', 'inventory', 'admin'],
    canCreateStaff: true,
    maxAccountsCanCreate: 5,
  });
  const [useCustomStaffPerms, setUseCustomStaffPerms] = useState(false);
  const [createCustomPerms, setCreateCustomPerms] = useState<Permission[]>(
    Array.from(ROLE_PERMISSIONS.sales)
  );
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string; link?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters & Action Modals
  const [userFilter, setUserFilter] = useState<'all' | 'super_admin' | 'admin' | 'staff' | 'disabled'>('all');
  const [auditFilter, setAuditFilter] = useState<'all' | 'auth' | 'accounts' | 'permissions' | 'operations'>('all');
  const [editingUser, setEditingUser] = useState<UserSession | null>(null);
  const [editLimits, setEditLimits] = useState<SystemAdminLimits>({ ...DEFAULT_RESTRICTED_ADMIN_LIMITS });
  const [editPerms, setEditPerms] = useState<Permission[]>([]);
  const [resetTarget, setResetTarget] = useState<UserSession | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);
  const [actionBusyUid, setActionBusyUid] = useState<string | null>(null);

  const summary = useMemo(() => {
    const superAdmins = staffUsers.filter(u => u.role === 'super_admin' || isPermanentOwnerEmail(u.email));
    const systemAdmins = staffUsers.filter(u => u.role === 'admin' && !isPermanentOwnerEmail(u.email));
    const standardStaff = staffUsers.filter(
      u => u.role !== 'super_admin' && u.role !== 'admin' && !isPermanentOwnerEmail(u.email)
    );
    const pendingInvites = staffInvites.filter(i => i.status === 'Pending');
    const loginEvents = auditLogs.filter(l => l.action.startsWith('LOGIN_'));
    return { superAdmins, systemAdmins, standardStaff, pendingInvites, loginEvents };
  }, [staffUsers, staffInvites, auditLogs]);

  const filteredUsers = useMemo(() => {
    return staffUsers.filter(u => {
      const owner = u.role === 'super_admin' || isPermanentOwnerEmail(u.email);
      if (userFilter === 'super_admin') return owner;
      if (userFilter === 'admin') return u.role === 'admin' && !owner;
      if (userFilter === 'staff') return !owner && u.role !== 'admin';
      if (userFilter === 'disabled') return u.disabled;
      return true;
    });
  }, [staffUsers, userFilter]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const a = log.action || '';
      if (auditFilter === 'auth') return a.startsWith('LOGIN_') || a.includes('OWNER_SUPER_ADMIN');
      if (auditFilter === 'accounts') {
        return (
          a.includes('ACCOUNT_') ||
          a.includes('SYSTEM_ADMIN_') ||
          a.includes('ROLE_CHANGE') ||
          a.includes('INVITE')
        );
      }
      if (auditFilter === 'permissions') {
        return a.includes('PERMISSION_CHANGE') || a.includes('PASSWORD_RESET');
      }
      if (auditFilter === 'operations') {
        return (
          !a.startsWith('LOGIN_') &&
          !a.includes('ACCOUNT_') &&
          !a.includes('ROLE_CHANGE') &&
          !a.includes('PERMISSION_CHANGE') &&
          !a.includes('PASSWORD_RESET')
        );
      }
      return true;
    });
  }, [auditLogs, auditFilter]);

  const toggleCreateLimitModule = (mod: DealershipModule) => {
    setCreateLimits(prev => {
      const has = prev.allowedModules.includes(mod);
      const next = has
        ? prev.allowedModules.filter(m => m !== mod || m === 'dashboard')
        : [...prev.allowedModules, mod];
      return { ...prev, allowedModules: next };
    });
  };

  const toggleEditLimitModule = (mod: DealershipModule) => {
    setEditLimits(prev => {
      const has = prev.allowedModules.includes(mod);
      const nextMods = has
        ? prev.allowedModules.filter(m => m !== mod || m === 'dashboard')
        : [...prev.allowedModules, mod];
      const updated = { ...prev, allowedModules: nextMods };
      setEditPerms(buildPermissionsFromAdminLimits(updated));
      return updated;
    });
  };

  const handleAccountTypeChange = (type: 'staff' | 'admin') => {
    setAccountType(type);
    if (type === 'admin') {
      setRole('admin');
      setDesignation('System Administrator');
      setDepartment('IT & Governance');
    } else {
      setRole('sales');
      setDesignation(ROLE_LABELS.sales);
      setDepartment('Sales');
      setCreateCustomPerms(Array.from(ROLE_PERMISSIONS.sales));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!email.trim() || !fullName.trim()) return;

    const targetRole: UserRole = accountType === 'admin' ? 'admin' : role;
    setSubmitting(true);
    const res = await createAccount({
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      role: targetRole,
      ...(password.trim() ? { password: password.trim() } : {}),
      designation: designation.trim() || ROLE_LABELS[targetRole],
      department: department.trim() || 'Showroom Operations',
      branch: branch.trim() || 'Colombo 03 Flagship',
      ...(targetRole === 'admin' ? { adminLimits: createLimits } : {}),
      ...(targetRole !== 'admin' && useCustomStaffPerms ? { assignedPermissions: createCustomPerms } : {}),
    });
    setSubmitting(false);

    if (res.success) {
      setFeedback({
        type: 'ok',
        text: res.message || `Account provisioned for ${email.trim().toLowerCase()}.`,
      });
      setEmail('');
      setFullName('');
      setPassword('');
    } else {
      setFeedback({ type: 'err', text: res.error || 'Failed to create account.' });
    }
  };

  const openPermissionsEditor = (user: UserSession) => {
    setEditingUser(user);
    if (user.role === 'admin') {
      const baseLimits = user.adminLimits || DEFAULT_RESTRICTED_ADMIN_LIMITS;
      setEditLimits({
        ...baseLimits,
        allowedModules: [...(baseLimits.allowedModules || ['dashboard'])],
      });
      setEditPerms(Array.from(getEffectiveUserPermissions(user)));
    } else {
      setEditPerms(Array.from(getEffectiveUserPermissions(user)));
    }
  };

  const handleSavePermissions = async () => {
    if (!editingUser) return;
    setActionBusyUid(editingUser.uid);
    const payload =
      editingUser.role === 'admin'
        ? {
            adminLimits: editLimits,
            assignedPermissions: editPerms,
          }
        : {
            assignedPermissions: editPerms,
          };
    const res = await updateUserPermissions(editingUser.uid, payload);
    setActionBusyUid(null);
    if (res.success) {
      setFeedback({
        type: 'ok',
        text: `Updated ${editingUser.role === 'admin' ? 'System Admin limits & ' : ''}permissions for ${editingUser.email}.`,
      });
      setEditingUser(null);
    } else {
      setFeedback({ type: 'err', text: res.error || 'Failed to save permissions.' });
    }
  };

  const handleResetPasswordConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setActionBusyUid(resetTarget.uid);
    const res = await resetUserPassword(resetTarget, resetNewPassword.trim() || undefined);
    setActionBusyUid(null);
    if (res.success) {
      setFeedback({
        type: 'ok',
        text: res.message || `Password reset triggered for ${resetTarget.email}.`,
        link: res.resetLink,
      });
      setResetTarget(null);
      setResetNewPassword('');
    } else {
      setFeedback({ type: 'err', text: res.error || 'Password reset failed.' });
    }
  };

  const handleDeleteConfirm = async (targetUser: UserSession) => {
    setActionBusyUid(targetUser.uid);
    const res = await deleteUserAccount(targetUser);
    setActionBusyUid(null);
    setConfirmDeleteUid(null);
    if (res.success) {
      setFeedback({
        type: 'ok',
        text: res.message || `Account ${targetUser.email} deleted.`,
      });
    } else {
      setFeedback({ type: 'err', text: res.error || 'Failed to delete account.' });
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
            note: isSuper
              ? 'Full Super Administrator / Owner snapshot (includes all modules and HR payroll).'
              : 'HR Payroll collection (employees_payroll) is excluded unless explicitly permitted.',
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
            {isSuper ? <Crown className="w-4 h-4 text-amber-400" /> : <ShieldCheck className="w-4 h-4" />}
            <span>
              {isSuper
                ? 'Permanent Super Administrator / Owner Console'
                : 'Identity, Access Control & Governance'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            {isSuper
              ? 'Super Admin Dashboard — Users, System Admins & Audit Trail'
              : 'Staff Access Governance & Audit Trail'}
          </h1>
          <p className="text-xs text-stone-400 mt-1 max-w-3xl">
            {isSuper
              ? `Permanent Owner (${PERMANENT_SUPER_ADMIN_EMAIL}): full authority to create Staff Users and System Administrators, configure per-admin module & quota limits, reset passwords, activate/deactivate or delete accounts, and audit all sign-ins.`
              : 'Your administrative actions and module visibility are strictly governed by limits assigned by the Super Administrator.'}
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

      {/* Overview KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-[#18191d] border border-stone-800 rounded-xl p-4">
          <div className="text-[11px] text-stone-400 flex items-center justify-between">
            <span>Total Accounts</span>
            <Users className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">{staffUsers.length}</div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            {staffUsers.filter(u => !u.disabled).length} active · {staffUsers.filter(u => u.disabled).length} disabled
          </div>
        </div>

        <div className="bg-[#18191d] border border-amber-900/40 rounded-xl p-4">
          <div className="text-[11px] text-amber-300 flex items-center justify-between">
            <span>Super Admin / Owner</span>
            <Crown className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-1 font-mono">{summary.superAdmins.length}</div>
          <div className="text-[10px] text-stone-400 mt-0.5 truncate">{PERMANENT_SUPER_ADMIN_EMAIL}</div>
        </div>

        <div className="bg-[#18191d] border border-stone-800 rounded-xl p-4">
          <div className="text-[11px] text-stone-400 flex items-center justify-between">
            <span>System Admins</span>
            <UserCog className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">{summary.systemAdmins.length}</div>
          <div className="text-[10px] text-stone-500 mt-0.5">Bound by explicit limits</div>
        </div>

        <div className="bg-[#18191d] border border-stone-800 rounded-xl p-4">
          <div className="text-[11px] text-stone-400">Standard Staff</div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">{summary.standardStaff.length}</div>
          <div className="text-[10px] text-stone-500 mt-0.5">{summary.pendingInvites.length} pending invites</div>
        </div>

        <div className="bg-[#18191d] border border-stone-800 rounded-xl p-4">
          <div className="text-[11px] text-stone-400">Audited Sign-Ins</div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">{summary.loginEvents.length}</div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            {currentUser?.role === 'admin' && !isSuper
              ? `Your Quota: ${currentUser.accountsCreatedCount ?? 0}/${currentUser.adminLimits?.maxAccountsCanCreate ?? 0} created`
              : `${auditLogs.length} total audit entries`}
          </div>
        </div>
      </div>

      {/* Governance Notice */}
      <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-200">
        <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-300 block">
            {isSuper
              ? 'Permanent Main Owner Protection & Strict Integrity Active'
              : 'System Administrator Limits Active'}
          </span>
          <span className="text-stone-300">
            {isSuper
              ? `${PERMANENT_SUPER_ADMIN_EMAIL} is permanently locked as Super Administrator / Owner and cannot be deleted, demoted, deactivated, or restricted by any administrator—even across redeployments. All accounts still obey 1:1 bike allocation, payment idempotency, overpayment checks, delivery gates, and immutable audit logs.`
              : `Your access is limited to ${currentUser?.adminLimits?.allowedModules.length ?? 0} module(s). Account creations used: ${currentUser?.accountsCreatedCount ?? 0} / ${currentUser?.adminLimits?.maxAccountsCanCreate ?? 0}.`}
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex flex-col gap-1.5 ${
            feedback.type === 'ok'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/40 border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          {feedback.link && (
            <div className="bg-black/40 border border-emerald-900/60 rounded p-2 font-mono text-[10px] break-all text-emerald-300">
              Reset Link: {feedback.link}
            </div>
          )}
        </div>
      )}

      {/* Create Staff User OR System Administrator Form */}
      {(canCreateStaff || canCreateAdmin) && (
        <div className="bg-[#18191d] border border-stone-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-bold text-white">Create User or System Administrator Account</h2>
            </div>

            <div className="flex items-center gap-1 bg-[#121316] p-1 rounded-lg border border-stone-800 text-xs">
              {canCreateStaff && (
                <button
                  type="button"
                  onClick={() => handleAccountTypeChange('staff')}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    accountType === 'staff'
                      ? 'bg-[#9b1c1c] text-white'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Staff User
                </button>
              )}
              {canCreateAdmin && (
                <button
                  type="button"
                  onClick={() => handleAccountTypeChange('admin')}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    accountType === 'admin'
                      ? 'bg-sky-700 text-white'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  System Administrator
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-stone-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="user@idealnova.lk"
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
                  placeholder="Full Name"
                  className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-red-700"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1">
                  Initial Password <span className="text-stone-500">(optional — blank issues invite)</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 chars for immediate Auth user"
                  className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-red-700"
                />
              </div>

              {accountType === 'staff' ? (
                <div>
                  <label className="block text-stone-400 mb-1">Staff Role *</label>
                  <select
                    value={role}
                    onChange={e => {
                      const next = e.target.value as UserRole;
                      setRole(next);
                      setDesignation(ROLE_LABELS[next]);
                      setCreateCustomPerms(Array.from(ROLE_PERMISSIONS[next] || []));
                    }}
                    className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-red-700"
                  >
                    {STANDARD_STAFF_ROLES.map(r => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]} ({r})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-stone-400 mb-1">Role Tier</label>
                  <input
                    type="text"
                    readOnly
                    value="System Administrator (admin)"
                    className="w-full bg-[#121316] border border-sky-900/60 rounded-md px-3 py-2 text-sky-300 font-semibold"
                  />
                </div>
              )}

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
            </div>

            {/* System Administrator Limits Configuration */}
            {accountType === 'admin' && (
              <div className="bg-[#121316] border border-sky-900/50 rounded-xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider">
                      System Administrator Limits & Module Scope
                    </h3>
                    <p className="text-[11px] text-stone-400">
                      System Administrators only gain access to modules and capabilities explicitly checked below.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <label className="text-stone-300 font-semibold">Max Accounts Can Create:</label>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={createLimits.maxAccountsCanCreate}
                      onChange={e =>
                        setCreateLimits(prev => ({
                          ...prev,
                          maxAccountsCanCreate: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-20 bg-[#18191d] border border-stone-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-stone-300 mb-2">Allowed Dealership Modules</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {DEALERSHIP_MODULES.map(mod => {
                      const checked = createLimits.allowedModules.includes(mod.id);
                      return (
                        <label
                          key={mod.id}
                          className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer ${
                            checked
                              ? 'bg-sky-950/30 border-sky-800/80 text-white'
                              : 'bg-[#18191d] border-stone-800 text-stone-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={mod.id === 'dashboard'}
                            onChange={() => toggleCreateLimitModule(mod.id)}
                            className="mt-0.5 accent-sky-500"
                          />
                          <div>
                            <div className="font-semibold leading-tight">{mod.label}</div>
                            <div className="text-[10px] text-stone-500">{mod.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-stone-300 mb-2">Administrative Capabilities</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                    {[
                      { key: 'canCreateStaff', label: 'Can create staff users' },
                      { key: 'canCreateSystemAdmins', label: 'Can create System Admins' },
                      { key: 'canDeleteUsers', label: 'Can delete user accounts' },
                      { key: 'canResetPasswords', label: 'Can reset passwords' },
                      { key: 'canViewAuditLogs', label: 'Can view audit logs' },
                      { key: 'canAssignPermissions', label: 'Can assign roles/status' },
                      { key: 'canExportBackup', label: 'Can export JSON backups' },
                    ].map(flag => {
                      const k = flag.key as keyof SystemAdminLimits;
                      const val = Boolean(createLimits[k]);
                      return (
                        <label
                          key={flag.key}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                            val
                              ? 'bg-emerald-950/30 border-emerald-800/70 text-emerald-200'
                              : 'bg-[#18191d] border-stone-800 text-stone-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={val}
                            onChange={e =>
                              setCreateLimits(prev => ({
                                ...prev,
                                [k]: e.target.checked,
                              }))
                            }
                            className="accent-emerald-500"
                          />
                          <span>{flag.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Optional Custom Per-User Permissions for Staff */}
            {accountType === 'staff' && (
              <div className="bg-[#121316] border border-stone-800 rounded-xl p-3.5 space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-stone-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomStaffPerms}
                    onChange={e => setUseCustomStaffPerms(e.target.checked)}
                    className="accent-red-600"
                  />
                  <span>Customize granular module permissions for this Staff user (instead of standard role defaults)</span>
                </label>

                {useCustomStaffPerms && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-stone-800">
                    {DEALERSHIP_MODULES.filter(m => m.id !== 'admin').map(mod => (
                      <div key={mod.id} className="bg-[#18191d] border border-stone-800 rounded-lg p-2.5 space-y-1.5">
                        <div className="text-[11px] font-bold text-stone-200">{mod.label}</div>
                        <div className="space-y-1">
                          {mod.permissions.map(p => (
                            <label key={p} className="flex items-center gap-1.5 text-[11px] text-stone-400 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={createCustomPerms.includes(p)}
                                onChange={e => {
                                  setCreateCustomPerms(prev =>
                                    e.target.checked ? Array.from(new Set([...prev, p])) : prev.filter(x => x !== p)
                                  );
                                }}
                                className="accent-red-600"
                              />
                              <span className="font-mono">{p}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="text-[11px] text-stone-500">
                Leave password blank to pre-approve for Google Sign-In / first-login activation; enter a password to provision Firebase Auth immediately (requires server Admin SDK).
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="py-2 px-5 bg-[#9b1c1c] hover:bg-[#b91c1c] disabled:opacity-50 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                {submitting
                  ? 'Provisioning...'
                  : accountType === 'admin'
                  ? 'Create System Administrator'
                  : 'Create Staff Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users & Administrators Table */}
      <div className="bg-[#18191d] border border-stone-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141518]">
          <h3 className="text-sm font-bold text-white">
            All Users & Administrators ({filteredUsers.length})
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {[
              { id: 'all', label: `All (${staffUsers.length})` },
              { id: 'super_admin', label: `Super Admins (${summary.superAdmins.length})` },
              { id: 'admin', label: `System Admins (${summary.systemAdmins.length})` },
              { id: 'staff', label: `Staff (${summary.standardStaff.length})` },
              { id: 'disabled', label: `Disabled (${staffUsers.filter(u => u.disabled).length})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setUserFilter(tab.id as typeof userFilter)}
                className={`px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer ${
                  userFilter === tab.id
                    ? 'bg-[#9b1c1c] border-red-800 text-white'
                    : 'bg-[#121316] border-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121316] text-[10px] uppercase text-stone-400 border-b border-stone-800">
              <tr>
                <th className="py-3 px-4">Account Holder</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Permissions & Limits</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Governance Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/70">
              {filteredUsers.map(u => {
                const isSelf = u.uid === currentUser?.uid;
                const isPermanentOwner = isPermanentOwnerEmail(u.email) || Boolean(u.isPermanentOwner);
                const isTargetSuper = u.role === 'super_admin' || isPermanentOwner;
                const canManageTarget = !isPermanentOwner && (!isTargetSuper || isSuper);
                const activeOwners = staffUsers.filter(s => s.role === 'super_admin' && !s.disabled);
                const isLastActiveOwner = isTargetSuper && !u.disabled && activeOwners.length <= 1;
                const assignableRoles = getAssignableRoles(currentUser);
                const effectiveCount = getEffectiveUserPermissions(u).size;

                return (
                  <tr key={u.uid} className="hover:bg-stone-800/30">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                        <span>{u.fullName}</span>
                        {isSelf && <span className="text-[10px] text-amber-400">(You)</span>}
                        {isPermanentOwner && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-950/70 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded font-bold">
                            <Crown className="w-2.5 h-2.5" />
                            Permanent Main Owner
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {u.designation} · {u.department}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-stone-300">{u.email}</td>

                    <td className="py-3 px-4">
                      {canAssignRoles && !isSelf && canManageTarget && !isLastActiveOwner && (u.role !== 'admin' || isSuper) ? (
                        <select
                          value={u.role}
                          onChange={e =>
                            updateStaffRoleOrStatus(u.uid, { role: e.target.value as UserRole })
                          }
                          className="bg-[#121316] border border-stone-700 rounded px-2 py-1 text-xs text-stone-100"
                        >
                          {assignableRoles.map(r => (
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

                    <td className="py-3 px-4 text-[11px] text-stone-300">
                      {isTargetSuper ? (
                        <span className="text-amber-300 font-semibold">Full Access ({ALL_PERMISSIONS.length} perms)</span>
                      ) : u.role === 'admin' ? (
                        <div className="space-y-0.5">
                          <div className="text-sky-300 font-semibold">
                            {u.adminLimits?.allowedModules.length ?? 0} modules · Quota{' '}
                            {u.accountsCreatedCount ?? 0}/{u.adminLimits?.maxAccountsCanCreate ?? 0}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {[
                              u.adminLimits?.canCreateStaff && 'CreateStaff',
                              u.adminLimits?.canCreateSystemAdmins && 'CreateAdmins',
                              u.adminLimits?.canDeleteUsers && 'DeleteUsers',
                              u.adminLimits?.canResetPasswords && 'ResetPW',
                              u.adminLimits?.canViewAuditLogs && 'AuditLogs',
                              u.adminLimits?.canExportBackup && 'Backup',
                            ]
                              .filter(Boolean)
                              .join(', ') || 'No elevated admin flags'}
                          </div>
                        </div>
                      ) : (
                        <span>
                          {Array.isArray(u.assignedPermissions)
                            ? `Custom (${u.assignedPermissions.length} perms)`
                            : `Role Default (${effectiveCount} perms)`}
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
                        {u.disabled ? 'Deactivated' : 'Active'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {isPermanentOwner ? (
                        <span className="text-[11px] text-amber-400 font-semibold italic">
                          Protected Permanent Owner
                        </span>
                      ) : isSelf ? (
                        <span className="text-[11px] text-stone-500 italic">Active Session</span>
                      ) : !canManageTarget ? (
                        <span className="text-[11px] text-amber-400/80 italic">Super Admin Protected</span>
                      ) : (
                        <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                          {(isSuper || (canAssignRoles && u.role !== 'admin')) && (
                            <button
                              type="button"
                              onClick={() => openPermissionsEditor(u)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-[11px] font-medium cursor-pointer"
                            >
                              <SlidersHorizontal className="w-3 h-3 text-sky-400" />
                              <span>{u.role === 'admin' ? 'Limits' : 'Perms'}</span>
                            </button>
                          )}

                          {canResetPasswords && (
                            <button
                              type="button"
                              onClick={() => {
                                setResetTarget(u);
                                setResetNewPassword('');
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 text-[11px] font-medium cursor-pointer"
                            >
                              <KeyRound className="w-3 h-3 text-amber-400" />
                              <span>Reset PW</span>
                            </button>
                          )}

                          {canToggleDisable && !isLastActiveOwner && (
                            <button
                              type="button"
                              onClick={() =>
                                updateStaffRoleOrStatus(u.uid, { disabled: !u.disabled })
                              }
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                                u.disabled
                                  ? 'bg-emerald-900/70 hover:bg-emerald-800 text-emerald-200'
                                  : 'bg-amber-950/70 hover:bg-amber-900 text-amber-200 border border-amber-800/60'
                              }`}
                            >
                              <Ban className="w-3 h-3" />
                              <span>{u.disabled ? 'Activate' : 'Deactivate'}</span>
                            </button>
                          )}

                          {canDeleteUsers && !isLastActiveOwner && (
                            confirmDeleteUid === u.uid ? (
                              <span className="inline-flex items-center gap-1 bg-rose-950 border border-rose-700 px-2 py-0.5 rounded">
                                <button
                                  type="button"
                                  disabled={actionBusyUid === u.uid}
                                  onClick={() => handleDeleteConfirm(u)}
                                  className="text-[11px] font-bold text-rose-200 hover:text-white cursor-pointer"
                                >
                                  {actionBusyUid === u.uid ? 'Deleting...' : 'Confirm Delete'}
                                </button>
                                <span className="text-stone-600">|</span>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteUid(null)}
                                  className="text-[11px] text-stone-400 hover:text-white cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteUid(u.uid)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-[11px] font-semibold cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-stone-500">
                    No matching accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Invites Queue */}
      {(canManageInvites || canCreateStaff || canCreateAdmin) && (
        <div className="bg-[#18191d] border border-stone-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-800 bg-[#141518]">
            <h3 className="text-sm font-bold text-white">
              Staff & System Admin Invitations ({staffInvites.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121316] text-[10px] uppercase text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Assigned Role</th>
                  <th className="py-2.5 px-4">Scope / Limits</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/70">
                {staffInvites.map(inv => (
                  <tr key={inv.id}>
                    <td className="py-2.5 px-4 font-mono text-stone-200">{inv.email}</td>
                    <td className="py-2.5 px-4 text-stone-300">{inv.fullName}</td>
                    <td className="py-2.5 px-4 text-stone-300">{ROLE_LABELS[inv.role] || inv.role}</td>
                    <td className="py-2.5 px-4 text-[11px] text-stone-400">
                      {inv.adminLimits
                        ? `${inv.adminLimits.allowedModules.length} modules · Max ${inv.adminLimits.maxAccountsCanCreate} accts`
                        : inv.assignedPermissions
                        ? `Custom (${inv.assignedPermissions.length} perms)`
                        : 'Role Default'}
                    </td>
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
                    <td className="py-2.5 px-4 text-right">
                      {inv.status === 'Pending' && canManageInvites && (
                        <button
                          type="button"
                          onClick={() => revokeInvite(inv.email)}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {staffInvites.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-5 text-center text-stone-500">
                      No invitations issued yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Immutable Audit Trail */}
      {canViewAuditLogs && (
        <div className="bg-[#18191d] border border-stone-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-800 bg-[#141518] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileClock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Immutable Security, Login & Business Audit Log ({filteredLogs.length})
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {[
                { id: 'all', label: 'All Events' },
                { id: 'auth', label: 'Logins & Owner' },
                { id: 'accounts', label: 'Accounts & Roles' },
                { id: 'permissions', label: 'Permissions & Resets' },
                { id: 'operations', label: 'Dealership Ops' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAuditFilter(tab.id as typeof auditFilter)}
                  className={`px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer ${
                    auditFilter === tab.id
                      ? 'bg-amber-900/50 border-amber-700 text-amber-200'
                      : 'bg-[#121316] border-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121316] text-[10px] uppercase text-stone-400 border-b border-stone-800 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Target Record</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {filteredLogs.slice(0, 150).map(log => (
                  <tr key={log.id} className="hover:bg-stone-800/30">
                    <td className="py-2.5 px-4 text-[11px] text-stone-400 whitespace-nowrap">
                      {formatAuditTime(log.createdAt)}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-amber-300 font-semibold whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-4 text-stone-200">{log.actorEmail}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-stone-400">
                      {log.actorRole}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-stone-300">
                      {log.collection}/{log.recordId}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[10px] text-stone-400 max-w-sm truncate">
                      {log.changes ? JSON.stringify(log.changes) : '—'}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-stone-500">
                      No matching audit log entries recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit System Admin Limits / Per-User Permissions Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#18191d] border border-stone-700 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-800 flex items-center justify-between bg-[#141518]">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {editingUser.role === 'admin'
                    ? `Configure System Administrator Limits — ${editingUser.fullName}`
                    : `Configure User Permissions — ${editingUser.fullName}`}
                </h3>
                <p className="text-[11px] text-stone-400 font-mono">{editingUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-stone-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {editingUser.role === 'admin' && (
                <>
                  <div className="flex items-center justify-between bg-[#121316] border border-stone-800 rounded-lg p-3">
                    <div>
                      <div className="font-bold text-stone-200">Account Creation Quota</div>
                      <div className="text-[11px] text-stone-400">
                        Currently used: {editingUser.accountsCreatedCount ?? 0} account(s)
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-stone-300">Max Accounts Allowed:</label>
                      <input
                        type="number"
                        min={0}
                        max={500}
                        value={editLimits.maxAccountsCanCreate}
                        onChange={e =>
                          setEditLimits(prev => ({
                            ...prev,
                            maxAccountsCanCreate: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className="w-24 bg-[#18191d] border border-stone-700 rounded px-2.5 py-1 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="font-bold text-sky-300 uppercase text-[11px] mb-2">
                      Allowed Modules
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {DEALERSHIP_MODULES.map(mod => {
                        const checked = editLimits.allowedModules.includes(mod.id);
                        return (
                          <label
                            key={mod.id}
                            className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer ${
                              checked
                                ? 'bg-sky-950/30 border-sky-800 text-white'
                                : 'bg-[#121316] border-stone-800 text-stone-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={mod.id === 'dashboard'}
                              onChange={() => toggleEditLimitModule(mod.id)}
                              className="mt-0.5 accent-sky-500"
                            />
                            <div>
                              <div className="font-semibold">{mod.label}</div>
                              <div className="text-[10px] text-stone-500">{mod.description}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="font-bold text-emerald-300 uppercase text-[11px] mb-2">
                      Administrative Action Flags
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {[
                        { key: 'canCreateStaff', label: 'Can create staff users' },
                        { key: 'canCreateSystemAdmins', label: 'Can create System Admins' },
                        { key: 'canDeleteUsers', label: 'Can delete user accounts' },
                        { key: 'canResetPasswords', label: 'Can reset passwords' },
                        { key: 'canViewAuditLogs', label: 'Can view audit logs' },
                        { key: 'canAssignPermissions', label: 'Can assign roles/status' },
                        { key: 'canExportBackup', label: 'Can export JSON backups' },
                      ].map(flag => {
                        const k = flag.key as keyof SystemAdminLimits;
                        const val = Boolean(editLimits[k]);
                        return (
                          <label
                            key={flag.key}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                              val
                                ? 'bg-emerald-950/30 border-emerald-800 text-emerald-200'
                                : 'bg-[#121316] border-stone-800 text-stone-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={val}
                              onChange={e => {
                                const next = { ...editLimits, [k]: e.target.checked };
                                setEditLimits(next);
                                setEditPerms(buildPermissionsFromAdminLimits(next));
                              }}
                              className="accent-emerald-500"
                            />
                            <span>{flag.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-stone-200 uppercase text-[11px]">
                    Granular Effective Permissions ({editPerms.length})
                  </div>
                  {editingUser.role !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => setEditPerms(Array.from(ROLE_PERMISSIONS[editingUser.role] || []))}
                      className="text-[11px] text-amber-300 hover:underline cursor-pointer"
                    >
                      Reset to {ROLE_LABELS[editingUser.role]} defaults
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {DEALERSHIP_MODULES.map(mod => (
                    <div key={mod.id} className="bg-[#121316] border border-stone-800 rounded-lg p-2.5 space-y-1">
                      <div className="text-[11px] font-bold text-stone-300">{mod.label}</div>
                      {mod.permissions
                        .filter(p => !SUPER_ADMIN_ONLY_PERMISSIONS.has(p))
                        .map(p => (
                          <label key={p} className="flex items-center gap-1.5 text-[11px] text-stone-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editPerms.includes(p)}
                              onChange={e =>
                                setEditPerms(prev =>
                                  e.target.checked ? Array.from(new Set([...prev, p])) : prev.filter(x => x !== p)
                                )
                              }
                              className="accent-red-600"
                            />
                            <span className="font-mono">{p}</span>
                          </label>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-stone-800 bg-[#141518] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-1.5 rounded-md border border-stone-700 text-stone-300 hover:text-white text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusyUid === editingUser.uid}
                onClick={handleSavePermissions}
                className="px-4 py-1.5 rounded-md bg-[#9b1c1c] hover:bg-[#b91c1c] text-white text-xs font-semibold cursor-pointer"
              >
                {actionBusyUid === editingUser.uid ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleResetPasswordConfirm}
            className="bg-[#18191d] border border-stone-700 rounded-xl max-w-md w-full overflow-hidden text-xs"
          >
            <div className="px-5 py-3.5 border-b border-stone-800 flex items-center justify-between bg-[#141518]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Reset Password</span>
              </h3>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="text-stone-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-stone-300">
                Target account: <span className="font-mono text-white">{resetTarget.email}</span>
              </div>
              <div>
                <label className="block text-stone-400 mb-1">
                  New Password (optional — leave blank to send Firebase Password Reset Email/Link)
                </label>
                <input
                  type="password"
                  value={resetNewPassword}
                  onChange={e => setResetNewPassword(e.target.value)}
                  placeholder="Min 6 chars (server Admin SDK) or leave blank"
                  className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-stone-800 bg-[#141518] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="px-4 py-1.5 rounded-md border border-stone-700 text-stone-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionBusyUid === resetTarget.uid}
                className="px-4 py-1.5 rounded-md bg-amber-700 hover:bg-amber-600 text-white font-semibold cursor-pointer"
              >
                {actionBusyUid === resetTarget.uid
                  ? 'Processing...'
                  : resetNewPassword.trim()
                  ? 'Set Password'
                  : 'Send Reset Email / Link'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
