# Moodly Backend Improvement Checklist

> Track outstanding frontend work in the [Frontend Completion Checklist](./FRONTEND_COMPLETION_CHECKLIST.md).

## Purpose

This checklist records backend changes identified while comparing the frontend with `moodly-openapi.json` v1. Frontend milestone 6 covered the following functional routes:

- Dashboard with live habit, entry, streak, and mood trend data.
- Habit listing, creation, and streaks.
- Daily mood check-in and habit log updates.
- Journal history filtered by date.
- Weekly mood trend and most-missed habit statistics.
- Avatar signatures, Cloudinary uploads, and confirmation.
- Search using `q`, `from`, and `to`.

The backend and contract work below was tracked separately from completion of that milestone. The introductory notes under each item describe the gap identified at the time of the review.

## P0 — Product Decisions Before Expanding Scope

### 1. Standardize `targetFrequency`

The original request accepted any nonblank string. The frontend offered `DAILY`, `WEEKDAYS`, and `WEEKLY`, while the backend stored the string without frequency-specific streak or missed-habit logic.

- [x] Support `DAILY` as the only official frequency.
- [x] Model the frequency as a backend enum.
- [x] Expose the enum in OpenAPI so the SDK generates the intended union type.
- [x] Return a validation error on `targetFrequency` for unsupported values.
- [x] Exclude `WEEKDAYS` from the frontend selector and backend rules.
- [x] Exclude `WEEKLY` from the frontend selector and backend rules.
- [x] Keep the daily streak calculation for `DAILY`.
- [x] Count daily habit logs with `done: false` for most-missed habits.
- [x] Cover `DAILY` and unsupported values in integration tests.

### 2. Define the Mood Statistics Period

```http
GET /stats/mood-trend?period=week
```

The frontend shows the current week. Ranges such as four weeks, twelve weeks, or six months require backend support before adding a frontend selector.

- [x] Support only the `week` period in the current scope.
- [x] Expose `week` as the only `period` value in the OpenAPI enum.
- [x] Return daily buckets for the current week.
- [x] Sort the response in ascending date order.
- [x] Start the week on Monday in `Asia/Ho_Chi_Minh`.
- [x] Return `INVALID_REQUEST` with supported values when the period is invalid.
- [x] Cover supported and unsupported periods in integration tests.

## P1 — Frontend Reliability and Efficiency

### 3. Add a Dashboard Summary Endpoint

The original dashboard used `GET /entries`, `GET /habits`, `GET /stats/mood-trend`, and one `GET /habits/{habitId}/streak` per habit. Per-habit streak requests produced an N+1 pattern.

- [x] Add authenticated `GET /dashboard`.
- [x] Return today's entry, active habits, completion ratio, weekly mood summary, and best streak in one response.
- [x] Use the summary endpoint and read entry history once to compute the best streak.
- [x] Use `Cache-Control: no-store` because the summary is user-specific and changes after check-in.
- [x] Verify in integration tests that the summary belongs to the authenticated user.

### 4. Complete the Habit Lifecycle

The original contract only listed active habits and created them. Renaming, changing icons, archiving, and restoring required lifecycle endpoints.

- [x] Add an endpoint for updating habits.
- [x] Add archiving or deactivation in place of hard deletion.
- [x] Preserve historical entries and their habit logs after archival.
- [x] Support `active`, `archived`, and `all` filters on `GET /habits`.
- [x] Use optimistic locking with client-supplied `version` and HTTP 409 on conflicts.

### 5. Paginate Unbounded Results

The original Entries and Search endpoints returned every matching result.

- [x] Paginate `GET /entries`.
- [x] Paginate `GET /entries/search`.
- [x] Use zero-based `page` and consistent `size` parameters.
- [x] Return `totalElements`, `totalPages`, and `hasNext`.
- [x] Enforce a maximum `size` of 100.
- [x] Document both endpoints' pagination in OpenAPI.

### 6. Define and Enforce Avatar Upload Limits

The frontend already limited uploads to JPG, PNG, WebP, and roughly 5 MB. The API schema needed to express those limits.

