import Link from "next/link";
import { ArrowLeft, PhoneOff, MessageSquare, Wand2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { SoonButton } from "@/components/ui/SoonButton";

const DEFAULT_MESSAGE = `Hey {{first_name}}, sorry we missed your call! This is {{business}}. We saw you reached out — what can we help with? (Quickest answers via text right here 👋)`;

export default function MissedCallSettings() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <Link href="/dashboard/leads" className="text-xs text-ink-300 hover:text-white inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Back to inbox
        </Link>
        <p className="text-cyan-400 text-sm font-semibold mt-3">Missed-Call Auto Text-Back</p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">
          Never let a missed call <span className="funnel-text">go cold</span>
        </h1>
        <p className="mt-2 text-ink-300">
          When the phone rings and you can't answer, we fire a text within 5 seconds.
          Keeps the lead warm; you reply when you can.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Missed calls (30d)" value="24" />
        <StatCard label="Auto-replies sent"   value="24" highlight />
        <StatCard label="Leads recovered"     value="12" delta={48.0} />
      </div>

      <div className="glass rounded-2xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PhoneOff className="h-5 w-5 text-cyan-400" />
            Connected number
          </h2>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <input
              defaultValue="+1 (903) 230-6440"
              className="bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none"
            />
            <span className="stat-pill bg-lead-500/15 text-lead-400 border border-lead-500/30 text-xs">
              Verified
            </span>
            <SoonButton size="xs">Change number</SoonButton>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-cyan-400" />
            Auto-reply message
          </h2>
          <p className="text-sm text-ink-300 mt-1">
            Use <code className="text-cyan-300">{`{{first_name}}`}</code> and{" "}
            <code className="text-cyan-300">{`{{business}}`}</code> to personalize.
          </p>
          <textarea
            defaultValue={DEFAULT_MESSAGE}
            rows={4}
            className="mt-3 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none resize-none"
          />
          <SoonButton size="xs" className="mt-2 inline-flex">
            <Wand2 className="h-3.5 w-3.5" /> Rewrite with AI
          </SoonButton>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">Send a follow-up GIF or video?</h2>
          <p className="text-sm text-ink-300 mt-1">
            If they don't reply within 4 hours, send something from your library to nudge
            the conversation back open.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm cursor-pointer">
              <input type="checkbox" defaultChecked /> Send "We want you here!" GIF after 4h
            </label>
            <Link href="/dashboard/media" className="text-xs text-cyan-400 hover:underline self-center">
              Browse library →
            </Link>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
          <SoonButton variant="ghost">Cancel</SoonButton>
          <SoonButton variant="primary">Save settings</SoonButton>
        </div>
      </div>
    </div>
  );
}
