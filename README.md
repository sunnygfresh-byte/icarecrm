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

1. Export a complete JSON backup from the old CRM. Extract this archive; commit the **contents** of the `icare_cloudflare_v2.7` folder to your private GitHub repository (or put them in a subfolder and configure the Pages root directory to that subfolder). Do not commit `.env`, `.dev.vars`, credentials or exported client backups. `.gitignore` protects standard environment files; review your existing Git history for previously exposed secrets and rotate them.
2. In Cloudflare Pages, connect the GitHub repository. Select the correct branch and root directory containing `functions/` and `public/`. Framework preset: None. Build command: blank (or `exit 0` if required). Build output directory: `public`. The browser uses the existing Firebase CDN SDK; npm bundling is not required. Only `public/` is served as static files. Pages compiles `functions/` separately. Do **not** select the repository root as the output directory or upload only the HTML.
3. Save the environment settings above and deploy/redeploy. Dashboard direct upload of static files does not compile Pages Functions. Use Git integration or Wrangler Pages deployment instead. If your project is Workers-only, this Pages package requires a different deployment adapter; don't deploy the local `server.mjs` publicly.
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

Open http://127.0.0.1:8787. The Node server reads `process.env` and serves the same public config endpoint. It binds only to loopback and retains the previous local-only same-origin Cloudinary connector (no coach token required locally). Never expose this server publicly. The root `index.html` is a local-server copy of `public/index.html`. Standalone file URLs retain local-only mode. For Pages Functions local emulation, copy `.env.example` to `.dev.vars`, fill in test credentials and run `npx wrangler pages dev public` from the project root (requires downloading Wrangler). The npm SDK module remains optional and also fetches `/api/config`.

## 5. Security and testing

Rotate the Cloudinary credential pair previously shared in chat. Do not place it in public code or GitHub. The Pages functions protect hosted image operations, but the existing CRM still does not lock its local IndexedDB data upon Firebase sign-out. Deploy behind Cloudflare Access or another private access gate, use a private browser profile, and do not use actual client health information until a full production security/privacy review, permissions, retention, backup and recovery testing are complete. JSON backups are readable files. Do not commit them. All cloud images are authenticated assets; remove cloud copies separately before deleting client records. The browser retains original attachments, converts only the uploaded cloud copy to WebP; animated images become stills.

Run `npm test` (Node 22+, no package install needed for these tests). Eight automated tests pass: existing snapshot/size/revision tests, local image operations, binary uploads, public config allowlist/missing variables, hosted token/origin rejection, and simulated signed hosted uploads/download/delete. No actual cloud accounts were contacted and no deployment was performed. Live Firebase, Cloudinary, Cloudflare runtime and deployed rules remain to be tested. This is not a production-ready medical or health-record system.

References: https://developers.cloudflare.com/pages/functions/bindings/ ; https://developers.cloudflare.com/pages/get-started/git-integration/ ; https://firebase.google.com/docs/projects/api-keys ; https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/lookup
