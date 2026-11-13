/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { importX509, jwtVerify } from 'jose';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import type { App as AdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';
import type { Firestore, Transaction, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { createApiRouter } from './server/engine.ts';
import type { DataStore, DataStoreTx, VerifiedTokenClaims } from './server/engine.ts';
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
} from './src/types/index.ts';
import { ALL_STAFF_ROLES } from './src/auth/permissions.ts';

const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = fs.existsSync(firebaseConfigPath)
  ? JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'))
  : {};

const PROJECT_ID: string = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId || '';
const FIRESTORE_DB_ID: string =
  process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || '(default)';

// Initialize Firebase Admin SDK:
// 1. Uses FIREBASE_SERVICE_ACCOUNT_JSON if explicitly provided (alternative secret method).
// 2. Otherwise always attempts applicationDefault() (works with Cloud Run ADC, gcloud ADC, or GOOGLE_APPLICATION_CREDENTIALS if set).
// 3. Probes Firestore access so missing cross-project IAM permissions fail closed cleanly instead of breaking /api/auth or faking mock storage.
let adminApp: AdminApp | null = null;
let adminDb: Firestore | null = null;
let adminStoreReady = false;
let adminAuthReady = false;
let adminCredentialMode: 'service_account_json' | 'application_default' | 'unconfigured' = 'unconfigured';
let adminStatusDetail = 'Firebase Admin SDK has not been probed yet.';

function initAdminSdk(): void {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  try {
    if (saJson) {
      const parsed = JSON.parse(saJson);
      adminApp = initializeApp({
        credential: cert(parsed),
        projectId: PROJECT_ID || parsed.project_id,
      });
      adminCredentialMode = 'service_account_json';
    } else {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId: PROJECT_ID || undefined,
      });
      adminCredentialMode = 'application_default';
    }

    if (adminApp) {
      adminDb =
        FIRESTORE_DB_ID && FIRESTORE_DB_ID !== '(default)'
          ? getAdminFirestore(adminApp, FIRESTORE_DB_ID)
          : getAdminFirestore(adminApp);
    }
  } catch (err) {
    adminApp = null;
    adminDb = null;
    adminStoreReady = false;
    adminAuthReady = false;
    adminCredentialMode = 'unconfigured';
    adminStatusDetail = err instanceof Error ? err.message : String(err);
    console.warn('Firebase Admin SDK initialization failed:', adminStatusDetail);
  }
}

async function probeAdminPermissions(): Promise<void> {
  if (!adminApp || !adminDb) return;

  try {
    await adminDb.collection('test').doc('connection').get();
    adminStoreReady = true;
    adminAuthReady = true;
    adminStatusDetail = `Connected via ${adminCredentialMode}.`;
    console.log(`Firebase Admin Firestore connected (${adminCredentialMode}) for project "${PROJECT_ID}".`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    adminStoreReady = false;
    adminAuthReady = false;

    if (message.includes('PERMISSION_DENIED') || message.includes('Missing or insufficient permissions')) {
      adminStatusDetail =
        `Runtime Application Default Credentials initialized (${adminCredentialMode}), ` +
        `but the runtime service account lacks IAM permissions on project "${PROJECT_ID}" ` +
        `(requires roles/datastore.user and roles/firebaseauth.admin, or set FIREBASE_SERVICE_ACCOUNT_JSON).`;
    } else if (message.includes('Could not load the default credentials')) {
      adminStatusDetail =
        'No Application Default Credentials found in this runtime. ' +
        'Run `gcloud auth application-default login` locally, attach a service account in Cloud Run, or provide FIREBASE_SERVICE_ACCOUNT_JSON.';
    } else {
      adminStatusDetail = `Firebase Admin probe failed: ${message}`;
    }
    console.warn(adminStatusDetail);
  }
}

initAdminSdk();
const adminProbePromise = probeAdminPermissions();

// Cryptographic Firebase ID Token verification:
// 1) Prefers Firebase Admin SDK verifyIdToken(token, true) when Admin Auth IAM is verified.
// 2) Otherwise verifies RS256 signature, issuer, audience, expiry, and email_verified directly against Google's public Firebase x509 certs.
let cachedCerts: Record<string, string> = {};
let certsExpiresAt = 0;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < certsExpiresAt && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error('Unable to fetch Google Firebase public verification certificates.');
  }
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 300;
  cachedCerts = (await resp.json()) as Record<string, string>;
  certsExpiresAt = now + maxAgeSec * 1000;
  return cachedCerts;
}

