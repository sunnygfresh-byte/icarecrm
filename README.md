# iCare Fitness CRM V3.2.1 — Mobile Navigation Edition

Start with [DESIGN_STANDARD.md](DESIGN_STANDARD.md), [V3.2.1_PREVIEW_GUIDE.md](V3.2.1_PREVIEW_GUIDE.md), and [REGRESSION_REPORT.md](REGRESSION_REPORT.md). The formal 8px system applies to new design work. V3.2.1 is an undeployed local candidate. No live changes or production deployment are authorized. Older instructions below are historical and must not supersede the current guide, especially any references to production commits or pre-vault storage.

---

# iCare Fitness CRM V3.1.2 — Cloudinary consent-controlled image storage

**Local release candidate; Preview-only testing requires separate approval.** Start with [V3.1.2_PREVIEW_GUIDE.md](V3.1.2_PREVIEW_GUIDE.md) and [REGRESSION_REPORT.md](REGRESSION_REPORT.md). These supersede older image-upload instructions below. The archived deployment settings and security rule templates must not overwrite your live configuration.

---

# V3.1 release candidate — security and native Excel

Start with [V3.1_UPGRADE.md](V3.1_UPGRADE.md) and [REGRESSION_REPORT.md](REGRESSION_REPORT.md). The sections below are retained V3.0 historical instructions; V3.1 instructions take precedence. Do not deploy until staging verification is complete.

# iCare CRM V2.9 — persistent authentication and live two-way synchronization

**Upgrade:** export full JSON backups on every device with local changes, then close old CRM tabs. Replace only `public/index.html` in your existing GitHub Pages repository and commit to the production branch. Do not overwrite your working `wrangler.toml`, environment variables, Firebase rules or Cloudinary functions. Use the same stable production origin on every device; preview URLs have separate local storage and sign-in sessions. Sign in once per private device using the same authorized coach account and select Keep me signed in. The option is selected by default; uncheck on shared devices.

## V2.9 synchronization behavior

- Existing V2.8 links, IndexedDB key, schema and sync metadata remain unchanged. Enable **Automatically synchronize changes in both directions** in Backups if not already enabled. The first download on an unlinked empty device is automatic; existing local data on an unlinked device is never automatically replaced. Export it first and explicitly link/reconcile.
- Firestore `onSnapshot` watches the existing manifest. Only server-confirmed revisions trigger incoming sync; transactional reads validate all chunks at one revision. Incoming clean snapshots replace local records atomically rather than appending them, preventing duplicate IDs and resurrected deletions during ordinary sequential sync. The existing validation and optimistic revision check remain in place.
- Local changes commit to IndexedDB before network requests; offline changes stay queued. Browser online/focus events, retry backoff and a 60-second fallback check recover dropped listeners. The live badge links to Backups. No manual refresh/upload/download is needed for linked, active, nonconflicting devices. Incoming updates wait until open dialogs/active input edits finish. Backgrounded or closed browsers may defer updates until resumed.
- Conflicts: if both versions have unsynced edits, the entire local snapshot and existing cloud snapshot remain intact; automatic synchronization pauses. Export the local JSON, download the cloud copy after confirmation, and reconcile deliberately. There is no automatic field-level merge (even disjoint concurrent edits can pause), and an import/restore can intentionally overwrite data. An identical cloud snapshot after a lost upload acknowledgement can be safely recognized without re-uploading. Different new IDs for the same person are not automatically deduplicated.
- No changes to Firestore security rules, Cloudflare API routes, credentials, Cloudinary upload logic, schema or existing 6 MiB workspace limit. Larger attachment-heavy workspaces remain local if cloud sync exceeds the limit. Manual JSON import/export remains available. Signing out does not lock or encrypt locally stored records; use private devices and fictional records until access/privacy safeguards are implemented. Offline saving works in an already loaded app; a fully offline cold launch is not guaranteed. Firebase sessions can expire or be revoked.
- Verification: `npm test` (25 tests, including simulated two-device add/edit/delete, offline, conflict, listener recovery and validation); `node build-pages.mjs`. Real account authentication and cross-device sync for this release must be verified on the deployed site using fictional data. The package retains the previous Wrangler project name; use your existing deployed project name/settings instead of replacing them.

## Live acceptance test

