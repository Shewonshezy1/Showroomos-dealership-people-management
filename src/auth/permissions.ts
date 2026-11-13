/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DealershipModule, SystemAdminLimits, UserRole, UserSession } from '../types/index.ts';

export const PERMANENT_SUPER_ADMIN_EMAIL = 'shewonshezy12@gmail.com';

export type Permission =
  | 'users.read'
  | 'users.manage_invites'
  | 'users.create_staff'
  | 'users.create_admin'
  | 'users.assign_role'
  | 'users.assign_super_admin'
  | 'users.toggle_disable'
  | 'users.reset_password'
  | 'users.delete'
  | 'audit.view'
  | 'backup.export'
  | 'backup.restore'
  | 'settings.manage'
  | 'dashboard.view'
  | 'reports.view'
  | 'crm.read'
  | 'crm.write'
  | 'testrides.read'
  | 'testrides.write'
  | 'inventory.bikes.read'
  | 'inventory.bikes.write'
  | 'inventory.accessories.read'
  | 'inventory.accessories.write'
  | 'bookings.read'
  | 'bookings.create'
  | 'bookings.attach_accessories'
  | 'bookings.cancel'
  | 'discounts.request'
  | 'discounts.approve'
  | 'payments.read'
  | 'payments.record_unverified'
  | 'payments.verify'
  | 'payments.reverse'
  | 'tradein.read'
  | 'tradein.create_estimate'
  | 'tradein.inspect'
  | 'tradein.approve'
  | 'delivery.read'
  | 'delivery.checklist_pdi'
  | 'delivery.complete_handover'
  | 'service.read'
  | 'service.write'
  | 'hr.directory.read'
  | 'hr.directory.write'
  | 'hr.leaves.read'
  | 'hr.leaves.decide'
  | 'hr.attendance.write'
  | 'hr.payroll.read'
  | 'hr.payroll.write';

export const ALL_PERMISSIONS: readonly Permission[] = [
  'users.read',
  'users.manage_invites',
  'users.create_staff',
  'users.create_admin',
  'users.assign_role',
  'users.assign_super_admin',
  'users.toggle_disable',
  'users.reset_password',
  'users.delete',
  'audit.view',
  'backup.export',
  'backup.restore',
  'settings.manage',
  'dashboard.view',
  'reports.view',
  'crm.read',
  'crm.write',
  'testrides.read',
  'testrides.write',
  'inventory.bikes.read',
  'inventory.bikes.write',
  'inventory.accessories.read',
  'inventory.accessories.write',
  'bookings.read',
  'bookings.create',
  'bookings.attach_accessories',
  'bookings.cancel',
  'discounts.request',
  'discounts.approve',
  'payments.read',
  'payments.record_unverified',
  'payments.verify',
  'payments.reverse',
  'tradein.read',
  'tradein.create_estimate',
  'tradein.inspect',
  'tradein.approve',
  'delivery.read',
  'delivery.checklist_pdi',
  'delivery.complete_handover',
  'service.read',
  'service.write',
  'hr.directory.read',
  'hr.directory.write',
  'hr.leaves.read',
  'hr.leaves.decide',
  'hr.attendance.write',
  'hr.payroll.read',
  'hr.payroll.write',
] as const;

export const SUPER_ADMIN_ONLY_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  'users.assign_super_admin',
  'backup.restore',
  'settings.manage',
]);

export interface DealershipModuleSpec {
  id: DealershipModule;
  label: string;
  description: string;
  permissions: readonly Permission[];
}

