import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// AI Video Studio proxy (HeyGen). Activates when HEYGEN_API_KEY is set in
// Vercel env vars — same pattern as RESEND_API_KEY. Admin-only.

const HG = "https://api.heygen.com";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin";
}

function hg(path: string, key: string, init?: RequestInit) {
  return fetch(`${HG}${path}`, {
    ...init,
    headers: {
      "X-Api-Key": key,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const key = process.env.HEYGEN_API_KEY;
  if (!key) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  const url = new URL(request.url);
  const resource = url.searchParams.get("resource");

  try {
    if (resource === "avatars") {
      const r = await hg("/v2/avatars", key);
      const j = await r.json();
      const avatars = (j?.data?.avatars ?? []).slice(0, 100).map(
        (a: { avatar_id: string; avatar_name: string; preview_image_url?: string }) => ({
          id: a.avatar_id,
          name: a.avatar_name,
          preview: a.preview_image_url ?? null,
        })
      );
      return NextResponse.json({ avatars });
    }
    if (resource === "voices") {
      const r = await hg("/v2/voices", key);
      const j = await r.json();
      const voices = (j?.data?.voices ?? [])
        .filter((v: { language?: string }) => !v.language || /english/i.test(v.language))
        .slice(0, 100)
        .map((v: { voice_id: string; name: string; gender?: string; language?: string }) => ({
          id: v.voice_id,
          name: v.name,
          gender: v.gender ?? "",
          language: v.language ?? "",
        }));
      return NextResponse.json({ voices });
    }
    if (resource === "status") {
      const id = url.searchParams.get("video_id");
      if (!id) return NextResponse.json({ error: "video_id required" }, { status: 400 });
      const r = await hg(`/v1/video_status.get?video_id=${encodeURIComponent(id)}`, key);
      const j = await r.json();
      return NextResponse.json({
        status: j?.data?.status ?? "unknown",
        video_url: j?.data?.video_url ?? null,
        error: j?.data?.error ?? null,
      });
    }
    return NextResponse.json({ error: "Unknown resource" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "HeyGen request failed" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const key = process.env.HEYGEN_API_KEY;
  if (!key) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  try {
    const body = await request.json();
    const script = String(body.script ?? "").slice(0, 5000);
    const avatarId = String(body.avatar_id ?? "");
    const voiceId = String(body.voice_id ?? "");
    const title = String(body.title ?? "LeadFlow Pro video").slice(0, 120);
    if (!script || !avatarId || !voiceId) {
      return NextResponse.json({ error: "script, avatar_id, and voice_id are required" }, { status: 400 });
    }
    const r = await hg("/v2/video/generate", key, {
      method: "POST",
      body: JSON.stringify({
        title,
        video_inputs: [
          {
            character: { type: "avatar", avatar_id: avatarId, avatar_style: "normal" },
            voice: { type: "text", input_text: script, voice_id: voiceId },
          },
        ],
        dimension: { width: 1280, height: 720 },
      }),
    });
    const j = await r.json();
    if (!r.ok || j?.error) {
      return NextResponse.json(
        { error: j?.error?.message ?? j?.error ?? "Generation failed" },
        { status: 502 }
      );
    }
    return NextResponse.json({ video_id: j?.data?.video_id ?? null });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
