import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { proUpgradesFor } from "@/lib/tools/pro";

/**
 * The upgrade card under a free tool.
 *
 * It only appears when a kit genuinely continues that specific tool's job, and
 * it never implies the free tool is crippled: the free tool is finished, this
 * is the work that comes after its answer. One card, the highest ranked kit
 * for this slug, no carousel of things to buy.
 */
export default function ProUpsell({ freeSlug }: { freeSlug: string }) {
  const kit = proUpgradesFor(freeSlug).sort((a, b) => b.popularity - a.popularity)[0];
  if (!kit) return null;

  return (
    <aside className="pro-upsell">
      <div>
        <p className="pro-upsell-eyebrow">
          <Sparkles aria-hidden="true" className="h-4 w-4" />
          After the number
        </p>
        <h3>{kit.name}</h3>
        <p>{kit.pro.promise}</p>
        <ul className="pro-upsell-kit">
          {kit.pro.kit.slice(0, 4).map((item) => (
            <li key={item}>
              <Check aria-hidden="true" className="h-3.5 w-3.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="pro-upsell-go">
        <p className="pro-upsell-price">
          ${kit.pro.priceUsd}
          <small>one time</small>
        </p>
        <Link href={`/tools/pro/${kit.slug}`} className="pro-buy-button">
          Try it with your numbers
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
        <p className="pro-strip-fine">Free to run, unlock only if you want the documents.</p>
      </div>
    </aside>
  );
}
