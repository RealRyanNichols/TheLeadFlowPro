import { commerceCatalog } from "@/lib/commerce";

/** Stable first-party feed used by Gideon. Contains public product information only. */
export function GET() {
  return Response.json(commerceCatalog(), {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
