"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  Check,
  ClipboardCopy,
  Download,
  ListChecks,
  LogOut,
  Mail,
  MessageSquareText,
  PhoneCall,
  Plus,
  RotateCcw,
  Settings2,
  SunMedium,
  ThumbsDown,
  Trophy,
  X,
} from "lucide-react";
import type { Sheet, SheetItem } from "@/lib/chaseSheet/sheet";
import type { AccountView, Profile, Quote, Touch } from "@/lib/chaseSheet/types";
import { CHASE_SHEET } from "@/lib/chaseSheet/product";
import { BUSINESS } from "@/lib/site/business";
import styles from "../chase-sheet.module.css";

// The sheet. Everything here is drawn from one server read; every action is
// a server write followed by a fresh read, so what the owner sees is always
// what the rows say. The message engine never runs in the browser.

type Option = { value: string; label: string };

type State = {
  account: AccountView;
  profile: Profile;
  today: string;
  sheet: Sheet;
  quotes: Quote[];
  touches: Touch[];
};

type Tab = "today" | "quotes" | "ledger" | "settings";

const ROLE_LABEL: Record<string, string> = {
  landed: "Did it land",
  call: "The real conversation",
  question: "One question",
  proof: "The proof",
  reason: "The honest reason",
  schedule: "The schedule call",
  close: "Closing the file",
  revive: "The revival",
  last: "The last word",
};

const URGENCY: Option[] = [
  { value: "planned", label: "Planned work" },
  { value: "soon", label: "Needs doing soon" },
  { value: "urgent", label: "Urgent repair" },
];

function usd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

function longDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function shortDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

async function api<T>(path: string, method: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(data.error || "That did not work. Try again.");
  return data;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* --------------------------------- the app -------------------------------- */

export default function ChaseSheetApp({ trades, tones, welcome }: { trades: Option[]; tones: Option[]; welcome: boolean }) {
  const [state, setState] = useState<State | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const next = await api<State>("/api/chase-sheet/session", "GET");
      setState(next);
      setError(null);
      if (!next.profile.business) setTab("settings");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the sheet.");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2600);
    return () => clearTimeout(t);
  }, [flash]);

  if (!state && !error) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <p className={styles.note}>Opening your sheet.</p>
        </div>
      </main>
    );
  }
  if (!state) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <p className={styles.error} role="alert">
            {error}
          </p>
          <button type="button" className={styles.secondary} onClick={() => void reload()}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  const { sheet } = state;
  const setupNeeded = !state.profile.business;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topline}>
          <Link href={CHASE_SHEET.path} className={styles.wordmark}>
            <ListChecks aria-hidden="true" size={26} />
            Chase<span>Sheet</span>
          </Link>
          <span>{state.profile.business || state.account.email}</span>
        </div>

        {welcome ? (
          <p className={styles.notice} role="status">
            Your sheet is open. The key that opens it on your phone is in your email. Start with your business name and trade below, then add the quotes you have out.
          </p>
        ) : null}
        {setupNeeded && !welcome ? (
          <p className={styles.notice} role="status">
            Put in your business name, your trade, and how you talk to customers. Every message is written from that.
          </p>
        ) : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {flash ? (
          <p className={styles.notice} role="status">
            {flash}
          </p>
        ) : null}

        <div className={styles.appHeader}>
          <div>
            <p className={styles.eyebrow}>{longDate(state.today)}</p>
            <h1>
              {sheet.due.length === 0
                ? "Nothing to chase today."
                : `${sheet.due.length} to chase today. ${usd(sheet.ledger.dueCents)} on the sheet.`}
            </h1>
            <p>
              {sheet.ledger.overdueCount > 0
                ? `${sheet.ledger.overdueCount} behind. Those come first.`
                : sheet.due.length > 0
                  ? "Work them top to bottom. Behind first, biggest money next."
                  : sheet.ledger.openCount > 0
                    ? `${sheet.ledger.openCount} open quotes are on schedule. Add anything you sent today.`
                    : "Add the quotes you have out and tomorrow the sheet hands you the first one."}
            </p>
          </div>
        </div>

        <nav className={styles.tabs} aria-label="Sheet sections">
          {(
            [
              ["today", "Today", sheet.due.length, SunMedium],
              ["quotes", "Quotes", sheet.ledger.openCount, ListChecks],
              ["ledger", "Ledger", null, BadgeDollarSign],
              ["settings", "Settings", null, Settings2],
            ] as [Tab, string, number | null, typeof SunMedium][]
          ).map(([id, label, count, Icon]) => (
            <button key={id} type="button" aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>
              <Icon aria-hidden="true" size={16} />
              {label}
              {count !== null && count > 0 ? <span>{count}</span> : null}
            </button>
          ))}
        </nav>

        {tab === "today" ? <TodayTab state={state} reload={reload} setError={setError} setFlash={setFlash} goSettings={() => setTab("settings")} /> : null}
        {tab === "quotes" ? <QuotesTab state={state} reload={reload} setError={setError} setFlash={setFlash} /> : null}
        {tab === "ledger" ? <LedgerTab state={state} /> : null}
        {tab === "settings" ? <SettingsTab state={state} trades={trades} tones={tones} reload={reload} setError={setError} setFlash={setFlash} /> : null}
      </div>
    </main>
  );
}