1. Export JSON from all devices. Upgrade the HTML, wait for Pages success and open the stable production URL on each device. Sign in and confirm two-way sync is enabled. For a device with existing unlinked local records, export and reconcile before linking.
2. With two devices open and not editing, add a fictional client on the computer. Confirm it appears on the phone without refreshing. Edit a note on the phone; verify the computer updates. Delete that fictional record and verify it disappears on both.
3. Disconnect one device, save a fictional change, reconnect and verify it propagates. For a conflict test, edit on both devices while one is offline; confirm the conflicting device pauses and its JSON can still be exported. Resolve deliberately; never blindly overwrite a real workspace.
4. Close and reopen each private browser to verify restored login. Inspect the live status and last successful synchronization in Backups. Confirm image references, appointments, forms and training history remain intact.

---

## Prior installation reference (V2.7)

# iCare Fitness CRM V2.7 — Cloudflare Pages environment configuration

V2.7 preserves V2.6's CRM, local IndexedDB, Firestore snapshot synchronization, and 1,600 px/82% WebP Cloudinary upload pipeline. It removes account-specific Firebase configuration and the Cloudinary cloud name from the application source. No actual API keys, Cloudinary credentials or coach UID are included in this package. Firebase initializes automatically when it can fetch the configuration from `/api/config`. Analytics remains off.

## 1. Set variables in Cloudflare Pages

This package targets **Cloudflare Pages with Pages Functions** (not a static-only Pages upload, a standalone HTML file, or a Worker-only project). The functions use `context.env`; the separate localhost Node server uses `process.env`. No Node compatibility flag is required for the Pages functions. The browser never reads `process.env` directly.

In the Cloudflare dashboard, select **Workers & Pages → your Pages project → Settings → Variables and Secrets** (the dashboard wording may vary). Add the following runtime values in Production. Configure Preview separately only if you intend to use it; use a separate test Firebase/Cloudinary project for previews where possible. Use the Firebase Console's exact web app configuration at Project settings → General → Your apps → SDK setup and configuration. The public variables can be plain Text; use Secret for the Cloudinary credentials and optionally for the coach UID. Do not add the secret values to GitHub, frontend code, build logs or client-accessible files.

| Variable | Value to enter | Type |
|---|---|---|
| FIREBASE_API_KEY | Copy `apiKey` from your Firebase web app config | Text (public web identifier) |
| FIREBASE_AUTH_DOMAIN | icare-crm.firebaseapp.com | Text |
| FIREBASE_PROJECT_ID | icare-crm | Text |
| FIREBASE_STORAGE_BUCKET | icare-crm.firebasestorage.app | Text |
| FIREBASE_MESSAGING_SENDER_ID | 810573682570 | Text |
| FIREBASE_APP_ID | Copy `appId` from your Firebase web app config | Text |
| FIREBASE_MEASUREMENT_ID | Copy `measurementId` from your web app config (optional) | Text |
| CRM_COACH_UID | Exact authorized coach's Firebase Authentication User UID | Secret or Text (server-only) |
| CLOUDINARY_CLOUD_NAME | Confirm exact cloud name and case in Cloudinary | Text (server-side) |
| CLOUDINARY_API_KEY | New rotated Cloudinary API key | Secret |
| CLOUDINARY_API_SECRET | New rotated Cloudinary API secret | Secret |

The Firebase web configuration is public by design. The API key will be visible to the browser at runtime because Firebase's web SDK requires it. The endpoint explicitly allows only the seven Firebase web configuration fields and never returns the Cloudinary key, secret, or coach UID. Do not provide Firebase Admin credentials or service-account JSON to the browser. Restrict Firebase API key usage appropriately; the hosted Cloudinary token check uses the Identity Toolkit API from the server, so an incompatible API key restriction may cause sign-in verification to fail. Configure only the APIs needed and do not use this key for unrelated billable Google APIs.

## 2. Deploy via GitHub + Cloudflare Pages

The static HTML has moved permanently into `public/`. The root contains `wrangler.toml`, `functions/`, `lib/`, and local tooling. `public/_routes.json` restricts Pages Functions invocation to `/api/*`. Keep the Pages root at the repository root, not `public/`. The validation script is compatible with the previous build command. Before deploying, reconcile Wrangler with your existing dashboard configuration and preserve existing variables and bindings.

