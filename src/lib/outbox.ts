"use client";

/**
 * A durable outbox for writes made while offline.
 *
 * The offline work made the dashboard *readable* on bad campus wifi, which
 * quietly created a worse problem: ticking something off looked like it worked
 * and then didn't. A write that silently vanishes is more damaging than one
 * that visibly fails.
 *
 * IndexedDB rather than localStorage, because localStorage is synchronous —
 * it blocks the main thread — and is wiped more eagerly by iOS under storage
 * pressure. Both survive a reload; only one survives a tab you forgot about.
 *
 * Background Sync would be the tidy answer, but iOS Safari doesn't implement
 * it, and this app lives on his phone. So replay is driven from the page:
 * on load, on the `online` event, on tab focus, and on a slow interval.
 */

const DB_NAME = "hey-brayan";
const STORE = "outbox";
const VERSION = 1;

export type Pending = {
  id: number;
  body: Record<string, unknown>;
  queuedAt: number;
  tries: number;
};

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const tx = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> => {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
};

export const enqueue = (body: Record<string, unknown>): Promise<number> =>
  tx<number>("readwrite", (s) => s.add({ body, queuedAt: Date.now(), tries: 0 }));

export const all = (): Promise<Pending[]> => tx<Pending[]>("readonly", (s) => s.getAll());

export const remove = (id: number): Promise<void> =>
  tx<void>("readwrite", (s) => s.delete(id));

export const bump = async (p: Pending): Promise<void> => {
  await tx<void>("readwrite", (s) => s.put({ ...p, tries: p.tries + 1 }));
};

export type FlushResult = { sent: number; left: number; state: unknown | null };

/**
 * Drops a queued `addTodo` that was never sent.
 *
 * Deleting a to-do created offline must not send a `deleteTodo` for an id the
 * server has never seen — that would be a no-op, and the original `addTodo`
 * would still replay afterwards, resurrecting the thing that was deleted.
 * Removing the queued creation instead makes the pair cancel out.
 */
export async function cancelQueuedAdd(localId: string): Promise<boolean> {
  const queued = await all();
  const match = queued.find(
    (p) => p.body?.action === "addTodo" && p.body?.id === localId
  );
  if (!match) return false;
  await remove(match.id);
  return true;
}

/**
 * Sends everything queued, oldest first, and stops at the first failure.
 *
 * Order matters: these are mutations of the same rows, so replaying #3 before
 * #2 can resurrect a tick the user un-ticked. Stopping preserves order at the
 * cost of head-of-line blocking, which for a single user's to-do list is the
 * right trade.
 *
 * A 4xx is different from a network failure. The server rejecting a write means
 * replaying it forever won't help — those are dropped after a few attempts
 * rather than jamming the queue behind them.
 */
let inFlight: Promise<FlushResult> | null = null;

/**
 * Only ever one flush at a time.
 *
 * Replay is triggered from four places — mount, the `online` event, tab focus,
 * and an interval — and without this guard two of them overlap, both read the
 * same queue, and both POST the same write before either deletes it. That
 * duplicated a to-do in testing: two identical rows on the server from one
 * offline edit. Callers all get the same in-flight promise.
 */
export function flush(): Promise<FlushResult> {
  if (inFlight) return inFlight;
  inFlight = doFlush().finally(() => { inFlight = null; });
  return inFlight;
}

async function doFlush(): Promise<FlushResult> {
  const queued = (await all()).sort((a, b) => a.queuedAt - b.queuedAt);
  let sent = 0;
  let state: unknown | null = null;

  for (const p of queued) {
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p.body),
      });

      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.state) state = json.state;
        await remove(p.id);
        sent++;
        continue;
      }

      // 401/403 mean the session lapsed, not that the write is bad. Dropping
      // those would throw away real edits the moment a cookie expired, so they
      // stay queued and stop the run — signing back in replays them.
      if (res.status === 401 || res.status === 403) {
        await bump(p);
        break;
      }

      // Any other 4xx: the server understood and refused. Retrying cannot fix
      // it, and leaving it queued would block everything behind it forever.
      if (res.status >= 400 && res.status < 500) {
        if (p.tries >= 2) await remove(p.id);
        else await bump(p);
        continue;
      }

      await bump(p);
      break;                       // 5xx: stop, keep order, try again later
    } catch {
      await bump(p);
      break;                       // offline: stop, keep order
    }
  }

  return { sent, left: (await all()).length, state };
}
