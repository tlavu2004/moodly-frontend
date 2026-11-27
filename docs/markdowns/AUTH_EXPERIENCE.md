# Moodly Sign-in and Auth0 Branding

Decision updated 2026-11-20: use **standard Auth0 Universal Login with branding** on the existing development/test tenant. Custom hosted form code has been removed; the supported release uses the tenant branding editor.

## Active User Flow

- Landing Sign in opens `/login`; Start your journey opens `/signup`.
- Protected deep links open the FE sign-in introduction with a validated return destination. Continue uses the Auth0 SPA SDK redirect flow (Authorization Code + PKCE). Auth0 collects credentials on its hosted page, then returns to the app.
- Sign-up requests pass `screen_hint=signup`. Both actions pass the latest `ui_locales` (`en` or `vi`). Enable both locales in the tenant to honor the choice.
- The callback restores known app routes with their query and fragment. Backend profile synchronization completes before protected pages render.
- Password reset, verification, MFA and enabled social connections stay on Auth0. The FE never collects passwords or needs a Management API client secret.
- Pending redirects block repeated clicks. Failures show localizable recovery.

## Current Local/Test Configuration

Keep the current tenant domain and API audience in FE `.env.local`, and keep the matching `AUTH0_ISSUER_URI` / `AUTH0_AUDIENCE` in the sibling BE. There is no custom Auth0 domain migration or BE issuer/timezone change in this release.

All workstation FE modes use `http://127.0.0.1:5173`. Local/test share `.env.local`; Playwright owns a test-mode Vite server unless container/remote mode is explicitly selected. Stop the server you own before changing modes.

The SPA allowed callback/logout URLs and web origins and BE CORS must include the exact origin. If you also use `http://localhost:5173`, allowlist it separately; hostnames are not interchangeable for OAuth/CORS. See [Auth0 local setup](AUTH0_LOCAL_SETUP.md) and [the integration guide](FRONTEND_INTEGRATION_TESTING.md).

## Hosted Appearance

Use Branding > Universal Login > Update branding theme. Publish the standard theme in the existing development tenant. The agreed settings are:

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

Leave the custom font URL unset until a suitable public font is available. Logo and favicon can be set later using publicly reachable HTTPS URLs; the repository provides `public/brand/moodly-mark.svg`. Do not enter a localhost logo URL into the hosted theme. The basic branding example is `docs/auth0/branding.example.json`; replace its public hostname before using it.

The SPA supports System/Light/Dark. Hosted standard branding is a separate tenant setting and does not automatically follow the app's dark mode. The app therefore does not forward an app theme parameter. A generic Dashboard Try page may say "All Applications"; verify the actual Moodly app through the FE redirect.

The red **Dev Keys** alert means a social connection uses Auth0's shared development credentials. This is acceptable for local/test prototyping; it is not a branding or FE/BE token-validation failure. Before production use dedicated provider OAuth credentials. Do not add the provider secret to FE `VITE_*` values.

## Verification and CI

Verification commands:

```sh
npm run lint
npm run build
npm run test:coverage
npm run test:e2e:public
```

`npm run test:e2e` runs standard public, Auth0 setup and authenticated scenarios. It needs the synthetic account, reachable BE and isolated reset endpoint described in [the integration guide](FRONTEND_INTEGRATION_TESTING.md). The public suite intercepts authorization and checks locale/signup parameters; it does not prove real login, MFA or social-provider behavior. Historical test counts are not a certificate for a new tenant configuration.

Before merge, verify login/logout, returning to a protected deep link, both languages, signup/reset and expected profile-sync recovery on the existing test configuration. Automated account creation/reset-password emails and social/MFA prompts may need a manual check; do not infer them from a successful database login. CI quality checks build the SPA, run lint/unit/coverage and audit dependencies. Remote CI status must be checked on the commit or PR separately from local command results.
