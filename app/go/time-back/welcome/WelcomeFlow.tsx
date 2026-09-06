"use client";

// Post-purchase intake for Time Back orders. Four steps on one page:
// business details, platform confirmation, official access grants (never a
// password), and voice + brand assets. Files go to the same private Supabase
// intake storage the free-build funnel uses; the details land on the lead
// through /api/timeback/onboarding.

import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleCheck,
  FileUp,
  KeyRound,
  Mic,
  Paperclip,
  ShieldCheck,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PLATFORMS } from "@/lib/timeback";

const MAX_FILES = 10;
const MAX_MB = 50;

type AccessKey = "meta" | "x" | "email";
type AccessState = "done" | "kickoff" | null;

// The official, revocable doors into each platform. Every step is something
// the owner clicks in their own account. We never see a password.
const ACCESS_GUIDES: {
  key: AccessKey;
  title: string;
  covers: string;
  steps: string[];
}[] = [
  {
    key: "meta",
    title: "Meta Business Manager partner access",
    covers: "Covers Facebook and Instagram",
    steps: [
      "Open business.facebook.com and sign in like normal.",
      'Go to Settings, then Partners, then Add. Choose "Give a partner access to your assets".',
      "Enter the partner ID we send you from hello@theleadflowpro.com right after this form.",
      "Pick your Facebook Page and Instagram account, and grant the content tasks you are comfortable with.",
      "That is it. The access is task-level, it is yours, and you can remove us in one click any time.",
    ],
  },
  {
    key: "x",
    title: "X delegate access",
    covers: "Covers X (Twitter)",
    steps: [
      'Open x.com, go to Settings, then "Delegate".',
      'Choose "Members you\'ve invited", then invite the account we send you in the same email.',
      "Give the Contributor role. That lets us draft and schedule posts, nothing else.",
      "You stay the owner. Remove the delegate whenever you want.",
    ],
  },
  {
    key: "email",
    title: "Email platform team seat",
    covers: "Only if your order includes an email series",
    steps: [
      "Open your email platform (Mailchimp, Klaviyo, Constant Contact, whichever you use).",
      "Find Team, Users, or Manage users in its settings.",
      "Invite hello@theleadflowpro.com with a role that can create and edit campaigns.",
      "We build your series inside YOUR account, so every subscriber and email stays yours.",
      "No email platform yet? Skip this. We will set one up together on the kickoff.",
    ],
  },
];

function cardCls(selected: boolean) {
  return `relative rounded-xl border p-4 text-left transition-colors cursor-pointer ${
    selected
      ? "tb-card-on"
      : "border-[#dbd0c5] bg-[#fff9ef] hover:border-[#5135e5]"
  }`;
}

