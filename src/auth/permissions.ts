/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { UserRole } from '../types/index.ts';

export type Permission =
  | 'users.read'
  | 'users.manage_invites'
  | 'users.assign_role'
  | 'users.toggle_disable'
  | 'audit.view'
  | 'backup.export'
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

export const ALL_STAFF_ROLES: readonly UserRole[] = [
  'admin',
  'general_manager',
  'sales',
  'finance',
  'hr',
  'service',
  'stock',
] as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'System Administrator',
  general_manager: 'General Manager',
  sales: 'Sales Consultant',
  finance: 'Finance & Cashier',
  hr: 'HR & People Ops',
  service: 'Service & PDI',
  stock: 'Inventory & Stock',
};

/**
 * Principle of Least Privilege & Separation of Duties:
 * - Admin manages staff identities/invites/roles/disabling & audit logs, NOT financial approvals or HR payroll.
 * - HR exclusively owns employee payroll & salary figures.
 * - Sales cannot verify/reverse payments, approve discounts, approve trade-ins, read payroll, or assign roles.
 * - Finance owns payment verification, reversals, discount approvals, and trade-in financial credits.
 * - Service owns PDI sign-offs and workshop job cards.
 * - Stock owns motorcycle and accessory stock control.
 */
export const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  admin: new Set<Permission>([
    'dashboard.view',
    'users.read',
    'users.manage_invites',
    'users.assign_role',
    'users.toggle_disable',
    'audit.view',
    'backup.export',
  ]),
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

export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  return Boolean(perms && perms.has(permission));
}

export function canAccessView(role: UserRole | undefined | null, view: string): boolean {
  if (!role) return false;
  switch (view) {
    case 'dashboard':
      return hasPermission(role, 'dashboard.view');
    case 'crm':
      return hasPermission(role, 'crm.read');
    case 'inventory':
      return hasPermission(role, 'inventory.bikes.read');
    case 'bookings':
      return hasPermission(role, 'bookings.read');
    case 'delivery':
      return hasPermission(role, 'delivery.read');
    case 'accessories':
      return hasPermission(role, 'inventory.accessories.read');
    case 'testrides':
      return hasPermission(role, 'testrides.read');
    case 'tradein':
      return hasPermission(role, 'tradein.read');
    case 'financing':
      return hasPermission(role, 'crm.read') || hasPermission(role, 'bookings.read');
    case 'hr':
      return hasPermission(role, 'hr.directory.read') || hasPermission(role, 'hr.leaves.read') || hasPermission(role, 'hr.payroll.read');
    case 'service':
      return hasPermission(role, 'service.read');
    case 'reports':
      return hasPermission(role, 'reports.view');
    case 'admin':
      return hasPermission(role, 'users.manage_invites') || hasPermission(role, 'audit.view');
    default:
      return false;
  }
}
