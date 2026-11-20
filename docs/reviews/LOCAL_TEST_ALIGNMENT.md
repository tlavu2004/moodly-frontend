# Local/test architecture alignment review — 2026-11-14

Branch: `chore/align-local-test-environments`. Scope: frontend repository only.
No AGENTS.md was found in the repository or checked ancestor directories.
No real env file was inspected/edited, hosted setting changed, deployment performed,
BE repository modified, reset sent, volume removed or BE service stopped.

## Findings and changes

- Compose previously derived separate projects from MOODLY_ENV, including
  `moodly-frontend-test`. It now declares `moodly-frontend-local`; Make explicitly
  uses that project for all environments. No legacy stack was discovered or removed.
- Keep all three env templates and separate local/test files. Make local-run/test-run
  explicitly select their own environment. Local origin is now consistently
  `http://127.0.0.1:5173`; test uses `http://127.0.0.1:4173`. Coordinate this exact
  local origin with Auth0/CORS owners before authenticated local use.
- Build validation previously always read production files. Deploy build now passes
  one selected environment through validation and Vite. Configured dev/build paths
  reject Docker-only API hostnames. Only the four documented public VITE variables
  are injected; implicit VITE prefix exposure is disabled. No runtime-config scheme
  was introduced: changing static public config requires rebuilding.
- Playwright previously inferred remote from E2E_BASE_URL and reused an occupied
  server outside CI. It now selects dev/container/remote explicitly, never reuses
  the owned dev server, and checks build-time identity before any browser scenario.
- Auth storage uses a new directory per invocation, fresh contexts and a dedicated
  test account. Teardown removes only the current run's known auth files.
- Token-only reset was unsafe evidence of cleanup authority. The new client refuses
  authentication/reset without BE attestation of test environment, protected namespace,
  exact endpoints, scoped cleanup and the exact dedicated test account email. BE must
  enforce that contract on POST; client assertions cannot provide server isolation.
- Nginx remains non-root/read-only with tmpfs, dropped capabilities, health and cache
  checks. Build identity JSON is public and uncached. Vercel's source routing exempts
  this static file; hosted behavior was not exercised.
- CI separately tests public Vite and Nginx. Hosted authenticated writes require an
  explicit opt-in workflow_dispatch input, plus the protected namespace contract.

## File disposition

No file was deleted and no framework migrated.

| Disposition | Files |
| --- | --- |
| Retained, updated runtime/build | `compose.yaml`, `Dockerfile`, `Makefile`, `vite.config.ts`, `docker/nginx.conf`, `vercel.json`, `package.json` |
| Retained, updated env contracts | `.env.local.example`, `.env.test.example`, `.env.production.example` |
| Retained, updated helpers/tests | `scripts/load-environment.*`, `scripts/validate-build-env.*`, `scripts/container-smoke.mjs`, `playwright.config.ts`, `e2e/auth.setup.ts`, `e2e/support/authSession.ts`, `e2e/support/reset.ts` |
| Added | `scripts/build-deploy.mjs`, `scripts/validate-build-env.d.mts`, `scripts/e2e-safety.test.mjs`, `e2e/support/preflight.ts`, `e2e/support/teardown.ts`, this review |
| Retained, updated CI/docs | `.github/workflows/frontend-ci.yml`, `README.md`, `docs/markdowns/FRONTEND_INTEGRATION_TESTING.md` |
| Audited, unchanged | API client, Auth0 provider/cache/logout, unit/component tests, bundle budget script, image identity and postdeploy scripts, Docker ignore rules |

The integration document now describes the current contract rather than presenting
historical authenticated results as evidence for the new architecture. Broad docs
language cleanup and historical checklist rewrites were excluded.

## Verification results

All workstation checks used explicit synthetic public configuration. Node host:
24.22.2; Docker builder: pinned Node 22 image. No real credential was loaded.

| Check | Result |
| --- | --- |
| Unit/component suite via coverage | 32 files, 149 tests PASS |
| Coverage | lines 88.30%, statements 85.99%, branches 81.67%, functions 79.09%; existing thresholds unchanged |
| Build/environment/reset/auth cleanup checks | 42 PASS, including local/production/mismatched namespace/account rejection, token origin restriction and per-run cleanup |
| ESLint, TypeScript build | PASS |
| Bundle budget | PASS; initial JS 496.49 KiB raw / 151.13 KiB gzip |
| Docker test image build + Compose readiness | PASS; project moodly-frontend-local, user nginx, readOnly=true, healthy |
| Nginx smoke | PASS health, SPA fallback, asset/cache/404, query-redacted logs; exact synthetic browser API embedded in JavaScript and build identity |
| Public Playwright on owned Vite | 3/3 PASS |
| Public Playwright on actual Nginx image | 3/3 PASS |
| Wrong server / stale bundle | PASS expected refusal: dev with occupied container port; container with mismatched API URL |
| Local/test switch | PASS same project test -> local image at 5173/API 8081 -> rebuilt test image at 4173/API 8082; API ports are synthetic, not a confirmed BE contract |
| Test failure cleanup | PASS intentional 1ms test timeouts; owned Vite listener removed |
| Ctrl+C cleanup | PASS actual terminal cancellation with temporary synthetic-auth fixture; both run auth files and directory removed; owned Vite listener removed |
| Previous-run auth protection | PASS cleanup test leaves a separate synthetic previous-run directory untouched |
| Hosted/authenticated E2E | NOT RUN; no authorization for hosted writes; protected BE contract and valid credentials not verified |
| CI execution / hosted routing | NOT RUN; workflow updated, local checks only |

The temporary lifecycle test was removed after observation. The initial sandboxed
Vite attempt could not open its listener; public checks passed outside the sandbox.
Docker npm ci reported 13 moderate vulnerabilities; dependency remediation is outside
this change. No migration/audit fix was applied.

FE container was stopped after verification; image, container and network retained.
No routine down or exit-time BE cleanup was added. Force-kill/power loss can bypass
teardown; ignored auth remnants must be protected and are never reused by new runs.

## Commands, matrix and BE follow-up

See [the integration contract](../markdowns/FRONTEND_INTEGRATION_TESTING.md) for the
full origin/API matrix, commands, exact required reset response and BE acceptance
checks. Required coordination: BE project ownership; separately published browser
local/test API URLs; exact CORS origins; isolated test database/search namespace and
subject; namespace-scoped reset credential; test-only attestation/reset enforcement;
Auth0 owner confirmation of callback/logout/web origins and dedicated test account.
