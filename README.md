# Moodly frontend

React frontend for Moodly's mood journal, daily habits, insights, profile, and search
experiences. The application uses Vite, TypeScript, Auth0, and the generated Moodly API
client.

Hướng dẫn từng cách chạy FE/BE, lifecycle Docker và chạy chỉ từ image: [Running FE and BE](docs/markdowns/RUNNING_FE_AND_BE.md).

## Prerequisites

- Node.js 22 or newer.
- npm matching the installed Node.js runtime.
- A reachable Moodly backend.
- Auth0 SPA configuration for the target environment.

## Workstation setup: one file, one port

1. Run `npm ci`.
2. Create `.env.local` from `.env.local.example` only if it does not exist.
3. Fill the four public `VITE_*` values; add the four optional `E2E_*` values only
   when using authenticated Playwright. Never prefix secrets with `VITE_`.
4. Run `make local-run` and open **http://127.0.0.1:5173**.

Local and test share `.env.local` and port 5173; run one FE server at a time.
Production reads only production-scoped files/process variables and never the
workstation file. Explicit process/CI variables win. Dotenv values are literal
(`${VAR}` expansion is not supported). Restart/rebuild after changing configuration.

| Input | Purpose |
| --- | --- |
| VITE_AUTH0_DOMAIN | Bare Auth0 SPA tenant/custom hostname |
| VITE_AUTH0_CLIENT_ID | Public SPA client ID |
| VITE_AUTH0_AUDIENCE | Exact backend API identifier |
| VITE_API_BASE_URL | Browser-reachable API URL, never a Docker-only service name |
| E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD | Dedicated synthetic user; Node/Playwright only |
| E2E_DATA_RESET_URL / E2E_DATA_RESET_TOKEN | Opt-in non-production fixed-account BE reset; Node only |

Only the four explicit public values are embedded in browser assets. Real values live
in ignored `.env.local`; commit only `.env.local.example`. Hosted test uses GitHub
`test` variables/secrets. Production uses Vercel variables based on
`.env.production.example`, without E2E credentials. Retired `.env.test*` files are
not loaded. See [E2E setup](docs/markdowns/FRONTEND_INTEGRATION_TESTING.md).

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

Authenticated E2E requires an isolated Auth0 test account and a dedicated synthetic Auth0 account and the opt-in, non-production BE fixed-account reset endpoint.
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
8080. Compose exposes it on localhost:5173, with a read-only filesystem and temporary
files in `/tmp`. SPA routes fall back to `index.html`; hashed assets are cached while
HTML is not. `/healthz` checks static serving, not backend/Auth0 availability.

```sh
# Fill .env.local using .env.local.example first.
make validate-local
make test-container-up
node scripts/container-smoke.mjs http://127.0.0.1:5173
make local-container-logs
make local-container-stop

# Equivalent without Make
docker compose -p moodly-frontend-local --env-file .env.local -f compose.yaml up -d --build --wait
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

The Compose project is always moodly-frontend-local. MOODLY_ENV selects build validation, image tag and default
env file, and the selected env values; every container uses an optimized static build. Make uses host port 5173 for local and 5173 for test; direct Compose defaults to 5173.
Stop the alternate FE server you own before switching. The API URL must be reachable from the user's browser, rather
than a Compose service hostname. Auth0 origins and backend CORS must include the
actual frontend origin and port. Terminate TLS at the hosting platform or reverse
proxy; this Compose configuration is for local verification.

CI builds with synthetic public configuration after quality checks, then checks
health, SPA routes, asset delivery, caching and missing asset 404s. It does not
publish or deploy an image. Real authenticated E2E remains a separate environment
check. Dependabot tracks Docker base image updates, including pinned digests.

### Container lifecycle

Keep both frontend and backend stacks after local work/testing. Use `make local-container-stop`
to stop the frontend without removing containers/network; `make local-container-status` also
shows stopped containers. Use `make test-container-up` to rebuild as needed, start and wait
for readiness. This does not manage backend infrastructure.

`make local-container-down` is an explicit cleanup command that removes frontend containers
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
label alone does not certify a clean working tree. `make container-record` records image
identity under ignored `reports/`. Direct Compose builds default to `test-local` and
unknown revision; use Make or provide IMAGE_TAG/SOURCE_REVISION for traceable builds.

FE hosting is Vercel (Vite/static), with the Dockerized BE on Render. Docker stays
available for local/CI verification and other container hosts. `vercel.json` configures
SPA routing, cache/security headers and the deploy build command; production Vercel
builds always use production validation. See the [release runbook](docs/markdowns/FRONTEND_RELEASE_RUNBOOK.md)
for Preview/test mapping, origins, deploy checks and deployment-ID rollback. Real
hosting settings/domains and a live Vercel verification are still required.

### Make command conventions

Host application entry points (`local-run`, `test-run`) match backend naming.
`local-container-up` / `test-container-up` explicitly select local/test configuration
and start Nginx in the background; unlike BE's foreground `*-container-run`, they
return after readiness. Use `local-container-stop` after work to retain the stack.
The `local-container-*` lifecycle targets address the selected FE stack, not a
MongoDB/Elasticsearch infrastructure stack. Defaults remain test configuration;
set `MOODLY_ENV=local` when inspecting local configuration or recording its image.

The legacy `docker-*` commands remain available and honor `MOODLY_ENV` for
compatibility, including production builds. `validate-local` validates the selected
configuration without printing values. Frontend targets never manage BE services.

Auth0 callback/logout/origin and BE CORS setup for ports 5173/5173: [Auth0 local setup](docs/markdowns/AUTH0_LOCAL_SETUP.md).

### One workstation configuration and one FE port

Use only `.env.local` (ignored), based on `.env.local.example`. Local/test share the
four public browser values and the four optional E2E runner values. They still select
their own execution mode; the filename or port does not isolate BE data. Production
never reads `.env.local`. Auth0 account/password and reset token are not browser inputs.

All workstation FE modes use **http://127.0.0.1:5173**. Run one Vite or Nginx instance
at a time. Use `make e2e-dev` for an owned test Vite server, or start Nginx with
`make test-container-up` then use `make e2e-container`. Do not store E2E_TARGET or
E2E_BASE_URL in the shared file. Remote E2E needs explicit per-run configuration and
write authorization; those values remain in CI/process inputs, not the local template.

Docker Desktop's Containers page should show only two Moodly groups:
`moodly-backend-local` (mongodb/elasticsearch and optional Java backend) and
`moodly-frontend-local` (container `moodly-frontend-local`, Nginx + FE). Keep stacks
stopped between sessions. Different image tags in the Images page are build versions,
not extra running stacks; no image/volume pruning is performed automatically.
