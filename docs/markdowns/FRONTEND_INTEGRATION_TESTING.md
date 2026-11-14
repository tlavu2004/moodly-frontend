# Local/test frontend contract

Only local, test and production are application environments. `dev`, `container`
and `remote` below select how E2E reaches the frontend, not new environments.
This document supersedes the historical 2026-10-15 E2E results in older checklists;
those results do not validate the protected namespace contract introduced here.

## Ownership and configuration

- FE Compose project: `moodly-frontend-local` for both local and test, used alternately.
- BE Compose project: `moodly-backend-local`, owned and operated in the BE repository.
- FE never starts/stops BE infrastructure, creates MongoDB/Elasticsearch, removes
  volumes or resets developer/production data. Shared infrastructure must have
  separate databases, search indexes, test subject and scoped cleanup credentials.
- Keep `.env.local` and `.env.test.local` separate. Never commit their contents.
- Vite dev server and Nginx container are alternate serving methods. Stop the one
  you own before starting the other on its port. Do not kill a process just because
  it occupies the expected port.

| Mode | Frontend origin | Listener | Browser API URL |
| --- | --- | --- | --- |
| Local Vite | `http://127.0.0.1:5173` | host 5173, strict | `.env.local` public `VITE_API_BASE_URL` |
| Local Nginx (`make ... MOODLY_ENV=local`) | `http://127.0.0.1:5173` | host 5173 -> container 8080 | same local value, embedded during build |
| Test Vite/E2E dev | `http://127.0.0.1:4173` | host 4173, strict | `.env.test.local` public `VITE_API_BASE_URL` |
| Test Nginx/E2E container | `http://127.0.0.1:4173` | host 4173 -> container 8080 | same test value, embedded during build |
| Remote test | explicit HTTPS `E2E_BASE_URL` | hosting-owned | public test API embedded in deployed bundle |
| Production | hosting production origin | hosting-owned | public HTTPS production API embedded during build |

BE API host ports are not invented by FE. BE must publish separate local/test
browser-reachable endpoints (for example different host ports) and confirm them.
Never use Docker-only names such as `backend`, `moodly-backend` or
`host.docker.internal` as the browser API URL. Nginx serves static assets and does
not proxy API calls. BE's internal Docker service addresses belong in BE config.

Auth0 callback, logout and web-origin allowlists must contain the exact applicable
FE origin above. BE CORS must allow those exact origins for the appropriate API;
`localhost` and `127.0.0.1` are different origins. Coordinate the local-origin change
from the former `localhost:5173` with the dashboard owner. Do not add wildcards.
The app uses `window.location.origin` for callback and logout. No hosted settings
are changed by this repository update.

## Commands

```sh
npm run dev                         # local env; 127.0.0.1:5173
make test-run                       # test env; 127.0.0.1:4173
npm run test:run                     # no Docker
npm run test:coverage                # no Docker
npm run test:build-config
npm run lint
npm run build

make docker-up MOODLY_ENV=local      # rebuild local image; host 5173
make docker-up                      # rebuild test image; host 4173
make docker-status
make docker-stop                    # FE only; leaves stack in place

# Direct Compose defaults to test at 4173. Explicit local equivalent:
# MOODLY_ENV=local FRONTEND_PORT=5173 must also be set in the process.
docker compose --env-file .env.local up -d --build --wait

docker compose --env-file .env.test.local up -d --build --wait
node scripts/container-smoke.mjs http://127.0.0.1:4173

# Owned Vite, no reuse even outside CI:
npx playwright test --project=public
npm run test:e2e                     # requires valid BE/auth contract below
```

For an existing Nginx test container, set `E2E_TARGET=container` in the runner
process, then run either Playwright command. For remote public checks set
`E2E_TARGET=remote` and an explicit HTTPS `E2E_BASE_URL`. An explicit URL no longer
silently disables the owned Vite server. Workstation E2E uses only 127.0.0.1:4173.
Never run authenticated remote checks without authorization for that run;
`E2E_ALLOW_REMOTE_WRITES=1` is additionally required by the runner.

The four public variables `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`,
`VITE_AUTH0_AUDIENCE`, `VITE_API_BASE_URL` are the only custom Vite values embedded.
All are public. Passwords/reset credentials never use `VITE_`.
`MOODLY_ENV` selects local/test/production env files for deploy builds and validation;
Vite still generates an optimized static bundle. Changing container runtime env
cannot change that bundle. Switch local/test with a rebuild (`make docker-up`),
not `docker compose start`. Restart dev Vite after env changes.
`/moodly-config.json` records build-time public identity, not runtime configuration.
E2E preflight rejects the wrong environment, serving type or any mismatched public
value. `MOODLY_ENV_SOURCE=process` skips reading env files for synthetic verification.

## Authentication and lifecycle

Use a dedicated Auth0 test SPA/account, never the developer account. Playwright
uses fresh contexts; every invocation generates a unique ignored auth directory.
Auth setup checks the BE contract before visiting the protected page (profile sync
can write data), then saves storageState and the app's sessionStorage cache.
Teardown deletes only that run's two auth files on completion/failure/normal Ctrl+C.
A force-killed process can leave ignored credential files; a new invocation never
loads them. Protect these files and do not upload auth directories or token-bearing
traces to CI artifacts. Ordinary local browser sessions are never imported.

Playwright owns only the Vite process it starts. Occupied port fails rather than
reusing or killing another server. Existing container/remote targets remain running
on success, failure and cancellation. No BE stop or data cleanup runs on exit.
Public tests do not call reset or authenticate against Auth0 (authorize is intercepted).

## BE coordination blocker: protected test reset contract

The prior token-only reset endpoint is insufficient evidence of namespace safety.
Authenticated E2E now fails closed until BE implements and validates this contract:

1. Supply distinct test API, `E2E_TEST_CONTRACT_URL`, `E2E_DATA_RESET_URL`,
   `E2E_NAMESPACE`, scoped `E2E_DATA_RESET_TOKEN`, dedicated test account email/password.
2. Contract GET and reset POST must share the configured browser API origin. Neither
   follows redirects. Both carry `X-E2E-Reset-Token` and `X-E2E-Namespace`.
3. Authenticated GET returns 200 JSON exactly attesting the configured endpoints:

```json
{
  "environment": "test",
  "namespace": "the-configured-namespace",
  "protected": true,
  "cleanupScope": "namespace",
  "testUserEmail": "dedicated-synthetic-user@example.com",
  "apiBaseUrl": "http://127.0.0.1:TEST_PORT/",
  "resetUrl": "http://127.0.0.1:TEST_PORT/internal/e2e/reset"
}
```

URLs use canonical absolute URL formatting (origin-only API has a trailing slash).
This is a proposed required contract, not a claim that BE already implements it.
BE must enforce test mode, token-to-namespace binding, fixed dedicated Auth0 subject,
and attest the exact configured test account email before FE attempts login,
separate database/index namespaces and refusal of local/production/global cleanup
on the POST itself. A client-supplied namespace alone grants no permission.
POST includes `{ "namespace": "the-configured-namespace" }`; successful 2xx must
mean scoped reset completed. Existing deterministic baseline remains 2 habits and
3 entries with verified search indexing, leaving other users/data untouched.
BE must test wrong token/namespace, local/production rejection and two idempotent
resets. FE does not probe reset merely to discover whether it is safe.

Validate Vite and Nginx independently. Public browser tests do not prove backend
integration; static health checks do not prove Auth0/API readiness. Record missing
credentials/BE contract as blockers rather than claiming authenticated coverage.
