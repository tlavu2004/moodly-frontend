# Moodly Frontend Completion Checklist

## Purpose

This checklist records the work identified after the core frontend routes were implemented. It describes this repository's readiness work and preserves the status recorded at the review checkpoint.

- `/` — Public landing page.
- `/dashboard` — Overview backed by live data.
- `/habits` — Habit listing and creation.
- `/today` — Daily mood and habit check-in.
- `/entries` — Journal history filtered by date range.
- `/stats` — Weekly statistics.
- `/profile` — Profile and avatar upload.
- `/search` — Search with a query and date filters.
- `*` — 404 page.

The feature milestone covering Dashboard, Habits, daily entries, mood, Stats, avatars, and Search was marked complete. The remaining sections track production readiness.

## 7. Integration and E2E Testing

### 7.1. Prepare the Integration Test Environment

- [x] Configure the frontend for the integration test environment.
- [x] Create an Auth0 application or tenant suitable for automation.
- [x] Register test callback URLs, logout URLs, and web origins.
- [x] Prepare a synthetic account with synthetic data.
- [x] Provide a repeatable backend seed and reset flow.
- [x] Keep secrets, test passwords, and access tokens out of the repository.
- [x] Document how to start the frontend, backend, and E2E dependencies.

Local development has a non-production Auth0 configuration, a synthetic account, and a reset endpoint. Two resets produced the same baseline of two habits and three entries while preserving other users' data. The local authenticated suite passed 13 of 13 tests on 2026-10-15. See [Frontend Integration Testing](./FRONTEND_INTEGRATION_TESTING.md) for environment variables and the reset contract. Configure and verify the hosted test environment separately at checkpoints 3–4.

### 7.2. Configure Playwright

- [x] Install `@playwright/test` and its browser runtime.
- [x] Set the base URL, timeout, and trace settings in `playwright.config.ts`.
- [x] Add the `test:e2e` script.
- [x] Add the `test:e2e:ui` script for local debugging.
- [x] Retain screenshots, videos, and traces for failure or retry as configured.
- [x] Reuse authenticated storage state across tests.
- [x] Separate public route tests from protected route tests.

### 7.3. Required E2E Smoke Tests

- [x] Open `/` while signed out and stay on the public page.
- [x] Start the Auth0 flow from a protected URL while signed out.
- [x] Return to the original URL after signing in.
- [x] Synchronize the backend profile before calling protected feature APIs.
- [x] Create a habit and see it in the list.
- [x] Save today's mood and see the update on the dashboard.
- [x] Complete a habit and see the completion ratio update.
- [x] Find the new entry in a date-filtered journal.
- [x] Show weekly stats using a supported period.
- [x] Upload a valid avatar and see it after reloading.
- [x] Reject unsupported or oversized avatar files.
- [x] Update the URL query string when searching by keyword and date.
- [x] Return to the landing page on logout.
- [x] Render a 404 page with a way back for an unknown URL.

The checked items confirm that the test cases exist. The local authenticated suite passed 13 of 13 tests on 2026-10-15. Run it again in the hosted test environment at checkpoint 4 before counting it toward the Definition of Done.

### 7.4. E2E Failure Paths

- [x] Verify the UI for a backend HTTP 400 validation error.
- [x] Verify the UI for an expired token or HTTP 401.
- [x] Verify the UI for HTTP 403.
- [x] Verify the UI for HTTP 500.
- [x] Verify the UI for a timeout or lost connection.
- [x] Verify that recovery never duplicates a mutation.
- [x] Verify Cloudinary upload success followed by backend confirmation failure.
- [x] Verify empty states for Habits, Entries, Stats, and Search.

The frontend leaves retries of HTTP mutations to the user after a connection failure, timeout, or 5xx error. E2E verified that an in-flight POST blocks another submission and that a POST with a connection failure is sent only once. If habit creation has an uncertain outcome, the UI asks the user to check the list before retrying. Versioned habit mutations return HTTP 409 for a stale version. The contract does not support `Idempotency-Key`.

## 8. Automated Frontend Tests

### 8.1. Test Foundation

The repository uses Vitest, Testing Library, and MSW, with coverage thresholds for handwritten code.

- [x] Install Vitest.
- [x] Install React Testing Library.
- [x] Install `@testing-library/jest-dom`.
- [x] Install `@testing-library/user-event`.
- [x] Install `jsdom`.
- [x] Mock network requests at the transport boundary with MSW.
- [x] Configure Vitest in `vitest.config.ts` or in Vite.
- [x] Register jest-dom matchers in the test setup file.
- [x] Add the `test` watch script.
- [x] Add the `test:run` script for CI.
- [x] Add the `test:coverage` script.
- [x] Exclude generated OpenAPI code from coverage.
- [x] Set initial coverage thresholds for handwritten code and raise them incrementally.

