# ShowroomOS — Production Deployment & Future Domain Cutover Guide

Use this guide when deploying ShowroomOS to a client hosting environment and binding the final client domain (such as Cloud Run, a Linux VM with Node.js + Nginx, or another container host).

---

## 1. Architecture Summary

- **Single-Origin Runtime:** Express (`server.ts`) serves both the `/api/*` backend routes and the compiled React SPA (`dist/`) on the same origin and port (`PORT`, default `3000`).
- **No Hardcoded Client Domain:** Neither `src/` nor `server.ts` hardcodes any hosting or preview domain. Same-origin `/api/*` requests work automatically behind any future domain once Firebase Authorized Domains and HTTPS are configured.
- **Persistent State:** All business records live in Cloud Firestore (`ai-studio-showroomosdealer-b79aa1c8-25ec-4df7-91d6-05becba07015` in project `cybernetic-stage-bv0ns`), and authentication runs through Firebase Authentication.

---

## 2. Production Build & Start Commands

On the build host or inside a container image:

```bash
# 1. Install dependencies cleanly
npm install

# 2. Verify TypeScript types & Firestore security rules
npm run lint
npm run lint:rules

# 3. Build static frontend into dist/
npm run build

# 4. Run Express production server (Node.js 22.18+ required)
NODE_ENV=production npm start
```

Health check endpoint for load balancers / Cloud Run readiness probes:
- `GET /api/health` → returns `200 OK` JSON with `{ ok: true, adminStoreConfigured: true|false, ... }`.

---

## 3. Production Environment Variables

Configure these via your host's secret manager / environment panel (never commit secrets into the image or git):

| Variable | Required? | Purpose |
|---|---|---|
| `NODE_ENV` | **Required** | Must be `"production"` so `server.ts` serves static `dist/` instead of Vite dev middleware. |
| `PORT` | Optional | Listening port injected by the host (defaults to `3000`). |
| `FIREBASE_PROJECT_ID` | Optional | Firebase project ID (falls back to `firebase-applet-config.json` if omitted). |
| `FIREBASE_DATABASE_ID` | Optional | Named Firestore database ID (falls back to `firebase-applet-config.json` if omitted). |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Optional *(Alternative Secret)* | Full GCP Service Account JSON injected via Secret Manager **only** if the runtime's Application Default Credentials (ADC) do not hold IAM permissions on `cybernetic-stage-bv0ns`. |
| `GOOGLE_APPLICATION_CREDENTIALS` | Optional *(VM/File Fallback)* | File path to Service Account JSON on a non-GCP host where ADC is unavailable (never set alongside `FIREBASE_SERVICE_ACCOUNT_JSON`). |
| `BOOTSTRAP_OWNER_EMAIL` | Optional | Verified email permitted to bootstrap the first `admin` profile if not yet provisioned via CLI. |
| `APP_URL` | Optional | Target HTTPS URL (`https://showroom.client-domain.example`) for deployment records/external integrations. |

---

## 4. Reference Cloud Run Deployment (Once Client Project / Host Is Ready)

- **Same-project Cloud Run (ADC native, zero JSON key needed):** Attach a service account to Cloud Run with `roles/datastore.user` and `roles/firebaseauth.admin` on `cybernetic-stage-bv0ns`; `server.ts` uses `applicationDefault()` automatically.
- **Cross-project Cloud Run (e.g., hosting in a separate GCP project from Firebase):** Inject `FIREBASE_SERVICE_ACCOUNT_JSON` from Secret Manager:

```bash
gcloud run deploy showroomos \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,FIREBASE_PROJECT_ID=cybernetic-stage-bv0ns,FIREBASE_DATABASE_ID=ai-studio-showroomosdealer-b79aa1c8-25ec-4df7-91d6-05becba07015" \
  --set-secrets "FIREBASE_SERVICE_ACCOUNT_JSON=showroomos-firebase-sa:latest"
```

*Note:* If deploying behind Nginx or Caddy on a VPS, terminate TLS/HTTPS at the reverse proxy and forward traffic to `http://127.0.0.1:3000`.

---

## 5. Client Domain & OAuth Cutover Checklist (When Domain Is Chosen)

Complete these steps as soon as the client's final domain is provisioned:

1. **HTTPS & DNS:**
   - Point the client's DNS (`A`/`AAAA`/`CNAME`) to the hosting service / Cloud Run custom domain mapping and verify valid TLS (`https://`).
2. **Firebase Authentication Authorized Domains:**
   - Open Firebase Console (`https://console.firebase.google.com/project/cybernetic-stage-bv0ns`) → **Authentication → Settings → Authorized domains**.
   - Add the exact production domain (e.g., `showroom.clientdomain.lk`).
   - Remove temporary preview hostnames once handoff is complete.
3. **Google OAuth Consent Screen & Client Origins:**
   - In Google Cloud Console → **APIs & Services → OAuth consent screen**, set the client's production app name, logo, support email, and authorized domain.
   - Under **Credentials → OAuth 2.0 Client IDs**, verify the web client used by Firebase allows your production domain's origin.
4. **Deploy Rules & Indexes** *(if migrating to a new Firebase project, update `firebase-applet-config.json` first)*:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes --project <PROJECT_ID>
   ```
5. **Provision Initial Client Admin & Verify Isolation:**
   ```bash
   npx tsx scripts/provision-admin.ts \
     --email "admin@clientdomain.lk" \
     --name "Client IT Admin" \
     --role admin \
     --branch "Colombo Flagship Hub"
   ```
   - Smoke-test on the live HTTPS domain: Google/Email sign-in, uninvited-account rejection, Sales vs HR vs Finance RBAC boundaries, booking allocation, payment verification, delivery handover, and `/api/health` returning `adminStoreConfigured: true`.

---

## 6. Backup, Restore & Rollback

- **Create JSON Snapshot (Admin UI or CLI):**
  ```bash
  npx tsx scripts/backup-restore.ts --backup ./backups/showroom-$(date +%Y%m%d).json
  ```
- **Restore JSON Snapshot:**
  ```bash
  npx tsx scripts/backup-restore.ts --restore ./backups/showroom-YYYYMMDD.json
  ```
- **Cloud Run Revision Rollback:**
  ```bash
  gcloud run services update-traffic showroomos --region asia-south1 --to-revisions PREVIOUS_REVISION=100
  ```
