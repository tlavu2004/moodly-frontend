# Shared FE workstation stack verification — 2026-11-14

## Delivery order

Existing code was committed as `e79875c`; existing documentation as `0830136`.
Both were pushed before this migration change began.

## Shared project and migration

- Make and Compose use `moodly-frontend-local` for both local and test. One frontend
  service is rebuilt/recreated when changing the selected environment; they do not
  run concurrently in separate default projects.
- `make local-container-migrate` performs explicit one-time legacy cleanup.
- Planning/ownership checks reject running containers, mounts, other checkouts,
  other services/projects and custom/shared networks. Missing ownership labels fail
  closed. Removals use exact inspected IDs, without force or volume deletion.
- Removed one stopped legacy frontend container with no mounts and its default
  network. No images/volumes, BE containers or BE source were removed/modified.
- Repeating migration after cleanup is a no-op.

## Verification

- Full `make verify`: configuration/reset safety tests, ESLint, 149 unit/component
  tests, coverage thresholds, TypeScript, optimized build and bundle budget passed.
- Eight focused migration tests passed, including ownership and data protection.
- Actual local Docker build: shared project, port 5173, synthetic API 8081 embedded
  in JS and public build identity; container smoke/privacy checks passed.
- Actual switch to test Docker build: same project/service name, port 4173, synthetic
  API 8082 embedded in JS and build identity; smoke/privacy checks passed.
- Public Playwright against that Nginx test image: 3/3 passed.
- Restored the image built from the existing local test env file, passed static
  smoke/privacy checks, then stopped FE while retaining its container/network.
- Final Compose inventory: only `moodly-frontend-local` and `moodly-backend-local`.
  Backend stayed stopped, unchanged. Synthetic test images were retained.

Authenticated/hosted E2E was not run: this migration needs no backend writes and
current authenticated E2E requires the protected BE attestation/reset contract.
No hosted settings, deployment or registry image publishing were changed.
