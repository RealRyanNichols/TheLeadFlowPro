import sharp from "sharp";

export const IMAGE_GENERATION_MODEL = "gpt-image-2.5-flare-2026-09-08";
export const IMAGE_EDIT_MODEL = "gpt-image-2.5-sunburst-2026-09-08";
export const IMAGE_RESERVATION_CENTS = 100;
export const MAX_REFERENCE_IMAGES = 8;
export const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
const MAX_PROMPT_CHARS = 12_000;

export interface PreparedReference {
  imageUrl: string;
}

export interface ImageUsage {
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: { text_tokens?: number; image_tokens?: number };
}

export interface GeneratedPicture {
  png: Buffer;
  model: string;
  requestId: string | null;
  usage: ImageUsage | null;
  actualCostCents: number | null;
}

/** Never include provider bodies, prompts, credentials or customer images in logs. */
export class PictureProviderError extends Error {
  readonly ambiguous: boolean;
  constructor(message: string, ambiguous = true) {
    super(message);
    this.name = "PictureProviderError";
    this.ambiguous = ambiguous;
  }
}

export async function prepareReferences(inputs: readonly Buffer[]): Promise<PreparedReference[]> {
  if (inputs.length > MAX_REFERENCE_IMAGES) throw new PictureProviderError("At most eight reference images may be rendered together.", false);
  const references: PreparedReference[] = [];
  for (const input of inputs) {
    if (!input.length || input.length > MAX_REFERENCE_BYTES) throw new PictureProviderError("Reference image exceeds the supported size.", false);
    try {
      const jpg = await sharp(input, { limitInputPixels: 25_000_000, failOn: "error" })
        .rotate()
        .resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 85 })
        .toBuffer();
      references.push({ imageUrl: `data:image/jpeg;base64,${jpg.toString("base64")}` });
    } catch {
      throw new PictureProviderError("A reference image cannot be decoded. Please replace it.", false);
    }
  }
  return references;
}

/** Current snapshot rates: $5/M text input, $8/M image input, $30/M output. */
export function imageUsageCostCents(usage: ImageUsage | null | undefined): number | null {
  const valid = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
  if (!usage || !valid(usage.input_tokens) || !valid(usage.output_tokens)) return null;
  const text = usage.input_tokens_details?.text_tokens;
  const image = usage.input_tokens_details?.image_tokens;
  // Without a trustworthy breakdown, charge all input at the higher image rate.
  const inputDollarsPerMillion = valid(text) && valid(image) && text + image === usage.input_tokens
    ? text * 5 + image * 8
    : usage.input_tokens * 8;
  return Math.max(1, Math.ceil((inputDollarsPerMillion + usage.output_tokens * 30) / 10_000));
}

export interface ImageProvider {
  generate(prompt: string, references: readonly PreparedReference[], signal?: AbortSignal): Promise<GeneratedPicture>;
}

export function createOpenAIImageProvider(apiKey: string, fetcher: typeof fetch = fetch): ImageProvider {
  if (!apiKey.trim()) throw new PictureProviderError("The image provider is not configured.", false);
  return {
    async generate(prompt, references, signal) {
      if (!prompt.trim() || prompt.length > MAX_PROMPT_CHARS || references.length > MAX_REFERENCE_IMAGES) {
        throw new PictureProviderError("The image request exceeds the supported limits.", false);
      }
      const edit = references.length > 0;
      const model = edit ? IMAGE_EDIT_MODEL : IMAGE_GENERATION_MODEL;
      const body = {
        model,
        prompt,
        n: 1,
        size: "1024x1280",
        quality: "medium",
        output_format: "png",
        moderation: "auto",
        ...(edit ? { images: references.map((reference) => ({ image_url: reference.imageUrl })) } : {}),
      };
      let response: Response;
      try {
        response = await fetcher(`https://api.openai.com/v1/images/${edit ? "edits" : "generations"}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(180_000)]) : AbortSignal.timeout(180_000),
        });
      } catch {
        // A transport failure does not prove that the provider did not create and bill an image.
        throw new PictureProviderError("The provider request did not finish. A team member must reconcile this attempt.");
      }
      if (!response.ok) throw new PictureProviderError(`The image provider returned HTTP ${response.status}. This attempt needs review.`);
      let data: { data?: { b64_json?: string }[]; usage?: ImageUsage };
      try {
        const text = await readBoundedResponse(response, MAX_OUTPUT_BYTES * 2);
        data = JSON.parse(text);
      } catch {
        throw new PictureProviderError("The provider returned an unreadable image result. This attempt needs review.");
      }
      const encoded = data.data?.[0]?.b64_json;
      if (typeof encoded !== "string" || encoded.length > Math.ceil(MAX_OUTPUT_BYTES * 4 / 3) + 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
        throw new PictureProviderError("The provider returned an invalid image result. This attempt needs review.");
      }
      const png = Buffer.from(encoded, "base64");
      if (!png.length || png.length > MAX_OUTPUT_BYTES) throw new PictureProviderError("The provider image exceeded the supported size.");
      try {
        const metadata = await sharp(png, { limitInputPixels: 25_000_000, failOn: "error" }).metadata();
        if (metadata.format !== "png" || !metadata.width || !metadata.height) throw new Error("Unsupported image");
      } catch {
        throw new PictureProviderError("The provider image cannot be decoded. This attempt needs review.");
      }
      const usage = data.usage ?? null;
      return { png, model, requestId: response.headers.get("x-request-id"), usage, actualCostCents: imageUsageCostCents(usage) };
    },
  };
}

async function readBoundedResponse(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) throw new Error("Missing response body");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new Error("Response limit exceeded");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Contain preserves the approved picture and faces instead of silently cropping them. */
export async function createPictureExports(png: Buffer): Promise<{ square: Buffer; portrait: Buffer }> {
  const base = sharp(png, { limitInputPixels: 25_000_000, failOn: "error" }).rotate();
  const [square, portrait] = await Promise.all([
    base.clone().resize(1080, 1080, { fit: "contain", background: "#101017" }).png().toBuffer(),
    base.clone().resize(1080, 1350, { fit: "contain", background: "#101017" }).png().toBuffer(),
  ]);
  return { square, portrait };
}
