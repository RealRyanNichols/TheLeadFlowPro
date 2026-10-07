export const CONTACTS_PER_PAGE = 15;
export function contactPage<T>(rows: T[], requested: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / CONTACTS_PER_PAGE));
  const page = Math.min(pageCount, Math.max(1, Number.isFinite(requested) ? Math.floor(requested) : 1));
  const offset = (page - 1) * CONTACTS_PER_PAGE;
  return { rows: rows.slice(offset, offset + CONTACTS_PER_PAGE), page, pageCount, first: rows.length ? offset + 1 : 0, last: Math.min(offset + CONTACTS_PER_PAGE, rows.length), total: rows.length };
}
