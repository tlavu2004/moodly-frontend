import { t, useLocale, formatNumber } from '../../i18n/index.ts'
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  useLocale()
  if (totalPages <= 1 && page === 0) return null
  return <nav aria-label={t("Results pages")} className="mt-6 flex items-center justify-center gap-4">
    <button className="button-secondary" disabled={page === 0} onClick={() => onChange(page - 1)}>{t("Previous page")}</button>
    <span aria-live="polite">{t('Page {page} of {total}', { page: formatNumber(page + 1), total: formatNumber(Math.max(1, totalPages)) })}</span>
    <button className="button-secondary" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>{t("Next page")}</button>
  </nav>
}