1. Export a complete JSON backup from the old CRM. Extract this archive; commit the **contents** of the extracted project folder to your private GitHub repository (or put them in a subfolder and configure the Pages root directory to that subfolder). Do not commit `.env`, `.dev.vars`, credentials or exported client backups. `.gitignore` protects standard environment files; review your existing Git history for previously exposed secrets and rotate them.
2. In Cloudflare Pages, connect the GitHub repository. Select the correct branch and root directory containing `functions/` and `public/`. Framework preset: None. Build command: `node build-pages.mjs` (validates the ready-to-deploy static directory; alternatively leave blank). Build output directory: `public`. The browser uses the existing Firebase CDN SDK; npm bundling is not required. Only `public/` is served as static files. Pages compiles `functions/` separately. Do **not** select the repository root as the output directory or upload only the HTML.
3. Keep `wrangler.toml` at the project root. Review it against the existing Pages configuration before deploying; preserve dashboard bindings and secrets. Save the environment settings above and deploy/redeploy. Dashboard direct upload of static files does not compile Pages Functions. Use Git integration or Wrangler Pages deployment instead. If your project is Workers-only, this Pages package requires a different deployment adapter; don't deploy the local `server.mjs` publicly.
4. Open the deployed HTTPS site and visit `/api/config` on that same origin. A configured endpoint responds with JSON containing `firebase` only; missing required values give HTTP 503. A raw HTML response or 404 indicates Pages Functions were not deployed. Do not post the config response or credential screenshots publicly.
5. Open Home → Backups. Check that Firebase initialization succeeds; then sign in using the authorized coach's account. Confirm Firestore read/write with fictional records. Check the cloud connector, then upload, download and remove a fictional WebP image. Configuration status is not a live Cloudinary credential test.

## 3. Firebase setup and access control

- In Firebase Authentication, enable Email/Password, create the coach account, and copy its UID. Use the same UID as `CRM_COACH_UID` and replace `REPLACE_WITH_COACH_AUTH_UID` in `firestore.rules` before publishing. The template intentionally denies access until configured. Add the trusted hosted domain in Authentication settings if necessary.
- Create the default Cloud Firestore database in production mode if it doesn't already exist. Review region and privacy requirements before choosing its location. Publish the supplied scoped rules only in a dedicated CRM project; otherwise merge carefully with existing rules, ensuring no broader allow rule bypasses them. Review `firestore.indexes.json` (exclude `chunks.payload` from indexing) and merge rather than overwrite existing settings. Test unauthenticated and wrong-UID access denial.
- Hosted Cloudinary calls send the current Firebase ID token in an Authorization header. The Pages function checks project, token validity and coach UID, then asks Google's Identity Toolkit `accounts:lookup` to verify the signed token and user account. It rejects unauthorized, expired, disabled or revoked sessions as applicable. The Cloudinary key and secret are used only in the Pages function to sign upload/delete requests; authenticated downloads are fetched server-side. The existing single-coach asset ID namespace is retained so legacy cloud copies remain addressable. Use one dedicated coach UID and Cloudinary account for this prototype. Do not add arbitrary users or use an unrestricted public upload endpoint.
- Firebase remains the database, not GitHub or Cloudflare. Firebase Storage is not used. The workspace sync limit remains 6 MiB. Local copies and embedded attachments are retained. Auto-sync is opt-in and revision-protected, not a realtime listener. A new device/origin has separate IndexedDB storage: export backup first, then import locally or restore from Firebase. An existing cloud workspace cannot be overwritten blindly.

## 4. Local Windows development (optional)

Install Node.js 22 or newer. In the extracted project folder, copy `.env.example` to `.env`, fill it with your configuration and rotated Cloudinary credentials, and double-click `Start CRM.cmd` or run:

```powershell
Copy-Item .env.example .env
notepad .env
node --env-file-if-exists=.env server.mjs
```

Open http://127.0.0.1:8787. The Node server reads `process.env` and serves the same public config endpoint. It binds only to loopback and retains the previous local-only same-origin Cloudinary connector (no coach token required locally). Never expose this server publicly. The sole application HTML is now `public/index.html`; the local server serves it directly. Delete the old root `index.html` from Git when upgrading. Do not delete `public/index.html`. Standalone file URLs retain local-only mode. For Pages Functions local emulation, copy `.env.example` to `.dev.vars`, fill in test credentials and run `npx wrangler pages dev public` from the project root (requires downloading Wrangler). The npm SDK module remains optional and also fetches `/api/config`.

## 5. Security and testing

