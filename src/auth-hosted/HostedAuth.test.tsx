import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HostedAuth } from './HostedAuth.tsx'
import type { HostedManager } from './adapter.ts'

const fixture: Record<string, unknown> = {}
const submissions: Array<Record<string, FormDataEntryValue>> = []
async function managerFor(name = 'login', options: { locale?: string; captcha?: object; errors?: object[]; data?: object } = {}): Promise<HostedManager> {
  Object.defineProperty(window, 'universal_login_context', { configurable: true, writable: true, value: Object.assign(fixture, {
    prompt: { name: name.startsWith('reset-password') ? 'reset-password' : name }, client: { id: 'synthetic-client', name: 'Moodly' }, user: {},
    screen: { name, data: options.data ?? {}, links: { signup: '/u/signup?state=synthetic', login: '/u/login?state=synthetic', reset_password: '/u/reset?state=synthetic', edit_identifier: '/u/login/identifier?state=synthetic' }, captcha: options.captcha },
    transaction: { state: 'synthetic-transaction-state', locale: options.locale ?? 'en', errors: options.errors, alternate_connections: [{ name: 'google-oauth2', strategy: 'google-oauth2' }], connection: { name: 'Username-Password-Authentication', strategy: 'auth0', options: { signup_enabled: true, forgot_password_enabled: true, authentication_methods: { password: { enabled: true, policy: 'none', min_length: 1 }, passkey: { enabled: false } } } } },
    tenant: { enabled_locales: ['en', 'vi'] },
  }) })
  return (await import('./adapter.ts')).createManager()
}
beforeEach(() => {
  submissions.length = 0
  vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function (this: HTMLFormElement) {
    submissions.push(Object.fromEntries(new FormData(this)))
  })
})
afterEach(() => { vi.restoreAllMocks(); delete window.universal_login_context })

