import { useAuth0 } from '@auth0/auth0-react'
import { NavLink, Outlet } from 'react-router'

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function AppShell() {
  const { logout, user } = useAuth0()
  const displayName = user?.name ?? user?.email ?? 'Moodly user'

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <NavLink className="text-lg font-semibold text-foreground" to="/dashboard">
            Moodly
          </NavLink>

          <nav className="flex flex-1 items-center gap-1" aria-label="Primary navigation">
            <NavLink
              className={({ isActive }) =>
                `rounded-control px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-surface-muted text-foreground' : 'text-foreground/70'
                }`
              }
              to="/dashboard"
            >
              Dashboard
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            {user?.picture ? (
              <img
                className="size-9 rounded-full border border-border object-cover"
                src={user.picture}
                alt={`${displayName}'s avatar`}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                className="grid size-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                aria-label={`${displayName}'s avatar`}
              >
                {getInitials(displayName)}
              </span>
            )}
            <span className="hidden max-w-40 truncate text-sm sm:block">{displayName}</span>
            <button
              type="button"
              className="rounded-control border border-border px-3 py-2 text-sm font-medium"
              onClick={() =>
                logout({ logoutParams: { returnTo: window.location.origin } })
              }
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  )
}
