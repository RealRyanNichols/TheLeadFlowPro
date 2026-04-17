import Link from "next/link";
import { Copy, ExternalLink, Eye, MousePointerClick, QrCode, Sparkles } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { FlowCardView } from "@/components/flowcard/FlowCardView";
import { MOCK_FLOWCARD } from "@/lib/mock-data";
import { qrSvgUrl } from "@/lib/qr";

export default function FlowCardSettings() {
  const hasSlug = !!MOCK_FLOWCARD.slug;
  const publicUrl = hasSlug
    ? `https://www.theleadflowpro.com/c/${MOCK_FLOWCARD.slug}`
    : "";

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <p className="text-cyan-400 text-sm font-semibold">Your FlowCard</p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">
          One link. <span className="funnel-text">Every social. Every contact.</span>
        </h1>
        <p className="mt-2 text-ink-300">
          Share your QR code or send the link instead of a business card.
          Visitors can follow all your socials in one tap.
        </p>
      </div>

      {/* stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Views"             value={MOCK_FLOWCARD.views.toLocaleString()}             sub={hasSlug ? "Past 30 days" : "Counts once your card goes live"} highlight />
        <StatCard label="QR scans"          value={MOCK_FLOWCARD.qrScans.toLocaleString()}           sub={hasSlug ? "Past 30 days" : "Counts once someone scans"} />
        <StatCard label="Follow-all clicks" value={MOCK_FLOWCARD.followAllClicks.toLocaleString()}   sub={hasSlug ? "Past 30 days" : "Counts the first time a visitor hits Follow All"} />
      </div>

      {/* Activation banner until the card has a slug */}
      {!hasSlug && (
        <div className="glass rounded-2xl p-6 border border-cyan-400/20">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-accent-500 flex items-center justify-center text-white shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white">Activate your FlowCard</h2>
              <p className="mt-1 text-sm text-ink-200">
                Pick a handle, drop in your socials and contact info, and you'll
                have a shareable link + QR code in about a minute.
              </p>
              <p className="mt-3 text-xs text-ink-400">
                Fill the form below, then hit <span className="text-white font-semibold">Save changes</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* left: settings */}
        <div className="lg:col-span-2 space-y-6">
          {hasSlug && (
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white">Public link</h2>
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <code className="flex-1 px-3 py-2 rounded-lg bg-ink-950 border border-white/10 text-sm text-cyan-300 break-all">
                  {publicUrl}
                </code>
                <button className="btn-ghost text-sm py-2 px-3">
                  <Copy className="h-4 w-4" /> Copy
                </button>
                <Link href={`/c/${MOCK_FLOWCARD.slug}`} target="_blank" className="btn-primary text-sm py-2 px-3">
                  <ExternalLink className="h-4 w-4" /> Open
                </Link>
              </div>
              <div className="mt-6 flex items-start gap-4">
                <img src={qrSvgUrl(publicUrl, 220)} alt="QR" className="h-32 w-32 rounded-xl" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white flex items-center gap-1">
                    <QrCode className="h-4 w-4 text-cyan-400" /> Print this QR anywhere
                  </p>
                  <p className="text-sm text-ink-300 mt-1">
                    Stick it on your business card, your truck, your shop window, your
                    phone case. Anyone with a camera can scan and land on your FlowCard
                    in two seconds — then follow you everywhere in one tap.
                  </p>
                  <button className="btn-ghost text-xs py-2 px-3 mt-3">
                    Download PNG
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white">Edit your card</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Handle" placeholder="yourname — used in your public URL" defaultValue={MOCK_FLOWCARD.slug} />
              <Field label="Display name" placeholder="Your name" defaultValue={MOCK_FLOWCARD.displayName} />
              <Field label="Tagline" placeholder="What you do, in one line" defaultValue={MOCK_FLOWCARD.tagline} />
              <Field label="Phone"   placeholder="Optional" defaultValue={MOCK_FLOWCARD.phone} />
              <Field label="Email"   placeholder="Optional" defaultValue={MOCK_FLOWCARD.email} />
              <Field label="Website" placeholder="https://..." defaultValue={MOCK_FLOWCARD.websiteUrl} className="sm:col-span-2" />
              <Field label="Bio" placeholder="A sentence or two — what you help people with" defaultValue={MOCK_FLOWCARD.bio} textarea className="sm:col-span-2" />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-white mb-2">Social links</h3>
              {MOCK_FLOWCARD.links.length > 0 ? (
                <ul className="space-y-2">
                  {MOCK_FLOWCARD.links.map((l) => (
                    <li key={l.platform} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className="text-xs uppercase tracking-wider text-ink-400 w-20">{l.platform}</span>
                      <input
                        defaultValue={l.url}
                        className="flex-1 bg-ink-950 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:border-cyan-500/50 focus:outline-none"
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-ink-400">
                  No social links yet. Click below to add your first.
                </p>
              )}
              <button className="text-cyan-400 text-sm mt-3 hover:underline">
                + Add another link
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-ghost text-sm py-2 px-4">Discard</button>
              <button className="btn-primary text-sm py-2 px-4">Save changes</button>
            </div>
          </div>
        </div>

        {/* right: live preview */}
        <div className="lg:col-span-1">
          <div className="glass rounded-2xl p-4 sticky top-6">
            <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold mb-3 flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> Live preview
            </p>
            {hasSlug ? (
              <FlowCardView card={MOCK_FLOWCARD} publicUrl={publicUrl} showQR={false} />
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
                <p className="text-xs text-ink-300">
                  Your FlowCard will appear here once you save a handle.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, defaultValue, placeholder, textarea, className,
}: { label: string; defaultValue?: string | null; placeholder?: string; textarea?: boolean; className?: string }) {
  return (
    <label className={className}>
      <span className="text-xs uppercase tracking-wider text-ink-400 font-semibold">{label}</span>
      {textarea ? (
        <textarea
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          rows={3}
          className="mt-1 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none resize-none"
        />
      ) : (
        <input
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          className="mt-1 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none"
        />
      )}
    </label>
  );
}
