/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ShowroomOS Release Security, RBAC, Concurrency & Transaction Integrity Test Suite
 *
 * Exercises real HTTP endpoints via Express (`createApiRouter` in server/engine.ts)
 * with a serialized transactional DataStore verifying:
 *   1. Unauthenticated / unverified / uninvited / disabled rejection (401/403)
 *   2. Invite activation never trusts client-supplied roles
 *   3. 7-role Separation of Duties & negative authorization tests (Sales, Admin, GM, HR, Finance, Service, Stock)
 *   4. Concurrent 1:1 bike allocation race protection (only 1 succeeds, 1 gets 409)
 *   5. Idempotency deduplication across duplicate requestIds (bookings, payments, reversals)
 *   6. Sales discount pending state & GM/Finance-only approval
 *   7. Unapproved trade-in block + approved trade-in balance offset
 *   8. Pending payment -> Finance verification -> Overpayment guard -> Immutable ledger reversal
 *   9. Accessory reservation & atomic cancellation stock + bike restoration
 *  10. Delivery handover strict gating (zero verified balance + documents + PDI)
 *  11. Immutable audit trail logging
 *  12. Full JSON backup & restore round-trip integrity
 */

import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { createApiRouter } from '../server/engine.ts';
import type { DataStore, DataStoreTx, VerifiedTokenClaims } from '../server/engine.ts';
import { verifyBackupRestoreRoundTrip } from '../scripts/backup-restore.ts';
import type {
  Accessory,
  AuditLogEntry,
  Bike,
  Booking,
  Employee,
  EmployeeSalary,
  LeaveRequest,
  PaymentRecord,
  StaffInvite,
  TradeInValuation,
  UserSession,
} from '../src/types/index.ts';

interface MemoryState {
  users: Map<string, UserSession>;
  invites: Map<string, StaffInvite>;
  bikes: Map<string, Bike>;
  bookings: Map<string, Booking>;
  payments: Map<string, PaymentRecord & { bookingId: string }>;
  accessories: Map<string, Accessory>;
  tradeIns: Map<string, TradeInValuation>;
  employees: Map<string, Employee>;
  payrolls: Map<string, { empCode: string; fullName: string; salary: EmployeeSalary }>;
  leaves: Map<string, LeaveRequest>;
  idempotency: Map<string, { resultId: string; operation: string; actorUid: string }>;
  auditLogs: AuditLogEntry[];
}

function deepClone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val)) as T;
}

class InMemoryTransactionalStore implements DataStore {
  public state: MemoryState;
  private txQueue: Promise<unknown> = Promise.resolve();

  constructor(initial: MemoryState) {
    this.state = initial;
  }

  isConfigured(): boolean {
    return true;
  }

  async runTransaction<T>(fn: (tx: DataStoreTx) => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      // Snapshot-isolate state so thrown errors roll back atomically (matching Firestore transaction semantics)
      const draft: MemoryState = {
        users: new Map(Array.from(this.state.users.entries()).map(([k, v]) => [k, deepClone(v)])),
        invites: new Map(Array.from(this.state.invites.entries()).map(([k, v]) => [k, deepClone(v)])),
        bikes: new Map(Array.from(this.state.bikes.entries()).map(([k, v]) => [k, deepClone(v)])),
        bookings: new Map(Array.from(this.state.bookings.entries()).map(([k, v]) => [k, deepClone(v)])),
        payments: new Map(Array.from(this.state.payments.entries()).map(([k, v]) => [k, deepClone(v)])),
        accessories: new Map(Array.from(this.state.accessories.entries()).map(([k, v]) => [k, deepClone(v)])),
        tradeIns: new Map(Array.from(this.state.tradeIns.entries()).map(([k, v]) => [k, deepClone(v)])),
        employees: new Map(Array.from(this.state.employees.entries()).map(([k, v]) => [k, deepClone(v)])),
        payrolls: new Map(Array.from(this.state.payrolls.entries()).map(([k, v]) => [k, deepClone(v)])),
        leaves: new Map(Array.from(this.state.leaves.entries()).map(([k, v]) => [k, deepClone(v)])),
        idempotency: new Map(Array.from(this.state.idempotency.entries()).map(([k, v]) => [k, deepClone(v)])),
        auditLogs: deepClone(this.state.auditLogs),
      };

      const tx: DataStoreTx = {
        async getUserByUid(uid) {
          return draft.users.get(uid) || null;
        },
        async getInviteByEmail(email) {
          return draft.invites.get(email.toLowerCase()) || null;
        },
        async saveUser(user) {
          draft.users.set(user.uid, deepClone(user));
        },
        async deleteUser(uid) {
          draft.users.delete(uid);
        },
        async saveInvite(invite) {
          draft.invites.set(invite.id.toLowerCase(), deepClone(invite));
        },
        async deleteInvite(email) {
          draft.invites.delete(email.toLowerCase());
        },
        async listUsers() {
          return Array.from(draft.users.values());
        },
        async listInvites() {
          return Array.from(draft.invites.values());
        },
        async getBike(bikeId) {
          return draft.bikes.get(bikeId) || null;
        },
        async saveBike(bike) {
          draft.bikes.set(bike.id, deepClone(bike));
        },
        async getBooking(bookingId) {
          return draft.bookings.get(bookingId) || null;
        },
        async saveBooking(booking) {
          draft.bookings.set(booking.id, deepClone(booking));
        },
        async listBookings() {
          return Array.from(draft.bookings.values());
        },
        async getPayment(paymentId) {
          return draft.payments.get(paymentId) || null;
        },
        async savePayment(payment) {
          draft.payments.set(payment.id, deepClone(payment));
        },
        async listPaymentsByBooking(bookingId) {
          return Array.from(draft.payments.values()).filter(p => p.bookingId === bookingId);
        },
        async getAccessory(accessoryId) {
          return draft.accessories.get(accessoryId) || null;
        },
        async saveAccessory(accessory) {
          draft.accessories.set(accessory.id, deepClone(accessory));
        },
        async getTradeIn(tradeInId) {
          return draft.tradeIns.get(tradeInId) || null;
        },
        async saveTradeIn(tradeIn) {
          draft.tradeIns.set(tradeIn.id, deepClone(tradeIn));
        },
        async getEmployee(employeeId) {
          return draft.employees.get(employeeId) || null;
        },
        async saveEmployee(employee) {
          draft.employees.set(employee.id, deepClone(employee));
        },
        async listEmployees() {
          return Array.from(draft.employees.values());
        },
        async getPayroll(employeeId) {
          return draft.payrolls.get(employeeId)?.salary || null;
        },
        async savePayroll(employeeId, salary) {
          const prev = draft.payrolls.get(employeeId);
          draft.payrolls.set(employeeId, {
            empCode: prev?.empCode || employeeId,
            fullName: prev?.fullName || 'Staff',
            salary: deepClone(salary),
          });
        },
        async listPayrolls() {
          return Array.from(draft.payrolls.entries()).map(([employeeId, val]) => ({
            employeeId,
            empCode: val.empCode,
            fullName: val.fullName,
            salary: deepClone(val.salary),
          }));
        },
        async getLeave(leaveId) {
          return draft.leaves.get(leaveId) || null;
        },
        async saveLeave(leave) {
          draft.leaves.set(leave.id, deepClone(leave));
        },
        async getIdempotencyKey(key) {
          const found = draft.idempotency.get(key);
          return found ? { resultId: found.resultId } : null;
        },
        async saveIdempotencyKey(key, operation, actorUid, resultId) {
          draft.idempotency.set(key, { operation, actorUid, resultId });
        },
        async appendAuditLog(entry) {
          draft.auditLogs.unshift(deepClone(entry));
        },
        async listAuditLogs(limitCount = 200) {
          return draft.auditLogs.slice(0, limitCount);
        },
        async exportAllCollections() {
          return {
            users: Array.from(draft.users.values()),
            staff_invites: Array.from(draft.invites.values()),
            bikes: Array.from(draft.bikes.values()),
            bookings: Array.from(draft.bookings.values()),
            payments: Array.from(draft.payments.values()),
            accessories: Array.from(draft.accessories.values()),
            trade_ins: Array.from(draft.tradeIns.values()),
            employees: Array.from(draft.employees.values()),
            employees_payroll: Array.from(draft.payrolls.entries()).map(([employeeId, val]) => ({
              id: employeeId,
              empCode: val.empCode,
              fullName: val.fullName,
              ...val.salary,
            })),
            leave_requests: Array.from(draft.leaves.values()),
            audit_logs: deepClone(draft.auditLogs),
          };
        },
        async restoreAllCollections(snapshot) {
          if (Array.isArray(snapshot.bikes)) {
            for (const b of snapshot.bikes as Bike[]) draft.bikes.set(b.id, deepClone(b));
          }
          if (Array.isArray(snapshot.bookings)) {
            for (const b of snapshot.bookings as Booking[]) draft.bookings.set(b.id, deepClone(b));
          }
          if (Array.isArray(snapshot.payments)) {
            for (const p of snapshot.payments as Array<PaymentRecord & { bookingId: string }>) {
              draft.payments.set(p.id, deepClone(p));
            }
          }
          if (Array.isArray(snapshot.accessories)) {
            for (const a of snapshot.accessories as Accessory[]) draft.accessories.set(a.id, deepClone(a));
          }
          if (Array.isArray(snapshot.trade_ins)) {
            for (const t of snapshot.trade_ins as TradeInValuation[]) draft.tradeIns.set(t.id, deepClone(t));
          }
          // Note: audit_logs are intentionally never overwritten or deleted during restore
        },
      };

      const result = await fn(tx);
      this.state = draft; // Commit atomically on resolve
      return result;
    };

