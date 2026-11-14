# Shared workstation env and Docker presentation — 2026-11-14

## Result

- One ignored `.env.local`, template `.env.local.example`, for both local and test.
  Four public variables were equal before migration. Four E2E values were copied,
  parsed and compared again before the old ignored test file was removed. Values
  were never printed. The committed test template was retired.
- Production/analyze read production inputs only; process-only CI remains supported.
- Workstation FE always uses 127.0.0.1:5173 for Vite/Nginx, local/test. One server
  runs at a time. Make selects e2e-dev/e2e-container without runner switches in env.
- Reset now matches actual sibling BE E2eResetController/E2eUserResetService: opt-in,
  non-production, token-authenticated, fixed server-configured synthetic subject.
  Removed the unimplemented capabilities/namespace requirement from FE and CI.
  Same-origin/exact-path checks, no redirects, synthetic credentials and explicit
  HTTPS remote-write authorization remain. FE does not claim database isolation.
- Compose project and FE container both have stable moodly-frontend-local names.
  Backend remains moodly-backend-local with MongoDB/ES and optional BE application.
  Image version tags remain useful and are not separate running stacks.

## Verification

- make verify: 49 environment/reset/migration safety tests, ESLint, 149 tests,
  coverage thresholds, TypeScript, optimized build and bundle budget PASS.
- Actual Docker test build from shared .env.local: healthy, non-root/read-only,
  host port 5173; health/SPA/assets/cache/404/log privacy smoke PASS.
- Public Playwright: 3/3 on Nginx and 3/3 on owned Vite at the same origin PASS.
- Scanned generated dist against private E2E values: no credential leak found.
- BE health: ECONNREFUSED; authenticated E2E was NOT run. No reset request was sent.
- FE stopped and retained after verification; no image/volume pruning and no BE
  service/source/data changes. Auth0 dashboard settings were not changed.

The earlier local/test alignment reports describe historical designs and checks.
Current behavior and requirements are in FRONTEND_INTEGRATION_TESTING.md and
RUNNING_FE_AND_BE.md; the former proposed namespace-attestation contract is retired.
