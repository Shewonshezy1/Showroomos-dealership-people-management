/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../src/auth/permissions.ts';
import type { Permission } from '../src/auth/permissions.ts';
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
  UserRole,
  UserSession,
} from '../src/types/index.ts';

export interface VerifiedTokenClaims {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export type TokenVerifier = (idToken: string) => Promise<VerifiedTokenClaims>;

export interface DataStoreTx {
  getUserByUid(uid: string): Promise<UserSession | null>;
  getInviteByEmail(email: string): Promise<StaffInvite | null>;
  saveUser(user: UserSession): Promise<void>;
  saveInvite(invite: StaffInvite): Promise<void>;
  listUsers(): Promise<UserSession[]>;
  listInvites(): Promise<StaffInvite[]>;

  getBike(bikeId: string): Promise<Bike | null>;
  saveBike(bike: Bike): Promise<void>;

  getBooking(bookingId: string): Promise<Booking | null>;
  saveBooking(booking: Booking): Promise<void>;
  listBookings(): Promise<Booking[]>;

  getPayment(paymentId: string): Promise<(PaymentRecord & { bookingId: string }) | null>;
  savePayment(payment: PaymentRecord & { bookingId: string }): Promise<void>;
  listPaymentsByBooking(bookingId: string): Promise<(PaymentRecord & { bookingId: string })[]>;

  getAccessory(accessoryId: string): Promise<Accessory | null>;
  saveAccessory(accessory: Accessory): Promise<void>;

  getTradeIn(tradeInId: string): Promise<TradeInValuation | null>;
  saveTradeIn(tradeIn: TradeInValuation): Promise<void>;

  getEmployee(employeeId: string): Promise<Employee | null>;
  saveEmployee(employee: Employee): Promise<void>;
  listEmployees(): Promise<Employee[]>;
  getPayroll(employeeId: string): Promise<EmployeeSalary | null>;
  savePayroll(employeeId: string, salary: EmployeeSalary): Promise<void>;
  listPayrolls(): Promise<Array<{ employeeId: string; empCode: string; fullName: string; salary: EmployeeSalary }>>;

  getLeave(leaveId: string): Promise<LeaveRequest | null>;
  saveLeave(leave: LeaveRequest): Promise<void>;

  getIdempotencyKey(key: string): Promise<{ resultId: string } | null>;
  saveIdempotencyKey(key: string, op: string, actorUid: string, resultId: string): Promise<void>;

  appendAuditLog(entry: AuditLogEntry): Promise<void>;
  listAuditLogs(limitCount?: number): Promise<AuditLogEntry[]>;

