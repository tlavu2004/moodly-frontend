import { getLocale, setLocale, t, useLocale } from './index.ts'

export function LanguageSelect() {
  useLocale()
  return <label className="inline-flex items-center gap-2 text-xs font-semibold">
    <span>{t('Language')}</span>
    <select className="field-input w-auto" aria-label={t('Language')} value={getLocale()} onChange={(event) => setLocale(event.target.value === 'vi' ? 'vi' : 'en')}>
      <option value="en">English</option><option value="vi">Tiếng Việt</option>
    </select>
  </label>
}
