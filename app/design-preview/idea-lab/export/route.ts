import { exportIdeaBrief } from "@/lib/ideaLabExport";

export async function POST(request: Request) {
  const hostname = request.headers.get("host")?.split(":")[0];
  if (
    process.env.NODE_ENV !== "development" ||
    !["localhost", "127.0.0.1"].includes(hostname ?? "")
  )
    return new Response(null, { status: 404 });
  return exportIdeaBrief(request);
}
