# ShowroomOS — Local Setup Guide (macOS + Google Cloud ADC)

> **Important:** Running ShowroomOS locally is **not** a standalone offline system. Both the browser client and the Express server connect directly to live Cloud Firebase Authentication and Cloud Firestore.
>
> **Note on Sandbox vs. Local Verification:** Live Firebase Admin SDK operations and interactive browser login were **not** executed end-to-end inside the AI Studio sandbox (whose runtime service account lacks IAM access to `cybernetic-stage-bv0ns`). Verify `/api/health` (`"storeConfigured": true`) and interactive login locally on your Mac after completing the ADC and Firebase Console steps below.

---

## 1. Pre-Configured Firebase Targets

`firebase-applet-config.json` already configures the app for:
- **Firebase Project ID:** `cybernetic-stage-bv0ns`
- **Named Firestore Database ID:** `ai-studio-showroomosdealer-b79aa1c8-25ec-4df7-91d6-05becba07015`
- **Firebase Auth Domain:** `cybernetic-stage-bv0ns.firebaseapp.com`

`server.ts`, `src/firebase.ts`, `scripts/provision-admin.ts`, and `scripts/backup-restore.ts` read these values directly from `firebase-applet-config.json`. You do **not** need a `.env` file, `GOOGLE_APPLICATION_CREDENTIALS`, or a JSON private key file for the local ADC path.

---

## 2. Required Software on macOS

1. **Node.js `>= 22.18.0` LTS** *(tested on `v22.23.2`; required for native TypeScript execution in `npm start`)*:
   ```bash
   brew install node@22
   node -v
   npm -v
   ```
2. **Google Cloud CLI (`gcloud`)** *(for Application Default Credentials without downloading private key files)*:
   ```bash
   brew install --cask google-cloud-sdk
   gcloud --version
   ```

---

## 3. Configure ADC for `cybernetic-stage-bv0ns` (No JSON Key Required)

Sign in with your authorized Google account that holds IAM permissions on `cybernetic-stage-bv0ns` (minimum roles: **`roles/datastore.user`** for Firestore and **`roles/firebaseauth.admin`** for Auth token revocation & staff lookup, or Project Owner/Editor):

```bash
# 1. Authenticate gcloud CLI and select the Firebase project
gcloud auth login
gcloud config set project cybernetic-stage-bv0ns

# 2. Generate local Application Default Credentials (ADC) and bind the quota project
gcloud auth application-default login
gcloud auth application-default set-quota-project cybernetic-stage-bv0ns

# 3. Ensure required GCP APIs are enabled on the project
gcloud services enable firestore.googleapis.com identitytoolkit.googleapis.com --project cybernetic-stage-bv0ns
```

Do **not** set `GOOGLE_APPLICATION_CREDENTIALS` when using `gcloud auth application-default login`.

---

## 4. Exact Project Commands (`package.json`)

After downloading and extracting the source ZIP, `cd` into the project directory and run:

```bash
# 1. Install npm dependencies
npm install

# 2. Start full application (Express backend + Vite frontend on http://localhost:3000)
npm run dev
```

Open **`http://localhost:3000`** in your browser, and check **`http://localhost:3000/api/health`** to confirm `"storeConfigured": true`.

Additional exact scripts from `package.json`:

```bash
# Type-check TypeScript (client, server, scripts, tests)
npm run lint

# Lint Firestore security rules
npm run lint:rules

# Build production SPA bundle into dist/
npm run build

# Start production server (serves dist/ + /api/* on http://localhost:3000)
NODE_ENV=production npm start
```

---

## 5. Remaining Firebase Console Setup

Open the Firebase Console for `cybernetic-stage-bv0ns`:
`https://console.firebase.google.com/project/cybernetic-stage-bv0ns`

1. **Authorized Domains (Required for local sign-in):**
   - Go to **Authentication → Settings → Authorized domains**.
   - Ensure **`localhost`** (and **`127.0.0.1`** if used) is listed so popup authentication succeeds.
2. **Sign-In Providers:**
   - Go to **Authentication → Sign-in method**.
   - **Google:** Confirm it is **Enabled** with a project support email selected.
   - **Email/Password:** Manually toggle **Enabled** if staff will sign in with email/password or use password reset.
