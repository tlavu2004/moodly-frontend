# Moodly authentication experience

Decision for this review branch (2026-11-14): provide a branded FE introduction
at `/login` and `/signup`, then redirect to Auth0 Universal Login. Use standard
Universal Login branding and localized prompts for the first release. The existing
landing page remains the product introduction; it is not duplicated.

## User flow

- Landing Sign in opens `/login`; Start your journey opens `/signup`.
- A protected deep link opens `/login?returnTo=...`. Continue starts Auth0;
  the requested app path, query and fragment are restored after callback.
- Sign-in/sign-up pages offer language/theme controls, explain the transition,
  and link to each other while preserving the destination.
- The explicit action passes the current `ui_locales` (`en` or `vi`); signup also
  passes `screen_hint=signup`. No credentials are collected by the FE.
- Auth0 handles passwords, reset, verification, MFA and social connections enabled
  in the tenant. The FE does not advertise connections that have not been verified.
- Existing sessions continue straight to the requested route. Pending navigation
  disables repeated clicks. A failed redirect can be retried with a generic message.
- Callback destinations are restricted to known Moodly app routes. Backend profile
  synchronization still completes before authenticated pages render.

## Scope of Auth0 customization

Use Universal Login's standard editor for logo, primary/background colors, font,
card/input/button borders and rounding. Match the light Moodly brand: primary
`#8f54dc`, pale background `#fcf9ff`, system sans font, 8px controls and 12px cards.
`public/brand/moodly-mark.svg` supplies a same-brand logo. The basic Management API
branding example is `docs/auth0/branding.example.json`; replace its hostname before
use. It is a configuration example, not an auto-deploy script.

Enable **English (`en`) and Vietnamese (`vi`)** in the tenant language settings,
then preview login, signup, reset-password and verification/MFA prompts in both.
The request locale only selects a language enabled by the tenant.

FE dark mode works independently. Standard tenant branding is a separate theme;
there is no implemented promise that FE localStorage or a made-up OAuth `theme`
parameter changes Auth0. Select a consistent hosted theme for this release.
Per-request light/dark layouts, custom surrounding HTML or fully custom prompts
need a separate customization decision and validation in the actual tenant.
Liquid page templates require a custom domain and Management API configuration.
Avoid DOM/CSS selector overrides of Auth0's internal widget markup.

References checked 2026-11-14:
- [Universal Login themes](https://auth0.com/docs/customize/login-pages/universal-login/customize-themes)
- [Internationalization and enabled locales](https://auth0.com/docs/customize/internationalization-and-localization/universal-login-internationalization)
- [Page templates and custom-domain requirement](https://auth0.com/docs/customize/login-pages/universal-login/customize-templates)

## Tenant application and verification

The repository implementation and automated tests do not modify a live tenant.
Before rollout, the tenant owner applies and previews branding in a test tenant:

1. Record/export existing branding, prompts, enabled languages and SPA URL settings.
2. Enable Universal Login, `en` and `vi`. Publish the reviewed logo at a public HTTPS
   URL and replace `YOUR_PUBLIC_FE_HOST` in the branding example.
3. Apply basic branding or use Branding > Universal Login > Update branding theme
   for font, borders and rounding; preview before publishing.
4. Keep Auth0 callback/logout URLs and allowed web origins aligned to each actual
   FE origin. The SDK callback remains the origin root (`redirect_uri`), not `/login`.
5. Verify real login/signup, reset, cancellation, expired session, logout, profile
   sync failure/recovery and allowed social/MFA methods with a synthetic test user.
6. Verify a deep link such as `/entries?from=2026-11-01&to=2026-11-14` returns intact.
   Verify a Vietnamese FE action opens a Vietnamese hosted prompt.
7. If hosted customization causes a regression, restore the recorded tenant branding
   and prompts independently of reverting the FE commit.

Automated checks cover public navigation, locale and signup authorization parameters,
return-path validation, redirect failures and duplicate submits. Public E2E intercepts
the hosted authorization navigation and does not create users or write BE data.
Real credential/MFA/provider behavior and tenant branding still require the test
configuration above; no live-tenant validation is claimed by the public suite.
