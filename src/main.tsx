import { Auth0Provider } from '@auth0/auth0-react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { AuthBootstrap } from './auth/AuthBootstrap.tsx'
import App from './App.tsx'
import { AppErrorBoundary } from './components/errors/AppErrorBoundary.tsx'
import { getClientEnvironment } from './config/env.ts'

const environment = getClientEnvironment()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={environment.auth0Domain}
      clientId={environment.auth0ClientId}
      authorizationParams={{
        audience: environment.auth0Audience,
        redirect_uri: window.location.origin,
      }}
    >
      <AppErrorBoundary>
        <BrowserRouter>
          <AuthBootstrap>
            <App />
          </AuthBootstrap>
        </BrowserRouter>
      </AppErrorBoundary>
    </Auth0Provider>
  </StrictMode>,
)
