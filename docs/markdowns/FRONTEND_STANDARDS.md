# Moodly Frontend Standards

## Purpose

This document defines the conventions for Moodly's React single-page application. Apply them to new work and incremental refactors; do not rewrite unrelated code merely to conform.

## Approved foundation

- React, TypeScript, Vite, and Tailwind CSS.
- React Router declarative mode for client-side navigation.
- Auth0 React SDK for authentication and access tokens.
- `@hey-api/openapi-ts` for types and SDK code generated from the backend OpenAPI document.
- Native `fetch` through the generated client. Do not introduce Axios, Zustand, or an i18n library without a separate architectural decision.

Run these quality gates before merging a meaningful change:

```bash
npm run lint
npm run build
```

For OpenAPI changes, also run:

```bash
npm run generate:api
npm audit
```

## Ownership and structure

Use feature-first ownership. A feature owns its page, feature-local UI, hooks, API adapters, and types.

```text
src/
  api/                         # shared transport and normalized API errors
    client.ts
    errors.ts
    openapi/                   # committed generator output
    useApiClient.ts
  auth/                        # Auth0 bootstrap and route guards
  components/
    layout/                    # application-wide structure, e.g. AppShell
    ui/                        # reusable primitives once they have two real consumers
    feedback/                  # shared empty/error/loading UI when justified
  features/
    dashboard/
      api/
      components/
      hooks/
      pages/
    habits/
    entries/
    stats/
    profile/
    search/
  App.tsx                      # route composition only
  main.tsx                     # application bootstrap and providers
```

- A feature may import from `api`, `auth`, `components`, and itself.
- One feature must not import another feature's internals. Promote code to shared only after it has at least two unrelated consumers.
- Pages compose UI and feature hooks. They must not call `fetch` or generated SDK functions directly.
- Layouts provide structure and navigation; they do not fetch page-specific data.
- Use named exports for reusable modules. A default export is acceptable only for an application entry or a router-required component.
- Do not add `any` in handwritten code. Use precise types or `unknown` with narrowing.

## API contract and transport

The backend OpenAPI document is the source of truth. It is read from:

```text
../moodly-backend/docs/api/moodly-openapi.json
```

- Run `npm run generate:api` after the contract changes.
- Commit output under `src/api/openapi/`. Do not use a `generated/` directory or `.gen` filenames.
- Do not edit files in `src/api/openapi/`; regenerate them instead.
- `src/api/client.ts` owns the API base URL, Auth0 Bearer token setup, and generated-client configuration.
- `src/api/errors.ts` owns conversion of backend's `success/data/error/timestamp` envelope and network failures into `ApiRequestError`.
- Feature endpoint adapters belong in `src/features/<feature>/api/`. They use `useApiClient()` or a passed API client and return feature-friendly data.
- Components and pages consume feature hooks/adapters, not raw endpoint paths.
- Never log an access token, Authorization header, or sensitive API response.

## Routing and authentication

- Keep route composition in `src/App.tsx` while the route tree remains small. Extract path constants and route modules when more feature routes are added.
- Place private routes below the Auth0 guard. A manually entered private URL must redirect to Auth0 rather than merely hiding navigation.
- `AppShell` wraps authenticated feature routes and owns common header, navigation, identity display, and logout control.
- Logout must use Auth0 with `returnTo: window.location.origin`.
- Public routes must remain outside the protected shell. Add a public landing page before relying on `/` as a stable post-logout destination.
- Provide an intentional 404 route. Add forbidden or role guards only when the product has real authorization roles.

## Feature roadmap and route map

Build the product in small feature branches, in this order unless requirements change:

1. Public landing page at `/`, then dashboard at `/dashboard`.
2. Habits list and create flow at `/habits`.
3. Today's daily entry and mood at `/today`, followed by entries history at `/entries`.
4. Statistics at `/stats`.
5. Profile and avatar flows at `/profile`.
6. Search at `/search` using a real query parameter, for example `?q=exercise`.

Do not expose backend-only `/internal/*` operations in the end-user UI.

Every API-driven feature deliberately handles loading, error, empty, and success states. Examples include no habits, no matching entries, validation errors, and upload failures.

## UI and accessibility

- Use existing Tailwind tokens from `src/index.css`; avoid arbitrary duplicate color, spacing, and radius values.
- Use semantic HTML and native controls. Interactive controls need accessible names, visible focus, and sensible disabled states.
- Keep page-level loading/error/empty states near the feature until a shared pattern has emerged.
- Make destructive actions explicit and introduce one accessible confirmation dialog only after a second use case requires it.
- Keep user-visible copy centralized only when an i18n solution is deliberately introduced; until then, maintain consistent product wording.

## Testing and change checklist

Before the first data-heavy feature, add a test runner (recommended: Vitest and React Testing Library). Then test API adapters, feature hooks, route guards, and critical mutations.

Before considering a change complete, confirm:

- The changed code has one clear owner: app, auth, API, layout, feature, or shared UI.
- No raw endpoint path or API call was added to a page/component.
- No new `any` was introduced.
- Loading, error, empty, and success behavior is intentional where server data is used.
- Protected routes enforce authentication at the routing boundary.
- Lint and build pass, plus relevant manual browser checks.

## Deferred architecture decisions

### Server-state cache

Keep the current feature-local hooks and request cancellation instead of adding a query-cache library. The current route data has few shared consumers, and mutations already update or reload their owning feature state. Revisit this decision when the same server resource is fetched independently by multiple mounted routes, measured duplicate traffic becomes material, or offline/stale-while-revalidate behavior becomes a product requirement.

### Import aliases

Keep explicit relative imports for now. They make feature boundaries visible and avoid maintaining matching alias configuration across TypeScript, Vite, Vitest, ESLint, and editor tooling. Revisit an `@/` alias when routine imports cross three or more parent directories or refactors show that relative paths are causing measurable maintenance errors.
