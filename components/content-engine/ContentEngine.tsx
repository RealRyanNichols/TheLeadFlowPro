"use client";

import NextImage from "next/image";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  Clipboard,
  FileText,
  Image as ImageIcon,
  Link2,
  MessageSquareText,
} from "lucide-react";

type Platform = "facebook" | "x";

type ContentItem = {
  id: number;
  time: string;
  type: "Long-form" | "Image post" | "Article share" | "Text only";
  hook: string;
  objective: string;
  facebook: string;
  x: string;
  imageTitle?: string;
  imageUrl?: string;
  articleUrl?: string;
  articleImage?: string;
};

const ITEMS: ContentItem[] = [
  {
    id: 1,
    time: "6:35 PM",
    type: "Long-form",
    hook: "The call was the lead",
    objective: "Expose the missed-call leak",
    imageTitle: "THE LEAK YOU CAN'T SEE",
    imageUrl: "/images/social/2026-08-17-leak-you-cant-see.webp",
    facebook: `Your marketing already worked.

The phone rang.

Somebody had a real problem and was ready to do something about it. The AC was out. The tooth hurt. Water was coming through the ceiling. A deadline was getting close.

Then nobody answered.

That is the part a lot of owners do not want to look at because it feels easier to blame the ads, the website, the algorithm, or the person running the page.

But the ad found the customer.

Your reputation earned the call.

The system dropped it.

You cannot answer every call yourself. You may be on a ladder, with a customer, in a meeting, driving, or finally sitting down to eat. The answer is not to become superhuman.

The answer is to make sure a missed call does not become a dead lead.

A good system can send an honest text back right away, keep the conversation on a business line, put the person into one lead record, and give somebody a clear next action.

No guessing at 9:00 PM.

No number buried in one employee's phone.

No good customer calling the next company because silence was the only answer.

Pull your call history for the last seven days.

How many calls hit voicemail or rang out?

That number is not a marketing opinion. It is the first place I would look for the leak.`,
    x: `1/5

Your marketing already worked. The phone rang. A real customer had a real problem and was ready to act. Then nobody answered.

2/5

The ad found them. Your reputation earned the call. The system dropped it. That is not an attention problem. It is a lead handling problem.

3/5

You cannot answer every call yourself. You may be on a ladder, with a patient, driving, or serving another customer. The fix is not superhuman answering.

4/5

The fix is a system that texts back, keeps the conversation on a business line, creates a lead record, and gives somebody a next action.

5/5

Pull your call history for the last seven days. How many calls rang out or hit voicemail? That number is the first place I would look for the leak.`,
  },
  {
    id: 2,
    time: "7:10 PM",
    type: "Image post",
    hook: "Pages are not the company",
    objective: "Reframe the website as one connected stage",
    imageTitle: "ONE SYSTEM. ONE NEXT ACTION.",
    imageUrl: "/images/social/2026-08-17-one-system-one-next-action.webp",
    facebook: `A website is one stage of the business, not the whole business.

The real question is what happens after somebody calls, texts, fills out the form, books, pays, or needs the work delivered.

If the answer is five disconnected inboxes and somebody trying to remember, the pages are not the problem.

What happens after your form gets filled out?`,
    x: `A website is one stage of the business, not the whole business.

The real question is what happens after somebody calls, texts, fills out the form, books, pays, or needs the work delivered.

What happens after your form gets filled out?`,
  },
  {
    id: 3,
    time: "7:45 PM",
    type: "Article share",
    hook: "Every missed call is a customer calling the next business",
    objective: "Move owners into a practical call-history audit",
    articleUrl: "https://www.theleadflowpro.com/articles/missed-calls-cost-customers",
    articleImage: "/og/articles/missed-calls-cost-customers.jpg",
    facebook: `A missed call does not always leave a voicemail.

A lot of people just call the next business on the list.

This article walks through the honest math using your own call history, what a simple recovery system should do, and why answering everything yourself is not the fix.

Read it, then pull the last seven days of calls. The answer is already in the phone.

https://www.theleadflowpro.com/articles/missed-calls-cost-customers`,
    x: `A missed call does not always leave a voicemail. A lot of people just call the next business.

This shows you how to run the math with your own call history and what a practical recovery system should do.

https://www.theleadflowpro.com/articles/missed-calls-cost-customers`,
  },
  {
    id: 4,
    time: "8:20 PM",
    type: "Text only",
    hook: "What happens in minute one?",
    objective: "Start an operator conversation",
    facebook: `A new lead just filled out your form. What happens in the first minute, and who can prove it happened?

I want the real answer, not the process written in a document nobody opens.`,
    x: `A new lead just filled out your form. What happens in the first minute, and who can prove it happened?

I want the real answer, not the process written in a document nobody opens.`,
  },
  {
    id: 5,
    time: "8:55 PM",
    type: "Long-form",
    hook: "Your form worked. Your follow-up didn't.",
    objective: "Sell the $497 System Map through a real leak",
    imageTitle: "YOUR FORM WORKED. YOUR FOLLOW-UP DIDN'T.",
    imageUrl: "/images/social/2026-08-17-form-worked-follow-up-didnt.webp",
    facebook: `Your form worked.

The lead submitted it.

The confirmation page loaded. The email notification went out. Technically, every box on the website got checked.

Then the message landed in an inbox nobody checks after hours.

That is why I do not want to sell you pages before I understand the company behind them.

A new website connected to the same old mess is still the same old mess.

Calls disappear into personal phones. The CRM has three versions of the same person. Nobody can say which attention produced a real sale. Follow-up depends on somebody remembering later.

So the first paid move at The LeadFlow Pro is the System Map.

It is $497, and the full amount is credited toward an approved build.

We inventory what you run today. We map the customer path and the data flow. We find the ownership problems, broken handoffs, and places where the same work is being paid for twice.

Then we lay out the modules, the order, the dependencies, and the honest price range before anybody starts building.

The website is one stage.

Attention, capture, CRM, follow-up, the sale, delivery, and reporting still have to connect around it.

If you have a real business, a real offer, and you are ready to see the whole system on one table, start here:

https://www.theleadflowpro.com/start`,
    x: `1/5

Your form worked. The lead submitted it. The confirmation page loaded. Then the message landed in an inbox nobody checks after hours.

2/5

That is why I do not want to sell you pages before I understand the company behind them. A new website connected to the same old mess is still the same old mess.

3/5

The first paid move at The LeadFlow Pro is the System Map. It is $497, credited in full toward an approved build.

4/5

We inventory the tools, map the customer and data path, find broken handoffs, audit ownership, and put the modules in the right order before anybody builds.

5/5

A real company should not be forced into a canned package. Map the company first. Then price the real work.

https://www.theleadflowpro.com/start`,
  },
  {
    id: 6,
    time: "9:30 PM",
    type: "Image post",
    hook: "Where do your leads disappear?",
    objective: "Get owners to name one broken channel",
    imageTitle: "WHERE DO YOUR LEADS DISAPPEAR?",
    imageUrl: "/images/social/2026-08-17-where-leads-disappear.webp",
    facebook: `Calls. Texts. Forms. DMs.

Which one is most likely to sit too long, land in the wrong place, or disappear in your business right now?

Pick one. That is where I would start.`,
    x: `Calls. Texts. Forms. DMs.

Which one is most likely to sit too long, land in the wrong place, or disappear in your business right now?

Pick one.`,
  },
  {
    id: 7,
    time: "10:05 PM",
    type: "Article share",
    hook: "A Facebook page is not a website",
    objective: "Teach rented reach versus an owned home base",
    articleUrl: "https://www.theleadflowpro.com/articles/facebook-page-is-not-a-website",
    articleImage: "/og/articles/facebook-page-is-not-a-website.jpg",
    facebook: `Keep Facebook.

Use the reach. Work the comments. Answer the DMs. Let it do what it is good at.

Just stop letting one rented platform be the only place the business exists.

This article explains what the platform controls, what a page cannot hold for you, and how an owned home base works next to social instead of replacing it.

Read it, then answer one question: what breaks if the page disappears tomorrow?

https://www.theleadflowpro.com/articles/facebook-page-is-not-a-website`,
    x: `Keep Facebook. Use the reach. Work the comments. Answer the DMs.

Just stop letting one rented platform be the only place the business exists.

What breaks if the page disappears tomorrow?

https://www.theleadflowpro.com/articles/facebook-page-is-not-a-website`,
  },
  {
    id: 8,
    time: "10:40 PM",
    type: "Text only",
    hook: "Fix one handoff",
    objective: "Turn the system conversation into one action",
    facebook: `You do not have to fix the whole company tonight. Pick one handoff where a customer can disappear, then make sure it has an owner, a record, and a next action.

One move this week.`,
    x: `You do not have to fix the whole company tonight.

Pick one handoff where a customer can disappear, then make sure it has an owner, a record, and a next action.

One move this week.`,
  },
  {
    id: 9,
    time: "11:15 PM",
    type: "Text only",
    hook: "Name the bottleneck",
    objective: "Surface tomorrow's strongest content topic",
    facebook: `More software is not automatically progress. What is the one bottleneck in your business right now: attention, lead capture, follow-up, closing, delivery, or reporting?

Pick one.`,
    x: `More software is not automatically progress.

What is the one bottleneck right now: attention, lead capture, follow-up, closing, delivery, or reporting?

Pick one.`,
  },
  {
    id: 10,
    time: "11:45 PM",
    type: "Text only",
    hook: "The 9:47 PM test",
    objective: "Collect after-hours response data",
    facebook: `A good lead calls your business at 9:47 PM. What do they get first: voicemail, silence, an instant text, or a real path to the next step?

No theory. What actually happens tonight?`,
    x: `A good lead calls your business at 9:47 PM.

What do they get first: voicemail, silence, an instant text, or a real path to the next step?

No theory. What actually happens tonight?`,
  },
];

