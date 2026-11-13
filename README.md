# ShowroomOS — Dealership & People Management

Release-prepared web application for dealership sales, motorcycle allocation, financial verification, pre-delivery inspection, service job cards, and HR management (Royal Enfield / Ideal Nova Motors Sri Lanka).

---

## 1. Architecture & Data Persistence

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4.
- **Backend API:** Express (`server.ts` + `server/engine.ts`) serving Vite in development (`npm run dev`) and static `dist/` in production.
- **Authentication:** Firebase Authentication (Google Sign-In and Email/Password with password reset). No quick-select user cards, no role switcher, and no public self-registration.
- **Database:** Cloud Firestore (`ai-studio-showroomosdealer-b79aa1c8-25ec-4df7-91d6-05becba07015` in project `cybernetic-stage-bv0ns`). Business records (leads, bikes, bookings, payments, accessories, trade-ins, employees, payroll, leave requests, service job cards, audit logs) are persisted in Firestore — **not** `localStorage`.
- **Atomic Integrity & Idempotency:** Multi-step financial and stock transitions execute inside Firestore `runTransaction` with `idempotency_keys` deduplication and append-only `audit_logs`.

---

## 2. Local Setup, Build & Deployment

- **macOS Local Run Guide:** See [`LOCAL_SETUP.md`](./LOCAL_SETUP.md) for step-by-step installation, `http://localhost:3000` setup, Firebase Authorized Domains, and troubleshooting.
- **Production & Future Client Domain Cutover:** See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for hosting, HTTPS, Secret Manager, and OAuth domain cutover steps.

### Prerequisites
- **Node.js `>= 22.18.0` LTS** (tested on `v22.23.2`)
- Internet connectivity to Firebase project `cybernetic-stage-bv0ns` (Firestore database `ai-studio-showroomosdealer-b79aa1c8-25ec-4df7-91d6-05becba07015`) with `firestore.rules` deployed.

### Environment Variables
Copy `.env.example` to `.env` and populate values (never commit `.env` or service account keys):

```bash
cp .env.example .env
```

See `.env.example` for clearly separated Public Frontend Configuration (`firebase-applet-config.json`), Server Runtime variables (`PORT`, `NODE_ENV`, `FIREBASE_PROJECT_ID`, `FIREBASE_DATABASE_ID`), and **one** private Admin SDK credential method (`GOOGLE_APPLICATION_CREDENTIALS` locally or `FIREBASE_SERVICE_ACCOUNT_JSON` in Cloud containers).

### Commands (from `package.json`)

```bash
# Install dependencies
npm install

# Run full application locally (Express backend + Vite frontend on http://localhost:3000)
npm run dev

# Type-check & lint Firestore security rules
npm run lint
npm run lint:rules

# Build production bundle (dist/)
npm run build

# Start production server (serves dist/ + /api/* on port 3000)
NODE_ENV=production npm start
```

---

## 3. Manual Firebase Console Setup Prerequisites

Before live staff members can sign in across browsers/devices, an operator with access to the Firebase Console (`cybernetic-stage-bv0ns`) must complete:

1. **Enable Sign-In Providers** (*Authentication → Sign-in method*):
   - Enable **Google** provider and confirm support email is set.
   - Enable **Email/Password** provider (to allow staff password sign-in and password reset emails).
2. **Configure Authorized Domains** (*Authentication → Settings → Authorized domains*):
   - Add your exact AI Studio preview hostname, `localhost`, and final production Cloud Run / custom domain so `signInWithPopup` is permitted.
3. **Provision Server-Side Admin SDK Credentials**:
   - Generate a service account key (role: *Cloud Datastore User* + *Firebase Authentication Admin*) in GCP IAM and inject it via Secret Manager / `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`.
   - Without Admin SDK credentials on the server, cryptographic ID token verification still operates for read/auth inspection, while `/api/operations/*`, `/api/admin/*`, and `/api/backup/*` return `503 ADMIN_STORE_UNCONFIGURED` rather than trusting unverified browser writes.

---

## 4. Secure Owner & Admin Provisioning (Out-of-Band Only)

There is **no** public HTTP endpoint and **no** login-time email self-elevation for owner or admin accounts.

Use the trusted out-of-band CLI script (`scripts/provision-admin.ts`):

```bash
# Provision the verified Owner (super_admin) after they exist in Firebase Auth with verified email:
npx tsx scripts/provision-admin.ts \
  --email "Shewonshezy12@gmail.com" \
  --name "Super Administrator / Owner" \
  --role super_admin \
  --branch "Colombo Flagship Hub"
```

This script sets Firebase Auth custom claims (`{ role: 'super_admin', disabled: false }`), writes `/users/{uid}` and `/staff_directory/{uid}`, and records an immutable entry in `/audit_logs`. The owner must sign out and sign back in if already logged in so Firebase refreshes their ID token custom claims.

Once active:
- Open **Access & Audit Logs** in the sidebar.
- Create invitations (`staff_invites`) with exact email and role (`admin`, `general_manager`, `sales`, `finance`, `hr`, `service`, `stock`) for subsequent staff.
- Restricted `admin` cannot invite `super_admin`, assign `super_admin`, modify/disable a `super_admin`, read payroll, or restore backups.

