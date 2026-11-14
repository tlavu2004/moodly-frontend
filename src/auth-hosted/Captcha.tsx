import { useEffect, useRef, useState } from 'react'
import type { CaptchaContext } from '@auth0/auth0-acul-js/types'
import { hostedText } from './copy.ts'

type WidgetApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string | number
  remove?: (id: string | number) => void
  reset?: (id: string | number) => void
  ready?: (callback: () => void) => void
}
type CaptchaWindow = Window & { turnstile?: WidgetApi; hcaptcha?: WidgetApi; grecaptcha?: WidgetApi & { enterprise?: WidgetApi } }
const scripts = new Map<string, Promise<void>>()
function loadScript(url: string) {
  const previous = scripts.get(url)
  if (previous) return previous
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => { scripts.delete(url); script.remove(); reject(new Error('Security check unavailable')) }
    document.head.append(script)
  })
  scripts.set(url, promise)
  return promise
}
const providerScripts: Record<string, string> = {
  auth0_v2: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
  recaptcha_v2: 'https://www.google.com/recaptcha/api.js?render=explicit',
  recaptcha_enterprise: 'https://www.google.com/recaptcha/enterprise.js?render=explicit',
  hcaptcha: 'https://js.hcaptcha.com/1/api.js?render=explicit',
}
export function Captcha({ config, locale, onValue }: { config: CaptchaContext | null; locale: string; onValue: (value: string) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const translate = (message: string) => hostedText(locale, message)
  useEffect(() => {
    if (!config || config.provider === 'auth0') return
    const url = Object.hasOwn(providerScripts, config.provider) ? providerScripts[config.provider] : undefined
    let active = true
    let api: WidgetApi | undefined
    let widget: string | number | undefined
    async function mount() {
      try {
        if (!url || !config?.siteKey) throw new Error('Unsupported security check')
        await loadScript(url)
        if (!active || !container.current) return
        const browser = window as CaptchaWindow
        api = config.provider === 'auth0_v2' ? browser.turnstile : config.provider === 'hcaptcha' ? browser.hcaptcha : config.provider === 'recaptcha_enterprise' ? browser.grecaptcha?.enterprise : browser.grecaptcha
        if (!api) throw new Error('Security check unavailable')
        if (api.ready) await new Promise<void>((resolve) => api!.ready!(resolve))
        if (!active || !container.current) return
        widget = api.render(container.current, {
          sitekey: config.siteKey, theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
          callback: (token: string) => { if (active) onValue(token) },
          'expired-callback': () => { if (active) onValue('') },
          'error-callback': () => { if (active) { onValue(''); setFailed(true) } },
        })
      } catch { if (active) { onValue(''); setFailed(true) } }
    }
    void mount()
    return () => { active = false; if (widget !== undefined) { if (api?.remove) api.remove(widget); else api?.reset?.(widget) } }
  }, [config, onValue])
  if (!config) return null
  if (config.provider === 'auth0' && config.image) return <div className="mt-5 space-y-2">
    <img src={config.image} alt={translate('Security check')} className="max-w-full rounded-control" />
    <label className="field-label" htmlFor="captcha-answer">{translate('Enter the code in the image')}</label>
    <input id="captcha-answer" className="field-input" name="captcha" autoComplete="off" required onChange={(event) => onValue(event.target.value)} />
  </div>
  const unsupported = !Object.hasOwn(providerScripts, config.provider) || !config.siteKey
  return <div className="mt-5" aria-label={translate('Security check')}>
    <div ref={container} className="max-w-full overflow-x-auto" />
    {(failed || unsupported) && <p role="alert" className="text-sm text-danger">{translate('Security check is unavailable. Reload this page or contact support.')} <button type="button" className="underline" onClick={() => window.location.reload()}>{translate('Reload page')}</button></p>}
  </div>
}
