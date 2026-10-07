export default function ContactPagination({ page, pageCount, first, last, total, onChange }: { page: number; pageCount: number; first: number; last: number; total: number; onChange: (page: number) => void }) {
  if (!total) return null;
  return <nav aria-label="Contact pages" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-4 py-3 text-sm">
    <span className="text-[var(--muted)]">{first}–{last} of {total} · Page {page} of {pageCount}</span>
    <div className="flex items-center gap-2">
      <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)} className="min-h-[44px] rounded-lg border border-[var(--line-strong)] px-4 font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
      <button type="button" disabled={page === pageCount} onClick={() => onChange(page + 1)} className="min-h-[44px] rounded-lg border border-[var(--line-strong)] px-4 font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40">Next</button>
    </div>
  </nav>;
}