---

## 5. Role-Based Permission Matrix & Separation of Duties

Eight canonical roles are enforced in the UI (`src/auth/permissions.ts`), Express API (`server/engine.ts`), and Firestore Rules (`firestore.rules`):

| Capability / Module | `super_admin` | `admin` *(Restricted)* | `general_manager` | `sales` | `finance` | `hr` | `service` | `stock` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Invites, Role Assignment & Disable Users | **Yes (All)** | Non-Owner Only | — | — | — | — | — | — |
| Audit Logs View (Immutable) | **Yes** | Yes | Yes | — | Yes | — | — | — |
| Database Backup Export / Restore | **Export + Restore** | Export Only *(No Payroll)* | — | — | — | — | — | — |
| Application Settings Management | **Yes** | — | — | — | — | — | — | — |
| Executive Dashboard & Overview | **Yes** | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Sales CRM Leads (Read / Write) | **Yes** | — | Yes | Yes | — | — | — | — |
| Test Rides & Feedback (Read / Write) | **Yes** | — | Yes | Yes | — | — | Yes | — |
| Motorcycle Inventory (Read / Write) | **R/W** | — | R/W | R | R | — | R | R/W |
| Accessories Catalog (Read / Write) | **R/W** | — | R/W | R | R | — | R | R/W |
| Bookings Create / Cancel / Attach Accessories | **Yes** | — | Yes | Yes | Cancel Only | — | — | Attach Only |
| Discount Request | **Yes** | — | Yes | Yes | — | — | — | — |
| **Discount Approval / Rejection** | **Yes** | **Blocked** | **Yes** | **Blocked** | **Yes** | — | — | — |
| Record Unverified Payment Receipt | **Yes** | — | — | Yes | Yes | — | — | — |
| **Verify Payment / Reverse Payment Ledger** | **Yes** | **Blocked** | **Blocked** | **Blocked** | **Yes** | **Blocked** | **Blocked** | **Blocked** |
| Trade-In Valuation Estimate | **Yes** | — | Yes | Yes | — | — | — | — |
| **Trade-In Approval & Credit Application** | **Yes** | **Blocked** | **Yes** | **Blocked** | **Yes** | **Blocked** | **Blocked** | **Blocked** |
| Pre-Delivery Inspection (PDI) & Handover | **Yes** | — | Yes | Read Only | Read Only | — | **Yes** | Read Only |
| Service Job Cards | **Yes** | — | Yes | — | — | — | Yes | Read Only |
| HR Directory & Leave Requests | **Yes** | — | Read + Approve | — | — | Yes | — | — |
| **Employee Payroll & Salary Records** | **Yes** | **Blocked** | **Blocked** | **Blocked** | **Blocked** | **Yes** | **Blocked** | **Blocked** |

Key Separation-of-Duties & Integrity controls:
- `super_admin` holds full business and governance permissions across all modules while still respecting every integrity rule (1:1 bike allocation, payment idempotency, overpayment checks, delivery handover gates, immutable financial/audit logs, and last-active-owner protection).
- Restricted `admin` governs non-owner staff identity lifecycle, invites, audit logs, and non-payroll exports — **cannot** access CRM, bookings, inventory, payroll, backup restore, or modify `super_admin` accounts.
- `sales` **cannot** verify payments, reverse receipts, approve their own discounts, approve trade-in credits, read payroll, or assign roles.
- `employees_payroll` is isolated exclusively to `super_admin` and `hr` in `firestore.rules`, `/api/operations/payroll`, and `/api/backup/export`.

---

## 6. Firestore Collections, Rules & Indexes

Defined in `firebase-blueprint.json`, `firestore.rules`, and `firestore.indexes.json`:
- **Identity & Governance:** `users`, `staff_invites`, `staff_directory`, `idempotency_keys`, `audit_logs` (immutable create-only logs)
- **Commercial Operations:** `leads`, `bikes`, `bookings`, `payments` (create + immutable reversals; no deletes), `accessories`, `test_rides`, `trade_ins`, `service_cards`
- **HR & Isolated Payroll:** `employees`, `employees_payroll` (strictly HR-only), `leave_requests`, `attendance`

Rules validation: `eslint firestore.rules` via `@firebase/eslint-plugin-security-rules` (deployed live via `DeployRules` during Firebase setup).

---

## 7. Executed Release Test Report

All tests listed below were actually executed after the final code changes:

