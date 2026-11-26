# V3.1 regression report — release candidate

## Results

| Check | Result | Method |
|---|---|---|
| Existing V3.0 tests | 37/37 pass | Node test suite, includes simulated Firebase and Cloudinary/Google APIs, CSV and two-device behavior |
| New security and workbook tests | 10/10 pass | Node Web Crypto, actual embedded vault logic with simulated atomic store and mocked Firebase/Google responses, OOXML ZIP validation |
| Total automated tests | 47/47 pass | `npm test` |
| AES-GCM integrity, wrong key/owner/project, no exportable key | Pass | Node Web Crypto, real encryption/decryption |
| Legacy workspace migration, metadata retention, lock, direct read/write refusal | Pass | Embedded adapter with simulated storage and mocked Firebase session |
| Server-side authorized coach check | Pass | Mocked Google ID-token verification; missing, wrong, cross-origin and revoked tokens denied |
| Native XLSX export independently readable | Pass | Python openpyxl loaded native ZIP workbook, preserved formula-like string, phone and leading zeros |
| Native XLSX import, worksheet selection, date and postal code, preview and confirmation | Pass | Chromium mobile viewport 390px, compressed independent openpyxl fixture, mocked auth/storage |
| Locked startup with empty in-memory state | Pass | Chromium opaque-origin smoke test |
| JavaScript syntax and Pages validation | Pass | `node --check`, `node build-pages.mjs` |
| Full real secure-origin browser IndexedDB migration/unlock/sign-out | BLOCKED | Browser navigation denied (`ERR_BLOCKED_BY_ADMINISTRATOR`); opaque-origin browser does not expose Web Crypto. Not tested on actual browser IndexedDB. |
| Live Firebase auth, real-time sync, Cloudinary, Sheets, Cloudflare deploy | NOT TESTED | No production access; simulated regression only |
| Independent security audit / real-world browser compatibility | NOT TESTED | Required before sensitive production use |

No live production account, repository, environment variable, security rule or client data was modified. Existing Firebase rules, cloud schema, reporting Worker, Cloudinary API logic and Pages routing are unchanged byte-for-byte from the supplied V3.0 baseline. New `/api/session` reuses the existing `authorize` helper. Local Node server changed only to route the session endpoint. Native Excel workbook support is values-only, bounded and not a general Excel engine. See `V3.1_UPGRADE.md` for required staging tests and limitations.

**Release gate:** do not deploy until real secure-origin migration/authentication/locking, cross-device testing and security review are completed and approved. Passing simulated tests is not production certification.
