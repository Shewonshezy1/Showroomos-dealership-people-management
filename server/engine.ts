/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  ALL_PERMISSIONS,
  ALL_STAFF_ROLES,
  DEALERSHIP_MODULES,
  DEFAULT_RESTRICTED_ADMIN_LIMITS,
  INVITABLE_STAFF_ROLES,
  PERMANENT_SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_ONLY_PERMISSIONS,
  buildPermissionsFromAdminLimits,
  hasUserPermission,
  isPermanentOwnerEmail,
  isSuperAdminUser,
} from '../src/auth/permissions.ts';
import type { Permission } from '../src/auth/permissions.ts';
import type {
  Accessory,
  AuditLogEntry,
  Bike,
  Booking,
  DealershipModule,
  Employee,
  EmployeeSalary,
  LeaveRequest,
  PaymentRecord,
  StaffInvite,
  SystemAdminLimits,
  TradeInValuation,
  UserRole,
  UserSession,
} from '../src/types/index.ts';

export interface VerifiedTokenClaims {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  customRole?: UserRole;
}

export type TokenVerifier = (idToken: string) => Promise<VerifiedTokenClaims>;

export interface DataStoreTx {
  getUserByUid(uid: string): Promise<UserSession | null>;
  getInviteByEmail(email: string): Promise<StaffInvite | null>;
  saveUser(user: UserSession): Promise<void>;
  deleteUser?(uid: string): Promise<void>;
  saveInvite(invite: StaffInvite): Promise<void>;
  deleteInvite?(email: string): Promise<void>;
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
  syncCustomClaims?: (uid: string, role: UserRole, disabled: boolean) => Promise<void>;
  createAuthUser?: (input: { email: string; password: string; fullName: string }) => Promise<{ uid: string }>;
  deleteAuthUser?: (uid: string) => Promise<void>;
  resetAuthPassword?: (input: { uid: string; email: string; newPassword?: string }) => Promise<{ resetLink?: string }>;
}

interface AuthedRequest extends Request {
  staffUser?: UserSession;
  claims?: VerifiedTokenClaims;
}

const VALID_MODULES = new Set<DealershipModule>(DEALERSHIP_MODULES.map(m => m.id));

function sanitizeAdminLimits(raw: unknown): SystemAdminLimits {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_RESTRICTED_ADMIN_LIMITS };
  }
  const obj = raw as Record<string, unknown>;
  const modsRaw = Array.isArray(obj.allowedModules) ? obj.allowedModules : [];
  const allowedModules = Array.from(
    new Set(modsRaw.filter((m): m is DealershipModule => typeof m === 'string' && VALID_MODULES.has(m as DealershipModule)))
  );
  if (!allowedModules.includes('dashboard')) {
    allowedModules.unshift('dashboard');
  }
  const maxNum = Number(obj.maxAccountsCanCreate);
  return {
    allowedModules,
    canCreateStaff: Boolean(obj.canCreateStaff),
    canCreateSystemAdmins: Boolean(obj.canCreateSystemAdmins),
    maxAccountsCanCreate: Number.isFinite(maxNum) && maxNum >= 0 ? Math.floor(maxNum) : 0,
    canDeleteUsers: Boolean(obj.canDeleteUsers),
    canResetPasswords: Boolean(obj.canResetPasswords),
    canViewAuditLogs: Boolean(obj.canViewAuditLogs),
    canAssignPermissions: Boolean(obj.canAssignPermissions),
    canExportBackup: Boolean(obj.canExportBackup),
  };
}

