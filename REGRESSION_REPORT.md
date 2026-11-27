# iCare Fitness CRM V3.2.0 — Regression report

**Local release candidate; not deployed.** Based on the archived V3.1.2 Complete Cloudinary package. No real client data, live cloud requests, credentials, GitHub changes or production operations were used. The live repository revision has not been independently fetched.

## Results

- `npm test`: **82/82 passed, 0 failed, 0 skipped**. All 70 existing V3.1.2 tests remain byte-for-byte unchanged; 12 new tests in `client-workspace.test.mjs` cover the actual browser helper functions and server consent association checks. See `V3.2.0_TEST_RESULTS.txt`.
- `node build-pages.mjs`: pass, static output structure and API routes verified. `node --check` on the extracted main HTML script: pass.
- `python workspace-browser-smoke.py`: pass with Chromium using an in-memory copy of the actual application HTML, fictional demo records, mocked authentication and persistence, and all external network requests blocked. See `V3.2.0_BROWSER_RESULTS.txt`. The test harness does not ship in the hosted HTML. Live navigation was blocked by the execution environment, so testing used `page.set_content` on about:blank. Browser Back and route restoration were tested in that environment, not a true secure-origin refresh/unlock.

## Verified locally

| Coverage | Result |
|---|---|
| Existing encrypted vault, migration, Firebase authentication, revision/conflict, CSV/XLSX, Cloudinary consent and Google reporting tests | 70 existing tests passed, real Web Crypto unit operations and mocked APIs/storage where applicable |
| Route validation and known client module identifiers | Pass |
| Optional-field migration compatibility, no eager record mutation | Pass |
| Note/form relationship validation, rejection of cross-client or ambiguous parents | Pass |
| HTTP(S) website URL validation, disallowed schemes and credentials | Pass |
| Serialized UTF-8 capacity check and oversized rejection | Pass |
| Multiple attachments with original client IDs and parent references | Pass |
| Unsupported file extensions, basic file-signature mismatch, locked-session rejection | Pass |
| Activity history retention bounds and historical source labels | Pass |
| Optional end date and body measurements | Pass |
| Server-side committed note/form association checks before upload and download; safe tracked cleanup | Pass, mocked committed workspace |
| Progress-classified image permission | Pass, mocked committed workspace |
| Eleven modules × 1440, 768, 390 px; navigation does not change data | Pass, Chromium; no horizontal page overflow observed |
| New and edited notes/forms with file attachments | Pass, simulated encrypted storage |
| Resource replacement with preserved ID/association; link-only resource | Pass |
| Master calendar and master forms display same new record | Pass |
| Client switching, search, browser Back and simulated route restoration | Pass |
| Parent note deletion retains linked files; invalid file prevents partial parent save | Pass |
| PNG attachments, gallery comparison, local preview, manual Cloudinary controls | Pass (UI only, no Cloudinary network) |
| Dark mode and 200% mobile overview text size | Pass |
| JavaScript page errors and live service requests | None observed in browser harness |

During development the longer smoke test exposed a resource editor defaulting to Progress photo, which blocked link-only resources without progress photo permission. Default changed to Other; the final rerun passed.

## Protected source comparison

Firebase rules, index configuration, Firebase sync modules, vault cryptography, Cloudinary signing/helper (except the new parent checks in `lib/cloud-consent.mjs`), all API endpoint entry points, Pages routes and configuration, Excel/CSV modules, the entire reporting Worker and all existing test files are byte-identical to the archived baseline. The browser application includes targeted changes to editor, rendering, route state and lock cleanup; core vault algorithms and synchronization paths are preserved. See exact patch manifest.

## Outstanding acceptance tests / limitations

Real secure-origin IndexedDB migration and full refresh/unlock, live Firebase session/revocation, cross-device sync/conflicts, authenticated Cloudinary upload/retrieval/removal, PDF rendering across browsers, Safari/iOS, actual Microsoft Office download/open, and independent security/privacy review require separate isolated Preview testing. Existing Google Worker `redirect:'error'` issue remains outside scope. Activity history is bounded to 300 new entries per client plus reconstructed surviving records, not a tamper-proof audit ledger. Some significant historical actions cannot be recovered. File signatures are basic checks, not malware scanning. Documents remain embedded under the 6 MiB workspace ceiling. Older app versions should not edit a V3.2.0 workspace after new relationships have been saved. No deployment performed.
