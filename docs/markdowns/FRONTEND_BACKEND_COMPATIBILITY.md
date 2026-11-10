# Frontend compatibility with backend main

Verified on 2026-11-06 against backend commit
`d17a1ad3f899a652e48e55fdd9b2dd10f14ff5eb` (MDY-26).
The contract is `../moodly-backend/docs/api/json/moodly-openapi.json`.
The local contract file matches the version stored in backend main.

## Changes

- Generation, CI drift verification, README and frontend standards use the relocated contract. Generated DTO response names are consumed through explicit import aliases; generated files are never edited manually.
- Entries and search retain page metadata, request 20 results per page, expose URL-based page navigation, and reset page selection when filters change. Entries preserve backend descending date order. Search remains subject to the backend 10,000-result window.
- HTTP 429 retains Retry-After and presents a wait message. Reads and writes are rejected locally until the deadline, without automatic replay. Feature clients share cooldown within an Auth0 provider and subject; different subjects have independent clients. Cooldown is in memory, not persisted across reloads or browser tabs. Already in-flight requests cannot be recalled.
- Normalized errors retain the backend request ID and field errors. Existing module 404/409 messages and safe Today load errors are included and covered by regression tests. Field errors remain available to consumers; this change does not add per-field form rendering.
- Avatar confirmation requires a positive safe integer Cloudinary version. Invalid upload responses never trigger confirmation.
- Date filters use Asia/Ho_Chi_Minh, matching the backend calendar, including UTC midnight boundaries. History defaults use calendar-day arithmetic independent of browser DST.
- Profile synchronization returning 401 offers explicit sign-in recovery. HTTP 403 retains permission feedback and does not automatically redirect or retry.

## Validation

Each implementation step passed ESLint, production build (including TypeScript and bundle budgets), and its relevant tests before its commit. Final generation followed by a generated-file diff produced no drift.

- Full coverage run: PASS, 29 files / 113 tests; lines 88.97%, branches 78.38%, functions 72.57%, statements 78.91%.
- Public Playwright scenarios: 3/3 PASS after installing the required Chromium build.
- Authenticated Playwright setup: FAIL; returned to dashboard URL but bootstrap displayed “Unable to prepare Moodly / Unable to reach Moodly. Check your connection and try again.” The 12 dependent tests did not run. A separate health probe could not reach localhost:8080. This does not establish the precise deployed network/CORS/backend cause.
- npm audit --audit-level=high: FAIL on unchanged package manifest and lockfile; 16 findings (13 moderate, 3 high). The report identifies high findings in undici, Vite and Zod, plus moderate test/lint dependency findings. Dependency upgrades are outside this compatibility change; CI audit is expected to remain a blocker until addressed.

Authenticated integration, real Cloudinary confirmation/concurrency, enabled backend rate limiting with browser CORS, representative pagination data and test performance still require an available backend. Previous release-handoff PASS entries do not certify these checks against MDY-26. No production readiness claim is made.

## Git notes

Branch: `fix/backend-main-compatibility`; implementation commits follow Conventional Commits. The eight branch commits were re-signed with the configured GPG key after signing became available. The initial signing attempt hung; signing was temporarily disabled per command without changing repository or global Git configuration.

The pre-existing local `docs/reviews/exception-contract-review.md` is intentionally excluded because it describes an older review. Secrets, env files, authenticated browser artifacts and the private release handoff are excluded.