  exportAllCollections(): Promise<Record<string, unknown>>;
  restoreAllCollections(snapshot: Record<string, unknown>): Promise<void>;
}

export interface DataStore {
  runTransaction<T>(fn: (tx: DataStoreTx) => Promise<T>): Promise<T>;
  isConfigured(): boolean;
  getStatusReason?(): string;
}

export interface EngineOptions {
  verifyToken: TokenVerifier;
  store: DataStore;
  bootstrapOwnerEmail?: string;
}

interface AuthedRequest extends Request {
  staffUser?: UserSession;
  claims?: VerifiedTokenClaims;
}

function nowIso(): string {
  return new Date().toISOString();
}

function todayDDMMYYYY(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function nowFormattedDateTime(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${todayDDMMYYYY()} ${hh}:${mi}`;
}

export function createApiRouter(options: EngineOptions): express.Router {
  const router = express.Router();
  const { verifyToken, store, bootstrapOwnerEmail = 'shewonshezy12@gmail.com' } = options;

  router.get('/health', (_req: Request, res: Response) => {
    const storeConfigured = store.isConfigured();
    res.json({
      ok: true,
      service: 'showroomos-api',
      storeConfigured,
      ...(store.getStatusReason ? { adminStatus: store.getStatusReason() } : {}),
      timestamp: nowIso(),
    });
  });

  // Authentication middleware verifying Firebase ID token and active staff status on every request
  const requireAuth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required. Missing Bearer ID token.' });
      return;
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      res.status(401).json({ error: 'Authentication required. Empty Bearer token.' });
      return;
    }

    let claims: VerifiedTokenClaims;
    try {
      claims = await verifyToken(token);
    } catch (err) {
      res.status(401).json({
        error: err instanceof Error ? err.message : 'Invalid or revoked authentication token.',
      });
      return;
    }

    if (!claims.emailVerified) {
      res.status(403).json({ error: 'Email verification is required for dealership access.' });
      return;
    }
    req.claims = claims;

    if (!store.isConfigured()) {
      // Token verified cryptographically, but server Admin store is not configured or lacks IAM in this runtime
      next();
      return;
    }

    try {
      const staff = await store.runTransaction(async tx => tx.getUserByUid(claims.uid));
      if (!staff) {
        res.status(403).json({
          error: 'Account not provisioned. An administrator must invite and approve your staff profile.',
          code: 'ACCOUNT_NOT_PROVISIONED',
        });
        return;
      }
      if (staff.disabled) {
        res.status(403).json({
          error: 'Staff account is disabled. Contact the System Administrator.',
          code: 'ACCOUNT_DISABLED',
        });
        return;
      }
      req.staffUser = staff;
      next();
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to verify staff session.',
      });
    }
  };

  const requireStoreConfigured = (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!store.isConfigured()) {
      res.status(503).json({
        error:
          store.getStatusReason?.() ||
          'Server-side Firestore Admin SDK is unavailable or lacks IAM permissions on the target Firebase project.',
        code: 'ADMIN_STORE_UNCONFIGURED',
      });
      return;
    }
    if (!req.staffUser) {
      res.status(403).json({ error: 'Staff session missing or disabled.' });
      return;
    }
    next();
  };

  const requirePerm = (perm: Permission) => {
    return (req: AuthedRequest, res: Response, next: NextFunction) => {
      if (!req.staffUser) {
        res.status(403).json({ error: 'Authenticated active staff session required.' });
        return;
      }
      if (!hasPermission(req.staffUser.role, perm)) {
        res.status(403).json({
          error: `Access denied: role "${req.staffUser.role}" lacks permission "${perm}".`,
          code: 'FORBIDDEN_ROLE',
        });
        return;
      }
      next();
    };
  };

  // POST /api/auth/activate-invite
  // Cryptographically verifies token, checks Pending invite by verified token email (NEVER request body role!)
  router.post('/auth/activate-invite', async (req: AuthedRequest, res: Response) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing Bearer token.' });
      return;
    }
    const token = header.slice('Bearer '.length).trim();

    let claims: VerifiedTokenClaims;
    try {
      claims = await verifyToken(token);
    } catch (err) {
      res.status(401).json({ error: err instanceof Error ? err.message : 'Invalid token.' });
      return;
    }

    if (!claims.emailVerified || !claims.email) {
      res.status(403).json({ error: 'Verified email is required.' });
      return;
    }

    if (!store.isConfigured()) {
      res.status(503).json({
        error: store.getStatusReason?.() || 'Server Admin SDK not configured or missing IAM.',
        code: 'ADMIN_STORE_UNCONFIGURED',
      });
      return;
    }

    try {
      const profile = await store.runTransaction(async tx => {
        const existing = await tx.getUserByUid(claims.uid);
        if (existing) {
          if (existing.disabled) {
            throw Object.assign(new Error('Staff account is disabled.'), { status: 403 });
          }
          return existing;
        }

        const emailLower = claims.email.toLowerCase();
        const invite = await tx.getInviteByEmail(emailLower);

        if (invite && invite.status === 'Pending') {
          const newUser: UserSession = {
            id: claims.uid,
            uid: claims.uid,
            fullName: invite.fullName || claims.name || emailLower,
            email: emailLower,
            role: invite.role,
            designation: invite.designation || invite.role,
            department: invite.department || 'Showroom Operations',
            branch: invite.branch || 'Colombo Flagship Hub',
            disabled: false,
            invitedBy: invite.invitedByUid,
          };
          await tx.saveUser(newUser);
          await tx.saveInvite({ ...invite, status: 'Accepted' });
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: claims.uid,
            actorEmail: emailLower,
            actorRole: invite.role,
            action: 'STAFF_INVITE_ACTIVATED',
            collection: 'users',
            recordId: claims.uid,
            changes: { role: invite.role, inviteId: invite.id },
            createdAt: nowIso(),
          });
          return newUser;
        }

        // Strict bootstrap owner email check (never accepts public bootstrap parameters!)
        if (emailLower === bootstrapOwnerEmail.toLowerCase()) {
          const adminUser: UserSession = {
            id: claims.uid,
            uid: claims.uid,
            fullName: claims.name || 'System Administrator',
            email: emailLower,
            role: 'admin',
            designation: 'System & Identity Administrator',
            department: 'IT & Security',
            branch: 'Colombo Flagship Hub',
            disabled: false,
            invitedBy: 'trusted-owner-bootstrap',
          };
          await tx.saveUser(adminUser);
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: claims.uid,
            actorEmail: emailLower,
            actorRole: 'admin',
            action: 'BOOTSTRAP_OWNER_ACTIVATED',
            collection: 'users',
            recordId: claims.uid,
            changes: { role: 'admin' },
            createdAt: nowIso(),
          });
          return adminUser;
        }

        throw Object.assign(
          new Error('No pending staff invitation found for this email. Public self-registration is disabled.'),
          { status: 403 }
        );
      });

      res.json({ user: profile });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Activation failed.' });
    }
  });

  // GET /api/auth/session
  router.get('/auth/session', requireAuth, (req: AuthedRequest, res: Response) => {
    res.json({
      authenticated: true,
      claims: req.claims,
      user: req.staffUser || null,
      storeConfigured: store.isConfigured(),
    });
  });

  // -------------------------------------------------------------------------
  // ADMIN IDENTITY & ROLE MANAGEMENT (Admin only; separated from financial/HR payroll)
  // -------------------------------------------------------------------------
  router.get(
    '/admin/staff',
    requireAuth,
    requireStoreConfigured,
    requirePerm('users.read'),
    async (_req: AuthedRequest, res: Response) => {
      const data = await store.runTransaction(async tx => ({
        users: await tx.listUsers(),
        invites: await tx.listInvites(),
      }));
      res.json(data);
    }
  );

  router.post(
    '/admin/invites',
    requireAuth,
    requireStoreConfigured,
    requirePerm('users.manage_invites'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const { email, fullName, role, designation, department, branch } = req.body || {};
      if (!email || !fullName || !role) {
        res.status(400).json({ error: 'email, fullName, and role are required.' });
        return;
      }
      const allowedRoles: UserRole[] = [
        'admin',
        'general_manager',
        'sales',
        'finance',
        'hr',
        'service',
        'stock',
      ];
      if (!allowedRoles.includes(role)) {
        res.status(400).json({ error: 'Invalid role specified.' });
        return;
      }
      const normalizedEmail = String(email).trim().toLowerCase();
      const invite: StaffInvite = {
        id: normalizedEmail,
        email: normalizedEmail,
        fullName: String(fullName).trim(),
        role,
        designation: String(designation || role).trim(),
        department: String(department || 'Showroom Operations').trim(),
        branch: String(branch || 'Colombo Flagship Hub').trim(),
        status: 'Pending',
        invitedByUid: actor.uid,
        createdAt: nowIso(),
      };
      await store.runTransaction(async tx => {
        await tx.saveInvite(invite);
        await tx.appendAuditLog({
          id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          actorUid: actor.uid,
          actorEmail: actor.email,
          actorRole: actor.role,
          action: 'STAFF_INVITE_CREATED',
          collection: 'staff_invites',
          recordId: invite.id,
          changes: { email: normalizedEmail, role },
          createdAt: nowIso(),
        });
      });
      res.status(201).json({ invite });
    }
  );

  router.patch(
    '/admin/users/:uid/role',
    requireAuth,
    requireStoreConfigured,
    requirePerm('users.assign_role'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const targetUid = String(req.params.uid || '');
      const { role } = req.body || {};
      const allowedRoles: UserRole[] = [
        'admin',
        'general_manager',
        'sales',
        'finance',
        'hr',
        'service',
        'stock',
      ];
      if (!allowedRoles.includes(role)) {
        res.status(400).json({ error: 'Invalid role specified.' });
        return;
      }
      try {
        const updated = await store.runTransaction(async tx => {
          const target = await tx.getUserByUid(targetUid);
          if (!target) {
            throw Object.assign(new Error('Target staff account not found.'), { status: 404 });
          }
          const prevRole = target.role;
          const nextUser: UserSession = { ...target, role };
          await tx.saveUser(nextUser);
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: 'STAFF_ROLE_UPDATED',
            collection: 'users',
            recordId: targetUid,
            changes: { previousRole: prevRole, newRole: role },
            createdAt: nowIso(),
          });
          return nextUser;
        });
        res.json({ user: updated });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Role update failed.' });
      }
    }
  );

  router.patch(
    '/admin/users/:uid/status',
    requireAuth,
    requireStoreConfigured,
    requirePerm('users.toggle_disable'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const targetUid = String(req.params.uid || '');
      const { disabled } = req.body || {};
      if (typeof disabled !== 'boolean') {
        res.status(400).json({ error: 'Boolean "disabled" flag is required.' });
        return;
      }
      if (targetUid === actor.uid && disabled) {
        res.status(400).json({ error: 'Administrators cannot disable their own active session.' });
        return;
      }
      try {
        const updated = await store.runTransaction(async tx => {
          const target = await tx.getUserByUid(targetUid);
          if (!target) {
            throw Object.assign(new Error('Target user not found.'), { status: 404 });
          }
          const nextUser: UserSession = { ...target, disabled };
          await tx.saveUser(nextUser);
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: disabled ? 'STAFF_DISABLED' : 'STAFF_ENABLED',
            collection: 'users',
            recordId: targetUid,
            changes: { disabled },
            createdAt: nowIso(),
          });
          return nextUser;
        });
        res.json({ user: updated });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Status update failed.' });
      }
    }
  );

  // -------------------------------------------------------------------------
  // ATOMIC BOOKING ALLOCATION & BIKE RESERVATION
  // -------------------------------------------------------------------------
  router.post(
    '/operations/bookings',
    requireAuth,
    requireStoreConfigured,
    requirePerm('bookings.create'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const {
        requestId,
        customerName,
        customerPhone,
        customerNIC,
        customerAddress,
        bikeId,
        discountRequestedLkr = 0,
        leadId,
      } = req.body || {};

      if (!requestId || !customerName || !customerPhone || !bikeId) {
        res.status(400).json({ error: 'requestId, customerName, customerPhone, and bikeId are required.' });
        return;
      }
      if (typeof discountRequestedLkr !== 'number' || discountRequestedLkr < 0) {
        res.status(400).json({ error: 'discountRequestedLkr must be a non-negative number.' });
        return;
      }

      try {
        const result = await store.runTransaction(async tx => {
          const dup = await tx.getIdempotencyKey(requestId);
          if (dup) {
            const existingBooking = await tx.getBooking(dup.resultId);
            return { booking: existingBooking, deduplicated: true };
          }

          const bike = await tx.getBike(bikeId);
          if (!bike) {
            throw Object.assign(new Error(`Motorcycle ${bikeId} not found.`), { status: 404 });
          }
          if (bike.status !== 'Available' || bike.allocatedBookingId) {
            throw Object.assign(
              new Error(`Allocation blocked: Chassis ${bike.chassisNumber} is "${bike.status}". Only Available units can be allocated.`),
              { status: 409 }
            );
          }

          const bookingId = `BK-2026-${String(Date.now()).slice(-6)}`;
          // Sales CANNOT auto-approve discounts: discountLkr stays 0 until GM/Finance approval
          const approvedDiscount = 0;
          const booking: Booking = {
            id: bookingId,
            leadId: leadId || undefined,
            customerName: String(customerName).trim(),
            customerPhone: String(customerPhone).trim(),
            customerNIC: String(customerNIC || '').trim(),
            customerAddress: String(customerAddress || '').trim(),
            salespersonId: actor.uid,
            salespersonName: actor.fullName,
            bikeId: bike.id,
            bikeModel: bike.model,
            bikeColour: bike.colour,
            bikeChassis: bike.chassisNumber,
            bikeEngine: bike.engineNumber,
            totalPriceLkr: bike.priceLkr,
            discountRequestedLkr,
            discountLkr: approvedDiscount,
            discountStatus: discountRequestedLkr > 0 ? 'Pending' : 'None',
            finalPriceLkr: bike.priceLkr,
            verifiedPaidLkr: 0,
            balanceLkr: bike.priceLkr,
            accessories: [],
            accessoriesTotalLkr: 0,
            tradeInCreditLkr: 0,
            payments: [],
            status: 'Confirmed',
            deliveryChecklist: {
              paymentVerified: false,
              documentsChecked: false,
              pdiCompleted: false,
              customerOrientationDone: false,
              deliveryNotes: '',
            },
            requestId,
            createdByUid: actor.uid,
            createdAt: todayDDMMYYYY(),
            timeline: [
              {
                id: `tl-${Date.now()}`,
                date: nowFormattedDateTime(),
                title: 'Booking Created & Unit Reserved',
                description: `${bike.model} (${bike.chassisNumber}) atomically reserved by ${actor.fullName}.`,
                type: 'booking',
              },
            ],
          };

          await tx.saveBooking(booking);
          await tx.saveBike({ ...bike, status: 'Reserved', allocatedBookingId: bookingId });
          await tx.saveIdempotencyKey(requestId, 'BOOKING_CREATE', actor.uid, bookingId);
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: 'BOOKING_CREATE',
            collection: 'bookings',
            recordId: bookingId,
            requestId,
            changes: { bikeId: bike.id, chassis: bike.chassisNumber, discountRequestedLkr },
            createdAt: nowIso(),
          });
          return { booking, deduplicated: false };
        });

        res.status(result.deduplicated ? 200 : 201).json(result);
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Booking failed.' });
      }
    }
  );

  // Discount approval (GM or Finance ONLY — explicitly blocks Sales self-approval)
  router.post(
    '/operations/bookings/:bookingId/discount-decision',
    requireAuth,
    requireStoreConfigured,
    requirePerm('discounts.approve'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const bookingId = String(req.params.bookingId || '');
      const { approved, approvedAmountLkr } = req.body || {};
      try {
        const booking = await store.runTransaction(async tx => {
          const b = await tx.getBooking(bookingId);
          if (!b) throw Object.assign(new Error('Booking not found.'), { status: 404 });
          if (b.status !== 'Confirmed') {
            throw Object.assign(new Error('Only active Confirmed bookings can be adjusted.'), { status: 400 });
          }
          const discountLkr = approved ? Math.max(0, Number(approvedAmountLkr ?? b.discountRequestedLkr ?? 0)) : 0;
          const accTotal = b.accessoriesTotalLkr || 0;
          const tradeIn = b.tradeInCreditLkr || 0;
          const finalPriceLkr = Math.max(0, b.totalPriceLkr - discountLkr + accTotal - tradeIn);
          const verifiedPaidLkr = b.verifiedPaidLkr || 0;
          const balanceLkr = Math.max(0, finalPriceLkr - verifiedPaidLkr);
          const next: Booking = {
            ...b,
            discountLkr,
            discountStatus: approved ? 'Approved' : 'Rejected',
            discountApprovedByUid: actor.uid,
            finalPriceLkr,
            balanceLkr,
          };
          await tx.saveBooking(next);
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: approved ? 'DISCOUNT_APPROVED' : 'DISCOUNT_REJECTED',
            collection: 'bookings',
            recordId: bookingId,
            changes: { discountLkr, finalPriceLkr },
            createdAt: nowIso(),
          });
          return next;
        });
        res.json({ booking });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Discount decision failed.' });
      }
    }
  );

  // Attach accessory atomically
  router.post(
    '/operations/bookings/:bookingId/accessories',
    requireAuth,
    requireStoreConfigured,
    requirePerm('bookings.attach_accessories'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const bookingId = String(req.params.bookingId || '');
      const { accessoryId, quantity = 1 } = req.body || {};
      if (!accessoryId || quantity <= 0) {
        res.status(400).json({ error: 'Valid accessoryId and positive quantity required.' });
        return;
      }
      try {
        const booking = await store.runTransaction(async tx => {
          const b = await tx.getBooking(bookingId);
          if (!b) throw Object.assign(new Error('Booking not found.'), { status: 404 });
          if (b.status !== 'Confirmed') {
            throw Object.assign(new Error('Cannot modify accessories on delivered or cancelled booking.'), { status: 400 });
          }
          const acc = await tx.getAccessory(accessoryId);
          if (!acc) throw Object.assign(new Error('Accessory not found.'), { status: 404 });
          if (acc.stockQuantity < quantity) {
            throw Object.assign(new Error(`Insufficient stock for ${acc.name}. Available: ${acc.stockQuantity}`), { status: 409 });
          }
          const current = b.accessories || [];
          const existingIdx = current.findIndex(item => item.accessoryId === accessoryId);
          const updatedAccessories =
            existingIdx >= 0
              ? current.map((item, idx) =>
                  idx === existingIdx ? { ...item, quantity: item.quantity + quantity } : item
                )
              : [
                  ...current,
                  {
                    accessoryId: acc.id,
                    name: acc.name,
                    partNumber: acc.partNumber,
                    priceLkr: acc.priceLkr,
                    quantity,
                    installationStatus: 'Pending Installation' as const,
                  },
                ];
          const accessoriesTotalLkr = updatedAccessories.reduce(
            (sum, i) => sum + i.priceLkr * i.quantity,
            0
          );
          const finalPriceLkr = Math.max(
            0,
            b.totalPriceLkr - b.discountLkr + accessoriesTotalLkr - (b.tradeInCreditLkr || 0)
          );
          const verifiedPaidLkr = b.verifiedPaidLkr || 0;
          const balanceLkr = Math.max(0, finalPriceLkr - verifiedPaidLkr);
          const nextBooking: Booking = {
            ...b,
            accessories: updatedAccessories,
            accessoriesTotalLkr,
            finalPriceLkr,
            balanceLkr,
          };
          await tx.saveAccessory({ ...acc, stockQuantity: acc.stockQuantity - quantity });
          await tx.saveBooking(nextBooking);
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: 'ACCESSORY_ATTACHED',
            collection: 'bookings',
            recordId: bookingId,
            changes: { accessoryId, quantity, finalPriceLkr },
            createdAt: nowIso(),
          });
          return nextBooking;
        });
        res.json({ booking });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Accessory attach failed.' });
      }
    }
  );

  // Cancel Booking Atomically (releases bike and restores accessory stock)
  router.post(
    '/operations/bookings/:bookingId/cancel',
    requireAuth,
    requireStoreConfigured,
    requirePerm('bookings.cancel'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const bookingId = String(req.params.bookingId || '');
      const { reason = 'Cancelled by authorized staff' } = req.body || {};
      try {
        const booking = await store.runTransaction(async tx => {
          const b = await tx.getBooking(bookingId);
          if (!b) throw Object.assign(new Error('Booking not found.'), { status: 404 });
          if (b.status !== 'Confirmed') {
            throw Object.assign(new Error(`Booking is already ${b.status} and cannot be cancelled.`), { status: 400 });
          }

          // Release motorcycle
          const bike = await tx.getBike(b.bikeId);
          if (bike && bike.allocatedBookingId === b.id) {
            await tx.saveBike({ ...bike, status: 'Available', allocatedBookingId: undefined });
          }

          // Restore all reserved accessories atomically
          for (const item of b.accessories || []) {
            const acc = await tx.getAccessory(item.accessoryId);
            if (acc) {
              await tx.saveAccessory({ ...acc, stockQuantity: acc.stockQuantity + item.quantity });
            }
          }

          const nextBooking: Booking = {
            ...b,
            status: 'Cancelled',
            cancellationReason: String(reason),
          };
          await tx.saveBooking(nextBooking);
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: 'BOOKING_CANCELLED',
            collection: 'bookings',
            recordId: bookingId,
            changes: {
              releasedBikeId: b.bikeId,
              restoredAccessories: (b.accessories || []).map(a => ({ id: a.accessoryId, qty: a.quantity })),
              reason,
            },
            createdAt: nowIso(),
          });
          return nextBooking;
        });
        res.json({ booking });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Cancellation failed.' });
      }
    }
  );

  // Delivery Handover Gate
  router.post(
    '/operations/bookings/:bookingId/deliver',
    requireAuth,
    requireStoreConfigured,
    requirePerm('delivery.complete_handover'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const bookingId = String(req.params.bookingId || '');
      try {
        const booking = await store.runTransaction(async tx => {
          const b = await tx.getBooking(bookingId);
          if (!b) throw Object.assign(new Error('Booking not found.'), { status: 404 });
          if (b.status !== 'Confirmed') {
            throw Object.assign(new Error(`Booking status is ${b.status}, cannot deliver.`), { status: 400 });
          }
          const payments = await tx.listPaymentsByBooking(bookingId);
          const verifiedPaid = payments
            .filter(p => p.entryType !== 'REVERSAL' && p.status === 'Verified')
            .reduce((sum, p) => sum + p.amountLkr, 0);
          const balance = Math.max(0, b.finalPriceLkr - verifiedPaid);
          if (balance > 0) {
            throw Object.assign(
              new Error(`Delivery blocked: Outstanding balance of LKR ${balance} remains unverified or unpaid.`),
              { status: 400 }
            );
          }
          if (!b.deliveryChecklist.paymentVerified || !b.deliveryChecklist.documentsChecked || !b.deliveryChecklist.pdiCompleted) {
            throw Object.assign(
              new Error('Delivery blocked: All mandatory checklist gates (Payment Verified, Documents, PDI Completed) must be satisfied.'),
              { status: 400 }
            );
          }

          const bike = await tx.getBike(b.bikeId);
          if (!bike || bike.status !== 'Reserved') {
            throw Object.assign(new Error('Allocated motorcycle is not in Reserved state.'), { status: 409 });
          }
          await tx.saveBike({ ...bike, status: 'Delivered' });
          const nextBooking: Booking = {
            ...b,
            status: 'Delivered',
            deliveredAt: nowFormattedDateTime(),
            deliveredBy: actor.fullName,
          };
          await tx.saveBooking(nextBooking);
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: 'BOOKING_DELIVERED',
            collection: 'bookings',
            recordId: bookingId,
            changes: { bikeId: bike.id, deliveredBy: actor.fullName },
            createdAt: nowIso(),
          });
          return nextBooking;
        });
        res.json({ booking });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Delivery failed.' });
      }
    }
  );

  // -------------------------------------------------------------------------
  // PAYMENTS: RECORDING (UNVERIFIED), VERIFICATION (FINANCE ONLY), IMMUTABLE REVERSAL
  // -------------------------------------------------------------------------
  router.post(
    '/operations/payments',
    requireAuth,
    requireStoreConfigured,
    requirePerm('payments.record_unverified'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const { bookingId, requestId, amountLkr, type = 'Booking Advance', reference } = req.body || {};
      if (!bookingId || !requestId || typeof amountLkr !== 'number' || !reference) {
        res.status(400).json({ error: 'bookingId, requestId, numeric amountLkr, and reference are required.' });
        return;
      }
      if (amountLkr <= 0) {
        res.status(400).json({ error: 'Payment amount must be positive.' });
        return;
      }

      try {
        const result = await store.runTransaction(async tx => {
          const dup = await tx.getIdempotencyKey(requestId);
          if (dup) {
            const existingPayment = await tx.getPayment(dup.resultId);
            return { payment: existingPayment, deduplicated: true };
          }

          const booking = await tx.getBooking(bookingId);
          if (!booking) throw Object.assign(new Error('Booking not found.'), { status: 404 });
          if (booking.status !== 'Confirmed') {
            throw Object.assign(new Error('Cannot record payments for cancelled or delivered bookings.'), { status: 400 });
          }

          const existingPayments = await tx.listPaymentsByBooking(bookingId);
          const totalNonReversed = existingPayments
            .filter(p => p.status !== 'Reversed')
            .reduce((sum, p) => sum + p.amountLkr, 0);
          const remaining = Math.max(0, booking.finalPriceLkr - totalNonReversed);
          if (amountLkr > remaining) {
            throw Object.assign(
              new Error(`Overpayment blocked: Max allowable receipt is LKR ${remaining}.`),
              { status: 400 }
            );
          }

          const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          // Always starts as Pending Verification when created via general recording endpoint
          const payment: PaymentRecord & { bookingId: string } = {
            id: paymentId,
            bookingId,
            requestId,
            entryType: 'PAYMENT',
            date: todayDDMMYYYY(),
            amountLkr,
            type,
            reference: String(reference).trim(),
            status: 'Pending Verification',
            recordedByUid: actor.uid,
          };

          await tx.savePayment(payment);
          await tx.saveBooking({
            ...booking,
            payments: [...booking.payments, payment],
          });
          await tx.saveIdempotencyKey(requestId, 'PAYMENT_RECORD', actor.uid, paymentId);
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: 'PAYMENT_RECORDED_UNVERIFIED',
            collection: 'payments',
            recordId: paymentId,
            requestId,
            changes: { bookingId, amountLkr, reference },
            createdAt: nowIso(),
          });
          return { payment, deduplicated: false };
        });

        res.status(result.deduplicated ? 200 : 201).json(result);
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Payment recording failed.' });
      }
    }
  );

  router.post(
    '/operations/payments/:paymentId/verify',
    requireAuth,
    requireStoreConfigured,
    requirePerm('payments.verify'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const paymentId = String(req.params.paymentId || '');
      try {
        const result = await store.runTransaction(async tx => {
          const payment = await tx.getPayment(paymentId);
          if (!payment) throw Object.assign(new Error('Payment record not found.'), { status: 404 });
          if (payment.status === 'Verified') {
            return { payment, deduplicated: true };
          }
          if (payment.status === 'Reversed' || payment.entryType === 'REVERSAL') {
            throw Object.assign(new Error('Cannot verify a reversed entry.'), { status: 400 });
          }

          const updatedPayment: PaymentRecord & { bookingId: string } = {
            ...payment,
            status: 'Verified',
            verifiedBy: actor.fullName,
            verifiedByUid: actor.uid,
            verifiedAt: nowFormattedDateTime(),
          };
          await tx.savePayment(updatedPayment);

          const booking = await tx.getBooking(payment.bookingId);
          if (booking) {
            const allPayments = await tx.listPaymentsByBooking(payment.bookingId);
            const verifiedPaidLkr = allPayments.reduce((sum, p) => {
              if (p.id === paymentId) return sum + updatedPayment.amountLkr;
              if (p.entryType !== 'REVERSAL' && p.status === 'Verified') return sum + p.amountLkr;
              return sum;
            }, 0);
            const balanceLkr = Math.max(0, booking.finalPriceLkr - verifiedPaidLkr);
            const updatedPayments = booking.payments.map(p => (p.id === paymentId ? updatedPayment : p));
            await tx.saveBooking({
              ...booking,
              payments: updatedPayments,
              verifiedPaidLkr,
              balanceLkr,
              deliveryChecklist: {
                ...booking.deliveryChecklist,
                paymentVerified: balanceLkr === 0 && verifiedPaidLkr > 0,
              },
            });
          }

          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: 'PAYMENT_VERIFIED',
            collection: 'payments',
            recordId: paymentId,
            changes: { bookingId: payment.bookingId, amountLkr: payment.amountLkr },
            createdAt: nowIso(),
          });

          return { payment: updatedPayment, deduplicated: false };
        });
        res.json(result);
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Payment verification failed.' });
      }
    }
  );

  router.post(
    '/operations/payments/:paymentId/reverse',
    requireAuth,
    requireStoreConfigured,
    requirePerm('payments.reverse'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const paymentId = String(req.params.paymentId || '');
      const { reason = 'Finance reversal', requestId } = req.body || {};
      if (!requestId) {
        res.status(400).json({ error: 'requestId is required for idempotent payment reversal.' });
        return;
      }
      try {
        const result = await store.runTransaction(async tx => {
          const dup = await tx.getIdempotencyKey(requestId);
          if (dup) {
            const rev = await tx.getPayment(dup.resultId);
            return { reversal: rev, deduplicated: true };
          }
          const orig = await tx.getPayment(paymentId);
          if (!orig) throw Object.assign(new Error('Original payment not found.'), { status: 404 });
          if (orig.reversedByPaymentId || orig.entryType === 'REVERSAL') {
            throw Object.assign(new Error('Payment has already been reversed.'), { status: 409 });
          }

          const reversalId = `REV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const reversal: PaymentRecord & { bookingId: string } = {
            id: reversalId,
            bookingId: orig.bookingId,
            requestId,
            entryType: 'REVERSAL',
            reversesPaymentId: orig.id,
            date: todayDDMMYYYY(),
            amountLkr: orig.status === 'Verified' ? -Math.abs(orig.amountLkr) : 0,
            type: orig.type,
            reference: `REV-${orig.reference}`,
            status: 'Verified',
            recordedByUid: actor.uid,
            verifiedBy: actor.fullName,
            verifiedByUid: actor.uid,
            verifiedAt: nowFormattedDateTime(),
            notes: String(reason),
          };
          const markedOrig: PaymentRecord & { bookingId: string } = {
            ...orig,
            status: 'Reversed',
            reversedByPaymentId: reversalId,
          };

          await tx.savePayment(markedOrig);
          await tx.savePayment(reversal);
          await tx.saveIdempotencyKey(requestId, 'PAYMENT_REVERSE', actor.uid, reversalId);

          const booking = await tx.getBooking(orig.bookingId);
          if (booking) {
            const netVerified = booking.payments
              .filter(p => p.id !== orig.id && p.entryType !== 'REVERSAL' && p.status === 'Verified')
              .reduce((s, p) => s + p.amountLkr, 0);
            const balanceLkr = Math.max(0, booking.finalPriceLkr - netVerified);
            await tx.saveBooking({
              ...booking,
              payments: [...booking.payments.map(p => (p.id === orig.id ? markedOrig : p)), reversal],
              verifiedPaidLkr: netVerified,
              balanceLkr,
              deliveryChecklist: {
                ...booking.deliveryChecklist,
                paymentVerified: balanceLkr === 0 && netVerified > 0,
              },
            });
          }

          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: 'PAYMENT_REVERSED',
            collection: 'payments',
            recordId: reversalId,
            requestId,
            changes: { reversesPaymentId: orig.id, bookingId: orig.bookingId, reason },
            createdAt: nowIso(),
          });