### 8.2. API and Error Tests

- [x] Test `normalizeApiError` with a backend error envelope.
- [x] Test `normalizeApiError` with a network error.
- [x] Preserve status, code, timestamp, and field errors.
- [x] Verify that the API client adds the bearer token and keeps it out of logs.
- [x] Normalize a trailing slash in the API base URL.
- [x] Verify behavior when `VITE_API_BASE_URL` is missing.
- [x] Verify that feature adapters unwrap the `success/data/error/timestamp` envelope.
- [x] Verify that a response without `data` leaves the UI functional.

### 8.3. Authentication and Routing Tests

- [x] Open the landing page without authentication.
- [x] Protect private routes with the Auth0 guard.
- [x] Verify the authentication bootstrap loading state.
- [x] Verify Auth0 initialization errors.
- [x] Verify profile synchronization loading, error, and success states.
- [x] Render protected children after profile synchronization completes.
- [x] Pass `returnTo: window.location.origin` when logging out.
- [x] Verify the intentional 404 route.

### 8.4. Dashboard Tests

- [x] Unwrap the summary from the aggregated API response.
- [x] Verify loading, error, and success states.
- [x] Verify the state without habits.
- [x] Verify the state without a mood check-in.
- [x] Verify completion percentages of zero, partial, and 100%.
- [x] Verify the best streak and weekly mood summary.
- [x] Verify retries after errors.

### 8.5. Habits Tests

- [x] Verify list loading, error, empty, and success states.
- [x] Validate an empty habit name.
- [x] Submit the correct name, icon, and target frequency.
- [x] Add a new habit to the list after successful creation.
- [x] Show creation validation errors to the user.
- [x] Load streaks and map them by habit ID.
- [x] Keep the habit list available when a single streak request fails.

### 8.6. Daily Entry and History Tests

- [x] Preserve the local date key when UTC falls on a different day.
- [x] Populate the initial mood, tags, and note from today's entry.
- [x] Accept mood scores from 1 to 5 only.
- [x] Select and deselect mood tags.
- [x] Verify mood save success and failure.
- [x] Verify habit toggle success and failure.
- [x] Block duplicate mutations while a save is in progress.
- [x] Read history filters `from` and `to` from the URL.
- [x] Reject future dates and reversed date ranges.
- [x] Verify an entry with a habit log and no mood.

### 8.7. Stats Tests

- [x] Send `period=week` as required by the current contract.
- [x] Verify average mood and entry count.
- [x] Map most-missed habit IDs to names.
- [x] Verify the chart with zero, one, and multiple data points.
- [x] Verify the empty state.
- [x] Handle an unknown habit ID with a safe fallback.

### 8.8. Profile and Avatar Tests

- [x] Fall back to the Auth0 picture and then to initials.
- [x] Accept JPEG, PNG, and WebP only.
- [x] Enforce the 5 MB file limit.
- [x] Verify the upload signature payload.
- [x] Send only the intended fields in the Cloudinary multipart payload.
- [x] Extract `version` safely from the Cloudinary response.
- [x] Verify avatar confirmation success and failure.
- [x] Verify content type and size metadata.

### 8.9. Search Tests

- [x] Update `?q=` on submission.
- [x] Update `from` and `to` when date filters change.
- [x] Clear date filters.
- [x] Skip API requests for empty queries.
- [x] Skip API requests for reversed date ranges.
- [x] Prevent stale responses from replacing results for newer queries.
- [x] Render highlights safely as text.
- [x] Link each result to the correct entry date in the journal.

## 9. Performance, Accessibility, and Production Readiness

### 9.1. Route-Based Code Splitting

The production build reported an initial bundle of approximately 545 kB at this checkpoint.

- [x] Dynamically import page components with `React.lazy`.
- [x] Wrap lazy routes in `Suspense` with an `aria-busy` and `aria-live` fallback.
- [x] Keep AppShell in the initial chunk for stable navigation at this checkpoint.
- [x] Verify in the Vite manifest that Landing is separate from the protected application chunk.
- [x] Give Auth0, React Router, and React their own vendor chunks and avoid duplicating the SDK.
- [x] Measure raw, gzip, and Brotli sizes from the Vite manifest after each production build.
- [x] Set budgets for initial JavaScript, CSS, and the largest chunk.
- [x] Keep the existing `chunkSizeWarningLimit` while addressing the warning.

