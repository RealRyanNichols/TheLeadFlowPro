// Tools added during the library expansion, grouped by the collection they were
// built for. Each batch file authors its own metadata inline, so a batch is one
// self-contained unit that can be reviewed, tested and published on its own.
//
// Adding a batch: create lib/tools/batches/<name>.ts exporting a ToolDef[], then
// import it here. docs/TOOLS_ROADMAP.md tracks which batches are still open.

import type { ToolDef } from "./types";
import { HOME_FAMILY_TOOLS } from "./batches/home-family";

export const NEW_TOOLS: ToolDef[] = [...HOME_FAMILY_TOOLS];
