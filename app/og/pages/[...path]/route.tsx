import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getPublicOgPage } from "@/lib/publicOgCatalog";
import { publicOgCard } from "@/lib/publicOgCard";
import {
  AD_PAGE_SOCIAL_IMAGES,
  PUBLIC_OG_SIZE,
} from "@/lib/publicPageMetadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function localImage(file: string): Promise<string> {
  const extension = path.extname(file).toLowerCase();
  const mime =
    extension === ".svg"
      ? "image/svg+xml"
      : extension === ".jpg" || extension === ".jpeg"
        ? "image/jpeg"
        : "image/png";
  const bytes = await readFile(path.join(process.cwd(), "public", file));
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const canonicalPath =
    segments.length === 1 && segments[0] === "home"
      ? "/"
      : `/${segments.join("/")}`;
  const page = new URL(request.url).search
    ? undefined
    : getPublicOgPage(canonicalPath);
  const finishedArt = page && AD_PAGE_SOCIAL_IMAGES[canonicalPath];
  if (finishedArt) {
    // Existing shares may still request the old generated-card URL.
    const bytes = await readFile(
      path.join(process.cwd(), "public", finishedArt),
    );
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (!page || page.imagePath !== `/og/pages/${segments.join("/")}`) {
    return new Response("Share image not found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
  const [logoData, artData] = await Promise.all([
    localImage("/images/brand/leadflow-logo.png"),
    page.art ? localImage(page.art) : Promise.resolve(undefined),
  ]);
  return new ImageResponse(publicOgCard({ page, logoData, artData }), {
    ...PUBLIC_OG_SIZE,
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600",
    },
  });
}
