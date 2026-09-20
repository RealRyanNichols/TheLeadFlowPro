import { ImageResponse } from "next/og";
import { getArticle } from "@/lib/articles";
import { uniqueOgImagePath } from "@/lib/uniqueOgImages";
import { PUBLIC_SITE_URL } from "@/lib/publicPageMetadata";
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

  const finishedImage = uniqueOgImagePath(`/articles/${article.slug}`);
  if (finishedImage) {
    return Response.redirect(`${PUBLIC_SITE_URL}${finishedImage}`, 307);
  }

  const backgroundUrl = new URL(
    articlePremiumOgArtPath(article.slug),
    request.url,
  ).toString();

  return new ImageResponse(articleOgCard({ article, backgroundUrl }), {
    ...ARTICLE_OG_SIZE,
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600",
    },
  });
}
