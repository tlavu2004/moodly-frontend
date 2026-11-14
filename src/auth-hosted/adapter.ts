import Login from '@auth0/auth0-acul-js/login'
import LoginId from '@auth0/auth0-acul-js/login-id'
import LoginPassword from '@auth0/auth0-acul-js/login-password'
import Signup from '@auth0/auth0-acul-js/signup'
import SignupId from '@auth0/auth0-acul-js/signup-id'
import SignupPassword from '@auth0/auth0-acul-js/signup-password'
import ResetPasswordRequest from '@auth0/auth0-acul-js/reset-password-request'
import ResetPassword from '@auth0/auth0-acul-js/reset-password'
import ResetPasswordEmail from '@auth0/auth0-acul-js/reset-password-email'
declare global { interface Window { universal_login_context?: { screen?: { name?: string } } } }

export const screenNames = ['login', 'login-id', 'login-password', 'signup', 'signup-id', 'signup-password', 'reset-password-request', 'reset-password', 'reset-password-email'] as const
export type HostedScreenName = typeof screenNames[number]
export type HostedManager = Login | LoginId | LoginPassword | Signup | SignupId | SignupPassword | ResetPasswordRequest | ResetPassword | ResetPasswordEmail
export type Credentials = { identifier: string; password: string; confirmation: string; captcha?: string }
export function createManager(): HostedManager {
  switch (window.universal_login_context?.screen?.name) {
    case 'login': return new Login()
    case 'login-id': return new LoginId()
    case 'login-password': return new LoginPassword()
    case 'signup': return new Signup()
    case 'signup-id': return new SignupId()
    case 'signup-password': return new SignupPassword()
    case 'reset-password-request': return new ResetPasswordRequest()
    case 'reset-password': return new ResetPassword()
    case 'reset-password-email': return new ResetPasswordEmail()
    default: throw new Error('Unsupported authentication screen')
  }
}

/** Credentials go through Auth0's transaction-bound SDK form POST, never Moodly APIs. */
export async function submitCredentials(manager: HostedManager, values: Credentials): Promise<void> {
  const captcha = values.captcha ? { captcha: values.captcha } : {}
  switch (manager.screen.name) {
    case 'login': return (manager as Login).login({ username: values.identifier, password: values.password, ...captcha })
    case 'login-id': return (manager as LoginId).login({ username: values.identifier, ...captcha })
    case 'login-password': return (manager as LoginPassword).login({ username: values.identifier, password: values.password, ...captcha })
    case 'signup': return (manager as Signup).signup({ email: values.identifier, password: values.password, ...captcha })
    case 'signup-id': return (manager as SignupId).signup({ email: values.identifier, ...captcha })
    case 'signup-password': return (manager as SignupPassword).signup({ email: values.identifier, password: values.password, ...captcha })
    case 'reset-password-request': return (manager as ResetPasswordRequest).resetPassword({ username: values.identifier, ...captcha })
    case 'reset-password': return (manager as ResetPassword).resetPassword({ 'password-reset': values.password, 're-enter-password': values.confirmation, ...captcha })
    case 'reset-password-email': return (manager as ResetPasswordEmail).resendEmail()
    default: throw new Error('Unsupported authentication screen')
  }
}

export function submitConnection(manager: HostedManager, connection: string) {
  if (!manager.transaction.alternateConnections?.some((item) => item.name === connection)) throw new Error('Connection is not available')
  if ('federatedSignup' in manager) return manager.federatedSignup({ connection })
  if ('federatedLogin' in manager) return manager.federatedLogin({ connection })
  throw new Error('Connection is not available')
}

/** Only transaction-provided relative/same-origin HTTPS links may continue a flow. */
export function transactionLink(value: string | null | undefined): string | undefined {
  if (!value || value.includes('\\') || [...value].some((character) => character.charCodeAt(0) <= 32)) return undefined
  try {
    const url = new URL(value, window.location.origin)
    return url.origin === window.location.origin && ['https:', 'http:'].includes(url.protocol) ? url.href : undefined
  } catch { return undefined }
}
