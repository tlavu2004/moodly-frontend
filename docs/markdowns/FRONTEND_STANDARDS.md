# Frontend Architecture and Maintenance Standard

## Purpose

This document is the operating standard for LinkForge and similar React + TypeScript frontends. Use it before adding, changing, or refactoring code. Its purpose is to keep features understandable, independently changeable, and safe to extend.

## Current assessment

The project has a solid foundation, but it is **not yet fully standardized for long-term maintenance**.

What is already good:

- React, TypeScript strict mode, Vite, ESLint, Tailwind, React Router, i18n, Axios, and Zustand are appropriate choices.
- Application bootstrap, layouts, routes, global styling, the HTTP client, auth state, and shared response types already have separate locations.
- Authentication token refresh is centralized in the Axios client instead of duplicated per screen.
- Public, authentication, and dashboard shells are separated through layouts.

What prevents easy maintenance today:

- `src/pages` mixes page composition, API calls, business rules, local UI state, data transformation, and large JSX trees.
- Several pages are very large (for example Dashboard, Analytics, and AdminUserLinks), making changes risky and difficult to review.
- API endpoint strings and Axios calls are repeated in pages. A backend contract change therefore requires searching many files.
- `any` is used in API, page, and error-handling code, weakening the project's strict TypeScript configuration.
- Reusable UI patterns such as confirmation dialogs, pagination, loading/error/empty states, and link/QR interactions are embedded in pages.
- Authorization is mostly represented in navigation and page logic, rather than explicitly expressed in route guards.
- There is no automated test convention or documented dependency direction.

Do not rewrite the application merely to match the target structure. Apply this standard incrementally whenever a touched feature needs new work or becomes difficult to understand.

## Target architecture

Use a feature-first structure. A feature owns its screens, domain UI, server calls, hooks, and types. Shared code must be truly reusable by more than one feature.

```text
src/
  app/
    App.tsx                 # route composition only
    providers.tsx           # global providers when needed
    routes.tsx              # route constants and route tree
  api/
    client.ts               # Axios instance, interceptors, transport concerns only
    api-error.ts            # normalized API error helpers
  components/
    ui/                     # generic primitives: Button, Modal, Pagination, Spinner
    feedback/               # EmptyState, ErrorState, ConfirmDialog
  features/
    auth/
      api/auth.api.ts
      components/
      hooks/
      pages/
      types.ts
    links/
      api/links.api.ts
      components/
      hooks/
      pages/
      types.ts
    analytics/
    payments/
    admin/
  layouts/
  locales/
  store/                    # only cross-feature client state
  lib/                      # framework-agnostic utilities
  types/                    # only genuinely global types
  index.css
  main.tsx
```

The existing structure may remain during migration. New feature work should use the target structure, and existing files should move only when the change gives a clear maintenance benefit.

## Dependency rules

1. `app` composes features and layouts; it contains no feature business logic.
2. A feature may import from `api`, `components`, `lib`, `store`, `types`, `locales`, and itself.
3. One feature must not import another feature's internal component, hook, or API implementation. Promote a stable shared abstraction only when two or more features genuinely need it.
4. `components/ui` must not import a feature, call an API, or read a feature store.
5. Layouts provide structure and navigation. They must not own page-specific fetching or mutations.
6. API modules are the only place that knows endpoint paths and request/response transport details.
7. Store only cross-screen client state in Zustand (for example session/authentication or a user-selected global preference). Keep form state, modal state, filters, and one-page loading state local to a component or feature hook.

## Route and authorization standard

- Keep paths as constants in `src/app/routes.tsx` or a small route module, not scattered string literals.
- A route entry should identify its layout and access rule clearly.
- Create `RequireAuth` and `RequireRole` guards before adding protected routes beyond the current simple layout check.
- Hiding a navigation item is not authorization. A user who manually opens a URL must receive a predictable redirect or forbidden state.
- Page components compose feature UI. They should not become a second router or permission engine.

## API and type standard

- Keep one configured Axios client. It owns base URL, language header, access-token attachment, refresh handling, and normalized transport errors.
- Put endpoint functions in feature API modules. Example:

```ts
// features/links/api/links.api.ts
export const getMyLinks = (query: LinkListQuery) =>
  apiClient.get<ApiResponse<PageResponse<UserLink>>>('/me/links', { params: query })
```

- Pages and components call named API functions or feature hooks; they do not call `apiClient.get('/...')` directly.
- Define request, response, query, and domain types explicitly. Use generics for reusable envelopes such as `ApiResponse<T>` and `PageResponse<T>`.
- Do not add `any`. Prefer a precise interface, a generic, `unknown` plus type narrowing, or an Axios error guard.
- Centralize conversion of API errors to a user-safe message. Never assume an error response shape without narrowing it.
- Treat access and refresh tokens as sensitive. Do not log them. Persisting tokens in browser storage should be consciously reviewed; prefer the backend's chosen secure session mechanism when an architecture change is possible.

## Component and hook standard

