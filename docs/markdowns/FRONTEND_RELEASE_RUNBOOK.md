# Frontend release runbook

## Hosting and artifact identity

Frontend production hosting is Vercel's Vite/static deployment. Backend Docker is
hosted on Render. Frontend Docker remains a portable package and local/CI test target;
Vercel serves the static build and does not use this repository's Nginx configuration.
Track a Vercel deployment by deployment ID/URL, Git SHA and target environment.
Track Docker separately by OCI revision/environment labels and registry digest.
Never claim a Docker smoke check verifies Vercel edge configuration.

## Vercel project setup

1. Connect this repository, choose Vite and Node 22.x. The checked-in `vercel.json`
   runs `npm ci`, `npm run build:deploy`, and publishes `dist`.
2. Map Vercel Preview to Moodly test and Production to Moodly production. Configure
   the four `VITE_*` values separately for each scope using the provider dashboard.
   Production validation requires a public HTTPS API URL; Auth0 domain is a bare
   hostname. Audience is the exact Auth0 API identifier, not necessarily a URL.
3. Point production API configuration at the intended Render backend. Keep test
   data and production data separate. Never add E2E passwords/reset tokens to Vercel
   frontend build configuration.
4. Choose the production domain and a stable test frontend origin. Authorize those
   exact HTTPS origins in Auth0 callback/logout/web origins and Render backend CORS.
   Arbitrary branch-preview URLs are not automatically authorized for login.
5. Vercel handles HTTPS/static delivery. There is no container PORT to configure on
   Vercel. `/healthz` is static readiness only; verify backend health separately.
6. Record deployment ID, Git SHA, environment and public endpoint configuration
   references (not credentials). Changing `VITE_*` requires a new build/deployment.

Domain names, Vercel project settings, deployment protection and account permissions
must be supplied/configured by the owner. This repository does not provision them.

## Post-deploy verification

```sh
npm run smoke:deploy -- https://<canonical-frontend-domain>
node scripts/container-smoke.mjs https://<canonical-frontend-domain>
```

The second command also checks health, cache headers, JS delivery and missing assets.
If Preview deployment protection is enabled, use the provider's authorized access
mechanism; do not disable protection just to run smoke checks. Verify Auth0 login,
logout, dashboard and one authenticated read on the real domain with synthetic data.
Do not reset production data. Nginx log redaction applies only to Docker; review Vercel
log access/retention separately and avoid exporting callback query strings.

## Vercel rollback

1. Stop promotion of a failing release. Record deployment ID/URL, Git SHA, symptom
   and observation time.
2. Select a previously verified production deployment with compatible API/Auth0
   configuration. Use Vercel's rollback UI, or an authorized CLI session:

```sh
vercel rollback <previous-deployment-url-or-id>
vercel rollback status
```

3. Roll back the existing deployment rather than rebuilding an old revision. The
   available rollback targets depend on the Vercel plan and deployment retention.
4. Keep the production domain unchanged. Run the post-deploy checks above and verify
   login/logout and an authenticated read. Rolling back restores that build's embedded
   public configuration; it does not roll back the Render backend or database.
5. Preserve diagnostics without credentials, investigate and fix forward.

## Docker identity and optional container-host rollback

`make docker-build` creates an environment/revision tag and OCI labels. Run
`make docker-record` to write `reports/container-image.json` (ignored by Git). CI
uploads this identity record. Local `imageId` is a configuration digest, not a registry
manifest digest. `repoDigests` may be empty until an image is pushed/pulled. Registry
publishing is a separate pipeline step and is not enabled by this change.

If later using a container host, deploy a tested `registry/image@sha256:<manifest-digest>`
and retain the previous digest and environment record for rollback. Do not rebuild
an old revision during an incident. This Docker mechanism is not Vercel rollback.

References:
- https://vercel.com/docs/frameworks/frontend/vite
- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/deployments/rollback-production-deployment