/* --------------------------------- today ---------------------------------- */

type TabProps = {
  state: State;
  reload: () => Promise<void>;
  setError: (message: string | null) => void;
  setFlash: (message: string | null) => void;
};

function TodayTab({ state, reload, setError, setFlash, goSettings }: TabProps & { goSettings: () => void }) {
  const { sheet } = state;
  return (
    <>
      <LedgerStrip sheet={sheet} />
      <section className={styles.panel}>
        <h2>Chase these now</h2>
        <p>Each one has the words written. Tap, send from your own phone, mark it done.</p>
        {sheet.due.length === 0 ? (
          <div className={styles.empty}>
            <strong>{state.quotes.length === 0 ? "No quotes on the sheet yet." : "Caught up."}</strong>
            {state.quotes.length === 0
              ? "Add the ones you have out right now, even the ones from last month. The sheet will pick them up where they are."
              : "Nothing is due today. The next ones are listed below."}
            {!state.profile.business ? (
              <p style={{ marginTop: 10 }}>
                <button type="button" className={styles.ghost} onClick={goSettings}>
                  Set up your business first <ArrowRight aria-hidden="true" size={14} />
                </button>
              </p>
            ) : null}
          </div>
        ) : (
          <div className={styles.list}>
            {sheet.due.map((item) => (
              <DueCard key={item.quote.id} item={item} reload={reload} setError={setError} setFlash={setFlash} />
            ))}
          </div>
        )}
      </section>

      {sheet.upcoming.length > 0 ? (
        <section className={styles.panel}>
          <h2>Coming up this week</h2>
          <p>Already scheduled. Nothing to do today.</p>
          <div className={styles.rowList}>
            {sheet.upcoming.map((item) => (
              <div className={styles.row} key={item.quote.id}>
                <div>
                  <strong>
                    {item.quote.customerName}, {item.quote.job}
                  </strong>
                  <p>
                    {ROLE_LABEL[item.step.role]} on {longDate(item.step.on)}
                  </p>
                </div>
                <div className={styles.rowRight}>
                  <strong>{item.amountLabel}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {sheet.quiet.length > 0 ? (
        <section className={styles.panel}>
          <h2>Quiet</h2>
          <p>The sequence has run out and they never answered. Decide: lost, or leave it and add a note if something changes.</p>
          <div className={styles.rowList}>
            {sheet.quiet.map((quote) => (
              <QuietRow key={quote.id} quote={quote} reload={reload} setError={setError} setFlash={setFlash} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function LedgerStrip({ sheet }: { sheet: Sheet }) {
  const l = sheet.ledger;
  return (
    <div className={styles.ledger}>
      <div className={styles.stat}>
        <p>On the sheet today</p>
        <strong>{usd(l.dueCents)}</strong>
        <span>{l.dueCount} to chase{l.overdueCount ? `, ${l.overdueCount} behind` : ""}</span>
      </div>
      <div className={styles.stat}>
        <p>Open quotes</p>
        <strong>{usd(l.openCents)}</strong>
        <span>{l.openCount} waiting on an answer</span>
      </div>
      <div className={styles.stat}>
        <p>Won after chasing</p>
        <strong>{usd(l.wonAfterChaseCents)}</strong>
        <span>{l.wonAfterChaseCount} of {l.wonCount} won came after a touch</span>
      </div>
      <div className={styles.stat}>
        <p>This week</p>
        <strong>{l.touchesThisWeek}</strong>
        <span>touches sent in seven days</span>
      </div>
    </div>
  );
}

function DueCard({ item, reload, setError, setFlash }: { item: SheetItem } & Omit<TabProps, "state">) {
  const [busy, setBusy] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [snooze, setSnooze] = useState("");
  const [lostReason, setLostReason] = useState("");
  const { quote, step, message, links } = item;
  const isCall = message.channel === "call";

  async function act(label: string, fn: () => Promise<unknown>, done: string) {
    setBusy(label);
    setError(null);
    try {
      await fn();
      await reload();
      setFlash(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  }

  const touch = (outcome: string, done: string) => act(outcome, () => api("/api/chase-sheet/touches", "POST", { quoteId: quote.id, outcome }), done);
  const status = (value: string, done: string, extra: Record<string, unknown> = {}) =>
    act(value, () => api("/api/chase-sheet/quotes", "PATCH", { id: quote.id, status: value, ...extra }), done);

  return (
    <article className={styles.item}>
      <div className={styles.itemHead}>
        <h3>
          {quote.customerName}, {quote.job}
        </h3>
        <span className={styles.amount}>{item.amountLabel}</span>
      </div>
      <div className={styles.itemMeta}>
        <span className={styles.chip}>Day {step.day}</span>
        <span className={`${styles.chip} ${styles.chipMuted}`}>{ROLE_LABEL[step.role]}</span>
        <span className={`${styles.chip} ${styles.chipMuted}`}>
          {isCall ? <PhoneCall aria-hidden="true" size={12} /> : <MessageSquareText aria-hidden="true" size={12} />} {isCall ? "call" : "text"}
        </span>
        {item.overdueDays > 0 ? <span className={`${styles.chip} ${styles.chipWarn}`}>{item.overdueDays} {item.overdueDays === 1 ? "day" : "days"} behind</span> : null}
        <span>sent {shortDate(quote.sentOn)}</span>
        {quote.done > 0 ? <span>{quote.done} {quote.done === 1 ? "touch" : "touches"} so far</span> : null}
      </div>
      <pre className={styles.messageBody}>{message.body}</pre>
      {message.fallbackText ? (
        <>
          <p className={styles.touchJob}>If it goes to voicemail, send this instead:</p>
          <pre className={styles.messageBody}>{message.fallbackText}</pre>
        </>
      ) : null}
      <p className={styles.touchJob}>{step.job}</p>

      <div className={styles.itemActions}>
        {links.sms ? (
          <a className={styles.primary} href={links.sms}>
            <MessageSquareText aria-hidden="true" size={16} /> Text it
          </a>
        ) : null}
        {isCall && links.tel ? (
          <a className={styles.primary} href={links.tel}>
            <PhoneCall aria-hidden="true" size={16} /> Call {quote.customerName.split(" ")[0]}
          </a>
        ) : null}
        {isCall && links.smsFallback ? (
          <a className={styles.secondary} href={links.smsFallback}>
            <MessageSquareText aria-hidden="true" size={16} /> Voicemail text
          </a>
        ) : null}
        {!isCall && links.tel ? (
          <a className={styles.secondary} href={links.tel}>
            <PhoneCall aria-hidden="true" size={16} /> Call instead
          </a>
        ) : null}
        {links.mail ? (
          <a className={styles.secondary} href={links.mail}>
            <Mail aria-hidden="true" size={16} /> Email it
          </a>
        ) : null}
        <button
          type="button"
          className={styles.secondary}
          onClick={async () => {
            const ok = await copyText(message.fallbackText && isCall ? message.fallbackText : message.body);
            setFlash(ok ? "Copied." : "Could not copy on this device. Select the text and copy it.");
          }}
        >
          <ClipboardCopy aria-hidden="true" size={16} /> Copy
        </button>
        {!quote.customerPhone ? <span className={styles.quiet}>No phone number on this quote. Add one in Quotes.</span> : null}
      </div>

      <div className={styles.itemActions}>
        <button type="button" className={styles.ghost} disabled={busy !== null} onClick={() => touch("sent", "Marked sent. Next one.")}>
          <Check aria-hidden="true" size={15} /> {isCall ? "Talked to them" : "Sent it"}
        </button>
        {isCall ? (
          <button type="button" className={styles.ghost} disabled={busy !== null} onClick={() => touch("no_answer", "Logged. The voicemail text counts as the touch.")}>
            No answer, texted
          </button>
        ) : null}
        <button type="button" className={styles.ghost} disabled={busy !== null} onClick={() => touch("replied", "Good. Checking back in three days unless you move it first.")}>
          They replied
        </button>
        <button type="button" className={styles.ghost} disabled={busy !== null} onClick={() => status("won", `${quote.customerName} marked won. ${item.amountLabel} on the ledger.`)}>
          <Trophy aria-hidden="true" size={15} /> Won
        </button>
        <button type="button" className={styles.ghost} onClick={() => setShowMore((v) => !v)}>
          {showMore ? "Less" : "More"}
        </button>
      </div>

      {showMore ? (
        <div className={styles.detail}>
          <div className={styles.inlineForm}>
            <label className={styles.srOnly} htmlFor={`snooze-${quote.id}`}>
              Snooze until
            </label>
            <input id={`snooze-${quote.id}`} type="date" value={snooze} min={snoozeMin(item)} onChange={(e) => setSnooze(e.target.value)} />
            <button
              type="button"
              className={styles.ghost}
              disabled={!snooze || busy !== null}
              onClick={() => act("snooze", () => api("/api/chase-sheet/quotes", "PATCH", { id: quote.id, snoozeUntil: snooze }), `Snoozed until ${longDate(snooze)}.`)}
            >
              <CalendarClock aria-hidden="true" size={15} /> Snooze
            </button>
          </div>
          <div className={styles.inlineForm}>
            <input value={lostReason} maxLength={200} placeholder="Why lost (optional)" onChange={(e) => setLostReason(e.target.value)} />
            <button type="button" className={styles.ghost} disabled={busy !== null} onClick={() => status("lost", "Marked lost.", { lostReason })}>
              <ThumbsDown aria-hidden="true" size={15} /> Lost
            </button>
            <button type="button" className={styles.ghost} disabled={busy !== null} onClick={() => touch("skipped", "Skipped this touch. The next one is scheduled.")}>
              Skip this touch
            </button>
            <button type="button" className={styles.ghost} disabled={busy !== null} onClick={() => status("archived", "Archived.")}>
              <Archive aria-hidden="true" size={15} /> Archive
            </button>
          </div>
          {item.history.length > 0 ? (
            <ul className={styles.history}>
              {item.history.map((t) => (
                <li key={t.id}>
                  {shortDate(t.at.slice(0, 10))}: step {t.step}, {ROLE_LABEL[t.role] ?? t.role}, {t.outcome.replace("_", " ")}
                  {t.note ? ` (${t.note})` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function snoozeMin(item: SheetItem): string {
  return item.step.on;
}

function QuietRow({ quote, reload, setError, setFlash }: { quote: Quote } & Omit<TabProps, "state">) {
  const [busy, setBusy] = useState(false);
  async function set(status: string, done: string) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/chase-sheet/quotes", "PATCH", { id: quote.id, status });
      await reload();
      setFlash(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.row}>
      <div>
        <strong>
          {quote.customerName}, {quote.job}
        </strong>
        <p>
          Sent {shortDate(quote.sentOn)}. {quote.done} touches, no answer.
        </p>
      </div>
      <div className={styles.rowRight}>
        <strong>{usd(quote.amountCents)}</strong>
        <div className={styles.itemActions} style={{ marginTop: 0 }}>
          <button type="button" className={styles.ghost} disabled={busy} onClick={() => set("won", "Marked won.")}>
            Won
          </button>
          <button type="button" className={styles.ghost} disabled={busy} onClick={() => set("lost", "Marked lost.")}>
            Lost
          </button>
          <button type="button" className={styles.ghost} disabled={busy} onClick={() => set("archived", "Archived.")}>
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- quotes --------------------------------- */

const EMPTY_FORM = { customerName: "", customerPhone: "", customerEmail: "", job: "", amountUsd: "", sentOn: "", urgency: "", notes: "" };

function QuotesTab({ state, reload, setError, setFlash }: TabProps) {
  const [filter, setFilter] = useState<"open" | "won" | "lost" | "archived">("open");
  const [form, setForm] = useState({ ...EMPTY_FORM, sentOn: state.today });
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(state.quotes.length === 0);
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => state.quotes.filter((q) => q.status === filter), [state.quotes, filter]);
  const counts = useMemo(() => {
    const c = { open: 0, won: 0, lost: 0, archived: 0 };
    for (const q of state.quotes) c[q.status] += 1;
    return c;
  }, [state.quotes]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      await api("/api/chase-sheet/quotes", "POST", { ...form, urgency: form.urgency || undefined });
      setForm({ ...EMPTY_FORM, sentOn: state.today });
      await reload();
      setFlash("On the sheet. The first touch is scheduled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that quote.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <section className={styles.panel}>
        <div className={styles.itemHead}>
          <h2>Add a quote</h2>
          {!showForm ? (
            <button type="button" className={styles.primary} onClick={() => setShowForm(true)}>
              <Plus aria-hidden="true" size={16} /> Add a quote
            </button>
          ) : null}
        </div>
        {showForm ? (
          <form className={styles.fields} onSubmit={add} style={{ marginTop: 14 }}>
            <label>
              Customer name
              <input required value={form.customerName} maxLength={120} placeholder="Dana Whitfield" onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </label>
            <label>
              Mobile number
              <input value={form.customerPhone} inputMode="tel" maxLength={30} placeholder="903 555 0100" onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
              <small>The Text and Call buttons need this. Digits only is fine.</small>
            </label>
            <label>
              What you quoted
              <input required value={form.job} maxLength={160} placeholder="the back fence, a 4 ton system" onChange={(e) => setForm({ ...form, job: e.target.value })} />
              <small>Goes into every message, so write it the way you would say it.</small>
            </label>
            <label>
              Amount (dollars)
              <input required value={form.amountUsd} inputMode="decimal" maxLength={12} placeholder="4200" onChange={(e) => setForm({ ...form, amountUsd: e.target.value })} />
            </label>
            <label>
              Day you sent it
              <input type="date" required value={form.sentOn} max={state.today} onChange={(e) => setForm({ ...form, sentOn: e.target.value })} />
            </label>
            <label>
              The work is
              <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
                <option value="">Usual for my trade</option>
                {URGENCY.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
              <small>Sets the pace. Urgent repairs get chased faster; planned work more patiently.</small>
            </label>
            <label>
              Email (optional)
              <input type="email" value={form.customerEmail} maxLength={200} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
            </label>
            <label>
              Notes (optional)
              <input value={form.notes} maxLength={2000} placeholder="Wants it before the wedding in May" onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
            <div className={`${styles.full} ${styles.actions}`} style={{ marginTop: 0 }}>
              <button type="submit" className={styles.primary} disabled={adding}>
                <Plus aria-hidden="true" size={16} /> {adding ? "Adding" : "Put it on the sheet"}
              </button>
              {state.quotes.length > 0 ? (
                <button type="button" className={styles.secondary} onClick={() => setShowForm(false)}>
                  Close
                </button>
              ) : null}
            </div>
          </form>
        ) : null}
      </section>

      <section className={styles.panel}>
        <h2>Your quotes</h2>
        <p>Tap one to see the whole sequence, the history, and the objection replies.</p>
        <div className={styles.filters}>
          {(["open", "won", "lost", "archived"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <div className={styles.empty}>
            <strong>Nothing {filter} yet.</strong>
          </div>
        ) : (
          <div className={styles.rowList}>
            {list.map((q) => (
              <div key={q.id}>
                <button type="button" className={styles.row} style={{ width: "100%", textAlign: "left", cursor: "pointer" }} onClick={() => setOpen(open === q.id ? null : q.id)} aria-expanded={open === q.id}>
                  <div>
                    <strong>
                      {q.customerName}, {q.job}
                    </strong>
                    <p>
                      Sent {shortDate(q.sentOn)}. {q.done} {q.done === 1 ? "touch" : "touches"}.
                      {q.status === "open" && q.nextOn ? ` Next ${shortDate(q.nextOn)}.` : ""}
                      {q.status === "won" && q.wonOn ? ` Won ${shortDate(q.wonOn)}.` : ""}
                      {q.status === "lost" && q.lostOn ? ` Lost ${shortDate(q.lostOn)}${q.lostReason ? `: ${q.lostReason}` : ""}.` : ""}
                    </p>
                  </div>
                  <div className={styles.rowRight}>
                    <strong>{usd(q.amountCents)}</strong>
                  </div>
                </button>
                {open === q.id ? <QuoteDetail quote={q} state={state} reload={reload} setError={setError} setFlash={setFlash} close={() => setOpen(null)} /> : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

type Detail = {
  quote: Quote;
  sequence: { step: { step: number; role: string; channel: string; day: number; on: string; job: string }; message: { body: string; fallbackText?: string }; done: boolean }[];
  touches: Touch[];
  objections: { id: string; heard: string; note: string; reply: string }[];
};

function QuoteDetail({ quote, state, reload, setError, setFlash, close }: { quote: Quote; close: () => void } & TabProps) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [edit, setEdit] = useState({
    customerName: quote.customerName,
    customerPhone: quote.customerPhone,
    customerEmail: quote.customerEmail,
    job: quote.job,
    amountUsd: String(Math.round(quote.amountCents / 100)),
    sentOn: quote.sentOn,
    urgency: quote.urgency,
    notes: quote.notes,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<Detail>(`/api/chase-sheet/quotes?id=${encodeURIComponent(quote.id)}`, "GET")
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load that quote."));
    return () => {
      cancelled = true;
    };
  }, [quote.id, quote.updatedAt, setError]);

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
      setFlash(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.item} style={{ marginTop: 6 }}>
      <form
        className={styles.fields}
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => api("/api/chase-sheet/quotes", "PATCH", { id: quote.id, ...edit }), "Saved.");
        }}
      >
        <label>
          Customer name
          <input value={edit.customerName} maxLength={120} onChange={(e) => setEdit({ ...edit, customerName: e.target.value })} />
        </label>
        <label>
          Mobile number
          <input value={edit.customerPhone} inputMode="tel" maxLength={30} onChange={(e) => setEdit({ ...edit, customerPhone: e.target.value })} />
        </label>
        <label>
          What you quoted
          <input value={edit.job} maxLength={160} onChange={(e) => setEdit({ ...edit, job: e.target.value })} />
        </label>
        <label>
          Amount (dollars)
          <input value={edit.amountUsd} inputMode="decimal" maxLength={12} onChange={(e) => setEdit({ ...edit, amountUsd: e.target.value })} />
        </label>
        <label>
          Day you sent it
          <input type="date" value={edit.sentOn} max={state.today} onChange={(e) => setEdit({ ...edit, sentOn: e.target.value })} />
        </label>
        <label>
          The work is
          <select value={edit.urgency} onChange={(e) => setEdit({ ...edit, urgency: e.target.value as Quote["urgency"] })}>
            {URGENCY.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Email
          <input type="email" value={edit.customerEmail} maxLength={200} onChange={(e) => setEdit({ ...edit, customerEmail: e.target.value })} />
        </label>
        <label>
          Notes
          <input value={edit.notes} maxLength={2000} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
        </label>
        <div className={`${styles.full} ${styles.itemActions}`} style={{ marginTop: 0 }}>
          <button type="submit" className={styles.primary} disabled={busy}>
            <Check aria-hidden="true" size={16} /> Save
          </button>
          {quote.status !== "open" ? (
            <button type="button" className={styles.secondary} disabled={busy} onClick={() => run(() => api("/api/chase-sheet/quotes", "PATCH", { id: quote.id, status: "open" }), "Reopened. The next touch is tomorrow.")}>
              <RotateCcw aria-hidden="true" size={16} /> Reopen
            </button>
          ) : (
            <>
              <button type="button" className={styles.secondary} disabled={busy} onClick={() => run(() => api("/api/chase-sheet/quotes", "PATCH", { id: quote.id, status: "won" }), "Marked won.")}>
                <Trophy aria-hidden="true" size={16} /> Won
              </button>
              <button type="button" className={styles.secondary} disabled={busy} onClick={() => run(() => api("/api/chase-sheet/quotes", "PATCH", { id: quote.id, status: "lost" }), "Marked lost.")}>
                <ThumbsDown aria-hidden="true" size={16} /> Lost
              </button>
            </>
          )}
          <button
            type="button"
            className={styles.ghost}
            disabled={busy}
            onClick={() => {
              if (window.confirm("Delete this quote and its history? This cannot be undone.")) {
                void run(async () => {
                  await api(`/api/chase-sheet/quotes?id=${encodeURIComponent(quote.id)}`, "DELETE");
                  close();
                }, "Deleted.");
              }
            }}
          >
            <X aria-hidden="true" size={15} /> Delete
          </button>
        </div>
      </form>

      {detail ? (
        <div className={styles.detail}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 10px" }}>The sequence</h3>
          <div className={styles.timeline}>
            {detail.sequence.map(({ step, message, done }) => (
              <article className={styles.touch} key={step.step} style={{ opacity: done ? 0.7 : 1 }}>
                <div className={styles.touchHead}>
                  <span className={styles.chip}>Day {step.day}</span>
                  <strong>{ROLE_LABEL[step.role] ?? step.role}</strong>
                  <span className={`${styles.chip} ${done ? styles.chipGood : styles.chipMuted}`}>{done ? "done" : longDate(step.on)}</span>
                </div>
                <pre className={styles.messageBody}>{message.body}</pre>
              </article>
            ))}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: "18px 0 8px" }}>When they push back</h3>
          <div className={styles.objections}>
            {detail.objections.map((o) => (
              <details key={o.id}>
                <summary>&ldquo;{o.heard}&rdquo;</summary>
                <p>
                  <em>{o.note}</em>
                </p>
                <pre className={styles.messageBody}>{o.reply}</pre>
                <p>
                  <button type="button" className={styles.ghost} onClick={async () => setFlash((await copyText(o.reply)) ? "Copied." : "Could not copy on this device.")}>
                    <ClipboardCopy aria-hidden="true" size={14} /> Copy reply
                  </button>
                </p>
              </details>
            ))}
          </div>
          {detail.touches.length > 0 ? (
            <>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: "18px 0 4px" }}>History</h3>
              <ul className={styles.history}>
                {detail.touches.map((t) => (
                  <li key={t.id}>
                    {shortDate(t.at.slice(0, 10))}: step {t.step}, {ROLE_LABEL[t.role] ?? t.role}, {t.outcome.replace("_", " ")}
                    {t.note ? ` (${t.note})` : ""}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : (
        <p className={styles.note}>Loading the sequence.</p>
      )}
    </div>
  );
}

/* --------------------------------- ledger --------------------------------- */

function LedgerTab({ state }: { state: State }) {
  const l = state.sheet.ledger;
  const rows: [string, string, string][] = [
    ["Open", usd(l.openCents), `${l.openCount} quotes waiting on an answer`],
    ["Won", usd(l.wonCents), `${l.wonCount} quotes marked won`],
    ["Won after chasing", usd(l.wonAfterChaseCents), `${l.wonAfterChaseCount} of those came after at least one touch`],
    ["Lost", usd(l.lostCents), `${l.lostCount} quotes marked lost`],
    ["Quiet", usd(l.quietCents), `${l.quietCount} open quotes past the last touch with no answer`],
    ["Touches this week", String(l.touchesThisWeek), "texts sent, calls made, voicemail texts sent"],
  ];
  return (
    <section className={styles.panel}>
      <h2>The ledger</h2>
      <p>Your own numbers, added up from your own quotes. The line that matters is won after chasing: money that only came in because the sheet made you send the next touch.</p>
      <div className={styles.rowList}>
        {rows.map(([label, value, note]) => (
          <div className={styles.row} key={label}>
            <div>
              <strong>{label}</strong>
              <p>{note}</p>
            </div>
            <div className={styles.rowRight}>
              <strong>{value}</strong>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.itemActions}>
        <a className={styles.secondary} href="/api/chase-sheet/export">
          <Download aria-hidden="true" size={16} /> Download every quote as a spreadsheet
        </a>
      </div>
    </section>
  );
}

/* -------------------------------- settings -------------------------------- */

function SettingsTab({ state, trades, tones, reload, setError, setFlash }: TabProps & { trades: Option[]; tones: Option[] }) {
  const [profile, setProfile] = useState<Profile>(state.profile);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/chase-sheet/profile", "POST", profile);
      await reload();
      setFlash("Saved. Every message now reads from this.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function billing() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ url: string }>("/api/chase-sheet/billing", "POST", {});
      window.location.href = r.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing.");
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      await api("/api/chase-sheet/session", "DELETE");
      window.location.href = CHASE_SHEET.appPath;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign out.");
    }
  }

  const a = state.account;
  return (
    <>
      <section className={styles.panel}>
        <h2>Your business</h2>
        <p>Every message is written from these five things. Change one and every open quote rewrites.</p>
        <form className={styles.fields} onSubmit={save}>
          <label>
            Business name
            <input required value={profile.business} maxLength={120} placeholder="Nichols Roofing" onChange={(e) => setProfile({ ...profile, business: e.target.value })} />
          </label>
          <label>
            Your first name
            <input value={profile.owner} maxLength={60} placeholder="Signs every message. Blank signs with the business." onChange={(e) => setProfile({ ...profile, owner: e.target.value })} />
          </label>
          <label>
            Your trade
            <select value={profile.tradeId} onChange={(e) => setProfile({ ...profile, tradeId: e.target.value })}>
              {trades.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <small>Picks the vocabulary, the honest reasons, the proof angle, the seasonal hooks, and the pace.</small>
          </label>
          <label>
            How you talk to customers
            <select value={profile.tone} onChange={(e) => setProfile({ ...profile, tone: e.target.value as Profile["tone"] })}>
              {tones.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Your honest start window
            <input value={profile.window} maxLength={80} placeholder="the week after next" onChange={(e) => setProfile({ ...profile, window: e.target.value })} />
            <small>Used in the schedule call. Keep it true. The script refuses to fake scarcity.</small>
          </label>
          <label>
            Your mobile number
            <input value={profile.phone} inputMode="tel" maxLength={20} placeholder="For your own records" onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </label>
          <div className={`${styles.full} ${styles.actions}`} style={{ marginTop: 0 }}>
            <button type="submit" className={styles.primary} disabled={busy}>
              <Check aria-hidden="true" size={16} /> {busy ? "Saving" : "Save"}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.panel}>
        <h2>Your plan</h2>
        <p>
          {a.plan === "lifetime"
            ? `One payment, yours for good. Nothing renews and there is nothing to cancel.`
            : a.status === "past_due"
              ? `Monthly. The last renewal did not go through. Update the card below; the sheet stays open for ${CHASE_SHEET.pastDueGraceDays} days after the missed date.`
              : a.endsOn
                ? `Monthly, set to end ${longDate(a.endsOn.slice(0, 10))}. The sheet locks after that. Export your quotes before then if you want them.`
                : `Monthly, ${CHASE_SHEET.monthlyLabel}.${a.renewsOn ? ` Renews ${longDate(a.renewsOn.slice(0, 10))}.` : ""} Cancel any time below; it stops at the end of the paid month.`}
        </p>
        <div className={styles.itemActions}>
          {a.canManageBilling ? (
            <button type="button" className={styles.secondary} disabled={busy} onClick={billing}>
              Manage billing, card, or cancel
            </button>
          ) : null}
          <a className={styles.secondary} href="/api/chase-sheet/export">
            <Download aria-hidden="true" size={16} /> Export quotes
          </a>
          <button type="button" className={styles.ghost} onClick={signOut}>
            <LogOut aria-hidden="true" size={15} /> Sign out of this device
          </button>
        </div>
        <p className={styles.fine}>
          Signed in as {a.email}. The key from your receipt opens this sheet on any device. Lost it?{" "}
          <Link href={`${CHASE_SHEET.appPath}?email=${encodeURIComponent(a.email)}`} className={styles.textlink}>
            Ask for it again
          </Link>{" "}
          after signing out, or text {BUSINESS.phone.display}.
        </p>
      </section>
    </>
  );
}
