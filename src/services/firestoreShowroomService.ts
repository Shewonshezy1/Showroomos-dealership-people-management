/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { sendPasswordResetEmail, type User as FirebaseUser } from 'firebase/auth';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  DEFAULT_RESTRICTED_ADMIN_LIMITS,
  PERMANENT_SUPER_ADMIN_EMAIL,
  buildPermissionsFromAdminLimits,
  hasUserPermission,
  isPermanentOwnerEmail,
  isSuperAdminUser,
} from '../auth/permissions';
import type {
  Accessory,
  AttendanceRecord,
  AuditLogEntry,
  Bike,
  Booking,
  DeliveryChecklist,
  Employee,
  EmployeeSalary,
  Lead,
  LeaveRequest,
  LeaveStatus,
  PaymentRecord,
  ServiceJobCard,
  StaffInvite,
  SystemAdminLimits,
  TestRideRecord,
  TradeInValuation,
  UserRole,
  UserSession,
} from '../types';
import { getTodayDDMMYYYY } from '../utils/formatters';

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_\-.@]/g, '_').slice(0, 128);
}

function nowFormatted(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${getTodayDDMMYYYY()} ${hh}:${mi}`;
}

export function createRequestId(prefix = 'req'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function getBearerHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export type LoginAuditOutcome =
  | 'LOGIN_SUCCEEDED'
  | 'LOGIN_FAILED'
  | 'LOGIN_BLOCKED_UNINVITED'
  | 'LOGIN_BLOCKED_DISABLED'
  | 'LOGIN_BLOCKED_UNVERIFIED';

export async function logLoginAttempt(
  payload: { outcome: LoginAuditOutcome; email: string; reason?: string },
  fbUser?: FirebaseUser | null
): Promise<void> {
  const emailLower = (fbUser?.email || payload.email || 'unknown').trim().toLowerCase().slice(0, 160);
  let serverLogged = false;
  try {
    const tokenUser = fbUser || auth.currentUser;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (tokenUser) {
      headers.Authorization = `Bearer ${await tokenUser.getIdToken()}`;
    }
    const resp = await fetch('/api/auth/login-audit', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        outcome: payload.outcome,
        email: emailLower,
        reason: payload.reason,
      }),
    });
    if (resp.status === 201) {
      const json = (await resp.json().catch(() => ({}))) as { logged?: boolean };
      serverLogged = Boolean(json.logged);
    }
  } catch {
    serverLogged = false;
  }

  // Fallback to Firestore rules-permitted audit log when running in preview without server Admin SDK IAM
  const signedUser = fbUser || auth.currentUser;
  if (!serverLogged && signedUser && signedUser.emailVerified) {
    try {
      const roleHint: UserRole = isPermanentOwnerEmail(emailLower) ? 'super_admin' : 'sales';
      await setDoc(doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)), {
        actorUid: signedUser.uid,
        actorEmail: emailLower,
        actorRole: roleHint,
        action: payload.outcome,
        collection: 'auth',
        recordId: signedUser.uid,
        changes: {
          email: emailLower,
          ...(payload.reason ? { reason: payload.reason.slice(0, 200) } : {}),
        },
        createdAt: serverTimestamp(),
      });
    } catch {
      // Blocked or unprovisioned anonymous login failures cannot write directly to Firestore audit_logs
    }
  }
}

/**
 * Resolves the authenticated Firebase user's staff profile from Firestore.
 * - Permanent Main Owner (Shewonshezy12@gmail.com) is ALWAYS automatically assigned super_admin.
 * - Other accounts never self-register; only pre-provisioned /users or Pending /staff_invites activate.
 */
export async function resolveOrActivateStaffProfile(
  fbUser: FirebaseUser
): Promise<{ status: 'active'; profile: UserSession } | { status: 'disabled' } | { status: 'uninvited' } | { status: 'unverified_email' }> {
  if (!fbUser.email) {
    return { status: 'unverified_email' };
  }
  const emailLower = fbUser.email.toLowerCase();
  const isOwnerEmail = isPermanentOwnerEmail(emailLower);

  if (!fbUser.emailVerified && !isOwnerEmail) {
    void logLoginAttempt({ outcome: 'LOGIN_BLOCKED_UNVERIFIED', email: emailLower, reason: 'Email not verified' }, fbUser);
    return { status: 'unverified_email' };
  }
  if (!fbUser.emailVerified) {
    void logLoginAttempt({ outcome: 'LOGIN_BLOCKED_UNVERIFIED', email: emailLower, reason: 'Email not verified' }, fbUser);
    return { status: 'unverified_email' };
  }

  const userRef = doc(db, 'users', fbUser.uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (err) {
    console.warn('Initial user profile check:', err);
  }

  if (existingSnap && existingSnap.exists()) {
    const data = existingSnap.data() as UserSession;

    // Permanent Owner protection: ensure Shewonshezy12@gmail.com is always active super_admin
    if (isOwnerEmail && (data.role !== 'super_admin' || data.disabled || !data.isPermanentOwner)) {
      try {
        await runTransaction(db, async tx => {
          const snap = await tx.get(userRef);
          const cur = (snap.exists() ? snap.data() : data) as UserSession;
          tx.set(
            userRef,
            {
              uid: fbUser.uid,
              email: PERMANENT_SUPER_ADMIN_EMAIL,
              fullName: cur.fullName || fbUser.displayName || 'Super Administrator / Owner',
              role: 'super_admin',
              designation: 'Super Administrator / Owner',
              department: cur.department || 'Executive & Ownership',
              branch: cur.branch || 'Colombo Flagship Hub',
              disabled: false,
              isPermanentOwner: true,
              createdAt: cur.createdAt || serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          tx.set(
            doc(db, 'staff_directory', fbUser.uid),
            {
              uid: fbUser.uid,
              fullName: cur.fullName || fbUser.displayName || 'Super Administrator / Owner',
              role: 'super_admin',
              designation: 'Super Administrator / Owner',
              department: cur.department || 'Executive & Ownership',
              active: true,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          tx.set(
            doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)),
            {
              actorUid: fbUser.uid,
              actorEmail: PERMANENT_SUPER_ADMIN_EMAIL,
              actorRole: 'super_admin',
              action: 'OWNER_SUPER_ADMIN_AUTO_ASSIGNED',
              collection: 'users',
              recordId: fbUser.uid,
              changes: { role: 'super_admin', previousRole: cur.role || null, isPermanentOwner: true },
              createdAt: serverTimestamp(),
            }
          );
        });
      } catch (restoreErr) {
        console.warn('Permanent owner sync check:', restoreErr);
      }

      const ownerProfile: UserSession = {
        ...data,
        id: fbUser.uid,
        uid: fbUser.uid,
        email: PERMANENT_SUPER_ADMIN_EMAIL,
        role: 'super_admin',
        disabled: false,
        isPermanentOwner: true,
        fullName: data.fullName || fbUser.displayName || 'Super Administrator / Owner',
        designation: 'Super Administrator / Owner',
        name: data.fullName || fbUser.displayName || 'Super Administrator / Owner',
        roleLabel: 'Super Administrator / Owner',
      };
      void logLoginAttempt({ outcome: 'LOGIN_SUCCEEDED', email: emailLower, reason: 'permanent_owner' }, fbUser);
      return { status: 'active', profile: ownerProfile };
    }

    if (data.disabled) {
      void logLoginAttempt({ outcome: 'LOGIN_BLOCKED_DISABLED', email: emailLower, reason: 'Account deactivated' }, fbUser);
      return { status: 'disabled' };
    }

    void logLoginAttempt({ outcome: 'LOGIN_SUCCEEDED', email: emailLower, reason: `role:${data.role}` }, fbUser);
    return {
      status: 'active',
      profile: {
        ...data,
        id: fbUser.uid,
        uid: fbUser.uid,
        ...(isOwnerEmail ? { isPermanentOwner: true, role: 'super_admin' as UserRole } : {}),
        name: data.fullName,
        roleLabel: data.designation,
      },
    };
  }

  // Try backend Admin activation first if server has Admin SDK configured
  try {
    const idToken = await fbUser.getIdToken();
    const resp = await fetch('/api/auth/activate-invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    });
    if (resp.ok) {
      const json = (await resp.json()) as { user: UserSession };
      if (json.user.disabled && !isOwnerEmail) return { status: 'disabled' };
      return {
        status: 'active',
        profile: {
          ...json.user,
          id: fbUser.uid,
          uid: fbUser.uid,
          name: json.user.fullName,
          roleLabel: json.user.designation,
        },
      };
    }
    if (resp.status === 403 && !isOwnerEmail) {
      const body = (await resp.json().catch(() => ({}))) as { code?: string; error?: string };
      if (body.error?.toLowerCase().includes('disabled')) return { status: 'disabled' };
      return { status: 'uninvited' };
    }
    // If 503 (Admin store not configured on server), fall back to rules-enforced Firestore client transaction
  } catch {
    // Fall back to Firestore rules-enforced activation
  }

  // Permanent Owner auto-provisioning via Firestore rules if server Admin SDK was unavailable
  if (isOwnerEmail) {
    try {
      const ownerProfile: UserSession = {
        id: fbUser.uid,
        uid: fbUser.uid,
        fullName: fbUser.displayName || 'Super Administrator / Owner',
        email: PERMANENT_SUPER_ADMIN_EMAIL,
        role: 'super_admin',
        designation: 'Super Administrator / Owner',
        department: 'Executive & Ownership',
        branch: 'Colombo Flagship Hub',
        disabled: false,
        isPermanentOwner: true,
      };
      await runTransaction(db, async tx => {
        tx.set(userRef, {
          uid: ownerProfile.uid,
          email: PERMANENT_SUPER_ADMIN_EMAIL,
          fullName: ownerProfile.fullName,
          role: 'super_admin',
          designation: ownerProfile.designation,
          department: ownerProfile.department,
          branch: ownerProfile.branch,
          disabled: false,
          isPermanentOwner: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        tx.set(doc(db, 'staff_directory', fbUser.uid), {
          uid: ownerProfile.uid,
          fullName: ownerProfile.fullName,
          role: 'super_admin',
          designation: ownerProfile.designation,
          department: ownerProfile.department,
          active: true,
          updatedAt: serverTimestamp(),
        });
        tx.set(
          doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)),
          {
            actorUid: fbUser.uid,
            actorEmail: PERMANENT_SUPER_ADMIN_EMAIL,
            actorRole: 'super_admin',
            action: 'OWNER_SUPER_ADMIN_AUTO_ASSIGNED',
            collection: 'users',
            recordId: fbUser.uid,
            changes: { role: 'super_admin', isPermanentOwner: true },
            createdAt: serverTimestamp(),
          }
        );
      });
      void logLoginAttempt({ outcome: 'LOGIN_SUCCEEDED', email: emailLower, reason: 'permanent_owner_bootstrap' }, fbUser);
      return {
        status: 'active',
        profile: {
          ...ownerProfile,
          name: ownerProfile.fullName,
          roleLabel: ownerProfile.designation,
        },
      };
    } catch (ownerErr) {
      console.error('Permanent owner bootstrap failed:', ownerErr);
      return { status: 'uninvited' };
    }
  }

  // Rules-enforced Firestore activation (Pending staff_invite ONLY)
  try {
    const inviteRef = doc(db, 'staff_invites', emailLower);
    let inviteData: StaffInvite | null = null;
    try {
      const inviteSnap = await getDoc(inviteRef);
      if (inviteSnap.exists()) {
        inviteData = { id: inviteSnap.id, ...(inviteSnap.data() as Omit<StaffInvite, 'id'>) };
      }
    } catch {
      // No invite readable for this user
    }

    if (!inviteData || inviteData.status !== 'Pending' || inviteData.role === 'super_admin') {
      void logLoginAttempt({ outcome: 'LOGIN_BLOCKED_UNINVITED', email: emailLower, reason: 'No pending invite' }, fbUser);
      return { status: 'uninvited' };
    }

    const roleToAssign: UserRole = inviteData.role;
    const newProfile: UserSession = {
      id: fbUser.uid,
      uid: fbUser.uid,
      fullName: inviteData.fullName,
      email: emailLower,
      role: roleToAssign,
      designation: inviteData.designation || roleToAssign,
      department: inviteData.department || 'Showroom Operations',
      branch: inviteData.branch || 'Colombo Flagship Hub',
      disabled: false,
      invitedBy: inviteData.invitedByUid,
      createdByUid: inviteData.invitedByUid,
      ...(inviteData.adminLimits ? { adminLimits: inviteData.adminLimits, accountsCreatedCount: 0 } : {}),
      ...(inviteData.assignedPermissions ? { assignedPermissions: inviteData.assignedPermissions } : {}),
    };

    await runTransaction(db, async tx => {
      tx.set(userRef, {
        uid: newProfile.uid,
        email: newProfile.email,
        fullName: newProfile.fullName,
        role: newProfile.role,
        designation: newProfile.designation,
        department: newProfile.department,
        branch: newProfile.branch,
        disabled: false,
        invitedBy: newProfile.invitedBy,
        createdByUid: newProfile.createdByUid,
        ...(newProfile.adminLimits ? { adminLimits: newProfile.adminLimits, accountsCreatedCount: 0 } : {}),
        ...(newProfile.assignedPermissions ? { assignedPermissions: newProfile.assignedPermissions } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      tx.set(doc(db, 'staff_directory', fbUser.uid), {
        uid: newProfile.uid,
        fullName: newProfile.fullName,
        role: newProfile.role,
        designation: newProfile.designation,
        department: newProfile.department,
        active: true,
        updatedAt: serverTimestamp(),
      });
      tx.update(inviteRef, {
        status: 'Accepted',
        updatedAt: serverTimestamp(),
      });
      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)),
        {
          actorUid: newProfile.uid,
          actorEmail: newProfile.email,
          actorRole: newProfile.role,
          action: 'STAFF_INVITE_ACTIVATED',
          collection: 'users',
          recordId: newProfile.uid,
          changes: { role: newProfile.role, inviteId: inviteData!.id },
          createdAt: serverTimestamp(),
        }
      );
    });

    void logLoginAttempt({ outcome: 'LOGIN_SUCCEEDED', email: emailLower, reason: `invite_activated:${newProfile.role}` }, fbUser);
    return {
      status: 'active',
      profile: {
        ...newProfile,
        name: newProfile.fullName,
        roleLabel: newProfile.designation,
      },
    };
  } catch (err) {
    console.error('Staff activation blocked:', err);
    void logLoginAttempt({ outcome: 'LOGIN_BLOCKED_UNINVITED', email: emailLower, reason: 'Activation blocked' }, fbUser);
    return { status: 'uninvited' };
  }
}

export function subscribeAuthorizedCollections(
  user: UserSession,
  callbacks: {
    onLeads: (data: Lead[]) => void;
    onBikes: (data: Bike[]) => void;
    onBookings: (data: Booking[]) => void;
    onEmployees: (data: Employee[]) => void;
    onPayrolls: (data: Record<string, EmployeeSalary>) => void;
    onLeaves: (data: LeaveRequest[]) => void;
    onAttendance: (data: AttendanceRecord[]) => void;
    onServiceCards: (data: ServiceJobCard[]) => void;
    onAccessories: (data: Accessory[]) => void;
    onTestRides: (data: TestRideRecord[]) => void;
    onTradeIns: (data: TradeInValuation[]) => void;
    onUsers: (data: UserSession[]) => void;
    onInvites: (data: StaffInvite[]) => void;
    onAuditLogs: (data: AuditLogEntry[]) => void;
    onPermissionRevoked: () => void;
  }
): () => void {
  const unsubs: Unsubscribe[] = [];

  const watch = <T>(
    colName: string,
    handler: (items: T[]) => void,
    orderedField?: string
  ) => {
    const ref = collection(db, colName);
    const q = orderedField ? query(ref, orderBy(orderedField, 'desc')) : ref;
    const unsub = onSnapshot(
      q,
      snap => {
        handler(snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as T));
      },
      err => {
        console.warn(`Listener error on ${colName}:`, err.message);
        if (err.code === 'permission-denied') {
          // Verify whether current user was disabled or role changed
          getDoc(doc(db, 'users', user.uid))
            .then(s => {
              if (!s.exists() || s.data()?.disabled === true) {
                callbacks.onPermissionRevoked();
              }
            })
            .catch(() => {});
        }
      }
    );
    unsubs.push(unsub);
  };

  // Watch own user document in real time for instant disablement / role change
  unsubs.push(
    onSnapshot(
      doc(db, 'users', user.uid),
      snap => {
        if (!snap.exists() || snap.data()?.disabled === true) {
          callbacks.onPermissionRevoked();
        }
      },
      () => {}
    )
  );

  // Only attach listeners to collections permitted for the authenticated user's effective permissions
  if (hasUserPermission(user, 'crm.read')) {
    watch<Lead>('leads', callbacks.onLeads);
  } else {
    callbacks.onLeads([]);
  }

  if (hasUserPermission(user, 'inventory.bikes.read')) {
    watch<Bike>('bikes', callbacks.onBikes);
  } else {
    callbacks.onBikes([]);
  }

  if (hasUserPermission(user, 'bookings.read') || hasUserPermission(user, 'payments.read')) {
    watch<Booking>('bookings', callbacks.onBookings);
  } else {
    callbacks.onBookings([]);
  }

  if (hasUserPermission(user, 'inventory.accessories.read')) {
    watch<Accessory>('accessories', callbacks.onAccessories);
  } else {
    callbacks.onAccessories([]);
  }

  if (hasUserPermission(user, 'testrides.read')) {
    watch<TestRideRecord>('test_rides', callbacks.onTestRides);
  } else {
    callbacks.onTestRides([]);
  }

  if (hasUserPermission(user, 'tradein.read')) {
    watch<TradeInValuation>('trade_ins', callbacks.onTradeIns);
  } else {
    callbacks.onTradeIns([]);
  }

  if (hasUserPermission(user, 'hr.directory.read')) {
    watch<Employee>('employees', callbacks.onEmployees);
  } else {
    callbacks.onEmployees([]);
  }

  // Strictly HR / Super Admin payroll collection
  if (hasUserPermission(user, 'hr.payroll.read')) {
    watch<{ id: string } & EmployeeSalary>('employees_payroll', items => {
      const map: Record<string, EmployeeSalary> = {};
      for (const item of items) {
        map[item.id] = {
          basicLkr: item.basicLkr || 0,
          showroomAllowanceLkr: item.showroomAllowanceLkr || 0,
          salesIncentiveLkr: item.salesIncentiveLkr || 0,
          illustrativeDeductionsLkr: item.illustrativeDeductionsLkr || 0,
        };
      }
      callbacks.onPayrolls(map);
    });
  } else {
    callbacks.onPayrolls({});
  }

  if (hasUserPermission(user, 'hr.leaves.read')) {
    watch<LeaveRequest>('leave_requests', callbacks.onLeaves);
    watch<AttendanceRecord>('attendance', callbacks.onAttendance);
  } else {
    callbacks.onLeaves([]);
    callbacks.onAttendance([]);
  }

  if (hasUserPermission(user, 'service.read')) {
    watch<ServiceJobCard>('service_cards', callbacks.onServiceCards);
  } else {
    callbacks.onServiceCards([]);
  }

  if (
    hasUserPermission(user, 'users.read') ||
    hasUserPermission(user, 'users.create_staff') ||
    hasUserPermission(user, 'users.create_admin') ||
    hasUserPermission(user, 'users.delete') ||
    hasUserPermission(user, 'users.reset_password') ||
    hasUserPermission(user, 'users.assign_role')
  ) {
    watch<UserSession>('users', callbacks.onUsers);
  } else {
    callbacks.onUsers([]);
  }

  if (
    hasUserPermission(user, 'users.manage_invites') ||
    hasUserPermission(user, 'users.create_staff') ||
    hasUserPermission(user, 'users.create_admin')
  ) {
    watch<StaffInvite>('staff_invites', callbacks.onInvites);
  } else {
    callbacks.onInvites([]);
  }

  if (hasUserPermission(user, 'audit.view')) {
    watch<AuditLogEntry>('audit_logs', callbacks.onAuditLogs, 'createdAt');
  } else {
    callbacks.onAuditLogs([]);
  }

  return () => {
    for (const u of unsubs) u();
  };
}

function buildAuditEntry(
  actor: UserSession,
  action: string,
  col: string,
  recordId: string,
  changes: Record<string, unknown>,
  requestId?: string
) {
  return {
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    collection: col,
    recordId,
    ...(requestId ? { requestId } : {}),
    changes,
    createdAt: serverTimestamp(),
  };
}

// ---------------------------------------------------------------------------
// ATOMIC FIRESTORE OPERATIONS
// ---------------------------------------------------------------------------

export async function fsCreateLead(actor: UserSession, leadData: Omit<Lead, 'id' | 'createdAt' | 'notes'>): Promise<string> {
  const leadId = sanitizeId(`lead-${Date.now()}`);
  const path = `leads/${leadId}`;
  try {
    await runTransaction(db, async tx => {
      tx.set(doc(db, 'leads', leadId), {
        ...leadData,
        priority: leadData.priority || 'Warm',
        callLogs: leadData.callLogs || [],
        notes: [
          {
            id: `n-${Date.now()}`,
            date: getTodayDDMMYYYY(),
            author: actor.fullName,
            text: `Lead created by ${actor.fullName}.`,
          },
        ],
        createdByUid: actor.uid,
        createdAt: getTodayDDMMYYYY(),
        updatedAt: serverTimestamp(),
      });
      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}`)),
        buildAuditEntry(actor, 'LEAD_CREATED', 'leads', leadId, { customerName: leadData.customerName })
      );
    });
    return leadId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function fsUpdateLead(actor: UserSession, leadId: string, updates: Partial<Lead>): Promise<void> {
  const path = `leads/${leadId}`;
  try {
    const cleanUpdates = { ...updates };
    delete (cleanUpdates as { id?: string }).id;
    await updateDoc(doc(db, 'leads', sanitizeId(leadId)), {
      ...cleanUpdates,
      updatedAt: serverTimestamp(),
    });
    await setDoc(
      doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}`)),
      buildAuditEntry(actor, 'LEAD_UPDATED', 'leads', leadId, { fields: Object.keys(cleanUpdates) })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function fsCreateBookingAtomic(
  actor: UserSession,
  payload: {
    requestId: string;
    customerName: string;
    customerPhone: string;
    customerNIC: string;
    customerAddress: string;
    bikeId: string;
    discountRequestedLkr?: number;
    leadId?: string;
    initialPayment?: {
      amountLkr: number;
      type: PaymentRecord['type'];
      reference: string;
    };
  }
): Promise<{ bookingId: string; deduplicated: boolean }> {
  const reqId = sanitizeId(payload.requestId);
  const path = 'bookings';
  try {
    return await runTransaction(db, async tx => {
      const idemRef = doc(db, 'idempotency_keys', reqId);
      const idemSnap = await tx.get(idemRef);
      if (idemSnap.exists()) {
        return { bookingId: String(idemSnap.data().resultId), deduplicated: true };
      }

      const bikeRef = doc(db, 'bikes', sanitizeId(payload.bikeId));
      const bikeSnap = await tx.get(bikeRef);
      if (!bikeSnap.exists()) {
        throw new Error('Selected motorcycle not found in inventory.');
      }
      const bike = bikeSnap.data() as Bike;
      if (bike.status !== 'Available' || bike.allocatedBookingId) {
        throw new Error(
          `Allocation blocked: Chassis ${bike.chassisNumber} is currently "${bike.status}". Only Available units can be allocated.`
        );
      }

      const bookingId = sanitizeId(`BK-2026-${String(Date.now()).slice(-6)}`);
      const bookingRef = doc(db, 'bookings', bookingId);
      const discReq = Math.max(0, Number(payload.discountRequestedLkr || 0));

      const bookingDoc = {
        id: bookingId,
        ...(payload.leadId ? { leadId: payload.leadId } : {}),
        customerName: payload.customerName.trim(),
        customerPhone: payload.customerPhone.trim(),
        customerNIC: payload.customerNIC.trim(),
        customerAddress: payload.customerAddress.trim(),
        salespersonId: actor.uid,
        salespersonName: actor.fullName,
        bikeId: bikeRef.id,
        bikeModel: bike.model,
        bikeColour: bike.colour,
        bikeChassis: bike.chassisNumber,
        bikeEngine: bike.engineNumber,
        totalPriceLkr: bike.priceLkr,
        discountRequestedLkr: discReq,
        // Sales CANNOT self-approve discounts — discountLkr must start at 0
        discountLkr: 0,
        discountStatus: discReq > 0 ? 'Pending' : 'None',
        accessoriesTotalLkr: 0,
        tradeInCreditLkr: 0,
        finalPriceLkr: bike.priceLkr,
        verifiedPaidLkr: 0,
        balanceLkr: bike.priceLkr,
        accessories: [],
        payments: [],
        status: 'Confirmed',
        deliveryChecklist: {
          paymentVerified: false,
          documentsChecked: false,
          pdiCompleted: false,
          customerOrientationDone: false,
          deliveryNotes: '',
        },
        requestId: reqId,
        createdByUid: actor.uid,
        createdAt: getTodayDDMMYYYY(),
        timeline: [
          {
            id: `tl-${Date.now()}`,
            date: nowFormatted(),
            title: 'Booking Created & Unit Reserved',
            description: `${bike.model} (${bike.chassisNumber}) allocated to ${payload.customerName} by ${actor.fullName}.`,
            type: 'booking',
          },
        ],
        updatedAt: serverTimestamp(),
      };

      tx.set(bookingRef, bookingDoc);
      tx.update(bikeRef, {
        status: 'Reserved',
        allocatedBookingId: bookingId,
        updatedAt: serverTimestamp(),
      });
      if (payload.leadId) {
        tx.update(doc(db, 'leads', sanitizeId(payload.leadId)), {
          status: 'Booked',
          bookingId,
          updatedAt: serverTimestamp(),
        });
      }
      tx.set(idemRef, {
        requestId: reqId,
        operation: 'BOOKING_CREATE',
        actorUid: actor.uid,
        resultId: bookingId,
        createdAt: serverTimestamp(),
      });
      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`)),
        buildAuditEntry(actor, 'BOOKING_CREATED', 'bookings', bookingId, {
          bikeId: bikeRef.id,
          chassis: bike.chassisNumber,
          discountRequestedLkr: discReq,
        }, reqId)
      );

      return { bookingId, deduplicated: false };
    });
  } catch (err) {
    if (err instanceof Error && (err.message.includes('Allocation blocked') || err.message.includes('not found'))) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fsRecordPaymentAtomic(
  actor: UserSession,
  payload: {
    bookingId: string;
    requestId: string;
    amountLkr: number;
    type: PaymentRecord['type'];
    reference: string;
  }
): Promise<{ paymentId: string; deduplicated: boolean }> {
  const reqId = sanitizeId(payload.requestId);
  const bookingId = sanitizeId(payload.bookingId);
  const path = `bookings/${bookingId}/payments`;
  try {
    return await runTransaction(db, async tx => {
      const idemRef = doc(db, 'idempotency_keys', reqId);
      const idemSnap = await tx.get(idemRef);
      if (idemSnap.exists()) {
        return { paymentId: String(idemSnap.data().resultId), deduplicated: true };
      }

      if (payload.amountLkr <= 0 || Number.isNaN(payload.amountLkr)) {
        throw new Error('Payment amount must be strictly positive.');
      }

      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists()) {
        throw new Error('Booking not found.');
      }
      const booking = bookingSnap.data() as Booking;
      if (booking.status !== 'Confirmed') {
        throw new Error('Cannot record payments on cancelled or delivered bookings.');
      }

      const totalActiveReceipts = (booking.payments || [])
        .filter(p => p.status !== 'Reversed')
        .reduce((sum, p) => sum + p.amountLkr, 0);
      const remainingAllowable = Math.max(0, booking.finalPriceLkr - totalActiveReceipts);
      if (payload.amountLkr > remainingAllowable) {
        throw new Error(`Overpayment blocked: Remaining balance is LKR ${remainingAllowable.toLocaleString()}.`);
      }

      const paymentId = sanitizeId(`PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      // Always created unverified first; only Finance can verify!
      const paymentItem: PaymentRecord = {
        id: paymentId,
        requestId: reqId,
        entryType: 'PAYMENT',
        date: getTodayDDMMYYYY(),
        amountLkr: payload.amountLkr,
        type: payload.type,
        reference: payload.reference.trim(),
        status: 'Pending Verification',
        recordedByUid: actor.uid,
      };

      tx.set(doc(db, 'payments', paymentId), {
        bookingId,
        requestId: reqId,
        entryType: 'PAYMENT',
        amountLkr: payload.amountLkr,
        type: payload.type,
        reference: payload.reference.trim(),
        date: paymentItem.date,
        isVerified: false,
        recordedByUid: actor.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      tx.update(bookingRef, {
        payments: [...(booking.payments || []), paymentItem],
        timeline: [
          ...(booking.timeline || []),
          {
            id: `tl-${Date.now()}`,
            date: nowFormatted(),
            title: 'Payment Receipt Logged (Pending Verification)',
            description: `${payload.type} of LKR ${payload.amountLkr.toLocaleString()} (Ref: ${payload.reference}) logged by ${actor.fullName}.`,
            type: 'payment',
          },
        ],
        updatedAt: serverTimestamp(),
      });

      tx.set(idemRef, {
        requestId: reqId,
        operation: 'PAYMENT_RECORD',
        actorUid: actor.uid,
        resultId: paymentId,
        createdAt: serverTimestamp(),
      });

      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`)),
        buildAuditEntry(actor, 'PAYMENT_RECORDED_UNVERIFIED', 'payments', paymentId, {
          bookingId,
          amountLkr: payload.amountLkr,
          reference: payload.reference,
        }, reqId)
      );

      return { paymentId, deduplicated: false };
    });
  } catch (err) {
    if (err instanceof Error && (err.message.includes('Overpayment') || err.message.includes('positive') || err.message.includes('Booking'))) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fsVerifyPaymentAtomic(
  actor: UserSession,
  bookingId: string,
  paymentId: string
): Promise<void> {
  const bId = sanitizeId(bookingId);
  const pId = sanitizeId(paymentId);
  try {
    await runTransaction(db, async tx => {
      const bookingRef = doc(db, 'bookings', bId);
      const paymentRef = doc(db, 'payments', pId);
      const [bSnap, pSnap] = await Promise.all([tx.get(bookingRef), tx.get(paymentRef)]);
      if (!bSnap.exists()) throw new Error('Booking not found.');
      if (!pSnap.exists()) throw new Error('Payment ledger record not found.');

      const booking = bSnap.data() as Booking;
      const pData = pSnap.data() as { isVerified: boolean; amountLkr: number; reversedByPaymentId?: string };
      if (pData.reversedByPaymentId) throw new Error('Cannot verify a reversed payment.');
      if (pData.isVerified) return;

      const verifiedAt = nowFormatted();
      tx.update(paymentRef, {
        isVerified: true,
        verifiedBy: actor.fullName,
        verifiedByUid: actor.uid,
        verifiedAt,
        updatedAt: serverTimestamp(),
      });

      const updatedPayments = (booking.payments || []).map(p =>
        p.id === pId
          ? { ...p, status: 'Verified' as const, verifiedBy: actor.fullName, verifiedByUid: actor.uid, verifiedAt }
          : p
      );
      const verifiedPaidLkr = updatedPayments
        .filter(p => p.status === 'Verified' && p.entryType !== 'REVERSAL')
        .reduce((s, p) => s + p.amountLkr, 0);
      const balanceLkr = Math.max(0, booking.finalPriceLkr - verifiedPaidLkr);

      tx.update(bookingRef, {
        payments: updatedPayments,
        verifiedPaidLkr,
        balanceLkr,
        deliveryChecklist: {
          ...booking.deliveryChecklist,
          paymentVerified: balanceLkr === 0 && verifiedPaidLkr > 0,
        },
        timeline: [
          ...(booking.timeline || []),
          {
            id: `tl-${Date.now()}`,
            date: verifiedAt,
            title: 'Payment Verified by Finance',
            description: `Receipt LKR ${pData.amountLkr.toLocaleString()} verified by ${actor.fullName}.`,
            type: 'payment',
          },
        ],
        updatedAt: serverTimestamp(),
      });

      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`)),
        buildAuditEntry(actor, 'PAYMENT_VERIFIED', 'payments', pId, {
          bookingId: bId,
          amountLkr: pData.amountLkr,
        })
      );
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `payments/${pId}`);
  }
}

export async function fsReversePaymentAtomic(
  actor: UserSession,
  bookingId: string,
  paymentId: string,
  reason: string,
  requestId: string
): Promise<string> {
  const reqId = sanitizeId(requestId);
  const bId = sanitizeId(bookingId);
  const pId = sanitizeId(paymentId);
  try {
    return await runTransaction(db, async tx => {
      const idemRef = doc(db, 'idempotency_keys', reqId);
      const idemSnap = await tx.get(idemRef);
      if (idemSnap.exists()) return String(idemSnap.data().resultId);

      const bookingRef = doc(db, 'bookings', bId);
      const origPayRef = doc(db, 'payments', pId);
      const [bSnap, pSnap] = await Promise.all([tx.get(bookingRef), tx.get(origPayRef)]);
      if (!bSnap.exists()) throw new Error('Booking not found.');
      if (!pSnap.exists()) throw new Error('Original payment not found.');

      const booking = bSnap.data() as Booking;
      const origData = pSnap.data() as {
        amountLkr: number;
        type: PaymentRecord['type'];
        reference: string;
        isVerified: boolean;
        entryType: string;
        reversedByPaymentId?: string;
      };
      if (origData.entryType === 'REVERSAL' || origData.reversedByPaymentId) {
        throw new Error('Payment has already been reversed.');
      }

      const reversalId = sanitizeId(`REV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      const reversalRef = doc(db, 'payments', reversalId);
      const revAmount = origData.isVerified ? -Math.abs(origData.amountLkr) : 0;

      tx.update(origPayRef, {
        reversedByPaymentId: reversalId,
        updatedAt: serverTimestamp(),
      });

      tx.set(reversalRef, {
        bookingId: bId,
        requestId: reqId,
        entryType: 'REVERSAL',
        reversesPaymentId: pId,
        amountLkr: revAmount,
        type: origData.type,
        reference: `REV-${origData.reference}`,
        date: getTodayDDMMYYYY(),
        isVerified: true,
        verifiedBy: actor.fullName,
        verifiedByUid: actor.uid,
        verifiedAt: nowFormatted(),
        recordedByUid: actor.uid,
        notes: reason,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const reversalEntry: PaymentRecord = {
        id: reversalId,
        requestId: reqId,
        entryType: 'REVERSAL',
        reversesPaymentId: pId,
        date: getTodayDDMMYYYY(),
        amountLkr: revAmount,
        type: origData.type,
        reference: `REV-${origData.reference}`,
        status: 'Verified',
        verifiedBy: actor.fullName,
        verifiedByUid: actor.uid,
        verifiedAt: nowFormatted(),
        notes: reason,
      };

      const updatedPayments = [
        ...(booking.payments || []).map(p =>
          p.id === pId ? { ...p, status: 'Reversed' as const, reversedByPaymentId: reversalId } : p
        ),
        reversalEntry,
      ];
      const verifiedPaidLkr = updatedPayments
        .filter(p => p.id !== pId && p.status === 'Verified' && p.entryType !== 'REVERSAL')
        .reduce((s, p) => s + p.amountLkr, 0);
      const balanceLkr = Math.max(0, booking.finalPriceLkr - verifiedPaidLkr);

      tx.update(bookingRef, {
        payments: updatedPayments,
        verifiedPaidLkr,
        balanceLkr,
        deliveryChecklist: {
          ...booking.deliveryChecklist,
          paymentVerified: balanceLkr === 0 && verifiedPaidLkr > 0,
        },
        timeline: [
          ...(booking.timeline || []),
          {
            id: `tl-${Date.now()}`,
            date: nowFormatted(),
            title: 'Payment Reversal Posted',
            description: `Original payment ${origData.reference} reversed by ${actor.fullName}. Reason: ${reason}`,
            type: 'payment',
          },
        ],
        updatedAt: serverTimestamp(),
      });

      tx.set(idemRef, {
        requestId: reqId,
        operation: 'PAYMENT_REVERSE',
        actorUid: actor.uid,
        resultId: reversalId,
        createdAt: serverTimestamp(),
      });
      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`)),
        buildAuditEntry(actor, 'PAYMENT_REVERSED', 'payments', reversalId, {
          reversesPaymentId: pId,
          bookingId: bId,
          reason,
        }, reqId)
      );

      return reversalId;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `payments/${pId}`);
  }
}

export async function fsDecideDiscountAtomic(
  actor: UserSession,
  bookingId: string,
  approved: boolean,
  approvedAmountLkr: number
): Promise<void> {
  const bId = sanitizeId(bookingId);
  try {
    await runTransaction(db, async tx => {
      const bookingRef = doc(db, 'bookings', bId);
      const snap = await tx.get(bookingRef);
      if (!snap.exists()) throw new Error('Booking not found.');
      const b = snap.data() as Booking;
      if (b.status !== 'Confirmed') throw new Error('Booking is not active.');

      const discountLkr = approved ? Math.max(0, approvedAmountLkr) : 0;
      const finalPriceLkr = Math.max(
        0,
        b.totalPriceLkr - discountLkr + (b.accessoriesTotalLkr || 0) - (b.tradeInCreditLkr || 0)
      );
      const verifiedPaidLkr = b.verifiedPaidLkr || 0;
      const balanceLkr = Math.max(0, finalPriceLkr - verifiedPaidLkr);

      tx.update(bookingRef, {
        discountLkr,
        discountStatus: approved ? 'Approved' : 'Rejected',
        discountApprovedByUid: actor.uid,
        finalPriceLkr,
        balanceLkr,
        timeline: [
          ...(b.timeline || []),
          {
            id: `tl-${Date.now()}`,
            date: nowFormatted(),
            title: approved ? 'Discount Approved' : 'Discount Rejected',
            description: `${approved ? `LKR ${discountLkr.toLocaleString()} approved` : 'Discount request rejected'} by ${actor.fullName}.`,
            type: 'status',
          },
        ],
        updatedAt: serverTimestamp(),
      });
      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`)),
        buildAuditEntry(actor, approved ? 'DISCOUNT_APPROVED' : 'DISCOUNT_REJECTED', 'bookings', bId, {
          discountLkr,
          finalPriceLkr,
        })
      );
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${bId}`);
  }
}

export async function fsAttachAccessoryAtomic(
  actor: UserSession,
  bookingId: string,
  accessoryId: string,
  quantity: number
): Promise<void> {
  const bId = sanitizeId(bookingId);
  const aId = sanitizeId(accessoryId);
  try {
    await runTransaction(db, async tx => {
      const bookingRef = doc(db, 'bookings', bId);
      const accRef = doc(db, 'accessories', aId);
      const [bSnap, aSnap] = await Promise.all([tx.get(bookingRef), tx.get(accRef)]);
      if (!bSnap.exists()) throw new Error('Booking not found.');
      if (!aSnap.exists()) throw new Error('Accessory not found.');
      const b = bSnap.data() as Booking;
      const acc = aSnap.data() as Accessory;

      if (b.status !== 'Confirmed') throw new Error('Booking is not active.');
      if (acc.stockQuantity < quantity) {
        throw new Error(`Insufficient stock for ${acc.name}. Available: ${acc.stockQuantity}`);
      }

      const current = b.accessories || [];
      const idx = current.findIndex(i => i.accessoryId === aId);
      const nextAccessories =
        idx >= 0
          ? current.map((item, i) => (i === idx ? { ...item, quantity: item.quantity + quantity } : item))
          : [
              ...current,
              {
                accessoryId: aId,
                name: acc.name,
                partNumber: acc.partNumber,
                priceLkr: acc.priceLkr,
                quantity,
                installationStatus: 'Pending Installation' as const,
              },
            ];
      const accessoriesTotalLkr = nextAccessories.reduce((s, i) => s + i.priceLkr * i.quantity, 0);
      const finalPriceLkr = Math.max(
        0,
        b.totalPriceLkr - b.discountLkr + accessoriesTotalLkr - (b.tradeInCreditLkr || 0)
      );
      const balanceLkr = Math.max(0, finalPriceLkr - (b.verifiedPaidLkr || 0));

      tx.update(accRef, {
        stockQuantity: acc.stockQuantity - quantity,
        updatedAt: serverTimestamp(),
      });
      tx.update(bookingRef, {
        accessories: nextAccessories,
        accessoriesTotalLkr,
        finalPriceLkr,
        balanceLkr,
        timeline: [
          ...(b.timeline || []),
          {
            id: `tl-${Date.now()}`,
            date: nowFormatted(),
            title: 'Accessory Reserved & Attached',
            description: `${quantity}x ${acc.name} attached by ${actor.fullName}.`,
            type: 'booking',
          },
        ],
        updatedAt: serverTimestamp(),
      });
      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`)),
        buildAuditEntry(actor, 'ACCESSORY_RESERVED', 'bookings', bId, {
          accessoryId: aId,
          quantity,
          finalPriceLkr,
        })
      );
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Insufficient stock')) throw err;
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${bId}`);
  }
}

export async function fsRemoveAccessoryAtomic(
  actor: UserSession,
  bookingId: string,
  accessoryId: string
): Promise<void> {
  const bId = sanitizeId(bookingId);
  const aId = sanitizeId(accessoryId);
  try {
    await runTransaction(db, async tx => {
      const bookingRef = doc(db, 'bookings', bId);
      const accRef = doc(db, 'accessories', aId);
      const [bSnap, aSnap] = await Promise.all([tx.get(bookingRef), tx.get(accRef)]);
      if (!bSnap.exists()) throw new Error('Booking not found.');
      const b = bSnap.data() as Booking;
      if (b.status !== 'Confirmed') throw new Error('Cannot modify cancelled/delivered booking.');

      const item = (b.accessories || []).find(i => i.accessoryId === aId);
      if (!item) return;

      const nextAccessories = (b.accessories || []).filter(i => i.accessoryId !== aId);
      const accessoriesTotalLkr = nextAccessories.reduce((s, i) => s + i.priceLkr * i.quantity, 0);
      const finalPriceLkr = Math.max(
        0,
        b.totalPriceLkr - b.discountLkr + accessoriesTotalLkr - (b.tradeInCreditLkr || 0)
      );
      const balanceLkr = Math.max(0, finalPriceLkr - (b.verifiedPaidLkr || 0));

      if (aSnap.exists()) {
        const acc = aSnap.data() as Accessory;
        tx.update(accRef, {
          stockQuantity: acc.stockQuantity + item.quantity,
          updatedAt: serverTimestamp(),
        });
      }
      tx.update(bookingRef, {
        accessories: nextAccessories,
        accessoriesTotalLkr,
        finalPriceLkr,
        balanceLkr,
        updatedAt: serverTimestamp(),
      });
      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`)),
        buildAuditEntry(actor, 'ACCESSORY_RELEASED', 'bookings', bId, {
          accessoryId: aId,
          restoredQuantity: item.quantity,
        })
      );
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${bId}`);
  }
}

export async function fsCancelBookingAtomic(
  actor: UserSession,
  bookingId: string,
  reason: string
): Promise<void> {
  const bId = sanitizeId(bookingId);
  try {
    await runTransaction(db, async tx => {
      const bookingRef = doc(db, 'bookings', bId);
      const bSnap = await tx.get(bookingRef);
      if (!bSnap.exists()) throw new Error('Booking not found.');
      const b = bSnap.data() as Booking;
      if (b.status !== 'Confirmed') throw new Error(`Booking is already ${b.status}.`);

      const bikeRef = doc(db, 'bikes', sanitizeId(b.bikeId));
      const bikeSnap = await tx.get(bikeRef);

      const accessoryRefs = (b.accessories || []).map(item => ({
        ref: doc(db, 'accessories', sanitizeId(item.accessoryId)),
        qty: item.quantity,
      }));
      const accSnaps = await Promise.all(accessoryRefs.map(a => tx.get(a.ref)));

      // Writes after all reads
      if (bikeSnap.exists() && bikeSnap.data().allocatedBookingId === bId) {
        tx.update(bikeRef, {
          status: 'Available',
          allocatedBookingId: null,
          updatedAt: serverTimestamp(),
        });
      }

      accSnaps.forEach((snap, idx) => {
        if (snap.exists()) {
          const curQty = Number(snap.data().stockQuantity || 0);
          tx.update(accessoryRefs[idx].ref, {
            stockQuantity: curQty + accessoryRefs[idx].qty,
            updatedAt: serverTimestamp(),
          });
        }
      });

      tx.update(bookingRef, {
        status: 'Cancelled',
        cancellationReason: reason,
        timeline: [
          ...(b.timeline || []),
          {
            id: `tl-${Date.now()}`,
            date: nowFormatted(),
            title: 'Booking Cancelled & Inventory Restored',
            description: `Reason: ${reason}. Motorcycle and reserved accessories released by ${actor.fullName}.`,
            type: 'status',
          },
        ],
        updatedAt: serverTimestamp(),
      });

      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`)),
        buildAuditEntry(actor, 'BOOKING_CANCELLED', 'bookings', bId, {
          bikeId: b.bikeId,
          restoredAccessories: accessoryRefs.length,
          reason,
        })
      );
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${bId}`);
  }
}

export async function fsDeliverBookingAtomic(actor: UserSession, bookingId: string): Promise<void> {
  const bId = sanitizeId(bookingId);
  try {
    await runTransaction(db, async tx => {
      const bookingRef = doc(db, 'bookings', bId);
      const bSnap = await tx.get(bookingRef);
      if (!bSnap.exists()) throw new Error('Booking not found.');
      const b = bSnap.data() as Booking;
      if (b.status !== 'Confirmed') throw new Error('Booking must be Confirmed to deliver.');

      const verifiedPaid = b.verifiedPaidLkr || 0;
      const balance = Math.max(0, b.finalPriceLkr - verifiedPaid);
      if (balance > 0) {
        throw new Error(`Delivery blocked: LKR ${balance.toLocaleString()} balance remains unpaid/unverified.`);
      }
      if (
        !b.deliveryChecklist.paymentVerified ||
        !b.deliveryChecklist.documentsChecked ||
        !b.deliveryChecklist.pdiCompleted
      ) {
        throw new Error('Delivery blocked: Payment Verification, Documents, and PDI checklist must all be completed.');
      }

      const bikeRef = doc(db, 'bikes', sanitizeId(b.bikeId));
      const bikeSnap = await tx.get(bikeRef);
      if (!bikeSnap.exists() || bikeSnap.data().status !== 'Reserved') {
        throw new Error('Allocated motorcycle is not in Reserved state.');
      }

      tx.update(bikeRef, {
        status: 'Delivered',
        updatedAt: serverTimestamp(),
      });
      const deliveredAt = nowFormatted();
      tx.update(bookingRef, {
        status: 'Delivered',
        deliveredAt,
        deliveredBy: actor.fullName,
        timeline: [
          ...(b.timeline || []),
          {
            id: `tl-${Date.now()}`,
            date: deliveredAt,
            title: 'Vehicle Handover Completed',
            description: `Delivered to ${b.customerName} by ${actor.fullName}.`,
            type: 'delivery',
          },
        ],
        updatedAt: serverTimestamp(),
      });
      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`)),
        buildAuditEntry(actor, 'BOOKING_DELIVERED', 'bookings', bId, {
          bikeId: b.bikeId,
          deliveredBy: actor.fullName,
        })
      );
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Delivery blocked')) throw err;
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${bId}`);
  }
}

export async function fsCreateTradeIn(
  actor: UserSession,
  val: Omit<TradeInValuation, 'id' | 'date'>
): Promise<string> {
  const id = sanitizeId(`TI-2026-${Date.now().toString().slice(-5)}`);
  try {
    await runTransaction(db, async tx => {
      tx.set(doc(db, 'trade_ins', id), {
        ...val,
        status: 'Pending Approval',
        date: getTodayDDMMYYYY(),
        createdByUid: actor.uid,
        updatedAt: serverTimestamp(),
      });
      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}`)),
        buildAuditEntry(actor, 'TRADEIN_ESTIMATE_CREATED', 'trade_ins', id, {
          estimatedValuationLkr: val.estimatedValuationLkr,
        })
      );
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `trade_ins/${id}`);
  }
}

