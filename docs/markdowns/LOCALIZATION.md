# Language, dates and numbers

Moodly supports English and Vietnamese. The first visit uses the browser language
(Vietnamese when it begins with `vi`, otherwise English). The explicit selection
is saved in `moodly.locale`; blocked storage falls back to an in-memory preference.
The language control is available on the landing page and the app shell, including
mobile. Switching language does not remount pages or discard unsaved form values.

Use `t` with an English source message and named placeholders for interface text.
Add its Vietnamese translation in `src/i18n/vi.ts`. Use `countMessage` for complete
sentences with singular/plural variants; do not build sentences from translated
fragments. Call `useLocale` in components that render translations. Store source
messages in local state so existing feedback changes language too. User notes,
habit names, search text and API tag identifiers are never rewritten.
Backend-authored validation messages remain as received when no local translation
exists. Add stable error-code mappings when the backend exposes new codes.

Use `formatNumber` for display quantities and `formatDate` for API calendar dates.
Numeric API values remain JSON numbers; date inputs/query parameters remain ISO
`YYYY-MM-DD`. Do not send localized dates or decimal strings to the API.

The backend source and OpenAPI contract currently use `LocalDate` for journal
calendar dates, Monday-based weeks in `Asia/Ho_Chi_Minh`, and `Instant` for timestamps.
Keep this contract: instants should be UTC ISO 8601 with a `Z`/offset; date-only
values must not be converted through the browser timezone. No BE time change is
needed for this release. Per-user timezone support would require coordinated BE
changes to today/week boundaries, streaks, aggregations and tests; changing only
the FE timezone would make those features disagree.
