// The pro kits, one file each. A kit file exports its ToolDef (with `pro`) as
// KIT and its artwork brief as VISUAL. This index is the only place a new kit
// gets wired in, so adding one is one import and two array entries.
//
// Rules a kit file follows (enforced by lib/tools/validate.ts and the tests):
//   - run() is pure, never throws, and returns `documents` when the inputs are
//     usable. Every document is generated from the buyer's own numbers.
//   - The Brand Kit arrives as brand_* values (see BRAND_FIELD_IDS). The kit
//     must produce a complete result when every brand value is empty.
//   - No em dashes, no filler, no guarantees, in any copy or any document.

import type { ToolVisual } from "../../types";
import type { ProToolDef } from "../types";
import * as missedCallTextBackKit from "./missed-call-text-back-kit";
import * as googleReviewKit from "./google-review-kit";
import * as quoteFollowUpKit from "./quote-follow-up-kit";

const KITS = [missedCallTextBackKit, googleReviewKit, quoteFollowUpKit];

export const PRO_KIT_DEFS: ProToolDef[] = KITS.map((k) => k.KIT);

export const PRO_KIT_VISUALS: Record<string, ToolVisual> = Object.fromEntries(
  KITS.map((k) => [k.KIT.slug, k.VISUAL]),
);
