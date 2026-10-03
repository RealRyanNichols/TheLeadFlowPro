export class ServiceAreaBodyError extends Error {
  readonly status: 400 | 413;
  constructor(message: string, status: 400 | 413) {
    super(message);
    this.name = "ServiceAreaBodyError";
    this.status = status;
  }
}

/** Bound received bytes before retaining chunks, decoding, or parsing JSON.
 * Content-Length is only an early rejection; the stream is always checked. */
export async function readServiceAreaJson(
  request: Request,
  maxBytes: number,
  tooLargeMessage: string,
): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await request.body?.cancel().catch(() => undefined);
    throw new ServiceAreaBodyError(tooLargeMessage, 413);
  }
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  const reader = request.body?.getReader();
  try {
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value.byteLength === 0) continue;
        if (value.byteLength > maxBytes - bytes) {
          await reader.cancel().catch(() => undefined);
          throw new ServiceAreaBodyError(tooLargeMessage, 413);
        }
        bytes += value.byteLength;
        chunks.push(value);
      }
    }
    const joined = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const value: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(joined),
    );
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("Invalid JSON object.");
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ServiceAreaBodyError) throw error;
    throw new ServiceAreaBodyError("Use a valid JSON request.", 400);
  } finally {
    reader?.releaseLock();
  }
}