describe('Auth0-hosted Moodly forms', () => {
  it('submits email and password through the official SDK with the same transaction state', async () => {
    const manager = await managerFor()
    render(<HostedAuth manager={manager} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email or username'), 'synthetic@example.test')
    await user.type(screen.getByLabelText('Password'), 'Secret-for-test-only')
    await user.dblClick(screen.getByRole('button', { name: 'Sign in' }))
    expect(submissions).toHaveLength(1)
    expect(submissions[0]).toMatchObject({ username: 'synthetic@example.test', password: 'Secret-for-test-only', state: 'synthetic-transaction-state' })
    expect(screen.getByRole('button', { name: 'Working…' })).toBeDisabled()
    expect(JSON.stringify({ ...localStorage })).not.toContain('Secret-for-test-only')
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('Secret-for-test-only')
  })

  it.each(['signup', 'signup-id', 'signup-password'])('renders and submits %s with Auth0 identifiers', async (name) => {
    const manager = await managerFor(name, { data: { email: 'synthetic@example.test' } })
    render(<HostedAuth manager={manager} />)
    const user = userEvent.setup()
    if (name !== 'signup-password') await user.clear(screen.getByLabelText('Email'))
    if (name !== 'signup-password') await user.type(screen.getByLabelText('Email'), 'synthetic@example.test')
    if (name !== 'signup-id') await user.type(screen.getByLabelText('Password'), 'A-long-test-password!123')
    await user.click(screen.getByRole('button', { name: name === 'signup-id' ? 'Continue' : 'Create account' }))
    await waitFor(() => expect(submissions).toHaveLength(1))
    expect(submissions[0]).toMatchObject({ email: 'synthetic@example.test', state: 'synthetic-transaction-state' })
    if (name !== 'signup-id') expect(submissions[0].password).toBe('A-long-test-password!123')
  })

  it.each(['login-id', 'login-password'])('supports the %s identifier-first flow', async (name) => {
    const manager = await managerFor(name, { data: { username: 'synthetic@example.test' } })
    render(<HostedAuth manager={manager} />)
    const user = userEvent.setup()
    if (name === 'login-id') { await user.clear(screen.getByLabelText('Email or username')); await user.type(screen.getByLabelText('Email or username'), 'synthetic@example.test') }
    else await user.type(screen.getByLabelText('Password'), 'a-test-password')
    await user.click(screen.getByRole('button', { name: name === 'login-id' ? 'Continue' : 'Sign in' }))
    await waitFor(() => expect(submissions).toHaveLength(1))
    expect(submissions[0]).toMatchObject({ username: 'synthetic@example.test', state: 'synthetic-transaction-state' })
  })

  it('renders localized feedback as text and follows only transaction links', async () => {
    const manager = await managerFor('login', { locale: 'vi', errors: [{ code: 'invalid', message: '<script>provider error</script>' }] })
    render(<HostedAuth manager={manager} />)
    expect(screen.getByRole('heading', { name: 'Chào mừng bạn trở lại Moodly' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('<script>provider error</script>')
    expect(document.querySelector('script')).toBeNull()
    expect(screen.getByRole('link', { name: 'Quên mật khẩu?' })).toHaveAttribute('href', expect.stringContaining('/u/reset?state=synthetic'))
    const { transactionLink } = await import('./adapter.ts')
    expect(transactionLink('javascript:alert(1)')).toBeUndefined()
    expect(transactionLink('https://evil.example/u/login')).toBeUndefined()
  })

  it('changes the Auth0 language using its SDK and retains the transaction state', async () => {
    render(<HostedAuth manager={await managerFor()} />)
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'vi')
    expect(submissions[0]).toMatchObject({ action: 'change-language', language: 'vi', state: 'synthetic-transaction-state' })
  })

  it('renders configured social providers and submits through the same Auth0 transaction', async () => {
    render(<HostedAuth manager={await managerFor()} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continue with google-oauth2' }))
    expect(submissions[0]).toMatchObject({ connection: 'google-oauth2', state: 'synthetic-transaction-state' })
  })

  it('requires a CAPTCHA answer when requested and includes it in the SDK submission', async () => {
    render(<HostedAuth manager={await managerFor('login', { captcha: { provider: 'auth0', image: 'data:image/png;base64,AA==' } })} />)
    const user = userEvent.setup()
    const submit = screen.getByRole('button', { name: 'Sign in' })
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText('Email or username'), 'synthetic@example.test')
    await user.type(screen.getByLabelText('Password'), 'a-test-password')
    await user.type(screen.getByLabelText('Enter the code in the image'), 'challenge-answer')
    await user.click(submit)
    expect(submissions[0].captcha).toBe('challenge-answer')
  })

  it('fails closed for a CAPTCHA provider that has not been integrated', async () => {
    render(<HostedAuth manager={await managerFor('login', { captcha: { provider: 'unsupported', siteKey: 'key' } })} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Security check is unavailable')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    expect(submissions).toHaveLength(0)
  })

  it('clears password fields after a failed submission and permits an explicit retry', async () => {
    const manager = await managerFor()
    if (!('login' in manager)) throw new Error('Expected login')
    vi.spyOn(manager, 'login').mockRejectedValueOnce(new Error('sensitive detail'))
    render(<HostedAuth manager={manager} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email or username'), 'synthetic@example.test')
    await user.type(screen.getByLabelText('Password'), 'a-test-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please try again.')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.queryByText('sensitive detail')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Password'), 'another-test-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(submissions).toHaveLength(1)
  })

  it('validates confirmation and uses the Auth0 reset payload keys', async () => {
    render(<HostedAuth manager={await managerFor('reset-password')} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('New password'), 'New-test-password!123')
    await user.type(screen.getByLabelText('Confirm password'), 'Different-password')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match.')
    expect(submissions).toHaveLength(0)
    await user.clear(screen.getByLabelText('Confirm password'))
    await user.type(screen.getByLabelText('Confirm password'), 'New-test-password!123')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(submissions[0]).toMatchObject({ 'password-reset': 'New-test-password!123', 're-enter-password': 'New-test-password!123', state: 'synthetic-transaction-state' })
  })

  it.each(['reset-password-request', 'reset-password-email'])('supports %s without revealing account existence', async (name) => {
    render(<HostedAuth manager={await managerFor(name)} />)
    if (name === 'reset-password-request') await userEvent.setup().type(screen.getByLabelText('Email or username'), 'synthetic@example.test')
    else expect(screen.getByText(/If an account matches/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: name === 'reset-password-request' ? 'Send reset email' : 'Request another email' }))
    expect(submissions[0].state).toBe('synthetic-transaction-state')
  })

  it('blocks connections not included in the Auth0 context and unsupported screens', async () => {
    const manager = await managerFor()
    const adapter = await import('./adapter.ts')
    expect(() => adapter.submitConnection(manager, 'unconfigured')).toThrow('Connection is not available')
    await expect(managerFor('unknown-screen')).rejects.toThrow('Unsupported authentication screen')
  })

  it('allows password visibility changes without changing the value', async () => {
    render(<HostedAuth manager={await managerFor()} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Password'), 'a-test-password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    await act(async () => {})
  })
})
