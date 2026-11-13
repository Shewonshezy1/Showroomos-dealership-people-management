/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Trusted Server-Side First-Admin & Staff Provisioning Script
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_JSON='...' npx tsx scripts/provision-admin.ts \
 *     --email owner@dealership.lk --name "Dealership Owner" --role admin
 *
 * Or using GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *
 * Security:
 * - Runs strictly out-of-band via trusted Admin SDK credentials (no public HTTP bootstrap endpoint).
 * - Resolves existing Firebase Auth user by email (or creates/invites cleanly if missing).
 * - Writes authoritative role document in `/users/{uid}`, `/staff_directory/{uid}`,
 *   and an immutable entry in `/audit_logs`.
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
  const fullName = (args.name || 'System Administrator').trim();
  const role = (args.role || 'admin') as UserRole;
  const designation = (args.designation || `${role.toUpperCase()} Officer`).trim();
  const department = (args.department || 'Showroom Management').trim();
  const branch = (args.branch || 'Colombo Flagship Hub').trim();

  if (!email || !email.includes('@')) {
    console.error('Error: --email <staff-email> is required.');
    process.exit(1);
  }
  if (!VALID_ROLES.includes(role)) {
    console.error(`Error: --role must be one of: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

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
    console.log(`Found existing Firebase Auth user: uid=${authUser.uid}`);
  } catch {
    // User has not signed in via Google/Email yet — write authoritative pending invite
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
      `Firebase Auth account not created yet for ${email}. Created authoritative Pending invite with role="${role}". Staff member may now sign in once to activate.`
    );
    process.exit(0);
  }

  // Provision active user profile & public directory entry atomically
  await db.runTransaction(async tx => {
    tx.set(
      db.collection('users').doc(authUser.uid),
      {
        id: authUser.uid,
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
        createdAt: FieldValue.serverTimestamp(),
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
      actorRole: 'admin',
      action: 'STAFF_PROVISIONED_CLI',
      collection: 'users',
      recordId: authUser.uid,
      changes: { email, role, branch },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  console.log(`Provisioned active user ${email} (uid=${authUser.uid}) with role="${role}".`);
}

main().catch(err => {
  console.error('Provisioning failed:', err);
  process.exit(1);
});