- [x] List supported MIME types in OpenAPI.
- [x] Document the 5 MiB file limit in the schema.
- [x] Return distinct error codes for invalid content type, oversized files, and missing uploads.
- [x] Expire upload signatures after one hour and return `expiresAt`.
- [x] Save the new profile metadata before deleting the old Cloudinary asset.
- [x] Add `DELETE /me/avatar` to clear the custom avatar.
- [x] Test expired signatures and confirmation with an invalid `publicId`.

### 7. Standardize Search Highlights

The original `EntrySearchResult.highlights` mapped field names to string arrays without specifying whether the strings contained markup.

- [x] Return highlight content as plain text.
- [x] Include zero-based, end-exclusive ranges to reduce XSS risk.
- [x] Keep markup out of API responses.
- [x] Limit highlights to `mood.note`, `habits.note`, and `mood.tags`.
- [x] Reject blank `q` after trimming and limit it to 200 characters.
- [x] Sort reliably by descending `_score`, then by descending `date`.

### 8. Add an Endpoint for Today's Entry

The frontend originally used `GET /entries` with identical `from` and `to` dates.

- [x] Add `GET /entries/today`.
- [x] Return `{ date, checkedIn: false, entry: null }` before check-in.
- [x] Return the full updated daily entry from today's PUT and PATCH endpoints.

## P2 — Contract Quality and Operations

### 9. Define Required Response Fields

The original schema marked most response fields optional, so the SDK generated optional fields that the backend always returned.

- [x] Require guaranteed fields such as IDs, dates, and core response fields.
- [x] Describe nullable fields separately.
- [x] Add examples for successful, empty, and error responses.
- [x] Use the `success/data/error/timestamp` envelope consistently.

### 10. Standardize Error Codes

- [x] Define stable codes for validation, authentication, missing resources, conflicts, and uploads.
- [x] Return a validation `field` that matches the request field name.
- [x] Distinguish business errors from system errors.
- [x] Keep exception details and sensitive data out of client responses and logs.
- [x] Include important error codes in OpenAPI examples.

### 11. Define Calendar and Time Zone Rules

- [x] Use `Asia/Ho_Chi_Minh` as the calendar source for entries, streaks, and statistics.
- [x] Keep profile-level time zones out of scope while the product supports one region.
- [x] Start weeks on Monday.
- [x] Test the date boundary and confirm the absence of future DST transitions.
- [x] Document calendar conventions in the API documentation.

### 12. Performance and Observability

- [x] Use a unique compound `userId + date` index for daily entries.
- [x] Map keyword filters for `userId` and date, and map text fields for full-text search in Elasticsearch.
- [x] Add the `userId + habits.done + habits.habitId` compound index and use the `userId + date` prefix for mood trends.
- [x] Configure Cloudinary's two-second connection timeout and five-second request timeout through the environment.
- [x] Include `X-Request-ID` in MDC, the response header, and the error envelope.
- [x] Track latency and error rates with `http.server.requests` and percentile histograms.
- [x] Keep tokens, authorization headers, mood notes, and raw exception messages out of logs.

## Implementation Order

The review recorded all seven implementation groups as complete. Work followed the P0, P1, and P2 business dependencies. Required response fields were finalized in P2.9 after the P1 endpoints were in place, so OpenAPI could be updated against the final contract.

1. Decide the supported `targetFrequency`.
2. Define the statistics period.
3. Standardize OpenAPI enums, required fields, and validation.
4. Address the Dashboard N+1 request pattern with a summary or batch endpoint.
5. Paginate Entries and Search.
6. Complete the habit and avatar lifecycles.
7. Standardize time zone behavior, performance controls, and observability.

After each contract change, run the frontend checks:

```bash
npm run generate:api
npm run lint
npm run build
```

Expose frontend options and behaviors supported by the current backend contract.

## Frontend Bundle Warning

The frontend addressed the roughly 545 kB bundle warning under section 9.1 of the [Frontend Completion Checklist](./FRONTEND_COMPLETION_CHECKLIST.md).

```tsx
import { lazy, Suspense } from 'react'

const StatsPage = lazy(() =>
  import('./features/stats/pages/StatsPage.tsx').then((module) => ({
    default: module.StatsPage,
  })),
)
```

At this checkpoint, the route tree used an accessible `Suspense` loading fallback and split public and protected pages from the initial chunk. AppShell remained in the initial chunk, and React, React Router, and Auth0 had separate vendor chunks. The build checks raw, gzip, and Brotli sizes from the Vite manifest against a performance budget.
