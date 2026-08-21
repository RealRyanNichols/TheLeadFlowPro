import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/config";

// Attach a real file (image, PDF, zip, anything) to a deliverable. Sales and
// admin only. The file lands in the private "deliverables" bucket and the
// path is stamped on the deliverable row; viewers get short-lived signed
// links, so nothing here is publicly reachable by URL guessing.

export const runtime = "nodejs";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "sales") {
    return NextResponse.json({ error: "Sales access required" }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "File storage is not configured" }, { status: 501 });

  const form = await request.formData().catch(() => null);
  const deliverableId = String(form?.get("deliverable_id") ?? "");
  const file = form?.get("file");
  if (!/^[0-9a-f-]{36}$/i.test(deliverableId) || !(file instanceof File)) {
    return NextResponse.json({ error: "Pick a deliverable and a file" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be between 1 byte and 50 MB" }, { status: 400 });
  }

  // RLS check: the deliverable must be visible to this sales/admin session.
  const { data: deliverable } = await supabase
    .from("deliverables")
    .select("id")
    .eq("id", deliverableId)
    .single();
  if (!deliverable) return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });

  const service = createServiceClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "file";
  const path = `${deliverableId}/${Date.now().toString(36)}-${safeName}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await service.storage
    .from("deliverables")
    .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 502 });

  const { error: updateError } = await service
    .from("deliverables")
    .update({ file_path: path })
    .eq("id", deliverableId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 502 });

  const { data: signed } = await service.storage.from("deliverables").createSignedUrl(path, 3600);
  return NextResponse.json({ ok: true, file_path: path, signed_url: signed?.signedUrl ?? null, file_name: safeName });
}