Example of lazy-loading a named export:

```tsx
import { lazy } from 'react'

const StatsPage = lazy(() =>
  import('./features/stats/pages/StatsPage.tsx').then((module) => ({
    default: module.StatsPage,
  })),
)
```

### 9.2. Runtime Performance

- [x] Identify the largest dependencies and chunks with `npm run analyze`.
- [ ] Replace N+1 streak requests when the backend provides a summary or batch endpoint.
- [x] Cancel search and date-filtered requests with `AbortSignal`.
- [x] Prevent older responses from overwriting newer results after rapid filter changes.
- [x] Document the query-cache decision and review criteria in [Frontend Standards](./FRONTEND_STANDARDS.md).
- [ ] Measure Core Web Vitals in a production build.
- [ ] Check layout shift after avatars and application data load.
- [x] Remove unused Vite and React sample assets.

Checkpoint 2 accepted N+1 requests on the Habits page temporarily. Measure p95 with representative history and 10 active habits. Revisit a summary endpoint if p95 exceeds one second or users typically have more than 10 habits.

### 9.3. Error Resilience

- [x] Add an application-level error boundary.
- [x] Provide a fallback for lazy chunk failures and deployment mismatches.
- [x] Offer retry or reload in the error fallback as appropriate.
- [x] Distinguish validation, authentication, network, and server errors.
- [x] Keep mutation feedback visible when another request changes loading state.
- [x] Use an atomic Dashboard summary to avoid partial frontend request handling.
- [x] Handle a single streak request failure without losing the habit list.
- [x] Keep raw internal technical details out of user-facing errors.

### 9.4. Accessibility

- [ ] Run axe or an equivalent tool on every route.
- [ ] Check the full application using only the keyboard.
- [ ] Check focus order in desktop and mobile navigation.
- [x] Move focus appropriately when the create-habit form opens or closes.
- [x] Announce mutation success and failure in stable atomic live regions without repeat announcements.
- [x] Give every loading skeleton an accessible name.
- [x] Provide indicators beyond color alone for mood, success, and errors.
- [ ] Verify contrast in resting, hover, focus, and disabled states.
- [x] Provide a text or table equivalent for Stats charts.
- [x] Respect `prefers-reduced-motion` for pulses, spinners, and transitions.
- [ ] Check 200% zoom and reflow at 320 px.
- [ ] Test form labels, validation, and navigation landmarks with a screen reader.

### 9.5. Responsive and Browser QA

- [ ] Check supported versions of Chrome, Edge, Firefox, and Safari.
- [ ] Check iOS Safari and Android Chrome.
- [ ] Check mobile navigation with safe-area insets.
- [ ] Check 320 px screens, tablets, laptops, and wide desktop displays.
- [ ] Check long text, email addresses, habit names, and localized dates.
- [ ] Confirm that the virtual keyboard leaves forms and submit buttons usable.
- [ ] Check loading, empty, error, and success states at all breakpoints.
- [ ] Check dark mode when product requirements include it.

### 9.6. Security and Privacy

- [x] Keep access tokens, authorization headers, and sensitive responses out of logs.
- [x] Keep handwritten code from storing access tokens in localStorage or sessionStorage.
- [x] Render search highlights as text or sanitize them under an explicit contract.
- [x] Validate avatar source URLs under the agreed HTTPS-only and credential-free policy.
- [ ] Add a Content Security Policy for Auth0 and Cloudinary.
- [ ] Add `Referrer-Policy`, `X-Content-Type-Options`, and relevant hosting security headers.
- [x] Run dependency audits in CI.
- [x] Configure Dependabot for npm and GitHub Actions.
- [x] Set `sourcemap: false` in production builds to keep source maps private.
- [x] Review mood note handling in the [Frontend Privacy Review](./FRONTEND_PRIVACY_REVIEW.md).

### 9.7. Environment and Deployment

- [x] Validate all `VITE_*` variables at application startup or build time.
- [x] Provide environment templates for local development, test, and production.
- [x] Keep server-side secrets out of `VITE_*` variables.
- [ ] Configure SPA fallback or rewrites for all client routes.
- [ ] Configure Auth0 callback, logout, and web origins for production.
- [ ] Configure API CORS for the production origin.
- [ ] Verify that production requires HTTPS.
- [ ] Cache hashed assets and allow `index.html` to refresh.
- [x] Add a deployment smoke check with `npm run smoke:deploy -- <deployment-url>`.
- [x] Document frontend rollback in the [Frontend Release Runbook](./FRONTEND_RELEASE_RUNBOOK.md).

### 9.8. Monitoring and Diagnostics

