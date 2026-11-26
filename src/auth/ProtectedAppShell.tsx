import { useAuth0 } from '@auth0/auth0-react'
import { Navigate, useLocation } from 'react-router'
import { lazy } from 'react'
import { safeReturnTo } from './loginOptions.ts'

const AppShell = lazy(() =>
  import('../components/layout/AppShell.tsx').then(({ AppShell }) => ({ default: AppShell })),
)

/** Public introduction preserves the requested route before Universal Login. */
export function ProtectedAppShell() {
  const { isAuthenticated } = useAuth0()
  const location = useLocation()
  if (!isAuthenticated) {
    const returnTo = safeReturnTo(location.pathname + location.search + location.hash)
    return <Navigate replace to={`/login?returnTo=${encodeURIComponent(returnTo)}`} />
  }
  return <AppShell />
}
