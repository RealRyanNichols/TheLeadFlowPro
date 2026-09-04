import {
  centralPublicationDate,
  isArticlePublished,
  isPublicationDate,
} from "./article-publication.ts";

export const ARTICLE_QUEUE_STATUSES = [
  "queued",
  "drafted",
  "scheduled",
  "published",
] as const;
export type ArticleQueueStatus = (typeof ARTICLE_QUEUE_STATUSES)[number];

export type ArticleQueueEntry = {
  slug: string;
  trade: string;
  industry: string;
  tool: string;
  searchQuestion: string;
  workingTitle: string;
  status: ArticleQueueStatus;
  draftedAt?: string;
};

export type ArticleQueue = { _readme: string[]; queue: ArticleQueueEntry[] };
type CatalogArticle = { slug: string; publishedAt: string };

// A scheduled entry has been authored, but is not evidence of deployment or
// live publication. The receipt records those separately after verification.
export function articleQueueCatalogIssues(
  entry: Pick<ArticleQueueEntry, "slug" | "status">,
  articles: readonly CatalogArticle[],
  now = new Date(),
): string[] {
  if (!(ARTICLE_QUEUE_STATUSES as readonly string[]).includes(entry.status)) {
    return [`${entry.slug} has unknown status "${entry.status}"`];
  }
  const article = articles.find((item) => item.slug === entry.slug);
  if (entry.status === "queued" || entry.status === "drafted") {
    return article
      ? [
          `${entry.slug} is already authored; use scheduled or verified published status`,
        ]
      : [];
  }
  if (!article)
    return [
      `${entry.slug} is ${entry.status} but missing from the authored catalog`,
    ];
  if (!isPublicationDate(article.publishedAt))
    return [`${entry.slug} has an invalid publication date`];
  if (entry.status === "published" && !isArticlePublished(article, now)) {
    return [
      `${entry.slug} cannot be published before its Central publication date`,
    ];
  }
  return [];
}

// Calendar arithmetic runs on date-only UTC values after selecting the local
// day. This avoids 23/25-hour daylight-saving days changing the chosen date.
export function nextArticlePublicationDate(
  articles: readonly { publishedAt: string }[],
  now = new Date(),
): string {
  const occupied = new Set(articles.map((article) => article.publishedAt));
  const date = new Date(`${centralPublicationDate(now)}T00:00:00Z`);
  while (occupied.has(date.toISOString().slice(0, 10)))
    date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