- [ ] Select an error-monitoring provider and approve it before adding an SDK.
- [ ] Keep mood notes, tokens, and personal data out of monitoring events.
- [ ] Include release or version information in error reports.
- [ ] Track failed API requests by endpoint and status while excluding sensitive bodies.
- [ ] Monitor production Web Vitals if the product requires them.
- [ ] Distinguish frontend, Auth0, backend, and Cloudinary errors.

### 9.9. CI Quality Gates

- [x] Lint pull requests.
- [x] Run TypeScript checks and build pull requests.
- [x] Run unit and component tests on pull requests.
- [x] Enforce coverage thresholds on pull requests.
- [x] Verify the generated API client and fail on output drift.
- [x] Audit dependencies and fail on `high` or greater severity.
- [ ] Run E2E smoke tests in test or preview.
- [ ] Retain Playwright artifacts on failure.
- [ ] Block merges when a required quality gate fails.

### 9.10. Documentation and Repository Maintenance

- [x] Document setup, environment variables, and common commands in the README.
- [x] Document OpenAPI client regeneration.
- [x] Explain that generated files must be changed through the generator.
- [x] Document unit, integration, and E2E commands.
- [x] Document Auth0 setup for local and test environments.
- [x] Remove completed TODOs from the README.
- [x] Remove `src/assets/react.svg`, `src/assets/vite.svg`, and other unused assets.
- [x] Document LF in `.gitattributes` to avoid generator-only line-ending changes.
- [x] Record the decision to keep relative imports and the review criteria for `@/` in [Frontend Standards](./FRONTEND_STANDARDS.md).

## 10. Backend and Product Decisions

- [x] Support only `DAILY` for `targetFrequency`.
- [x] Keep streaks and missed counts based on daily habit logs.
- [x] Support only `period=week` for Stats.
- [x] Use `Asia/Ho_Chi_Minh` as the calendar source and start weeks on Monday.
- [x] Return search highlights as plain text with zero-based, end-exclusive ranges.
- [x] Paginate Entries and Search with zero-based `page` and a maximum `size` of 100.
- [x] Replace Dashboard N+1 streak requests with the summary endpoint.
- [x] Save new avatar metadata before deleting the old Cloudinary asset, and support avatar deletion.

See the [Backend Improvement Checklist](./BACKEND_IMPROVEMENT_CHECKLIST.md).

## Recommended Implementation Order

1. Finalize the backend and product decisions in section 10.
2. Configure Vitest, Testing Library, and MSW.
3. Add API, authentication, and critical mutation tests.
4. Add component and integration tests for each feature.
5. Configure Playwright and E2E smoke flows.
6. Add the error boundary, cancellation, and stale-response protection.
7. Lazy-load routes and set the performance budget.
8. Run accessibility, responsive, and browser QA.
9. Finalize environment setup, security headers, monitoring, and deployment.
10. Run all quality gates in CI.

## Definition of Done for Production Readiness

- [ ] Verify core features with the real backend and Auth0 in test.
- [ ] Resolve all known P0 and P1 issues in critical flows.
- [ ] Pass lint, type checking, build, unit, component, and E2E smoke tests.
- [x] Regenerate the API client from the authoritative OpenAPI contract and verify a clean working tree.
- [x] Keep the initial bundle within its agreed budget.
- [ ] Resolve serious and critical accessibility violations.
- [ ] Complete the security and privacy review.
- [ ] Verify the production environment, SPA routing, Auth0, and CORS.
- [ ] Prepare monitoring and rollback procedures.
- [ ] Confirm that a new contributor can run the project using the README and runbook.

## 11. Handoff for the Remaining Work

Keep secrets, passwords, access tokens, and Auth0 client secrets out of the repository, issues, documentation, and chat. Store them in ignored `.env.*.local` files or the GitHub or hosting provider's secret store. Share configured variable names only.

### 11.1. Project Owner Setup

The local Auth0 and reset setup was completed at checkpoints 1–2. Use sections A and B to verify test and production settings. The existing local account and reset endpoint can be reused for local checks.

#### A. Non-Production Auth0 and E2E Account

