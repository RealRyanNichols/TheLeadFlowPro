import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildClientStory } from "@/lib/client360";
import { SAMPLE_360_VIEWS, SAMPLE_360_VIEW_LABELS, isSample360View, sampleContact, sampleStoryInput } from "@/lib/client360Fixtures";
import { reachForStory } from "@/lib/client360Server";
import Client360 from "../[id]/Client360";

// The Client 360 with a fictional client (lib/client360Fixtures.ts), so the
// screen can be looked at on a phone before any real record feeds it, in four
// views: fully linked, as real records link today, a new lead nobody has
// answered, and a connection problem. The same component the lead record
// shows, with the sample's own label. Admin only, checked before anything
// renders. It reads no lead data at all, and its buttons never dial, text, or
// email anyone.

export const dynamic = "force-dynamic";
export const metadata = { title: "Sample whole story | The LeadFlow Pro" };

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";

export default async function Client360SamplePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  // Authorization first, like every Back Office page, even with no lead data here.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/admin/leads/sample")}`);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const query = (await searchParams) ?? {};
  const view = isSample360View(query.view) ? query.view : "client";
  const story = buildClientStory(sampleStoryInput(view));

  return (
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4">
      <nav aria-label="Sample" className="flex flex-wrap items-center gap-x-4">
        <Link href="/admin" className={`inline-flex min-h-[44px] items-center px-1 text-sm font-semibold text-[var(--blue)] underline-offset-2 hover:underline ${FOCUS}`}>
          Back to leads
        </Link>
      </nav>
      <header className="card !p-4">
        <p className="hq-eyebrow">Sample</p>
        <h2 className="mt-1 text-xl font-black text-[var(--heading)]">The whole story, with a made-up client</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          This is the screen at the top of every lead record. Pick a view to see how it reads in each case.
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2" aria-label="Sample views">
          {SAMPLE_360_VIEWS.map((v) => {
            const on = v === view;
            return (
              <li key={v} className="min-w-0">
                <Link
                  href={v === "client" ? "/admin/leads/sample" : `/admin/leads/sample?view=${v}`}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-[44px] items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-bold ${
                    on ? "border-[var(--blue)] bg-[var(--accent-tint)] text-[var(--heading)]" : "border-[var(--line-strong)] text-[var(--text)]"
                  } ${FOCUS}`}
                >
                  {SAMPLE_360_VIEW_LABELS[v]}
                </Link>
              </li>
            );
          })}
        </ul>
      </header>
      <Client360 story={story} reach={reachForStory(sampleContact(view))} anchors={null} />
    </div>
  );
}
