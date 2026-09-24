"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, CalendarDays, Lightbulb, PenLine, Settings2 } from "lucide-react";
import IdeaMachine from "@/components/postCreator/IdeaMachine";
import PlanMonth from "@/components/postCreator/PlanMonth";
import SavedList from "@/components/postCreator/SavedList";
import ShuffleProvider from "@/components/postCreator/ShuffleProvider";
import { inputFromProfile } from "@/lib/postCreator/ideas/engine";
import type { IdeaCard } from "@/lib/postCreator/ideas/types";
import { POST_CREATOR } from "@/lib/postCreator/product";
import type { Allowance, BrandProfile, SessionView } from "@/lib/postCreator/types";
import AccountPanel, { BillingButton } from "./AccountPanel";
import { fetchSession, forgetKeyInUrl } from "./api";
import { APP_COPY, appClaimNote, graceLine, lowLine, writeBlockedLabel, type ClaimCode } from "./copy";
import ProfileForm from "./ProfileForm";
import UsageMeter from "./UsageMeter";
import WritePanel, { WriteAction } from "./WritePanel";

// The buyer app: the idea machine filled in from the saved profile, with a
// "Write it in my voice" button on every card; the month planner; what is
// saved on this device; and Settings (the profile and the plan).
//
// The first render is the server's session (app/post-creator/app/page.tsx).
// After that the app changes only on the buyer's own actions: a profile save
// returns the saved profile, a write returns the fresh allowance, and when an
// answer is missing either one the session is read again. An answer that says
// the device is signed out or the plan lapsed hands back to the server page,
// which shows the locked screen and why.

type Tab = "ideas" | "plan" | "saved" | "settings";

const COPY = APP_COPY.app;

const TABS: readonly { id: Tab; icon: typeof Lightbulb }[] = [
  { id: "ideas", icon: Lightbulb },
  { id: "plan", icon: CalendarDays },
  { id: "saved", icon: Bookmark },
  { id: "settings", icon: Settings2 },
];

