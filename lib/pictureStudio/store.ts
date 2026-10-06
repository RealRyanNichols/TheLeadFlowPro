import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { PICTURE_BULK, PICTURE_PACKAGES } from "../site/picturePackages";
import { PictureError, type ClaimedPictureJob, type PackId, type PictureAsset, type PictureBrief, type PictureFile, type PictureOrder, type ScenePlan, validateProductionBrief } from "./types";

let connection: Pool | undefined;
function pool(): Pool {
  if (connection) return connection;
  const url = process.env.PICTURE_DATABASE_URL;
  if (!url) throw new PictureError("Picture orders are not available yet. Please try again later.", 503);
  connection ??= new Pool({ connectionString: url, max: 4, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, application_name: "leadflow-picture-studio" });
  return connection;
}
export function setPictureStorePoolForTests(value: Pool | undefined): void {
  if (process.env.NODE_ENV !== "test") throw new Error("Test database injection is disabled outside tests.");
  connection = value;
}
async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try { await client.query("BEGIN"); const result = await fn(client); await client.query("COMMIT"); return result; }
  catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
const iso = (date: unknown) => date instanceof Date ? date.toISOString() : date ? String(date) : null;
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const uuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export function mapOrder(row: QueryResultRow): PictureOrder {
  return { id: row.id, packId: row.pack_id, quantity: row.quantity, pictureCount: row.picture_count, amountCents: row.amount_cents, email: row.email, name: row.name,
    brief: row.brief, scenes: row.scenes, assets: row.assets, files: row.files, status: row.status, paymentStatus: row.payment_status,
    planApprovedAt: iso(row.plan_approved_at), ownerReleasedAt: iso(row.owner_released_at), revisionCount: row.revision_count, revisionNotes: row.revision_notes, error: row.error,
    createdAt: iso(row.created_at)!, updatedAt: iso(row.updated_at)! };
}
export function packDefinition(packId: string, quantity: number) {
  const pack = packId === "bulk100" ? PICTURE_BULK : PICTURE_PACKAGES.find(p => p.id === packId);
  if (!pack || !Number.isInteger(quantity) || quantity < 1 || quantity > (packId === "daily" ? 4 : 1)) throw new PictureError("Choose a valid picture pack and quantity.");
  return { packId: packId as PackId, quantity, priceId: pack.priceId, kind: `picture_pack_${packId}`, pictureCount: pack.pictures * quantity, amountCents: Math.round(pack.priceUsd * 100) * quantity };
}
export async function createOrder(input: { packId: string; quantity: number; email: string; name: string; brief: PictureBrief }) {
  const pack = packDefinition(input.packId, input.quantity);
  if (typeof input.email !== "string" || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new PictureError("Enter a valid email address.");
  if (typeof input.name !== "string" || input.name.trim().length < 2 || input.name.length > 140) throw new PictureError("Enter your name or business name.");
  const id = randomUUID(), accessToken = randomBytes(32).toString("base64url");
  await pool().query("INSERT INTO picture_orders (id,access_hash,pack_id,quantity,picture_count,amount_cents,email,name,brief) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [id, tokenHash(accessToken), pack.packId, pack.quantity, pack.pictureCount, pack.amountCents, input.email.trim().toLowerCase(), input.name.trim(), JSON.stringify(input.brief)]);
  return { id, accessToken };
}
export async function getOrderInternal(id: string): Promise<PictureOrder> {
  if (!uuid(id)) throw new PictureError("Order not found.", 404);
  const { rows } = await pool().query("SELECT * FROM picture_orders WHERE id=$1", [id]);
  if (!rows[0]) throw new PictureError("Order not found.", 404);
  return mapOrder(rows[0]);
}
export async function authenticateOrder(id: string, accessToken: string): Promise<PictureOrder> {
  if (!uuid(id) || accessToken.length < 32 || accessToken.length > 128) throw new PictureError("Order access is required.", 401);
  const { rows } = await pool().query("SELECT * FROM picture_orders WHERE id=$1", [id]);
  const expected = rows[0]?.access_hash || "0".repeat(64);
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(tokenHash(accessToken)))) throw new PictureError("Order access is required.", 401);
  if (!rows[0]) throw new PictureError("Order access is required.", 401);
  return mapOrder(rows[0]);
}
async function lockedOrder(client: PoolClient, id: string): Promise<QueryResultRow> {
  const { rows } = await client.query("SELECT * FROM picture_orders WHERE id=$1 FOR UPDATE", [id]);
  if (!rows[0]) throw new PictureError("Order not found.", 404);
  return rows[0];
}
export async function updateBrief(id: string, brief: PictureBrief) {
  return transaction(async client => {
    const order = await lockedOrder(client, id);
    if (order.plan_approved_at || !["awaiting_payment", "awaiting_plan_approval", "failed"].includes(order.status)) throw new PictureError("This brief is already in production. Use your revision request for minor changes.", 409);
    if (order.payment_status === "paid") validateProductionBrief(brief, order.assets.length);
    await client.query("UPDATE picture_orders SET brief=$2,scenes='[]',status=CASE WHEN payment_status='paid' THEN 'planning' ELSE 'awaiting_payment' END,error=NULL,updated_at=now() WHERE id=$1", [id, JSON.stringify(brief)]);
    if (order.payment_status === "paid") await insertJob(client, id, "plan", null, 0, true);
  });
}
export async function addAsset(id: string, asset: PictureAsset) {
  return transaction(async client => {
    const order = await lockedOrder(client, id);
    if (order.plan_approved_at || !["awaiting_payment", "awaiting_plan_approval"].includes(order.status)) throw new PictureError("Photos cannot be changed after production starts.", 409);
    if (order.assets.length >= 8) throw new PictureError("Use up to eight reference photos.");
    await client.query("UPDATE picture_orders SET assets=assets || $2::jsonb,updated_at=now() WHERE id=$1", [id, JSON.stringify([asset])]);
  });
}
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const { rows } = await pool().query("INSERT INTO picture_rate_limits (key,bucket) VALUES ($1,$2) ON CONFLICT (key,bucket) DO UPDATE SET hits=picture_rate_limits.hits+1 RETURNING hits", [tokenHash(key), bucket]);
  if (rows[0].hits > limit) throw new PictureError("Too many requests. Please try again shortly.", 429);
}
async function insertJob(client: PoolClient, id: string, kind: "plan" | "image", scene: number | null, revision: number, reset = false) {
  await client.query(`INSERT INTO picture_jobs (id,order_id,kind,scene_index,revision) VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (order_id,kind,scene_index,revision) DO ${reset ? "UPDATE SET state='queued',attempt=0,provider_started_at=NULL,lease_token=NULL,lease_until=NULL,error=NULL,updated_at=now() WHERE picture_jobs.state IN ('completed','failed','cancelled')" : "NOTHING"}`, [randomUUID(), id, kind, scene, revision]);
}
export async function approvePlan(id: string) {
  return transaction(async client => {
    const row = await lockedOrder(client, id), order = mapOrder(row);
    if (order.paymentStatus !== "paid") throw new PictureError("A successful payment is required before production.", 409);
    if (order.planApprovedAt) return;
    if (order.status !== "awaiting_plan_approval" || order.scenes.length !== order.pictureCount) throw new PictureError("Your complete scene plan is not ready yet.", 409);
    validateProductionBrief(order.brief, order.assets.length);
    for (const scene of order.scenes) await insertJob(client, id, "image", scene.index, order.revisionCount);
    await client.query("UPDATE picture_orders SET status='queued',plan_approved_at=now(),error=NULL,updated_at=now() WHERE id=$1", [id]);
  });
}
export async function reviewOrder(id: string, action: string, notes: string) {
  return transaction(async client => {
    const row = await lockedOrder(client, id);
    if (row.status !== "customer_review" || row.payment_status !== "paid") throw new PictureError("This collection is not ready for review.", 409);
    if (action === "approve") await client.query("UPDATE picture_orders SET status='delivered',updated_at=now() WHERE id=$1", [id]);
    else if (action === "revise") {
      if (row.revision_count >= 1) throw new PictureError("The included revision round has already been used.", 409);
      if (notes.trim().length < 3 || notes.length > 2000) throw new PictureError("Describe your minor adjustments in up to 2000 characters.");
      // An owner reviews the request and available budget before another paid API call.
      await client.query("UPDATE picture_orders SET status='paused',resume_status='queued',revision_count=1,revision_notes=$2,owner_released_at=NULL,error='Minor revision requested; awaiting team review.',updated_at=now() WHERE id=$1", [id, notes.trim()]);
      await client.query("INSERT INTO picture_audit(order_id,action,note) VALUES ($1,'revision_requested',$2)", [id, notes.trim()]);
    } else throw new PictureError("Choose approve or revise.");
  });
}
export async function checkoutUnderLock<T>(id: string, fn: (client: PoolClient, row: QueryResultRow) => Promise<T>): Promise<T> {
  return transaction(async client => fn(client, await lockedOrder(client, id)));
}
export async function recordPayment(input: { eventId: string; orderId: string; sessionId: string; paymentIntent: string | null; amountCents: number; priceId: string; quantity: number; currency: string; paid: boolean; livemode: boolean }) {
  return transaction(async client => {
    const claimed = await client.query("INSERT INTO picture_events(event_id,kind) VALUES ($1,'payment') ON CONFLICT DO NOTHING RETURNING event_id", [input.eventId]);
    if (!claimed.rowCount) return;
    const row = await lockedOrder(client, input.orderId), pack = packDefinition(row.pack_id, row.quantity);
    if (!input.paid || input.currency !== "usd" || input.amountCents !== pack.amountCents || input.priceId !== pack.priceId || input.quantity !== pack.quantity || (process.env.NODE_ENV === "production" && !input.livemode)) throw new PictureError("Payment does not match this order.", 400);
    const knownSession = await client.query("SELECT id FROM picture_checkout_sessions WHERE id=$1 AND order_id=$2", [input.sessionId, input.orderId]);
    if (!knownSession.rows[0]) throw new PictureError("Payment is not from this order’s checkout.", 409);
    if (row.payment_status === "paid") {
      if (row.stripe_session_id !== input.sessionId) await client.query("INSERT INTO picture_audit(order_id,action,note) VALUES ($1,'additional_payment',$2)", [input.orderId, `Additional payment session ${input.sessionId}; review in Stripe.`]);
      return;
    }
    if (row.payment_status !== "unpaid") throw new PictureError("Payment cannot be applied to this order.", 409);
    const reversed = input.paymentIntent ? await client.query("SELECT status FROM picture_payment_stops WHERE payment_intent=$1", [input.paymentIntent]) : { rows: [] };
    if (reversed.rows[0]) {
      await client.query("UPDATE picture_orders SET payment_status=$2,status=$2,stripe_session_id=$3,stripe_payment_intent=$4,error='Payment needs team review.',updated_at=now() WHERE id=$1", [input.orderId, reversed.rows[0].status, input.sessionId, input.paymentIntent]);
      return;
    }
    await client.query("UPDATE picture_orders SET payment_status='paid',stripe_session_id=$2,stripe_payment_intent=$3,status='planning',error=NULL,updated_at=now() WHERE id=$1", [input.orderId, input.sessionId, input.paymentIntent]);
    await insertJob(client, input.orderId, "plan", null, 0);
  });
}
export async function stopPayment(input: { eventId: string; paymentIntent?: string; sessionId?: string; status: "refunded" | "disputed" | "failed" }) {
  return transaction(async client => {
    const claimed = await client.query("INSERT INTO picture_events(event_id,kind) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING event_id", [input.eventId, input.status]);
    if (!claimed.rowCount) return;
    if (input.paymentIntent && input.status !== "failed") await client.query("INSERT INTO picture_payment_stops(payment_intent,status) VALUES ($1,$2) ON CONFLICT(payment_intent) DO UPDATE SET status=CASE WHEN picture_payment_stops.status='disputed' THEN 'disputed' ELSE EXCLUDED.status END", [input.paymentIntent, input.status]);
    const { rows } = await client.query("SELECT id FROM picture_orders WHERE ($1::text IS NOT NULL AND stripe_payment_intent=$1) OR ($2::text IS NOT NULL AND checkout_session_id=$2) FOR UPDATE", [input.paymentIntent || null, input.sessionId || null]);
    for (const row of rows) {
      if (input.status === "failed") {
        const paid = await client.query("SELECT payment_status FROM picture_orders WHERE id=$1", [row.id]);
        if (paid.rows[0].payment_status !== "unpaid") continue;
      }
      await client.query("UPDATE picture_orders SET status=$2,payment_status=CASE WHEN $2='failed' THEN payment_status ELSE $2 END,error='Payment needs team review.',owner_released_at=NULL,updated_at=now() WHERE id=$1", [row.id, input.status]);
      await client.query("UPDATE picture_jobs SET state='cancelled',updated_at=now() WHERE order_id=$1 AND state IN ('queued','leased')", [row.id]);
    }
  });
}
export async function claimJob(workerId: string, leaseSeconds = 300): Promise<ClaimedPictureJob | null> {
  return transaction(async client => {
    // Every mutation locks order before job, including expiry recovery.
    const expired = await client.query("SELECT id,order_id FROM picture_jobs WHERE state='leased' AND lease_until<now()");
    for (const item of expired.rows) {
      await lockedOrder(client, item.order_id);
      const recovered = await client.query("UPDATE picture_jobs SET state=CASE WHEN provider_started_at IS NOT NULL THEN 'uncertain' WHEN attempt >= 2 THEN 'failed' ELSE 'queued' END,lease_token=NULL,error='Worker lease expired.',updated_at=now() WHERE id=$1 AND state='leased' AND lease_until<now() RETURNING state", [item.id]);
      if (recovered.rows[0]?.state === "queued") {
        const exhausted = await client.query("UPDATE picture_jobs j SET state='failed' WHERE j.id=$1 AND j.kind='image' AND (SELECT COALESCE(SUM(prior.attempt),0) FROM picture_jobs prior WHERE prior.order_id=j.order_id AND prior.kind='image' AND prior.scene_index=j.scene_index)>=2 RETURNING id", [item.id]);
        if (exhausted.rowCount) recovered.rows[0].state = "failed";
      }
      if (recovered.rows[0] && recovered.rows[0].state !== "queued") await client.query("UPDATE picture_orders SET status='paused',resume_status='queued',error='Production interrupted; team review is required.',updated_at=now() WHERE id=$1 AND payment_status='paid'", [item.order_id]);
    }
    const candidate = await client.query(`SELECT o.id FROM picture_orders o WHERE EXISTS (SELECT 1 FROM picture_jobs j
      WHERE j.state='queued' AND j.attempt<2 AND o.payment_status='paid' AND
      j.order_id=o.id AND (j.kind='plan' OR (SELECT COALESCE(SUM(prior.attempt),0) FROM picture_jobs prior WHERE prior.order_id=j.order_id AND prior.kind='image' AND prior.scene_index=j.scene_index)<2) AND
      ((j.kind='plan' AND o.status='planning') OR (j.kind='image' AND o.status IN ('queued','generating') AND o.plan_approved_at IS NOT NULL))
      ) ORDER BY o.updated_at FOR UPDATE OF o SKIP LOCKED LIMIT 1`);
    if (!candidate.rows[0]) return null;
    const { rows } = await client.query("SELECT * FROM picture_jobs j WHERE order_id=$1 AND state='queued' AND attempt<2 AND (kind='plan' OR (SELECT COALESCE(SUM(prior.attempt),0) FROM picture_jobs prior WHERE prior.order_id=j.order_id AND prior.kind='image' AND prior.scene_index=j.scene_index)<2) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1", [candidate.rows[0].id]);
    if (!rows[0]) return null;
    const row = rows[0], leaseToken = randomUUID();
    await client.query("UPDATE picture_jobs SET state='leased',attempt=attempt+1,lease_token=$2,worker_id=$3,lease_until=now()+$4*interval '1 second',updated_at=now() WHERE id=$1", [row.id, leaseToken, workerId.slice(0, 80), Math.min(900, Math.max(60, leaseSeconds))]);
    if (row.kind === "image") await client.query("UPDATE picture_orders SET status='generating',updated_at=now() WHERE id=$1", [row.order_id]);
    const order = mapOrder(await lockedOrder(client, row.order_id));
    const total = row.kind === "image" ? await client.query("SELECT COALESCE(SUM(attempt),0)::int AS total FROM picture_jobs WHERE order_id=$1 AND kind='image' AND scene_index=$2", [row.order_id, row.scene_index]) : { rows: [{ total: row.attempt + 1 }] };
    return { job: { id: row.id, orderId: row.order_id, kind: row.kind, sceneIndex: row.scene_index, attempt: total.rows[0].total, leaseToken }, order };
  });
}
async function lease(client: PoolClient, id: string, token: string): Promise<{ job: QueryResultRow; order: PictureOrder }> {
  const reference = await client.query("SELECT order_id FROM picture_jobs WHERE id=$1", [id]);
  if (!reference.rows[0]) throw new PictureError("Job not found.", 404);
  const order = mapOrder(await lockedOrder(client, reference.rows[0].order_id));
  const { rows } = await client.query("SELECT * FROM picture_jobs WHERE id=$1 AND lease_token=$2 AND state='leased' AND lease_until>now() FOR UPDATE", [id, token]);
  if (!rows[0]) throw new PictureError("Job lease is no longer active.", 409);
  if (order.paymentStatus !== "paid" || ["paused", "failed", "refunded", "disputed"].includes(order.status)) throw new PictureError("Production is paused.", 409);
  if (rows[0].kind === "image" && !["queued", "generating"].includes(order.status)) throw new PictureError("This image batch is no longer active.", 409);
  if (rows[0].kind === "plan" && order.status !== "planning") throw new PictureError("This planning batch is no longer active.", 409);
  if (rows[0].kind === "image" && !order.planApprovedAt) throw new PictureError("The scene plan needs approval.", 409);
  return { job: rows[0], order };
}
export async function heartbeatJob(id: string, token: string): Promise<void> {
  await transaction(async client => { await lease(client, id, token); await client.query("UPDATE picture_jobs SET lease_until=now()+interval '5 minutes',updated_at=now() WHERE id=$1", [id]); });
}
export async function reserveSpend(id: string, token: string, cents: number): Promise<void> {
  await transaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(917410)");
    const { job, order } = await lease(client, id, token);
    const maxImage = Math.min(100, Number(process.env.PICTURE_MAX_IMAGE_COST_CENTS || 100));
    if (job.kind !== "image" || !Number.isInteger(cents) || cents < 1 || cents > maxImage) throw new PictureError("Image reservation exceeds the configured ceiling.", 409);
    const total = await client.query("SELECT COALESCE(SUM(attempt),0)::int AS total FROM picture_jobs WHERE order_id=$1 AND kind='image' AND scene_index=$2", [order.id, job.scene_index]);
    if (total.rows[0].total > 2) throw new PictureError("The scene attempt ceiling has been reached.", 409);
    if (job.reserved_attempt === job.attempt) return;
    const { rows } = await client.query("SELECT COALESCE(SUM(cents) FILTER (WHERE order_id=$1),0)::int AS order_spend,COALESCE(SUM(cents) FILTER (WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'),0)::int AS daily_spend FROM picture_spend", [order.id]);
    const dailyLimit = Math.min(2500, Number(process.env.PICTURE_DAILY_BUDGET_CENTS || 2500));
    if (!Number.isFinite(dailyLimit) || rows[0].order_spend + cents > order.pictureCount * 100 || rows[0].daily_spend + cents > dailyLimit) throw new PictureError("Generation spend ceiling reached. Team review is required.", 409);
    await client.query("INSERT INTO picture_spend(id,job_id,order_id,cents,attempt) VALUES ($1,$2,$3,$4,$5)", [randomUUID(), id, order.id, cents, job.attempt]);
    await client.query("UPDATE picture_jobs SET reserved_cents=reserved_cents+$2,reserved_attempt=attempt,updated_at=now() WHERE id=$1", [id, cents]);
  });
}
export async function recordProviderStarted(id: string, token: string): Promise<void> {
  await transaction(async client => {
    const { job } = await lease(client, id, token);
    const total = await client.query("SELECT COALESCE(SUM(attempt),0)::int AS total FROM picture_jobs WHERE order_id=$1 AND kind='image' AND scene_index=$2", [job.order_id, job.scene_index]);
    if (job.kind === "image" && total.rows[0].total > 2) throw new PictureError("The scene attempt ceiling has been reached.", 409);
    if (job.kind === "image" && job.reserved_attempt !== job.attempt) throw new PictureError("Reserve generation spend before calling the provider.", 409);
    if (job.provider_started_at) throw new PictureError("This provider attempt has already started.", 409);
    await client.query("UPDATE picture_jobs SET provider_started_at=now(),updated_at=now() WHERE id=$1", [id]);
  });
}
export async function completePlan(id: string, token: string, scenes: ScenePlan[]): Promise<void> {
  await transaction(async client => {
    const { job, order } = await lease(client, id, token);
    if (job.kind !== "plan" || scenes.length !== order.pictureCount || scenes.some((s, index) => s.index !== index || !s.title || !s.prompt || s.prompt.length > 30000 || typeof s.caption !== "string")) throw new PictureError("The scene plan is incomplete.", 409);
    await client.query("UPDATE picture_orders SET scenes=$2,status='awaiting_plan_approval',error=NULL,updated_at=now() WHERE id=$1", [order.id, JSON.stringify(scenes)]);
    await client.query("UPDATE picture_jobs SET state='completed',lease_token=NULL,updated_at=now() WHERE id=$1", [id]);
  });
}
export async function completeImage(id: string, token: string, result: { files: PictureFile[]; providerRequestId?: string | null; actualCostCents?: number }): Promise<void> {
  await transaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(917410)");
    const { job, order } = await lease(client, id, token);
    if (job.kind !== "image" || result.files.length !== 2 || new Set(result.files.map(f => f.variant)).size !== 2 || result.files.some(f => f.sceneIndex !== job.scene_index)) throw new PictureError("Both image exports are required.", 409);
    if (result.actualCostCents !== undefined) {
      if (!Number.isInteger(result.actualCostCents) || result.actualCostCents < 0) throw new PictureError("Invalid usage cost.");
      // Keep the estimate when zero/unknown; update the current reservation when exact usage is known.
      if (result.actualCostCents > 0) await client.query("UPDATE picture_spend SET cents=$3 WHERE job_id=$1 AND attempt=$2", [id, job.attempt, result.actualCostCents]);
    }
    const files = order.files.filter(file => file.sceneIndex !== job.scene_index).concat(result.files);
    await client.query("UPDATE picture_jobs SET state='completed',lease_token=NULL,provider_request_id=$2,actual_cents=$3,updated_at=now() WHERE id=$1", [id, result.providerRequestId?.slice(0, 120) || null, result.actualCostCents ?? null]);
    const { rows } = await client.query("SELECT count(*)::int AS remaining FROM picture_jobs WHERE order_id=$1 AND kind='image' AND revision=$2 AND state<>'completed'", [order.id, order.revisionCount]);
    await client.query("UPDATE picture_orders SET files=$2,status=$3,error=NULL,updated_at=now() WHERE id=$1", [order.id, JSON.stringify(files), rows[0].remaining === 0 ? "owner_review" : "generating"]);
  });
}
export async function failJob(id: string, token: string, message: string, options: { ambiguous?: boolean; retryable?: boolean } = {}): Promise<void> {
  await transaction(async client => {
    const { job, order } = await lease(client, id, token);
    const total = job.kind === "image" ? await client.query("SELECT COALESCE(SUM(attempt),0)::int AS total FROM picture_jobs WHERE order_id=$1 AND kind='image' AND scene_index=$2", [order.id, job.scene_index]) : { rows: [{ total: job.attempt }] };
    const state = options.ambiguous ? "uncertain" : options.retryable && total.rows[0].total < 2 ? "queued" : "failed";
    await client.query("UPDATE picture_jobs SET state=$3,lease_token=NULL,provider_started_at=CASE WHEN $3='queued' THEN NULL ELSE provider_started_at END,error=$4,updated_at=now() WHERE id=$1 AND lease_token=$2", [id, token, state, message.slice(0, 500)]);
    if (state !== "queued") await client.query("UPDATE picture_orders SET status='paused',resume_status=$2,error='Production needs team review.',updated_at=now() WHERE id=$1", [order.id, job.kind === "plan" ? "planning" : "queued"]);
  });
}
export async function listAdminOrders() {
  const { rows } = await pool().query("SELECT * FROM picture_orders ORDER BY updated_at DESC LIMIT 100");
  return rows.map(mapOrder);
}
export async function adminAction(id: string, action: string, notes: string, revision?: { sceneIndex?: unknown; prompt?: unknown; caption?: unknown }) {
  await transaction(async client => {
    const row = await lockedOrder(client, id);
    if (action === "pause") await client.query("UPDATE picture_orders SET resume_status=status,status='paused',error='Paused by the team.',updated_at=now() WHERE id=$1 AND payment_status='paid' AND status NOT IN ('delivered','paused')", [id]);
    else if (action === "revise_scene") {
      const index = revision?.sceneIndex, prompt = revision?.prompt, caption = revision?.caption;
      if (row.payment_status !== "paid" || !["paused", "queued", "generating"].includes(row.status) || row.revision_count !== 1 || !row.revision_notes) throw new PictureError("A customer’s included revision request is required.", 409);
      if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= row.picture_count || typeof prompt !== "string" || prompt.trim().length < 10 || prompt.length > 12000 || typeof caption !== "string" || caption.length > 6000) throw new PictureError("Choose a scene, reviewed prompt and caption.");
      const attempts = await client.query("SELECT COALESCE(SUM(attempt),0)::int AS attempts FROM picture_jobs WHERE order_id=$1 AND kind='image' AND scene_index=$2", [id, index]);
      if (attempts.rows[0].attempts >= 2) throw new PictureError("This scene has used its generation attempts. Upload the team’s manual adjustment.", 409);
      const existing = await client.query("SELECT id FROM picture_jobs WHERE order_id=$1 AND kind='image' AND scene_index=$2 AND revision=1", [id, index]);
      if (existing.rowCount) throw new PictureError("This scene’s revision is already queued.", 409);
      const spend = await client.query("SELECT COALESCE(SUM(cents),0)::int AS cents FROM picture_spend WHERE order_id=$1", [id]);
      if (spend.rows[0].cents + 100 > row.picture_count * 100) throw new PictureError("The remaining generation budget is insufficient. Upload the team’s manual adjustment.", 409);
      const scenes: ScenePlan[] = row.scenes;
      scenes[index] = { ...scenes[index], prompt: prompt.trim(), caption: caption.trim() };
      await insertJob(client, id, "image", index, 1);
      await client.query("UPDATE picture_orders SET scenes=$2,status='queued',owner_released_at=NULL,error=NULL,updated_at=now() WHERE id=$1", [id, JSON.stringify(scenes)]);
    }
    else if (action === "release") {
      if (row.status !== "owner_review" || row.payment_status !== "paid" || row.files.length !== row.picture_count * 2) throw new PictureError("The complete collection is not ready for release.", 409);
      const pending = await client.query("SELECT count(*)::int AS n FROM picture_jobs WHERE order_id=$1 AND state IN ('queued','leased','failed','uncertain')", [id]);
      if (pending.rows[0].n) throw new PictureError("Resolve all remaining production jobs before releasing this collection.", 409);
      await client.query("UPDATE picture_orders SET status='customer_review',owner_released_at=now(),error=NULL,updated_at=now() WHERE id=$1", [id]);
    } else if (action === "resume") {
      if (row.status !== "paused" || row.payment_status !== "paid") throw new PictureError("Only a paid, paused order can resume.", 409);
      const { rows } = await client.query("SELECT count(*)::int AS uncertain FROM picture_jobs WHERE order_id=$1 AND state='uncertain'", [id]);
      if (rows[0].uncertain) throw new PictureError("An uncertain provider attempt needs reconciliation before resuming.", 409);
      if (row.revision_notes) {
        const reviewed = await client.query("SELECT count(*)::int AS n FROM picture_jobs WHERE order_id=$1 AND revision=1 AND state='queued'", [id]);
        if (!reviewed.rows[0].n) throw new PictureError("A requested revision needs a reviewed scene adjustment before resuming.", 409);
      }
      await client.query("UPDATE picture_orders SET status=COALESCE(resume_status,'queued'),resume_status=NULL,error=NULL,updated_at=now() WHERE id=$1", [id]);
    } else if (action === "retry") {
      if (row.payment_status !== "paid") throw new PictureError("Only paid orders can retry.", 409);
      const retry = await client.query("UPDATE picture_jobs SET state='queued',provider_started_at=NULL,error=NULL,updated_at=now() WHERE order_id=$1 AND state='failed' AND attempt<2 AND provider_started_at IS NULL RETURNING id", [id]);
      if (!retry.rowCount) throw new PictureError("No safe retry is available. Uncertain spends are never retried automatically.", 409);
      await client.query("UPDATE picture_orders SET status=CASE WHEN plan_approved_at IS NULL THEN 'planning' ELSE 'queued' END,error=NULL,updated_at=now() WHERE id=$1", [id]);
    } else if (action === "refund_note") {
      if (notes.trim().length < 3) throw new PictureError("Add the refund review note. Refunds are handled in Stripe.");
    } else throw new PictureError("Unknown team action.");
    await client.query("INSERT INTO picture_audit(order_id,action,note) VALUES ($1,$2,$3)", [id, action, notes.slice(0, 2000) || null]);
  });
}
export async function databaseReady(): Promise<boolean> {
  try { await pool().query(`SELECT o.access_hash,o.checkout_attempt,j.reserved_attempt,s.attempt,e.event_id,h.last_seen,r.hits,a.action,c.expires_at,p.status
    FROM picture_orders o,picture_jobs j,picture_spend s,picture_events e,picture_worker_health h,picture_rate_limits r,picture_audit a,picture_checkout_sessions c,picture_payment_stops p LIMIT 0`); return true; } catch { return false; }
}
export async function workerHeartbeat(workerId = "picture-worker"): Promise<void> {
  await pool().query("INSERT INTO picture_worker_health(id,last_seen) VALUES ($1,now()) ON CONFLICT(id) DO UPDATE SET last_seen=now()", [workerId]);
}
export async function workerReady(): Promise<boolean> {
  try { const { rows } = await pool().query("SELECT EXISTS(SELECT 1 FROM picture_worker_health WHERE last_seen>now()-interval '2 minutes') AS ready"); return rows[0].ready === true; } catch { return false; }
}
export async function applyManualOutputs(id: string, sceneIndex: number, files: PictureFile[], caption?: string): Promise<void> {
  await transaction(async client => {
    const row = await lockedOrder(client, id);
    if (row.payment_status !== "paid" || !row.plan_approved_at || !["paused", "owner_review"].includes(row.status)) throw new PictureError("Pause this paid order with an approved plan before applying a team adjustment.", 409);
    if (!Number.isInteger(sceneIndex) || sceneIndex < 0 || sceneIndex >= row.picture_count || files.length !== 2) throw new PictureError("Choose a valid scene and both exports.");
    const all: PictureFile[] = row.files.filter((f: PictureFile) => f.sceneIndex !== sceneIndex).concat(files);
    const scenes: ScenePlan[] = row.scenes;
    if (caption !== undefined && scenes[sceneIndex]) scenes[sceneIndex] = { ...scenes[sceneIndex], caption: caption.slice(0, 6000) };
    await client.query("UPDATE picture_jobs SET state='completed',error='Team supplied manual output; conservative spend reservation retained.',lease_token=NULL,updated_at=now() WHERE order_id=$1 AND kind='image' AND scene_index=$2 AND state IN ('failed','uncertain','cancelled','queued','leased')", [id, sceneIndex]);
    const pending = await client.query("SELECT count(*)::int AS n FROM picture_jobs WHERE order_id=$1 AND state IN ('queued','leased','failed','uncertain')", [id]);
    await client.query("UPDATE picture_orders SET files=$2,scenes=$3,status=$4,owner_released_at=NULL,error=NULL,updated_at=now() WHERE id=$1", [id, JSON.stringify(all), JSON.stringify(scenes), all.length === row.picture_count * 2 && pending.rows[0].n === 0 ? "owner_review" : "paused"]);
    await client.query("INSERT INTO picture_audit(order_id,action,note) VALUES ($1,'manual_output',$2)", [id, `Team replaced scene ${sceneIndex + 1}.`]);
  });
}
