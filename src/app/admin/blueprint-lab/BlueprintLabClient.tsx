"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ClipboardCheck,
  Copy,
  FileText,
  FolderKanban,
  ListChecks,
  Network,
  Sparkles,
  Target,
} from "lucide-react";

type DraftValues = {
  clientName: string;
  businessName: string;
  platformTarget: string;
  leak: string;
  dreamTool: string;
  buildGoal: string;
  measurableEndState: string;
  constraints: string;
  currentTools: string;
  transcriptSource: string;
  firstBuild: string;
  handoffAccount: string;
};

const INITIAL: DraftValues = {
  clientName: "",
  businessName: "",
  platformTarget: "Client-owned website or Vercel/GitHub/Supabase stack",
  leak: "",
  dreamTool: "",
  buildGoal: "Build the first useful client-owned tool that fixes the leak and proves the idea.",
  measurableEndState: "Client can open the asset, test the core flow, and see where leads, actions, or outputs are stored.",
  constraints:
    "Keep the first version small, protect secrets, avoid vendor lock-in, use client-owned accounts, and do not imply guaranteed sales.",
  currentTools: "",
  transcriptSource: "Call notes, Zoom/Meet recordings, email threads, form submissions, Drive files",
  firstBuild: "",
  handoffAccount: "Client owns code, assets, data, API keys, deployment, and admin access",
};

function clean(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed || fallback;
}

