# Frontend release runbook

## Post-deploy verification

Run the smoke check against the canonical deployment URL:

```bash
npm run smoke:deploy -- https://app.example.com
```

Then verify Auth0 login/logout and one authenticated read-only API request. Do not use real mood notes in release verification.

## Rollback procedure

Use an immutable, previously verified deployment as the rollback target. Do not rebuild an old Git revision during an incident because dependencies and build inputs may have changed.

1. Stop or cancel any rollout still in progress.
2. Record the failing deployment ID, Git SHA, first observed symptom, and UTC time in the incident log.
3. Select the most recent deployment that passed the post-deploy smoke check and authenticated staging checks.
4. Promote or restore that deployment with the hosting provider's atomic rollback mechanism. Keep the production domain unchanged so Auth0 origins and API CORS remain valid.
5. If the host does not switch atomically, restore the previous artifact, purge only the HTML document cache, and retain long-lived hashed asset caches.
6. Run `npm run smoke:deploy -- <production-url>`, then verify login, logout, dashboard load, and one non-destructive API flow.
7. Confirm that the failing release is no longer receiving traffic before closing the rollback.
8. Preserve logs and artifacts, open a follow-up issue, and fix forward in a new release; do not edit production assets in place.

If rollback cannot restore service, put the frontend into the provider's maintenance response and escalate to the frontend, backend, and identity owners with the captured deployment ID and timestamps.