export async function fsDecideTradeIn(
  actor: UserSession,
  tradeInId: string,
  approved: boolean
): Promise<void> {
  const tId = sanitizeId(tradeInId);
  try {
    await updateDoc(doc(db, 'trade_ins', tId), {
      status: approved ? 'Approved' : 'Rejected',
      approvedBy: actor.fullName,
      approvedByUid: actor.uid,
      approvedAt: nowFormatted(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(
      doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}`)),
      buildAuditEntry(actor, approved ? 'TRADEIN_APPROVED' : 'TRADEIN_REJECTED', 'trade_ins', tId, {
        approved,
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `trade_ins/${tId}`);
  }
}

export async function fsApplyTradeInAtomic(
  actor: UserSession,
  tradeInId: string,
  bookingId: string
): Promise<void> {
  const tId = sanitizeId(tradeInId);
  const bId = sanitizeId(bookingId);
  try {
    await runTransaction(db, async tx => {
      const tiRef = doc(db, 'trade_ins', tId);
      const bRef = doc(db, 'bookings', bId);
      const [tiSnap, bSnap] = await Promise.all([tx.get(tiRef), tx.get(bRef)]);
      if (!tiSnap.exists()) throw new Error('Trade-in valuation not found.');
      if (!bSnap.exists()) throw new Error('Target booking not found.');
      const ti = tiSnap.data() as TradeInValuation;
      const b = bSnap.data() as Booking;

      if (ti.status !== 'Approved') {
        throw new Error(
          `Trade-in credit blocked: Status is "${ti.status || 'Pending Approval'}". Must be Approved by General Manager or Finance before applying.`
        );
      }
      if (ti.appliedBookingId) throw new Error('Trade-in credit has already been applied.');
      if (b.status !== 'Confirmed') throw new Error('Booking is not active.');

      const credit = ti.estimatedValuationLkr;
      const finalPriceLkr = Math.max(
        0,
        b.totalPriceLkr - b.discountLkr + (b.accessoriesTotalLkr || 0) - credit
      );
      const balanceLkr = Math.max(0, finalPriceLkr - (b.verifiedPaidLkr || 0));

      tx.update(tiRef, {
        status: 'Applied',
        appliedBookingId: bId,
        updatedAt: serverTimestamp(),
      });
      tx.update(bRef, {
        tradeInCreditLkr: credit,
        appliedTradeInId: tId,
        finalPriceLkr,
        balanceLkr,
        timeline: [
          ...(b.timeline || []),
          {
            id: `tl-${Date.now()}`,
            date: nowFormatted(),
            title: 'Approved Trade-In Credit Applied',
            description: `LKR ${credit.toLocaleString()} credited from ${ti.currentMakeModel} (${ti.registrationNumber}).`,
            type: 'payment',
          },
        ],
        updatedAt: serverTimestamp(),
      });
      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`)),
        buildAuditEntry(actor, 'TRADEIN_APPLIED', 'bookings', bId, {
          tradeInId: tId,
          creditLkr: credit,
          finalPriceLkr,
        })
      );
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Trade-in credit blocked')) throw err;
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${bId}`);
  }
}

export interface CreateAccountInput {
  email: string;
  fullName: string;
  role: UserRole;
  password?: string;
  designation?: string;
  department?: string;
  branch?: string;
  adminLimits?: SystemAdminLimits;
  assignedPermissions?: string[];
}

export async function fsCreateAccount(
  actor: UserSession,
  input: CreateAccountInput
): Promise<{ mode: 'direct_password' | 'invite'; message: string }> {
  const emailLower = input.email.trim().toLowerCase();
  if (isPermanentOwnerEmail(emailLower)) {
    throw new Error('Permanent Super Administrator / Owner account is reserved and cannot be overwritten.');
  }

  const actorIsSuper = isSuperAdminUser(actor);
  if (input.role === 'super_admin' && !actorIsSuper) {
    throw new Error('Only the Super Administrator / Owner can create another Super Administrator account.');
  }
  if (input.role === 'admin' && !hasUserPermission(actor, 'users.create_admin')) {
    throw new Error('Access denied: you do not have permission to create System Administrator accounts.');
  }
  if (input.role !== 'admin' && input.role !== 'super_admin' && !hasUserPermission(actor, 'users.create_staff') && !hasUserPermission(actor, 'users.manage_invites')) {
    throw new Error('Access denied: you do not have permission to create staff accounts.');
  }

  // Try server Admin API first (handles direct Firebase Auth password accounts + strict server quotas)
  try {
    const headers = await getBearerHeaders();
    const resp = await fetch('/api/admin/users', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...input,
        email: emailLower,
      }),
    });
    if (resp.ok) {
      const mode = input.password ? 'direct_password' : 'invite';
      return {
        mode,
        message:
          mode === 'direct_password'
            ? `Account created immediately for ${emailLower} with Firebase Auth credentials.`
            : `Pre-approved ${input.role === 'admin' ? 'System Administrator' : 'Staff'} invitation issued for ${emailLower}.`,
      };
    }
    const body = (await resp.json().catch(() => ({}))) as { error?: string; code?: string };
    if (resp.status !== 503) {
      throw new Error(body.error || 'Failed to create account.');
    }
    if (input.password && input.password.trim().length > 0) {
      throw new Error(
        body.error ||
          'Direct email/password Auth creation requires server Firebase Admin SDK credentials. Leave Initial Password blank to create a pre-approved invite (sign-in activates automatically).'
      );
    }
  } catch (err) {
    if (err instanceof Error && !err.message.includes('Failed to fetch')) {
      throw err;
    }
    if (input.password && input.password.trim().length > 0) {
      throw new Error(
        'Direct email/password Auth creation requires server Firebase Admin SDK credentials. Leave Initial Password blank to create a pre-approved invite.'
      );
    }
  }

  if (input.role === 'super_admin') {
    throw new Error('Additional Super Administrator accounts require server Admin SDK provisioning.');
  }

  // Rules-enforced Firestore invite fallback (enforces System Admin maxAccountsCanCreate quota atomically)
  const id = sanitizeId(emailLower);
  const cleanLimits = input.role === 'admin' ? input.adminLimits || DEFAULT_RESTRICTED_ADMIN_LIMITS : undefined;
  const cleanPerms =
    input.assignedPermissions !== undefined
      ? input.assignedPermissions
      : cleanLimits
      ? buildPermissionsFromAdminLimits(cleanLimits)
      : undefined;

  try {
    await runTransaction(db, async tx => {
      if (!actorIsSuper) {
        const actorRef = doc(db, 'users', actor.uid);
        const actorSnap = await tx.get(actorRef);
        const freshActor = actorSnap.exists() ? (actorSnap.data() as UserSession) : actor;
        const maxAllowed = freshActor.adminLimits?.maxAccountsCanCreate ?? 0;
        const used = freshActor.accountsCreatedCount ?? 0;
        if (used >= maxAllowed) {
          throw new Error(
            `Account creation quota reached (${used}/${maxAllowed}). Request an increase from the Super Administrator.`
          );
        }
        tx.update(actorRef, {
          accountsCreatedCount: used + 1,
          updatedAt: serverTimestamp(),
        });
      }

      tx.set(doc(db, 'staff_invites', id), {
        email: emailLower,
        fullName: input.fullName.trim(),
        role: input.role,
        designation: (input.designation || input.role).trim(),
        department: (input.department || 'Showroom Operations').trim(),
        branch: (input.branch || 'Colombo 03 Flagship').trim(),
        status: 'Pending',
        invitedByUid: actor.uid,
        ...(cleanLimits ? { adminLimits: cleanLimits } : {}),
        ...(cleanPerms ? { assignedPermissions: cleanPerms } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)),
        buildAuditEntry(
          actor,
          input.role === 'admin' ? 'SYSTEM_ADMIN_INVITE_CREATED' : 'ACCOUNT_CREATED',
          'staff_invites',
          id,
          { email: emailLower, role: input.role, mode: 'invite' }
        )
      );
    });
    return {
      mode: 'invite',
      message: `Pre-approved ${input.role === 'admin' ? 'System Administrator' : 'Staff'} invitation saved for ${emailLower}.`,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('quota reached')) throw err;
    handleFirestoreError(err, OperationType.CREATE, `staff_invites/${id}`);
  }
}

export async function fsCreateInvite(
  actor: UserSession,
  invite: Omit<StaffInvite, 'id' | 'status' | 'invitedByUid' | 'createdAt'>
): Promise<void> {
  await fsCreateAccount(actor, {
    email: invite.email,
    fullName: invite.fullName,
    role: invite.role,
    designation: invite.designation,
    department: invite.department,
    branch: invite.branch,
    adminLimits: invite.adminLimits,
    assignedPermissions: invite.assignedPermissions,
  });
}

export async function fsRevokeInvite(actor: UserSession, email: string): Promise<void> {
  const emailLower = email.trim().toLowerCase();
  const id = sanitizeId(emailLower);
  try {
    const headers = await getBearerHeaders();
    const resp = await fetch(`/api/admin/invites/${encodeURIComponent(emailLower)}`, {
      method: 'DELETE',
      headers,
    });
    if (resp.ok) return;
    if (resp.status !== 503) {
      const body = (await resp.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || 'Failed to revoke invite.');
    }
  } catch (err) {
    if (err instanceof Error && !err.message.includes('Failed to fetch')) throw err;
  }

  try {
    await deleteDoc(doc(db, 'staff_invites', id));
    await setDoc(
      doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)),
      buildAuditEntry(actor, 'INVITE_REVOKED', 'staff_invites', id, { email: emailLower })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `staff_invites/${id}`);
  }
}

export async function fsUpdateUserRoleOrStatus(
  actor: UserSession,
  targetUid: string,
  updates: { role?: UserRole; disabled?: boolean }
): Promise<void> {
  const uId = sanitizeId(targetUid);
  if (uId === actor.uid) {
    throw new Error('You cannot modify your own role or disable your own active session.');
  }
  const actorIsSuper = isSuperAdminUser(actor);
  if (updates.role === 'super_admin' && !actorIsSuper) {
    throw new Error('Restricted System Administrators cannot assign Super Administrator / Owner privileges.');
  }
  if (updates.role === 'admin' && !actorIsSuper && !actor.adminLimits?.canCreateSystemAdmins) {
    throw new Error('You do not have permission to assign the System Administrator role.');
  }

  // Try server Admin endpoints first if available
  try {
    const headers = await getBearerHeaders();
    if (updates.role !== undefined) {
      const resp = await fetch(`/api/admin/users/${encodeURIComponent(uId)}/role`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role: updates.role }),
      });
      if (resp.ok) {
        if (updates.disabled === undefined) return;
      } else if (resp.status !== 503) {
        const body = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Role update failed.');
      } else {
        throw new Error('SERVER_UNCONFIGURED');
      }
    }
    if (updates.disabled !== undefined) {
      const resp = await fetch(`/api/admin/users/${encodeURIComponent(uId)}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ disabled: updates.disabled }),
      });
      if (resp.ok) return;
      if (resp.status !== 503) {
        const body = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Status update failed.');
      }
      throw new Error('SERVER_UNCONFIGURED');
    }
  } catch (err) {
    if (err instanceof Error && err.message !== 'SERVER_UNCONFIGURED' && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  try {
    const activeSuperAdminsSnap = await getDocs(
      query(collection(db, 'users'), where('role', '==', 'super_admin'), where('disabled', '==', false))
    );
    const activeSuperAdminIds = activeSuperAdminsSnap.docs.map(d => d.id);

    await runTransaction(db, async tx => {
      const userRef = doc(db, 'users', uId);
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error('Staff user record not found.');
      const cur = snap.data() as UserSession;

      if (isPermanentOwnerEmail(cur.email) || cur.isPermanentOwner) {
        throw new Error('Permanent Super Administrator / Owner (Shewonshezy12@gmail.com) cannot be demoted, disabled, or modified.');
      }

      if (cur.role === 'super_admin' && !actorIsSuper) {
        throw new Error('Restricted System Administrators cannot modify or disable a Super Administrator / Owner.');
      }

      const removingSuperAdmin =
        cur.role === 'super_admin' &&
        !cur.disabled &&
        ((updates.role !== undefined && updates.role !== 'super_admin') || updates.disabled === true);

      if (removingSuperAdmin && activeSuperAdminIds.length <= 1 && activeSuperAdminIds.includes(uId)) {
        throw new Error('Cannot demote or disable the last active Super Administrator / Owner.');
      }

      const patchData: Record<string, unknown> = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      if (updates.role === 'admin' && !cur.adminLimits) {
        patchData.adminLimits = DEFAULT_RESTRICTED_ADMIN_LIMITS;
      }

      tx.update(userRef, patchData);
      tx.update(doc(db, 'staff_directory', uId), {
        ...(updates.role ? { role: updates.role } : {}),
        ...(updates.disabled !== undefined ? { active: !updates.disabled } : {}),
        updatedAt: serverTimestamp(),
      });
      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`)),
        buildAuditEntry(
          actor,
          updates.disabled !== undefined
            ? updates.disabled
              ? 'ACCOUNT_DEACTIVATED'
              : 'ACCOUNT_ACTIVATED'
            : 'ROLE_CHANGE',
          'users',
          uId,
          {
            targetEmail: cur.email,
            previousRole: cur.role,
            ...updates,
          }
        )
      );
    });
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('Restricted') ||
        err.message.includes('last active') ||
        err.message.includes('own') ||
        err.message.includes('Permanent Super Administrator'))
    ) {
      throw err;
    }
    handleFirestoreError(err, OperationType.UPDATE, `users/${uId}`);
  }
}

export async function fsUpdateUserPermissions(
  actor: UserSession,
  targetUid: string,
  payload: { adminLimits?: SystemAdminLimits; assignedPermissions?: string[] }
): Promise<void> {
  const uId = sanitizeId(targetUid);
  try {
    const headers = await getBearerHeaders();
    const resp = await fetch(`/api/admin/users/${encodeURIComponent(uId)}/permissions`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    if (resp.ok) return;
    if (resp.status !== 503) {
      const body = (await resp.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || 'Permission update failed.');
    }
  } catch (err) {
    if (err instanceof Error && !err.message.includes('Failed to fetch')) throw err;
  }

  try {
    await runTransaction(db, async tx => {
      const userRef = doc(db, 'users', uId);
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error('Staff user record not found.');
      const cur = snap.data() as UserSession;

      if (isPermanentOwnerEmail(cur.email) || cur.isPermanentOwner) {
        throw new Error('Permanent Super Administrator / Owner permissions cannot be restricted or removed.');
      }
      if (cur.role === 'admin' && !isSuperAdminUser(actor)) {
        throw new Error('Only the Super Administrator / Owner can set System Administrator limits and permissions.');
      }

      const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (cur.role === 'admin' && payload.adminLimits) {
        patch.adminLimits = payload.adminLimits;
        patch.assignedPermissions =
          payload.assignedPermissions !== undefined
            ? payload.assignedPermissions
            : buildPermissionsFromAdminLimits(payload.adminLimits);
      } else if (payload.assignedPermissions !== undefined) {
        patch.assignedPermissions = payload.assignedPermissions;
      }

      tx.update(userRef, patch);
      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)),
        buildAuditEntry(actor, 'PERMISSION_CHANGE', 'users', uId, {
          targetEmail: cur.email,
          targetRole: cur.role,
          ...(payload.adminLimits ? { adminLimits: payload.adminLimits } : {}),
          ...(payload.assignedPermissions ? { assignedPermissions: payload.assignedPermissions } : {}),
        })
      );
    });
  } catch (err) {
    if (err instanceof Error && (err.message.includes('Permanent') || err.message.includes('Only the Super'))) {
      throw err;
    }
    handleFirestoreError(err, OperationType.UPDATE, `users/${uId}`);
  }
}

export async function fsResetUserPassword(
  actor: UserSession,
  targetUser: UserSession,
  newPassword?: string
): Promise<{ method: string; resetLink?: string; message: string }> {
  if (
    (isPermanentOwnerEmail(targetUser.email) || targetUser.isPermanentOwner) &&
    !isPermanentOwnerEmail(actor.email)
  ) {
    throw new Error('Permanent Super Administrator / Owner password cannot be reset by another administrator.');
  }
  if (targetUser.role === 'super_admin' && !isSuperAdminUser(actor)) {
    throw new Error('Restricted System Administrators cannot reset a Super Administrator password.');
  }

  try {
    const headers = await getBearerHeaders();
    const resp = await fetch(`/api/admin/users/${encodeURIComponent(targetUser.uid)}/reset-password`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newPassword ? { newPassword } : {}),
    });
    if (resp.ok) {
      const json = (await resp.json()) as { resetLink?: string };
      return {
        method: newPassword ? 'admin_password_set' : 'reset_link_generated',
        resetLink: json.resetLink,
        message: newPassword
          ? `Password updated directly for ${targetUser.email}.`
          : `Password reset link generated for ${targetUser.email}.`,
      };
    }
    const body = (await resp.json().catch(() => ({}))) as { error?: string };
    if (resp.status !== 503) {
      throw new Error(body.error || 'Password reset failed.');
    }
    if (newPassword && newPassword.length > 0) {
      throw new Error(
        body.error ||
          'Setting an explicit password requires server Admin SDK credentials. Leave New Password blank to email a Firebase Password Reset link.'
      );
    }
  } catch (err) {
    if (err instanceof Error && !err.message.includes('Failed to fetch')) {
      throw err;
    }
    if (newPassword && newPassword.length > 0) {
      throw new Error(
        'Setting an explicit password requires server Admin SDK credentials. Leave New Password blank to email a Firebase Password Reset link.'
      );
    }
  }

  // Fallback: Firebase Client SDK password reset email + immutable audit entry
  await sendPasswordResetEmail(auth, targetUser.email);
  await setDoc(
    doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)),
    buildAuditEntry(actor, 'PASSWORD_RESET', 'users', targetUser.uid, {
      targetEmail: targetUser.email,
      method: 'firebase_reset_email',
    })
  );
  return {
    method: 'firebase_reset_email',
    message: `Password reset email dispatched via Firebase Authentication to ${targetUser.email} and logged to audit trail.`,
  };
}

export async function fsDeleteUserAccount(
  actor: UserSession,
  targetUser: UserSession
): Promise<{ authDeleted: boolean; message: string }> {
  if (targetUser.uid === actor.uid) {
    throw new Error('You cannot delete your own active account.');
  }
  if (isPermanentOwnerEmail(targetUser.email) || targetUser.isPermanentOwner) {
    throw new Error('Permanent Super Administrator / Owner (Shewonshezy12@gmail.com) cannot be deleted.');
  }
  if (targetUser.role === 'super_admin' && !isSuperAdminUser(actor)) {
    throw new Error('Restricted System Administrators cannot delete a Super Administrator account.');
  }

  try {
    const headers = await getBearerHeaders();
    const resp = await fetch(`/api/admin/users/${encodeURIComponent(targetUser.uid)}`, {
      method: 'DELETE',
      headers,
    });
    if (resp.ok) {
      return {
        authDeleted: true,
        message: `Account ${targetUser.email} deleted from Firebase Authentication & Firestore and logged.`,
      };
    }
    if (resp.status !== 503) {
      const body = (await resp.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || 'Account deletion failed.');
    }
  } catch (err) {
    if (err instanceof Error && !err.message.includes('Failed to fetch')) throw err;
  }

  try {
    const activeSuperAdminsSnap = await getDocs(
      query(collection(db, 'users'), where('role', '==', 'super_admin'), where('disabled', '==', false))
    );
    const activeSuperAdminIds = activeSuperAdminsSnap.docs.map(d => d.id);

    await runTransaction(db, async tx => {
      const userRef = doc(db, 'users', targetUser.uid);
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error('Target staff profile not found.');
      const cur = snap.data() as UserSession;

      if (isPermanentOwnerEmail(cur.email) || cur.isPermanentOwner) {
        throw new Error('Permanent Super Administrator / Owner (Shewonshezy12@gmail.com) cannot be deleted.');
      }
      if (
        cur.role === 'super_admin' &&
        !cur.disabled &&
        activeSuperAdminIds.length <= 1 &&
        activeSuperAdminIds.includes(targetUser.uid)
      ) {
        throw new Error('Cannot delete the last active Super Administrator / Owner.');
      }

      tx.delete(userRef);
      tx.delete(doc(db, 'staff_directory', targetUser.uid));
      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)),
        buildAuditEntry(actor, 'ACCOUNT_DELETED', 'users', targetUser.uid, {
          deletedEmail: cur.email,
          deletedRole: cur.role,
          authDeleted: false,
        })
      );
    });

    return {
      authDeleted: false,
      message: `Access profile for ${targetUser.email} deleted from Firestore (access revoked immediately). Server Admin SDK is required to remove the underlying Firebase Auth login identity.`,
    };
  } catch (err) {
    if (err instanceof Error && (err.message.includes('Permanent') || err.message.includes('last active'))) {
      throw err;
    }
    handleFirestoreError(err, OperationType.DELETE, `users/${targetUser.uid}`);
  }
}

export async function fsDecideLeave(
  actor: UserSession,
  leaveId: string,
  status: LeaveStatus
): Promise<void> {
  const lId = sanitizeId(leaveId);
  try {
    await updateDoc(doc(db, 'leave_requests', lId), {
      status,
      decisionDate: getTodayDDMMYYYY(),
      decisionBy: actor.fullName,
      decisionByUid: actor.uid,
      updatedAt: serverTimestamp(),
    });
    await setDoc(
      doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}`)),
      buildAuditEntry(actor, 'LEAVE_DECISION', 'leave_requests', lId, { status })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `leave_requests/${lId}`);
  }
}

