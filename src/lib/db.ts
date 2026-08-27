import { createClient, type Client } from "@libsql/client";

/**
 * State that must survive across devices: ticks, dismissals, and Brayan's own
 * to-dos. The artifact version kept these in localStorage, which meant ticking
 * something on a phone left the laptop none the wiser. That is the single
 * reason this app has a server at all.
 */
let _db: Client | null = null;

export function db(): Client {
  if (_db) return _db;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");
  _db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  return _db;
}

/**
 * Runs once per warm instance, not once per query.
 *
 * These are `IF NOT EXISTS`, so re-running was harmless but not free: every
 * read and write was paying three extra round-trips to a remote database.
 * On a failure the memo is cleared so the next call retries.
 */
let _schema: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!_schema) {
    _schema = createSchema().catch((err) => {
      _schema = null;
      throw err;
    });
  }
  return _schema;
}

async function createSchema(): Promise<void> {
  const c = db();
  await c.batch([
    `CREATE TABLE IF NOT EXISTS ticks (
       key TEXT PRIMARY KEY,
       done INTEGER NOT NULL DEFAULT 0,
       updated_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS dismissed (
       key TEXT PRIMARY KEY,
       updated_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS todos (
       id TEXT PRIMARY KEY,
       title TEXT NOT NULL,
       due TEXT NOT NULL,
       done INTEGER NOT NULL DEFAULT 0,
       created_at TEXT NOT NULL
     )`,
  ], "write");
}

export type State = {
  ticks: Record<string, boolean>;
  dismissed: string[];
  todos: Array<{ id: string; title: string; due: string; done: boolean }>;
};

export async function readState(): Promise<State> {
  await ensureSchema();
  const c = db();
  const [t, d, td] = await Promise.all([
    c.execute("SELECT key, done FROM ticks"),
    c.execute("SELECT key FROM dismissed"),
    c.execute("SELECT id, title, due, done FROM todos ORDER BY due"),
  ]);
  const ticks: Record<string, boolean> = {};
  for (const r of t.rows) ticks[String(r.key)] = Number(r.done) === 1;
  return {
    ticks,
    dismissed: d.rows.map((r) => String(r.key)),
    todos: td.rows.map((r) => ({
      id: String(r.id), title: String(r.title), due: String(r.due), done: Number(r.done) === 1,
    })),
  };
}

export async function setTick(key: string, done: boolean): Promise<void> {
  await ensureSchema();
  await db().execute({
    sql: `INSERT INTO ticks (key, done, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET done = excluded.done, updated_at = excluded.updated_at`,
    args: [key, done ? 1 : 0, new Date().toISOString()],
  });
}

export async function setDismissed(key: string, hidden: boolean): Promise<void> {
  await ensureSchema();
  const c = db();
  if (hidden) {
    await c.execute({
      sql: `INSERT OR REPLACE INTO dismissed (key, updated_at) VALUES (?, ?)`,
      args: [key, new Date().toISOString()],
    });
  } else {
    await c.execute({ sql: `DELETE FROM dismissed WHERE key = ?`, args: [key] });
  }
}

/**
 * Creates a to-do, idempotently.
 *
 * The client may supply the id. That matters more than it looks: a POST can
 * reach the server and have its *response* lost — a dropped connection right
 * after the write — and the client, seeing a failure, replays it. With a
 * server-generated id that produces two identical to-dos, which is exactly what
 * happened in testing on a simulated flaky connection.
 *
 * With a client id and INSERT OR IGNORE, a replay is a no-op. Every other
 * action here is naturally idempotent (setting a value twice is setting it
 * once); this was the only one that wasn't.
 */
