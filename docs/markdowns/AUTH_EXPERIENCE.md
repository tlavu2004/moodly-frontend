# Moodly sign-in and Auth0 branding

Decision updated 2026-11-20: use **standard Auth0 Universal Login with branding**
on the existing development/test tenant. The Dashboard showed that Advanced
Customizations for Universal Login (ACUL) requires a plan upgrade. This release
keeps the existing plan; ACUL is not part of its deployment path.

## Active user flow

- Landing Sign in opens `/login`; Start your journey opens `/signup`.
- Protected deep links open the FE sign-in introduction with a validated return
  destination. Continue uses the Auth0 SPA SDK redirect flow (Authorization Code +
  PKCE). Auth0 collects credentials on its hosted page, then returns to the app.
- Sign-up requests pass `screen_hint=signup`. Both actions pass the latest
  `ui_locales` (`en` or `vi`). Enable both locales in the tenant to honor the choice.
- The callback restores known app routes with their query and fragment. Backend
  profile synchronization completes before protected pages render.
- Password reset, verification, MFA and enabled social connections stay on Auth0.
  The FE never collects passwords or needs a Management API client secret.
- Pending redirects block repeated clicks. Failures show localizable recovery.

## Current local/test configuration

Keep the current tenant domain and API audience in FE `.env.local`, and keep the
matching `AUTH0_ISSUER_URI` / `AUTH0_AUDIENCE` in the sibling BE. There is no custom
Auth0 domain migration or BE issuer/timezone change in this release.

The FE currently runs at `http://localhost:5173`. The SPA application's allowed
callback/logout URLs and web origins and BE CORS must include the exact origin.
Automated E2E uses `http://127.0.0.1:4173` by default and needs its own allowlist
entries; changing hostname or port is not interchangeable for OAuth/CORS.

## Hosted appearance

Use Branding > Universal Login > Update branding theme. Publish the standard theme
in the existing development tenant. The agreed settings are:

| Setting | Value |
| --- | --- |
| Primary button / Base Focus / Links & focused components | `#8f54dc` |
| Primary button label | `#ffffff` |
| Page background | `#fcf9ff` |
| Header / Input filled text | `#262333` |
| Body | `#595568` |
| Widget / Input background | `#ffffff` |
| Button / Input corner radius | 8px |
| Widget corner radius | 12px |
| Border weights | 1px |
| Widget shadow | Enabled |
| Reference font size | 16px |
| Title | 150%, bold |
| Subtitle / Body | 87.5%, regular |
| Buttons / Input labels / Links | 87.5%, bold |

Leave the custom font URL unset until a suitable public font is available. Logo
and favicon can be set later using publicly reachable HTTPS URLs; the repository
provides `public/brand/moodly-mark.svg`. Do not enter a localhost logo URL into the
hosted theme. The basic branding example is `docs/auth0/branding.example.json`;
replace its public hostname before using it.

The SPA supports System/Light/Dark. Hosted standard branding is a separate tenant
setting and does not automatically follow the app's dark mode. The app therefore
sends no ACUL-only theme parameter. A generic Dashboard Try page may say "All
Applications"; verify the actual Moodly app through the FE redirect.

The red **Dev Keys** alert means a social connection uses Auth0's shared development
credentials. This is acceptable for local/test prototyping; it is not a branding
or FE/BE token-validation failure. Before production use dedicated provider OAuth
credentials. Do not add the provider secret to FE `VITE_*` values.

## Verification and CI

Default commands require no ACUL assets or entitlement:

```sh
npm run lint
npm run build
npm run test:coverage
npm run test:e2e:public
```

`npm run test:e2e` runs standard public, Auth0 setup and authenticated scenarios.
It needs the synthetic account, reachable BE and isolated reset endpoint described
in [the integration guide](FRONTEND_INTEGRATION_TESTING.md). The public suite
intercepts authorization and checks locale/signup parameters; it does not prove
real login, MFA or social-provider behavior. Historical test counts are not a
certificate for a new tenant configuration.

Before merge, verify login/logout, returning to a protected deep link, both
languages, signup/reset and expected profile-sync recovery on the existing test
configuration. Automated account creation/reset-password emails and social/MFA
prompts may need a manual check; do not infer them from a successful database login.
CI quality checks build the SPA, run lint/unit/coverage and audit dependencies;
they do not build or package ACUL. Remote CI status must be checked on the commit
or PR separately from local command results.

## Optional implementation retained for later

`src/auth-hosted/`, `vite.acul.config.ts` and the packaging script are retained,
but the SPA does not import their entry point. The default browser suite excludes
`e2e/hosted.spec.ts`. Source-level unit tests may still validate this retained code.

Only explicit commands build/test the optional bundle:

```sh
npm run build:auth
npm run test:auth-package
npm run test:e2e:acul
```

These do not activate tenant settings. Deployment, entitlement, custom domain,
asset hosting and an eventual FE/BE issuer cutover are documented separately in
[the optional ACUL guide](ACUL_OPTIONAL.md).
