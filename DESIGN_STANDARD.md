# iCare Fitness CRM — Formal 8px design standard
Effective V3.2.1. Owner-approved design direction for future CRM changes.

## Principles
Use reusable CSS tokens instead of arbitrary spacing. Base spatial unit: 8 CSS pixels. Use 4px for fine alignment, such as icon adjustment or focus outline offset, rather than a competing layout grid. Accessibility, device safe areas, one-pixel borders, stroke weights, fluid widths, type size/line height and intrinsic content sizes are legitimate exceptions. Never clip content or disable zoom to force grid alignment. Use CSS pixels, not physical device pixels.

| Token | Value | Purpose |
|---|---:|---|
| `--ic-space-0` | 0px | reset |
| `--ic-space-half` | 4px | fine alignment |
| `--ic-space-1` | 8px | related elements, icon-to-label spacing |
| `--ic-space-2` | 16px | screen inset, card padding, card gap, standard radius |
| `--ic-space-3` | 24px | section rhythm |
| `--ic-space-4` | 32px | primary icon size |
| `--ic-space-5` | 40px | intermediate size |
| `--ic-space-6` | 48px | primary touch target and icon well |
| `--ic-space-8` | 64px | profile image, bottom action area |
| `--ic-card-min` | 112px | module card minimum height; expand with content |
| `--ic-radius` | 16px | card corner radius |
| `--ic-touch` | 48px | main action minimum target |
| `--ic-icon` | 32px | outline module icon |
| `--ic-dock` | 64px | dedicated page bottom area plus device safe inset |

Use existing ivory/graphite/rose-gold palette, theme tokens, typography and dark mode. New icons are inline SVG, decorative with visible accessible labels. At widths <=800px, primary cards use two flexible equal columns; pages show one module with a top Back button and bottom primary action. Cards grow at larger text sizes. Compact icon wells are 48px, main profile avatar is 64px, main card padding and gaps 16px. Use 24px gaps between larger sections. Bottom dock becomes in-flow at the existing large-text threshold. Safe areas are applied separately from the base grid. Use no new motion requiring a special reduced-motion implementation.

## Scope and review
V3.2.1 introduces the tokens at :root and applies them to the new mobile workspace shell and primary controls, plus scoped adjustments to existing module content. Legacy desktop and pre-existing component interiors remain unchanged unless required by the mobile shell. Existing dense calendars, form grids, table internals, global navigation and typographic sizing retain their existing responsive rules; this is not a whole-app pixel-by-pixel audit. Future design changes should adopt the tokens progressively, with a separate desktop approval if layout changes are needed.

For every future change: review spacing/radii/targets, ensure visible focus, test 320/390/768/800px and desktop, dark mode and 200% text, verify no overflow outside deliberate table scroll containers, and preserve all client and security behavior. Document justified exceptions. Keep this file in GitHub as the design standard.
