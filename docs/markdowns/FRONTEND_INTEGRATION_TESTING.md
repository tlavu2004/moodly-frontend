# Frontend integration and E2E

## Configuration

Workstation local/test share `.env.local` (template `.env.local.example`).
No `.env.test` or `.env.test.local` is needed. Four public VITE variables configure
Auth0/API. Four optional runner-only variables configure authenticated E2E:

```dotenv
E2E_TEST_USER_EMAIL=
E2E_TEST_USER_PASSWORD=
E2E_DATA_RESET_URL=
E2E_DATA_RESET_TOKEN=
```

The test user must be a synthetic account whose Auth0 subject matches BE's configured
`MOODLY_E2E_USER_ID`; never use your real journal account. The account's credentials
are not exposed to Vite or Docker build arguments. Production never reads `.env.local`.
CI receives values explicitly through its test environment, not committed env files.

## One frontend origin

Every workstation mode uses `http://127.0.0.1:5173`: local/test, Vite/Nginx.
Stop the server you own before switching; Playwright never adopts an unknown server.
FE execution mode and server type are checked using `/moodly-config.json` before tests.
API host/port comes from VITE_API_BASE_URL; sharing FE port does not isolate BE data.
Auth0 callback/logout/web origins and backend CORS must permit the exact origin.
See [Auth0 setup](./AUTH0_LOCAL_SETUP.md).

## Commands (FE repository)

```sh
make verify
# Public only, owns Vite and cleans it up afterwards; port 5173 must be free
npx playwright test --project=public

# Full suite on owned Vite, requires BE and synthetic credentials
make e2e-dev

# Full suite on existing Nginx; stop Vite first
make test-container-up
make e2e-container
make local-container-stop
```

Make supplies E2E_TARGET for each invocation. Do not add E2E_TARGET/E2E_BASE_URL to
.env.local. They are runner switches, not additional required environment inputs.
Auth state gets a new per-run ignored directory; teardown removes only that run's
known files. Do not upload authenticated storage state, video/trace or sensitive notes.

## Actual backend reset contract

The checked-in sibling BE implements `POST /internal/e2e/reset` with
`X-E2E-Reset-Token`. The controller/service are disabled for prod/production and opt-in
elsewhere. The target userId is server-configured and cannot be supplied by the FE.
The service deletes/seeds only that fixed synthetic subject. It seeds 2 habits/3
entries and verifies search indexing. Do not enable/configure it for a real user.

FE checks the four runner inputs, exact reset path, same API origin, no URL
credentials/query/fragment and no redirects before sending a reset token. Local runs
are restricted to loopback unless explicitly authorized as remote. A failure/403
stops the suite; there is no retry against another endpoint or reset target.

There is no BE capabilities/namespace-attestation endpoint in this implementation.
The former proposed E2E_NAMESPACE/E2E_TEST_CONTRACT_URL requirements have been removed;
FE does not invent endpoint variables for contracts BE has not implemented. These
client checks cannot prove database isolation: the BE owner must configure the fixed
synthetic subject and choose the correct local/test data namespace. Use the BE test
launcher where appropriate, never a production deployment.

## Remote (optional, separately authorized)

Remote mode remains available in CI or explicit process inputs; it is not in the
workstation template. Configure a test frontend URL and test backend/synthetic account.
The backend must enforce its non-production/fixed-account restrictions. No production
writes are permitted. HTTPS and E2E_ALLOW_REMOTE_WRITES=1 are required; keep the flag
out of .env.local and supply it only for the authorized run. CI workflow_dispatch asks
for authenticated_remote explicitly, default false.

## Troubleshooting

- Port occupied: stop the Vite/Nginx instance you started; do not enable server reuse.
- Build identity mismatch: rebuild the container with the current shared public config.
- Auth0 callback mismatch: verify the SPA/client ID and allowlist 127.0.0.1:5173.
- API CORS: restart BE after updating its allowlist; Auth0 settings do not set API CORS.
- Reset 403/unavailable: check BE opt-in reset configuration and token on the dedicated
  synthetic account. Do not disable FE validation or redirect tokens to another URL.
- Scope the tests you actually ran; public-only does not establish authenticated coverage.
