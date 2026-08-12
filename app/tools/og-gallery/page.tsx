import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TOOLS } from "@/lib/tools";
import { PUBLISHED_COLLECTIONS } from "@/lib/tools/collections";

// Development only. Every generated social preview on one page, so a whole
// catalogue of OG images can be eyeballed at once instead of one paste into a
// share debugger at a time.
//
// Reviewing 90 cards by hand is how you catch a title that overflows or a mark
// that collides with the text, which no automated dimension check will find.

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function OgGallery() {
  if (process.env.NODE_ENV === "production") notFound();

  const cards = [
    { label: "Directory", href: "/tools", og: "/tools/opengraph-image" },
    ...PUBLISHED_COLLECTIONS.map((c) => ({
      label: `Collection: ${c.short}`,
      href: `/tools/collections/${c.slug}`,
      og: `/tools/collections/${c.slug}/opengraph-image`,
    })),
    ...TOOLS.map((t) => ({
      label: t.name,
      href: `/tools/${t.slug}`,
      og: `/tools/${t.slug}/opengraph-image`,
    })),
  ];

  return (
    <main className="mx-auto w-[min(1400px,100%-40px)] py-10">
      <h1 className="text-3xl font-black text-[var(--heading)]">Social preview gallery</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {cards.length} generated cards. Development only, never indexed. Look for overflowing titles,
        text touching an edge, and any card that is unreadable at feed size.
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <figure key={c.og} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
            <img
              src={c.og}
              alt={`Social preview for ${c.label}`}
              width={1200}
              height={630}
              loading="lazy"
              className="w-full rounded-lg border border-[var(--line)]"
            />
            <figcaption className="mt-2 flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-[var(--heading)]">{c.label}</span>
              <a href={c.href} className="font-bold text-[var(--blue)] underline">page</a>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
