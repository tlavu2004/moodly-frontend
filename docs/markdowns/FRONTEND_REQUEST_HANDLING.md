# Request handling and rate-limit recovery

## Contract and scope

Backend baseline: d17a1ad3f899a652e48e55fdd9b2dd10f14ff5eb (main).
OpenAPI: ../moodly-backend/docs/api/json/moodly-openapi.json.
Run npm run generate:api and inspect src/api/openapi; never edit generated files.
This frontend branch builds on the signed backend-compatibility branch at 58e6be3.
Backend source and configuration are unchanged; no required backend fix was identified.

## Error and quota policy

- HTTP response status remains authoritative. Error code, request ID, validation fields and safe envelope metadata are preserved. 400 validation, 401 sign-in recovery, 403 permission failures and module 409 guidance retain their existing behavior. They do not trigger automatic retries or redirects from the transport.
- BE returns 429 / RATE_LIMIT_EXCEEDED in its normal success/error/timestamp envelope. One shared client per Auth0 provider and subject handles all feature endpoints and profile bootstrap. Token renewal does not create an endpoint-specific quota. The browser conservatively pauses all Moodly client requests after 429, matching the per-subject, per-instance quota; it does not implement its own quota counter.
- Retry-After accepts integer seconds or HTTP-date (IMF-fixdate and legacy HTTP date forms). A valid future deadline is never shortened; an elapsed valid date is eligible immediately. Missing, empty, malformed or numerically unsafe headers use a finite 30-second delay.
- Cooldown is in memory for the current Auth0 provider/subject. It is not coordinated across browser tabs or persisted through reload. Other instances may enforce different quota windows. The backend remains authoritative.
- During cooldown a user attempt is rejected locally as 429. Nothing is queued or replayed. A read failure has one inline recovery control; its countdown enables Try again at expiry, but expiration never sends a request. There are no global interceptor toasts. Each operation owns its inline feedback, preventing a burst of identical toast notifications.

## Request lifecycle

- Identical concurrent GETs share only an in-flight network request, with separate Response bodies and independent consumer cancellation. Keys include URL/query, headers and fetch policies; they are never logged. There is no response cache, stale-time policy or focus/visibility refetch. Settled responses are removed immediately.
- Writes clear read-sharing boundaries on start and settlement so a later refetch cannot join a read started before the write. Writes are never coalesced by the transport.
- Feature reads use AbortSignal throughout adapters, including all members of stats/Today aggregates and habit streak requests. Input change, navigation and component unmount cancel the old subscription and prevent late state updates. A shared GET is aborted upstream only after its final consumer cancels. An unmounted habits page cannot start its follow-up streak fan-out.
- Dashboard, entries, Today, habits, stats, search and avatar reads expose manual reload. Reload clicks are guarded synchronously; old requests are canceled rather than racing newer data. Failed optional streaks can be retried while successful streaks remain visible until the user reloads.
- There is no network polling, timer-based retry, retry-on-focus, or automatic 401/403/409/429/5xx retry. The only added interval updates the countdown UI and stops when the deadline expires or the control unmounts.

## Mutations and profile bootstrap

- Habit creation, mood/log updates and avatar upload use a synchronous pending guard and cancellation on unmount. Form controls also guard double submit before React can render disabled state. Mutation errors release the guard so the user can decide what to do next.
- Cancellation or a network error does not establish whether the server committed a write. No write is automatically repeated, including POST /habits, upload-signature, Cloudinary upload and confirm. The existing habit-creation guidance asks users to inspect their list if the outcome is unknown. No Idempotency-Key is invented.
- Avatar cancellation stops the signature/upload/confirm chain before its next step. The provider upload remains separate from the Auth0 client and receives no bearer token.
- Overlapping profile bootstrap PUTs share one in-flight promise, including React StrictMode effect replay. The completed response is not cached. Bootstrap shares the subject client cooldown and offers an explicit retry without reloading the page; 401 offers sign-in and 403 retains permission feedback. Unlike feature mutations, the one-shot bootstrap sync is allowed to settle after a subscriber leaves, and its old subscriber ignores the result; it is not aborted and replayed by StrictMode.
- No resolved API data is stored globally to reduce request volume. Current component state remains owned by its current input/client.

## Verification on 2026-11-06

- ESLint and production build (TypeScript and bundle budget): PASS.
- Unit/component tests and coverage thresholds: PASS, 32 files / 149 tests; statements 85.99%, branches 81.67%, functions 79.09%, lines 88.30%.
- OpenAPI generation/drift: PASS against the backend baseline; no generated-file edits.
- Public E2E: 3/3 PASS. Authenticated setup returned to /dashboard but showed Unable to prepare Moodly / Unable to reach Moodly; the 12 dependent tests did not run. A separate localhost:8080 health probe could not connect. This does not distinguish every possible deployed network/CORS cause.
- package.json and package-lock.json are unchanged. The previously recorded dependency audit remains unresolved (16 findings, 3 high); this branch does not claim the CI audit gate is green or upgrade dependencies outside its scope.

Still verify on test: exposed Retry-After with real enabled quota (including missing/invalid-header proxy behavior), another subject, instance routing, concurrent tab/navigation behavior, authenticated 401/403/409/validation, actual Cloudinary cancellation/concurrency, and normal traffic under the shared quota. N+1 streak loading remains an explicit performance tradeoff; measure representative lists/history instead of masking it with stale caching.
