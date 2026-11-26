# Frontend integration and E2E

## Configuration

Workstation local/test share `.env.local` (template `.env.local.example`).
No `.env.test` or `.env.test.local` is needed. Four public VITE variables configure
Auth0/API. Four optional runner-only variables configure authenticated E2E:

```dotenv
E2E_TEST_USER_EMAIL=
E2E_TEST_USER_PASSWORD=
E2E_DATA_RESET_URL=
E2E_DATA_RESET_TOKEN=
```

The test user must be a synthetic account whose Auth0 subject matches BE's configured
`MOODLY_E2E_USER_ID`; never use your real journal account. The account's credentials
are not exposed to Vite or Docker build arguments. Production never reads `.env.local`.
CI receives values explicitly through its test environment, not committed env files.

## One frontend origin

Every workstation mode uses `http://127.0.0.1:5173`: local/test, Vite/Nginx.
Stop the server you own before switching; Playwright never adopts an unknown server.
FE execution mode and server type are checked using `/moodly-config.json` before tests.
API host/port comes from VITE_API_BASE_URL; sharing FE port does not isolate BE data.
Auth0 callback/logout/web origins and backend CORS must permit the exact origin.
See [Auth0 setup](./AUTH0_LOCAL_SETUP.md).

## Commands (FE repository)

```sh
make verify
# Public only, owns Vite and cleans it up afterwards; port 5173 must be free
npx playwright test --project=public

# Full suite on owned Vite, requires BE and synthetic credentials
make e2e-dev

# Full suite on existing Nginx; stop Vite first
make test-container-up
make e2e-container
make local-container-stop
```

Make supplies E2E_TARGET for each invocation. Do not add E2E_TARGET/E2E_BASE_URL to
.env.local. They are runner switches, not additional required environment inputs.
Auth state gets a new per-run ignored directory; teardown removes only that run's
known files. Do not upload authenticated storage state, video/trace or sensitive notes.

## Actual backend reset contract

The checked-in sibling BE implements `POST /internal/e2e/reset` with
`X-E2E-Reset-Token`. The controller/service are disabled for prod/production and opt-in
elsewhere. The target userId is server-configured and cannot be supplied by the FE.
The service deletes/seeds only that fixed synthetic subject. It seeds 2 habits/3
entries and verifies search indexing. Do not enable/configure it for a real user.

FE checks the four runner inputs, exact reset path, same API origin, no URL
credentials/query/fragment and no redirects before sending a reset token. Local runs
are restricted to loopback unless explicitly authorized as remote. A failure/403
stops the suite; there is no retry against another endpoint or reset target.

There is no BE capabilities/namespace-attestation endpoint in this implementation.
The former proposed E2E_NAMESPACE/E2E_TEST_CONTRACT_URL requirements have been removed;
FE does not invent endpoint variables for contracts BE has not implemented. These
client checks cannot prove database isolation: the BE owner must configure the fixed
synthetic subject and choose the correct local/test data namespace. Use the BE test
launcher where appropriate, never a production deployment.

## Remote (optional, separately authorized)

Remote mode remains available in CI or explicit process inputs; it is not in the
workstation template. Configure a test frontend URL and test backend/synthetic account.
The backend must enforce its non-production/fixed-account restrictions. No production
writes are permitted. HTTPS and E2E_ALLOW_REMOTE_WRITES=1 are required; keep the flag
out of .env.local and supply it only for the authorized run. The separate **Authenticated E2E** workflow
(`.github/workflows/e2e.yml`) runs only through `workflow_dispatch`
and uses the GitHub `test` environment. Its `authenticated_remote` input defaults
to false; a run without explicit authorization fails before checkout or test writes.
Runs are serialized across refs because they share one synthetic account.

To run it, open Actions > Authenticated E2E > Run workflow, select the reviewed ref,
enable `authenticated_remote`, and ensure the test FE/BE are reachable and the
`test` environment variables/secrets are configured. A newly added manual workflow
appears in the Actions list after its file is merged into the default branch.

**Frontend CI** remains independent: PRs and pushes to `main` run quality checks
and public E2E on Vite/Nginx. Its manual trigger runs those same checks and never
authorizes authenticated remote writes. Remote E2E is not a required PR check.

## Troubleshooting

- Port occupied: stop the Vite/Nginx instance you started; do not enable server reuse.
- Build identity mismatch: rebuild the container with the current shared public config.
- Auth0 callback mismatch: verify the SPA/client ID and allowlist 127.0.0.1:5173.
- API CORS: restart BE after updating its allowlist; Auth0 settings do not set API CORS.
- Reset 403/unavailable: check BE opt-in reset configuration and token on the dedicated
  synthetic account. Do not disable FE validation or redirect tokens to another URL.
- Scope the tests you actually ran; public-only does not establish authenticated coverage.


## Habits page performance

The browser benchmark uses the existing authenticated setup and fixed-account
reset guard. Run it against the loopback backend with a synthetic account after
the other authenticated tests have finished. It resets that subject, measures
the two seeded active habits, creates eight more, and records today's completion
for each new habit. The seeded history is small, so repeat on a dedicated test
dataset before extrapolating to long journal histories.

