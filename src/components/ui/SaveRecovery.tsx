import { useRef, useState } from 'react'
import { getUserFacingError } from '../../api/errorMessages.ts'
import { t } from '../../i18n/index.ts'

export function SaveRecovery({ check }: { check: () => Promise<void> }) {
  const pending = useRef(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    if (pending.current) return
    pending.current = true
    setChecking(true)
    setError(null)
    try {
      await check()
    } catch (reason) {
      setError(getUserFacingError(reason, 'Could not check the saved state.'))
    } finally {
      pending.current = false
      setChecking(false)
    }
  }

  return <div className="mt-3 space-y-2">
    <p role="status" className="text-sm text-foreground-muted">{t('The save could not be confirmed. Check the server before sending again.')}</p>
    {error && <p role="alert" className="text-sm text-danger">{t(error)}</p>}
    <button type="button" className="button-secondary" disabled={checking} onClick={() => void refresh()}>
      {t(checking ? 'Checking saved state…' : 'Check saved state')}
    </button>
  </div>
}
