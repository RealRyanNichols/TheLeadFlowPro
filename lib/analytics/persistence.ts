type WriteResult = { error: unknown | null };
export type AnalyticsBatchStore<Row, PageView> = {
  upsertEvents(rows: Row[]): PromiseLike<WriteResult>;
  insertEvents(rows: Row[]): PromiseLike<WriteResult>;
  insertPageViews(rows: PageView[]): PromiseLike<WriteResult>;
};

/** A response can acknowledge the primary events only after a confirmed save. */
export async function persistAnalyticsBatch<Row, PageView>(
  store: AnalyticsBatchStore<Row, PageView>,
  rows: Row[],
  pageViews: PageView[],
): Promise<{ saved: boolean; pageViewsSaved: boolean }> {
  try {
    const upsert = await store.upsertEvents(rows);
    if (upsert.error) {
      const fallback = await store.insertEvents(rows);
      if (fallback.error) return { saved: false, pageViewsSaved: false };
    }
  } catch {
    return { saved: false, pageViewsSaved: false };
  }
  if (!pageViews.length) return { saved: true, pageViewsSaved: true };
  try {
    const mirror = await store.insertPageViews(pageViews);
    return { saved: true, pageViewsSaved: !mirror.error };
  } catch {
    return { saved: true, pageViewsSaved: false };
  }
}

/** Conversion reporting is best effort; a failed report must not lose a saved inquiry. */
export async function persistServerEvent<Row>(
  row: Row,
  insert: (row: Row) => PromiseLike<WriteResult>,
): Promise<boolean> {
  try {
    return !(await insert(row)).error;
  } catch {
    return false;
  }
}