Rotate the Cloudinary credential pair previously shared in chat. Do not place it in public code or GitHub. The Pages functions protect hosted image operations, but the existing CRM still does not lock its local IndexedDB data upon Firebase sign-out. Deploy behind Cloudflare Access or another private access gate, use a private browser profile, and do not use actual client health information until a full production security/privacy review, permissions, retention, backup and recovery testing are complete. JSON backups are readable files. Do not commit them. All cloud images are authenticated assets; remove cloud copies separately before deleting client records. The browser retains original attachments, converts only the uploaded cloud copy to WebP; animated images become stills.

Run `npm test` (Node 22+, no package install needed for these tests). Eight automated tests pass: existing snapshot/size/revision tests, local image operations, binary uploads, public config allowlist/missing variables, hosted token/origin rejection, and simulated signed hosted uploads/download/delete. No actual cloud accounts were contacted and no deployment was performed. Live Firebase, Cloudinary, Cloudflare runtime and deployed rules remain to be tested. This is not a production-ready medical or health-record system.

References: https://developers.cloudflare.com/pages/functions/bindings/ ; https://developers.cloudflare.com/pages/get-started/git-integration/ ; https://firebase.google.com/docs/projects/api-keys ; https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/lookup

# V3.0 upgrade — CSV and private Google Sheets reporting (approved)

## Before updating

1. On every device containing unsynced data, use Backups → Export full JSON. Keep files private. Finish pending Firebase sync and resolve any conflicts. Do not clear browser storage or change the production hostname.
2. Save a copy/tag of the current GitHub production branch. This release keeps the IndexedDB key, schema version 1, Firebase workspace format, real-time listener, Cloudinary API and existing JSON backups. Never deploy the bundled Firestore rules template over your working rules; it still contains the original UID placeholder.
3. Extract the V3.0 package into a separate folder, not directly over your working repo. Review the changes. No new service keys are in this ZIP.

## CSV tools (works in the normal CRM, no Google credentials needed)

Contacts → Import CSV / Export directory / Export filtered; individual contact cards have Export CSV. Select fields for export. Use Excel's Data → From Text/CSV and import phone, IDs and postal codes as Text for exact formatting. Excel-compatible UTF-8 with BOM and quoted values; potentially formula-like strings and leading-zero identifiers receive an apostrophe prefix. CSV is not an encrypted backup. Use the existing JSON export to preserve photographs, notes, appointments, logs and all other data.

Import UTF-8 comma-separated CSV (not XLSX, semicolon-delimited or UTF-16), up to 5 MiB and 2,000 rows/100 columns. Example headers: Full name,Email,Mobile phone,Start date,Status. Use YYYY-MM-DD dates. Program choices are Stronger 50+, Other, Not assigned. Preview maps known headings; ignored columns are not stored. Approve each matched update individually; blank cells never clear existing fields. Name-only, conflicting matches and within-file duplicates are blocked. Only client profile fields are imported; arbitrary notes, attachments and medical answers are excluded. New records receive safe defaults. Confirm to download a pre-import JSON snapshot and commit the approved changes using the original local transaction. Verify the backup actually downloaded; browser downloads can be blocked. Existing Firebase synchronization will then run as configured. Import is not a deduplication tool for pre-existing duplicate clients.

## Google setup — do this with fictional records first

1. Google Cloud Console https://console.cloud.google.com/ — select the Firebase project `icare-crm`. Enable Cloud Firestore API and Google Sheets API (enable Sheets API in the writer service account's project if different). Create two dedicated service accounts in IAM & Admin → Service Accounts: e.g. `icare-report-reader` and `icare-sheet-writer`. Do NOT grant Owner/Editor. Grant the reader Cloud Datastore Viewer (`roles/datastore.viewer`) in the Firebase project, preferably scoped to the correct database with an IAM condition where supported. This is read-only but can read all documents in its allowed database and bypasses client Firebase rules. The Worker reads the whole existing workspace to filter it; the service account is not field-limited. The writer needs no Firestore role. Create a JSON key for each only if your organization permits it. If key creation is blocked, consult the administrator; do not weaken organizational security controls.
2. Create a **new, empty private Google spreadsheet** at https://sheets.google.com/ named iCare Fitness CRM — Reporting. Set General access to Restricted. Share only with your authorized coach account and the writer service account email (Editor). Do not share with the reader or publish to web. Copy the spreadsheet ID between `/d/` and `/edit` in its URL. The five managed worksheets are created automatically. They are wholly owned by the integration; all values in those five tabs are replaced by the report. Use separate tabs for your own formulas; the original blank Sheet1 can be removed manually. Sheets version history may retain old data; deletion from CRM removes current reporting rows but does not erase Google version history or downloaded copies.
3. In each JSON credential file, use `client_email` and `private_key` (the entire PEM including BEGIN/END PRIVATE KEY; the Worker handles actual or escaped newlines). Keep the JSON files outside the repository. No private key belongs in GitHub, a browser, the Pages HTML, logs, or chat. Use Cloudflare encrypted secrets. Rotate previously exposed tokens/keys and revoke old credentials.

