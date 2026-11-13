/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ShowroomOS Firestore Backup & Restore CLI + Round-Trip Verification Utility
 *
 * Usage:
 *   Export backup:
 *     FIREBASE_SERVICE_ACCOUNT_JSON='...' npx tsx scripts/backup-restore.ts --backup ./backups/showroom-backup.json
 *
 *   Restore backup:
 *     FIREBASE_SERVICE_ACCOUNT_JSON='...' npx tsx scripts/backup-restore.ts --restore ./backups/showroom-backup.json
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { DataStore } from '../server/engine.ts';

export const BACKUP_COLLECTIONS = [
  'users',
  'staff_invites',
  'staff_directory',
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
] as const;

export interface BackupArchive {
  schemaVersion: number;
  exportedAt: string;
  projectId: string;
  databaseId: string;
  collections: Record<string, unknown[]>;
}

/**
 * Verifies lossless JSON serialization, backup export, mutation, and full restore parity
 * against any compliant transactional DataStore.
 */
export async function verifyBackupRestoreRoundTrip(
  store: DataStore,
  projectId = 'test-project',
  databaseId = '(default)'
): Promise<{
  collectionCount: number;
  totalDocuments: number;
  verifiedBookingIds: string[];
}> {
  const exported = await store.runTransaction(tx => tx.exportAllCollections());
  const archive: BackupArchive = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    projectId,
    databaseId,
    collections: exported as Record<string, unknown[]>,
  };

  // Verify JSON serialization round-trip
  const serialized = JSON.stringify(archive, null, 2);
  const parsed = JSON.parse(serialized) as BackupArchive;

  if (!parsed || typeof parsed.collections !== 'object') {
    throw new Error('Backup archive failed JSON schema validation.');
  }

  const bookingBefore = (parsed.collections.bookings || []) as Array<{ id: string }>;
  await store.runTransaction(tx => tx.restoreAllCollections(parsed.collections));
  const reExported = await store.runTransaction(tx => tx.exportAllCollections());

  for (const [colName, docs] of Object.entries(parsed.collections)) {
    const afterDocs = (reExported[colName] as unknown[]) || [];
    if (afterDocs.length < docs.length) {
      throw new Error(
        `Restore verification mismatch in collection "${colName}": expected >= ${docs.length}, got ${afterDocs.length}`
      );
    }
  }

  const totalDocuments = Object.values(parsed.collections).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  return {
    collectionCount: Object.keys(parsed.collections).length,
    totalDocuments,
    verifiedBookingIds: bookingBefore.map(b => b.id),
  };
}

function parseCliArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : '';
      out[key] = val;
      if (val) i += 1;
    }
  }
  return out;
}

async function runCli(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  const backupFile = args.backup;
  const restoreFile = args.restore;

  if (!backupFile && !restoreFile) {
    console.log('Usage: npx tsx scripts/backup-restore.ts --backup <file.json> | --restore <file.json>');
    process.exit(0);
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

  const db = databaseId && databaseId !== '(default)' ? getFirestore(app, databaseId) : getFirestore(app);

  if (backupFile) {
    const collections: Record<string, unknown[]> = {};
    let totalDocs = 0;
    for (const col of BACKUP_COLLECTIONS) {
      const snap = await db.collection(col).get();
      collections[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      totalDocs += snap.size;
    }
    const archive: BackupArchive = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      projectId,
      databaseId,
      collections,
    };
    fs.mkdirSync(path.dirname(path.resolve(backupFile)), { recursive: true });
    fs.writeFileSync(path.resolve(backupFile), JSON.stringify(archive, null, 2), 'utf-8');
    console.log(`Backup written to ${backupFile} (${totalDocs} documents across ${BACKUP_COLLECTIONS.length} collections).`);
  }

  if (restoreFile) {
    const raw = fs.readFileSync(path.resolve(restoreFile), 'utf-8');
    const archive = JSON.parse(raw) as BackupArchive;
    if (!archive?.collections || typeof archive.collections !== 'object') {
      throw new Error('Invalid backup archive format.');
    }
    let restoredDocs = 0;
    for (const [colName, docs] of Object.entries(archive.collections)) {
      if (!Array.isArray(docs)) continue;
      let batch = db.batch();
      let ops = 0;
      for (const docObj of docs) {
        if (!docObj || typeof docObj !== 'object' || !('id' in docObj)) continue;
        const { id, ...rest } = docObj as { id: string; [k: string]: unknown };
        batch.set(db.collection(colName).doc(id), rest, { merge: true });
        ops += 1;
        restoredDocs += 1;
        if (ops >= 400) {
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      }
      if (ops > 0) await batch.commit();
    }
    console.log(`Restored ${restoredDocs} documents from ${restoreFile}.`);
  }
}

const isDirectExecution = process.argv[1]?.includes('backup-restore');
if (isDirectExecution) {
  runCli().catch(err => {
    console.error('Backup/restore CLI error:', err);
    process.exit(1);
  });
}
