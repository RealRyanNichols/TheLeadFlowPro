import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MessageThread, { type Msg } from "@/components/MessageThread";

export default async function AdminMessages({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const { thread } = await searchParams;
  const supabase = await createClient();

  const [{ data: visitorMessages }, { data: clientMessages }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("messages")
        .select("*")
        .is("thread_profile_id", null)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("messages")
        .select("*")
        .not("thread_profile_id", "is", null)
        .order("created_at"),
      supabase.from("profiles").select("id, full_name, email"),
    ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Group client messages into threads
  const threads = new Map<string, Msg[]>();
  for (const m of clientMessages ?? []) {
    const list = threads.get(m.thread_profile_id) ?? [];
    list.push(m as Msg);
    threads.set(m.thread_profile_id, list);
  }
  if (thread && !threads.has(thread)) threads.set(thread, []);

  const activeThread = thread ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* CLIENT THREADS */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-white">Client threads</h2>
        <div className="space-y-2">
          {[...threads.entries()].map(([pid, msgs]) => {
            const p = profileById.get(pid);
            const last = msgs[msgs.length - 1];
            return (
              <Link
                key={pid}
                href={`/admin/messages?thread=${pid}`}
                className={`card block !p-4 transition hover:border-flow-500 ${
                  activeThread === pid ? "border-flow-500" : ""
                }`}
              >
                <div className="font-bold text-white">
                  {p?.full_name || p?.email || "Unknown client"}
                </div>
                {last && (
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {last.sender}: {last.body}
                  </p>
                )}
              </Link>
            );
          })}
          {threads.size === 0 && (
            <div className="card text-center text-sm text-slate-400">
              No client threads yet. Open one from the Clients page.
            </div>
          )}
        </div>

        {activeThread && (
          <div className="card mt-4">
            <h3 className="mb-3 font-bold text-white">
              Thread with{" "}
              {profileById.get(activeThread)?.full_name ||
                profileById.get(activeThread)?.email ||
                "client"}
            </h3>
            <MessageThread
              threadProfileId={activeThread}
              initialMessages={threads.get(activeThread) ?? []}
              senderRole="admin"
            />
          </div>
        )}
      </div>

      {/* VISITOR INBOX */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-white">
          Visitor messages (contact form)
        </h2>
        <div className="space-y-2">
          {(visitorMessages ?? []).map((m) => (
            <div key={m.id} className="card !p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{m.visitor_name}</span>
                <span className="text-xs text-slate-400">
                  {new Date(m.created_at).toLocaleString()}
                </span>
              </div>
              <a
                href={`mailto:${m.visitor_email}`}
                className="text-xs text-flow-400"
              >
                {m.visitor_email}
              </a>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                {m.body}
              </p>
            </div>
          ))}
          {(visitorMessages ?? []).length === 0 && (
            <div className="card text-center text-sm text-slate-400">
              No visitor messages yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