export async function fsExportDatabaseBackup(actor: UserSession): Promise<Record<string, unknown[]>> {
  const colNames = [
    'users',
    'staff_invites',
    'leads',
    'bikes',
    'bookings',
    'payments',
    'accessories',
    'test_rides',
    'trade_ins',
    'employees',
    ...(hasUserPermission(actor, 'hr.payroll.read') ? ['employees_payroll'] : []),
    'leave_requests',
    'attendance',
    'service_cards',
    'audit_logs',
  ];
  const snapshot: Record<string, unknown[]> = {};
  for (const name of colNames) {
    try {
      const snap = await getDocs(collection(db, name));
      snapshot[name] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      // Collections restricted by separation of duties (e.g., employees_payroll) are intentionally skipped for restricted admins
      snapshot[name] = [];
    }
  }
  await setDoc(
    doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}`)),
    buildAuditEntry(actor, 'BACKUP_EXPORTED', 'system', 'snapshot', { collections: colNames.length })
  );
  return snapshot;
}

export async function fsAddBike(actor: UserSession, bikeData: Omit<Bike, 'id'>): Promise<string> {
  const id = sanitizeId(`bike-${Date.now()}`);
  try {
    await setDoc(doc(db, 'bikes', id), {
      ...bikeData,
      updatedAt: serverTimestamp(),
    });
    await setDoc(
      doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}`)),
      buildAuditEntry(actor, 'BIKE_ADDED', 'bikes', id, { model: bikeData.model, chassisNumber: bikeData.chassisNumber })
    );
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `bikes/${id}`);
  }
}