    const next = this.txQueue.then(run, run);
    this.txQueue = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }
}

const TOKENS: Record<string, VerifiedTokenClaims> = {
  'tok-super-admin': {
    uid: 'uid-super-admin',
    email: 'shewonshezy12@gmail.com',
    emailVerified: true,
    name: 'Super Administrator / Owner',
    customRole: 'super_admin',
  },
  'tok-super-admin-stale': {
    uid: 'uid-super-admin',
    email: 'shewonshezy12@gmail.com',
    emailVerified: true,
    name: 'Super Administrator / Owner',
    customRole: 'sales',
  },
  'tok-co-super': {
    uid: 'uid-co-super',
    email: 'cosuper@idealnova.lk',
    emailVerified: true,
    name: 'Secondary Super Admin',
    customRole: 'super_admin',
  },
  'tok-admin': { uid: 'uid-admin', email: 'admin@idealnova.lk', emailVerified: true, name: 'Admin Officer', customRole: 'admin' },
  'tok-admin-stale': { uid: 'uid-admin', email: 'admin@idealnova.lk', emailVerified: true, name: 'Admin Officer', customRole: 'sales' },
  'tok-limited-admin': {
    uid: 'uid-limited-admin',
    email: 'limited.admin@idealnova.lk',
    emailVerified: true,
    name: 'Limited Branch Admin',
    customRole: 'admin',
  },
  'tok-gm': { uid: 'uid-gm', email: 'gm@idealnova.lk', emailVerified: true, name: 'GM Officer' },
  'tok-sales': { uid: 'uid-sales', email: 'sales@idealnova.lk', emailVerified: true, name: 'Sales Rep' },
  'tok-sales-2': { uid: 'uid-sales-2', email: 'sales2@idealnova.lk', emailVerified: true, name: 'Sales Rep Two' },
  'tok-finance': { uid: 'uid-finance', email: 'finance@idealnova.lk', emailVerified: true, name: 'Finance Officer' },
  'tok-hr': { uid: 'uid-hr', email: 'hr@idealnova.lk', emailVerified: true, name: 'HR Manager' },
  'tok-service': { uid: 'uid-service', email: 'service@idealnova.lk', emailVerified: true, name: 'Service Lead' },
  'tok-stock': { uid: 'uid-stock', email: 'stock@idealnova.lk', emailVerified: true, name: 'Stock Controller' },
  'tok-disabled': { uid: 'uid-disabled', email: 'disabled@idealnova.lk', emailVerified: true, name: 'Disabled User' },
  'tok-stranger': { uid: 'uid-stranger', email: 'stranger@gmail.com', emailVerified: true, name: 'Random Public' },
  'tok-unverified': { uid: 'uid-unverified', email: 'unverified@idealnova.lk', emailVerified: false, name: 'Unverified' },
  'tok-pending-sales': {
    uid: 'uid-pending-sales',
    email: 'invited.sales@idealnova.lk',
    emailVerified: true,
    name: 'Invited Sales',
  },
};