function CheckMark({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border ${
        on
          ? "border-[#5135e5] bg-[#5135e5] text-white"
          : "border-[#dbd0c5] bg-transparent"
      }`}
    >
      {on ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
    </span>
  );
}

function StepTag({ n, label }: { n: string; label: string }) {
  return (
    <p className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffb443] text-sm font-extrabold text-[#20212b] shadow-[0_4px_12px_#43364c14]">
        {n}
      </span>
      <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--cb-cyan)]">
        {label}
      </span>
    </p>
  );
}

export default function WelcomeFlow() {
  const [platforms, setPlatforms] = useState<string[]>([
    "facebook",
    "instagram",
  ]);
  const [access, setAccess] = useState<Record<AccessKey, AccessState>>({
    meta: null,
    x: null,
    email: null,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inputCls =
    "w-full rounded-xl border border-[#dbd0c5] bg-[#fff9ef] px-4 py-3 text-[15px] text-[#34313f] placeholder:text-[#625f6d] outline-none focus:border-[var(--cb-blue-soft)]";
  const panelCls =
    "tb-panel-glass rounded-[26px] border border-[#dbd0c5] bg-[#fff9ef] p-6 sm:p-8";

  function togglePlatform(id: string) {
    setPlatforms((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  // Push to talk, same pattern as the free-build funnel: record in the
  // browser, attach like any other upload, cap at 3 minutes.
  async function toggleRecording() {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Voice recording is not supported on this browser. Upload a voice memo file instead.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecording(false);
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        if (blob.size) {
          const ext = (mr.mimeType || "audio/webm").includes("mp4")
            ? "m4a"
            : "webm";
          const memo = new File(
            [blob],
            `voice-sample-${Date.now().toString(36)}.${ext}`,
            {
              type: blob.type,
            },
          );
          setFiles((prev) =>
            prev.length >= MAX_FILES ? prev : [...prev, memo],
          );
        }
      };
      recRef.current = mr;
      mr.start();
      setRecSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        setRecSeconds((s) => {
          if (s + 1 >= 180) recRef.current?.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError(
        "Could not reach your microphone. You can upload a voice memo file instead.",
      );
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_FILES) break;
      if (f.size > MAX_MB * 1024 * 1024) continue;
      next.push(f);
    }
    setFiles(next);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();

    // 1) Files first, straight to private storage from the browser.
    const uploaded: string[] = [];
    if (files.length) {
      setProgress(`Uploading your files (0 of ${files.length})...`);
      const supabase = createClient();
      const stamp = Date.now().toString(36);
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
        const path = `timeback/${stamp}-${Math.random().toString(36).slice(2, 8)}/${safe}`;
        const { error: upErr } = await supabase.storage
          .from("intake")
          .upload(path, f);
        if (!upErr) uploaded.push(path);
        setProgress(`Uploading your files (${i + 1} of ${files.length})...`);
      }
      setProgress(null);
    }

    // 2) Everything else onto the order's lead.
    const params = new URLSearchParams(window.location.search);
    const handles: Record<string, string> = {};
    for (const p of PLATFORMS) {
      const v = String(form.get(`handle_${p.id}`) ?? "").trim();
      if (v && platforms.includes(p.id)) handles[p.id] = v.slice(0, 200);
    }

    let res: Response;
    try {
      res = await fetch("/api/timeback/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripe_session_id: params.get("session_id"),
          email,
          full_name: form.get("full_name"),
          business_name: form.get("business_name"),
          phone: String(form.get("phone") ?? "").trim() || null,
          website_url: String(form.get("website_url") ?? "").trim() || null,
          platforms,
          handles,
          email_platform:
            String(form.get("email_platform") ?? "").trim() || null,
          access,
          voice_notes: String(form.get("voice_notes") ?? "").trim() || null,
          notes: String(form.get("notes") ?? "").trim() || null,
          uploads: uploaded,
        }),
      });
    } catch {
      setError(
        "Could not reach the intake. Check the connection and try again.",
      );
      setSending(false);
      return;
    }
    if (!res.ok) {
      setError(
        (await res.json().catch(() => ({}) as { error?: string })).error ??
          "That did not go through. Try again, or reply to your receipt email with these details.",
      );
      setSending(false);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <section className="px-4 pt-16">
        <div
          className={`${panelCls} tb-grad-border tb-price-hero mx-auto w-full max-w-[720px] text-center`}
        >
          <CircleCheck
            className="mx-auto h-12 w-12 text-[#23643c]"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-3xl font-extrabold text-[#20212b] sm:text-4xl">
            That is everything we need.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-[#625f6d]">
            Watch your inbox for the access invites from
            hello@theleadflowpro.com. Once you approve them, your posts go live
            within 5 business days. Questions any time: reply to any email from
            us, or call or text (903) 500-8898.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[860px] gap-5 px-4">
      <section className="pt-12 text-center sm:pt-16">
        <p className="inline-flex items-center gap-2 rounded-lg bg-[#e5eee3] px-4 py-2 text-sm font-bold text-[#23643c]">
          <CircleCheck className="h-4 w-4" aria-hidden="true" />
          Payment received. Your build slot is locked.
        </p>
        <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight text-[#20212b] sm:text-5xl">
          Welcome. Let&apos;s <span className="text-[#5135e5]">build.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-[#625f6d]">
          This page gets us everything we need to start writing in your voice.
          It takes about five minutes, and we never ask for a password at any
          point.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-5">
        {/* Step 1 — the business */}
        <section className={panelCls}>
          <StepTag n="1" label="Your business" />
          <h2 className="mt-4 text-2xl font-extrabold text-[#34313f]">
            Who are we writing for?
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input
              name="business_name"
              required
              placeholder="Business name"
              className={inputCls}
            />
            <input
              name="full_name"
              required
              placeholder="Your name"
              className={inputCls}
            />
            <input
              name="email"
              type="email"
              required
              placeholder="Email you used at checkout"
              className={inputCls}
            />
            <input
              name="phone"
              type="tel"
              placeholder="Mobile number"
              className={inputCls}
            />
            <input
              name="website_url"
              placeholder="Website, if you have one"
              className={`${inputCls} sm:col-span-2`}
            />
          </div>
          <p className="mt-3 text-xs text-[#625f6d]">
            Use the same email as checkout so this lands on your order
            automatically.
          </p>
        </section>

        {/* Step 2 — the platforms */}
        <section className={panelCls}>
          <StepTag n="2" label="Your platforms" />
          <h2 className="mt-4 text-2xl font-extrabold text-[#34313f]">
            Confirm where we post.
          </h2>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {PLATFORMS.map((p) => {
              const on = platforms.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  className={`${cardCls(on)} px-3 py-3 pr-9 text-sm font-bold text-[#34313f]`}
                >
                  {p.label}
                  <CheckMark on={on} />
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid gap-3">
            {PLATFORMS.filter((p) => platforms.includes(p.id)).map((p) => (
              <input
                key={p.id}
                name={`handle_${p.id}`}
                placeholder={
                  p.id === "facebook"
                    ? "Facebook Page link or name"
                    : p.id === "instagram"
                      ? "Instagram handle"
                      : "X handle"
                }
                className={inputCls}
              />
            ))}
            <input
              name="email_platform"
              placeholder="Email platform, if any (Mailchimp, Klaviyo, none yet...)"
              className={inputCls}
            />
          </div>
        </section>

        {/* Step 3 — access, the official way */}
        <section className={panelCls}>
          <StepTag n="3" label="Grant access, no passwords" />
          <h2 className="mt-4 text-2xl font-extrabold text-[#34313f]">
            Open the doors the official way.
          </h2>
          <p className="mt-2 flex max-w-2xl items-start gap-2 text-sm text-[#625f6d]">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-[#23643c]"
              aria-hidden="true"
            />
            <span>
              Every platform has a built-in way to let an agency work in your
              account without ever seeing your password. That is the only way we
              work. Each one takes about two minutes, and you can revoke any of
              them in one click.
            </span>
          </p>
          <div className="mt-5 grid gap-4">
            {ACCESS_GUIDES.map((guide) => (
              <div
                key={guide.key}
                className="rounded-[20px] border border-[#dbd0c5] bg-[#fff9ef] p-5 shadow-[inset_0_1px_0_#ffffff10]"
              >
                <p className="flex items-center gap-2 text-sm font-extrabold text-[#34313f]">
                  <KeyRound
                    className="h-4 w-4 text-[var(--cb-cyan)]"
                    aria-hidden="true"
                  />
                  {guide.title}
                </p>
                <p className="mt-0.5 text-xs font-bold text-[#625f6d]">
                  {guide.covers}
                </p>
                <ol className="mt-3 grid gap-2">
                  {guide.steps.map((step, i) => (
                    <li
                      key={step}
                      className="flex items-start gap-3 text-sm text-[#625f6d]"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ede6f3] text-[11px] font-extrabold text-[var(--cb-cyan)]">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAccess((cur) => ({
                        ...cur,
                        [guide.key]: cur[guide.key] === "done" ? null : "done",
                      }))
                    }
                    className={`${cardCls(access[guide.key] === "done")} px-3 py-3 pr-9 text-sm font-bold text-[#34313f]`}
                  >
                    Done, or I will do it when the invite lands
                    <CheckMark on={access[guide.key] === "done"} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAccess((cur) => ({
                        ...cur,
                        [guide.key]:
                          cur[guide.key] === "kickoff" ? null : "kickoff",
                      }))
                    }
                    className={`${cardCls(access[guide.key] === "kickoff")} px-3 py-3 pr-9 text-sm font-bold text-[#34313f]`}
                  >
                    Walk me through it on the kickoff call
                    <CheckMark on={access[guide.key] === "kickoff"} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Step 4 — the voice */}
        <section className={panelCls}>
          <StepTag n="4" label="Your voice" />
          <h2 className="mt-4 text-2xl font-extrabold text-[#34313f]">
            Give us your voice, so the posts sound like you.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[#625f6d]">
            Talk for a minute or two like you are telling a customer what you do
            and why you care. Ramble. That is the good stuff. Then add your
            logo, photos of real work, and anything with your branding on it.
          </p>
          <div className="mt-5 grid gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleRecording}
                className={`inline-flex min-h-[48px] items-center gap-2 rounded-xl px-5 text-sm font-extrabold transition ${
                  recording
                    ? "bg-[#b42318] text-white"
                    : "bg-[#ffb443] text-[#20212b] shadow-[0_6px_18px_#43364c1f] hover:bg-[#ffca76]"
                }`}
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                {recording
                  ? `Stop recording (${Math.floor(recSeconds / 60)}:${String(recSeconds % 60).padStart(2, "0")})`
                  : "Record a voice sample"}
              </button>
              <label className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl border border-[#dbd0c5] px-5 text-sm font-bold text-[#34313f]">
                <FileUp className="h-4 w-4" aria-hidden="true" />
                Upload files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                  accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.zip"
                />
              </label>
            </div>
            {files.length ? (
              <ul className="grid gap-1">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}${i}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-[#fff9ef] px-3 py-2 text-xs font-bold text-[#625f6d]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Paperclip
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">{f.name}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${f.name}`}
                      onClick={() =>
                        setFiles((cur) => cur.filter((_, j) => j !== i))
                      }
                      className="text-[#625f6d]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <textarea
              name="voice_notes"
              rows={3}
              placeholder="How do you want to sound? Phrases you always say, words you would never use, how you talk to customers..."
              className={inputCls}
            />
            <textarea
              name="notes"
              rows={2}
              placeholder="Anything else we should know? (optional)"
              className={inputCls}
            />
          </div>
        </section>

        {progress ? (
          <p className="text-sm font-bold text-[var(--cb-cyan)]">{progress}</p>
        ) : null}
        {error ? (
          <p className="text-sm font-bold text-[#b42318]">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={sending}
          className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-[#ffb443] px-6 text-base font-extrabold text-[#20212b] shadow-[0_8px_24px_#43364c1f] transition hover:bg-[#ffca76] disabled:opacity-60"
        >
          {sending
            ? "Sending to the build team..."
            : "Send it to the build team"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="pb-4 text-center text-xs text-[#625f6d]">
          Files land in private storage only our team can open. We never ask for
          a password, here or anywhere.
        </p>
      </form>
    </div>
  );
}