function slug(value: string) {
  return clean(value, "client")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function BlueprintLabClient() {
  const [values, setValues] = useState<DraftValues>(INITIAL);
  const [copied, setCopied] = useState<string | null>(null);

  function setValue<K extends keyof DraftValues>(key: K, value: DraftValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setCopied(null);
  }

  const outputs = useMemo(() => {
    const client = clean(values.clientName, "Client");
    const business = clean(values.businessName, "Business");
    const clientSlug = slug(values.businessName || values.clientName);
    const leak = clean(values.leak, "The lead leak, repeated manual task, or blind spot is not written yet.");
    const dreamTool = clean(values.dreamTool, "The dream tool is not written yet.");
    const firstBuild = clean(values.firstBuild, "First useful version still needs to be chosen.");
    const buildGoal = clean(values.buildGoal, INITIAL.buildGoal);
    const measurableEndState = clean(values.measurableEndState, INITIAL.measurableEndState);
    const constraints = clean(values.constraints, INITIAL.constraints);
    const platform = clean(values.platformTarget, INITIAL.platformTarget);
    const tools = clean(values.currentTools, "Current tools not listed yet.");
    const transcripts = clean(values.transcriptSource, INITIAL.transcriptSource);
    const handoff = clean(values.handoffAccount, INITIAL.handoffAccount);

    const blueprint = `# ${business} - Stump Ryan Build Blueprint

Prepared for: ${client}

## 1. What is leaking
${leak}

## 2. The dream tool
${dreamTool}

## 3. First useful version
${firstBuild}

## 4. Goal-mode build brief
Primary goal:
${buildGoal}

Measurable end state:
${measurableEndState}

Constraints:
${constraints}

## 5. Where it should live
${platform}

## 6. Current stack and inputs
${tools}

## 7. Memory loop
Raw input sources: ${transcripts}

Structured output required:
- Summary of what was discussed
- Every decision that was made
- Action items with owner and deadline
- Client-specific notes filed under ${business}
- Open blockers Ryan or the client must see next

## 8. Ownership and handoff
${handoff}

## 9. $250 continuation
If the client likes this blueprint, the $250 continuation starts the first build block. It is credited toward the scoped build and does not create hostage hosting.`;

    const goalRunSheet = `# ${business} Goal Mode Run Sheet

## Primary objective
${buildGoal}

## Context
- Client: ${client}
- Business: ${business}
- Lead leak: ${leak}
- Dream tool: ${dreamTool}
- First useful version: ${firstBuild}

## Measurable end state
${measurableEndState}

## Constraints
${constraints}

## Working command
/goal ${buildGoal} until ${measurableEndState} without violating these constraints: ${constraints}

## Running checklist
- [ ] Confirm the single primary goal
- [ ] Confirm the measurable done state
- [ ] Confirm the client-owned account path
- [ ] Build the smallest useful version
- [ ] Verify the main user flow
- [ ] Document limits, handoff, and next build block

## Ryan operating rule
One active build goal at a time. Keep a running checklist, write decisions down, and return the finished product or the exact blocker.`;

    const agentMemory = `# ${business} AI Employee Memory

## Home
This file is the central memory for ${business}. Load this first before work on this client.

## Client Roster
- Client: ${client}
- Business: ${business}
- Status: Blueprint requested
- Primary platform: ${platform}
- Owner: Client-owned account setup

## Business Memory
- What the business sells:
- Who buys:
- Main lead sources:
- Current tools: ${tools}
- Main leak: ${leak}

## Action Tracker
| Task | Owner | Due | Status | Notes |
| --- | --- | --- | --- | --- |
| Confirm first build scope | Ryan | TBD | Open | ${firstBuild} |
| Confirm client-owned account path | Client/Ryan | TBD | Open | ${platform} |
| Gather transcript/input sources | Ryan | TBD | Open | ${transcripts} |

## Framework Library
- Lead leak diagnosis
- First useful version plan
- Client-owned handoff checklist
- Weekly status review

## Templates Folder
- Blueprint proposal
- Daily brief
- Client status report
- Decision log
- Action recap email`;

    const repoPrompt = `# AGENTS.md - ${business}

You are building a client-owned LeadFlow Pro asset for ${business}.

## Mission
Build the first useful version of: ${dreamTool}

## Business Problem
${leak}

## First Build
${firstBuild}

## Platform Target
${platform}

## Current Tools
${tools}

## Rules
- Goal: ${buildGoal}
- Done means: ${measurableEndState}
- Constraints: ${constraints}
- The client owns code, assets, data, accounts, keys, and deployment access.
- Do not put secrets in the repo.
- Do not create vendor lock-in unless the client explicitly chooses managed hosting.
- Keep the first version small enough to ship and useful enough to prove the idea.
- Every screen must answer: what does the owner or customer do next?
- Preserve a handoff checklist before delivery.

## Memory Loop
Turn every call transcript, email thread, and client note into:
- summary
- decisions
- action items with owner and deadline
- blockers
- files or links needed next`;

    const handoffChecklist = `# ${business} Client-Owned Handoff Checklist

## Accounts
- [ ] Client has GitHub/repo access
- [ ] Client has deployment account access
- [ ] Client has domain/DNS access
- [ ] Client has database/storage access
- [ ] Client has analytics/pixel access
- [ ] Client has email/SMS provider access if used

## Secrets
- [ ] No secrets in repo
- [ ] Client owns API keys
- [ ] Environment variables documented
- [ ] Test keys separated from live keys

## Delivery
- [ ] What was built is documented
- [ ] Where it lives is documented
- [ ] How to use it is documented
- [ ] Known limits are documented
- [ ] Next phase is documented
- [ ] Ryan access removed or converted to agreed support access`;

    return { blueprint, goalRunSheet, agentMemory, repoPrompt, handoffChecklist, clientSlug };
  }, [values]);

  async function copy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-[linear-gradient(135deg,#020617_0%,#082f49_45%,#431407_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-100 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Admin
          </Link>
          <div className="mt-5 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" /> Ryan-side build brain
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                Blueprint Lab for client-owned AI employee builds.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                Turn a Stump Ryan request into a blueprint, memory file, repo prompt, and handoff
                checklist. This is internal scaffolding for Ryan, not a public visitor tool.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Principle Icon={FolderKanban} title="Knowledge base" body="Client memory, roster, tasks, frameworks, templates." />
              <Principle Icon={Network} title="Memory loop" body="Transcripts become summaries, decisions, and actions." />
              <Principle Icon={Target} title="Goal mode" body="One objective, measurable done state, clear constraints." />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[0.82fr_1.18fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
          <h2 className="text-xl font-semibold tracking-tight">Client context</h2>
          <p className="mt-1 text-sm text-slate-400">
            Paste the rough intake. The outputs stay in your browser until you copy them.
          </p>
          <div className="mt-5 grid gap-4">
            <Field label="Client name" value={values.clientName} onChange={(value) => setValue("clientName", value)} placeholder="Owner or contact" />
            <Field label="Business name" value={values.businessName} onChange={(value) => setValue("businessName", value)} placeholder="Business / brand" />
            <Area label="Lead leak or bottleneck" value={values.leak} onChange={(value) => setValue("leak", value)} placeholder="What keeps breaking, leaking, or getting forgotten?" />
            <Area label="Dream tool" value={values.dreamTool} onChange={(value) => setValue("dreamTool", value)} placeholder="What tool, dashboard, app, portal, automation, or AI employee should exist?" />
            <Area label="First useful version" value={values.firstBuild} onChange={(value) => setValue("firstBuild", value)} placeholder="What should Ryan build first so the client sees value quickly?" />
            <Area label="Goal-mode objective" value={values.buildGoal} onChange={(value) => setValue("buildGoal", value)} placeholder="The one clear objective the build should finish." />
            <Area label="Measurable end state" value={values.measurableEndState} onChange={(value) => setValue("measurableEndState", value)} placeholder="What done looks like in a way Ryan can verify." />
            <Area label="Constraints" value={values.constraints} onChange={(value) => setValue("constraints", value)} placeholder="Scope limits, ownership rules, privacy rules, no paid tools, timing..." />
            <Field label="Platform target" value={values.platformTarget} onChange={(value) => setValue("platformTarget", value)} placeholder="Shopify, Wix, WordPress, Vercel/GitHub/Supabase..." />
            <Area label="Current tools" value={values.currentTools} onChange={(value) => setValue("currentTools", value)} placeholder="CRM, calendar, phone, forms, docs, email, social accounts..." />
            <Area label="Transcript / memory sources" value={values.transcriptSource} onChange={(value) => setValue("transcriptSource", value)} placeholder="Zoom, Google Meet, Fathom, Otter, Drive, email threads..." />
            <Area label="Ownership handoff rule" value={values.handoffAccount} onChange={(value) => setValue("handoffAccount", value)} placeholder="Who owns the repo, domain, keys, deployment, database..." />
          </div>
        </section>

        <section className="grid gap-4">
          <OutputCard
            icon={FileText}
            title="1-3 page blueprint draft"
            filename={`${outputs.clientSlug}-build-blueprint.md`}
            value={outputs.blueprint}
            copied={copied}
            onCopy={copy}
          />
          <OutputCard
            icon={Target}
            title="Goal-mode run sheet"
            filename={`${outputs.clientSlug}-goal-mode.md`}
            value={outputs.goalRunSheet}
            copied={copied}
            onCopy={copy}
          />
          <OutputCard
            icon={Network}
            title="AI employee memory file"
            filename={`${outputs.clientSlug}-ai-memory.md`}
            value={outputs.agentMemory}
            copied={copied}
            onCopy={copy}
          />
          <OutputCard
            icon={ClipboardCheck}
            title="Repo prompt / AGENTS.md seed"
            filename={`${outputs.clientSlug}-agents.md`}
            value={outputs.repoPrompt}
            copied={copied}
            onCopy={copy}
          />
          <OutputCard
            icon={ListChecks}
            title="Client-owned handoff checklist"
            filename={`${outputs.clientSlug}-handoff.md`}
            value={outputs.handoffChecklist}
            copied={copied}
            onCopy={copy}
          />
        </section>
      </main>
    </div>
  );
}

function Principle({
  Icon,
  title,
  body,
}: {
  Icon: typeof FolderKanban;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
      <Icon className="h-5 w-5 text-cyan-200" />
      <div className="mt-3 text-sm font-semibold text-white">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-slate-300">{body}</p>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-200">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-12 w-full rounded-xl border border-white/10 bg-white px-3 text-sm text-slate-950 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
      />
    </label>
  );
}

function Area({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-200">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl border border-white/10 bg-white px-3 py-3 text-sm text-slate-950 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
      />
    </label>
  );
}

function OutputCard({
  icon: Icon,
  title,
  filename,
  value,
  copied,
  onCopy,
}: {
  icon: typeof FileText;
  title: string;
  filename: string;
  value: string;
  copied: string | null;
  onCopy: (label: string, value: string) => Promise<void>;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05]">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Icon className="h-4 w-4 text-cyan-200" />
            {title}
          </div>
          <div className="mt-1 font-mono text-xs text-slate-400">{filename}</div>
        </div>
        <button
          type="button"
          onClick={() => onCopy(title, value)}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
        >
          <Copy className="h-4 w-4" />
          {copied === title ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap p-4 text-xs leading-relaxed text-slate-200">
        {value}
      </pre>
    </article>
  );
}
