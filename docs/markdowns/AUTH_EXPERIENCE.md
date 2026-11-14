# Auth0 Advanced Customization for Universal Login

Decision updated 2026-11-15: Moodly now supplies the actual hosted email/password
forms through **Advanced Customizations for Universal Login (ACUL)**, using the
official `@auth0/auth0-acul-js` SDK. This replaces the previous standard-branding-only
implementation. The code is implemented and tested in this repository; tenant
activation and CDN hosting are separate deployment steps described below.

## User flow and implementation

Landing links still open `/login` or `/signup` introductions; Continue redirects
through the existing SPA SDK (Authorization Code + PKCE). Auth0 serves the ACUL
host page, loads the separate Moodly bundle from the asset host, and renders the
custom forms. **The form fields themselves now use Moodly's layout and tokens.**
`src/auth-hosted/` is a separate entry point, not a password form embedded in the SPA.

The ACUL SDK submits credentials to the current Auth0 transaction by form POST.
It handles the transaction `state`; the code does not call `/oauth/token` with a
password grant, send passwords to Moodly's BE, log them, or save them to storage.
Failed submission clears password fields and permits manual retry; a successful
submission remains locked pending navigation. SDK-provided links retain the flow.
The existing callback restores a validated application destination, and the BE
profile synchronization gate remains in place.

| Prompt | Screens implemented |
| --- | --- |
| login | login |
| login-id | login-id |
| login-password | login-password |
| signup | signup |
| signup-id | signup-id |
| signup-password | signup-password |
| reset-password | reset-password-request, reset-password, reset-password-email |

Both single-screen email/password and identifier-first flows are supported. Signup
assumes the Moodly DB connection uses **email** as its required signup identifier.
Before enabling, verify it does not require additional username/phone/custom
consent fields; those require extending the form first. Do not change the tenant's
Authentication Profile solely to make a mock match. Existing supported flows and
connections should drive the screen configuration.

Only alternate social/enterprise connections provided in the transaction appear.
Passkey sign-in is exposed on `login-id` when the SDK enables it. Enrollment,
passwordless OTP, MFA, consent, reset success/error and other unlisted screens
remain in standard Universal Login and use the existing branding configuration.
**Do not enable advanced rendering for unimplemented screens.**

English/Vietnamese follows `transaction.locale`; the language picker calls Auth0's
`changeLanguage`, so provider messages follow the enabled tenant language too.
The app forwards its resolved light/dark choice as `ext-moodly-theme`; the rendering
configuration explicitly exposes only this presentation parameter. It is never used
for authentication decisions. The hosted bundle imports `src/index.css`, sharing
the same semantic tokens and components as the application.

## CAPTCHA and attack protection

The bundle renders Auth0 Simple CAPTCHA (`auth0`), Auth Challenge (`auth0_v2`,
Turnstile), reCAPTCHA v2/Enterprise and hCaptcha from the server-provided challenge.
The response is passed as `captcha` to the official SDK; expiry invalidates it.
Other providers (including Friendly CAPTCHA and Arkose) are **not integrated** and
fail closed with a recovery message; the form cannot submit without a challenge
response. Verify the tenant's active provider before switching the screen to ACUL.
Do not turn off bot detection to make the custom form work. Retain provider script,
frame and connection CSP permissions required by the configured challenge.

## Build, preview and release files

```powershell
npm run build:auth
npm run test:auth-package
npm run test:e2e:public
```

The standalone production IIFE and CSS are in ignored `dist-acul/`. There are no
runtime React/CDN imports, development preview fixtures or browser secrets in this
bundle. Browser tests inject synthetic Auth0 context and intercept form submission;
they exercise the compiled bundle without sending test credentials to any server.
Screenshots are saved under ignored `reports/acul-*.png`.

For a deployable rendering plan, set these **public build inputs** and rebuild:

```powershell
$env:ACUL_ASSET_BASE_URL = 'https://assets.YOUR_DOMAIN/acul/'
$env:ACUL_CLIENT_ID = 'YOUR_MOODLY_SPA_CLIENT_ID'
npm run build:auth
```

