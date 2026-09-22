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

Environment templates are available for development, integration, staging, and
production. Never put client secrets, passwords, reset tokens, or access tokens in a
`VITE_*` variable because Vite exposes those values to the browser bundle.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
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
