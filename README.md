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
2. Copy `.env.local.example` to `.env.local`.
3. Fill all four `VITE_*` values. They are validated when the application starts.
4. Start the frontend with `npm run dev -- --mode development`.

Local values live in ignored `.env.local`; commit only `.env.local.example`.
Automatic Vite env-file loading is disabled. A shared loader selects `.env.local`
only for development; test and production read only their own mode-specific files.
Explicit process/CI variables take precedence. Values use Node dotenv syntax and are
literal: `${VAR}` expansion is not supported. Restart Vite after editing env files.

### Environment layout

| Environment | Real values live in | Committed contract |
| --- | --- | --- |
| Local development | `.env.local` | `.env.local.example` |
| Test (local E2E or deployed) | `.env.test.local` or hosting/GitHub `test` variables and secrets | `.env.test.example` |
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
Copy-Item .env.local.example .env.local
```

Fill its four `VITE_*` values and run:

```powershell
npm run dev -- --mode development
```

The expected local frontend origin is `http://localhost:5173`. The backend CORS list and
Auth0 callback, logout, and web-origin lists must contain that exact origin.

### Test and E2E environment

Create the ignored test file separately:

```powershell
Copy-Item .env.test.example .env.test.local
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
or when the suite should target a remote test deployment.

Auth0 callback, logout, and web-origin lists and backend CORS must also contain
`http://127.0.0.1:4173` for local authenticated E2E.

### Test and production

The test template also includes runner-only E2E inputs. Both templates document browser-visible variables;
they are not places to store real deployed values. Configure real values in the hosting
provider and GitHub environment. Store E2E passwords/reset tokens only in the GitHub
`test` secret store, and never create or commit a production env file containing
credentials.

Before committing, confirm that local files remain ignored:

```powershell
git status --short --ignored -- .env.local .env.test.local
```

Both files should appear with the ignored marker `!!`, never as tracked or untracked
content.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev -- --mode development` | Start Vite with `.env.local`. |
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

Run `npm run generate:api` after the backend OpenAPI contract changes. The command reads `../moodly-backend/docs/api/json/moodly-openapi.json` and refreshes the committed files under `src/api/openapi/`.

Files under `src/api/openapi/` are generated artifacts and must not be edited manually.
Change the backend OpenAPI source, run the generator, then review and commit the generated
diff together with the handwritten adapters that consume it.

## Mutation retries

The browser client does not automatically retry write requests after a network
failure, timeout, or server error. A lost response does not prove that the write
failed. In particular, `POST /habits` has no idempotency key; submitting it
again can create another habit. The creation form asks users to check their
habits before trying again when the outcome is unknown.

Habit update, archive, and restore requests must send the latest `version`.
On HTTP 409, fetch the current habit and decide whether to apply the change
again; do not replay the old request automatically.

## Habit streak loading

The Habits page makes one list request and one parallel streak request per
active habit. This N+1 pattern is accepted temporarily for small habit lists.
If one streak request fails, its card shows “Streak unavailable” while the
other streaks remain visible. Recheck this choice during test performance
testing with representative history and 10 active habits; move to a summary
endpoint if the Habits page exceeds a 1-second p95 load time or typical habit
counts grow beyond 10.

Release verification and rollback steps are documented in [the frontend release runbook](docs/markdowns/FRONTEND_RELEASE_RUNBOOK.md).
The handling rules for mood notes and other sensitive browser data are documented in [the frontend privacy review](docs/markdowns/FRONTEND_PRIVACY_REVIEW.md).

## Request lifecycle and rate limiting

Moodly honors Retry-After for HTTP 429 across the current user's API client. Missing or invalid headers pause requests for 30 seconds. Read recovery is manual; writes are never automatically replayed. See [request handling and verification](docs/markdowns/FRONTEND_REQUEST_HANDLING.md) for cancellation, concurrent reads, submit guards and test checks.
## Docker and Make

Local development stays on Vite (`make local-run` or `npm run dev`). Backend
infrastructure is owned by `moodly-backend`; frontend commands never start or stop it.
GNU Make is optional; `make help` lists wrappers around npm and Docker Compose.
The recipes do not require Bash, including on native Windows Make.

The Dockerfile builds with Node and serves only `dist` using non-root Nginx on port
8080. Compose exposes it on localhost:4173, with a read-only filesystem and temporary
files in `/tmp`. SPA routes fall back to `index.html`; hashed assets are cached while
HTML is not. `/healthz` checks static serving, not backend/Auth0 availability.

```sh
# Fill .env.test.local using .env.test.example first.
make docker-validate
make docker-up
node scripts/container-smoke.mjs http://127.0.0.1:4173
make docker-logs
make docker-stop

