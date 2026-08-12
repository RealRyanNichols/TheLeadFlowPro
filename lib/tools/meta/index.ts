// Central metadata for the original 78 tools.
//
// Those tools were written before the taxonomy existed, so rather than rewrite
// five large formula files, their taxonomy, presets and disclosures live here
// and get merged on in lib/tools/index.ts. Tools added since declare the same
// fields inline on the definition itself.

import type { ToolMeta } from "../types";
import { LEAD_META } from "./leads";
import { MONEY_META } from "./money";
import { OPERATIONS_META } from "./operations";
import { GROWTH_META } from "./growth";
import { GENERATOR_META } from "./generators";

export const TOOL_META: Record<string, ToolMeta> = {
  ...LEAD_META,
  ...MONEY_META,
  ...OPERATIONS_META,
  ...GROWTH_META,
  ...GENERATOR_META,
};
