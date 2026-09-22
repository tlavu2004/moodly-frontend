# Frontend privacy review

## Scope and classification

Mood scores, tags, and free-form mood notes can reveal health or psychological information and must be treated as sensitive user data. Email, Auth0 subject, avatar, and note search results are personal data. This review covers the browser application; backend retention, deletion, encryption, backups, and operator access require a separate backend review before production.

## Implemented frontend controls

- Mood notes are optional and limited to 500 characters in the UI.
- Notes travel only through the authenticated API client; they are not copied to URLs, browser storage, analytics, or console logging.
- React renders note and search-highlight content as text, including markup-like input, rather than injecting HTML.
- Authenticated Playwright state is ignored by Git, and E2E documentation requires synthetic data.
- User-facing API errors are normalized and do not expose raw sensitive response bodies.

## Production requirements

- Use HTTPS for the frontend, Auth0, API, and avatar delivery.
- Do not add session replay on pages displaying mood data unless masking is verified and separately approved.
- Monitoring events may include an error class, endpoint template, HTTP status, release, and correlation ID. They must not include access tokens, request/response bodies, mood values, mood notes, email addresses, or avatar URLs.
- Define retention/deletion policy and data-subject workflows in the backend and product privacy policy before accepting real users.
- Limit production support access and audit every privileged data access.

Any new analytics, monitoring, export, sharing, or offline-storage feature must repeat this review before implementation.
