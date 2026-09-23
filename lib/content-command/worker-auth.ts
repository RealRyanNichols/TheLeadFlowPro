import { timingSafeEqual } from "node:crypto";

export function isContentWorkerAuthorized(request: Request) {
  const configured = process.env.CONTENT_COMMAND_WORKER_TOKEN?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!configured || !supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
