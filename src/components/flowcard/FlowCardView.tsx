import Link from "next/link";
import { Phone, Mail, Globe, QrCode, Share2 } from "lucide-react";
import { FollowAllButton } from "./FollowAllButton";
import { SocialIcon, socialBg } from "./SocialIcon";
import { qrSvgUrl } from "@/lib/qr";
import { FunnelMark } from "@/components/site/Logo";

export interface FlowCardData {
  slug: string;
  displayName: string;
  tagline?: string | null;
  bio?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  themeAccent: string;
  links: { platform: string; label: string; url: string; handle?: string }[];
}

export function FlowCardView({
  card,
  publicUrl,
  showQR = true
}: {
  card: FlowCardData;
  publicUrl: string;
  showQR?: boolean;
}) {
  return (
    <div className="max-w-md mx-auto">
      {/* cover gradient */}
      <div
        className="h-32 rounded-t-3xl"
        style={{
          background: `linear-gradient(135deg, ${card.themeAccent} 0%, #0d4a9d 80%)`
        }}
      />
      <div className="-mt-12 px-6 pb-8 glass-strong rounded-b-3xl border-t-0">
        {/* avatar */}
        <div className="h-24 w-24 rounded-2xl bg-ink-900 border-4 border-ink-950 -mt-12 flex items-center justify-center text-3xl font-extrabold text-white mx-auto shadow-xl">
          {card.displayName.charAt(0)}
        </div>

        <div className="text-center mt-4">
          <h1 className="text-2xl font-extrabold text-white">{card.displayName}</h1>
          {card.tagline && (
            <p className="text-sm text-ink-200 mt-1">{card.tagline}</p>
          )}
          {card.bio && (
            <p className="mt-3 text-sm text-ink-300 leading-relaxed">{card.bio}</p>
          )}
        </div>

        {/* primary contact buttons */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {card.phone && (
            <a href={`tel:${card.phone}`} className="btn-ghost text-xs py-2 px-2 flex-col gap-1">
              <Phone className="h-4 w-4" /> Call
            </a>
          )}
          {card.email && (
            <a href={`mailto:${card.email}`} className="btn-ghost text-xs py-2 px-2 flex-col gap-1">
              <Mail className="h-4 w-4" /> Email
            </a>
          )}
          {card.websiteUrl && (
            <a href={card.websiteUrl} target="_blank" rel="noopener noreferrer"
               className="btn-ghost text-xs py-2 px-2 flex-col gap-1">
              <Globe className="h-4 w-4" /> Site
            </a>
          )}
        </div>

        {/* Follow All */}
        <div className="mt-5">
          <FollowAllButton links={card.links} />
          <p className="text-[11px] text-center text-ink-400 mt-2">
            Opens each profile so you can tap "follow" — no typing, no searching.
          </p>
        </div>

        {/* social links list */}
        <div className="mt-6 space-y-2">
          {card.links.map((l) => (
            <a
              key={l.platform + l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/40 hover:bg-white/10 transition group"
            >
              <span
                className={`h-9 w-9 rounded-lg flex items-center justify-center text-white bg-gradient-to-br ${socialBg(l.platform)}`}
              >
                <SocialIcon platform={l.platform} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{l.label}</p>
                {l.handle && <p className="text-xs text-ink-400 truncate">{l.handle}</p>}
              </div>
              <Share2 className="h-3.5 w-3.5 text-ink-400 group-hover:text-cyan-400" />
            </a>
          ))}
        </div>

        {/* QR */}
        {showQR && (
          <div className="mt-6 glass rounded-2xl p-4 flex items-center gap-4">
            <img
              src={qrSvgUrl(publicUrl, 160)}
              alt="QR code"
              className="h-24 w-24 rounded-lg shrink-0"
            />
            <div className="text-xs text-ink-300">
              <p className="text-white font-semibold flex items-center gap-1">
                <QrCode className="h-3.5 w-3.5" /> Scan to share
              </p>
              <p className="mt-1">
                Anyone with a phone camera can scan this and land here. No app required.
              </p>
            </div>
          </div>
        )}

        {/* footer */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-1.5 text-[11px] text-ink-400">
          <FunnelMark className="h-3.5 w-3.5" />
          <span>Powered by</span>
          <Link href="/" className="text-cyan-400 hover:underline">The LeadFlow Pro</Link>
        </div>
      </div>
    </div>
  );
}
