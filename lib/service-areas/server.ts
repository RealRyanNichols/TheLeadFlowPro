import "server-only";
import { publicTerritories, type PublicTerritory } from "./engine";
import { readServiceAreaState } from "./store";

export async function readPublicCoverage(): Promise<{
  territories: PublicTerritory[];
  available: boolean;
  updatedAt: string | null;
}> {
  try {
    const state = await readServiceAreaState();
    if (!state) return { territories: [], available: false, updatedAt: null };
    // Old/invalid registry data never turns into fabricated availability.
    return {
      territories: publicTerritories(state.registry),
      available: true,
      updatedAt: state.updated_at,
    };
  } catch {
    return { territories: [], available: false, updatedAt: null };
  }
}
