import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminClients() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: projects }, { data: progress }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("projects").select("id, client_id, name, status"),
      supabase.from("lesson_progress").select("user_id"),
    ]);

  const projectsByClient = new Map<string, { name: string; status: string }[]>();
  for (const p of projects ?? []) {
    if (!p.client_id) continue;
    const list = projectsByClient.get(p.client_id) ?? [];
    list.push({ name: p.name, status: p.status });
    projectsByClient.set(p.client_id, list);
  }
  const lessonsByUser = new Map<string, number>();
  for (const r of progress ?? []) {
    lessonsByUser.set(r.user_id, (lessonsByUser.get(r.user_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-3">
      <p className="mb-4 text-[var(--muted)]">
        Every account on the platform. Click a client to open their message
        thread; their projects are managed under Projects.
      </p>
      {(profiles ?? []).map((c) => {
        const ps = projectsByClient.get(c.id) ?? [];
        return (
          <div key={c.id} className="card !p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold text-[var(--heading)]">
                  {c.full_name || c.email}
                </span>
                {c.role === "admin" && (
                  <span className="ml-2 rounded-full bg-warn/20 px-2 py-0.5 text-xs font-bold text-warn">
                    ADMIN
                  </span>
                )}
                <div className="text-xs text-[var(--muted)]">
                  {c.email}
                  {c.business_name && ` · ${c.business_name}`}
                  {" · joined "}
                  {new Date(c.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                <span>
                  {ps.length} project{ps.length === 1 ? "" : "s"}
                </span>
                <span>{lessonsByUser.get(c.id) ?? 0} lessons done</span>
                <Link
                  href={`/admin/messages?thread=${c.id}`}
                  className="btn-ghost !px-3 !py-1.5 !text-xs"
                >
                  Message
                </Link>
              </div>
            </div>
            {ps.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {ps.map((p) => (
                  <span
                    key={p.name}
                    className="rounded-full bg-flow-600/20 px-3 py-1 text-xs text-flow-400"
                  >
                    {p.name} · {p.status}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {(profiles ?? []).length === 0 && (
        <div className="card text-center text-[var(--muted)]">No accounts yet.</div>
      )}
    </div>
  );
}
