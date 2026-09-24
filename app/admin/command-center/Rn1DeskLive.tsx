import { Radio, Receipt, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import {
  decimalsFor,
  loadRn1Desk,
  signedPct,
  signedUsd,
  usd,
  type Rn1DeskSummary,
} from "@/lib/rn1Desk";

type Tile = {
  label: string;
  value: string;
  detail: string;
  icon: typeof Wallet;
  /** Each tile keeps its own accent: the icon chip gradient and a thin top rule. */
  chip: string;
  rule: string;
};

const ENGINE_TONE: Record<Rn1DeskSummary["engine"], string> = {
  live: "border-[var(--green-line)] bg-[var(--green-tint)] text-[var(--green)]",
  quiet: "border-[var(--warn-line)] bg-[var(--warn-tint)] text-[var(--warn)]",
  halted: "border-[var(--danger-line)] bg-[var(--danger-tint)] text-[var(--danger)]",
};

function centralTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

function engineLine(desk: Rn1DeskSummary): string {
  if (desk.engine === "halted") return "Engine halted. No new trades.";
  if (desk.engine === "live") {
    const minutes = desk.heartbeatMinutes ?? 0;
    return minutes < 1 ? "Engine live. Checked in just now." : `Engine live. Checked in ${minutes} min ago.`;
  }
  return desk.heartbeatAt
    ? `Engine quiet since ${centralTime(desk.heartbeatAt)} CT.`
    : "Engine has not checked in.";
}

function asOfLine(desk: Rn1DeskSummary): string {
  if (!desk.generatedAt) return "The desk did not say when these numbers were made.";
  const at = centralTime(desk.generatedAt);
  return desk.stale
    ? `Last update at ${at} CT. The desk normally updates every 5 minutes, so it is behind.`
    : `Numbers from ${at} CT. The desk updates every 5 minutes.`;
}

function tiles(desk: Rn1DeskSummary): Tile[] {
  const pos = desk.position;
  const scale = decimalsFor(pos?.entry ?? pos?.now ?? pos?.stop ?? 1);
  const price = (value: number) => usd(value, scale);

  let trade: Pick<Tile, "value" | "detail">;
  if (pos) {
    const moves = [
      pos.entry !== null ? `In at ${price(pos.entry)}` : "Entry not reported",
      pos.now !== null ? `now ${price(pos.now)}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    trade = {
      value: pos.coin,
      detail: pos.changePct !== null ? `${moves} (${signedPct(pos.changePct)})` : moves,
    };
  } else if (desk.pending) {
    const limit = desk.pending.limit;
    trade = {
      value: `${desk.pending.coin} order`,
      detail: limit !== null ? `Buy order working at ${usd(limit, decimalsFor(limit))}` : "Buy order working",
    };
  } else {
    trade = { value: "None", detail: "All cash. It buys only a daily close above the 55 day high." };
  }

  const stop: Pick<Tile, "value" | "detail"> = !pos
    ? { value: "None", detail: "No open position to protect." }
    : pos.stop !== null
      ? { value: price(pos.stop), detail: "Resting on Coinbase. Raised daily, never lowered." }
      : { value: "Not reported", detail: "The desk did not report a stop for this trade." };

  const closed: Pick<Tile, "value" | "detail"> = desk.closedCount
    ? {
        value: signedUsd(desk.closedNet),
        detail: `${desk.closedCount} closed trade${desk.closedCount === 1 ? "" : "s"} on the record`,
      }
    : { value: "None yet", detail: "The first exit will show here." };

  return [
    {
      label: "Account",
      value: desk.equity !== null ? usd(desk.equity) : "Not reported",
      detail: desk.funded !== null ? `of ${usd(desk.funded, 0)} funded` : "Funded amount not reported",
      icon: Wallet,
      chip: "from-[#146c34] to-[#3aa061]",
      rule: "bg-[#146c34]",
    },
    {
      label: "Open trade",
      ...trade,
      icon: TrendingUp,
      chip: "from-[#1240e8] to-[#5b7cff]",
      rule: "bg-[#1240e8]",
    },
    {
      label: "Stop on Coinbase",
      ...stop,
      icon: ShieldCheck,
      chip: "from-[#6d28d9] to-[#a178f0]",
      rule: "bg-[#6d28d9]",
    },
    {
      label: "Closed trades",
      ...closed,
      icon: Receipt,
      chip: "from-[#0e6f96] to-[#35a9cf]",
      rule: "bg-[#0e6f96]",
    },
  ];
}

/** The desk's headline numbers. A reading the desk did not give is said so, never shown as zero. */
export function Rn1DeskNumbers({ desk }: { desk: Rn1DeskSummary | null }) {
  if (!desk) {
    return (
      <div
        role="status"
        className="mx-5 my-5 rounded-2xl border border-[var(--warn-line)] bg-[var(--warn-tint)] p-4 text-sm sm:mx-6 sm:mb-0"
      >
        <p className="font-bold text-[var(--heading)]">
          Live numbers could not be read from the desk just now.
        </p>
        <p className="mt-1 text-[var(--text)]">
          The live view loads straight from the trading server. The numbers try again on the next refresh.
        </p>
      </div>
    );
  }
  return (
    <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span
          className={`inline-flex min-h-[38px] items-center gap-2 rounded-full border px-3 text-xs font-bold ${ENGINE_TONE[desk.engine]}`}
        >
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current">
            {desk.engine === "live" ? (
              <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-25 motion-reduce:animate-none" />
            ) : null}
          </span>
          <Radio className="h-3.5 w-3.5" aria-hidden="true" />
          {engineLine(desk)}
        </span>
        <p className="text-xs text-[var(--muted)]">{asOfLine(desk)}</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles(desk).map(({ label, value, detail, icon: Icon, chip, rule }) => (
          <article
            key={label}
            className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--fill-1)] p-4"
          >
            <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${rule}`} />
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${chip}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{label}</p>
            </div>
            <p className="mt-3 text-3xl font-black tabular-nums text-[var(--heading)]">{value}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

/** Reads the desk (cached a minute) and shows its numbers. */
export default async function Rn1DeskLive() {
  return <Rn1DeskNumbers desk={await loadRn1Desk()} />;
}