const TYPE_TONE: Record<ContentItem["type"], string> = {
  "Long-form": "border-[var(--accent-line)] bg-[var(--accent-tint)] text-[var(--blue)]",
  "Image post": "border-[var(--green-line)] bg-[var(--green-tint)] text-[var(--green)]",
  "Article share": "border-[var(--line)] bg-[var(--fill-2)] text-[var(--violet)]",
  "Text only": "border-[var(--warn-line)] bg-[var(--warn-tint)] text-[var(--warn)]",
};

export default function ContentEngine() {
  const [selectedId, setSelectedId] = useState(1);
  const [platform, setPlatform] = useState<Platform>("facebook");
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const selected = ITEMS.find((item) => item.id === selectedId) || ITEMS[0];
  const copy = platform === "facebook" ? selected.facebook : selected.x;

  const totals = useMemo(() => ({
    planned: ITEMS.length,
    images: ITEMS.filter((item) => item.imageUrl).length,
    articles: ITEMS.filter((item) => item.type === "Article share").length,
    text: ITEMS.filter((item) => item.type === "Text only").length,
  }), []);

  async function copyPost() {
    try {
      await navigator.clipboard.writeText(copy);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
    window.setTimeout(() => setCopyStatus("idle"), 1800);
  }

  function toggleApproval() {
    setApproved((current) => {
      const next = new Set(current);
      if (next.has(selected.id)) next.delete(selected.id);
      else next.add(selected.id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--blue)]">Review queue</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-[var(--heading)] sm:text-4xl">Daily Content Engine</h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]"><CalendarDays className="h-4 w-4" aria-hidden="true" /> Monday, August 17, 2026 · Central Time</p>
        </div>
        <div className="rounded-xl border border-[var(--warn-line)] bg-[var(--warn-tint)] px-4 py-3 text-sm text-[var(--warn)]">
          <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p><span className="font-bold">Review state only.</span> Publishing still requires the connected Facebook Page or X account and action-time confirmation.</p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Planned", value: totals.planned, Icon: CalendarDays, tone: "text-[var(--blue)] bg-[var(--accent-tint)]" },
          { label: "New images", value: totals.images, Icon: ImageIcon, tone: "text-[var(--green)] bg-[var(--green-tint)]" },
          { label: "Article shares", value: totals.articles, Icon: FileText, tone: "text-[var(--violet)] bg-[var(--fill-2)]" },
          { label: "Text only", value: totals.text, Icon: MessageSquareText, tone: "text-[var(--warn)] bg-[var(--warn-tint)]" },
        ].map(({ label, value, Icon, tone }) => (
          <section key={label} className="rounded-2xl border border-[var(--line)] bg-white p-4"><div className="flex items-center gap-3"><span className={`rounded-xl p-2.5 ${tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-2xl font-black leading-none text-[var(--heading)]">{value}</p><p className="mt-1 text-xs font-semibold text-[var(--muted)]">{label}</p></div></div></section>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(390px,0.82fr)]">
        <section className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_32px_rgba(10,18,32,0.04)]">
          <div className="min-w-[560px]">
          <div className="grid grid-cols-[72px_120px_minmax(0,1fr)_90px] border-b border-[var(--line)] bg-[var(--fill-2)] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]"><span>Time</span><span>Type</span><span>Hook</span><span>Status</span></div>
          <ol className="divide-y divide-[var(--line)]">
            {ITEMS.map((item) => {
              const isSelected = item.id === selected.id;
              const isApproved = approved.has(item.id);
              return <li key={item.id}><button type="button" onClick={() => setSelectedId(item.id)} className={`grid w-full grid-cols-[72px_120px_minmax(0,1fr)_90px] items-center px-4 py-4 text-left transition ${isSelected ? "bg-[var(--accent-tint)] shadow-[inset_3px_0_0_var(--blue)]" : "hover:bg-[var(--fill-2)]"}`} aria-pressed={isSelected}><span className="text-xs font-bold text-[var(--muted)]">{item.time}</span><span><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${TYPE_TONE[item.type]}`}>{item.type}</span></span><span className="min-w-0 pr-4"><span className="block truncate text-sm font-bold text-[var(--heading)]">{item.hook}</span><span className="mt-1 block truncate text-xs text-[var(--muted)]">{item.objective}</span></span><span className={`inline-flex items-center gap-1 text-xs font-bold ${isApproved ? "text-[var(--green)]" : "text-[var(--quiet)]"}`}>{isApproved ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <span className="h-2 w-2 rounded-full bg-[var(--line-strong)]" />}{isApproved ? "Ready" : "Draft"}</span></button></li>;
            })}
          </ol>
          </div>
        </section>

        <aside className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[var(--blue)]">Post {selected.id} · {selected.time}</p><h3 className="mt-1 text-xl font-black text-[var(--heading)]">{selected.hook}</h3></div><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${TYPE_TONE[selected.type]}`}>{selected.type}</span></div>

          <div className="mt-5 inline-flex rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-1" aria-label="Platform preview">
            <button type="button" onClick={() => setPlatform("facebook")} className={`rounded-lg px-4 py-2 text-sm font-bold ${platform === "facebook" ? "bg-white text-[var(--blue)] shadow-sm" : "text-[var(--muted)]"}`}>Facebook</button>
            <button type="button" onClick={() => setPlatform("x")} className={`rounded-lg px-4 py-2 text-sm font-bold ${platform === "x" ? "bg-white text-[var(--heading)] shadow-sm" : "text-[var(--muted)]"}`}>X</button>
          </div>

          <div className="mt-5 max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-4 text-sm leading-6 text-[var(--text)]">{copy}</div>

          {selected.articleImage && <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)]"><NextImage src={selected.articleImage} alt={`${selected.hook} article cover`} width={1200} height={630} className="aspect-[1200/630] w-full object-cover" sizes="(min-width: 1280px) 42vw, 100vw" /></div>}
          {selected.imageUrl && <div className="mt-4 overflow-hidden rounded-xl border border-[var(--accent-line)] bg-[var(--accent-tint)]"><NextImage src={selected.imageUrl} alt={selected.imageTitle || "LeadFlow Pro social graphic"} width={1024} height={1024} className="aspect-square w-full object-cover" sizes="(min-width: 1280px) 42vw, 100vw" /><div className="flex items-center gap-3 border-t border-[var(--accent-line)] p-4"><span className="rounded-lg bg-white p-2 text-[var(--blue)]"><ImageIcon className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Original artwork</p><p className="mt-0.5 font-black text-[var(--heading)]">{selected.imageTitle}</p></div></div></div>}
          {selected.articleUrl && <a href={selected.articleUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--blue)] hover:underline"><Link2 className="h-4 w-4" aria-hidden="true" /> Open verified article</a>}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={copyPost} className="btn-ghost inline-flex items-center justify-center gap-2">{copyStatus === "copied" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Clipboard className="h-4 w-4" aria-hidden="true" />}{copyStatus === "copied" ? "Copied" : copyStatus === "error" ? "Copy failed" : `Copy ${platform === "facebook" ? "Facebook" : "X"}`}</button>
            <button type="button" onClick={toggleApproval} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${approved.has(selected.id) ? "border border-[var(--green-line)] bg-[var(--green-tint)] text-[var(--green)]" : "bg-[var(--blue)] text-white hover:bg-[var(--blue-strong)]"}`}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{approved.has(selected.id) ? "Marked ready" : "Mark ready"}</button>
          </div>
          <p className="mt-3 text-center text-[11px] text-[var(--quiet)]" aria-live="polite">{copyStatus === "error" ? "Clipboard access failed. Select the post text and copy it manually." : "Ready markers are temporary in this preview and reset when the page reloads."}</p>
        </aside>
      </div>
    </div>
  );
}
