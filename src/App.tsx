import { withAuthenticationRequired } from '@auth0/auth0-react'
import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/layout/AppShell.tsx'
import { DashboardPage } from './features/dashboard/pages/DashboardPage.tsx'
import { NotFoundPage } from './features/not-found/pages/NotFoundPage.tsx'

function RedirectingToLogin() {
  return (
    <main className="grid min-h-svh place-items-center p-6" aria-busy="true" aria-live="polite">
      <p>Redirecting to sign in…</p>
    </main>
  )
}

const ProtectedAppShell = withAuthenticationRequired(AppShell, {
  onRedirecting: RedirectingToLogin,
})

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<ProtectedAppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
