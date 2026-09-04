export type DatedArticle = { publishedAt: string };

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// The formatter is reusable. The current day must be computed on each call,
// so warm server instances still advance at midnight in Longview.
export function centralPublicationDate(now = new Date()): string {
  const parts = dateFormatter.formatToParts(now);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function isPublicationDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function isArticlePublished(
  article: DatedArticle,
  now = new Date(),
): boolean {
  return (
    isPublicationDate(article.publishedAt) &&
    article.publishedAt <= centralPublicationDate(now)
  );
}

export function publishedArticles<T extends DatedArticle>(
  articles: readonly T[],
  now = new Date(),
): T[] {
  const today = centralPublicationDate(now);
  return articles.filter(
    (article) =>
      isPublicationDate(article.publishedAt) && article.publishedAt <= today,
  );
}

// Middleware prevents a future article from starting an HTML stream, which
// guarantees an HTTP 404 rather than a streamed 200 with only a noindex tag.
// The page and OG handler also check availability independently.
export function isUnpublishedArticlePath(
  pathname: string,
  dates: Readonly<Record<string, string>>,
  now = new Date(),
): boolean {
  const match = /^\/articles\/([^/]+)(?:\/opengraph-image)?\/?$/.exec(pathname);
  if (!match) return false;
  let slug: string;
  try {
    slug = decodeURIComponent(match[1]);
  } catch {
    return false;
  }
  if (!Object.hasOwn(dates, slug)) return false;
  return !isArticlePublished({ publishedAt: dates[slug] }, now);
}
