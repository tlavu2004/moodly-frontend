import { useAuth0 } from '@auth0/auth0-react'
import { NavLink, Outlet } from 'react-router'
import { Icon, type IconName } from '../ui/Icon.tsx'
import { safeImageUrl } from '../../lib/safeImageUrl.ts'

const navigation: Array<{ label: string; to: string; icon: IconName }> = [
  { label: 'Overview', to: '/dashboard', icon: 'home' }, { label: 'Today', to: '/today', icon: 'check' },
  { label: 'Habits', to: '/habits', icon: 'leaf' }, { label: 'Entries', to: '/entries', icon: 'calendar' },
  { label: 'Insights', to: '/stats', icon: 'chart' },
  { label: 'Search', to: '/search', icon: 'search' },
]

function getInitials(name: string): string { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') }

export function AppShell() {
  const { logout, user } = useAuth0()
  const displayName = user?.name ?? user?.email ?? 'Moodly user'
  const pictureUrl = safeImageUrl(user?.picture)
  return (
    <div className="min-h-svh bg-background text-foreground lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r border-border bg-surface lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col">
        <NavLink className="flex h-20 items-center gap-2 px-7 text-xl font-bold tracking-tight" to="/dashboard"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Icon name="sparkles" className="size-5" /></span>Moodly</NavLink>
        <nav className="flex flex-1 flex-col gap-1 px-4 py-3" aria-label="Primary navigation">
          {navigation.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-primary-soft text-primary' : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'}`}><Icon name={item.icon} className="size-5" />{item.label}</NavLink>)}
        </nav>
        <div className="border-t border-border p-4">
          <NavLink to="/profile" className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-muted">
            {pictureUrl ? <img className="size-9 rounded-full object-cover" src={pictureUrl} alt="" referrerPolicy="no-referrer" /> : <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{getInitials(displayName)}</span>}
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{displayName}</span><span className="block truncate text-xs text-foreground-muted">View profile</span></span>
          </NavLink>
          <button type="button" className="mt-2 w-full rounded-control px-3 py-2 text-left text-xs font-semibold text-foreground-muted hover:bg-surface-muted" onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>Log out</button>
        </div>
      </aside>
      <header className="sticky top-0 z-20 col-start-2 flex h-16 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur lg:hidden">
        <NavLink className="flex items-center gap-2 font-bold" to="/dashboard"><span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Icon name="sparkles" className="size-4" /></span>Moodly</NavLink>
        <NavLink to="/search" aria-label="Search" className="rounded-lg p-2 text-foreground-muted"><Icon name="search" className="size-5" /></NavLink>
      </header>
      <div className="min-w-0 lg:col-start-2"><Outlet /></div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface px-2 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Mobile navigation">
        {navigation.filter((item) => item.to !== '/search').map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex min-h-16 flex-col items-center justify-center gap-1 text-[0.65rem] font-semibold ${isActive ? 'text-primary' : 'text-foreground-muted'}`}><Icon name={item.icon} className="size-5" />{item.label}</NavLink>)}
      </nav>
    </div>
  )
}
