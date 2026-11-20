import { t, useLocale } from '../i18n/index.ts'
import { setThemePreference, useThemePreference } from './index.ts'

export function ThemeSelect() {
  useLocale()
  const preference = useThemePreference()
  return <label className="inline-flex items-center gap-2 text-xs font-semibold">
    <span>{t('Theme')}</span>
    <select className="field-input w-auto" aria-label={t('Theme')} value={preference} onChange={(event) => {
      const value = event.target.value
      setThemePreference(value === 'dark' || value === 'light' ? value : 'system')
    }}>
      <option value="system">{t('System')}</option><option value="light">{t('Light')}</option><option value="dark">{t('Dark')}</option>
    </select>
  </label>
}
