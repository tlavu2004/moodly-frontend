import { useAuth0 } from '@auth0/auth0-react'

export function AuthControls() {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0()

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        className="rounded-control bg-primary px-4 py-2 font-medium text-primary-foreground"
        onClick={() => void loginWithRedirect()}
      >
        Log in
      </button>
    )
  }

  const displayName = user?.name ?? user?.email ?? 'Authenticated user'

  return (
    <section
      className="flex items-center gap-3 rounded-card border border-border bg-surface p-4"
      aria-label="Authentication status"
    >
      {user?.picture ? (
        <img
          className="size-10 rounded-full"
          src={user.picture}
          alt={`${displayName}'s avatar`}
          referrerPolicy="no-referrer"
        />
      ) : null}
      <p className="flex-1 text-left text-sm">Signed in as {displayName}</p>
      <button
        type="button"
        className="rounded-control border border-border px-3 py-2 text-sm font-medium"
        onClick={() =>
          logout({ logoutParams: { returnTo: window.location.origin } })
        }
      >
        Log out
      </button>
    </section>
  )
}