export async function addTodo(title: string, due: string, id?: string): Promise<string> {
  await ensureSchema();
  const rowId = id || `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  await db().execute({
    sql: `INSERT OR IGNORE INTO todos (id, title, due, done, created_at)
          VALUES (?, ?, ?, 0, ?)`,
    args: [rowId, title.slice(0, 200), due, new Date().toISOString()],
  });
  return rowId;
}

export async function setTodoDone(id: string, done: boolean): Promise<void> {
  await ensureSchema();
  await db().execute({ sql: `UPDATE todos SET done = ? WHERE id = ?`, args: [done ? 1 : 0, id] });
}

export async function deleteTodo(id: string): Promise<void> {
  await ensureSchema();
  await db().execute({ sql: `DELETE FROM todos WHERE id = ?`, args: [id] });
}

/* ------------------------------------------------------------ notifications */

/**
 * Push subscriptions and a log of what has already been sent.
 *
 * The log is what stops the same brief arriving four times: the notify endpoint
 * is polled every quarter hour, so "is it about 7am" is true for several
 * consecutive runs. Keyed by kind and local date, so each fires once a day.
 */
export async function ensurePushSchema(): Promise<void> {
  const c = db();
  await c.batch([
    `CREATE TABLE IF NOT EXISTS push_subs (
       endpoint TEXT PRIMARY KEY,
       p256dh TEXT NOT NULL,
       auth TEXT NOT NULL,
       created_at TEXT NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS push_sent (
       kind TEXT NOT NULL,
       day TEXT NOT NULL,
       sent_at TEXT NOT NULL,
       detail TEXT,
       PRIMARY KEY (kind, day)
     )`,
  ], "write");
}

export type PushSub = { endpoint: string; p256dh: string; auth: string };

export async function saveSub(s: PushSub): Promise<void> {
  await ensurePushSchema();
  await db().execute({
    sql: `INSERT INTO push_subs (endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
    args: [s.endpoint, s.p256dh, s.auth, new Date().toISOString()],
  });
}

export async function deleteSub(endpoint: string): Promise<void> {
  await ensurePushSchema();
  await db().execute({ sql: `DELETE FROM push_subs WHERE endpoint = ?`, args: [endpoint] });
}

export async function listSubs(): Promise<PushSub[]> {
  await ensurePushSchema();
  const r = await db().execute("SELECT endpoint, p256dh, auth FROM push_subs");
  return r.rows.map((x) => ({
    endpoint: String(x.endpoint), p256dh: String(x.p256dh), auth: String(x.auth),
  }));
}

/** True if this kind has not yet gone out today; records it when it hasn't. */
export async function claimSend(kind: string, day: string, detail = ""): Promise<boolean> {
  await ensurePushSchema();
  const r = await db().execute({
    sql: `INSERT OR IGNORE INTO push_sent (kind, day, sent_at, detail) VALUES (?, ?, ?, ?)`,
    args: [kind, day, new Date().toISOString(), detail],
  });
  return (r.rowsAffected ?? 0) > 0;
}

/** What was recorded for a kind on a day, for change-detection notifications. */
export async function lastDetail(kind: string): Promise<string | null> {
  await ensurePushSchema();
  const r = await db().execute({
    sql: `SELECT detail FROM push_sent WHERE kind = ? ORDER BY day DESC LIMIT 1`,
    args: [kind],
  });
  return r.rows.length ? String(r.rows[0].detail ?? "") : null;
}

/** Overwrites the record for a kind so change-detection can move its baseline. */
export async function recordDetail(kind: string, day: string, detail: string): Promise<void> {
  await ensurePushSchema();
  await db().execute({
    sql: `INSERT INTO push_sent (kind, day, sent_at, detail) VALUES (?, ?, ?, ?)
          ON CONFLICT(kind, day) DO UPDATE SET detail = excluded.detail, sent_at = excluded.sent_at`,
    args: [kind, day, new Date().toISOString(), detail],
  });
}

/* ----------------------------------------------------------------- settings */

/**
 * Small key/value store for things that used to be source code.
 *
 * The term lives here. A JSON blob rather than normalised tables because it is
 * read whole, written whole, and edited by exactly one person — columns would
 * be ceremony, and a schema migration every time a field is added would be
 * worse than parsing.
 */
export async function ensureSettings(): Promise<void> {
  await db().execute(
    `CREATE TABLE IF NOT EXISTS settings (
       key TEXT PRIMARY KEY,
       value TEXT NOT NULL,
       updated_at TEXT NOT NULL
     )`
  );
}

export async function getSetting(key: string): Promise<string | null> {
  await ensureSettings();
  const r = await db().execute({ sql: `SELECT value FROM settings WHERE key = ?`, args: [key] });
  return r.rows.length ? String(r.rows[0].value) : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await ensureSettings();
  await db().execute({
    sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [key, value, new Date().toISOString()],
  });
}
