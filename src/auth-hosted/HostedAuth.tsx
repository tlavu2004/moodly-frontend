import { useRef, useState, type FormEvent } from 'react'
import type { PasswordComplexityRule } from '@auth0/auth0-acul-js/types'
import { Icon } from '../components/ui/Icon.tsx'
import { Captcha } from './Captcha.tsx'
import { hostedText } from './copy.ts'
import { submitConnection, submitCredentials, transactionLink, type HostedManager } from './adapter.ts'

function PasswordRules({ rules }: { rules: PasswordComplexityRule[] }) {
  return <ul className="mt-2 space-y-1 text-xs text-foreground-muted">{rules.map((rule) => <li key={rule.code}><span aria-hidden="true">{rule.status === 'valid' ? '✓ ' : '○ '}</span>{rule.label}{rule.items && <PasswordRules rules={rule.items} />}</li>)}</ul>
}
export function HostedAuth({ manager }: { manager: HostedManager }) {
  const locale = manager.transaction.locale || 'en'
  const text = (message: string, values?: Record<string, string>) => hostedText(locale, message, values)
  const screen = manager.screen.name
  const signup = screen.startsWith('signup')
  const reset = screen === 'reset-password'
  const requestReset = screen === 'reset-password-request'
  const emailSent = screen === 'reset-password-email'
  const passwordStep = screen === 'login-password' || screen === 'signup-password'
  const needsPassword = ['login', 'login-password', 'signup', 'signup-password', 'reset-password'].includes(screen)
  const data = manager.screen.data as Record<string, unknown> | null
  const originalIdentifier = typeof data?.email === 'string' ? data.email : typeof data?.username === 'string' ? data.username : manager.user.email ?? manager.user.username ?? ''
  const [identifier, setIdentifier] = useState(originalIdentifier)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [theme, setTheme] = useState(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  const [captcha, setCaptcha] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [rules, setRules] = useState<PasswordComplexityRule[]>([])
  const pending = useRef(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const title = reset || requestReset ? 'Reset your password' : emailSent ? 'Check your email' : passwordStep ? signup ? 'Choose your password' : 'Enter your password' : signup ? 'Create your Moodly space' : 'Welcome back to Moodly'
  const action = reset ? 'Save new password' : requestReset ? 'Send reset email' : emailSent ? 'Request another email' : screen.endsWith('-id') ? 'Continue' : signup ? 'Create account' : 'Sign in'
  const links = manager.screen.links
  const signupLink = transactionLink(links?.signup)
  const loginLink = transactionLink(links?.login)
  const resetLink = transactionLink(links?.reset_password)
  const editLink = transactionLink(links?.edit_identifier)
  const errors = manager.getErrors()
  const languages = (manager.tenant.enabledLocales ?? [locale]).filter((value) => value === 'en' || value === 'vi')
  const captchaRequired = manager.screen.isCaptchaAvailable && !emailSent

  function report(message: string) {
    setFailure(message)
    requestAnimationFrame(() => errorRef.current?.focus())
  }
  async function run(action: () => Promise<void>, releaseOnResolve = false) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setFailure('')
    try { await action(); if (releaseOnResolve) { pending.current = false; setBusy(false) } }
    catch { pending.current = false; setBusy(false); setPassword(''); setConfirmation(''); report('Please try again. Your request could not be completed.') }
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (reset && password !== confirmation) { report('Passwords do not match.'); return }
    if ((signup || reset) && needsPassword && 'validatePassword' in manager) {
      const validation = manager.validatePassword(password)
      setRules(validation.results)
      if (!validation.isValid) { report('Your password must meet the requirements below.'); return }
    }
    if (captchaRequired && !captcha) { report('Complete the security check to continue.'); return }
    void run(() => submitCredentials(manager, { identifier, password, confirmation, ...(captcha ? { captcha } : {}) }))
  }

  return <main className="min-h-svh bg-background">
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
      <span className="flex items-center gap-2 text-xl font-bold"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Icon name="sparkles" className="size-5" /></span>Moodly</span>
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
        {languages.length > 1 && <label className="inline-flex items-center gap-2">{text('Language')}<select className="field-input w-auto" aria-label={text('Language')} value={locale} disabled={busy} onChange={(event) => { setPassword(''); setConfirmation(''); void run(() => manager.changeLanguage({ language: event.target.value, persist: 'session' })) }}><option value="en">English</option><option value="vi">Tiếng Việt</option></select></label>}
        <button className="button-secondary" type="button" disabled={busy} aria-label={text('Theme')} aria-pressed={theme === 'dark'} onClick={() => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); setCaptcha(''); document.documentElement.dataset.theme = next; document.documentElement.style.colorScheme = next }}>{text('Light')} / {text('Dark')}</button>
      </div>
    </header>
    <section className="mx-auto grid max-w-5xl items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-2 lg:py-20">
      <div><p className="eyebrow">{text('A calmer way to grow')}</p><h1 className="mt-5 max-w-md text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{text('Small habits. Brighter days.')}</h1><p className="page-subtitle mt-5 max-w-md">{text('A small moment for your moods, habits, and reflections.')}</p><div className="mt-8 flex gap-3 text-3xl" aria-hidden="true"><span className="rounded-2xl bg-primary-soft p-4">🌿</span><span className="rounded-2xl bg-warning-soft p-4">🌤️</span><span className="rounded-2xl bg-surface-muted p-4">📖</span></div></div>
      <section className="card p-6 sm:p-8" aria-labelledby="auth-title">
        <h2 id="auth-title" className="text-2xl font-bold tracking-tight">{text(title)}</h2>
        {emailSent && <p className="mt-4 text-sm leading-6 text-foreground-muted">{text('If an account matches, you will receive an email with the next steps.')}</p>}
        {passwordStep && <p className="mt-3 break-all text-sm text-foreground-muted">{identifier} {editLink && <a className="font-semibold text-primary underline" href={editLink}>{text('Change email')}</a>}</p>}
        <div ref={errorRef} tabIndex={-1} className="mt-4" aria-live="assertive" aria-atomic="true">{(failure || errors.length > 0) && <div role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger">{failure ? text(failure) : errors.map((error, index) => <p key={`${error.code}-${index}`}>{error.message}</p>)}</div>}</div>
        <form className="mt-5 space-y-5" onSubmit={submit}>
          {!emailSent && !reset && !passwordStep && <div><label className="field-label" htmlFor="identifier">{text(signup ? 'Email' : 'Email or username')}</label><input className="field-input" id="identifier" name="username" type={signup ? 'email' : 'text'} inputMode={signup ? 'email' : 'text'} autoComplete="username" autoCapitalize="none" spellCheck={false} required value={identifier} disabled={busy} onChange={(event) => setIdentifier(event.target.value)} /></div>}
          {needsPassword && <div><label className="field-label" htmlFor="password">{text(reset ? 'New password' : 'Password')}</label><div className="relative"><input id="password" name="password" className="field-input pr-20" type={showPassword ? 'text' : 'password'} autoComplete={signup || reset ? 'new-password' : 'current-password'} required value={password} disabled={busy} aria-describedby={rules.length ? 'password-rules' : undefined} onChange={(event) => setPassword(event.target.value)} /><button type="button" className="absolute inset-y-0 right-2 px-2 text-xs font-semibold text-primary" aria-label={text(showPassword ? 'Hide password' : 'Show password')} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? '◉' : '◎'}</button></div><div id="password-rules"><PasswordRules rules={rules} /></div></div>}
          {reset && <div><label className="field-label" htmlFor="confirmation">{text('Confirm password')}</label><input id="confirmation" name="re-enter-password" className="field-input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} /></div>}
          {captchaRequired && <Captcha key={theme} config={manager.screen.captcha} locale={locale} onValue={setCaptcha} />}
          <button className="button-primary w-full" type="submit" disabled={busy || (captchaRequired && !captcha)} aria-busy={busy}>{text(busy ? 'Working…' : action)}<Icon name="arrow-right" className="size-4" /></button>
        </form>
        {'passkeyLogin' in manager && manager.transaction.isPasskeyEnabled && <button className="button-secondary mt-4 w-full" type="button" disabled={busy} onClick={() => void run(() => manager.passkeyLogin(), true)}>{text('Use a passkey')}</button>}
        {!signup && !requestReset && !reset && !emailSent && resetLink && <a className="mt-4 block text-sm font-semibold text-primary underline underline-offset-4" href={resetLink}>{text('Forgot password?')}</a>}
        {manager.transaction.alternateConnections?.length && ('federatedLogin' in manager || 'federatedSignup' in manager) ? <div className="mt-6 space-y-3 border-t border-border pt-5"><p className="text-center text-xs text-foreground-muted">{text('or')}</p>{manager.transaction.alternateConnections.map((connection) => <button type="button" key={connection.name} className="button-secondary w-full" disabled={busy} onClick={() => void run(() => submitConnection(manager, connection.name))}>{text('Continue with {provider}', { provider: ('options' in connection && connection.options.displayName) || connection.name })}</button>)}</div> : null}
        {(reset || requestReset || emailSent) && loginLink && <a className="mt-5 block text-sm font-semibold text-primary underline" href={loginLink}>{text('Sign in')}</a>}
        {requestReset && !loginLink && 'backToLogin' in manager && <button className="button-secondary mt-5" type="button" disabled={busy} onClick={() => void run(() => manager.backToLogin())}>{text('Sign in')}</button>}
        {!reset && !requestReset && !emailSent && (signup ? loginLink : signupLink) && <p className="mt-6 border-t border-border pt-5 text-sm text-foreground-muted">{text(signup ? 'Already have an account?' : 'New to Moodly?')} <a className="font-bold text-primary underline underline-offset-4" href={signup ? loginLink : signupLink}>{text(signup ? 'Sign in' : 'Create account')}</a></p>}
        <p className="mt-6 text-xs text-foreground-muted">{text('Secure sign-in powered by Auth0')}</p>
      </section>
    </section>
  </main>
}
