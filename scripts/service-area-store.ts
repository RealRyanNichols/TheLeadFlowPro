import { lstat, readFile } from "node:fs/promises";
import {
  initializeServiceAreaStore,
  readServiceAreaState,
  ServiceAreaStoreError,
} from "../lib/service-areas/store.ts";
import {
  validateRegistry,
  type Registry,
} from "../lib/service-areas/engine.ts";

// Run as the website's service user. Private source-backed records are an
// external 0600 JSON file; client identities and evidence never enter Git.
try {
  const command = process.argv[2];
  if (command === "init") {
    const input = process.argv[3];
    let registry: Registry = { version: 1, territories: [] };
    if (input) {
      const info = await lstat(input);
      if (
        !info.isFile() ||
        info.isSymbolicLink() ||
        (info.mode & 0o077) !== 0 ||
        info.size > 450000 ||
        (typeof process.getuid === "function" && info.uid !== process.getuid())
      )
        throw new ServiceAreaStoreError(
          "Initialization requires a private JSON file owned by the website service user.",
        );
      registry = validateRegistry(JSON.parse(await readFile(input, "utf8")));
    }
    const state = await initializeServiceAreaStore(
      registry,
      "operator:private-bootstrap",
    );
    console.log(
      JSON.stringify({
        initialized: true,
        revision: state.revision,
        privateTerritoryCount: state.registry.territories.length,
        privateInquiryCount: state.inquiries.length,
      }),
    );
  } else if (command === "status") {
    const state = await readServiceAreaState();
    console.log(
      JSON.stringify({
        initialized: !!state,
        revision: state?.revision ?? null,
        privateTerritoryCount: state?.registry.territories.length ?? 0,
        privateInquiryCount: state?.inquiries.length ?? 0,
      }),
    );
  } else {
    throw new ServiceAreaStoreError(
      "Usage: service-area-store.ts init [private-registry.json] | status",
    );
  }
} catch (error) {
  console.error(
    error instanceof ServiceAreaStoreError
      ? error.message
      : "Service-area storage operation failed. Check the private input, permissions, and directory.",
  );
  process.exitCode = 1;
}
