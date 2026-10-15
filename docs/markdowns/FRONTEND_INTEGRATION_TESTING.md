# Frontend integration test environment

This environment is isolated from production and must contain synthetic data only. Copy
`.env.integration.example` to the ignored `.env.integration.local` file for local runs.
`playwright.config.ts` loads that file automatically; explicit process/CI variables take
precedence. Never commit test passwords, Auth0 client secrets, reset tokens, access
tokens, or captured authenticated browser state.

## Environment inputs

The repository provides the runner, tests, and configuration contract. Supply
the following values through ignored local env files or CI/hosting secret stores:

| Input | Required value / owner |
| --- | --- |
| `VITE_AUTH0_DOMAIN` | Domain of the isolated Auth0 test tenant/application. |
| `VITE_AUTH0_CLIENT_ID` | Public client ID of the Auth0 SPA; this is not a client secret. |
| `VITE_AUTH0_AUDIENCE` | Audience of the integration backend API. |
| `VITE_API_BASE_URL` | Reachable integration backend base URL, without a secret. |
| `E2E_BASE_URL` | Optional frontend origin. Leave unset for auto-started local Vite; set it for an already-running frontend or staging. |
| `E2E_TEST_USER_EMAIL` | Synthetic Auth0 database-connection user stored locally or in CI secrets. |
| `E2E_TEST_USER_PASSWORD` | Password for that synthetic user, stored only as a secret. |
| `E2E_DATA_RESET_URL` | Absolute URL of the non-production reset endpoint. |
| `E2E_DATA_RESET_TOKEN` | Server-side reset credential stored only as a secret. |

Local status (2026-10-15): the non-production Auth0 application, synthetic account,
backend, and reset service are configured outside Git; the authenticated E2E suite
passed 13/13. The repository intentionally contains no E2E credentials or reset token.
Provision and verify staging separately before running its suite.

## Auth0 application

Create a dedicated **Single Page Application** or test tenant for browser automation. It
must not share users with production. Configure these URLs for the actual E2E origin:

- Allowed callback URL: `<E2E_BASE_URL>`
- Allowed logout URL: `<E2E_BASE_URL>`
- Allowed web origin: `<E2E_BASE_URL>`

Create one least-privilege synthetic user for the smoke suite. Store its email and
password in the CI secret store as `E2E_TEST_USER_EMAIL` and
`E2E_TEST_USER_PASSWORD`. Use an Auth0 database connection supported by Universal Login;
the automated setup expects username/email and password controls. Disable MFA, CAPTCHA,
social-login prompts, and forced password changes for this isolated account, or replace
`e2e/auth.setup.ts` with an approved machine-assisted login flow. The user should be
email-verified and have only normal Moodly user permissions.

The Playwright setup creates `playwright/.auth/user.json` at runtime. The directory is
ignored by Git and must be treated as credential material. Do not upload this file as a
CI artifact.

## Backend test data contract

The backend provides `POST /internal/e2e/reset`, disabled by default and excluded from
the `prod` and `production` profiles. Before each isolated E2E run it:

1. Resolves the synthetic Auth0 subject from server configuration, never from the request.
2. Deletes only that subject's habits, daily entries, and search documents. It leaves
   the Auth0 account and application profile untouched.
3. Seeds a deterministic baseline of 2 habits and 3 entries, then refreshes and verifies
   all three search documents before returning success.

Configure its URL and credential as `E2E_DATA_RESET_URL` and
`E2E_DATA_RESET_TOKEN`. These are runner-side variables and must never use the `VITE_`
prefix. Reset operations must be idempotent and scoped to the synthetic account.

The current runner calls the endpoint as follows:

```http
POST <E2E_DATA_RESET_URL>
X-E2E-Reset-Token: <E2E_DATA_RESET_TOKEN>
```

Any `2xx` response is accepted. A non-`2xx` response fails the authenticated suite
before browser scenarios start. A missing or wrong reset token returns `403`.
`MOODLY_E2E_USER_ID` on the backend fixes the target subject; the browser test cannot
choose another user. Two resets must return the same 2-habit/3-entry baseline and
`searchIndexing: "verified"` without changing other users' data. The smoke flow may
create its own habit, mood entry, completion, avatar, and search result.

## Local startup order

1. Install the browser once with `npx playwright install chromium`.
2. Start backend dependencies and the backend integration profile.
3. Verify the backend health and reset endpoints from the test machine.
4. Copy `.env.integration.example` to `.env.integration.local`, fill the required values, and leave `E2E_BASE_URL` unset for auto-started local Vite.
5. Run `npm run test:e2e`; Playwright starts Vite in integration mode automatically.

Useful commands:

```bash
# Public routes only; does not require the test account or reset service
npx playwright test --project=public

# Full suite, including auth setup, smoke flows, and failure paths
npm run test:e2e

# Interactive local debugging
npm run test:e2e:ui
```

For CI, use the same order and wait for explicit health checks instead of fixed sleeps.
Keep Playwright traces, screenshots, and videos only for failed or retried tests.

## Completion checks

- Opening `/` does not start an Auth0 redirect.
- Opening `/dashboard` returns to `/dashboard` after authentication.
- Profile synchronization finishes before the first protected feature request.
- Resetting twice produces the same baseline and never modifies another user.
- No secret or authenticated storage-state file appears in `git status`.

The public project is locally runnable without external credentials. The full local
E2E suite passed against the provisioned Auth0 tenant and integration backend on
2026-10-15 (13/13). Staging remains unverified.