function sanitizeAssignedPermissions(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const cleaned = Array.from(
    new Set(
      raw
        .filter((p): p is Permission => typeof p === 'string' && (ALL_PERMISSIONS as readonly string[]).includes(p))
        .filter(p => !SUPER_ADMIN_ONLY_PERMISSIONS.has(p))
    )
  );
  return cleaned;
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
  const { verifyToken, store, syncCustomClaims, createAuthUser, deleteAuthUser, resetAuthPassword } = options;

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

  // Ensure Permanent Owner (Shewonshezy12@gmail.com) is automatically assigned SUPER_ADMIN and cannot be stripped
  const ensurePermanentOwnerTx = async (
    tx: DataStoreTx,
    claims: VerifiedTokenClaims
  ): Promise<UserSession> => {
    const existing = await tx.getUserByUid(claims.uid);
    if (
      existing &&
      existing.role === 'super_admin' &&
      !existing.disabled &&
      existing.isPermanentOwner
    ) {
      return existing;
    }
    const ownerProfile: UserSession = {
      ...(existing || {}),
      id: claims.uid,
      uid: claims.uid,
      fullName: existing?.fullName || claims.name || 'Super Administrator / Owner',
      email: PERMANENT_SUPER_ADMIN_EMAIL,
      role: 'super_admin',
      designation: 'Super Administrator / Owner',
      department: existing?.department || 'Executive & Ownership',
      branch: existing?.branch || 'Colombo Flagship Hub',
      disabled: false,
      isPermanentOwner: true,
    };
    await tx.saveUser(ownerProfile);
    await tx.appendAuditLog({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      actorUid: claims.uid,
      actorEmail: PERMANENT_SUPER_ADMIN_EMAIL,
      actorRole: 'super_admin',
      action: 'OWNER_SUPER_ADMIN_AUTO_ASSIGNED',
      collection: 'users',
      recordId: claims.uid,
      changes: {
        role: 'super_admin',
        previousRole: existing?.role || null,
        isPermanentOwner: true,
      },
      createdAt: nowIso(),
    });
    return ownerProfile;
  };

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
      const isPermOwner = isPermanentOwnerEmail(claims.email);
      let ownerAutoSynced = false;
      const staff = await store.runTransaction(async tx => {
        if (isPermOwner) {
          const prev = await tx.getUserByUid(claims.uid);
          if (!prev || prev.role !== 'super_admin' || prev.disabled || !prev.isPermanentOwner) {
            ownerAutoSynced = true;
          }
          return ensurePermanentOwnerTx(tx, claims);
        }
        return tx.getUserByUid(claims.uid);
      });

      if (ownerAutoSynced && syncCustomClaims && staff) {
        await syncCustomClaims(staff.uid, 'super_admin', false);
      }

      if (!staff) {
        res.status(403).json({
          error: 'Account not provisioned. Only the Super Administrator or an authorized System Administrator can create accounts.',
          code: 'ACCOUNT_NOT_PROVISIONED',
        });
        return;
      }
      if (staff.disabled) {
        res.status(403).json({
          error: 'Staff account is disabled. Contact the Super Administrator.',
          code: 'ACCOUNT_DISABLED',
        });
        return;
      }
      if (!isPermOwner && claims.customRole && claims.customRole !== staff.role) {
        res.status(403).json({
          error: 'Role claim mismatch. Please sign out and sign in again to refresh your access token.',
          code: 'CLAIMS_OUT_OF_SYNC',
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
      if (!hasUserPermission(req.staffUser, perm)) {
        res.status(403).json({
          error: `Access denied: account lacks permission "${perm}".`,
          code: 'FORBIDDEN_ROLE',
        });
        return;
      }
      next();
    };
  };

  // POST /api/auth/activate-invite
  // Cryptographically verifies token; auto-assigns Permanent Super Admin for Shewonshezy12@gmail.com;
  // otherwise checks Pending invite by verified token email (NEVER request body role!)
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
      const emailLower = claims.email.toLowerCase();
      const profile = await store.runTransaction(async tx => {
        if (isPermanentOwnerEmail(emailLower)) {
          const owner = await ensurePermanentOwnerTx(tx, claims);
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: owner.uid,
            actorEmail: owner.email,
            actorRole: 'super_admin',
            action: 'LOGIN_SUCCEEDED',
            collection: 'auth',
            recordId: owner.uid,
            changes: { role: 'super_admin', isPermanentOwner: true },
            createdAt: nowIso(),
          });
          return owner;
        }

        const existing = await tx.getUserByUid(claims.uid);
        if (existing) {
          if (existing.disabled) {
            await tx.appendAuditLog({
              id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              actorUid: claims.uid,
              actorEmail: emailLower,
              actorRole: existing.role,
              action: 'LOGIN_BLOCKED_DISABLED',
              collection: 'auth',
              recordId: claims.uid,
              changes: { reason: 'Account disabled' },
              createdAt: nowIso(),
            });
            throw Object.assign(new Error('Staff account is disabled.'), { status: 403 });
          }
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: existing.uid,
            actorEmail: existing.email,
            actorRole: existing.role,
            action: 'LOGIN_SUCCEEDED',
            collection: 'auth',
            recordId: existing.uid,
            changes: { role: existing.role },
            createdAt: nowIso(),
          });
          return existing;
        }

        const invite = await tx.getInviteByEmail(emailLower);

        if (invite && invite.status === 'Pending' && invite.role !== 'super_admin') {
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
            ...(invite.adminLimits ? { adminLimits: invite.adminLimits, accountsCreatedCount: 0 } : {}),
            ...(invite.assignedPermissions ? { assignedPermissions: invite.assignedPermissions } : {}),
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
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: claims.uid,
            actorEmail: emailLower,
            actorRole: invite.role,
            action: 'LOGIN_SUCCEEDED',
            collection: 'auth',
            recordId: claims.uid,
            changes: { role: invite.role, firstActivation: true },
            createdAt: nowIso(),
          });
          return newUser;
        }

        await tx.appendAuditLog({
          id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          actorUid: claims.uid,
          actorEmail: emailLower,
          actorRole: 'sales',
          action: 'LOGIN_BLOCKED_UNINVITED',
          collection: 'auth',
          recordId: claims.uid,
          changes: { email: emailLower, reason: 'No active invitation or provisioned profile' },
          createdAt: nowIso(),
        });

        throw Object.assign(
          new Error('No pending staff invitation found for this email. Public self-registration is disabled.'),
          { status: 403 }
        );
      });

      if (syncCustomClaims) {
        await syncCustomClaims(profile.uid, profile.role, profile.disabled);
      }

      res.json({ user: profile });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status || 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Activation failed.' });
    }
  });

  // POST /api/auth/login-audit
  // Records login attempts (including failed password attempts and blocked uninvited/unverified attempts)
  router.post('/auth/login-audit', async (req: Request, res: Response) => {
    if (!store.isConfigured()) {
      res.status(202).json({ logged: false, reason: 'ADMIN_STORE_UNCONFIGURED' });
      return;
    }

    const { outcome, email, reason } = req.body || {};
    const allowedOutcomes = new Set([
      'LOGIN_SUCCEEDED',
      'LOGIN_FAILED',
      'LOGIN_BLOCKED_UNINVITED',
      'LOGIN_BLOCKED_DISABLED',
      'LOGIN_BLOCKED_UNVERIFIED',
    ]);
    const action = typeof outcome === 'string' && allowedOutcomes.has(outcome) ? outcome : 'LOGIN_FAILED';

    let verifiedClaims: VerifiedTokenClaims | null = null;
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      try {
        verifiedClaims = await verifyToken(header.slice('Bearer '.length).trim());
      } catch {
        verifiedClaims = null;
      }
    }

    const actorEmail = (verifiedClaims?.email || String(email || 'unknown')).trim().toLowerCase().slice(0, 160);
    const actorUid = verifiedClaims?.uid || 'anonymous-login-attempt';

    await store.runTransaction(async tx => {
      const existing = verifiedClaims ? await tx.getUserByUid(verifiedClaims.uid) : null;
      await tx.appendAuditLog({
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        actorUid,
        actorEmail,
        actorRole: existing?.role || (isPermanentOwnerEmail(actorEmail) ? 'super_admin' : 'sales'),
        action,
        collection: 'auth',
        recordId: actorUid,
        changes: {
          email: actorEmail,
          ...(reason ? { reason: String(reason).slice(0, 200) } : {}),
        },
        createdAt: nowIso(),
      });
    });

    res.status(201).json({ logged: true });
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
  // SUPER ADMIN & SYSTEM ADMIN IDENTITY / PERMISSIONS / USER LIFECYCLE
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

  // POST /api/admin/users - Create new Staff User OR System Administrator account
  router.post(
    '/admin/users',
    requireAuth,
    requireStoreConfigured,
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const {
        email,
        fullName,
        role,
        password,
        designation,
        department,
        branch,
        adminLimits,
        assignedPermissions,
      } = req.body || {};

      if (!email || !fullName || !role) {
        res.status(400).json({ error: 'email, fullName, and role are required.' });
        return;
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      if (!normalizedEmail.includes('@')) {
        res.status(400).json({ error: 'Valid email address is required.' });
        return;
      }
      if (isPermanentOwnerEmail(normalizedEmail)) {
        res.status(403).json({
          error: 'Permanent Super Administrator / Owner account cannot be created or overwritten here.',
          code: 'PERMANENT_OWNER_PROTECTED',
        });
        return;
      }
      if (!ALL_STAFF_ROLES.includes(role)) {
        res.status(400).json({ error: 'Invalid role specified.' });
        return;
      }

      const actorIsSuper = isSuperAdminUser(actor);
      if (role === 'super_admin' && !actorIsSuper) {
        res.status(403).json({
          error: 'Only the Super Administrator / Owner can grant Super Administrator privileges.',
          code: 'FORBIDDEN_SUPER_ADMIN_ESCALATION',
        });
        return;
      }
      if (role === 'admin' && !hasUserPermission(actor, 'users.create_admin')) {
        res.status(403).json({
          error: 'Access denied: you do not have permission to create System Administrator accounts.',
          code: 'FORBIDDEN_ADMIN_CREATION',
        });
        return;
      }
      if (role !== 'admin' && role !== 'super_admin' && !hasUserPermission(actor, 'users.create_staff')) {
        res.status(403).json({
          error: 'Access denied: you do not have permission to create staff accounts.',
          code: 'FORBIDDEN_STAFF_CREATION',
        });
        return;
      }

      const cleanLimits = role === 'admin' ? sanitizeAdminLimits(adminLimits) : undefined;
      const cleanPerms =
        role === 'super_admin'
          ? undefined
          : sanitizeAssignedPermissions(
              assignedPermissions !== undefined
                ? assignedPermissions
                : cleanLimits
                ? buildPermissionsFromAdminLimits(cleanLimits)
                : undefined
            );

      // Check account creation quota BEFORE calling Firebase Auth user creation
      if (!actorIsSuper) {
        try {
          await store.runTransaction(async tx => {
            const freshActor = await tx.getUserByUid(actor.uid);
            const maxAllowed = freshActor?.adminLimits?.maxAccountsCanCreate ?? 0;
            const used = freshActor?.accountsCreatedCount ?? 0;
            if (used >= maxAllowed) {
              throw Object.assign(
                new Error(
                  `Account creation limit reached (${used}/${maxAllowed} accounts created). Ask the Super Administrator to increase your quota.`
                ),
                { status: 403, code: 'ACCOUNT_CREATION_LIMIT_REACHED' }
              );
            }
          });
        } catch (err: unknown) {
          const status = (err as { status?: number })?.status || 500;
          const code = (err as { code?: string })?.code;
          res.status(status).json({ error: err instanceof Error ? err.message : 'Quota check failed.', code });
          return;
        }
      }

      // Mode 1: Direct account creation with password via Firebase Admin Auth
      if (typeof password === 'string' && password.length > 0) {
        if (password.length < 6) {
          res.status(400).json({ error: 'Password must be at least 6 characters.' });
          return;
        }
        if (!createAuthUser) {
          res.status(503).json({
            error: 'Server-side Firebase Admin Auth is unavailable to create password accounts directly.',
            code: 'ADMIN_AUTH_UNCONFIGURED',
          });
          return;
        }

        let createdAuth: { uid: string };
        try {
          createdAuth = await createAuthUser({
            email: normalizedEmail,
            password,
            fullName: String(fullName).trim(),
          });
        } catch (err: unknown) {
          const status = (err as { status?: number })?.status || 500;
          const code = (err as { code?: string })?.code;
          res.status(status).json({
            error: err instanceof Error ? err.message : 'Failed to create Firebase Auth user.',
            code,
          });
          return;
        }

        try {
          const newUser = await store.runTransaction(async tx => {
            const freshActor = await tx.getUserByUid(actor.uid);
            if (!actorIsSuper) {
              const maxAllowed = freshActor?.adminLimits?.maxAccountsCanCreate ?? 0;
              const used = freshActor?.accountsCreatedCount ?? 0;
              if (used >= maxAllowed) {
                throw Object.assign(
                  new Error(`Account creation limit reached (${used}/${maxAllowed}).`),
                  { status: 403, code: 'ACCOUNT_CREATION_LIMIT_REACHED' }
                );
              }
              if (freshActor) {
                await tx.saveUser({ ...freshActor, accountsCreatedCount: used + 1 });
              }
            }

            const profile: UserSession = {
              id: createdAuth.uid,
              uid: createdAuth.uid,
              fullName: String(fullName).trim(),
              email: normalizedEmail,
              role,
              designation: String(designation || role).trim(),
              department: String(department || 'Showroom Operations').trim(),
              branch: String(branch || 'Colombo Flagship Hub').trim(),
              disabled: false,
              createdByUid: actor.uid,
              invitedBy: actor.uid,
              ...(cleanLimits ? { adminLimits: cleanLimits, accountsCreatedCount: 0 } : {}),
              ...(cleanPerms ? { assignedPermissions: cleanPerms } : {}),
            };
            await tx.saveUser(profile);
            await tx.appendAuditLog({
              id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              actorUid: actor.uid,
              actorEmail: actor.email,
              actorRole: actor.role,
              action: role === 'admin' ? 'SYSTEM_ADMIN_CREATED' : 'ACCOUNT_CREATED',
              collection: 'users',
              recordId: profile.uid,
              changes: {
                email: normalizedEmail,
                role,
                mode: 'direct_password',
                ...(cleanLimits ? { adminLimits: cleanLimits } : {}),
                ...(cleanPerms ? { assignedPermissionsCount: cleanPerms.length } : {}),
              },
              createdAt: nowIso(),
            });
            return profile;
          });

          if (syncCustomClaims) {
            await syncCustomClaims(newUser.uid, newUser.role, false);
          }
          res.status(201).json({ user: newUser });
          return;
        } catch (err: unknown) {
          const status = (err as { status?: number })?.status || 500;
          const code = (err as { code?: string })?.code;
          res.status(status).json({ error: err instanceof Error ? err.message : 'Account creation failed.', code });
          return;
        }
      }

      // Mode 2: Pre-approved invitation (for Google Sign-In or Email sign-in activation)
      if (role === 'super_admin') {
        res.status(403).json({
          error: 'Super Administrator / Owner cannot be invited via pending email invites.',
        });
        return;
      }

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
        ...(cleanLimits ? { adminLimits: cleanLimits } : {}),
        ...(cleanPerms ? { assignedPermissions: cleanPerms } : {}),
        createdAt: nowIso(),
      };

      try {
        await store.runTransaction(async tx => {
          const freshActor = await tx.getUserByUid(actor.uid);
          if (!actorIsSuper) {
            const maxAllowed = freshActor?.adminLimits?.maxAccountsCanCreate ?? 0;
            const used = freshActor?.accountsCreatedCount ?? 0;
            if (used >= maxAllowed) {
              throw Object.assign(
                new Error(`Account creation limit reached (${used}/${maxAllowed}).`),
                { status: 403, code: 'ACCOUNT_CREATION_LIMIT_REACHED' }
              );
            }
            if (freshActor) {
              await tx.saveUser({ ...freshActor, accountsCreatedCount: used + 1 });
            }
          }
          await tx.saveInvite(invite);
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: role === 'admin' ? 'SYSTEM_ADMIN_INVITE_CREATED' : 'ACCOUNT_CREATED',
            collection: 'staff_invites',
            recordId: invite.id,
            changes: { email: normalizedEmail, role, mode: 'invite' },
            createdAt: nowIso(),
          });
        });
        res.status(201).json({ invite });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        const code = (err as { code?: string })?.code;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Invite creation failed.', code });
      }
    }
  );

  router.post(
    '/admin/invites',
    requireAuth,
    requireStoreConfigured,
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const { email, fullName, role, designation, department, branch, adminLimits, assignedPermissions } =
        req.body || {};
      if (!email || !fullName || !role) {
        res.status(400).json({ error: 'email, fullName, and role are required.' });
        return;
      }
      if (role === 'super_admin') {
        res.status(403).json({
          error: 'Super Administrator / Owner cannot be granted via staff email invitations.',
        });
        return;
      }
      if (!INVITABLE_STAFF_ROLES.includes(role)) {
        res.status(400).json({ error: 'Invalid role specified.' });
        return;
      }

      const actorIsSuper = isSuperAdminUser(actor);
      if (role === 'admin' && !hasUserPermission(actor, 'users.create_admin')) {
        res.status(403).json({
          error: 'Access denied: you lack permission to invite System Administrators.',
          code: 'FORBIDDEN_ADMIN_CREATION',
        });
        return;
      }
      if (role !== 'admin' && !hasUserPermission(actor, 'users.manage_invites') && !hasUserPermission(actor, 'users.create_staff')) {
        res.status(403).json({
          error: 'Access denied: you lack permission to invite staff accounts.',
          code: 'FORBIDDEN_STAFF_CREATION',
        });
        return;
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const cleanLimits = role === 'admin' ? sanitizeAdminLimits(adminLimits) : undefined;
      const cleanPerms = sanitizeAssignedPermissions(
        assignedPermissions !== undefined
          ? assignedPermissions
          : cleanLimits
          ? buildPermissionsFromAdminLimits(cleanLimits)
          : undefined
      );

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
        ...(cleanLimits ? { adminLimits: cleanLimits } : {}),
        ...(cleanPerms ? { assignedPermissions: cleanPerms } : {}),
        createdAt: nowIso(),
      };
      try {
        await store.runTransaction(async tx => {
          const freshActor = await tx.getUserByUid(actor.uid);
          if (!actorIsSuper) {
            const maxAllowed = freshActor?.adminLimits?.maxAccountsCanCreate ?? 0;
            const used = freshActor?.accountsCreatedCount ?? 0;
            if (used >= maxAllowed) {
              throw Object.assign(
                new Error(`Account creation limit reached (${used}/${maxAllowed}).`),
                { status: 403, code: 'ACCOUNT_CREATION_LIMIT_REACHED' }
              );
            }
            if (freshActor) {
              await tx.saveUser({ ...freshActor, accountsCreatedCount: used + 1 });
            }
          }
          await tx.saveInvite(invite);
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: 'ACCOUNT_CREATED',
            collection: 'staff_invites',
            recordId: invite.id,
            changes: { email: normalizedEmail, role, mode: 'invite' },
            createdAt: nowIso(),
          });
        });
        res.status(201).json({ invite });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        const code = (err as { code?: string })?.code;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Invite creation failed.', code });
      }
    }
  );

  router.delete(
    '/admin/invites/:email',
    requireAuth,
    requireStoreConfigured,
    requirePerm('users.manage_invites'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const email = decodeURIComponent(String(req.params.email || '')).trim().toLowerCase();
      if (!email) {
        res.status(400).json({ error: 'Invite email is required.' });
        return;
      }
      await store.runTransaction(async tx => {
        if (tx.deleteInvite) {
          await tx.deleteInvite(email);
        } else {
          const inv = await tx.getInviteByEmail(email);
          if (inv) await tx.saveInvite({ ...inv, status: 'Revoked' });
        }
        await tx.appendAuditLog({
          id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          actorUid: actor.uid,
          actorEmail: actor.email,
          actorRole: actor.role,
          action: 'INVITE_REVOKED',
          collection: 'staff_invites',
          recordId: email,
          changes: { email },
          createdAt: nowIso(),
        });
      });
      res.json({ revoked: true });
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
      if (!ALL_STAFF_ROLES.includes(role)) {
        res.status(400).json({ error: 'Invalid role specified.' });
        return;
      }
      if (targetUid === actor.uid) {
        res.status(403).json({ error: 'Administrators cannot modify their own role.' });
        return;
      }
      const actorIsSuper = isSuperAdminUser(actor);
      if (role === 'super_admin' && !actorIsSuper) {
        res.status(403).json({
          error: 'Access denied: restricted System Administrators cannot grant Super Administrator / Owner privileges.',
          code: 'FORBIDDEN_SUPER_ADMIN_ESCALATION',
        });
        return;
      }
      if (role === 'admin' && !actorIsSuper && !actor.adminLimits?.canCreateSystemAdmins) {
        res.status(403).json({
          error: 'Access denied: you do not have permission to assign the System Administrator role.',
        });
        return;
      }
      try {
        const updated = await store.runTransaction(async tx => {
          const target = await tx.getUserByUid(targetUid);
          if (!target) {
            throw Object.assign(new Error('Target staff account not found.'), { status: 404 });
          }
          if (isPermanentOwnerEmail(target.email) || target.isPermanentOwner) {
            throw Object.assign(
              new Error('Permanent Super Administrator / Owner (Shewonshezy12@gmail.com) cannot be demoted or modified.'),
              { status: 403 }
            );
          }
          if (target.role === 'super_admin' && !actorIsSuper) {
            throw Object.assign(
              new Error('Access denied: restricted System Administrators cannot modify Super Administrator accounts.'),
              { status: 403 }
            );
          }
          if (target.role === 'super_admin' && role !== 'super_admin' && !target.disabled) {
            const allUsers = await tx.listUsers();
            const activeSuperAdmins = allUsers.filter(u => u.role === 'super_admin' && !u.disabled);
            if (activeSuperAdmins.length <= 1) {
              throw Object.assign(
                new Error('Cannot demote the last active Super Administrator / Owner.'),
                { status: 409 }
              );
            }
          }
          const prevRole = target.role;
          const nextLimits =
            role === 'admin'
              ? target.adminLimits || { ...DEFAULT_RESTRICTED_ADMIN_LIMITS }
              : undefined;
          const nextUser: UserSession = {
            ...target,
            role,
            ...(nextLimits ? { adminLimits: nextLimits } : { adminLimits: undefined }),
          };
          if (role !== 'admin') delete nextUser.adminLimits;
          delete nextUser.assignedPermissions;
          await tx.saveUser(nextUser);
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: 'ROLE_CHANGE',
            collection: 'users',
            recordId: targetUid,
            changes: { targetEmail: target.email, previousRole: prevRole, newRole: role },
            createdAt: nowIso(),
          });
          return nextUser;
        });
        if (syncCustomClaims) {
          await syncCustomClaims(updated.uid, updated.role, updated.disabled);
        }
        res.json({ user: updated });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Role update failed.' });
      }
    }
  );

  // PATCH /api/admin/users/:uid/permissions - Assign granular permissions and System Admin limits
  router.patch(
    '/admin/users/:uid/permissions',
    requireAuth,
    requireStoreConfigured,
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const targetUid = String(req.params.uid || '');
      const { adminLimits, assignedPermissions } = req.body || {};

      const actorIsSuper = isSuperAdminUser(actor);
      if (!actorIsSuper && !hasUserPermission(actor, 'users.assign_role')) {
        res.status(403).json({
          error: 'Access denied: you do not have permission to change account permissions.',
        });
        return;
      }

      try {
        const updated = await store.runTransaction(async tx => {
          const target = await tx.getUserByUid(targetUid);
          if (!target) {
            throw Object.assign(new Error('Target user not found.'), { status: 404 });
          }
          if (isPermanentOwnerEmail(target.email) || target.isPermanentOwner) {
            throw Object.assign(
              new Error('Permanent Super Administrator / Owner permissions cannot be restricted or removed.'),
              { status: 403 }
            );
          }
          if (target.role === 'super_admin' && !actorIsSuper) {
            throw Object.assign(
              new Error('Restricted System Administrators cannot alter Super Administrator permissions.'),
              { status: 403 }
            );
          }
          if (target.role === 'admin' && !actorIsSuper) {
            throw Object.assign(
              new Error('Only the Super Administrator / Owner can set System Administrator limits and permissions.'),
              { status: 403 }
            );
          }

          const nextUser: UserSession = { ...target };
          if (target.role === 'admin' && adminLimits !== undefined) {
            nextUser.adminLimits = sanitizeAdminLimits(adminLimits);
            nextUser.assignedPermissions =
              assignedPermissions !== undefined
                ? sanitizeAssignedPermissions(assignedPermissions)
                : buildPermissionsFromAdminLimits(nextUser.adminLimits);
          } else if (assignedPermissions !== undefined) {
            const clean = sanitizeAssignedPermissions(assignedPermissions);
            if (clean) {
              nextUser.assignedPermissions = clean;
            }
          }

          await tx.saveUser(nextUser);
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: 'PERMISSION_CHANGE',
            collection: 'users',
            recordId: targetUid,
            changes: {
              targetEmail: target.email,
              targetRole: target.role,
              ...(nextUser.adminLimits ? { adminLimits: nextUser.adminLimits } : {}),
              ...(nextUser.assignedPermissions ? { assignedPermissions: nextUser.assignedPermissions } : {}),
            },
            createdAt: nowIso(),
          });
          return nextUser;
        });

        res.json({ user: updated });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Permission update failed.' });
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
      const actorIsSuper = isSuperAdminUser(actor);
      try {
        const updated = await store.runTransaction(async tx => {
          const target = await tx.getUserByUid(targetUid);
          if (!target) {
            throw Object.assign(new Error('Target user not found.'), { status: 404 });
          }
          if (isPermanentOwnerEmail(target.email) || target.isPermanentOwner) {
            throw Object.assign(
              new Error('Permanent Super Administrator / Owner (Shewonshezy12@gmail.com) cannot be deactivated.'),
              { status: 403 }
            );
          }
          if (target.role === 'super_admin' && !actorIsSuper) {
            throw Object.assign(
              new Error('Access denied: restricted System Administrators cannot modify Super Administrator status.'),
              { status: 403 }
            );
          }
          if (target.role === 'super_admin' && disabled && !target.disabled) {
            const allUsers = await tx.listUsers();
            const activeSuperAdmins = allUsers.filter(u => u.role === 'super_admin' && !u.disabled);
            if (activeSuperAdmins.length <= 1) {
              throw Object.assign(
                new Error('Cannot disable the last active Super Administrator / Owner.'),
                { status: 409 }
              );
            }
          }
          const nextUser: UserSession = { ...target, disabled };
          await tx.saveUser(nextUser);
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: disabled ? 'ACCOUNT_DEACTIVATED' : 'ACCOUNT_ACTIVATED',
            collection: 'users',
            recordId: targetUid,
            changes: { targetEmail: target.email, disabled },
            createdAt: nowIso(),
          });
          return nextUser;
        });
        if (syncCustomClaims) {
          await syncCustomClaims(updated.uid, updated.role, updated.disabled);
        }
        res.json({ user: updated });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Status update failed.' });
      }
    }
  );

  // POST /api/admin/users/:uid/reset-password
  router.post(
    '/admin/users/:uid/reset-password',
    requireAuth,
    requireStoreConfigured,
    requirePerm('users.reset_password'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const targetUid = String(req.params.uid || '');
      const { newPassword } = req.body || {};

      if (newPassword !== undefined && (typeof newPassword !== 'string' || newPassword.length < 6)) {
        res.status(400).json({ error: 'New password must be at least 6 characters.' });
        return;
      }

      const actorIsSuper = isSuperAdminUser(actor);
      try {
        const target = await store.runTransaction(async tx => tx.getUserByUid(targetUid));
        if (!target) {
          res.status(404).json({ error: 'Target user not found.' });
          return;
        }
        if (
          ((isPermanentOwnerEmail(target.email) || target.isPermanentOwner) && !isPermanentOwnerEmail(actor.email)) ||
          (target.role === 'super_admin' && !actorIsSuper)
        ) {
          res.status(403).json({
            error: 'Access denied: cannot reset password of the Permanent Super Administrator / Owner.',
            code: 'PERMANENT_OWNER_PROTECTED',
          });
          return;
        }
        if (!resetAuthPassword) {
          res.status(503).json({
            error: 'Server Admin Auth password reset is unavailable in this runtime.',
            code: 'ADMIN_AUTH_UNCONFIGURED',
          });
          return;
        }

        const result = await resetAuthPassword({
          uid: target.uid,
          email: target.email,
          newPassword: typeof newPassword === 'string' && newPassword.length > 0 ? newPassword : undefined,
        });

        await store.runTransaction(async tx => {
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: 'PASSWORD_RESET',
            collection: 'users',
            recordId: target.uid,
            changes: {
              targetEmail: target.email,
              method: newPassword ? 'admin_password_set' : 'reset_link_generated',
            },
            createdAt: nowIso(),
          });
        });

        res.json({
          reset: true,
          email: target.email,
          ...(result.resetLink ? { resetLink: result.resetLink } : {}),
        });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        const code = (err as { code?: string })?.code;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Password reset failed.', code });
      }
    }
  );

  // DELETE /api/admin/users/:uid
  router.delete(
    '/admin/users/:uid',
    requireAuth,
    requireStoreConfigured,
    requirePerm('users.delete'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const targetUid = String(req.params.uid || '');

      if (targetUid === actor.uid) {
        res.status(403).json({ error: 'Administrators cannot delete their own account.' });
        return;
      }

      const actorIsSuper = isSuperAdminUser(actor);
      try {
        const target = await store.runTransaction(async tx => {
          const found = await tx.getUserByUid(targetUid);
          if (!found) {
            throw Object.assign(new Error('Target user not found.'), { status: 404 });
          }
          if (isPermanentOwnerEmail(found.email) || found.isPermanentOwner) {
            throw Object.assign(
              new Error('Permanent Super Administrator / Owner (Shewonshezy12@gmail.com) cannot be deleted.'),
              { status: 403, code: 'PERMANENT_OWNER_PROTECTED' }
            );
          }
          if (found.role === 'super_admin' && !actorIsSuper) {
            throw Object.assign(
              new Error('Restricted System Administrators cannot delete Super Administrator accounts.'),
              { status: 403 }
            );
          }
          if (found.role === 'super_admin') {
            const allUsers = await tx.listUsers();
            const activeSuperAdmins = allUsers.filter(u => u.role === 'super_admin' && !u.disabled);
            if (activeSuperAdmins.length <= 1 && activeSuperAdmins.some(u => u.uid === targetUid)) {
              throw Object.assign(
                new Error('Cannot delete the last active Super Administrator / Owner.'),
                { status: 409 }
              );
            }
          }
          return found;
        });

        if (deleteAuthUser) {
          await deleteAuthUser(target.uid);
        }

        await store.runTransaction(async tx => {
          if (tx.deleteUser) {
            await tx.deleteUser(target.uid);
          } else {
            await tx.saveUser({ ...target, disabled: true });
          }
          await tx.appendAuditLog({
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actorUid: actor.uid,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: 'ACCOUNT_DELETED',
            collection: 'users',
            recordId: target.uid,
            changes: { deletedEmail: target.email, deletedRole: target.role },
            createdAt: nowIso(),
          });
        });

        res.json({ deleted: true, uid: target.uid });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status || 500;
        const code = (err as { code?: string })?.code;
        res.status(status).json({ error: err instanceof Error ? err.message : 'Account deletion failed.', code });
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
      const includePayroll = hasUserPermission(actor, 'hr.payroll.read');
      const snapshot = await store.runTransaction(async tx => {
        const exported = await tx.exportAllCollections();
        if (!includePayroll) {
          delete exported.employees_payroll;
        }
        await tx.appendAuditLog({
          id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          actorUid: actor.uid,
          actorEmail: actor.email,
          actorRole: actor.role,
          action: 'DATABASE_BACKUP_EXPORTED',
          collection: 'system',
          recordId: 'full-snapshot',
          changes: { includePayroll },
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
    requirePerm('backup.restore'),
    async (req: AuthedRequest, res: Response) => {
      const actor = req.staffUser!;
      const { snapshot } = req.body || {};
      if (!snapshot || typeof snapshot !== 'object') {
        res.status(400).json({ error: 'Valid JSON snapshot object is required.' });
        return;
      }
      const sanitizedSnapshot: Record<string, unknown> = {
        ...(snapshot as Record<string, unknown>),
      };
      // Audit logs are strictly immutable and cannot be edited or overwritten via restore
      delete sanitizedSnapshot.audit_logs;

      await store.runTransaction(async tx => {
        await tx.restoreAllCollections(sanitizedSnapshot);
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
