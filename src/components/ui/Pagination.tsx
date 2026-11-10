export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1 && page === 0) return null
  return <nav aria-label="Results pages" className="mt-6 flex items-center justify-center gap-4">
    <button className="button-secondary" disabled={page === 0} onClick={() => onChange(page - 1)}>Previous page</button>
    <span aria-live="polite">Page {page + 1} of {Math.max(1, totalPages)}</span>
    <button className="button-secondary" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Next page</button>
  </nav>
}
