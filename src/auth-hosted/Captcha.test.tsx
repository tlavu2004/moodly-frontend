import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Captcha } from './Captcha.tsx'

afterEach(() => { vi.unstubAllGlobals() })
it('renders the Auth0 v2 challenge and invalidates expired or failed tokens', async () => {
  const onValue = vi.fn()
  let callbacks: Record<string, (value?: string) => void> = {}
  const remove = vi.fn()
  const renderWidget = vi.fn((_container, options) => { callbacks = options; return 'widget-1' })
  vi.stubGlobal('turnstile', { render: renderWidget, remove })
  const { unmount } = render(<Captcha config={{ provider: 'auth0_v2', siteKey: 'synthetic-site-key' }} locale="en" onValue={onValue} />)
  const script = await waitFor(() => {
    const element = document.querySelector('script[src^="https://challenges.cloudflare.com/"]')
    expect(element).not.toBeNull()
    return element!
  })
  await act(async () => { script.dispatchEvent(new Event('load')) })
  expect(renderWidget).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ sitekey: 'synthetic-site-key' }))
  act(() => callbacks.callback('synthetic-token'))
  expect(onValue).toHaveBeenLastCalledWith('synthetic-token')
  act(() => callbacks['expired-callback']())
  expect(onValue).toHaveBeenLastCalledWith('')
  act(() => callbacks['error-callback']())
  expect(screen.getByRole('alert')).toHaveTextContent('Security check is unavailable')
  unmount()
  expect(remove).toHaveBeenCalledWith('widget-1')
})
