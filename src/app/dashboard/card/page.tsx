import Link from "next/link";
import { Copy, ExternalLink, Eye, MousePointerClick, QrCode } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { FlowCardView } from "@/components/flowcard/FlowCardView";
import { MOCK_FLOWCARD } from "@/lib/mock-data";
import { qrSvgUrl } from "@/lib/qr";

export default function FlowCardSettings() {
  const publicUrl = `https://www.theleadflowpro.com/c/${MOCK_FLOWCARD.slug}`;

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
        <StatCard label="Views" value={MOCK_FLOWCARD.views.toLocaleString()} delta={18.4} highlight />
        <StatCard label="QR scans" value={MOCK_FLOWCARD.qrScans.toLocaleString()} delta={9.1} />
        <StatCard label="Follow-all clicks" value={MOCK_FLOWCARD.followAllClicks.toLocaleString()} delta={12.7} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* left: settings */}
        <div className="lg:col-span-2 space-y-6">
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

          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white">Edit your card</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Display name" defaultValue={MOCK_FLOWCARD.displayName} />
              <Field label="Tagline" defaultValue={MOCK_FLOWCARD.tagline} />
              <Field label="Phone"   defaultValue={MOCK_FLOWCARD.phone} />
              <Field label="Email"   defaultValue={MOCK_FLOWCARD.email} />
              <Field label="Website" defaultValue={MOCK_FLOWCARD.websiteUrl} className="sm:col-span-2" />
              <Field label="Bio" defaultValue={MOCK_FLOWCARD.bio} textarea className="sm:col-span-2" />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-white mb-2">Social links</h3>
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
            <FlowCardView card={MOCK_FLOWCARD} publicUrl={publicUrl} showQR={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, defaultValue, textarea, className
}: { label: string; defaultValue?: string | null; textarea?: boolean; className?: string }) {
  return (
    <label className={className}>
      <span className="text-xs uppercase tracking-wider text-ink-400 font-semibold">{label}</span>
      {textarea ? (
        <textarea
          defaultValue={defaultValue ?? ""}
          rows={3}
          className="mt-1 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none resize-none"
        />
      ) : (
        <input
          defaultValue={defaultValue ?? ""}
          className="mt-1 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none"
        />
      )}
    </label>
  );
}
