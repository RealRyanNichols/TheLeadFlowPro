import Link from "next/link";

export type LeadRepPackageCardProps = {
  eyebrow: string;
  title: string;
  body: string;
  price: string;
  recurring?: string;
  href: string;
  cta: string;
  bullets: string[];
};

export function LeadRepPackageCard({
  eyebrow,
  title,
  body,
  price,
  recurring,
  href,
  cta,
  bullets,
}: LeadRepPackageCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.4)]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{body}</p>
      <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-3">
        <p className="text-2xl font-black text-slate-950">{price}</p>
        {recurring ? <p className="text-xs font-black uppercase tracking-wide text-cyan-800">{recurring}</p> : null}
      </div>
      <ul className="mt-4 space-y-2 text-sm font-semibold leading-6 text-slate-700">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-600" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-black uppercase tracking-wide text-white hover:bg-cyan-700"
      >
        {cta}
      </Link>
    </article>
  );
}