function parseCustomRole(raw: unknown): UserRole | undefined {
  if (typeof raw === 'string' && (ALL_STAFF_ROLES as readonly string[]).includes(raw)) {
    return raw as UserRole;
  }
  return undefined;
}

async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedTokenClaims> {
  await adminProbePromise;

  if (adminApp && adminAuthReady) {
    try {
      const decoded = await getAdminAuth(adminApp).verifyIdToken(idToken, true);
      return {
        uid: decoded.uid,
        email: (decoded.email || '').toLowerCase(),
        emailVerified: Boolean(decoded.email_verified),
        name: decoded.name,
        customRole: parseCustomRole(decoded.role),
      };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (
        code !== 'auth/internal-error' &&
        code !== 'auth/insufficient-permission'
      ) {
        throw err;
      }
      // Fall through to cryptographic Google x509 JWT verification if Admin Auth API IAM is missing
    }
  }

  if (!PROJECT_ID) {
    throw new Error('Firebase projectId is not configured.');
  }

  const certs = await getGooglePublicCerts();
  const { payload } = await jwtVerify(
    idToken,
    async header => {
      const certPem = header.kid ? certs[header.kid] : undefined;
      if (!certPem) {
        throw new Error('Unknown Firebase signing key ID.');
      }
      return importX509(certPem, 'RS256');
    },
    {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
      algorithms: ['RS256'],
    }
  );

  const uid = String(payload.sub || '');
  if (!uid) throw new Error('Invalid Firebase token subject.');

  return {
    uid,
    email: String(payload.email || '').toLowerCase(),
    emailVerified: Boolean(payload.email_verified),
    name: payload.name ? String(payload.name) : undefined,
    customRole: parseCustomRole(payload.role),
  };
}

class FirestoreAdminDataStore implements DataStore {
  isConfigured(): boolean {
    return Boolean(adminDb && adminStoreReady);
  }

  getStatusReason(): string {
    return adminStatusDetail;
  }

