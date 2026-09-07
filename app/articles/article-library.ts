export const ARTICLE_PAGE_SIZE = 9;

export const ARTICLE_TOPICS = [
  { id: "all", label: "All guides" },
  { id: "leads", label: "Get more leads" },
  { id: "money", label: "Price it & get paid" },
  { id: "time", label: "Save time" },
  { id: "website", label: "Website & search" },
  { id: "learning", label: "AI & learning" },
] as const;

export type ArticleTopic = (typeof ARTICLE_TOPICS)[number]["id"];
export type ArticleLibraryEntry = {
  slug: string;
  searchText: string;
  topics: Exclude<ArticleTopic, "all">[];
};

type SearchableArticle = {
  slug: string;
  title: string;
  description: string;
  tool?: { slug: string; heading: string };
};

export function normalizeArticleQuery(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Use public card and tool labels only. Article bodies, forms, and records are
// deliberately excluded from the client search index.
export function articleLibraryEntry(article: SearchableArticle): ArticleLibraryEntry {
  const searchText = normalizeArticleQuery(
    [article.slug, article.title, article.description, article.tool?.slug, article.tool?.heading]
      .filter(Boolean)
      .join(" "),
  );
  const topics: ArticleLibraryEntry["topics"] = [];
  if (/\b(lead\w*|customer\w*|inquir\w*|follow up|call\w*|reviews|rating\w*|google review|review response|review link|ads?|advertis\w*|marketing|campaign\w*|conversion\w*|referral\w*)\b/.test(searchText)) topics.push("leads");
  if (/\b(price\w*|pricing|paid|pay\w*|fee\w*|money|profit\w*|margin\w*|revenue|cost\w*|cash|tax\w*|rent\w*|loan\w*|debt\w*|bill\w*|commission\w*|quote\w*|estimate\w*|break even)\b/.test(searchText)) topics.push("money");
  if (/\b(time|hours?|hourly|admin\w*|automat\w*|workflow\w*|task\w*|delegat\w*|meeting\w*|schedul\w*|staff|employee\w*|hiring|overtime|subscription\w*|renewal\w*|calendar|equipment)\b/.test(searchText)) topics.push("time");
  if (/\b(website\w*|web|seo|search|google|index\w*|robots|schema|structured data|qr|link\w*|digital|online|page\w*|content|article\w*|blog\w*)\b/.test(searchText)) topics.push("website");
  if (/\b(ai|chatgpt|workshop\w*|training|course\w*|lesson\w*|learn\w*)\b/.test(searchText)) topics.push("learning");
  if (!topics.length) topics.push("time");
  return { slug: article.slug, searchText, topics };
}

export function filterArticleEntries(
  entries: ArticleLibraryEntry[],
  query: string,
  topic: ArticleTopic,
): ArticleLibraryEntry[] {
  const words = normalizeArticleQuery(query).split(" ").filter(Boolean);
  return entries.filter(
    (entry) =>
      (topic === "all" || entry.topics.includes(topic)) &&
      words.every((word) => entry.searchText.includes(word)),
  );
}
