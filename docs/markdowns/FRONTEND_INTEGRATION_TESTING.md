# Frontend integration test environment

This environment is isolated from production and must contain synthetic data only. Copy
`.env.integration.example` to the ignored `.env.integration.local` file and supply values
through the local shell or CI secret store. Never commit test passwords, Auth0 client
secrets, reset tokens, access tokens, or captured authenticated browser state.

## Auth0 application

Create a dedicated **Single Page Application** or test tenant for browser automation. It
must not share users with production. Configure these URLs for the actual E2E origin:

- Allowed callback URL: `<E2E_BASE_URL>`
- Allowed logout URL: `<E2E_BASE_URL>`
- Allowed web origin: `<E2E_BASE_URL>`

Create one least-privilege synthetic user for the smoke suite. Store its email and
password in the CI secret store as `E2E_TEST_USER_EMAIL` and
`E2E_TEST_USER_PASSWORD`. The future Playwright setup must create authenticated storage
state at runtime and keep that file ignored.

## Backend test data contract

The backend integration environment must expose an authenticated seed/reset mechanism
that is unavailable in production. Before each isolated E2E run it must:

1. Resolve the synthetic Auth0 subject to one test profile.
2. Delete that profile's entries, habit logs, habits, avatar metadata, and search data.
3. Recreate a deterministic baseline and wait for search indexing to finish.
4. Return success only after reads observe the seeded state.

Configure its URL and credential as `E2E_DATA_RESET_URL` and
`E2E_DATA_RESET_TOKEN`. These are runner-side variables and must never use the `VITE_`
prefix. Reset operations must be idempotent and scoped to the synthetic account.

## Local startup order

1. Start backend dependencies and the backend integration profile.
2. Invoke the backend reset mechanism and verify its health endpoint.
3. Start the frontend with `vite --mode integration` using integration values.
4. Run the Playwright suite after its setup is added in checklist item 7.2.

For CI, use the same order and wait for explicit health checks instead of fixed sleeps.
Keep Playwright traces, screenshots, and videos only for failed or retried tests.

## Completion checks

- Opening `/` does not start an Auth0 redirect.
- Opening `/dashboard` returns to `/dashboard` after authentication.
- Profile synchronization finishes before the first protected feature request.
- Resetting twice produces the same baseline and never modifies another user.
- No secret or authenticated storage-state file appears in `git status`.