They are packaging inputs, never `VITE_*` secrets. With either input missing the
plan is explicitly marked `readyForTenant: false` and contains placeholders.
Do not apply a placeholder plan. `dist-acul/rendering-plan.json` contains the release
hash, SRI hashes, app-scoped rendering config, and exact per-screen API endpoints.
The immutable `<release>/` directory holds the referenced JS/CSS. Upload it intact
to `<ACUL_ASSET_BASE_URL>/<release>/`; serve the correct content types, HTTPS and
`Access-Control-Allow-Origin: *` (or the Auth0 origin) for anonymous SRI loading.
Do not overwrite a published release; a code change creates a new directory/hash.

## Actual environment and prerequisites

Both FE and sibling BE `.env.local` were inspected without printing secrets. They
currently reference the same default `dev-…us.auth0.com` tenant. They contain SPA/API
settings and synthetic E2E credentials; they do not provide an ACUL asset host,
custom-domain setting or Auth0 Management API access. A SPA client ID and backend
API audience do not authorize editing tenant rendering configuration. Cloudinary
upload credentials belong to avatar uploads and are not Auth0 management access.
No local environment files were changed, and no live tenant update is claimed.

Before activation obtain/verify:

1. Universal Login + ACUL entitlement, a First Party SPA and a verified Auth0 custom
   domain; a CDN/static host for this release; administrative tenant access.
2. Enabled `en` and `vi` locales, DB connection identifiers/password policy,
   social providers, MFA and the active CAPTCHA provider in a test tenant.
3. The FE SDK must use that custom domain (`VITE_AUTH0_DOMAIN`). The BE must validate
   the **matching custom-domain issuer** (`AUTH0_ISSUER_URI=https://<custom-domain>/`).
   The API audience stays unchanged. Coordinate the issuer cutover: existing
   default-domain sessions need reauthentication and social-provider callback
   allowlists may need the new domain. This is a JWT configuration change, not a
   Moodly calendar/timezone change. No sibling BE files have been edited here.

## Apply and rollback

Use an authenticated Auth0 CLI or Management API session in the test tenant. Keep
management credentials in its private environment/credential store, not chat or
browser bundles. Do not grant Management API permissions to the public SPA.

1. Export current rendering configuration for each screen in the table before
   modifying anything. Also record Universal Login branding, enabled languages,
   custom-domain and application callback/origin settings.
2. Publish assets and verify their HTTPS URLs, CORS, content types and SRI bytes.
3. Use the app-scoped config from the generated plan. It filters by **Moodly's
   client ID**, so other applications retain their existing UI. First activate the
   login/signup screens exercised by the tenant's Authentication Profile.
4. With the current CLI, for example, save `plan.config` to a JSON file, then use:

   ```powershell
   auth0 acul config get login --tenant YOUR_TENANT --file reports/login-before.json
   auth0 acul config set login --tenant YOUR_TENANT --file reports/moodly-rendering.json
   ```

   The plan also supplies exact `PATCH /api/v2/prompts/{prompt}/screen/{screen}/rendering`
   endpoints. Use current `auth0 acul config` commands, not the deprecated
   `auth0 universal-login customize --rendering-mode advanced` command.
5. Test real login/signup, wrong password, password reset, language switching,
   social/enterprise redirects, bot challenge, MFA continuation, logout and a
   protected deep link. Inspect actual BE token validation with the new issuer.
6. Activate remaining supported screens only after those checks pass. Keep
   unimplemented screens standard. No tracking, analytics or session-recording
   scripts should be added to the credential page.
7. For immediate recovery, PATCH `{ "rendering_mode": "standard" }` to each changed
   screen endpoint (also generated as `dist-acul/rollback-standard.json`). This
   restores hosted standard UI without touching tokens/users. Then restore the
   exported previous per-screen configs if required. Keep the old asset release
   available while old pages/transactions are still open. If reverting the domain
   cutover, coordinate FE domain and BE issuer together as well.

## References checked 2026-11-15

- [ACUL architecture and prerequisites](https://auth0.com/docs/customize/login-pages/advanced-customizations)
- [Rendering configuration, SRI and application filters](https://auth0.com/docs/customize/login-pages/advanced-customizations/configure/reference)
- [Official ACUL SDK](https://github.com/auth0/universal-login)
- [Official CAPTCHA reference app](https://github.com/auth0-samples/auth0-acul-samples)
- [Auth0 CLI configuration](https://auth0.github.io/auth0-cli/auth0_acul_config_set.html)
- [Custom-domain issuer and audience](https://auth0.com/docs/customize/custom-domains/configure-features-to-use-custom-domains)
