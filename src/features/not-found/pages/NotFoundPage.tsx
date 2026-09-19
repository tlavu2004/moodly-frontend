import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <section className="max-w-md rounded-card border border-border bg-surface p-6 text-center">
        <p className="text-sm font-medium text-foreground/60">404</p>
        <h1 className="mt-1 text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-foreground/75">
          The page you requested does not exist.
        </p>
        <Link
          className="mt-5 inline-flex rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          to="/dashboard"
        >
          Go to dashboard
        </Link>
      </section>
    </main>
  )
}