```powershell
$env:E2E_HABITS_BENCHMARK = '1'
npx playwright test e2e/habits-performance.smoke.spec.ts --project=authenticated
Remove-Item Env:E2E_HABITS_BENCHMARK
```

For each habit count, discard one warm-up and collect 100 navigations at a
390px viewport. Each navigation captures correlated measurements:

| Metric | Start and end |
| --- | --- |
| Page load | Runner monotonic clock from just before `page.goto('/habits')` until Playwright observes all expected cards. Includes navigation, auth bootstrap, fetching, rendering, and Playwright's polling delay. |
| Habit list request | Browser Resource Timing duration for `GET /habits`. |
| Individual streak request | Resource duration for each `GET /habits/{habitId}/streak`, pooled across navigations. |
| Slowest streak per load | Maximum individual streak duration in that navigation. |
| Parallel streak group | First streak request start to last streak response end in that navigation. Includes gaps between dispatches and overlap. |
| Last response to cards in DOM | Last habit API response end to the first DOM update with the expected card count, marked with a MutationObserver. |

API timings include browser and network overhead along with backend time.
The last-response interval includes client processing and DOM updates.
Server-only execution and visual paint require separate instrumentation.
Keep comparisons on the same machine, backend, browser, and observation method.
The Playwright attachment includes per-navigation samples so slow phases can
be compared within the same load. Percentiles from different phases may come
from different navigations and should not be subtracted.

Sort each metric's elapsed times in ascending order. For 100 samples, the
median is the mean of ranks 50 and 51. Pooled streak request metrics contain
200 or 1,000 samples. Use nearest rank `ceil(p × N)` for percentiles
with one-based ranks, so p95 is rank 95 and p99 is rank 99. Round the final
statistics to whole milliseconds. With 100 observations, p99 can change
noticeably with a few slow navigations. Treat it as a local snapshot.

Check the habit list plus streak request count and any failed streak reads.
The local test instance needs enough quota for the full batch under its
existing test configuration. Review the N+1 pattern if typical active
counts grow beyond 10 or measured p95 exceeds one second.

### Local backend result on 2026-11-26

Chromium, 390px viewport, loopback test backend with the synthetic history
described above. Authentication setup and the benchmark both passed.

Values are milliseconds, shown as median / p95 / p99. There were 100
measured navigations per group, with 3 and 11 habit API requests per
document, respectively.

#### End-to-end Habits page load

| Metric | 2 active habits | 10 active habits |
| --- | ---: | ---: |
| Navigation to Playwright observing all cards | 899 / 926 / 959 | 896 / 922 / 927 |

Both groups stayed under the one-second p95 page-load review threshold.
This measures one user flow on Chromium and a loopback test backend.
The short synthetic history limits conclusions about deployed performance.

#### Backend API calls observed by the browser

| Metric | 2 active habits | 10 active habits |
| --- | ---: | ---: |
| Habit list request | 7 / 10 / 11 | 6 / 8 / 10 |
| Individual streak request | 10 / 16 / 19 | 17 / 29 / 45 |
| Slowest streak per load | 11 / 16 / 19 | 21 / 33 / 53 |
| Parallel streak group | 11 / 16 / 19 | 22 / 35 / 56 |

These are browser-observed request durations. Server-side processing
percentiles for `GET /habits` and `GET /habits/{habitId}/streak` were not
measured in this run. Measuring those requires timing on BE for the same
requests, with server-side observations tied to each benchmark run.

#### Frontend after the last habit API response

| Metric | 2 active habits | 10 active habits |
| --- | ---: | ---: |
| Last response to all cards in the DOM | 4 / 8 / 10 | 13 / 17 / 19 |

This window covers client processing and DOM updates after the last habit
API response. Navigation, session bootstrap, and browser paint are outside
this window. To investigate the remaining end-to-end time, measure those
milestones within individual loads and compare matched samples.

### Simulated API fixture

If Auth0 blocks the browser benchmark, the fixture below renders the actual FE
page in jsdom. It simulates a 100 ms list read and streak reads ranging from
100 to 280 ms, with the same sample count. The numbers exclude browser paint,
Auth0, and backend processing.

```powershell
$env:MOODLY_HABITS_FIXTURE_BENCHMARK = '1'
npx vitest run src/features/habits/pages/HabitsPage.performance.test.tsx
Remove-Item Env:MOODLY_HABITS_FIXTURE_BENCHMARK
```

Fixture results are written to `reports/habits-fixture-performance.json`.


## OpenAPI issue for the backend owner

OpenAPI 3.1 in backend commit `5038c96` describes several nullable objects with
a sibling `"$ref"` and `"type": "null"`. Both constraints apply, so a JSON
Schema validator can reject both a valid object and null. For example,
`ApiResponseDailyEntryResponse.properties.data` refers to
`DailyEntryResponse`. The same pattern occurs in
`TodayEntryResponse.properties.entry` and `DailyEntryResponse.properties.mood`.

Generate an `anyOf` with one branch for the object reference and one branch for
`{ "type": "null" }` wherever the wire response permits either value. Verify
that validators accept both the populated and the empty response, then merge
the corrected OpenAPI in the backend. The frontend can update its pin and
regenerate its client from that merged commit.
