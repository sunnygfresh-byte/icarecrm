# V3.2.1 local regression report
Release candidate, not deployed. Based on the archived V3.2.0 complete ZIP, not a fetched GitHub revision.

- `npm test`: 87 passed, 0 failed (82 existing tests + 5 new mobile/navigation/design-token tests). See `V3.2.1_TEST_RESULTS.txt`.
- `node build-pages.mjs`: passed.
- `python mobile-browser-smoke.py`: passed all 12 dedicated views and hub at 320, 390, 768, 800 CSS px; two-column grid, no page overflow, native Back/Forward, hub Back, client switching, simulated direct-route restoration, 1440px aliases, responsive breakpoint changes, no records mutated by navigation, notes/forms attachments, dark mode and 200% hub/overview text. See `V3.2.1_BROWSER_RESULTS.txt`.
- `python workspace-browser-smoke.py`: existing smoke suite adapted only for new navigation and collapsed client switcher; passed create/edit attachments, replacement, master calendar/forms, deletion retention, invalid-file rejection, gallery/compare/preview, manual Cloudinary controls, navigation and accessibility. See `V3.2.1_WORKSPACE_BROWSER_RESULTS.txt`.
- Desktop comparison: archived V3.2.0 and V3.2.1 at 1440 CSS px with matched fictional fixture clients; visible text and main workspace geometry matched for the eleven legacy routes in the final run. This is not pixel-perfect verification of every screen, OS or browser. See `V3.2.1_DESKTOP_COMPARISON.txt`.
- Browser tests mock authentication and persistence and block external requests; they are not live secure-origin or multi-device tests. Physical iPhone Safari, actual refresh/unlock, real Firebase/Cloudinary sync, and production-equivalent security acceptance are pending. No live requests or changes made.
- No schema migration, new environment variables or backend modifications. Existing known Google reporting Worker redirect compatibility issue is not fixed here.
