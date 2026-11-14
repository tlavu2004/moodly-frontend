import { createRoot } from 'react-dom/client'
import { createManager } from './adapter.ts'
import { HostedAuth } from './HostedAuth.tsx'
import { hostedText } from './copy.ts'
import '../index.css'

function start() {
  const root = document.createElement('div')
  root.id = 'moodly-auth-root'
  document.body.append(root)
  try {
    const manager = createManager()
    const locale = manager.transaction.locale || 'en'
    document.documentElement.lang = locale
    const requested = manager.untrustedData.authorizationParams?.['ext-moodly-theme']
    const theme = requested === 'dark' || requested === 'light' ? requested : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    document.title = 'Moodly · ' + hostedText(locale, manager.screen.name.startsWith('signup') ? 'Create account' : 'Sign in')
    createRoot(root).render(<HostedAuth manager={manager} />)
  } catch {
    // Never print the context, transaction or credentials to logs or telemetry.
    const message = document.createElement('p')
    message.className = 'card mx-auto mt-16 max-w-lg p-8'
    message.textContent = hostedText(navigator.language, 'Authentication is unavailable. Please restart sign-in from Moodly.')
    root.append(message)
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
else start()