const BANNER = "rounded-xl border px-4 py-3 text-[15px] leading-relaxed text-[var(--heading)]";

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export default function PostCreatorApp({ initial, welcome, claim }: { initial: SessionView; welcome: boolean; claim: ClaimCode | null }) {
  const router = useRouter();
  const baseId = useId();
  const [session, setSession] = useState<SessionView>(initial);
  const [tab, setTab] = useState<Tab>("ideas");
  const [writeCard, setWriteCard] = useState<IdeaCard | null>(null);
  const [writing, setWriting] = useState(false);
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const tabListRef = useRef<HTMLDivElement>(null);
  const writeAreaRef = useRef<HTMLDivElement>(null);

  const tabId = (t: Tab) => `${baseId}-tab-${t}`;
  const panelId = (t: Tab) => `${baseId}-panel-${t}`;

  const input = useMemo(() => inputFromProfile(session.profile), [session.profile]);
  const blocked = writeBlockedLabel({ aiOn: session.ai.on, profileReady: session.profileReady, allowance: session.allowance });
  const claimNote = appClaimNote(claim);
  const low = lowLine(session.allowance);
  const account = session.account;
  const graceEndsOn = account.status === "past_due" ? account.graceEndsOn : null;

  // A receipt link opened on a device that is already signed in still carries the key.
  useEffect(() => {
    forgetKeyInUrl();
  }, []);

  // The server page decides what a signed-out or lapsed device sees.
  const sessionLost = useCallback(() => router.refresh(), [router]);

  const refresh = useCallback(async () => {
    const r = await fetchSession();
    if (r.ok) {
      if (!r.data.entitled) router.refresh();
      else setSession(r.data);
      return;
    }
    if (r.status === 401 || r.status === 402) router.refresh();
  }, [router]);

  const setAllowance = useCallback((allowance: Allowance) => setSession((s) => ({ ...s, allowance })), []);

  const onProfileSaved = useCallback(
    (profile: BrandProfile, ready: boolean) => setSession((s) => ({ ...s, profile, profileReady: ready })),
    [],
  );

  function select(next: Tab, focus = false) {
    setTab(next);
    if (focus) tabRefs.current[next]?.focus();
  }

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    select(TABS[next].id, true);
  }

  function openSettings() {
    select("settings", true);
    tabListRef.current?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  const openWriter = useCallback(
    (card: IdeaCard) => {
      if (writeCard && writeCard.key === card.key) {
        // Same idea again: bring the open panel back into view.
        const area = writeAreaRef.current;
        area?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
        area?.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
        return;
      }
      setWriteCard(card);
    },
    [writeCard],
  );

  const cardActions = useCallback(
    (card: IdeaCard) => <WriteAction allowance={session.allowance} blocked={blocked} busy={writing} onWrite={() => openWriter(card)} />,
    [session.allowance, blocked, writing, openWriter],
  );

  return (
    <main className="cb-page pb-16">
      <ShuffleProvider mode="paid" initialInput={input}>
        <div className="mx-auto w-full max-w-2xl px-4 pt-6 sm:pt-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link href={POST_CREATOR.path} className="inline-flex min-h-[44px] items-center gap-2 text-[18px] font-black text-[var(--heading)]">
              <PenLine aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
              {POST_CREATOR.name}
            </Link>
            <span className="max-w-full text-[14px] font-bold text-[var(--muted)] [overflow-wrap:anywhere]">
              {session.profile.businessName || account.email}
            </span>
          </div>

          <h1 className="mt-3 text-[28px] font-black leading-tight tracking-[-0.02em] text-[var(--heading)] sm:text-[34px]">{COPY.title}</h1>

          <div className="mt-4 space-y-3">
            {claimNote ? (
              <p role="status" className={`${BANNER} border-[var(--warn-line)] bg-[var(--warn-tint)]`}>
                {claimNote}
              </p>
            ) : null}
            {welcome ? (
              <p role="status" className={`${BANNER} border-[var(--green-line)] bg-[var(--green-tint)] font-bold`}>
                {COPY.welcome}
              </p>
            ) : null}
            {!session.ai.on ? <p className={`${BANNER} border-[var(--line-strong)] bg-[var(--fill-2)]`}>{COPY.aiOff}</p> : null}
            {!session.profileReady ? (
              <div className={`${BANNER} border-[var(--accent-line)] bg-[var(--accent-tint)]`}>
                <p>{COPY.profileNeeded}</p>
                <button type="button" className="button-primary mt-3 w-full sm:w-auto" onClick={openSettings}>
                  <Settings2 aria-hidden="true" className="h-4 w-4" />
                  {COPY.openSettings}
                </button>
              </div>
            ) : null}
            {graceEndsOn ? (
              <div className={`${BANNER} border-[var(--danger-line)] bg-[var(--danger-tint)]`}>
                <p className="font-bold">{graceLine(graceEndsOn)}</p>
                {account.canManageBilling ? (
                  <div className="mt-3">
                    <BillingButton className="button-primary" />
                  </div>
                ) : null}
              </div>
            ) : null}
            {low ? <p className={`${BANNER} border-[var(--warn-line)] bg-[var(--warn-tint)] font-bold`}>{low}</p> : null}
            <UsageMeter allowance={session.allowance} />
          </div>

          <div
            ref={tabListRef}
            role="tablist"
            aria-label={COPY.tabsLabel}
            className="mt-6 grid scroll-mt-4 grid-cols-4 gap-1 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-1"
          >
            {TABS.map((t, i) => {
              const Icon = t.icon;
              const selected = tab === t.id;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={tabId(t.id)}
                  aria-selected={selected}
                  aria-controls={panelId(t.id)}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(t.id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className="inline-flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[13px] font-extrabold text-[var(--muted)] hover:text-[var(--heading)] aria-selected:bg-[var(--blue)] aria-selected:text-[var(--on-accent)] sm:flex-row sm:gap-2 sm:text-[15px]"
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {COPY.tabs[t.id]}
                </button>
              );
            })}
          </div>

          <div role="tabpanel" id={panelId("ideas")} aria-labelledby={tabId("ideas")} hidden={tab !== "ideas"} className="mt-5 space-y-5">
            <IdeaMachine cardActions={cardActions} />
            {writeCard ? (
              <div ref={writeAreaRef} className="scroll-mt-4">
                <WritePanel
                  card={writeCard}
                  allowance={session.allowance}
                  blocked={blocked}
                  onAllowance={setAllowance}
                  onRefresh={() => void refresh()}
                  onSessionLost={sessionLost}
                  onBusyChange={setWriting}
                />
              </div>
            ) : null}
          </div>

          <div role="tabpanel" id={panelId("plan")} aria-labelledby={tabId("plan")} hidden={tab !== "plan"} className="mt-5">
            <PlanMonth />
          </div>

          <div role="tabpanel" id={panelId("saved")} aria-labelledby={tabId("saved")} hidden={tab !== "saved"} className="mt-5">
            <SavedList title={COPY.savedTitle} />
          </div>

          <div role="tabpanel" id={panelId("settings")} aria-labelledby={tabId("settings")} hidden={tab !== "settings"} className="mt-5 space-y-5">
            <ProfileForm profile={session.profile} onSaved={onProfileSaved} />
            <AccountPanel account={account} />
          </div>
        </div>
      </ShuffleProvider>
    </main>
  );
}
