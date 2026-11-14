import { useAuth0 } from '@auth0/auth0-react'
import { useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { Icon } from '../../../components/ui/Icon.tsx'
import { LanguageSelect } from '../../../i18n/LanguageSelect.tsx'
import { t, useLocale } from '../../../i18n/index.ts'
import { ThemeSelect } from '../../../theme/ThemeSelect.tsx'
import { loginOptions, safeReturnTo } from '../../../auth/loginOptions.ts'

export function AuthWelcomePage({ mode }: { mode: 'signin' | 'signup' }) {
  useLocale()
  const { isAuthenticated, loginWithRedirect } = useAuth0()
  const [params] = useSearchParams()
  const returnTo = safeReturnTo(params.get('returnTo'))
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const pending = useRef(false)
  const signup = mode === 'signup'
  if (isAuthenticated) return <Navigate replace to={returnTo} />

  async function continueToAuth0() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setFailed(false)
    try { await loginWithRedirect(loginOptions(mode, returnTo)) }
    catch { pending.current = false; setBusy(false); setFailed(true) }
  }

  return <main className="min-h-svh bg-background">
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
      <Link to="/" className="flex items-center gap-2 text-xl font-bold" aria-label={t('Moodly home')}><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Icon name="sparkles" className="size-5" /></span>Moodly</Link>
      <div className="flex flex-wrap gap-3"><LanguageSelect /><ThemeSelect /></div>
    </header>
    <section className="mx-auto grid max-w-5xl items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-2 lg:py-24">
      <div><p className="eyebrow">{t('A calmer way to grow')}</p><h1 className="page-title mt-4">{t(signup ? 'Create your Moodly space' : 'Welcome back to Moodly')}</h1><p className="page-subtitle">{t('A small moment for your moods, habits, and reflections.')}</p>
        <ul className="mt-8 space-y-4 text-sm text-foreground-muted">{['Keep your daily rituals together.', 'Reflect at your own pace.', 'Notice what helps you feel better.'].map((message) => <li key={message} className="flex items-center gap-3"><Icon name="check" className="size-5 shrink-0 text-primary" />{t(message)}</li>)}</ul>
      </div>
      <div className="card p-6 sm:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary"><Icon name="sparkles" className="size-6" /></span>
        <h2 className="mt-5 text-xl font-bold">{t(signup ? 'Start with a little care' : 'Your space is waiting')}</h2>
        <p className="mt-3 text-sm leading-6 text-foreground-muted">{t('Continue to our secure sign-in page, powered by Auth0. Moodly never receives your password.')}</p>
        {failed && <p role="alert" className="mt-5 rounded-control bg-danger-soft p-3 text-sm text-danger">{t('We could not open sign-in. Please try again.')}</p>}
        <button type="button" className="button-primary mt-6 w-full" disabled={busy} aria-busy={busy} onClick={() => void continueToAuth0()}>{t(busy ? 'Opening secure sign-in…' : signup ? 'Continue to create account' : 'Continue to sign in')}<Icon name="arrow-right" className="size-4" /></button>
        <p className="mt-4 text-xs leading-5 text-foreground-muted">{t('Password reset and any additional verification happen on the secure sign-in page.')}</p>
        <p className="mt-6 border-t border-border pt-5 text-sm text-foreground-muted">{t(signup ? 'Already have an account?' : 'New to Moodly?')} <Link className="font-bold text-primary underline underline-offset-4" to={`${signup ? '/login' : '/signup'}?returnTo=${encodeURIComponent(returnTo)}`}>{t(signup ? 'Sign in' : 'Create account')}</Link></p>
        <Link to="/" className="mt-5 inline-block text-sm font-semibold text-foreground-muted">{t('Back to home')}</Link>
      </div>
    </section>
  </main>
}