- One component should have one clear responsibility and a name that says what it renders.
- Split a page when it contains a distinct section, modal, table, card, form, chart, or interaction that can be understood independently.
- Prefer feature-local components first. Move a component to `components/` only after a second unrelated feature needs it.
- Extract a hook when data fetching, mutations, debouncing, pagination state, or coordination logic obscures the page's visual composition.
- Hooks return a small intentional API: data, state flags, actions, and normalized error. Do not expose implementation details unnecessarily.
- Use `useCallback`, `useMemo`, and refs only when they solve a measured identity, computation, or DOM problem. They are not default style requirements.
- Avoid components larger than roughly 250 lines or hooks larger than roughly 150 lines. These are review signals, not rigid limits: split earlier when responsibilities are mixed.
- Use one reusable accessible `ConfirmDialog` for destructive actions rather than recreating modal markup per page.

## State and async UI standard

- Every remote-data view must deliberately handle loading, error, empty, and success states.
- Keep request state close to the consuming feature. Avoid global loading/error flags.
- Use optimistic updates only when rollback behavior is explicit and safe; otherwise refresh or update from the successful server response.
- Cancel or ignore stale requests when filters, search text, or route parameters change quickly.
- Debounce user input in hooks, not inside bulky page components.
- Do not duplicate server data in Zustand unless it must be shared, retained, or coordinated globally.

## Styling, accessibility, and i18n standard

- Tailwind utility classes are acceptable. Extract repeated visual patterns into a component or reusable class helper when duplication hides intent.
- Preserve the existing design tokens and Tailwind naming; do not introduce arbitrary near-duplicate colors, spacing, or button styles.
- All interactive controls need an accessible name, visible focus state, sensible disabled state, and correct native element (`button`, `a`, `input`, etc.).
- Dialogs must support Escape, focus management, and an accessible label. Prefer a proven primitive if one is introduced.
- All user-visible text belongs in locale files. Do not put translated prose in components except a temporary migration fallback.
- Format dates, numbers, and currency through locale-aware helpers using the active i18n locale.

## Naming and file conventions

- Components: `PascalCase.tsx`; hooks: `useX.ts`; API modules: `x.api.ts`; tests: `X.test.tsx` or `x.api.test.ts`.
- Use descriptive names: `LinkListQuery`, `createShortLink`, `isSubmitting`; avoid vague names such as `data2`, `handleThing`, or `utils`.
- Keep route pages in `pages/`, reusable feature parts in `components/`, and non-React logic in `lib/` or `api/`.
- Prefer named exports for reusable utilities and feature internals. A default export is acceptable for route page components and layouts.
- Use import type for type-only imports where the compiler configuration expects it.

## Testing and quality gate

Before merging a meaningful frontend change, run:

```bash
npm run lint
npm run build
```

Add a test runner (recommended: Vitest + React Testing Library) before the next substantial feature. At minimum, test:

- API modules: request parameters and error normalization.
- Feature hooks: loading, success, failure, and stale-request behavior.
- Critical flows: login, create/delete a link, permission redirects, and payment return handling.
- Reusable UI: keyboard interaction and callbacks for dialogs and forms.

For UI changes, manually check desktop and mobile layouts, both supported languages, keyboard-only navigation, and loading/error/empty states.

## Incremental refactoring plan for this repository

1. Rename `src/api/axios.ts` to `src/api/client.ts` when its imports are next touched; type the refresh queue and Axios retry config, removing `any`.
2. Create `features/links`, then move link endpoints from Home, Dashboard, DeleteLink, and QR flows into `features/links/api/links.api.ts`.
3. Break `Dashboard.tsx` into a create-link form, recent-link card, link list, link row, pagination controls, and QR/delete dialogs. Move list fetching and mutations to a links hook.
4. Create `features/analytics` and split `Analytics.tsx` into query state, summary cards, chart components, and data-loading logic.
5. Create `features/admin` for admin endpoints and extract user/link table parts from the admin pages.
6. Extract shared `ConfirmDialog`, `Pagination`, `AsyncState`, and error-message helpers only after their contracts are clear from real uses.
7. Move feature-specific interfaces out of `src/types/index.ts`; retain only shared envelope, pagination, and cross-feature types there.
8. Add explicit protected-route and role-route guards, then add tests around the authorization boundaries.

## Change checklist

Before considering a frontend change complete, verify:

- The changed code has one clear owner: app, layout, feature, shared UI, API, store, or lib.
- No new endpoint string or raw `apiClient` call was added to a page/component.
- No new `any` was introduced.
- Loading, error, empty, and success behavior is intentional where server data is involved.
- New visible text is localized.
- Authorization is enforced at the route level when applicable.
- Shared code was added only because it is actually shared.
- Lint and build succeed, and relevant tests/UI checks were performed.

## Decision rule

When unsure where code belongs, choose the smallest scope that can own it:

1. A single component: keep it local.
2. One feature: put it in that feature.
3. Multiple unrelated features: make it shared only after the interface is stable.
4. App-wide behavior: put it in `app`, `api`, `store`, or `lib` according to responsibility.

This rule prevents both the "one giant page" problem and premature abstraction.
