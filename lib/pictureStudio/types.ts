export type PackId = "starter" | "growth" | "daily" | "bulk100";
export type PictureStatus = "awaiting_payment" | "planning" | "awaiting_plan_approval" | "queued" | "generating" | "owner_review" | "customer_review" | "delivered" | "paused" | "failed" | "refunded" | "disputed";
export interface PictureBrief {
  audience: "personal" | "business" | "creator";
  title: string;
  moment: string;
  eventDate?: string;
  emotion: string;
  theme: string;
  story: string;
  words: string;
  musicTitle: string;
  musicArtist: string;
  musicStartSeconds: number | null;
  musicCueNotes: string;
  userConfirmedMusic: boolean;
  usesLikeness: boolean;
  subjectsConsent: boolean;
  assetsRights: boolean;
}
export interface ScenePlan {
  index: number;
  title: string;
  prompt: string;
  caption: string;
  visualDirection?: string;
  musicCueNotes?: string;
  musicStartSeconds?: number | null;
}
export interface PictureAsset {
  id: string;
  path: string;
  filename: string;
  mime: "image/jpeg" | "image/png" | "image/webp";
  size: number;
  width: number;
  height: number;
}
export interface PictureFile {
  id: string;
  path: string;
  filename: string;
  mime: string;
  size: number;
  sceneIndex: number;
  variant: "square" | "portrait";
}
export interface PictureOrder {
  id: string;
  packId: PackId;
  quantity: number;
  pictureCount: number;
  amountCents: number;
  email: string;
  name: string;
  brief: PictureBrief;
  scenes: ScenePlan[];
  assets: PictureAsset[];
  files: PictureFile[];
  status: PictureStatus;
  paymentStatus: "unpaid" | "paid" | "refunded" | "disputed";
  planApprovedAt: string | null;
  ownerReleasedAt: string | null;
  revisionCount: number;
  revisionNotes: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PictureJob {
  id: string;
  orderId: string;
  kind: "plan" | "image";
  sceneIndex: number | null;
  attempt: number;
  leaseToken: string;
}
export interface ClaimedPictureJob { job: PictureJob; order: PictureOrder }
export interface PublicPictureOrder extends Omit<PictureOrder, "assets" | "files" | "scenes"> {
  assets: Omit<PictureAsset, "path">[];
  files: Omit<PictureFile, "path">[];
  outputs: Omit<PictureFile, "path">[];
  scenes: Omit<ScenePlan, "prompt">[];
  plan: Omit<ScenePlan, "prompt">[];
  revisionsRemaining: number;
}
export class PictureError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; this.name = "PictureError"; }
}

const text = (value: unknown, name: string, max: number, required = false): string => {
  if (value !== undefined && typeof value !== "string") throw new PictureError(`${name} must be text.`);
  const result = (typeof value === "string" ? value : "").trim();
  if (result.length > max || (required && result.length < 2)) throw new PictureError(`${name} must be ${required ? "2–" : "at most "}${max} characters.`);
  return result;
};
export function parseBrief(input: unknown): PictureBrief {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new PictureError("Add your picture brief.");
  const v = input as Record<string, unknown>;
  if (!["personal", "business", "creator"].includes(String(v.audience))) throw new PictureError("Choose who these pictures are for.");
  const date = text(v.eventDate, "Event date", 10);
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))) throw new PictureError("Use a valid event date.");
  const seconds = v.musicStartSeconds === undefined || v.musicStartSeconds === null || v.musicStartSeconds === "" ? null : v.musicStartSeconds;
  if (seconds !== null && (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0 || seconds > 86400)) throw new PictureError("Music start time must be seconds between 0 and 86400.");
  return {
    audience: v.audience as PictureBrief["audience"], title: text(v.title, "Title", 140, true),
    moment: text(v.moment, "Moment or event", 600, true), eventDate: date || undefined,
    emotion: text(v.emotion, "Emotion", 240, true), theme: text(v.theme, "Theme", 600, true),
    story: text(v.story, "Story", 4000, true), words: text(v.words, "Approved wording", 2000),
    musicTitle: text(v.musicTitle, "Song", 200), musicArtist: text(v.musicArtist, "Artist", 200),
    musicStartSeconds: seconds as number | null, musicCueNotes: text(v.musicCueNotes, "Music cue", 600),
    userConfirmedMusic: v.userConfirmedMusic === true, usesLikeness: v.usesLikeness === true,
    subjectsConsent: v.subjectsConsent === true, assetsRights: v.assetsRights === true,
  };
}
export function validateProductionBrief(brief: PictureBrief, assetsCount: number): void {
  if (!brief.assetsRights) throw new PictureError("Confirm that you can use the supplied photos and wording.");
  if (brief.usesLikeness && (!brief.subjectsConsent || assetsCount < 1)) throw new PictureError("Likeness scenes need a reference photo and the subjects’ permission.");
  if ((brief.musicTitle || brief.musicStartSeconds !== null) && !brief.userConfirmedMusic) throw new PictureError("Confirm your song and cue, or leave the music choice blank.");
}
export function publicOrder(order: PictureOrder): PublicPictureOrder {
  const assets = order.assets.map(({ path: _path, ...asset }) => asset);
  const visible = ["customer_review", "delivered"].includes(order.status);
  const files = visible ? order.files.map(({ path: _path, ...file }) => file) : [];
  const scenes = order.scenes.map(({ prompt: _prompt, ...scene }) => scene);
  return { ...order, assets, files, outputs: files, scenes, plan: scenes, revisionsRemaining: Math.max(0, 1 - order.revisionCount) };
}
