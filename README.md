## TODO: Protected routes

- **What to do:** Once React Router is selected, define public and protected routes, then wrap pages that require authentication with Auth0 (`withAuthenticationRequired` or an equivalent route guard). Preserve the intended URL so users return to the right page after signing in.
- **When to revisit:** Start this immediately before implementing the first page that anonymous users cannot access (for example, a dashboard or profile), after the route map and React Router have been agreed. Complete it in a dedicated routing/auth-flow branch.
