import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";

/** Runs the production SQL on an isolated PostgreSQL engine without external services.
 * One serialized connection models transactions, not multiple-server lock contention.
 */
export async function createPictureTestDb() {
  const db = await PGlite.create();
  await db.exec(await readFile(new URL("../../deploy/picture-studio/schema.sql", import.meta.url), "utf8"));
  let tail = Promise.resolve();
  async function lock() {
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>(resolve => { release = resolve; });
    await previous;
    return release;
  }
  async function query(sql: string, values?: unknown[]) {
    const result = await db.query(sql, values);
    return { rows: result.rows, rowCount: result.affectedRows, fields: result.fields };
  }
  const pool = {
    async connect() {
      const release = await lock();
      return { query, release };
    },
    async query(sql: string, values?: unknown[]) {
      const release = await lock();
      try { return await query(sql, values); } finally { release(); }
    },
    async end() { await db.close(); },
  } as unknown as Pool;
  return { pool, db, close: () => db.close() };
}
