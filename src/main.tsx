import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { AuthBootstrap } from './auth/AuthBootstrap.tsx'
import App from './App.tsx'
import { AppErrorBoundary } from './components/errors/AppErrorBoundary.tsx'
import { getClientEnvironment } from './config/env.ts'
import { RouterAuthProvider } from './auth/RouterAuthProvider.tsx'

const environment = getClientEnvironment()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RouterAuthProvider environment={environment}>
      <AppErrorBoundary>
          <AuthBootstrap>
            <App />
          </AuthBootstrap>
      </AppErrorBoundary>
      </RouterAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
