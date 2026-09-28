import type { ReactNode } from "react";
import { CalendarClock, ChevronDown, Hammer, MessagesSquare, NotebookPen, Wallet, type LucideIcon } from "lucide-react";
import type { ClientStory, StoryLine, StoryPart, StoryReach, StoryReachSet, StoryTone } from "@/lib/client360";

// The Client 360 at the top of the lead record: one person's whole story on
// one phone screen. The next follow-up first, then the ways to reach them,
// then money, builds, conversations, and notes as four rows, each a one-line
// summary that opens to the detail. The rows are plain <details>, so they
// open and close without JavaScript and with a keyboard.
//
// Presentation only. The story comes from lib/client360.ts and the Call,
// Text, and Email links from lib/client360Server.ts, both worked out before
// this renders; this file reads nothing, sends nothing, and holds no state,
// so the lead workspace and the sample page render the same component.
//
// Every state says what it is in words: a part that did not load says it is
// a connection problem, not an empty record; a part that is not linked yet
// says so and links to the page that has those records. Every tap target is
// at least 44px tall.

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";
const BUTTON = `inline-flex min-h-[44px] items-center justify-center rounded-lg px-3 py-2 text-center text-sm font-bold ${FOCUS}`;
const QUIET_LINK = `inline-flex min-h-[44px] items-center px-1 text-sm font-semibold text-[var(--blue)] underline-offset-2 hover:underline ${FOCUS}`;
const SUBHEAD = "text-xs font-bold uppercase tracking-wide text-[var(--muted)]";

/** In-page places on the lead record the story links to. Null on the sample, which has none. */
export type Client360Anchors = { history: string; reply: string; note: string; tasks: string };

export type Client360Props = {
  story: ClientStory;
  /** The Call, Text, and Email buttons. On the sample they are shown but never dial, text, or email. */
  reach: StoryReachSet | null;
  anchors: Client360Anchors | null;
};

function toneBox(tone: StoryTone): string {
  if (tone === "attention") return "border-[var(--warn-line)] bg-[var(--warn-tint)]";
  if (tone === "good") return "border-[var(--green-line)] bg-[var(--page)]";
  return "border-[var(--line)] bg-[var(--page)]";
}

