// The RN-1 trading desk, read only. The desk runs on its own DigitalOcean
// server and republishes a public page plus data.json every 5 minutes at
// trading.theleadflowpro.com. The back office shows that page and a few of its
// numbers. Nothing here holds a key, places an order, or changes a trade.

export const RN1_DESK_URL = "https://trading.theleadflowpro.com/";
export const RN1_DESK_DATA_URL = `${RN1_DESK_URL}data.json`;

/** The public desk page calls the engine live while its heartbeat is newer than this. */
export const RN1_QUIET_AFTER_MINUTES = 15;
/** The desk republishes every 5 minutes. Older than this, its numbers are behind. */
export const RN1_STALE_AFTER_MINUTES = 20;
/** How long the Command page waits for the desk before it renders without the numbers. */
export const RN1_FETCH_TIMEOUT_MS = 3500;

export type Rn1EngineState = "live" | "quiet" | "halted";

export type Rn1Position = {
  pid: string;
  coin: string;
  entry: number | null;
  /** The latest price the desk published: today's daily candle so far. */
  now: number | null;
  /** Percent from entry to now, for example -4.6. */
  changePct: number | null;
  /** The stop resting on Coinbase. */
  stop: number | null;
};

export type Rn1Pending = { pid: string; coin: string; limit: number | null };

export type Rn1DeskSummary = {
  generatedAt: string | null;
  /** True when the desk has not republished within RN1_STALE_AFTER_MINUTES. */
  stale: boolean;
  equity: number | null;
  funded: number | null;
  engine: Rn1EngineState;
  heartbeatAt: string | null;
  heartbeatMinutes: number | null;
  position: Rn1Position | null;
  pending: Rn1Pending | null;
  closedCount: number;
  closedNet: number;
};

const PRODUCT_ID = /^[A-Z0-9]{1,20}-USD$/;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function num(value: unknown): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(n) ? n : null;
}

function isoTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const at = Date.parse(value);
  return Number.isFinite(at) ? new Date(at).toISOString() : null;
}

function productId(value: unknown): string | null {
  return typeof value === "string" && PRODUCT_ID.test(value) ? value : null;
}

const coinOf = (pid: string) => pid.slice(0, pid.indexOf("-"));

/** The close of the newest daily candle the desk published for one coin. */
function lastClose(market: Record<string, unknown> | null, pid: string): number | null {
  const coin = record(market?.[pid]);
  const candles = Array.isArray(coin?.candles) ? coin.candles : [];
  const newest = candles[candles.length - 1];
  const close = Array.isArray(newest) ? num(newest[4]) : null;
  return close !== null && close > 0 ? close : null;
}

/**
 * Turns the desk's data.json into the few numbers the Command page shows.
 * Anything missing or malformed stays null. A reading that is not there is
 * never shown as zero.
 */
export function summarizeRn1Desk(data: unknown, nowMs: number): Rn1DeskSummary | null {
  const root = record(data);
  const status = record(root?.status);
  if (!root || !status) return null;
  const market = record(root.market);

  const heartbeatAt = isoTime(status.heartbeat_at);
  const heartbeatMinutes =
    heartbeatAt === null ? null : Math.max(0, Math.floor((nowMs - Date.parse(heartbeatAt)) / 60_000));
  const engine: Rn1EngineState =
    status.halted === true
      ? "halted"
      : heartbeatMinutes !== null && heartbeatMinutes < RN1_QUIET_AFTER_MINUTES
        ? "live"
        : "quiet";

  const generatedAt = isoTime(root.generated_at);
  const stale =
    generatedAt === null || nowMs - Date.parse(generatedAt) > RN1_STALE_AFTER_MINUTES * 60_000;

  const held = record(status.position);
  const heldId = productId(held?.pid);
  let position: Rn1Position | null = null;
  if (held && heldId) {
    const entry = num(held.entry);
    const now = lastClose(market, heldId);
    position = {
      pid: heldId,
      coin: coinOf(heldId),
      entry,
      now,
      changePct: entry !== null && entry > 0 && now !== null ? (now / entry - 1) * 100 : null,
      stop: num(held.stop),
    };
  }

  const working = record(status.pending);
  const workingId = productId(working?.pid);
  const pending: Rn1Pending | null =
    working && workingId ? { pid: workingId, coin: coinOf(workingId), limit: num(working.limit) } : null;

  const trades = Array.isArray(status.trades)
    ? status.trades.map(record).filter((t): t is Record<string, unknown> => t !== null)
    : [];
  const closedNet = trades.reduce((sum, trade) => sum + (num(trade.net) ?? 0), 0);

  return {
    generatedAt,
    stale,
    equity: num(status.equity),
    funded: num(status.funded),
    engine,
    heartbeatAt,
    heartbeatMinutes,
    position,
    pending,
    closedCount: trades.length,
    closedNet: Math.round(closedNet * 100) / 100,
  };
}

/**
 * Reads data.json from the trading server. Cached for a minute, because the
 * Command page refreshes itself every 15 seconds and the desk only changes
 * every 5 minutes. A slow or failed read returns null and the page carries on.
 */
export async function loadRn1Desk(nowMs = Date.now()): Promise<Rn1DeskSummary | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const request = fetch(RN1_DESK_DATA_URL, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 },
    })
      .then((res) => (res.ok ? (res.json() as Promise<unknown>) : null))
      .catch(() => null);
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), RN1_FETCH_TIMEOUT_MS);
    });
    return summarizeRn1Desk(await Promise.race([request, timeout]), nowMs);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Decimal places for a price, the same steps the desk page and its captions use. */
export function decimalsFor(value: number): number {
  const size = Math.abs(value);
  return size >= 1000 ? 0 : size >= 10 ? 2 : size >= 1 ? 4 : size >= 0.01 ? 5 : 6;
}

export function usd(value: number, decimals = 2): string {
  const amount = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${value < 0 ? "-" : ""}$${amount}`;
}

export function signedUsd(value: number): string {
  return `${value < 0 ? "-" : "+"}${usd(Math.abs(value))}`;
}

export function signedPct(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return "0.0%";
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
}
