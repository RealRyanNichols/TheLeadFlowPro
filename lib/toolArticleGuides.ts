import { getPublishedArticles } from "./articles";

/** Guides are connected by actual embedded tools or explicit links, never keyword guessing. */
export function getToolArticleGuides(toolSlug: string, now = new Date()) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(toolSlug)) return [];
  const link = new RegExp(`\\]\\(/tools/${toolSlug}(?:[?#][^\\s)]*)?\\)`);
  return getPublishedArticles(now)
    .filter(
      (article) => article.tool?.slug === toolSlug || link.test(article.body),
    )
    .sort(
      (a, b) =>
        Number(b.tool?.slug === toolSlug) - Number(a.tool?.slug === toolSlug) ||
        b.publishedAt.localeCompare(a.publishedAt),
    )
    .map((article) => ({
      slug: article.slug,
      title: article.title,
      description: article.description,
      publishedAt: article.publishedAt,
      embedded: article.tool?.slug === toolSlug,
    }));
}
