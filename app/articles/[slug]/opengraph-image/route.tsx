import { ImageResponse } from "next/og";
import { getArticle } from "@/lib/articles";
import {
  articleOgCard,
  ARTICLE_OG_SIZE,
  articlePremiumOgArtPath,
} from "@/lib/articles-og";

export const revalidate = 86400;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    return new Response("Article not found", { status: 404 });
  }

  const backgroundUrl = new URL(
    articlePremiumOgArtPath(article.slug) ?? article.ogImage,
    request.url,
  ).toString();

  return new ImageResponse(articleOgCard({ article, backgroundUrl }), {
    ...ARTICLE_OG_SIZE,
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