export async function fsUpdateBike(actor: UserSession, bikeId: string, updates: Partial<Bike>): Promise<void> {
  const id = sanitizeId(bikeId);
  try {
    const clean = { ...updates };
    delete (clean as { id?: string }).id;
    await updateDoc(doc(db, 'bikes', id), { ...clean, updatedAt: serverTimestamp() });
    await setDoc(
      doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}`)),
      buildAuditEntry(actor, 'BIKE_UPDATED', 'bikes', id, { fields: Object.keys(clean) })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `bikes/${id}`);
  }
}

export async function fsUpdateDeliveryChecklist(
  actor: UserSession,
  bookingId: string,
  checklist: Partial<DeliveryChecklist>
): Promise<void> {
  const bId = sanitizeId(bookingId);
  try {
    await runTransaction(db, async tx => {
      const ref = doc(db, 'bookings', bId);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Booking not found.');
      const b = snap.data() as Booking;
      // Only preserve paymentVerified from authoritative ledger state
      const nextChecklist: DeliveryChecklist = {
        ...b.deliveryChecklist,
        ...checklist,
        paymentVerified: b.deliveryChecklist.paymentVerified,
      };
      tx.update(ref, {
        deliveryChecklist: nextChecklist,
        updatedAt: serverTimestamp(),
      });
      tx.set(
        doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`)),
        buildAuditEntry(actor, 'PDI_CHECKLIST_UPDATED', 'bookings', bId, { checklist })
      );
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${bId}`);
  }
}

export async function fsAddTestRide(actor: UserSession, record: Omit<TestRideRecord, 'id'>): Promise<string> {
  const id = sanitizeId(`TR-2026-${Date.now().toString().slice(-5)}`);
  try {
    await setDoc(doc(db, 'test_rides', id), {
      ...record,
      createdByUid: actor.uid,
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `test_rides/${id}`);
  }
}

export async function fsUpdateTestRide(
  actor: UserSession,
  id: string,
  updates: Partial<TestRideRecord>
): Promise<void> {
  const cleanId = sanitizeId(id);
  try {
    const clean = { ...updates };
    delete (clean as { id?: string }).id;
    await updateDoc(doc(db, 'test_rides', cleanId), {
      ...clean,
      updatedAt: serverTimestamp(),
    });
    await setDoc(
      doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}`)),
      buildAuditEntry(actor, 'TEST_RIDE_UPDATED', 'test_rides', cleanId, { status: clean.status })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `test_rides/${cleanId}`);
  }
}

