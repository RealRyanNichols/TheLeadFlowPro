export const runtime = "edge";

export async function GET(req: Request) {
  const image = await fetch(new URL("/images/social/pulse.png", req.url), {
    cache: "force-cache",
  });

  if (!image.ok) {
    return new Response("Pulse social image not found", { status: 404 });
  }

  return new Response(image.body, {
    headers: {
      "Cache-Control": "public, immutable, no-transform, max-age=31536000",
      "Content-Type": "image/png",
    },
  });
}