## Deploy the separate reporting Worker FIRST

This is a separate Cloudflare Worker, not the existing Pages project. From the extracted V3.0 root on your computer, log in using `npx wrangler login` or use a private locally supplied scoped deployment token. Run:

```powershell
cd reporting-worker
npx wrangler deploy
```

The Worker name is `icare-crm-reporting`; it has no public workers.dev or preview URLs. Its own `wrangler.toml` defines the entry point, SQLite Durable Object coordinator and five-minute cron. Never run `wrangler deploy` from the Pages root. If your Cloudflare account/project has different settings, review before deploying. No separate Worker existed in V2.9. The Worker is disabled by default until the environment variable below is set to `true`.

Cloudflare Dashboard → Workers & Pages → icare-crm-reporting → Settings → Variables and Secrets. Add:

| Name | Value | Type |
| --- | --- | --- |
| FIREBASE_PROJECT_ID | icare-crm | Text |
| CRM_COACH_UID | actual existing authorized Firebase coach UID | Secret |
| GOOGLE_SHEET_ID | private spreadsheet ID | Secret |
| GOOGLE_SERVICE_ACCOUNT_EMAIL | writer client_email | Text |
| GOOGLE_PRIVATE_KEY | writer private_key PEM | Secret |
| GOOGLE_FIRESTORE_READER_EMAIL | reader client_email | Text |
| GOOGLE_FIRESTORE_READER_KEY | reader private_key PEM | Secret |
| GOOGLE_REPORTING_ENABLED | false initially; true after setup and privacy review | Text |

These eight values are for the Worker, not the Pages environment. Keep all eleven existing Pages variables as they are. Save/deploy the Worker settings. If subsequent Wrangler deployments override dashboard variables, restore them or manage non-secret values in the Worker config; never put keys there. Cron invocation is approximately every five minutes, not a hard guarantee. Cloudflare/Google quotas, billing, propagation delays and service availability apply. A full maximum-sized workspace may be heavy; monitor usage. The reporting Worker logs no client fields and stores status/counts/revision only. The API is reached through a private Pages service binding.

## GitHub file replacements / Pages binding

From the extracted package copy these files to the SAME relative paths of your working repository (do not upload private keys or client backups):

- `public/index.html` (new V3.0 UI)
- `lib/pages-cloudinary.mjs` (only exports the already-existing coach authorization helper; Cloudinary behavior unchanged)
- `functions/api/reporting/[action].js` (new, protected endpoint)
- `lib/csv.mjs`, `reporting-worker/` (including its own config), `csv.test.mjs`, `reporting.test.mjs` (source and test suite)
- `package.json`, `build-pages.mjs`, `.gitignore`, `README.md` (review and merge changes if your repo has custom scripts/settings).

Keep the current root `wrangler.toml` name exactly matching your working Pages project (your deployed URL indicated `icarecrm`, not necessarily the archived template name `icare-crm`). Keep `pages_build_output_dir = "./public"`, existing compatibility settings and any other bindings. **Append** the following only if not already present, after the Worker exists:

```toml
[[services]]
binding = "REPORTING_SERVICE"
service = "icare-crm-reporting"
```

If the deployed Pages project is configured through its dashboard instead of Wrangler, use Settings → Bindings → Add → Service binding, name `REPORTING_SERVICE`, service `icare-crm-reporting`, Production. Use the same binding in Preview only if you intentionally want previews to access production reporting (normally do not). If Wrangler manages the project, the config is source of truth. Do not replace it with the Worker config. Pages build command remains `node build-pages.mjs`, output `public`, repository root. Git integration should deploy on push. Do not use Workers deploy command for Pages. Keep your stable production URL to retain browser sessions and local data.

