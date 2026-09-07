import { getArticle } from "@/lib/articles";
import { articleDownload } from "@/lib/articleDownload";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article)
    return new Response("Guide not found", {
      status: 404,
      headers: { "X-Robots-Tag": "noindex" },
    });
  return new Response(articleDownload(article), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${article.slug}.md"`,
      "Cache-Control": "public, max-age=300",
      "X-Robots-Tag": "noindex",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
