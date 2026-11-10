# FE exception contract review — 2026-11-03

Sources: backend `docs/blueprint/exception-standardization-blueprint.md`, `docs/api/moodly-openapi.json`, module ErrorCode enums and search controller/adapter tests in sibling `moodly-backend` checkout. This review covers the local backend checkout; it does not verify a deployed backend or a remote PR revision.

## Contract matrix

| Backend code / HTTP | FE consumer | Before this review | Change needed / final behavior |
| --- | --- | --- | --- |
| AVATAR_CONTENT_TYPE_UNSUPPORTED, AVATAR_FILE_TOO_LARGE / 400 | profile/useAvatar → getUserFacingError | Safe backend message | No; preserved. Local MIME check also rejects unsupported files before signature request. |
| AVATAR_UPLOAD_NOT_FOUND, AVATAR_ASSET_INVALID / 400 | profile/useAvatar upload signature/confirm | Safe backend message | No; preserved, including expired upload. UPLOAD_NOT_FOUND is 400, not 404. |
| AVATAR_VERSION_INVALID / 400 | Direct service guard; HTTP version <= 0 uses VALIDATION_FAILED | Safe 400 message if received | No; HTTP validation remains supported. |
| AVATAR_CONFLICT / 409 | profile/useAvatar | Generic upload fallback | Yes: explicit refresh guidance, no automatic upload/confirm retry. |
| AVATAR_SERVICE_UNAVAILABLE / 503 | profile/useAvatar | Generic safe server error | No; no provider detail or auto retry. |
| HABIT_NOT_FOUND / 404 | habits/useHabits; entries/Today habit toggle; stats/streak | Generic operation fallback; streak failure omitted | Yes: unavailable habit message for surfaced errors. Streak remains optional and shows Streak unavailable. Missing and unowned remain indistinguishable. |
| HABIT_CONFLICT / 409 | habits and Today mutations through shared formatter | Generic operation fallback | Yes: refresh guidance. Current FE has no habit edit/archive UI. |
| HABIT_ARCHIVED / 409 | TodayPage.changeHabit | Generic Unable to update this habit | Yes: explicit archived explanation; no new-log retry. |
| HABIT_INVALID_STATUS / 400 | habits/useHabits | Safe backend message | No; preserved. |
| ENTRY_INVALID_RANGE / 400 | entries/useEntries, Today mutations | Safe backend message | No; preserved. FE also validates history ranges locally. |
| STATS_INVALID_PERIOD / 400 | stats/useStats | Safe backend message | No; preserved. |
| SEARCH_INVALID_REQUEST / 400 | search/useEntrySearch | Safe backend message | No; preserved; blank queries/inverted ranges prevented locally. |
| SEARCH_UNAVAILABLE / 503 | search/useEntrySearch | Safe generic server error | No; no automatic retry policy exists in FE for 503. |
| INTERNAL_SERVER_ERROR / 500, including search hit missing _source | search, dashboard, entries, stats, avatar, habits | Safe generic server error except Today load exposed message | Yes: Today load now uses shared formatter; search remains generic server error and never automatically retries. |
| UNAUTHORIZED / 401 | AuthBootstrap profile sync and all API feature errors | Session expired message | No; global code retained. |
| FORBIDDEN / 403 | AuthBootstrap and all features | Permission message | No; global code retained. |
| VALIDATION_FAILED, INVALID_REQUEST, MISSING_REQUIRED_HEADER / 400 | All API consumers | Safe backend message; field errors normalized | No; message used for display only, never classification. |
| NOT_FOUND / 404; CONFLICT / 409; legacy DUPLICATE_RESOURCE / 409 | Shared formatter | Per-operation fallback | No; safe fallback retained. DUPLICATE_RESOURCE is reserved, not generic Mongo handling. |
| METHOD_NOT_ALLOWED / 405; UNSUPPORTED_MEDIA_TYPE / 415; NOT_ACCEPTABLE / 406 | Shared formatter | Per-operation fallback | No; retained. |
| CDC_MAINTENANCE_FORBIDDEN / 403; CDC_DEAD_LETTER_NOT_FOUND / 404 | No product UI caller | Not invoked | No; shared formatter would show permission/fallback. |
| E2E_RESET_FORBIDDEN / 403 | e2e/support/reset.ts | Test reset fails with HTTP status | No; tooling only, no message classification. |
| Unknown code | normalizeApiError → shared formatter | HTTP-based safe fallback | Retained: 400 displays contractual safe message; 401/403 fixed text; >=500 fixed server text; other statuses operation fallback. Module mappings require matching HTTP status. |
| No HTTP response | All shared consumers; habit creation special branch | Connection message; creation warns outcome unknown | Retained; never automatically retries mutations. |