export const DEALERSHIP_MODULES: readonly DealershipModuleSpec[] = [
  {
    id: 'dashboard',
    label: 'Management Dashboard',
    description: 'Executive overview and reconciled KPIs',
    permissions: ['dashboard.view'],
  },
  {
    id: 'crm',
    label: 'CRM & Sales Leads',
    description: 'Customer pipeline, calls, follow-ups, quotations',
    permissions: ['crm.read', 'crm.write'],
  },
  {
    id: 'testrides',
    label: 'Test Rides',
    description: 'Schedule test rides and log customer feedback',
    permissions: ['testrides.read', 'testrides.write'],
  },
  {
    id: 'inventory',
    label: 'Motorcycle Inventory',
    description: 'Chassis/engine stock units and arrivals',
    permissions: ['inventory.bikes.read', 'inventory.bikes.write'],
  },
  {
    id: 'accessories',
    label: 'Accessories & Parts',
    description: 'Genuine accessories catalog & booking fitments',
    permissions: ['inventory.accessories.read', 'inventory.accessories.write', 'bookings.attach_accessories'],
  },
  {
    id: 'bookings',
    label: 'Bookings & Discounts',
    description: 'Bike allocations, cancellations, discount approvals',
    permissions: ['bookings.read', 'bookings.create', 'bookings.cancel', 'discounts.request', 'discounts.approve'],
  },
  {
    id: 'payments',
    label: 'Payments & Cashier Ledger',
    description: 'Record receipts, verify payments, immutable reversals',
    permissions: ['payments.read', 'payments.record_unverified', 'payments.verify', 'payments.reverse'],
  },
  {
    id: 'tradein',
    label: 'Trade-In / Bike Exchange',
    description: 'Valuations, inspections, and credit approvals',
    permissions: ['tradein.read', 'tradein.create_estimate', 'tradein.inspect', 'tradein.approve'],
  },
  {
    id: 'delivery',
    label: 'PDI & Delivery Handover',
    description: 'Pre-delivery checklist and final bike handover',
    permissions: ['delivery.read', 'delivery.checklist_pdi', 'delivery.complete_handover'],
  },
  {
    id: 'service',
    label: 'Workshop & Service Bay',
    description: 'Workshop job cards and service scheduling',
    permissions: ['service.read', 'service.write', 'delivery.checklist_pdi'],
  },
  {
    id: 'financing',
    label: 'Leasing & EMI Estimator',
    description: 'Illustrative financing plans for bookings & leads',
    permissions: ['bookings.read', 'crm.read'],
  },
  {
    id: 'hr',
    label: 'HR, Leave & Attendance',
    description: 'Staff roster, leave approvals, floor attendance',
    permissions: ['hr.directory.read', 'hr.directory.write', 'hr.leaves.read', 'hr.leaves.decide', 'hr.attendance.write'],
  },
  {
    id: 'payroll',
    label: 'Employee Payroll (Confidential)',
    description: 'Salary figures, allowances, incentives & deductions',
    permissions: ['hr.payroll.read', 'hr.payroll.write'],
  },
  {
    id: 'reports',
    label: 'Reports & CSV Audits',
    description: 'Reconciliation exports and operational summaries',
    permissions: ['reports.view'],
  },
  {
    id: 'admin',
    label: 'User & Access Console',
    description: 'View staff accounts and governance console',
    permissions: ['users.read'],
  },
] as const;

export const DEFAULT_RESTRICTED_ADMIN_LIMITS: SystemAdminLimits = {
  allowedModules: ['dashboard', 'admin'],
  canCreateStaff: false,
  canCreateSystemAdmins: false,
  maxAccountsCanCreate: 0,
  canDeleteUsers: false,
  canResetPasswords: false,
  canViewAuditLogs: false,
  canAssignPermissions: false,
  canExportBackup: false,
};

export const ALL_STAFF_ROLES: readonly UserRole[] = [
  'super_admin',
  'admin',
  'general_manager',
  'sales',
  'finance',
  'hr',
  'service',
  'stock',
] as const;

/** Roles that can be issued via email invitations or managed by limited admins (super_admin is never invitable). */
export const INVITABLE_STAFF_ROLES: readonly UserRole[] = [
  'admin',
  'general_manager',
  'sales',
  'finance',
  'hr',
  'service',
  'stock',
] as const;

export const STANDARD_STAFF_ROLES: readonly UserRole[] = [
  'general_manager',
  'sales',
  'finance',
  'hr',
  'service',
  'stock',
] as const;

export function isPermanentOwnerEmail(email: string | undefined | null): boolean {
  return (email || '').trim().toLowerCase() === PERMANENT_SUPER_ADMIN_EMAIL;
}

export function isSuperAdminUser(user: UserSession | null | undefined): boolean {
  if (!user || user.disabled) return false;
  return user.role === 'super_admin' || isPermanentOwnerEmail(user.email);
}

export function getAssignableRoles(actor: UserSession | UserRole | undefined | null): readonly UserRole[] {
  if (!actor) return [];
  if (typeof actor === 'string') {
    if (actor === 'super_admin') return ALL_STAFF_ROLES;
    if (actor === 'admin') return STANDARD_STAFF_ROLES;
    return [];
  }
  if (isSuperAdminUser(actor)) return ALL_STAFF_ROLES;
  if (actor.role === 'admin' && actor.adminLimits?.canAssignPermissions) {
    return actor.adminLimits.canCreateSystemAdmins ? INVITABLE_STAFF_ROLES : STANDARD_STAFF_ROLES;
  }
  return [];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Administrator / Owner',
  admin: 'System Administrator',
  general_manager: 'General Manager',
  sales: 'Sales Consultant',
  finance: 'Finance & Cashier',
  hr: 'HR & People Ops',
  service: 'Service & PDI',
  stock: 'Inventory & Stock',
};