1. Create a non-production Auth0 Single Page Application. Local and test may share a tenant without real users. Set up a separate production application or tenant and user store before launch.
2. Register allowed callback URLs, logout URLs, and web origins for the actual local, test, and preview origins.
3. Create a verified synthetic automation account with ordinary Moodly permissions. The test login flow requires an account without MFA, CAPTCHA, or a forced password change.
4. Configure `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `E2E_TEST_USER_EMAIL`, and `E2E_TEST_USER_PASSWORD` in an ignored local environment file or the GitHub `test` environment. The SPA uses public configuration only.

Local sign-in and authenticated Playwright passed. Verify the Auth0 settings and rerun the test suite in the hosted test environment before marking the relevant Definition of Done items complete.

#### B. Backend Integration and Data Reset

1. Provide a test backend reachable from the Playwright runner.
2. Provide a repeatable reset endpoint limited to the fixed synthetic account in non-production, as documented in [Frontend Integration Testing](./FRONTEND_INTEGRATION_TESTING.md).
3. Set `E2E_DATA_RESET_URL` as a variable and `E2E_DATA_RESET_TOKEN` as a secret. Keep both outside `VITE_*`.
4. Decide on an idempotency contract for mutations that need retries and a batch or summary streak endpoint if Habits must eliminate N+1 requests.

The local reset was repeatable, preserved other users' data, and passed the failure and retry flows. Configure test-specific URL and token values and verify them separately. Use test p95 to decide whether Habits needs a summary endpoint.

#### C. Hosting and Test and Production Domains

1. Identify the hosting provider and the test and production domains. Share the provider name and domains without credentials.
2. Deploy the branch or commit to test with all four public `VITE_*` variables.
3. Configure Auth0 origins, API CORS, and Cloudinary delivery for the production origin.
4. Enable HTTPS redirects and HSTS where supported, and establish how to promote or roll back immutable deployments.

After setup, configure SPA fallback, CSP, `Referrer-Policy`, `X-Content-Type-Options`, and cache headers for the provider. Run the deployment smoke check and verify deep links, HTTPS, Auth0, and CORS. Mark sections 9.6, 9.7, and the corresponding Definition of Done items complete when verified.

#### D. GitHub Environments and Branch Protection

1. Create the GitHub `test` environment and configure the variables and secrets required by the workflow and [Frontend Integration Testing](./FRONTEND_INTEGRATION_TESTING.md).
2. Decide which authenticated Playwright artifacts may be retained, who may access them, how long to keep them, and what to redact. The default keeps these artifacts local to protect mood notes, emails, tokens, and session state.
3. Once CI is stable, configure branch protection or a ruleset for the default branch and choose the required checks.

Review the workflow, configure any approved artifact uploads, verify that uploads exclude `playwright/.auth`, and check branch protection. Mark the remaining CI items complete after GitHub confirms the required checks.

#### E. Monitoring and Privacy Approval

1. Select an error-monitoring provider or defer monitoring for the release.
2. If monitoring is enabled, create a project or DSN per environment and approve the allowed fields using the [Frontend Privacy Review](./FRONTEND_PRIVACY_REVIEW.md).
3. Decide whether to collect Web Vitals. Require a separate privacy review before enabling session replay on screens containing mood data.
4. Complete the backend and product policies for mood note retention, deletion, backups, and support access.

Integrate the approved SDK, add release and error-source tags, redact personal data, tokens, and bodies, and add the agreed metrics and tests. Mark section 9.8 and related privacy items complete after verification.

#### F. Manual Accessibility, Responsive, and Browser QA

1. Prepare Chrome, Edge, Firefox, Safari, iOS Safari, and Android Chrome on physical devices or an approved device service.
2. With synthetic data, test keyboard-only navigation, screen readers, 200% zoom, 320 px reflow, focus order, virtual keyboards, and contrast.
3. Record the browser, OS, viewport, route, data state, and evidence for each failure. Keep real user data out of screenshots and uploaded artifacts.

Triage reproducible issues, add regression or axe tests as appropriate, and rerun the quality gates. Mark sections 9.4 and 9.5 complete as their checks pass.

### 11.2. Information for the Handoff

- Confirm whether the test Auth0 application and synthetic account are configured.
- List configured environment variable and secret names and the environments that contain them. Omit values.
- Provide the test URL, public API base URL, hosting provider, and default branch.
- Confirm whether the test backend has synthetic account reset enabled and whether streak p95 has been measured.
- Confirm whether the monitoring provider and artifact policy have been approved.
- Provide manual QA results or an internal report link that contains no sensitive data.

### 11.3. Checklist Update Rules

- Leave items unchecked until the configuration has been verified.
- Mark an item complete when there is appropriate evidence, such as a passing automated test, deployment check, required CI check, or manual QA record.
- Keep separate functional changes in separate commits even if one verification run covers several checklist items. Update relevant checkboxes with their implementation if appropriate.
- Leave failed items unchecked, record the blocker, and fix it before rerunning.
- After each round of work, review the detailed checklist and synchronize the Definition of Done with the results.