  async runTransaction<T>(fn: (tx: DataStoreTx) => Promise<T>): Promise<T> {
    if (!adminDb) {
      throw new Error('Firestore Admin SDK is not initialized.');
    }
    const db = adminDb;
    return db.runTransaction(async (fsTx: Transaction) => {
      const txWrapper: DataStoreTx = {
        async getUserByUid(uid) {
          const snap = await fsTx.get(db.collection('users').doc(uid));
          return snap.exists ? ({ id: snap.id, ...snap.data() } as UserSession) : null;
        },
        async getInviteByEmail(email) {
          const snap = await fsTx.get(db.collection('staff_invites').doc(email));
          return snap.exists ? ({ id: snap.id, ...snap.data() } as StaffInvite) : null;
        },
        async saveUser(user) {
          fsTx.set(
            db.collection('users').doc(user.uid),
            {
              ...user,
              updatedAt: FieldValue.serverTimestamp(),
              createdAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          fsTx.set(
            db.collection('staff_directory').doc(user.uid),
            {
              uid: user.uid,
              fullName: user.fullName,
              role: user.role,
              designation: user.designation,
              department: user.department,
              active: !user.disabled,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        },
        async deleteUser(uid) {
          fsTx.delete(db.collection('users').doc(uid));
          fsTx.delete(db.collection('staff_directory').doc(uid));
        },
        async saveInvite(invite) {
          fsTx.set(
            db.collection('staff_invites').doc(invite.id),
            {
              ...invite,
              updatedAt: FieldValue.serverTimestamp(),
              createdAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        },
        async deleteInvite(email) {
          fsTx.delete(db.collection('staff_invites').doc(email));
        },
        async listUsers() {
          const snap = await fsTx.get(db.collection('users'));
          return snap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }) as UserSession);
        },
        async listInvites() {
          const snap = await fsTx.get(db.collection('staff_invites'));
          return snap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }) as StaffInvite);
        },
        async getBike(bikeId) {
          const snap = await fsTx.get(db.collection('bikes').doc(bikeId));
          return snap.exists ? ({ id: snap.id, ...snap.data() } as Bike) : null;
        },
        async saveBike(bike) {
          fsTx.set(
            db.collection('bikes').doc(bike.id),
            { ...bike, updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
          );
        },
        async getBooking(bookingId) {
          const snap = await fsTx.get(db.collection('bookings').doc(bookingId));
          return snap.exists ? ({ id: snap.id, ...snap.data() } as Booking) : null;
        },
        async saveBooking(booking) {
          fsTx.set(
            db.collection('bookings').doc(booking.id),
            { ...booking, updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
          );
        },
        async listBookings() {
          const snap = await fsTx.get(db.collection('bookings'));
          return snap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }) as Booking);
        },
        async getPayment(paymentId) {
          const snap = await fsTx.get(db.collection('payments').doc(paymentId));
          return snap.exists
            ? ({ id: snap.id, ...snap.data() } as PaymentRecord & { bookingId: string })
            : null;
        },
        async savePayment(payment) {
          fsTx.set(
            db.collection('payments').doc(payment.id),
            {
              ...payment,
              isVerified: payment.status === 'Verified',
              updatedAt: FieldValue.serverTimestamp(),
              createdAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        },
        async listPaymentsByBooking(bookingId) {
          const snap = await fsTx.get(
            db.collection('payments').where('bookingId', '==', bookingId)
          );
          return snap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }) as PaymentRecord & { bookingId: string });
        },
        async getAccessory(accessoryId) {
          const snap = await fsTx.get(db.collection('accessories').doc(accessoryId));
          return snap.exists ? ({ id: snap.id, ...snap.data() } as Accessory) : null;
        },
        async saveAccessory(accessory) {
          fsTx.set(
            db.collection('accessories').doc(accessory.id),
            { ...accessory, updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
          );
        },
        async getTradeIn(tradeInId) {
          const snap = await fsTx.get(db.collection('trade_ins').doc(tradeInId));
          return snap.exists ? ({ id: snap.id, ...snap.data() } as TradeInValuation) : null;
        },
        async saveTradeIn(tradeIn) {
          fsTx.set(
            db.collection('trade_ins').doc(tradeIn.id),
            { ...tradeIn, updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
          );
        },
        async getEmployee(employeeId) {
          const snap = await fsTx.get(db.collection('employees').doc(employeeId));
          return snap.exists ? ({ id: snap.id, ...snap.data() } as Employee) : null;
        },
        async saveEmployee(employee) {
          const { salary: _omit, ...rest } = employee;
          fsTx.set(
            db.collection('employees').doc(employee.id),
            { ...rest, updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
          );
        },
        async listEmployees() {
          const snap = await fsTx.get(db.collection('employees'));
          return snap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }) as Employee);
        },
        async getPayroll(employeeId) {
          const snap = await fsTx.get(db.collection('employees_payroll').doc(employeeId));
          return snap.exists ? (snap.data() as EmployeeSalary) : null;
        },
        async savePayroll(employeeId, salary) {
          fsTx.set(
            db.collection('employees_payroll').doc(employeeId),
            { ...salary, employeeId, updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
          );
        },
        async listPayrolls() {
          const snap = await fsTx.get(db.collection('employees_payroll'));
          return snap.docs.map((d: QueryDocumentSnapshot) => {
            const data = d.data() as { empCode?: string; fullName?: string } & EmployeeSalary;
            return {
              employeeId: d.id,
              empCode: data.empCode || '',
              fullName: data.fullName || '',
              salary: {
                basicLkr: data.basicLkr,
                showroomAllowanceLkr: data.showroomAllowanceLkr || 0,
                salesIncentiveLkr: data.salesIncentiveLkr || 0,
                illustrativeDeductionsLkr: data.illustrativeDeductionsLkr || 0,
              },
            };
          });
        },
        async getLeave(leaveId) {
          const snap = await fsTx.get(db.collection('leave_requests').doc(leaveId));
          return snap.exists ? ({ id: snap.id, ...snap.data() } as LeaveRequest) : null;
        },
        async saveLeave(leave) {
          fsTx.set(
            db.collection('leave_requests').doc(leave.id),
            { ...leave, updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
          );
        },
        async getIdempotencyKey(key) {
          const snap = await fsTx.get(db.collection('idempotency_keys').doc(key));
          return snap.exists ? (snap.data() as { resultId: string }) : null;
        },
        async saveIdempotencyKey(key, operation, actorUid, resultId) {
          fsTx.set(db.collection('idempotency_keys').doc(key), {
            requestId: key,
            operation,
            actorUid,
            resultId,
            createdAt: FieldValue.serverTimestamp(),
          });
        },
        async appendAuditLog(entry) {
          fsTx.set(db.collection('audit_logs').doc(entry.id), {
            ...entry,
            createdAt: FieldValue.serverTimestamp(),
          });
        },
        async listAuditLogs(limitCount = 200) {
          const snap = await fsTx.get(
            db.collection('audit_logs').orderBy('createdAt', 'desc').limit(limitCount)
          );
          return snap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }) as AuditLogEntry);
        },
        async exportAllCollections() {
          const names = [
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
            'employees_payroll',
            'leave_requests',
            'attendance',
            'service_cards',
            'audit_logs',
          ];
          const out: Record<string, unknown[]> = {};
          for (const col of names) {
            const snap = await db.collection(col).get();
            out[col] = snap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }));
          }
          return out;
        },
        async restoreAllCollections(snapshot) {
          for (const [col, docs] of Object.entries(snapshot)) {
            if (col === 'audit_logs') continue; // Audit logs are strictly immutable
            if (!Array.isArray(docs)) continue;
            for (const docObj of docs) {
              if (!docObj || typeof docObj !== 'object' || !('id' in docObj)) continue;
              const { id, ...rest } = docObj as { id: string; [k: string]: unknown };
              fsTx.set(db.collection(col).doc(id), rest, { merge: true });
            }
          }
        },
      };

      return fn(txWrapper);
    });
  }
}