3. **Security Rules & Indexes:**
   - `firestore.rules` has been deployed to `cybernetic-stage-bv0ns`. If you change rules or composite indexes (`firestore.indexes.json`), deploy with Firebase CLI:
     ```bash
     firebase deploy --only firestore:rules,firestore:indexes --project cybernetic-stage-bv0ns
     ```

---

## 6. Secure First-Admin Provisioning & Staff Invites

ShowroomOS has **no** public self-registration and **no** public admin-bootstrap HTTP endpoint.

### First Admin Setup (Choose One Verified Path)
- **Option A — Out-of-Band CLI Provisioning (via your local ADC):**
  ```bash
  npx tsx scripts/provision-admin.ts \
    --email "owner@dealership.example" \
    --name "Dealership Owner" \
    --role admin \
    --branch "Colombo Flagship Hub"
  ```
  - If the user has not signed in yet, this creates a `Pending` invite in `staff_invites`; signing in once via Google or verified Email/Password activates the `admin` role automatically.
  - If the user already exists in Firebase Auth, it immediately writes their active `admin` profile to `/users/{uid}`, `/staff_directory/{uid}`, and `/audit_logs`.
- **Option B — Configured Bootstrap Owner Email:**
  Sign in at `http://localhost:3000` with the verified email configured as `BOOTSTRAP_OWNER_EMAIL` (`shewonshezy12@gmail.com`).

### Inviting Additional Staff
1. Sign in as an active **Admin** (`admin` role).
2. Open **Access & Audit Logs** in the sidebar.
3. Issue a staff invite with the staff member's exact corporate email and approved role (`general_manager`, `sales`, `finance`, `hr`, `service`, or `stock`).
4. On first sign-in with that verified email, the user activates strictly under the invited role.

---

## 7. Troubleshooting (Permissions, Quota-Project & Auth API Errors)

| Symptom / Error | Likely Cause | Fix |
|---|---|---|
| `/api/health` shows `"storeConfigured": false` with `PERMISSION_DENIED` | Local ADC account is signed into the wrong Google identity or lacks Firestore IAM on `cybernetic-stage-bv0ns`. | Run `gcloud auth application-default login` with an account holding `roles/datastore.user` and `roles/firebaseauth.admin` on `cybernetic-stage-bv0ns`, then restart `npm run dev`. |
| `Quota project ... not found` or `Caller does not have permission to use project` / `CONSUMER_INVALID` | ADC quota project is missing or still pointing to a different GCP project. | Run `gcloud auth application-default set-quota-project cybernetic-stage-bv0ns`. If using a Google account without `serviceusage.services.use` on `cybernetic-stage-bv0ns`, grant **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`). |
| `auth/internal-error` mentioning `identitytoolkit.googleapis.com` or `auth/insufficient-permission` | Identity Toolkit API is not enabled or your ADC identity lacks Firebase Auth Admin IAM on `cybernetic-stage-bv0ns`. | Enable `identitytoolkit.googleapis.com` and verify your Google account has `roles/firebaseauth.admin` on `cybernetic-stage-bv0ns`. |
| `Could not load the default credentials` | `gcloud auth application-default login` has not been run yet (or `GOOGLE_APPLICATION_CREDENTIALS` points to a non-existent path). | Unset any stale `GOOGLE_APPLICATION_CREDENTIALS` shell variable (`unset GOOGLE_APPLICATION_CREDENTIALS`) and run `gcloud auth application-default login`. |
| `Firebase: Error (auth/unauthorized-domain)` | `localhost` is missing from Firebase Console Authorized Domains. | Add `localhost` in Firebase Console → **Authentication → Settings → Authorized domains**. |
| `Firebase: Error (auth/operation-not-allowed)` | Email/Password sign-in provider is not enabled in Firebase Console. | Use **Google Sign-In**, or toggle **Email/Password** on in Firebase Console → **Authentication → Sign-in method**. |
| `EADDRINUSE: address already in use :::3000` | Another local process is using port `3000`. | Stop the conflicting process or start with `PORT=3001 npm run dev`. |
| `SyntaxError` / `.ts` extension error on `npm start` | Node.js is older than `v22.18.0`. | Upgrade to Node.js `22.18+` LTS (`node -v`). |
| `Quota exceeded` from Firestore | Free-tier Spark daily read/write quota reached. | Wait for the daily reset or inspect usage in Firebase Console → **Firestore → Usage**. |
