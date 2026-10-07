import { Auth0Provider } from '@auth0/auth0-react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { AuthBootstrap } from './auth/AuthBootstrap.tsx'
import App from './App.tsx'
import { AppErrorBoundary } from './components/errors/AppErrorBoundary.tsx'
import { getClientEnvironment } from './config/env.ts'
import { createLocalSessionCache } from './auth/localSessionCache.ts'

const environment = getClientEnvironment()
const localCache = createLocalSessionCache(window.location.hostname)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={environment.auth0Domain}
      clientId={environment.auth0ClientId}
      cache={localCache}
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