export const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  super_admin: new Set<Permission>(ALL_PERMISSIONS),
  // System Administrator base defaults are minimal; actual access comes strictly from explicit Super Admin grants
  admin: new Set<Permission>(['dashboard.view', 'users.read']),
  general_manager: new Set<Permission>([
    'dashboard.view',
    'users.read',
    'audit.view',
    'reports.view',
    'crm.read',
    'crm.write',
    'testrides.read',
    'testrides.write',
    'inventory.bikes.read',
    'inventory.bikes.write',
    'inventory.accessories.read',
    'inventory.accessories.write',
    'bookings.read',
    'bookings.create',
    'bookings.attach_accessories',
    'bookings.cancel',
    'discounts.request',
    'discounts.approve',
    'payments.read',
    'tradein.read',
    'tradein.create_estimate',
    'tradein.approve',
    'delivery.read',
    'delivery.checklist_pdi',
    'delivery.complete_handover',
    'service.read',
    'service.write',
    'hr.directory.read',
    'hr.leaves.read',
    'hr.leaves.decide',
  ]),
  sales: new Set<Permission>([
    'dashboard.view',
    'crm.read',
    'crm.write',
    'testrides.read',
    'testrides.write',
    'inventory.bikes.read',
    'inventory.accessories.read',
    'bookings.read',
    'bookings.create',
    'bookings.attach_accessories',
    'bookings.cancel',
    'discounts.request',
    'payments.read',
    'payments.record_unverified',
    'tradein.read',
    'tradein.create_estimate',
    'delivery.read',
  ]),
  finance: new Set<Permission>([
    'dashboard.view',
    'audit.view',
    'reports.view',
    'inventory.bikes.read',
    'inventory.accessories.read',
    'bookings.read',
    'bookings.cancel',
    'discounts.approve',
    'payments.read',
    'payments.record_unverified',
    'payments.verify',
    'payments.reverse',
    'tradein.read',
    'tradein.approve',
    'delivery.read',
  ]),
  hr: new Set<Permission>([
    'dashboard.view',
    'users.read',
    'hr.directory.read',
    'hr.directory.write',
    'hr.leaves.read',
    'hr.leaves.decide',
    'hr.attendance.write',
    'hr.payroll.read',
    'hr.payroll.write',
  ]),
  service: new Set<Permission>([
    'dashboard.view',
    'inventory.bikes.read',
    'inventory.accessories.read',
    'testrides.read',
    'testrides.write',
    'bookings.read',
    'tradein.read',
    'tradein.inspect',
    'delivery.read',
    'delivery.checklist_pdi',
    'delivery.complete_handover',
    'service.read',
    'service.write',
  ]),
  stock: new Set<Permission>([
    'dashboard.view',
    'reports.view',
    'inventory.bikes.read',
    'inventory.bikes.write',
    'inventory.accessories.read',
    'inventory.accessories.write',
    'bookings.read',
    'bookings.attach_accessories',
    'delivery.read',
    'service.read',
  ]),
};

/**
 * Derives the exact permission list for a System Administrator from explicit Super Admin limits.
 */
export function buildPermissionsFromAdminLimits(limits: SystemAdminLimits): Permission[] {
  const perms = new Set<Permission>(['dashboard.view']);
  const allowedMods = new Set(limits.allowedModules || []);

  for (const mod of DEALERSHIP_MODULES) {
    if (allowedMods.has(mod.id)) {
      for (const p of mod.permissions) {
        perms.add(p);
      }
    }
  }

  if (limits.canCreateStaff) {
    perms.add('users.read');
    perms.add('users.manage_invites');
    perms.add('users.create_staff');
  }
  if (limits.canCreateSystemAdmins) {
    perms.add('users.read');
    perms.add('users.manage_invites');
    perms.add('users.create_admin');
  }
  if (limits.canAssignPermissions) {
    perms.add('users.read');
    perms.add('users.assign_role');
    perms.add('users.toggle_disable');
  }
  if (limits.canDeleteUsers) {
    perms.add('users.read');
    perms.add('users.delete');
  }
  if (limits.canResetPasswords) {
    perms.add('users.read');
    perms.add('users.reset_password');
  }
  if (limits.canViewAuditLogs) {
    perms.add('audit.view');
  }
  if (limits.canExportBackup) {
    perms.add('backup.export');
  }

  return Array.from(perms);
}

/**
 * Computes effective permissions for an authenticated staff member, taking into account:
 * - Permanent Main Owner / Super Admin (`Shewonshezy12@gmail.com` or `super_admin`)
 * - System Administrator (`admin`) explicit limits & module grants
 * - Standard Staff (`STAFF / USER`) per-user assigned permissions or role defaults
 */
