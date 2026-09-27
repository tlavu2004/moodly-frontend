# Moodly frontend

React frontend for Moodly's mood journal, daily habits, insights, profile, and search
experiences. The application uses Vite, TypeScript, Auth0, and the generated Moodly API
client.

## Prerequisites

- Node.js 22 or newer.
- npm matching the installed Node.js runtime.
- A reachable Moodly backend.
- Auth0 SPA configuration for the target environment.

## Local setup

1. Install dependencies with `npm ci`.
2. Copy `.env.development.example` to `.env.development.local`.
3. Fill all four `VITE_*` values. They are validated when the application starts.
4. Start the frontend with `npm run dev -- --mode development`.

Do not use a catch-all `.env.local` for Moodly. Vite loads that file in every mode, so a
production build made on a developer machine could accidentally inherit local Auth0 or
API values. Keep real local values scoped to the mode-specific ignored files instead.

### Environment layout

| Environment | Real values live in | Committed contract |
| --- | --- | --- |
| Local development | `.env.development.local` | `.env.development.example` |
| Local integration/E2E | `.env.integration.local` | `.env.integration.example` |
| Staging | Hosting/GitHub `staging` variables and secrets | `.env.staging.example` |
| Production | Hosting production variables and secret store | `.env.production.example` |

The browser-visible variables required in every frontend mode are:

```dotenv
VITE_AUTH0_DOMAIN=
VITE_AUTH0_CLIENT_ID=
VITE_AUTH0_AUDIENCE=
VITE_API_BASE_URL=
```

`VITE_AUTH0_DOMAIN` and `VITE_AUTH0_CLIENT_ID` come from the Auth0 SPA settings.
`VITE_AUTH0_AUDIENCE` is the Identifier of the Auth0 API used by the backend.
`VITE_API_BASE_URL` is the reachable backend origin without a trailing slash.

Never put client secrets, passwords, reset tokens, access tokens, database credentials,
or Cloudinary API secrets in a `VITE_*` variable because Vite exposes those values to
the browser bundle.

### Local development environment

Create the ignored development file once:

```powershell
Copy-Item .env.development.example .env.development.local
```

Fill its four `VITE_*` values and run:

```powershell
npm run dev -- --mode development
```

The expected local frontend origin is `http://localhost:5173`. The backend CORS list and
Auth0 callback, logout, and web-origin lists must contain that exact origin.

### Local integration and E2E environment

Create the ignored integration file separately:

```powershell
Copy-Item .env.integration.example .env.integration.local
```

It contains the same four `VITE_*` values plus runner-only settings:

```dotenv
E2E_TEST_USER_EMAIL=
E2E_TEST_USER_PASSWORD=
E2E_DATA_RESET_URL=
E2E_DATA_RESET_TOKEN=
```

The E2E variables are consumed by Playwright/Node and must never be prefixed with
`VITE_`. Leave `E2E_BASE_URL` unset for a normal local run; Playwright then starts Vite
at `http://127.0.0.1:4173`. Set `E2E_BASE_URL` only when the frontend is already running
or when the suite should target a remote staging deployment.

Auth0 callback, logout, and web-origin lists and backend CORS must also contain
`http://127.0.0.1:4173` for local authenticated E2E.

### Staging and production

The staging and production example files document required browser-visible variables;
they are not places to store real deployed values. Configure real values in the hosting
provider and GitHub environment. Store E2E passwords/reset tokens only in the GitHub
`staging` secret store, and never create or commit a production env file containing
credentials.

Before committing, confirm that local files remain ignored:

```powershell
git status --short --ignored -- .env.development.local .env.integration.local
```

Both files should appear with the ignored marker `!!`, never as tracked or untracked
content.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev -- --mode development` | Start Vite with `.env.development.local`. |
| `npm run build` | Type-check, build, and enforce bundle budgets. |
| `npm run lint` | Run ESLint. |
| `npm run test` | Run Vitest in watch mode. |
| `npm run test:run` | Run unit/component tests once. |
| `npm run test:coverage` | Run tests with coverage thresholds. |
| `npm run test:e2e` | Run the complete Playwright suite. |
| `npm run test:e2e:ui` | Debug Playwright interactively. |
| `npm run smoke:deploy -- https://your-deployment.example` | Verify the deployed app shell and SPA fallback. |
| `npm run analyze` | Generate `reports/bundle.html`. |
| `npm run generate:api` | Regenerate the OpenAPI client. |

Authenticated E2E requires an isolated Auth0 test account and backend reset endpoint.
See [`docs/markdowns/FRONTEND_INTEGRATION_TESTING.md`](./docs/markdowns/FRONTEND_INTEGRATION_TESTING.md)
for the required inputs and startup sequence.

## API client generation

Run `npm run generate:api` after the backend OpenAPI contract changes. The command reads `../moodly-backend/docs/api/moodly-openapi.json` and refreshes the committed files under `src/api/openapi/`.

Files under `src/api/openapi/` are generated artifacts and must not be edited manually.
Change the backend OpenAPI source, run the generator, then review and commit the generated
diff together with the handwritten adapters that consume it.

Release verification and rollback steps are documented in [the frontend release runbook](docs/markdowns/FRONTEND_RELEASE_RUNBOOK.md).
The handling rules for mood notes and other sensitive browser data are documented in [the frontend privacy review](docs/markdowns/FRONTEND_PRIVACY_REVIEW.md).