## Complete handling inventory

- `src/api/errors.ts`: reads envelope code/status/message/errors/path/timestamp; actual Response status takes precedence. Error/string messages are normalized, not parsed for classification.
- `src/api/errorMessages.ts`: HTTP classification and explicit module code/status lookup; safe 400 message display. Local Error messages are still used for client-side validation/upload failures.
- `src/features/entries/hooks/useTodayEntry.ts`: formerly read Error.message directly; now shared formatter (confirmed inconsistency).
- `src/features/habits/pages/HabitsPage.tsx`: status null or >=500 means mutation outcome unknown; warns to inspect habits before retrying. Independent of code migration.
- Shared formatter callers: `AuthBootstrap`, `useAvatar`, `useHabits`, `TodayPage` save/toggle, `useEntries`, `useStats`, `useEntrySearch`, `useDashboard`, and now `useTodayEntry`.
- `habitsApi.listHabitStreaks`: Promise.allSettled status is promise state, not HTTP; individual streak failures degrade to unavailable without hiding successful habits.
- `profileApi.uploadAvatar`: Cloudinary response.ok gates local upload failure; does not parse remote provider message or auto retry.
- `AppErrorBoundary`: regex on Error.message identifies JS chunk-loading failures only; does not classify API responses.
- Generated client: HTTP ok/status determines success, empty 204 handling; generated SSE checks response.ok. No retry configured by createApiClient. No feature compares message text or legacy public codes.
- E2E reset helper checks response.ok/status, smoke script checks status; tests use status/message assertions. These are tooling, not UI error policy.

## Search missing _source

Backend EntrySearchControllerTest asserts 500 / INTERNAL_SERVER_ERROR for an unexpected IllegalStateException; ElasticsearchEntrySearchAdapterTest covers missing source. Blueprint explicitly distinguishes this from temporary transport failures (503 / SEARCH_UNAVAILABLE). FE tests normalize both envelopes and assert safe server messaging and one search request after 120 seconds of fake time plus rerender. There is no FE 503 auto-retry rule to apply to 500.

## Review scope

Review the new 404/409 copy and Today load normalization. Existing 400 display relies on the backend's documented safe-message guarantee. No API schema regeneration is needed: FE ApiError.code is an open string, and no endpoint/type shape changes are required by this code migration.

## Verification results

- `npm run lint`: passed.
- `npx tsc -b`: passed.
- `npm run test:run`: 27 files, 99 tests passed (includes module messages, unknown-code fallback, Today load normalization, and search 500/503 no-retry regression).
- `git diff --check`: passed.
- `npm run test:e2e`: rerun outside socket-restricted sandbox. 3 public tests passed; auth-setup failed after returning to /dashboard because AuthBootstrap displayed "Unable to prepare Moodly / Unable to reach Moodly. Check your connection and try again." 12 authenticated tests did not run. This establishes a failed API bootstrap in this environment, not the precise network/CORS/backend root cause.
- Failure details: `test-results/auth.setup.ts-authenticate-synthetic-test-user-auth-setup/error-context.md` and sibling screenshot/video (ignored generated artifacts).

Conclusion: local FE handling is compatible with the documented new exception contract after these changes; full merge readiness is NOT certified until the API bootstrap issue is resolved and authenticated E2E passes. No commit or push performed because the complete test gate has not passed.
