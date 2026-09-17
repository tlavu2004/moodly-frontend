import { Auth0Provider } from '@auth0/auth0-react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthBootstrap } from './auth/AuthBootstrap.tsx'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        redirect_uri: window.location.origin,
      }}
    >
      <AuthBootstrap>
        <App />
      </AuthBootstrap>
    </Auth0Provider>
  </StrictMode>,
)
