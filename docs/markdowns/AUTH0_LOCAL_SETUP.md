# Auth0 and CORS for Local Frontend Development

Local and test runs use **http://127.0.0.1:5173** for both Vite and Docker. Run one frontend server at a time. The backend API uses its configured `SERVER_PORT`, usually `8080`. Port `8081` belongs to the documentation profile.

## Auth0 Dashboard

1. In the non-production tenant, open **Applications > Applications**, select the SPA that matches `VITE_AUTH0_CLIENT_ID`, and open **Settings > Application URIs**.
2. Add `http://127.0.0.1:5173` to all three lists:
   - **Allowed Callback URLs**
   - **Allowed Logout URLs**
   - **Allowed Web Origins**
3. Keep existing valid production and preview origins and select **Save Changes**.
4. If you still use `localhost`, add `http://localhost:5173` to all three lists as well. Auth0 treats `localhost` and `127.0.0.1` as distinct origins. The E2E runner uses `127.0.0.1`.
5. The current setup needs neither port `4173` nor `5174`. Remove older origins only after checking their consumers.

The frontend uses `window.location.origin` for `redirect_uri` and the logout `returnTo` value. Enter the origin without `/callback` or `/dashboard`. Keep the audience and SPA credentials unchanged when changing the frontend port. An Auth0 account owner applies these settings in the Dashboard.

## Backend CORS

Include `http://127.0.0.1:5173` in `APP_CORS_ALLOWED_ORIGINS`. If you also use `localhost`, include its origin and retain legitimate domains already in the list. Restart the backend after changing CORS. Configure the Auth0 allowlists and backend CORS independently.

## Verification

Run `make local-run` to verify sign-in and sign-out. Stop that frontend server before running `make test-run` or `make test-container-up` on the same port. Authenticated E2E uses a synthetic account and reset token from `.env.local`. Production uses its own Vercel configuration. See [Frontend Integration Testing](./FRONTEND_INTEGRATION_TESTING.md) and the [Auth0 React SDK documentation](https://auth0.github.io/auth0-react/).