# Equivalent without Make
docker compose -p moodly-frontend-test --env-file .env.test.local -f compose.yaml up -d --build --wait
```

Compose passes only the four public VITE_* values as build arguments. Env files,
including Playwright credentials, are excluded from the Docker build context.
Never pass E2E passwords or reset tokens as build arguments.

VITE_* configuration is embedded at build time. Build separately for test and
production; runtime container environment variables cannot change an existing
bundle. Use hosting/CI variables, or an ignored .env.production.local based on
.env.production.example:

```sh
make docker-build MOODLY_ENV=production ENV_FILE=.env.production.local
```

MOODLY_ENV selects build validation rules, the Compose project/image name and default
env file, not Vite's build mode: every container uses an optimized production build. Override FRONTEND_PORT
if 4173 is occupied. The API URL must be reachable from the user's browser, rather
than a Compose service hostname. Auth0 origins and backend CORS must include the
actual frontend origin and port. Terminate TLS at the hosting platform or reverse
proxy; this Compose configuration is for local verification.

CI builds with synthetic public configuration after quality checks, then checks
health, SPA routes, asset delivery, caching and missing asset 404s. It does not
publish or deploy an image. Real authenticated E2E remains a separate environment
check. Dependabot tracks Docker base image updates, including pinned digests.

### Container lifecycle

Keep both frontend and backend stacks after local work/testing. Use `make docker-stop`
to stop the frontend without removing containers/network; `make docker-status` also
shows stopped containers. Use `make docker-up` to rebuild as needed, start and wait
for readiness. This does not manage backend infrastructure.

`make docker-down` is an explicit cleanup command that removes frontend containers
and network, while retaining images. Do not run it as routine post-test cleanup.
Never use `down -v` on backend infrastructure without explicitly intending to delete
its data. Disposable CI containers are still removed after the CI job.

### Packaging checks and deployment

`npm run test:build-config` verifies the deploy configuration rules; `npm run build:deploy`
validates configuration before building. Production requires HTTPS/public DNS, rejects
credential-bearing API URLs and localhost/private IP endpoints. Auth0 audience remains
an identifier. Preview/test builds allow localhost for development E2E.

Docker access logs omit query strings and referrers. Routine Nginx error logging is
suppressed (`crit`) because request error messages can include raw callback queries;
critical startup diagnostics still go to stderr. Do not add raw request logging.

Make builds tag images as `<environment>-<git-revision>` with OCI labels. For builds
from modified source, override `IMAGE_TAG` with a distinct development tag; a revision
label alone does not certify a clean working tree. `make docker-record` records image
identity under ignored `reports/`. Direct Compose builds default to `test-local` and
unknown revision; use Make or provide IMAGE_TAG/SOURCE_REVISION for traceable builds.

FE hosting is Vercel (Vite/static), with the Dockerized BE on Render. Docker stays
available for local/CI verification and other container hosts. `vercel.json` configures
SPA routing, cache/security headers and the deploy build command; production Vercel
builds always use production validation. See the [release runbook](docs/markdowns/FRONTEND_RELEASE_RUNBOOK.md)
for Preview/test mapping, origins, deploy checks and deployment-ID rollback. Real
hosting settings/domains and a live Vercel verification are still required.