          return { reversal, deduplicated: false };
        });
        res.status(result.deduplicated ? 200 : 201).json(result);
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Reversal failed.' });
      }
    }
  );

  // -------------------------------------------------------------------------
  // TRADE-IN VALUATION APPROVAL & APPLICATION
  // -------------------------------------------------------------------------
  router.post(
    '/operations/tradeins/:tradeInId/decision',
    requireAuth,
    requireStoreConfigured,
    requirePerm('tradein.approve'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const tradeInId = String(req.params.tradeInId || '');
      const { approved } = req.body || {};
      try {
        const tradeIn = await store.runTransaction(async tx => {
          const ti = await tx.getTradeIn(tradeInId);
          if (!ti) throw Object.assign(new Error('Trade-in valuation not found.'), { status: 404 });
          if (ti.status === 'Applied') {
            throw Object.assign(new Error('Trade-in already applied to a booking.'), { status: 409 });
          }
          const next: TradeInValuation = {
            ...ti,
            status: approved ? 'Approved' : 'Rejected',
            approvedBy: actor.fullName,
            approvedByUid: actor.uid,
            approvedAt: nowFormattedDateTime(),
          };
          await tx.saveTradeIn(next);
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: approved ? 'TRADEIN_APPROVED' : 'TRADEIN_REJECTED',
            collection: 'trade_ins',
            recordId: tradeInId,
            changes: { estimatedValuationLkr: ti.estimatedValuationLkr },
            createdAt: nowIso(),
          });
          return next;
        });
        res.json({ tradeIn });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Trade-in decision failed.' });
      }
    }
  );

  router.post(
    '/operations/tradeins/:tradeInId/apply',
    requireAuth,
    requireStoreConfigured,
    requirePerm('tradein.approve'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const tradeInId = String(req.params.tradeInId || '');
      const { bookingId } = req.body || {};
      if (!bookingId) {
        res.status(400).json({ error: 'bookingId is required.' });
        return;
      }
      try {
        const booking = await store.runTransaction(async tx => {
          const ti = await tx.getTradeIn(tradeInId);
          if (!ti) throw Object.assign(new Error('Trade-in valuation not found.'), { status: 404 });
          if (ti.status !== 'Approved') {
            throw Object.assign(
              new Error(`Trade-in credit blocked: valuation status is "${ti.status || 'Pending Approval'}". Approval by GM or Finance is required before applying credit.`),
              { status: 400 }
            );
          }
          if (ti.appliedBookingId) {
            throw Object.assign(new Error('Trade-in credit has already been applied to a booking.'), { status: 409 });
          }

          const b = await tx.getBooking(bookingId);
          if (!b) throw Object.assign(new Error('Target booking not found.'), { status: 404 });
          if (b.status !== 'Confirmed') {
            throw Object.assign(new Error('Cannot apply trade-in to cancelled or delivered booking.'), { status: 400 });
          }

          const credit = ti.estimatedValuationLkr;
          const accTotal = b.accessoriesTotalLkr || 0;
          const finalPriceLkr = Math.max(0, b.totalPriceLkr - b.discountLkr + accTotal - credit);
          const verifiedPaidLkr = b.verifiedPaidLkr || 0;
          const balanceLkr = Math.max(0, finalPriceLkr - verifiedPaidLkr);

          const nextBooking: Booking = {
            ...b,
            tradeInCreditLkr: credit,
            appliedTradeInId: ti.id,
            finalPriceLkr,
            balanceLkr,
          };
          await tx.saveBooking(nextBooking);
          await tx.saveTradeIn({ ...ti, status: 'Applied', appliedBookingId: b.id });
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: 'TRADEIN_APPLIED',
            collection: 'bookings',
            recordId: bookingId,
            changes: { tradeInId: ti.id, creditLkr: credit, finalPriceLkr },
            createdAt: nowIso(),
          });
          return nextBooking;
        });
        res.json({ booking });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Trade-in apply failed.' });
      }
    }
  );

  // -------------------------------------------------------------------------
  // RESTRICTED HR PAYROLL ENDPOINT (HR ROLE ONLY!)
  // -------------------------------------------------------------------------
  router.get(
    '/operations/payroll',
    requireAuth,
    requireStoreConfigured,
    requirePerm('hr.payroll.read'),
    async (_req: AuthedRequest, res: Response) => {
      const payroll = await store.runTransaction(async tx => tx.listPayrolls());
      res.json({ payroll });
    }
  );

  // -------------------------------------------------------------------------
  // AUDIT LOGS & BACKUP/RESTORE (Admin & GM/Finance read audit; Admin backup/restore)
  // -------------------------------------------------------------------------
  router.get(
    '/audit-logs',
    requireAuth,
    requireStoreConfigured,
    requirePerm('audit.view'),
    async (_req: AuthedRequest, res: Response) => {
      const logs = await store.runTransaction(async tx => tx.listAuditLogs(200));
      res.json({ logs });
    }
  );

  router.get(
    '/backup/export',
    requireAuth,
    requireStoreConfigured,
    requirePerm('backup.export'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const snapshot = await store.runTransaction(async tx => {
        const exported = await tx.exportAllCollections();
        await tx.appendAuditLog({
          id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          actorUid: actor.uid,
          actorEmail: actor.email,
          actorRole: actor.role,
          action: 'DATABASE_BACKUP_EXPORTED',
          collection: 'system',
          recordId: 'full-snapshot',
          createdAt: nowIso(),
        });
        return exported;
      });
      res.json({ exportedAt: nowIso(), project: 'showroomos', snapshot });
    }
  );

  router.post(
    '/backup/restore',
    requireAuth,
    requireStoreConfigured,
    requirePerm('backup.export'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const { snapshot } = req.body || {};
      if (!snapshot || typeof snapshot !== 'object') {
        res.status(400).json({ error: 'Valid JSON snapshot object is required.' });
        return;
      }
      await store.runTransaction(async tx => {
        await tx.restoreAllCollections(snapshot);
        await tx.appendAuditLog({
          id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          actorUid: actor.uid,
          actorEmail: actor.email,
          actorRole: actor.role,
          action: 'DATABASE_BACKUP_RESTORED',
          collection: 'system',
          recordId: 'full-snapshot',
          createdAt: nowIso(),
        });
      });
      res.json({ restored: true, restoredAt: nowIso() });
    }
  );

  return router;
}
