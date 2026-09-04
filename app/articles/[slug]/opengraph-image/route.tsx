import { ImageResponse } from "next/og";
import { getArticle } from "@/lib/articles";
import {
  articleOgCard,
  ARTICLE_OG_SIZE,
  articlePremiumOgArtPath,
} from "@/lib/articles-og";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    return new Response("Article not found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  const backgroundUrl = new URL(articlePremiumOgArtPath(article.slug), request.url).toString();

  return new ImageResponse(articleOgCard({ article, backgroundUrl }), {
    ...ARTICLE_OG_SIZE,
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600",
    },
  });
}