export async function fsAddServiceCard(actor: UserSession, card: Omit<ServiceJobCard, 'id'>): Promise<string> {
  const id = sanitizeId(`JOB-2026-${Date.now().toString().slice(-5)}`);
  try {
    await setDoc(doc(db, 'service_cards', id), {
      ...card,
      updatedAt: serverTimestamp(),
    });
    await setDoc(
      doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}`)),
      buildAuditEntry(actor, 'SERVICE_CARD_CREATED', 'service_cards', id, { chassisNumber: card.chassisNumber })
    );
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `service_cards/${id}`);
  }
}

export async function fsUpdateServiceStatus(
  actor: UserSession,
  cardId: string,
  status: ServiceJobCard['status']
): Promise<void> {
  const id = sanitizeId(cardId);
  try {
    await updateDoc(doc(db, 'service_cards', id), {
      status,
      updatedAt: serverTimestamp(),
    });
    await setDoc(
      doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}`)),
      buildAuditEntry(actor, 'SERVICE_STATUS_UPDATED', 'service_cards', id, { status })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `service_cards/${id}`);
  }
}

export async function fsAddLeaveRequest(
  actor: UserSession,
  request: Omit<LeaveRequest, 'id' | 'status' | 'appliedOn'>
): Promise<string> {
  const id = sanitizeId(`LV-2026-${Date.now().toString().slice(-5)}`);
  try {
    await setDoc(doc(db, 'leave_requests', id), {
      ...request,
      status: 'Pending',
      appliedOn: getTodayDDMMYYYY(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(
      doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}`)),
      buildAuditEntry(actor, 'LEAVE_SUBMITTED', 'leave_requests', id, { employeeId: request.employeeId })
    );
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `leave_requests/${id}`);
  }
}

export async function fsMarkAttendance(
  actor: UserSession,
  record: Omit<AttendanceRecord, 'id'>
): Promise<void> {
  const id = sanitizeId(`att-${record.date.replace(/\//g, '-')}-${record.employeeId}`);
  try {
    await setDoc(
      doc(db, 'attendance', id),
      {
        ...record,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await setDoc(
      doc(db, 'audit_logs', sanitizeId(`aud-${Date.now()}`)),
      buildAuditEntry(actor, 'ATTENDANCE_MARKED', 'attendance', id, { status: record.status })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `attendance/${id}`);
  }
}