function createSeedStore(): InMemoryTransactionalStore {
  const users = new Map<string, UserSession>([
    [
      'uid-super-admin',
      {
        id: 'uid-super-admin',
        uid: 'uid-super-admin',
        fullName: 'Super Administrator / Owner',
        email: 'shewonshezy12@gmail.com',
        role: 'super_admin',
        designation: 'Super Administrator / Owner',
        department: 'Executive & Ownership',
        branch: 'Colombo Flagship Hub',
        disabled: false,
        isPermanentOwner: true,
      },
    ],
    [
      'uid-co-super',
      {
        id: 'uid-co-super',
        uid: 'uid-co-super',
        fullName: 'Secondary Super Admin',
        email: 'cosuper@idealnova.lk',
        role: 'super_admin',
        designation: 'Co-Admin',
        department: 'Executive',
        branch: 'Colombo Flagship Hub',
        disabled: false,
      },
    ],
    [
      'uid-admin',
      {
        id: 'uid-admin',
        uid: 'uid-admin',
        fullName: 'Admin Officer',
        email: 'admin@idealnova.lk',
        role: 'admin',
        designation: 'System Admin',
        department: 'IT',
        branch: 'Colombo Flagship Hub',
        disabled: false,
        accountsCreatedCount: 0,
        adminLimits: {
          allowedModules: ['dashboard', 'admin'],
          canCreateStaff: true,
          canCreateSystemAdmins: false,
          maxAccountsCanCreate: 10,
          canDeleteUsers: false,
          canResetPasswords: false,
          canViewAuditLogs: true,
          canAssignPermissions: true,
          canExportBackup: true,
        },
      },
    ],
    [
      'uid-limited-admin',
      {
        id: 'uid-limited-admin',
        uid: 'uid-limited-admin',
        fullName: 'Limited Branch Admin',
        email: 'limited.admin@idealnova.lk',
        role: 'admin',
        designation: 'Branch System Admin',
        department: 'Operations',
        branch: 'Kandy Hub',
        disabled: false,
        accountsCreatedCount: 0,
        adminLimits: {
          allowedModules: ['dashboard', 'crm', 'inventory'],
          canCreateStaff: true,
          canCreateSystemAdmins: false,
          maxAccountsCanCreate: 2,
          canDeleteUsers: false,
          canResetPasswords: false,
          canViewAuditLogs: false,
          canAssignPermissions: false,
          canExportBackup: false,
        },
      },
    ],
    [
      'uid-gm',
      {
        id: 'uid-gm',
        uid: 'uid-gm',
        fullName: 'GM Officer',
        email: 'gm@idealnova.lk',
        role: 'general_manager',
        designation: 'General Manager',
        department: 'Management',
        branch: 'Colombo Flagship Hub',
        disabled: false,
      },
    ],
    [
      'uid-sales',
      {
        id: 'uid-sales',
        uid: 'uid-sales',
        fullName: 'Sales Rep',
        email: 'sales@idealnova.lk',
        role: 'sales',
        designation: 'Sales Consultant',
        department: 'Sales',
        branch: 'Colombo Flagship Hub',
        disabled: false,
      },
    ],
    [
      'uid-sales-2',
      {
        id: 'uid-sales-2',
        uid: 'uid-sales-2',
        fullName: 'Sales Rep Two',
        email: 'sales2@idealnova.lk',
        role: 'sales',
        designation: 'Sales Consultant',
        department: 'Sales',
        branch: 'Colombo Flagship Hub',
        disabled: false,
      },
    ],
    [
      'uid-finance',
      {
        id: 'uid-finance',
        uid: 'uid-finance',
        fullName: 'Finance Officer',
        email: 'finance@idealnova.lk',
        role: 'finance',
        designation: 'Finance Lead',
        department: 'Finance',
        branch: 'Colombo Flagship Hub',
        disabled: false,
      },
    ],
    [
      'uid-hr',
      {
        id: 'uid-hr',
        uid: 'uid-hr',
        fullName: 'HR Manager',
        email: 'hr@idealnova.lk',
        role: 'hr',
        designation: 'HR & People Ops',
        department: 'HR',
        branch: 'Colombo Flagship Hub',
        disabled: false,
      },
    ],
    [
      'uid-service',
      {
        id: 'uid-service',
        uid: 'uid-service',
        fullName: 'Service Lead',
        email: 'service@idealnova.lk',
        role: 'service',
        designation: 'Master PDI Technician',
        department: 'Service',
        branch: 'Colombo Flagship Hub',
        disabled: false,
      },
    ],
    [
      'uid-stock',
      {
        id: 'uid-stock',
        uid: 'uid-stock',
        fullName: 'Stock Controller',
        email: 'stock@idealnova.lk',
        role: 'stock',
        designation: 'Inventory Supervisor',
        department: 'Stock',
        branch: 'Colombo Flagship Hub',
        disabled: false,
      },
    ],
    [
      'uid-disabled',
      {
        id: 'uid-disabled',
        uid: 'uid-disabled',
        fullName: 'Disabled User',
        email: 'disabled@idealnova.lk',
        role: 'sales',
        designation: 'Former Consultant',
        department: 'Sales',
        branch: 'Colombo Flagship Hub',
        disabled: true,
      },
    ],
  ]);

  const invites = new Map<string, StaffInvite>([
    [
      'invited.sales@idealnova.lk',
      {
        id: 'invited.sales@idealnova.lk',
        email: 'invited.sales@idealnova.lk',
        fullName: 'Invited Sales',
        role: 'sales',
        designation: 'Junior Sales Consultant',
        department: 'Sales',
        branch: 'Colombo Flagship Hub',
        status: 'Pending',
        invitedByUid: 'uid-admin',
        createdAt: new Date().toISOString(),
      },
    ],
  ]);

  const bikes = new Map<string, Bike>([
    [
      'bike-1',
      {
        id: 'bike-1',
        model: 'Classic 350',
        variant: 'Signals',
        colour: 'Marsh Grey',
        year: 2026,
        displacementCc: 349,
        powerBhp: '20.2 bhp',
        chassisNumber: 'ME3-TEST-CHASSIS-001',
        engineNumber: 'J3A-TEST-ENG-001',
        location: 'Colombo Flagship Floor',
        priceLkr: 2150000,
        status: 'Available',
        imageKey: 'classic350',
        arrivalDate: '01/11/2026',
      },
    ],
    [
      'bike-2',
      {
        id: 'bike-2',
        model: 'Himalayan 450',
        variant: 'Kamet White',
        colour: 'Kamet White',
        year: 2026,
        displacementCc: 452,
        powerBhp: '39.4 bhp',
        chassisNumber: 'ME3-TEST-CHASSIS-002',
        engineNumber: 'K4A-TEST-ENG-002',
        location: 'Colombo Flagship Floor',
        priceLkr: 3450000,
        status: 'Available',
        imageKey: 'himalayan450',
        arrivalDate: '01/11/2026',
      },
    ],
  ]);

  const accessories = new Map<string, Accessory>([
    [
      'acc-1',
      {
        id: 'acc-1',
        name: 'Touring Dual Seat',
        partNumber: 'KXA00072',
        category: 'Seats & Comfort',
        compatibleModels: ['Classic 350'],
        priceLkr: 45000,
        stockQuantity: 5,
        description: 'Touring dual rider seat assembly.',
        imageIcon: 'seat',
      },
    ],
  ]);

  const tradeIns = new Map<string, TradeInValuation>([
    [
      'ti-pending',
      {
        id: 'ti-pending',
        customerName: 'Nadeesha Silva',
        customerPhone: '+94 77 222 3344',
        currentMakeModel: 'Yamaha FZ-S V3',
        registrationNumber: 'WP BDE-4411',
        manufacturingYear: 2021,
        mileageKm: 18500,
        condition: 'Good',
        targetModelInterest: 'Classic 350',
        estimatedValuationLkr: 500000,
        evaluatorName: 'Sales Rep',
        date: '10/11/2026',
        status: 'Pending Approval',
        notes: 'Clean body, pending finance approval.',
      },
    ],
  ]);

  const payrolls = new Map([
    [
      'emp-1',
      {
        empCode: 'EMP-001',
        fullName: 'Sales Rep',
        salary: {
          basicLkr: 150000,
          showroomAllowanceLkr: 25000,
          salesIncentiveLkr: 30000,
          illustrativeDeductionsLkr: 12000,
        },
      },
    ],
  ]);

  return new InMemoryTransactionalStore({
    users,
    invites,
    bikes,
    bookings: new Map(),
    payments: new Map(),
    accessories,
    tradeIns,
    employees: new Map(),
    payrolls,
    leaves: new Map(),
    idempotency: new Map(),
    auditLogs: [],
  });
}

