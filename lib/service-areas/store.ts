import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  rm,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  validateInquiry,
  validateRegistry,
  type Inquiry,
  type Registry,
} from "./engine.ts";
import { inquiryRequestFingerprint } from "./inquiry-retry.ts";

export type StoredInquiry = {
  id: string;
  document: Inquiry;
  created_at: string;
  lead_id: null;
  crm_status: "pending_manual_handoff";
};
type RegistryAudit = {
  actor_id: string;
  revision: number;
  previous_document: Registry | null;
  next_document: Registry;
  created_at: string;
};
export type ServiceAreaState = {
  version: 1;
  registry: Registry;
  revision: number;
  updated_at: string;
  inquiries: StoredInquiry[];
  audit: RegistryAudit[];
};
export type StoreOptions = { directory?: string; lockTimeoutMs?: number };
export class ServiceAreaStoreError extends Error {
  status: 400 | 409 | 429 | 503;
  constructor(
    message: string,
    status: 400 | 409 | 429 | 503 = 503,
  ) {
    super(message);
    this.status = status;
  }
}
const MAX_BYTES = 50 * 1024 * 1024;
const errorCode = (error: unknown) => (error as NodeJS.ErrnoException)?.code;
export function serviceAreaDirectory(options: StoreOptions = {}): string {
  const configured = options.directory ?? process.env.SERVICE_AREAS_DATA_DIR;
  const directory =
    configured ??
    (process.env.NODE_ENV === "production"
      ? "/var/lib/leadflow-service-areas"
      : path.join(process.cwd(), ".data", "service-areas"));
  if (!path.isAbsolute(directory))
    throw new ServiceAreaStoreError(
      "The private territory data directory must be absolute.",
    );
  const resolved = path.resolve(directory);
  for (const publicRoot of [
    path.join(process.cwd(), "public"),
    path.join(process.cwd(), ".next"),
  ])
    if (
      resolved === publicRoot ||
      resolved.startsWith(`${publicRoot}${path.sep}`)
    )
      throw new ServiceAreaStoreError(
        "Territory data must stay outside public assets and release build output.",
      );
  return resolved;
}
async function privatePath(file: string, directory: boolean) {
  const info = await lstat(file);
  if (
    info.isSymbolicLink() ||
    (directory ? !info.isDirectory() : !info.isFile()) ||
    (info.mode & 0o077) !== 0
  )
    throw new ServiceAreaStoreError(
      "Territory storage permissions need operator review.",
    );
  if (typeof process.getuid === "function" && info.uid !== process.getuid())
    throw new ServiceAreaStoreError(
      "Territory storage must belong to the website service user.",
    );
  return info;
}
function validateState(value: unknown): ServiceAreaState {
  if (!value || typeof value !== "object")
    throw new ServiceAreaStoreError(
      "The private territory store needs operator review.",
    );
  const state = value as ServiceAreaState;
  if (
    state.version !== 1 ||
    !Number.isSafeInteger(state.revision) ||
    state.revision < 1 ||
    !Array.isArray(state.inquiries) ||
    !Array.isArray(state.audit) ||
    !Number.isFinite(Date.parse(state.updated_at))
  )
    throw new ServiceAreaStoreError(
      "The private territory store needs operator review.",
    );
  state.registry = validateRegistry(state.registry);
  for (const entry of state.inquiries) {
    entry.document = validateInquiry(entry.document);
    if (
      entry.id !== entry.document.requestId ||
      entry.lead_id !== null ||
      entry.crm_status !== "pending_manual_handoff" ||
      !Number.isFinite(Date.parse(entry.created_at))
    )
      throw new ServiceAreaStoreError(
        "The private inquiry store needs operator review.",
      );
  }
  return state;
}
export async function readServiceAreaState(
  options: StoreOptions = {},
): Promise<ServiceAreaState | null> {
  const directory = serviceAreaDirectory(options),
    file = path.join(directory, "state.json");
  try {
    await privatePath(directory, true);
    const info = await privatePath(file, false);
    if (info.size > MAX_BYTES)
      throw new ServiceAreaStoreError(
        "The private territory store needs a capacity review.",
      );
    return validateState(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  }
}
async function atomicWrite(directory: string, state: ServiceAreaState) {
  const serialized = `${JSON.stringify(state)}\n`;
  if (Buffer.byteLength(serialized) > MAX_BYTES)
    throw new ServiceAreaStoreError(
      "The private territory store needs a capacity review. Nothing was discarded.",
    );
  const temporary = path.join(directory, `.state-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(
      temporary,
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_WRONLY |
        constants.O_NOFOLLOW,
      0o600,
    );
    await handle.writeFile(serialized, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporary, path.join(directory, "state.json"));
    const parent = await open(directory, constants.O_RDONLY);
    try {
      await parent.sync();
    } finally {
      await parent.close();
    }
  } finally {
    await handle?.close();
    await unlink(temporary).catch((error) => {
      if (errorCode(error) !== "ENOENT") throw error;
    });
  }
}
async function locked<T>(
  options: StoreOptions,
  operation: (directory: string) => Promise<T>,
): Promise<T> {
  const directory = serviceAreaDirectory(options),
    lock = path.join(directory, ".write-lock");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await privatePath(directory, true);
  const deadline = Date.now() + (options.lockTimeoutMs ?? 5000);
  for (;;) {
    try {
      await mkdir(lock, { mode: 0o700 });
      break;
    } catch (error) {
      if (errorCode(error) !== "EEXIST") throw error;
      if (Date.now() >= deadline)
        throw new ServiceAreaStoreError(
          "Territory storage is busy. Retry shortly; an operator may need to inspect an interrupted write.",
        );
      await delay(20);
    }
  }
  try {
    const owner = await open(path.join(lock, "owner.json"), "wx", 0o600);
    try {
      await owner.writeFile(
        JSON.stringify({
          pid: process.pid,
          started_at: new Date().toISOString(),
        }),
      );
    } finally {
      await owner.close();
    }
    return await operation(directory);
  } finally {
    await rm(lock, { recursive: true });
  }
}
export async function initializeServiceAreaStore(
  registry: Registry,
  actor: string,
  options: StoreOptions = {},
) {
  return locked(options, async (directory) => {
    const existing = await readServiceAreaState(options);
    if (existing) return existing;
    const document = validateRegistry(registry),
      now = new Date().toISOString();
    const state: ServiceAreaState = {
      version: 1,
      registry: document,
      revision: 1,
      updated_at: now,
      inquiries: [],
      audit: [
        {
          actor_id: actor,
          revision: 1,
          previous_document: null,
          next_document: document,
          created_at: now,
        },
      ],
    };
    await atomicWrite(directory, state);
    return state;
  });
}
export async function saveServiceAreaRegistry(
  registry: Registry,
  revision: number,
  actor: string,
  options: StoreOptions = {},
) {
  return locked(options, async (directory) => {
    const state = await readServiceAreaState(options);
    if (!state)
      throw new ServiceAreaStoreError(
        "Initialize the private territory register before saving.",
      );
    if (state.revision !== revision)
      throw new ServiceAreaStoreError(
        "Another operator changed the map. Reload before saving; copy your edits first.",
        409,
      );
    const document = validateRegistry(registry);
    for (const t of document.territories)
      if (t.inquiryId) {
        const inquiry = state.inquiries.find(
          (i) => i.id === t.inquiryId,
        )?.document;
        if (!inquiry)
          throw new ServiceAreaStoreError(
            "The linked inquiry could not be verified.",
            400,
          );
        if (
          inquiry.industry !== t.industry ||
          t.services.some((s) => !inquiry.services.includes(s))
        )
          throw new ServiceAreaStoreError(
            "The territory must match the linked inquiry's industry and services.",
            400,
          );
        if (t.publicApproved && !inquiry.publicConsent)
          throw new ServiceAreaStoreError(
            "This lead did not consent to anonymous public interest. Keep it private.",
            400,
          );
      }
    const now = new Date().toISOString(),
      nextRevision = revision + 1;
    state.audit.push({
      actor_id: actor,
      revision: nextRevision,
      previous_document: state.registry,
      next_document: document,
      created_at: now,
    });
    state.registry = document;
    state.revision = nextRevision;
    state.updated_at = now;
    await atomicWrite(directory, state);
    return nextRevision;
  });
}
export async function submitServiceAreaInquiry(
  value: unknown,
  options: StoreOptions = {},
  now = new Date(),
) {
  const inquiry = validateInquiry(value),
    fingerprint = inquiryRequestFingerprint(inquiry);
  return locked(options, async (directory) => {
    const state = await readServiceAreaState(options);
    if (!state)
      throw new ServiceAreaStoreError(
        "Area requests are temporarily unavailable. Please contact our team.",
      );
    const sameId = state.inquiries.find((i) => i.id === inquiry.requestId);
    if (sameId) {
      if (inquiryRequestFingerprint(sameId.document) !== fingerprint)
        throw new ServiceAreaStoreError(
          "These details differ from the original request. Refresh the page and submit the corrected request.",
          409,
        );
      return sameId;
    }
    const recent = state.inquiries.filter(
      (i) =>
        i.document.email === inquiry.email &&
        Date.parse(i.created_at) > now.getTime() - 86400000,
    );
    const duplicate = recent.find(
      (i) => inquiryRequestFingerprint(i.document) === fingerprint,
    );
    if (duplicate) return duplicate;
    if (recent.length >= 5)
      throw new ServiceAreaStoreError(
        "You have reached the daily area-request limit. Please contact our team for corrections.",
        429,
      );
    const entry: StoredInquiry = {
      id: inquiry.requestId,
      document: inquiry,
      created_at: now.toISOString(),
      lead_id: null,
      crm_status: "pending_manual_handoff",
    };
    state.inquiries.push(entry);
    await atomicWrite(directory, state);
    return entry;
  });
}
