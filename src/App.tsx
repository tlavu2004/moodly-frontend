import { t, useLocale } from './i18n/index.ts'
import { withAuthenticationRequired } from '@auth0/auth0-react'
import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { AppShell } from './components/layout/AppShell.tsx'

const DashboardPage = lazy(() =>
  import('./features/dashboard/pages/DashboardPage.tsx').then(({ DashboardPage }) => ({ default: DashboardPage })),
)
const LandingPage = lazy(() =>
  import('./features/landing/pages/LandingPage.tsx').then(({ LandingPage }) => ({ default: LandingPage })),
)
const HabitsPage = lazy(() =>
  import('./features/habits/pages/HabitsPage.tsx').then(({ HabitsPage }) => ({ default: HabitsPage })),
)
const EntriesPage = lazy(() =>
  import('./features/entries/pages/EntriesPage.tsx').then(({ EntriesPage }) => ({ default: EntriesPage })),
)
const TodayPage = lazy(() =>
  import('./features/entries/pages/TodayPage.tsx').then(({ TodayPage }) => ({ default: TodayPage })),
)
const StatsPage = lazy(() =>
  import('./features/stats/pages/StatsPage.tsx').then(({ StatsPage }) => ({ default: StatsPage })),
)
const ProfilePage = lazy(() =>
  import('./features/profile/pages/ProfilePage.tsx').then(({ ProfilePage }) => ({ default: ProfilePage })),
)
const SearchPage = lazy(() =>
  import('./features/search/pages/SearchPage.tsx').then(({ SearchPage }) => ({ default: SearchPage })),
)
const NotFoundPage = lazy(() =>
  import('./features/not-found/pages/NotFoundPage.tsx').then(({ NotFoundPage }) => ({ default: NotFoundPage })),
)

function RedirectingToLogin() {
  useLocale()
  return (
    <main className="grid min-h-svh place-items-center p-6" aria-busy="true" aria-live="polite">
      <p>{t("Redirecting to sign in…")}</p>
    </main>
  )
}

function LoadingRoute() {
  useLocale()
  return (
    <main className="grid min-h-svh place-items-center p-6" aria-busy="true" aria-live="polite">
      <p>{t("Loading page…")}</p>
    </main>
  )
}

const ProtectedAppShell = withAuthenticationRequired(AppShell, {
  onRedirecting: RedirectingToLogin,
})

function App() {
  useLocale()
  return (
    <Suspense fallback={<LoadingRoute />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<ProtectedAppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/entries" element={<EntriesPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/search" element={<SearchPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default App
