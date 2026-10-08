# HOÀN — Safe frontend cleanup (09/10/2026)

## Baseline
- Main approved SHA at start: `e9ee86ae89595feb31b2301a06910096b9be7e1e`.
- Main GitHub Actions on that SHA: **passed** (runs `37820226666` and `37820225794`).
- No substantive UX/business-flow rewrite in this cleanup.
- Existing backup: `backup-before-frontend-finish-20261009`. Do not delete it.

## Code cleanup
1. Removed unused `note` named import from `js/app.mjs`.
2. Removed unused `note` named import from `js/overview.mjs`.
3. Added `tests/release-hygiene.test.mjs` with five checks:
   - Withdrawal history must use application records and never resurface simulated withdrawals or a fabricated bank rejection reason.
   - Cashback quick card must have one Wallet link, without duplicate Xem ví.
   - All entry assets and literal JavaScript module imports must resolve.
   - Approved order spacing, separate receiving-account card and Reduce Motion safeguards stay present.
   - Main must not load discarded Stage 2/Stage 3M animation or prototype code.

## Kept on purpose (not waste)
- `js/fixtures.mjs`, test scenarios and review controls: necessary to validate demo business flows. Removing these would cripple QA.
- Stage 3 CSS layers and payout modules: they encode approved designs; concatenation/deletion can alter cascade and screen geometry.
- All `tests/` and GitHub Actions workflow: regression coverage for wallets, withdrawal, link validation, bank account forms, mobile layouts and accessibility.
- Fonts and license files: part of the shipped UI; keep licensing metadata.

## Not changed
- Money math, status transitions, withdrawal idempotency, real payout verification, simulated banking adapter.
- User-visible cards, routes, labels, colors, fonts and movement.
- Other repositories and their Git history; nothing was deleted or archived.

## Release rule
Merge only if CI succeeds on this cleanup branch/PR; otherwise leave main intact. Current product is still a **frontend demo**, not a production-grade Shopee or banking integration.

## Limits
- The audit proves basic build/import and coverage hygiene, not unused CSS selector elimination. Aggressive tree-shaking and stylesheet deduplication require computed style/screenshot regression checks, especially in Safari/iOS.