async function syncUserCustomClaims(uid: string, role: UserRole, disabled: boolean): Promise<void> {
  if (!adminApp || !adminAuthReady) return;
  try {
    await getAdminAuth(adminApp).setCustomUserClaims(uid, { role, disabled });
  } catch (err) {
    console.warn(`Failed to sync custom claims for uid=${uid}:`, err instanceof Error ? err.message : err);
  }
}

async function createFirebaseAuthUser(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<{ uid: string }> {
  if (!adminApp || !adminAuthReady) {
    throw Object.assign(
      new Error('Server Firebase Admin Auth is unconfigured or lacks IAM permissions to create password accounts directly.'),
      { status: 503, code: 'ADMIN_AUTH_UNCONFIGURED' }
    );
  }
  const auth = getAdminAuth(adminApp);
  try {
    const existing = await auth.getUserByEmail(input.email);
    await auth.updateUser(existing.uid, {
      password: input.password,
      displayName: input.fullName,
      emailVerified: true,
      disabled: false,
    });
    return { uid: existing.uid };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== 'auth/user-not-found') {
      throw err;
    }
    const created = await auth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.fullName,
      emailVerified: true,
      disabled: false,
    });
    return { uid: created.uid };
  }
}

async function deleteFirebaseAuthUser(uid: string): Promise<void> {
  if (!adminApp || !adminAuthReady) {
    throw Object.assign(
      new Error('Server Firebase Admin Auth is unconfigured or lacks IAM permissions to delete Auth users.'),
      { status: 503, code: 'ADMIN_AUTH_UNCONFIGURED' }
    );
  }
  try {
    await getAdminAuth(adminApp).deleteUser(uid);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== 'auth/user-not-found') {
      throw err;
    }
  }
}

async function resetFirebaseAuthPassword(input: {
  uid: string;
  email: string;
  newPassword?: string;
}): Promise<{ resetLink?: string }> {
  if (!adminApp || !adminAuthReady) {
    throw Object.assign(
      new Error('Server Firebase Admin Auth is unconfigured or lacks IAM permissions for server-side password resets.'),
      { status: 503, code: 'ADMIN_AUTH_UNCONFIGURED' }
    );
  }
  const auth = getAdminAuth(adminApp);
  if (input.newPassword) {
    await auth.updateUser(input.uid, { password: input.newPassword });
    await auth.revokeRefreshTokens(input.uid);
    return {};
  }
  const resetLink = await auth.generatePasswordResetLink(input.email);
  return { resetLink };
}

async function startServer(): Promise<void> {
  await adminProbePromise;
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  const store = new FirestoreAdminDataStore();
  app.use(
    '/api',
    createApiRouter({
      verifyToken: verifyFirebaseIdToken,
      store,
      syncCustomClaims: syncUserCustomClaims,
      createAuthUser: createFirebaseAuthUser,
      deleteAuthUser: deleteFirebaseAuthUser,
      resetAuthPassword: resetFirebaseAuthPassword,
    })
  );

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`ShowroomOS server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start ShowroomOS server:', err);
  process.exit(1);
});