export function getEffectiveUserPermissions(user: UserSession | null | undefined): ReadonlySet<Permission> {
  if (!user || user.disabled) return new Set<Permission>();

  if (isSuperAdminUser(user)) {
    return new Set<Permission>(ALL_PERMISSIONS);
  }

  if (user.role === 'admin') {
    const limits = user.adminLimits || DEFAULT_RESTRICTED_ADMIN_LIMITS;
    const fromLimits = buildPermissionsFromAdminLimits(limits);
    const out = new Set<Permission>(fromLimits);

    // If explicit fine-grained assignedPermissions were configured on top of limits, apply non-owner grants
    // while strictly keeping action limits (create/delete/reset/audit) gated by adminLimits flags.
    if (Array.isArray(user.assignedPermissions)) {
      const explicit = new Set(user.assignedPermissions as Permission[]);
      // Allow explicit removal of module/extra perms, or explicit addition of safe non-owner module perms
      for (const p of Array.from(out)) {
        if (!explicit.has(p) && p !== 'dashboard.view') {
          out.delete(p);
        }
      }
      for (const p of explicit) {
        if (SUPER_ADMIN_ONLY_PERMISSIONS.has(p)) continue;
        if (p === 'users.create_staff' && !limits.canCreateStaff) continue;
        if (p === 'users.create_admin' && !limits.canCreateSystemAdmins) continue;
        if (p === 'users.delete' && !limits.canDeleteUsers) continue;
        if (p === 'users.reset_password' && !limits.canResetPasswords) continue;
        if (p === 'audit.view' && !limits.canViewAuditLogs) continue;
        if (p === 'users.assign_role' && !limits.canAssignPermissions) continue;
        if (p === 'backup.export' && !limits.canExportBackup) continue;
        out.add(p);
      }
    }
    return out;
  }

  // Standard Staff / User
  if (Array.isArray(user.assignedPermissions)) {
    const allowed = new Set<Permission>();
    for (const raw of user.assignedPermissions) {
      const p = raw as Permission;
      if (!ALL_PERMISSIONS.includes(p)) continue;
      if (
        SUPER_ADMIN_ONLY_PERMISSIONS.has(p) ||
        p === 'users.create_admin' ||
        p === 'users.delete' ||
        p === 'users.assign_role'
      ) {
        continue;
      }
      allowed.add(p);
    }
    return allowed;
  }

  return ROLE_PERMISSIONS[user.role] || new Set<Permission>();
}

export function hasUserPermission(user: UserSession | null | undefined, permission: Permission): boolean {
  return getEffectiveUserPermissions(user).has(permission);
}

export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  return Boolean(perms && perms.has(permission));
}

function checkViewByPerm(has: (p: Permission) => boolean, view: string): boolean {
  switch (view) {
    case 'dashboard':
      return has('dashboard.view');
    case 'crm':
      return has('crm.read');
    case 'inventory':
      return has('inventory.bikes.read');
    case 'bookings':
      return has('bookings.read') || has('payments.read');
    case 'delivery':
      return has('delivery.read');
    case 'accessories':
      return has('inventory.accessories.read');
    case 'testrides':
      return has('testrides.read');
    case 'tradein':
      return has('tradein.read');
    case 'financing':
      return has('crm.read') || has('bookings.read');
    case 'hr':
      return has('hr.directory.read') || has('hr.leaves.read') || has('hr.payroll.read');
    case 'service':
      return has('service.read');
    case 'reports':
      return has('reports.view');
    case 'admin':
      return (
        has('users.read') ||
        has('users.manage_invites') ||
        has('users.create_staff') ||
        has('users.create_admin') ||
        has('audit.view')
      );
    default:
      return false;
  }
}

export function canUserAccessView(user: UserSession | null | undefined, view: string): boolean {
  if (!user || user.disabled) return false;
  if (isSuperAdminUser(user)) return true;
  if (user.role === 'admin' && user.adminLimits) {
    if (
      view === 'admin' &&
      (user.adminLimits.allowedModules.includes('admin') ||
        user.adminLimits.canCreateStaff ||
        user.adminLimits.canCreateSystemAdmins ||
        user.adminLimits.canDeleteUsers ||
        user.adminLimits.canResetPasswords ||
        user.adminLimits.canViewAuditLogs ||
        user.adminLimits.canAssignPermissions)
    ) {
      return true;
    }
    if (view === 'financing' && user.adminLimits.allowedModules.includes('financing')) {
      return true;
    }
  }
  const effective = getEffectiveUserPermissions(user);
  return checkViewByPerm(p => effective.has(p), view);
}

export function canAccessView(role: UserRole | undefined | null, view: string): boolean {
  if (!role) return false;
  return checkViewByPerm(p => hasPermission(role, p), view);
}
