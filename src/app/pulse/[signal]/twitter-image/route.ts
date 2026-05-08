import { getPulseSignalPage } from "@/lib/pulse-signal-pages";

export const runtime = "edge";

export async function GET(req: Request, { params }: { params: { signal: string } }) {
  const signal = getPulseSignalPage(params.signal);
  const imagePath = signal
    ? `/images/social/pulse-${signal.slug}.png`
    : "/images/social/pulse.png";
  const image = await fetch(new URL(imagePath, req.url), {
    cache: "force-cache",
  });

  if (!image.ok) {
    return new Response("Pulse signal social image not found", { status: 404 });
  }

  return new Response(image.body, {
    headers: {
      "Cache-Control": "public, immutable, no-transform, max-age=31536000",
      "Content-Type": "image/png",
    },
  });
}
