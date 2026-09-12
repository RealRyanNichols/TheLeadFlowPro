import Link from "next/link";
import { redirect } from "next/navigation";
import { getHqSession } from "@/lib/hq/session";
import { listConnections, listContent } from "@/lib/hq/server";
import { localWeekStart } from "@/lib/hq/time";
import type { Content, ContentKind } from "@/lib/hq/types";
import ContentCard from "../_components/ContentCard";
import { DraftOneForm, DraftWeekButton } from "../_components/DraftContent";
import { readableDate } from "../_components/plan";

// The week's drafts. Three posts, one lead ad, one video script, written
// from this business's own services and voice. Nothing goes anywhere until
// the owner approves it.

export const dynamic = "force-dynamic";

const GROUPS: { kind: ContentKind; title: string; blurb: string }[] = [
  { kind: "post", title: "Posts", blurb: "Three for the week. Post one every couple of days." },
  { kind: "ad", title: "Lead ad", blurb: "For Facebook or Instagram, with the form questions to ask." },
  { kind: "video_script", title: "Video script", blurb: "Thirty seconds, filmed on your phone, with the shot list." },
];

export default async function HqContentPage() {
  const session = await getHqSession();
  if (!session) redirect("/login?next=/hq/content");
  if (!session.workspace) redirect("/hq/start");

  const ws = session.workspace;
  const now = new Date();
  const weekOf = localWeekStart(now, ws.timezone);
  const [items, connections] = await Promise.all([listContent(session.db, ws.id, { limit: 100 }), listConnections(session.db, ws.id)]);

  const facebookConnected = connections.some((c) => c.kind === "meta_page" && c.status === "connected");
  const thisWeek = items.filter((c) => c.week_of === weekOf);
  const others = items.filter((c) => c.week_of !== weekOf);
  const waiting = items.filter((c) => c.status === "draft").length;

  const grouped = (kind: ContentKind): Content[] => thisWeek.filter((c) => c.kind === kind);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="hq-eyebrow">Content</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">
            {waiting > 0 ? `${waiting} draft${waiting === 1 ? "" : "s"} waiting on you` : "This week's drafts"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Week of {readableDate(`${weekOf}T12:00:00Z`, "UTC") || weekOf}. Read each one, change anything that does not sound like you, then approve it.
          </p>
        </div>
        {thisWeek.length === 0 && <DraftWeekButton />}
      </header>

      {thisWeek.length === 0 && (
        <section className="hq-card mt-6">
          <h2 className="text-lg font-black text-[var(--heading)]">Nothing drafted for this week yet</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Autopilot writes the week's set on your weekly day. You can have it now instead: three posts, one lead ad and one video script, built from
            your services, your city and your voice.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <DraftWeekButton label="Write this week's set" />
            <Link href="/hq/settings" className="hq-btn">
              Check your voice and services
            </Link>
          </div>
        </section>
      )}

      {GROUPS.map((group) => {
        const list = grouped(group.kind);
        if (list.length === 0) return null;
        return (
          <section key={group.kind} className="mt-8">
            <h2 className="text-xl font-black text-[var(--heading)]">{group.title}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{group.blurb}</p>
            <div className="mt-4 grid gap-4">
              {list.map((item) => (
                <ContentCard key={item.id} item={item} facebookConnected={facebookConnected} />
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-8">
        <DraftOneForm />
      </section>

      {others.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-black text-[var(--heading)]">Everything else</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Earlier weeks and anything you asked for on its own.</p>
          <div className="mt-4 grid gap-4">
            {others.map((item) => (
              <ContentCard key={item.id} item={item} facebookConnected={facebookConnected} />
            ))}
          </div>
        </section>
      )}

      {!facebookConnected && (
        <p className="hq-note mt-8">
          No Facebook Page is connected, so posting from here is off. Copy the words and paste them in yourself, or connect your Page in{" "}
          <Link href="/hq/settings#channels" className="font-bold text-[var(--blue)] hover:underline">
            Settings
          </Link>
          .
        </p>
      )}
    </main>
  );
}