| Check | Command | Outcome | Notes |
|---|---|---|---|
| TypeScript Compilation | `npx tsc --noEmit` | **PASS** (0 errors) | Covers client, Express server, scripts, and tests |
| Vite Production Bundle | `npm run build` (`compile_applet`) | **PASS** | Verified production SPA output |
| Firestore Security Rules Lint | `npx eslint firestore.rules` | **PASS** (0 errors) | `@firebase/eslint-plugin-security-rules` |
| Release Security & Transaction Suite | `npx tsx tests/release_security.test.ts` | **PASS (14/14)** | Real HTTP requests against `createApiRouter` with serialized transactional store: 401/403 auth, invite role tampering protection, concurrent 1:1 bike race (201 vs 409), idempotency replay, 7-role negative authz checks (Sales/Admin/GM/HR/Finance/Service), discount workflow, unapproved trade-in block, overpayment guard, immutable payment reversal, cancellation bike+stock restoration, delivery handover gate, audit log creation, and backup/restore round-trip (34 docs) |
| Legacy Business Journey Audit | `npx tsx tests/audit_test.ts` | **PASS (11/11)** | Verified lead creation, booking allocation, duplicate block, deposit verification, HR leave updates, CSV export, cancellation, delivery |
| Commercial Feature Calculations | `npx tsx tests/new_features_test.ts` | **PASS (4/4)** | Verified accessory totals, test ride conversion, trade-in offset, EMI math |

### Not Executed in This Local Container (Requires Live External Environment)
1. **Firebase Firestore Local Emulator Suite:** Not executed locally because Java Runtime (`java`) is not installed in this container (`/usr/local/bin/firebase` requires JVM for emulators).
2. **Live Browser Sign-In against Google OAuth / Email-Password:** Requires operator completion of Firebase Console Authorized Domains + provider toggles and interactive browser sign-in.
3. **Live Server-Side Firestore Admin SDK Writes:** Verified structurally in `server.ts` + `scripts/provision-admin.ts` + `scripts/backup-restore.ts`, and functionally tested via `InMemoryTransactionalStore`; live execution requires setting `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` for `cybernetic-stage-bv0ns`.

---

## 8. Known Limitations & Unresolved Prerequisites

- **Not zero-config ready without Firebase Console setup:** Operators must enable Google/Email providers, register authorized domains, and attach service account credentials (`FIREBASE_SERVICE_ACCOUNT_JSON`) before live production deployment.
- **Simulated Customer Notifications:** WhatsApp and SMS buttons open in-app preview modals (`NotificationSimulatorModal`) for operator copy/dispatch; no live SMS carrier or WhatsApp Business API integration is connected.
- **Illustrative Financing & Payroll Calculations:** Leasing bank rates and payroll deductions are illustrative estimators only; no external banking or Sri Lankan tax filing integration exists.

---

## 9. Backup, Restore & Rollback Procedures

### Export Backup Snapshot
- **Via UI (Admin role):** Open **Access & Audit Logs → Export JSON Backup**.
- **Via CLI:**
```bash
FIREBASE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)" \
npx tsx scripts/backup-restore.ts --backup ./backups/showroom-$(date +%Y%m%d).json
```

### Restore Backup Snapshot
```bash
FIREBASE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)" \
npx tsx scripts/backup-restore.ts --restore ./backups/showroom-YYYYMMDD.json
```
*Round-trip export/parse/restore parity verified in `tests/release_security.test.ts` (Check 14).*

### Code & Deployment Rollback
- **Git Checkpoint:** Pre-release checkpoint was tagged/committed as `checkpoint-pre-release` (`git checkout checkpoint-pre-release` to inspect or revert).
- **Cloud Run Revision Rollback:**
```bash
gcloud run services update-traffic showroomos --region asia-south1 --to-revisions PREVIOUS_REVISION=100
```

---

## 10. Source ZIP Export & Cloud Resources Excluded from Export

Use the built-in **Download / Export Project ZIP** action in the AI Studio toolbar to download a clean source archive containing the frontend, backend (`server.ts`, `server/engine.ts`), `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `firebase-blueprint.json`, `firebase-applet-config.json`, `.env.example`, CLI scripts, test suites, and `README.md`.

The following cloud resources and secrets are **NOT** included inside the exported source ZIP and remain hosted in Firebase / Google Cloud (or must be configured in a target project):
1. **Firebase Authentication User Records & Passwords:** All staff accounts, hashed passwords, Google OAuth links, and active refresh tokens reside in Firebase Authentication (`cybernetic-stage-bv0ns`).
2. **Authentication Provider Toggles & Authorized Domains:** Sign-in method activation (Google, Email/Password) and OAuth authorized hostnames live in Firebase Console project settings.
3. **Cloud Firestore Live Database & Document Contents:** Live collections, documents, `audit_logs`, and `idempotency_keys` in database `ai-studio-showroomosdealer-b79aa1c8-25ec-4df7-91d6-05becba07015` are stored in GCP (export separately via `scripts/backup-restore.ts` or Admin UI).
4. **Deployed Security Rules & Composite Indexes State:** While `firestore.rules` and `firestore.indexes.json` are included as source files, live deployment requires running `firebase deploy --only firestore:rules,firestore:indexes` against your target Firebase project if migrating.
5. **Service Account Private Keys & Runtime Secrets:** `FIREBASE_SERVICE_ACCOUNT_JSON`, `.env`, and Cloud Run Secret Manager bindings are intentionally excluded (`node_modules` and `dist/` build artifacts are also generated separately via `npm install` and `npm run build`).

