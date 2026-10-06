// The shareable snapshot: the board's aggregate numbers as a card.
//
// Ryan on October 3: "I want to be able to take snapshots from outside of
// here and show 'em." The card carries counts and percentages only. No
// lead, business, phone or dollar value typed on a lead ever reaches it, so
// a snapshot can be posted without a second look. Pure: the route renders
// what this returns.

import { money, type MoneyBoard } from "@/lib/commandCenter";

export type SnapshotFact = { label: string; value: string; detail: string };

export function snapshotFacts(board: MoneyBoard): SnapshotFact[] {
  return [
    { label: "Leads in", value: String(board.leadsIn), detail: `last ${board.days} days` },
    {
      label: "Reached by a person",
      value: board.reachedPct === null ? "–" : `${board.reachedPct}%`,
      detail: board.leadsIn ? `${board.reachedIn24h} inside 24 hours` : "no leads in the window",
    },
    { label: "Waiting on a person", value: String(board.repliesOwed + board.untouched), detail: "replies owed plus never reached" },
    { label: "Proposals out", value: String(board.proposalsOut.count), detail: board.proposalsOut.cents ? money(board.proposalsOut.cents) : "no value typed" },
    { label: "Paid", value: board.paid.count ? money(board.paid.cents) : "$0", detail: `${board.paid.count} checkout${board.paid.count === 1 ? "" : "s"} in ${board.days} days` },
  ];
}

/** The file name a browser saves the card under. */
export function snapshotFileName(board: MoneyBoard, dayLocal: string): string {
  return `leadflow-board-${board.days}d-${dayLocal}.png`;
}

/** Every string on the card, for the test that proves no private field leaks. */
export function snapshotText(board: MoneyBoard, dayLocal: string): string {
  return [`The LeadFlow Pro · lead to cash · ${dayLocal}`, ...snapshotFacts(board).flatMap((f) => [f.label, f.value, f.detail])].join(" | ");
}