function Line({ line }: { line: StoryLine }) {
  return (
    <li className={`min-w-0 rounded-lg border p-3 ${toneBox(line.tone)}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-bold text-[var(--heading)] [overflow-wrap:anywhere]">{line.title}</p>
        {line.amount ? <p className="shrink-0 text-sm font-black tabular-nums text-[var(--heading)]">{line.amount}</p> : null}
      </div>
      <p className="mt-0.5 text-xs text-[var(--muted)] [overflow-wrap:anywhere]">{line.meta}</p>
      {line.detail ? <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text)] [overflow-wrap:anywhere]">{line.detail}</p> : null}
    </li>
  );
}

function Lines({ lines, label }: { lines: StoryLine[]; label: string }) {
  return (
    <ul className="mt-2 grid gap-2" aria-label={label}>
      {lines.map((line) => (
        <Line key={line.id} line={line} />
      ))}
    </ul>
  );
}

/** A part that did not load, or is not linked yet, in words, with the way to its page when there is one. */
function PartNotice({ part, what }: { part: StoryPart; what: string }) {
  if (part.state === "failed") {
    return (
      <p className="mt-2 rounded-lg border border-[var(--warn-line)] bg-[var(--warn-tint)] p-3 text-sm text-[var(--text)]">
        {what} did not load. That is a connection problem, not an empty record. Refresh to try again.
      </p>
    );
  }
  if (part.state === "not_linked") {
    return (
      <div className="mt-2 rounded-lg border border-dashed border-[var(--line-strong)] p-3 text-sm text-[var(--muted)]">
        <p>{part.why}</p>
        {part.link ? (
          <a href={part.link.href} className={QUIET_LINK}>
            {part.link.label}
          </a>
        ) : null}
      </div>
    );
  }
  return null;
}

function StoryRow({
  id,
  icon: Icon,
  title,
  summary,
  attention = false,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  attention?: boolean;
  children: ReactNode;
}) {
  return (
    <details id={id} className={`group min-w-0 rounded-xl border ${attention ? "border-[var(--warn-line)]" : "border-[var(--line)]"} bg-[var(--panel)]`}>
      <summary
        className={`flex min-h-[56px] cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-2 [&::-webkit-details-marker]:hidden ${FOCUS}`}
      >
        <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--blue)]" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-[var(--heading)]">{title}</span>
          <span className="block text-sm text-[var(--muted)] [overflow-wrap:anywhere]">{summary}</span>
        </span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" />
      </summary>
      <div className="min-w-0 border-t border-[var(--line)] px-3 pb-3 pt-2">{children}</div>
    </details>
  );
}

function ReachButton({ reach, primary, sample }: { reach: StoryReach; primary: boolean; sample: boolean }) {
  if (reach.href && !sample) {
    return (
      <a href={reach.href} className={`${BUTTON} ${primary ? "bg-[var(--blue)] text-white" : "border border-[var(--line-strong)] text-[var(--text)]"}`}>
        {reach.label}
      </a>
    );
  }
  return (
    <span aria-disabled="true" className={`${BUTTON} border border-[var(--line)] font-normal text-[var(--muted)]`}>
      {reach.label}
    </span>
  );
}

function ReachRow({ reach, sample, name }: { reach: StoryReachSet; sample: boolean; name: string }) {
  const first = name.split(/\s+/)[0] || "them";
  return (
    <div className="mt-3">
      {/* Call full width on a phone, where the thumb lands first; Text and Email share the row under it. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="group" aria-label={`Reach ${first}`}>
        <div className="col-span-2 grid sm:block">
          <ReachButton reach={reach.call} primary sample={sample} />
        </div>
        {reach.text ? <ReachButton reach={reach.text} primary={false} sample={sample} /> : null}
        {/* With no phone there is no Text chip, so Email takes the whole row. */}
        <div className={`grid sm:block ${reach.text ? "" : "col-span-2"}`}>
          <ReachButton reach={reach.email} primary={false} sample={sample} />
        </div>
      </div>
      {sample ? <p className="mt-1 text-xs text-[var(--muted)]">Sample: these buttons do not dial, text, or email anyone.</p> : null}
    </div>
  );
}

function FollowUp({ story, anchors }: { story: ClientStory; anchors: Client360Anchors | null }) {
  const f = story.followUp;
  const box =
    f.tone === "due"
      ? "border-[var(--warn-line)] bg-[var(--warn-tint)]"
      : f.tone === "first"
        ? "border-[var(--accent-line)] bg-[var(--accent-tint)]"
        : "border-[var(--line)] bg-[var(--page)]";
  const hidden = f.tasks.openCount - f.tasks.open.length;
  return (
    <div className={`mt-3 rounded-xl border p-3 ${box}`} data-follow-up={f.tone}>
      <div className="flex items-start gap-3">
        <CalendarClock aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--blue)]" />
        <div className="min-w-0">
          <p className="font-black text-[var(--heading)]">{f.headline}</p>
          {f.detail ? <p className="text-sm text-[var(--text)]">{f.detail}</p> : null}
        </div>
      </div>

      {/* The call sheet's "They reached out" case: what they sent, before anyone dials. */}
      {f.reachedOut ? (
        <div className="mt-3 rounded-lg border border-[var(--warn-line)] bg-[var(--warn-tint)] p-3 text-sm text-[var(--text)]">
          <p>
            <span className="font-bold">They reached out.</span> {f.reachedOut.sentence}
          </p>
          {f.reachedOut.said ? (
            <blockquote className="mt-2 whitespace-pre-wrap border-l-4 border-[var(--warn-line)] pl-3 [overflow-wrap:anywhere]">{f.reachedOut.said}</blockquote>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3">
        <p className={SUBHEAD}>Open tasks{f.tasks.state === "ready" ? ` (${f.tasks.openCount})` : ""}</p>
        {f.tasks.state === "failed" ? (
          <p className="mt-1 text-sm text-[var(--text)]">Tasks did not load. That is a connection problem, not an empty list.</p>
        ) : f.tasks.open.length ? (
          <>
            <Lines lines={f.tasks.open} label="Open tasks" />
            {hidden > 0 ? (
              anchors ? (
                <a href={anchors.tasks} className={QUIET_LINK}>
                  {hidden} more in Tasks
                </a>
              ) : (
                <p className="mt-1 text-sm text-[var(--muted)]">{hidden} more</p>
              )
            ) : null}
          </>
        ) : (
          <p className="mt-1 text-sm text-[var(--muted)]">No open tasks.</p>
        )}
      </div>
    </div>
  );
}

function Money({ story }: { story: ClientStory }) {
  const m = story.money;
  return (
    <StoryRow id="client-360-money" icon={Wallet} title="Money" summary={m.summary} attention={m.attention.length > 0}>
      {m.paid !== null || m.owed !== null ? (
        <dl className="grid grid-cols-2 gap-2">
          {m.paid !== null ? (
            <div className="rounded-lg border border-[var(--line)] bg-[var(--page)] p-3">
              <dt className={SUBHEAD}>Paid so far</dt>
              <dd className="mt-1 text-lg font-black tabular-nums text-[var(--heading)]">{m.paid}</dd>
            </div>
          ) : null}
          {m.owed !== null ? (
            <div className="rounded-lg border border-[var(--line)] bg-[var(--page)] p-3">
              <dt className={SUBHEAD}>Still owed</dt>
              <dd className="mt-1 text-lg font-black tabular-nums text-[var(--heading)]">{m.owed}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {m.attention.length ? (
        <div className="mt-2 rounded-lg border border-[var(--warn-line)] bg-[var(--warn-tint)] p-3 text-sm text-[var(--text)]">
          <p className="font-bold">Needs attention</p>
          <ul className="mt-1 grid list-disc gap-1 pl-5">
            {m.attention.map((item, i) => (
              <li key={`${i}-${item}`} className="[overflow-wrap:anywhere]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3">
        <p className={SUBHEAD}>Monthly plan</p>
        {m.plan.line ? <p className="mt-1 text-sm text-[var(--text)]">{m.plan.line}</p> : <PartNotice part={m.plan} what="The plan" />}
      </div>

      <div className="mt-3">
        <p className={SUBHEAD}>Purchases</p>
        {m.purchases.state === "ready" ? (
          m.purchases.lines.length ? (
            <Lines lines={m.purchases.lines} label="Purchases" />
          ) : (
            <p className="mt-1 text-sm text-[var(--muted)]">No purchases yet.</p>
          )
        ) : (
          <PartNotice part={m.purchases} what="Purchases" />
        )}
      </div>

      <div className="mt-3">
        <p className={SUBHEAD}>Invoices</p>
        {m.invoices.state === "ready" ? (
          m.invoices.lines.length ? (
            <Lines lines={m.invoices.lines} label="Invoices" />
          ) : (
            <p className="mt-1 text-sm text-[var(--muted)]">No invoices yet.</p>
          )
        ) : (
          <PartNotice part={m.invoices} what="Invoices" />
        )}
      </div>
    </StoryRow>
  );
}

function Builds({ story }: { story: ClientStory }) {
  const b = story.builds;
  return (
    <StoryRow id="client-360-builds" icon={Hammer} title="Builds" summary={b.summary}>
      {b.part.state !== "ready" ? (
        <PartNotice part={b.part} what="Projects" />
      ) : b.projects.length ? (
        <ul className="grid gap-3" aria-label="Projects">
          {b.projects.map((p) => (
            <li key={p.id} className="min-w-0 rounded-lg border border-[var(--line)] bg-[var(--page)] p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="min-w-0 text-sm font-black text-[var(--heading)] [overflow-wrap:anywhere]">{p.name}</p>
                <p className="text-xs font-bold text-[var(--blue)]">{p.stage}</p>
              </div>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {p.progress}
                {p.next ? ` · Next: ${p.next}` : ""}
              </p>
              {p.milestones.length ? (
                <ol className="mt-2 grid gap-1 text-sm" aria-label={`${p.name} milestones`}>
                  {p.milestones.map((ms) => (
                    <li key={ms.id} className="flex min-w-0 items-start justify-between gap-3">
                      <span className={`min-w-0 [overflow-wrap:anywhere] ${ms.status === "done" ? "text-[var(--muted)] line-through" : "text-[var(--text)]"}`}>
                        {ms.title}
                      </span>
                      <span className={`shrink-0 text-xs font-bold ${ms.status === "in_progress" ? "text-[var(--blue)]" : "text-[var(--muted)]"}`}>{ms.label}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">No projects yet.</p>
      )}
    </StoryRow>
  );
}

function Conversations({ story, anchors }: { story: ClientStory; anchors: Client360Anchors | null }) {
  const c = story.conversations;
  return (
    <StoryRow id="client-360-conversations" icon={MessagesSquare} title="Conversations" summary={c.summary}>
      {c.problems.length ? (
        <ul className="mb-2 grid gap-2" aria-label="What this list is missing">
          {c.problems.map((gap) => (
            <li
              key={gap.text}
              className={
                gap.kind === "failed"
                  ? "rounded-lg border border-[var(--warn-line)] bg-[var(--warn-tint)] p-3 text-sm text-[var(--text)]"
                  : "rounded-lg border border-dashed border-[var(--line-strong)] p-3 text-sm text-[var(--muted)]"
              }
            >
              <p>{gap.text}</p>
              {gap.link ? (
                <a href={gap.link.href} className={QUIET_LINK}>
                  {gap.link.label}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <p className={SUBHEAD}>Latest</p>
      {c.recent.length ? (
        <Lines lines={c.recent} label="Latest conversations" />
      ) : (
        // With a source that did not load, an empty list here is not "none yet".
        <p className="mt-1 text-sm text-[var(--muted)]">
          {c.problems.some((gap) => gap.kind === "failed") ? "Nothing else loaded." : "No texts, calls, or emails yet."}
        </p>
      )}
      <p className={`${SUBHEAD} mt-3`}>By channel</p>
      <dl className="mt-1 grid grid-cols-1 gap-x-4 text-sm min-[420px]:grid-cols-2">
        {c.counts.map((row) => (
          <div key={row.label} className="flex min-h-[32px] items-center justify-between gap-3 border-b border-[var(--line)] py-1">
            <dt className="min-w-0 text-[var(--muted)]">{row.label}</dt>
            <dd className="shrink-0 font-bold tabular-nums text-[var(--heading)]">{row.value}</dd>
          </div>
        ))}
      </dl>
      {anchors ? (
        <div className="mt-2 flex flex-wrap gap-x-4">
          <a href={anchors.history} className={QUIET_LINK}>
            See the full history
          </a>
          <a href={anchors.reply} className={QUIET_LINK}>
            Reply or log a message
          </a>
        </div>
      ) : null}
    </StoryRow>
  );
}

function Notes({ story, anchors }: { story: ClientStory; anchors: Client360Anchors | null }) {
  const n = story.notes;
  return (
    <StoryRow id="client-360-notes" icon={NotebookPen} title="Notes" summary={n.summary}>
      {n.state === "failed" ? (
        <p className="rounded-lg border border-[var(--warn-line)] bg-[var(--warn-tint)] p-3 text-sm text-[var(--text)]">
          Notes did not load. That is a connection problem, not an empty record. Refresh to try again.
        </p>
      ) : null}
      {n.latest.length ? <Lines lines={n.latest} label="Latest notes" /> : n.state === "ready" ? <p className="text-sm text-[var(--muted)]">No notes yet.</p> : null}
      {anchors ? (
        <a href={anchors.note} className={QUIET_LINK}>
          Add a team note
        </a>
      ) : null}
    </StoryRow>
  );
}

export default function Client360({ story, reach, anchors }: Client360Props) {
  return (
    <section id="client-360" aria-labelledby="client-360-title" className="card min-w-0 scroll-mt-24 !p-4 sm:!p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="client-360-title" className="text-lg font-black text-[var(--heading)]">
          The whole story
        </h2>
        <p className="text-xs text-[var(--muted)]">As of {story.asOf} Central</p>
      </div>
      {story.sample ? (
        <p className="mt-2 rounded-lg border border-[var(--accent-line)] bg-[var(--accent-tint)] p-3 text-sm text-[var(--text)]" role="note">
          <span className="font-bold">Sample.</span> {story.name} is fictional. Nothing here is real, and nothing is saved or sent.
        </p>
      ) : null}

      <FollowUp story={story} anchors={anchors} />
      {reach ? <ReachRow reach={reach} sample={story.sample} name={story.name} /> : null}

      {/* One column on a phone; two on a wide screen, each row keeping its own height when it opens. */}
      <div className="mt-4 grid gap-2 lg:grid-cols-2 lg:items-start">
        <Money story={story} />
        <Builds story={story} />
        <Conversations story={story} anchors={anchors} />
        <Notes story={story} anchors={anchors} />
      </div>
    </section>
  );
}
