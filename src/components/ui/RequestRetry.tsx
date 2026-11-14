import { t, useLocale, formatNumber } from '../../i18n/index.ts'
import { useEffect, useState } from 'react'

/** One inline recovery control; timers update the label and never send requests. */
export function RequestRetry({ retryAt, onRetry, isLoading = false }: { retryAt?: number | null; onRetry?: () => void; isLoading?: boolean }) {
  useLocale()
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) setNow(Date.now()) })
    if (!retryAt || retryAt <= Date.now()) return () => { active = false }
    const timer = window.setInterval(() => { const time = Date.now(); setNow(time); if (time >= retryAt) window.clearInterval(timer) }, 250)
    return () => { active = false; window.clearInterval(timer) }
  }, [retryAt])
  const seconds = Math.max(0, Math.ceil(((retryAt ?? 0) - now) / 1000))
  return <button type="button" className="button-secondary mt-4" disabled={isLoading || seconds > 0} onClick={() => { if (!retryAt || Date.now() >= retryAt) onRetry?.() }}>{seconds > 0 ? t('Try again in {seconds}s', { seconds: formatNumber(seconds) }) : t("Try again")}</button>
}
