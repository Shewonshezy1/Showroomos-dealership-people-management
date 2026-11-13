/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Trusted Server-Side Owner (super_admin) & Staff Provisioning Script
 *
 * Usage (Owner / super_admin):
 *   npx tsx scripts/provision-admin.ts \
 *     --email "Shewonshezy12@gmail.com" \
 *     --name "Super Administrator / Owner" \
 *     --role super_admin \
 *     --branch "Colombo Flagship Hub"
 *
 * Security:
 * - Runs strictly out-of-band via trusted Admin SDK credentials (ADC, FIREBASE_SERVICE_ACCOUNT_JSON, or GOOGLE_APPLICATION_CREDENTIALS).
 * - Never creates a public HTTP bootstrap endpoint or default password.
 * - Resolves the existing Firebase Auth UID by email and verifies `emailVerified === true` before granting privileges.
 * - Sets authoritative Firebase Auth custom claims `{ role, disabled: false }` AND atomically updates `/users/{uid}`, `/staff_directory/{uid}`, and `/audit_logs`.
 * - Prevents accidental removal/demotion of the last active `super_admin`.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { UserRole } from '../src/types/index.ts';

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
      out[key] = val;
      if (val !== 'true') i += 1;
    }
  }
  return out;
}

const VALID_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'general_manager',
  'sales',
  'finance',
  'hr',
  'service',
  'stock',
];

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const email = (args.email || '').trim().toLowerCase();
  const role = (args.role || 'admin') as UserRole;

  if (!email || !email.includes('@')) {
    console.error('Error: --email <staff-email> is required.');
    process.exit(1);
  }
  if (!VALID_ROLES.includes(role)) {
    console.error(`Error: --role must be one of: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  const defaultName = role === 'super_admin' ? 'Super Administrator / Owner' : 'System Administrator';
  const defaultDesignation =
    role === 'super_admin' ? 'Super Administrator / Owner' : `${role.toUpperCase()} Officer`;
  const defaultDept = role === 'super_admin' ? 'Executive & Ownership' : 'Showroom Management';

  const fullName = (args.name || defaultName).trim();
  const designation = (args.designation || defaultDesignation).trim();
  const department = (args.department || defaultDept).trim();
  const branch = (args.branch || 'Colombo Flagship Hub').trim();

  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const config = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    : {};

  const projectId: string = process.env.FIREBASE_PROJECT_ID || config.projectId || '';
  const databaseId: string = process.env.FIREBASE_DATABASE_ID || config.firestoreDatabaseId || '(default)';

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  const app = saJson
    ? initializeApp({ credential: cert(JSON.parse(saJson)), projectId: projectId || undefined })
    : initializeApp({ credential: applicationDefault(), projectId: projectId || undefined });

  const auth = getAuth(app);
  const db = databaseId && databaseId !== '(default)' ? getFirestore(app, databaseId) : getFirestore(app);

  let authUser;
  try {
    authUser = await auth.getUserByEmail(email);
    console.log(`Resolved Firebase Auth user: email=${email}, uid=${authUser.uid}, emailVerified=${authUser.emailVerified}`);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== 'auth/user-not-found') {
      console.error(
        `Firebase Auth lookup failed (${code || 'UNKNOWN_ERROR'}). Verify your ADC / service account IAM permissions (roles/firebaseauth.admin & roles/datastore.user) and quota project for "${projectId}".`
      );
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
    if (role === 'super_admin') {
      console.error(
        `Error: No existing Firebase Auth account found for ${email}. ` +
          `super_admin must be granted strictly to an existing verified Firebase Auth UID (never auto-created with a default password or pending invite).`
      );
      process.exit(1);
    }
    // Non-owner roles may be pre-staged as an authoritative Pending staff_invite
    await db.collection('staff_invites').doc(email).set(
      {
        id: email,
        email,
        fullName,
        role,
        designation,
        department,
        branch,
        status: 'Pending',
        invitedByUid: 'cli-provisioning-script',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(
      `Firebase Auth account not created yet for ${email}. Created authoritative Pending invite with role="${role}".`
    );
    process.exit(0);
  }

  if (!authUser.emailVerified) {
    console.error(
      `Refusing to grant role="${role}" to ${email} (uid=${authUser.uid}): Firebase Auth account email is NOT verified (emailVerified=false).`
    );
    process.exit(1);
  }

  if (authUser.disabled) {
    console.error(
      `Refusing to provision ${email} (uid=${authUser.uid}): account is disabled in Firebase Authentication.`
    );
    process.exit(1);
  }

  // Prevent demoting the last active super_admin via CLI accidentally
  if (role !== 'super_admin') {
    const existingTarget = await db.collection('users').doc(authUser.uid).get();
    if (existingTarget.exists && existingTarget.data()?.role === 'super_admin' && !existingTarget.data()?.disabled) {
      const activeOwners = await db
        .collection('users')
        .where('role', '==', 'super_admin')
        .where('disabled', '==', false)
        .get();
      if (activeOwners.size <= 1) {
        console.error(
          `Refusing to demote ${email} (uid=${authUser.uid}) to "${role}": they are the last active Super Administrator / Owner.`
        );
        process.exit(1);
      }
    }
  }

  // 1. Set authoritative Firebase Auth Custom Claims
  await auth.setCustomUserClaims(authUser.uid, {
    role,
    disabled: false,
  });

  // 2. Atomically write Firestore user profile, staff directory, and immutable audit log
  await db.runTransaction(async tx => {
    const userRef = db.collection('users').doc(authUser.uid);
    const existingSnap = await tx.get(userRef);
    tx.set(
      userRef,
      {
        uid: authUser.uid,
        email,
        fullName,
        role,
        designation,
        department,
        branch,
        disabled: false,
        invitedBy: 'cli-provisioning-script',
        updatedAt: FieldValue.serverTimestamp(),
        ...(existingSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true }
    );

    tx.set(
      db.collection('staff_directory').doc(authUser.uid),
      {
        uid: authUser.uid,
        fullName,
        role,
        designation,
        department,
        active: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(db.collection('audit_logs').doc(`aud-prov-${Date.now()}`), {
      actorUid: 'cli-provisioning-script',
      actorEmail: 'system-cli',
      actorRole: role === 'super_admin' ? 'super_admin' : 'admin',
      action: role === 'super_admin' ? 'OWNER_SUPER_ADMIN_PROVISIONED' : 'STAFF_PROVISIONED_CLI',
      collection: 'users',
      recordId: authUser.uid,
      changes: { email, role, branch, customClaimsSynced: true },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  console.log(
    `Successfully provisioned ${email} (uid=${authUser.uid}) with role="${role}" and synced Firebase Auth custom claims.`
  );
  console.log('IMPORTANT: The user must sign out and sign back in to refresh their Firebase ID token claims.');
}

main().catch(err => {
  console.error('Provisioning failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