async function apiCall(
  baseUrl: string,
  method: string,
  path: string,
  token?: string,
  body?: unknown
): Promise<{ status: number; data: Record<string, unknown> }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await resp.json()) as Record<string, unknown>;
  return { status: resp.status, data };
}

async function runTests(): Promise<void> {
  const store = createSeedStore();
  const app = express();
  app.use(express.json());
  const claimedUpdates: Array<{ uid: string; role: string; disabled: boolean }> = [];
  const createdAuthUsers: Array<{ uid: string; email: string }> = [];
  const deletedAuthUids: string[] = [];
  const resetAuthEmails: string[] = [];

  app.use(
    '/api',
    createApiRouter({
      verifyToken: async tok => {
        const claims = TOKENS[tok];
        if (!claims) throw new Error('Invalid token');
        return claims;
      },
      store,
      syncCustomClaims: async (uid, role, disabled) => {
        claimedUpdates.push({ uid, role, disabled });
      },
      createAuthUser: async input => {
        const uid = `auth-created-${createdAuthUsers.length + 1}`;
        createdAuthUsers.push({ uid, email: input.email });
        return { uid };
      },
      deleteAuthUser: async uid => {
        deletedAuthUids.push(uid);
      },
      resetAuthPassword: async input => {
        resetAuthEmails.push(input.email);
        return { resetLink: `https://reset.example.com/${encodeURIComponent(input.email)}` };
      },
    })
  );

  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
    const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
  });
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let passed = 0;
  const pass = (label: string) => {
    passed += 1;
    console.log(`  [PASS ${passed}] ${label}`);
  };

  try {
    console.log('--- SHOWROOMOS RELEASE SECURITY & TRANSACTION SUITE ---');

    // 1. Unauthenticated / Unverified / Uninvited / Disabled
    const rNoTok = await apiCall(baseUrl, 'GET', '/auth/session');
    assert.equal(rNoTok.status, 401);
    pass('Missing Bearer token rejected with 401');

    const rUnverified = await apiCall(baseUrl, 'GET', '/auth/session', 'tok-unverified');
    assert.equal(rUnverified.status, 403);
    pass('Unverified email rejected with 403');

    const rDisabled = await apiCall(baseUrl, 'GET', '/auth/session', 'tok-disabled');
    assert.equal(rDisabled.status, 403);
    pass('Disabled staff session rejected with 403');

    const rStranger = await apiCall(baseUrl, 'POST', '/auth/activate-invite', 'tok-stranger', { role: 'admin' });
    assert.equal(rStranger.status, 403);
    pass('Uninvited public self-registration blocked with 403');

    // Invite activation ignores forged role in request body
    const rInvite = await apiCall(baseUrl, 'POST', '/auth/activate-invite', 'tok-pending-sales', {
      role: 'admin',
    });
    assert.equal(rInvite.status, 200);
    assert.equal((rInvite.data.user as UserSession).role, 'sales');
    pass('Staff invite activated strictly as invited role (client-supplied role ignored)');

    // 2. Concurrent booking race on bike-1
    const [raceA, raceB] = await Promise.all([
      apiCall(baseUrl, 'POST', '/operations/bookings', 'tok-sales', {
        requestId: 'req-race-a',
        customerName: 'Customer Alpha',
        customerPhone: '+94 77 111 0001',
        bikeId: 'bike-1',
        discountRequestedLkr: 50000,
      }),
      apiCall(baseUrl, 'POST', '/operations/bookings', 'tok-sales-2', {
        requestId: 'req-race-b',
        customerName: 'Customer Beta',
        customerPhone: '+94 77 111 0002',
        bikeId: 'bike-1',
        discountRequestedLkr: 0,
      }),
    ]);

    const raceStatuses = [raceA.status, raceB.status].sort((a, b) => a - b);
    assert.deepEqual(raceStatuses, [201, 409]);
    const winnerBooking = (raceA.status === 201 ? raceA.data.booking : raceB.data.booking) as Booking;
    assert.equal(winnerBooking.discountStatus, 'Pending');
    assert.equal(winnerBooking.discountLkr, 0);
    pass('Concurrent 1:1 bike allocation race blocked duplicate reservation (1x 201, 1x 409)');

    // 3. Idempotency replay for booking creation
    const winnerReqId = raceA.status === 201 ? 'req-race-a' : 'req-race-b';
    const winnerToken = raceA.status === 201 ? 'tok-sales' : 'tok-sales-2';
    const rReplay = await apiCall(baseUrl, 'POST', '/operations/bookings', winnerToken, {
      requestId: winnerReqId,
      customerName: 'Customer Alpha',
      customerPhone: '+94 77 111 0001',
      bikeId: 'bike-1',
    });
    assert.equal(rReplay.status, 200);
    assert.equal(rReplay.data.deduplicated, true);
    assert.equal((rReplay.data.booking as Booking).id, winnerBooking.id);
    pass('Duplicate booking requestId deduplicated cleanly without second booking');

    // 4. Negative authorization tests (Sales, Admin, GM Separation of Duties)
    const rSalesDisc = await apiCall(
      baseUrl,
      'POST',
      `/operations/bookings/${winnerBooking.id}/discount-decision`,
      'tok-sales',
      { approved: true }
    );
    assert.equal(rSalesDisc.status, 403);

    const rSalesPayroll = await apiCall(baseUrl, 'GET', '/operations/payroll', 'tok-sales');
    assert.equal(rSalesPayroll.status, 403);

    const rSalesRoleAssign = await apiCall(baseUrl, 'PATCH', '/admin/users/uid-sales/role', 'tok-sales', {
      role: 'admin',
    });
    assert.equal(rSalesRoleAssign.status, 403);

    const rSalesTradeInApprove = await apiCall(baseUrl, 'POST', '/operations/tradeins/ti-pending/decision', 'tok-sales', {
      approved: true,
    });
    assert.equal(rSalesTradeInApprove.status, 403);

    const rAdminPayroll = await apiCall(baseUrl, 'GET', '/operations/payroll', 'tok-admin');
    assert.equal(rAdminPayroll.status, 403);

    const rAdminDisc = await apiCall(
      baseUrl,
      'POST',
      `/operations/bookings/${winnerBooking.id}/discount-decision`,
      'tok-admin',
      { approved: true }
    );
    assert.equal(rAdminDisc.status, 403);

    const rGmPayroll = await apiCall(baseUrl, 'GET', '/operations/payroll', 'tok-gm');
    assert.equal(rGmPayroll.status, 403);

    const rHrPayroll = await apiCall(baseUrl, 'GET', '/operations/payroll', 'tok-hr');
    assert.equal(rHrPayroll.status, 200);
    pass('Separation of Duties enforced: Sales/Admin/GM blocked from privileged actions; HR payroll exclusive to HR');

    // 5. Finance discount approval
    const rFinDisc = await apiCall(
      baseUrl,
      'POST',
      `/operations/bookings/${winnerBooking.id}/discount-decision`,
      'tok-finance',
      { approved: true, approvedAmountLkr: 50000 }
    );
    assert.equal(rFinDisc.status, 200);
    assert.equal((rFinDisc.data.booking as Booking).discountLkr, 50000);
    assert.equal((rFinDisc.data.booking as Booking).finalPriceLkr, 2100000);
    pass('Finance approved pending discount cleanly (2,150,000 -> 2,100,000 LKR)');

    // 6. Unapproved trade-in credit blocked, then Finance approves & applies
    const rApplyUnapproved = await apiCall(baseUrl, 'POST', '/operations/tradeins/ti-pending/apply', 'tok-finance', {
      bookingId: winnerBooking.id,
    });
    assert.equal(rApplyUnapproved.status, 400);

    const rApproveTi = await apiCall(baseUrl, 'POST', '/operations/tradeins/ti-pending/decision', 'tok-finance', {
      approved: true,
    });
    assert.equal(rApproveTi.status, 200);

    const rApplyTi = await apiCall(baseUrl, 'POST', '/operations/tradeins/ti-pending/apply', 'tok-finance', {
      bookingId: winnerBooking.id,
    });
    assert.equal(rApplyTi.status, 200);
    assert.equal((rApplyTi.data.booking as Booking).finalPriceLkr, 1600000);
    pass('Unapproved trade-in blocked (400); Finance approval & application reduced net price by 500,000 LKR');

    // 7. Payment recording (unverified) -> Sales verify blocked -> Finance verify -> Overpayment guard -> Immutable Reversal + Idempotency
    const rPayCreate = await apiCall(baseUrl, 'POST', '/operations/payments', 'tok-sales', {
      bookingId: winnerBooking.id,
      requestId: 'req-pay-1',
      amountLkr: 600000,
      type: 'Booking Advance',
      reference: 'SL-CHQ-9910',
    });
    assert.equal(rPayCreate.status, 201);
    const createdPayment = rPayCreate.data.payment as PaymentRecord;
    assert.equal(createdPayment.status, 'Pending Verification');

    const rPayReplay = await apiCall(baseUrl, 'POST', '/operations/payments', 'tok-sales', {
      bookingId: winnerBooking.id,
      requestId: 'req-pay-1',
      amountLkr: 600000,
      type: 'Booking Advance',
      reference: 'SL-CHQ-9910',
    });
    assert.equal(rPayReplay.status, 200);
    assert.equal(rPayReplay.data.deduplicated, true);

    const rSalesVerify = await apiCall(
      baseUrl,
      'POST',
      `/operations/payments/${createdPayment.id}/verify`,
      'tok-sales'
    );
    assert.equal(rSalesVerify.status, 403);

    const rFinVerify = await apiCall(
      baseUrl,
      'POST',
      `/operations/payments/${createdPayment.id}/verify`,
      'tok-finance'
    );
    assert.equal(rFinVerify.status, 200);
    const bAfterPay = store.state.bookings.get(winnerBooking.id)!;
    assert.equal(bAfterPay.verifiedPaidLkr, 600000);
    assert.equal(bAfterPay.balanceLkr, 1000000);

    // Overpayment guard (remaining is 1,000,000; try 1,500,000)
    const rOverpay = await apiCall(baseUrl, 'POST', '/operations/payments', 'tok-sales', {
      bookingId: winnerBooking.id,
      requestId: 'req-overpay',
      amountLkr: 1500000,
      type: 'Balance Payment',
      reference: 'OVER-01',
    });
    assert.equal(rOverpay.status, 400);

    // Sales cannot reverse payment; Finance reverses atomically with idempotency
    const rSalesRev = await apiCall(
      baseUrl,
      'POST',
      `/operations/payments/${createdPayment.id}/reverse`,
      'tok-sales',
      { requestId: 'req-rev-1', reason: 'Cheque bounced' }
    );
    assert.equal(rSalesRev.status, 403);

    const rFinRev = await apiCall(
      baseUrl,
      'POST',
      `/operations/payments/${createdPayment.id}/reverse`,
      'tok-finance',
      { requestId: 'req-rev-1', reason: 'Cheque bounced' }
    );
    assert.equal(rFinRev.status, 201);
    const rFinRevReplay = await apiCall(
      baseUrl,
      'POST',
      `/operations/payments/${createdPayment.id}/reverse`,
      'tok-finance',
      { requestId: 'req-rev-1', reason: 'Cheque bounced' }
    );
    assert.equal(rFinRevReplay.status, 200);
    assert.equal(rFinRevReplay.data.deduplicated, true);
    const bAfterRev = store.state.bookings.get(winnerBooking.id)!;
    assert.equal(bAfterRev.verifiedPaidLkr, 0);
    assert.equal(bAfterRev.balanceLkr, 1600000);
    assert.equal(store.state.payments.get(createdPayment.id)?.status, 'Reversed');
    pass('Payment verification, overpayment guard, and idempotent immutable ledger reversal reconciled balances accurately');

    // 8. Accessory attachment + booking cancellation atomic stock & bike restoration
    const rAccAttach = await apiCall(
      baseUrl,
      'POST',
      `/operations/bookings/${winnerBooking.id}/accessories`,
      'tok-sales',
      { accessoryId: 'acc-1', quantity: 2 }
    );
    assert.equal(rAccAttach.status, 200);
    assert.equal(store.state.accessories.get('acc-1')?.stockQuantity, 3);

    const rCancel = await apiCall(
      baseUrl,
      'POST',
      `/operations/bookings/${winnerBooking.id}/cancel`,
      'tok-sales',
      { reason: 'Customer deferred purchase' }
    );
    assert.equal(rCancel.status, 200);
    assert.equal(store.state.bikes.get('bike-1')?.status, 'Available');
    assert.equal(store.state.bikes.get('bike-1')?.allocatedBookingId, undefined);
    assert.equal(store.state.accessories.get('acc-1')?.stockQuantity, 5);
    pass('Cancellation atomically released bike-1 to Available and restored acc-1 stock (3 -> 5)');

    // 9. Delivery handover gates
    const rBook2 = await apiCall(baseUrl, 'POST', '/operations/bookings', 'tok-sales', {
      requestId: 'req-book-2',
      customerName: 'Kasun Jayawardena',
      customerPhone: '+94 77 888 9900',
      bikeId: 'bike-2',
    });
    assert.equal(rBook2.status, 201);
    const bk2 = rBook2.data.booking as Booking;

    // Deliver blocked when balance > 0
    const rDeliverUnpaid = await apiCall(
      baseUrl,
      'POST',
      `/operations/bookings/${bk2.id}/deliver`,
      'tok-service'
    );
    assert.equal(rDeliverUnpaid.status, 400);

    // Pay & verify full price (3,450,000)
    const rPay2 = await apiCall(baseUrl, 'POST', '/operations/payments', 'tok-finance', {
      bookingId: bk2.id,
      requestId: 'req-pay-2',
      amountLkr: 3450000,
      type: 'Full Settlement',
      reference: 'SL-RTGS-7711',
    });
    assert.equal(rPay2.status, 201);
    const p2 = rPay2.data.payment as PaymentRecord;
    await apiCall(baseUrl, 'POST', `/operations/payments/${p2.id}/verify`, 'tok-finance');

    // Deliver still blocked until documentsChecked + pdiCompleted
    const rDeliverNoPdi = await apiCall(
      baseUrl,
      'POST',
      `/operations/bookings/${bk2.id}/deliver`,
      'tok-service'
    );
    assert.equal(rDeliverNoPdi.status, 400);

    // Complete documents + PDI sign-off and deliver
    const storedBk2 = store.state.bookings.get(bk2.id)!;
    storedBk2.deliveryChecklist.documentsChecked = true;
    storedBk2.deliveryChecklist.pdiCompleted = true;

    const rDeliverOk = await apiCall(
      baseUrl,
      'POST',
      `/operations/bookings/${bk2.id}/deliver`,
      'tok-service'
    );
    assert.equal(rDeliverOk.status, 200);
    assert.equal((rDeliverOk.data.booking as Booking).status, 'Delivered');
    assert.equal(store.state.bikes.get('bike-2')?.status, 'Delivered');
    pass('Delivery handover strictly gated on 100% verified balance + documents + PDI, then marked Delivered');

    // 10. Audit log & Backup/Restore round-trip
    const rAudit = await apiCall(baseUrl, 'GET', '/audit-logs', 'tok-admin');
    assert.equal(rAudit.status, 200);
    assert.ok((rAudit.data.logs as AuditLogEntry[]).length >= 8);

    const backupResult = await verifyBackupRestoreRoundTrip(store, 'test-project', '(default)');
    assert.ok(backupResult.collectionCount >= 5);
    assert.ok(backupResult.verifiedBookingIds.includes(bk2.id));
    pass(
      `Audit logs verified (${(rAudit.data.logs as AuditLogEntry[]).length} entries) & Backup/Restore round-trip verified (${backupResult.totalDocuments} docs)`
    );

    // 11. Super Admin (Owner) Authorization, Permanent Protection & Restricted Admin Boundaries
    const rStaleAdminClaim = await apiCall(baseUrl, 'GET', '/auth/session', 'tok-admin-stale');
    assert.equal(rStaleAdminClaim.status, 403);
    assert.equal(rStaleAdminClaim.data.code, 'CLAIMS_OUT_OF_SYNC');

    // Permanent Owner (shewonshezy12@gmail.com) is never locked out by stale claims & auto-heals even if deleted/demoted
    const rOwnerHeal = await apiCall(baseUrl, 'GET', '/auth/session', 'tok-super-admin-stale');
    assert.equal(rOwnerHeal.status, 200);
    assert.equal((rOwnerHeal.data.user as UserSession).role, 'super_admin');
    assert.equal((rOwnerHeal.data.user as UserSession).isPermanentOwner, true);

    // Even if deleted from users store before redeployment, signing in with shewonshezy12@gmail.com auto-assigns SUPER_ADMIN
    await store.runTransaction(async tx => {
      await tx.deleteUser?.('uid-super-admin');
    });
    const rOwnerAutoBootstrap = await apiCall(baseUrl, 'POST', '/auth/activate-invite', 'tok-super-admin');
    assert.equal(rOwnerAutoBootstrap.status, 200);
    assert.equal((rOwnerAutoBootstrap.data.user as UserSession).role, 'super_admin');
    assert.equal((rOwnerAutoBootstrap.data.user as UserSession).isPermanentOwner, true);
    assert.ok(store.state.auditLogs.some(l => l.action === 'OWNER_SUPER_ADMIN_AUTO_ASSIGNED'));
    pass('Permanent Owner (Shewonshezy12@gmail.com) auto-assigns SUPER_ADMIN and heals after redeployment');

    // Restricted admin cannot read payroll, restore backups, invite super_admin, assign super_admin, or modify super_admin
    const rAdminExport = await apiCall(baseUrl, 'GET', '/backup/export', 'tok-admin');
    assert.equal(rAdminExport.status, 200);
    assert.equal((rAdminExport.data.snapshot as Record<string, unknown>).employees_payroll, undefined);

    const rAdminRestore = await apiCall(baseUrl, 'POST', '/backup/restore', 'tok-admin', {
      snapshot: rAdminExport.data.snapshot,
    });
    assert.equal(rAdminRestore.status, 403);

    const rAdminInviteSuper = await apiCall(baseUrl, 'POST', '/admin/invites', 'tok-admin', {
      email: 'rogue.owner@idealnova.lk',
      fullName: 'Rogue',
      role: 'super_admin',
    });
    assert.equal(rAdminInviteSuper.status, 403);

    const rAdminPromoteSales = await apiCall(baseUrl, 'PATCH', '/admin/users/uid-sales/role', 'tok-admin', {
      role: 'super_admin',
    });
    assert.equal(rAdminPromoteSales.status, 403);

    const rAdminTouchSuper = await apiCall(baseUrl, 'PATCH', '/admin/users/uid-super-admin/role', 'tok-admin', {
      role: 'sales',
    });
    assert.equal(rAdminTouchSuper.status, 403);

    const rAdminDisableSuper = await apiCall(baseUrl, 'PATCH', '/admin/users/uid-super-admin/status', 'tok-admin', {
      disabled: true,
    });
    assert.equal(rAdminDisableSuper.status, 403);
    pass('Restricted admin blocked from payroll export, restore, super_admin invites, promotion, or owner modification');

    // Another Super Admin CANNOT delete, demote, deactivate, reset password, or remove permissions of Permanent Owner
    const rCoDemoteOwner = await apiCall(baseUrl, 'PATCH', '/admin/users/uid-super-admin/role', 'tok-co-super', {
      role: 'sales',
    });
    assert.equal(rCoDemoteOwner.status, 403);
    const rCoDisableOwner = await apiCall(baseUrl, 'PATCH', '/admin/users/uid-super-admin/status', 'tok-co-super', {
      disabled: true,
    });
    assert.equal(rCoDisableOwner.status, 403);
    const rCoPermsOwner = await apiCall(baseUrl, 'PATCH', '/admin/users/uid-super-admin/permissions', 'tok-co-super', {
      assignedPermissions: ['dashboard.view'],
    });
    assert.equal(rCoPermsOwner.status, 403);
    const rCoResetOwner = await apiCall(baseUrl, 'POST', '/admin/users/uid-super-admin/reset-password', 'tok-co-super', {});
    assert.equal(rCoResetOwner.status, 403);
    const rCoDeleteOwner = await apiCall(baseUrl, 'DELETE', '/admin/users/uid-super-admin', 'tok-co-super');
    assert.equal(rCoDeleteOwner.status, 403);
    pass('Permanent Owner (Shewonshezy12@gmail.com) protected from deletion, demotion, deactivation, permission stripping, and password reset by any admin');

    // Super Admin cannot demote/disable self; can promote/demote other non-owner users
    const rSelfDemote = await apiCall(baseUrl, 'PATCH', '/admin/users/uid-super-admin/role', 'tok-super-admin', {
      role: 'admin',
    });
    assert.equal(rSelfDemote.status, 403);

    const rSelfDisable = await apiCall(baseUrl, 'PATCH', '/admin/users/uid-super-admin/status', 'tok-super-admin', {
      disabled: true,
    });
    assert.equal(rSelfDisable.status, 400);

    const rPromoteAdmin = await apiCall(baseUrl, 'PATCH', '/admin/users/uid-admin/role', 'tok-super-admin', {
      role: 'super_admin',
    });
    assert.equal(rPromoteAdmin.status, 200);
    assert.ok(claimedUpdates.some(c => c.uid === 'uid-admin' && c.role === 'super_admin'));

    const rDemoteBack = await apiCall(baseUrl, 'PATCH', '/admin/users/uid-admin/role', 'tok-super-admin', {
      role: 'admin',
    });
    assert.equal(rDemoteBack.status, 200);
    pass('Super Admin role governance & custom claim sync verified');

    // 12. System Administrator Module Scope, Creation Quota, Delete/Reset/Audit Limits
    // tok-limited-admin has allowedModules: ['dashboard', 'crm', 'inventory'], canCreateStaff: true, maxAccountsCanCreate: 2,
    // and FALSE for canCreateSystemAdmins, canDeleteUsers, canResetPasswords, canViewAuditLogs, canExportBackup.
    const rLimAudit = await apiCall(baseUrl, 'GET', '/audit-logs', 'tok-limited-admin');
    assert.equal(rLimAudit.status, 403);
    const rLimExport = await apiCall(baseUrl, 'GET', '/backup/export', 'tok-limited-admin');
    assert.equal(rLimExport.status, 403);
    const rLimPayroll = await apiCall(baseUrl, 'GET', '/operations/payroll', 'tok-limited-admin');
    assert.equal(rLimPayroll.status, 403);
    const rLimBooking = await apiCall(baseUrl, 'POST', '/operations/bookings', 'tok-limited-admin', {
      requestId: 'req-lim-book',
      customerName: 'Blocked',
      customerPhone: '+94 77 111 2233',
      bikeId: 'bike-1',
    });
    assert.equal(rLimBooking.status, 403);
    const rLimCreateAdmin = await apiCall(baseUrl, 'POST', '/admin/users', 'tok-limited-admin', {
      email: 'sub.admin@idealnova.lk',
      fullName: 'Sub Admin',
      role: 'admin',
    });
    assert.equal(rLimCreateAdmin.status, 403);
    const rLimDelete = await apiCall(baseUrl, 'DELETE', '/admin/users/uid-sales-2', 'tok-limited-admin');
    assert.equal(rLimDelete.status, 403);
    const rLimReset = await apiCall(baseUrl, 'POST', '/admin/users/uid-sales-2/reset-password', 'tok-limited-admin', {});
    assert.equal(rLimReset.status, 403);

    // Create 2 staff users (1 with password -> calls createAuthUser, 1 invite), then 3rd fails quota (2/2)
    const rLimStaff1 = await apiCall(baseUrl, 'POST', '/admin/users', 'tok-limited-admin', {
      email: 'new.staff1@idealnova.lk',
      fullName: 'New Staff One',
      role: 'sales',
      password: 'Password123!',
    });
    assert.equal(rLimStaff1.status, 201);
    assert.equal(createdAuthUsers.length, 1);

    const rLimStaff2 = await apiCall(baseUrl, 'POST', '/admin/users', 'tok-limited-admin', {
      email: 'new.staff2@idealnova.lk',
      fullName: 'New Staff Two',
      role: 'service',
    });
    assert.equal(rLimStaff2.status, 201);

    const rLimStaff3 = await apiCall(baseUrl, 'POST', '/admin/users', 'tok-limited-admin', {
      email: 'new.staff3@idealnova.lk',
      fullName: 'Over Quota',
      role: 'sales',
    });
    assert.equal(rLimStaff3.status, 403);
    assert.equal(rLimStaff3.data.code, 'ACCOUNT_CREATION_LIMIT_REACHED');
    pass('System Administrator enforced strict module limits, action flags, and maxAccountsCanCreate quota (2/2)');

    // Super Admin grants limited-admin password reset, delete, and audit view permissions
    const rGrantLimits = await apiCall(baseUrl, 'PATCH', '/admin/users/uid-limited-admin/permissions', 'tok-super-admin', {
      adminLimits: {
        allowedModules: ['dashboard', 'crm', 'inventory', 'payments'],
        canCreateStaff: true,
        canCreateSystemAdmins: false,
        maxAccountsCanCreate: 5,
        canDeleteUsers: true,
        canResetPasswords: true,
        canViewAuditLogs: true,
        canAssignPermissions: true,
        canExportBackup: false,
      },
    });
    assert.equal(rGrantLimits.status, 200);

    const rLimAuditAfter = await apiCall(baseUrl, 'GET', '/audit-logs', 'tok-limited-admin');
    assert.equal(rLimAuditAfter.status, 200);

    const createdStaffUid = (rLimStaff1.data.user as UserSession).uid;
    const rLimResetAfter = await apiCall(
      baseUrl,
      'POST',
      `/admin/users/${createdStaffUid}/reset-password`,
      'tok-limited-admin',
      {}
    );
    assert.equal(rLimResetAfter.status, 200);
    assert.ok(resetAuthEmails.includes('new.staff1@idealnova.lk'));

    const rLimDeleteAfter = await apiCall(
      baseUrl,
      'DELETE',
      `/admin/users/${createdStaffUid}`,
      'tok-limited-admin'
    );
    assert.equal(rLimDeleteAfter.status, 200);
    assert.ok(deletedAuthUids.includes(createdStaffUid));
    assert.equal(store.state.users.get(createdStaffUid), undefined);

    // Super Admin sets custom granular permissions on standard staff user + logs login attempts
    const rCustomStaffPerm = await apiCall(baseUrl, 'PATCH', '/admin/users/uid-sales-2/permissions', 'tok-super-admin', {
      assignedPermissions: ['dashboard.view', 'inventory.bikes.read'],
    });
    assert.equal(rCustomStaffPerm.status, 200);
    assert.deepEqual((rCustomStaffPerm.data.user as UserSession).assignedPermissions, ['dashboard.view', 'inventory.bikes.read']);

    const rLoginFailAudit = await apiCall(baseUrl, 'POST', '/auth/login-audit', undefined, {
      outcome: 'LOGIN_FAILED',
      email: 'attacker@example.com',
      reason: 'auth/wrong-password',
    });
    assert.equal(rLoginFailAudit.status, 201);
    assert.ok(store.state.auditLogs.some(l => l.action === 'ACCOUNT_CREATED'));
    assert.ok(store.state.auditLogs.some(l => l.action === 'PERMISSION_CHANGE'));
    assert.ok(store.state.auditLogs.some(l => l.action === 'PASSWORD_RESET'));
    assert.ok(store.state.auditLogs.some(l => l.action === 'ACCOUNT_DELETED'));
    assert.ok(store.state.auditLogs.some(l => l.action === 'LOGIN_FAILED' && l.actorEmail === 'attacker@example.com'));
    pass('Super Admin System Admin limit delegation, password reset, account deletion, custom staff permissions, and login attempt auditing verified');

    // Super Admin can access payroll & full backup/restore, while audit_logs remain immutable
    const rSuperPayroll = await apiCall(baseUrl, 'GET', '/operations/payroll', 'tok-super-admin');
    assert.equal(rSuperPayroll.status, 200);

    const rSuperExport = await apiCall(baseUrl, 'GET', '/backup/export', 'tok-super-admin');
    assert.equal(rSuperExport.status, 200);
    assert.ok(Array.isArray((rSuperExport.data.snapshot as Record<string, unknown>).employees_payroll));

    const auditCountBeforeRestore = store.state.auditLogs.length;
    const tamperedBackup = deepClone(rSuperExport.data.snapshot as Record<string, unknown>);
    tamperedBackup.audit_logs = []; // Attempt to wipe audit logs via restore must be ignored
    const rSuperRestore = await apiCall(baseUrl, 'POST', '/backup/restore', 'tok-super-admin', {
      snapshot: tamperedBackup,
    });
    assert.equal(rSuperRestore.status, 200);
    assert.ok(store.state.auditLogs.length >= auditCountBeforeRestore + 1);
    pass('Super Admin full payroll access & backup/restore verified while keeping audit_logs immutable');

    // Super Admin MUST still obey business integrity rules (no bypassing double allocation, overpayment, or delivery gates)
    const rSuperDoubleBook = await apiCall(baseUrl, 'POST', '/operations/bookings', 'tok-super-admin', {
      requestId: 'req-super-double-book',
      customerName: 'Bypass Attempt',
      customerPhone: '+94 77 000 0000',
      bikeId: 'bike-2', // Already Delivered!
    });
    assert.equal(rSuperDoubleBook.status, 409);

    const rSuperBook1 = await apiCall(baseUrl, 'POST', '/operations/bookings', 'tok-super-admin', {
      requestId: 'req-super-book-1',
      customerName: 'Owner Test Buyer',
      customerPhone: '+94 77 123 4567',
      bikeId: 'bike-1',
    });
    assert.equal(rSuperBook1.status, 201);
    const superBk = rSuperBook1.data.booking as Booking;

    const rSuperOverpay = await apiCall(baseUrl, 'POST', '/operations/payments', 'tok-super-admin', {
      bookingId: superBk.id,
      requestId: 'req-super-overpay',
      amountLkr: 9900000,
      type: 'Booking Advance',
      reference: 'SA-OVER-1',
    });
    assert.equal(rSuperOverpay.status, 400);

    const rSuperDeliverBlocked = await apiCall(
      baseUrl,
      'POST',
      `/operations/bookings/${superBk.id}/deliver`,
      'tok-super-admin'
    );
    assert.equal(rSuperDeliverBlocked.status, 400);
    pass('Super Admin strictly obeys 1:1 bike allocation, overpayment guard, and delivery handover gates');

    console.log(`\nALL ${passed} RELEASE SECURITY & TRANSACTION CHECKS PASSED!`);
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('RELEASE TEST FAILED:', err);
  process.exit(1);
});