Review staged changes (`git status`, `git diff --cached`); ensure no secrets/exports/backups are staged. Commit and push to your actual production branch. Example explicit stage paths: `git add public/index.html lib/pages-cloudinary.mjs lib/csv.mjs functions/api/reporting reporting-worker csv.test.mjs reporting.test.mjs package.json build-pages.mjs .gitignore README.md wrangler.toml`. Inspect the diff before `git commit -m "Upgrade iCare CRM to 3.0"` and `git push`.

## Activate and test

- Open the deployed CRM on the stable hostname, sign in as the coach, verify V2.9 records and cross-device sync before enabling reporting. Test CSV import/export with fictional records; verify duplicate updates are unchecked by default and profile photos/notes survive. Test invalid rows, cancel and re-open, and confirm a backup is downloaded.
- After confirming the spreadsheet is private and approved for reporting, set `GOOGLE_REPORTING_ENABLED=true` on the reporting Worker; deploy settings. CRM → Backups → Google Sheets reporting → Check reporting → Sync now. Confirm the warning. Verify the five sheets, no medical forms/answers, photos, emails, phones, addresses, free-text notes or weight/waist/sleep/energy. Only names, IDs and selected enumerated fields/operational metrics appear. Names and adherence are personal information; restrict access and review privacy obligations before using real data.
- Create, update and delete a fictional record from another linked device. Allow Firebase sync to finish, then allow the next scheduled five-minute run. Check rows update or disappear rather than append duplicates. Close all CRM tabs and verify Worker scheduled events in Cloudflare. Manual edits to managed tabs may be overwritten; unchanged revisions are skipped, and Sync now forces refresh. Pause prevents new runs (a currently running request may complete), Resume re-enables. Report failure does not affect CRM writes or client sync. If a network error occurs, the next scheduled run retries. A revision is recorded only after Google accepts the batch. No data flows from Sheets to Firebase.
- Troubleshoot: 401/403 on reporting endpoint means sign in again, check Pages CRM_COACH_UID and Firebase project. 503 means missing Pages service binding. OAuth failure means key/email/scope or organization policy. Firestore 403 means reader IAM/access. Firestore 404 can mean no cloud workspace has been created yet; perform a normal first link. Sheets 403/404 means wrong sheet ID, API disabled, missing editor sharing, or key issue. For manual force refresh use Sync now. Local Node server supports CSV but not the hosted reporting binding. Status checks poll while Backups is open; actual scheduled execution does not depend on browser.
- Rollback: pause reporting and set Worker enable flag false (or remove cron), restore V2.9 HTML from Git, keep existing JSON backups. Firebase data format is unchanged. If needed remove Pages service binding. Do not delete client data as part of rollback. Delete report copies separately according to retention policy; revoke unnecessary service keys.

## Local verification

`npm test` (37 tests: original 25 plus CSV and Google reporting tests) and `node build-pages.mjs`. Additional Chromium mobile UI smoke test passed (390 px): import mapping, explicit duplicate approval, commit with simulated local storage, export field selection and reporting controls. Browser navigation and real IndexedDB persistence were restricted in this environment. OAuth, Firestore and Sheets API responses are simulated; no live account credentials, deployment, or real client data were accessed. This is an upgrade package, not a production security certification. V2.9 6 MiB sync cap, local unencrypted records, and conflict reconciliation restrictions remain. CSV does not bypass these limits. The five-minute job uses a separate Worker with serialized execution; confirm live quotas and IAM access before production. The approved optional reporting fields are all off, and no arbitrary text/medical answers are exported. This is a field allowlist, not semantic detection of sensitive information that someone typed into an allowed field.

Official references:
- https://developers.cloudflare.com/pages/functions/bindings/
- https://developers.cloudflare.com/pages/functions/wrangler-configuration/
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.google.com/identity/protocols/oauth2/service-account
- https://docs.cloud.google.com/firestore/native/docs/security/iam
- https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate

## V3.2.0 — Client Workspace Edition (Preview release candidate)
See [V3.2.0_PREVIEW_GUIDE.md](V3.2.0_PREVIEW_GUIDE.md), [V3.2.0_CHANGELOG.md](V3.2.0_CHANGELOG.md) and [REGRESSION_REPORT.md](REGRESSION_REPORT.md) for the current release. Earlier setup instructions are historical; do not replace working production rules/configuration or use real client records for Preview tests. No new runtime variables. The original Google reporting Worker compatibility issue is still outstanding.
