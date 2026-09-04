import type { ProInfo, Tool, ToolDef } from "../types";

/** What a kit file authors: a normal tool definition that also carries a price. */
export type ProToolDef = ToolDef & { pro: ProInfo };

/** A resolved kit, what the pages and the engine consume. */
export type ProTool = Tool & { pro: ProInfo };

/** The prices a kit is allowed to carry. Anything else fails validation. */
export const PRO_PRICES = [10, 19, 29] as const;
